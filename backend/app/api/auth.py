"""
backend/app/api/auth.py
Authentication endpoints:
  POST /api/auth/otp/request   — site_engineer phone + OTP flow
  POST /api/auth/otp/verify    — verify OTP, return tokens
  POST /api/auth/login         — email + password login (PM / HQ / Auditor)
  POST /api/auth/refresh       — exchange refresh token for new access token
  GET  /api/auth/me            — current user profile
"""
from datetime import datetime
from typing import Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr

from app.core.deps import get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.mongo import get_users_collection
from app.models.user import UserInDB, UserPublic, UserRole
from app.services.otp_provider import send_otp, verify_otp

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class OtpRequestBody(BaseModel):
    phone: str


class OtpRequestResponse(BaseModel):
    message: str


class OtpVerifyBody(BaseModel):
    phone: str
    otp: str


class LoginBody(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: UserRole
    user_id: str


class SetPasswordBody(BaseModel):
    invite_token: str
    password: str


class RefreshBody(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_auth_response(user: UserInDB) -> AuthResponse:
    user_id = str(user.id)
    return AuthResponse(
        access_token=create_access_token(user_id, user.role),
        refresh_token=create_refresh_token(user_id, user.role),
        role=user.role,
        user_id=user_id,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/otp/request", response_model=OtpRequestResponse)
async def request_otp(body: OtpRequestBody):
    """
    Send a 6-digit OTP to the given phone number.
    Only allows sending if the phone is registered in at least one project's roster.
    """
    phone = body.phone.strip()
    
    from app.db.mongo import get_projects_collection
    projects_col = get_projects_collection()
    
    # Check if phone is in any project's roster
    # We query if there's any project where engineers array contains this phone
    proj = await projects_col.find_one({"engineers.phone": phone})
    
    if not proj:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="This phone number is not registered on any project. Ask your Project Manager to add you first."
        )

    await send_otp(phone)
    return OtpRequestResponse(message="OTP sent successfully.")


@router.post("/otp/verify", response_model=AuthResponse)
async def verify_otp_endpoint(body: OtpVerifyBody):
    """Verify OTP and issue access + refresh tokens."""
    phone = body.phone.strip()
    ok = await verify_otp(phone, body.otp)
    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP.")

    col = get_users_collection()
    doc = await col.find_one({"phone": phone})
    
    if not doc:
        from app.db.mongo import get_projects_collection
        from app.models.project import RosterStatus
        
        projects_col = get_projects_collection()
        # Find all projects where this phone is in roster
        cursor = projects_col.find({"engineers.phone": phone})
        project_ids = []
        name = f"Engineer-{phone[-4:]}"
        
        async for p in cursor:
            project_ids.append(str(p["_id"]))
            # We can extract the name from the roster entry if we want
            for eng in p.get("engineers", []):
                if eng["phone"] == phone:
                    if eng.get("name"):
                        name = eng["name"]
                    break
        
        # Create user
        doc = {
            "_id": ObjectId(),
            "name": name,
            "phone": phone,
            "email": None,
            "password_hash": None,
            "role": UserRole.site_engineer,
            "project_ids": project_ids,
            "created_at": datetime.utcnow(),
        }
        await col.insert_one(doc)
        
        # Update roster status to active across projects
        await projects_col.update_many(
            {"engineers.phone": phone},
            {"$set": {"engineers.$.status": RosterStatus.active.value}}
        )

    user = UserInDB(**doc)
    return _make_auth_response(user)


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginBody):
    """Email + password login for PM / HQ Admin / Auditor roles."""
    col = get_users_collection()
    doc = await col.find_one({"email": body.email})

    if not doc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")
        
    if not doc.get("password_hash"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="invited, complete onboarding first")

    if not verify_password(body.password, doc["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials.")

    user = UserInDB(**doc)
    if user.role == UserRole.site_engineer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Site engineers must log in via OTP.",
        )
    return _make_auth_response(user)


@router.post("/set-password", response_model=AuthResponse)
async def set_password(body: SetPasswordBody):
    """Set password for an invited user and log them in."""
    if not body.invite_token.startswith("demo-invite-token-"):
        raise HTTPException(status_code=400, detail="Invalid token")
        
    email = body.invite_token.replace("demo-invite-token-", "")
    
    col = get_users_collection()
    doc = await col.find_one({"email": email})
    if not doc:
        raise HTTPException(status_code=404, detail="User not found")
        
    if doc.get("password_hash"):
        raise HTTPException(status_code=400, detail="Password already set")
        
    pwd_hash = hash_password(body.password)
    await col.update_one(
        {"_id": doc["_id"]},
        {"$set": {"password_hash": pwd_hash}}
    )
    
    doc["password_hash"] = pwd_hash
    user = UserInDB(**doc)
    return _make_auth_response(user)


@router.post("/refresh", response_model=RefreshResponse)
async def refresh(body: RefreshBody):
    """Exchange a valid refresh token for a new access token."""
    payload = decode_token(body.refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token.")

    user_id = payload.get("sub")
    role = payload.get("role")
    if not user_id or not role:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Malformed token.")

    return RefreshResponse(access_token=create_access_token(user_id, role))


@router.get("/me", response_model=UserPublic)
async def me(current_user: UserInDB = Depends(get_current_user)):
    """Return the currently authenticated user's public profile."""
    return UserPublic(
        id=str(current_user.id),
        name=current_user.name,
        phone=current_user.phone,
        email=str(current_user.email) if current_user.email else None,
        role=current_user.role,
        project_ids=current_user.project_ids,
        created_at=current_user.created_at,
    )
