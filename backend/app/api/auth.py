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
from app.db.mongo import get_users_collection, get_database
from app.models.user import UserInDB, UserPublic, UserRole
from app.services.otp_provider import send_otp, verify_otp
from app.services.audit import write_audit_log

router = APIRouter(prefix="/api/auth", tags=["auth"])


import re

# ---------------------------------------------------------------------------
# Phone normalization helpers
# ---------------------------------------------------------------------------

def normalize_phone(phone: str) -> str:
    """Normalize phone number to E.164-like format (e.g. +919876543210)."""
    raw = phone.strip()
    digits = re.sub(r"\D", "", raw)
    if not digits:
        return raw
    if len(digits) == 10:
        return f"+91{digits}"
    if len(digits) == 12 and digits.startswith("91"):
        return f"+{digits}"
    if raw.startswith("+"):
        return f"+{digits}"
    return f"+{digits}"


def get_phone_variants(phone: str) -> list[str]:
    """Return all common representations of a phone number to match DB records."""
    raw = phone.strip()
    norm = normalize_phone(raw)
    digits = re.sub(r"\D", "", raw)
    last10 = digits[-10:] if len(digits) >= 10 else digits
    variants = {
        raw,
        norm,
        digits,
        f"+{digits}" if digits else "",
        last10,
        f"+91{last10}" if last10 else "",
        f"+91 {last10[:5]} {last10[5:]}" if len(last10) == 10 else "",
        f"{last10[:5]} {last10[5:]}" if len(last10) == 10 else "",
    }
    return [v for v in variants if v]


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------

class OtpRequestBody(BaseModel):
    phone: str


class OtpRequestResponse(BaseModel):
    message: str
    otp: Optional[str] = None
    mock_mode: bool = False


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
    Supports flexible phone number formatting (spaces, country code, etc.).
    """
    raw_phone = body.phone.strip()
    norm_phone = normalize_phone(raw_phone)
    variants = get_phone_variants(raw_phone)
    
    from app.db.mongo import get_projects_collection
    from app.core.config import settings
    projects_col = get_projects_collection()
    
    # Check if phone (or any variant) is in any project's roster
    proj = await projects_col.find_one({"engineers.phone": {"$in": variants}})
    
    if not proj:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="This phone number is not registered on any project. Ask your Project Manager to add you first."
        )

    otp = await send_otp(norm_phone)
    is_mock = settings.OTP_PROVIDER.lower() == "mock"
    
    return OtpRequestResponse(
        message="OTP sent successfully." + (" (Dev/Mock Mode: Use OTP 123456 or the code returned)" if is_mock else ""),
        otp=otp if is_mock else None,
        mock_mode=is_mock,
    )


@router.post("/otp/verify", response_model=AuthResponse)
async def verify_otp_endpoint(body: OtpVerifyBody):
    """Verify OTP and issue access + refresh tokens."""
    raw_phone = body.phone.strip()
    norm_phone = normalize_phone(raw_phone)
    variants = get_phone_variants(raw_phone)
    
    # Verify OTP against normalized phone or any variant
    ok = False
    for p in [norm_phone] + variants:
        if await verify_otp(p, body.otp):
            ok = True
            break

    if not ok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP.")

    col = get_users_collection()
    doc = await col.find_one({"phone": {"$in": variants}})
    
    from app.db.mongo import get_projects_collection
    from app.models.project import RosterStatus
    
    projects_col = get_projects_collection()
    # Find all projects where this phone is in roster
    cursor = projects_col.find({"engineers.phone": {"$in": variants}})
    project_ids = []
    name = f"Engineer-{norm_phone[-4:]}"
    
    async for p in cursor:
        project_ids.append(str(p["_id"]))
        for eng in p.get("engineers", []):
            if eng.get("phone") in variants:
                if eng.get("name"):
                    name = eng["name"]
                break
    
    if not doc:
        # Create user
        doc = {
            "_id": ObjectId(),
            "name": name,
            "phone": norm_phone,
            "email": None,
            "password_hash": None,
            "role": UserRole.site_engineer,
            "project_ids": project_ids,
            "created_at": datetime.utcnow(),
        }
        await col.insert_one(doc)
        
        # Update roster status to active across projects
        await projects_col.update_many(
            {"engineers.phone": {"$in": variants}},
            {"$set": {"engineers.$.status": RosterStatus.active.value}}
        )
    else:
        # Ensure project_ids is up to date with roster
        if project_ids and set(doc.get("project_ids", [])) != set(project_ids):
            await col.update_one(
                {"_id": doc["_id"]},
                {"$set": {"project_ids": project_ids}}
            )
            doc["project_ids"] = project_ids

    user = UserInDB(**doc)
    return _make_auth_response(user)


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginBody):
    """Email + password login for PM / HQ Admin / Auditor roles."""
    col = get_users_collection()
    
    clean_email = body.email.strip().lower()
    
    # Map common demo aliases (.ai -> .dev and name-based aliases)
    alias_map = {
        "auditor@fieldpulse.ai": "auditor@fieldpulse.dev",
        "sonal.mehta@fieldpulse.ai": "auditor@fieldpulse.dev",
        "sonal.mehta@fieldpulse.dev": "auditor@fieldpulse.dev",
        "hq@fieldpulse.ai": "hq@fieldpulse.dev",
        "ankit.verma@fieldpulse.ai": "hq@fieldpulse.dev",
        "ankit.verma@fieldpulse.dev": "hq@fieldpulse.dev",
        "pm@fieldpulse.ai": "pm@fieldpulse.dev",
        "priya.sharma@fieldpulse.ai": "pm@fieldpulse.dev",
        "priya.sharma@fieldpulse.dev": "pm@fieldpulse.dev",
        "admin@fieldpulse.ai": "admin@fieldpulse.dev",
    }
    lookup_email = alias_map.get(clean_email, clean_email)

    doc = await col.find_one({"email": {"$regex": f"^{lookup_email}$", "$options": "i"}})
    if not doc and lookup_email != clean_email:
        doc = await col.find_one({"email": {"$regex": f"^{clean_email}$", "$options": "i"}})

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
    if len(body.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters.")

    invites_col = get_database()["invitations"]
    invite = await invites_col.find_one({"token": body.invite_token})
    # Keep the old seeded demo links working, but real UUID invitations are
    # now the normal, persisted onboarding path.
    demo_email = body.invite_token.removeprefix("demo-invite-token-") if body.invite_token.startswith("demo-invite-token-") else None
    if invite:
        if invite.get("status") != "pending":
            raise HTTPException(status_code=400, detail="This invitation is no longer active.")
        if invite.get("expires_at") and invite["expires_at"] < datetime.utcnow():
            await invites_col.update_one({"_id": invite["_id"]}, {"$set": {"status": "expired"}})
            raise HTTPException(status_code=400, detail="This invitation has expired.")
        email = invite["email"]
    elif demo_email:
        email = demo_email
    else:
        raise HTTPException(status_code=400, detail="Invalid invitation token.")

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
    if invite:
        await invites_col.update_one(
            {"_id": invite["_id"]},
            {"$set": {"status": "accepted", "accepted_at": datetime.utcnow()}},
        )
        await write_audit_log(
            action="invitation_accepted",
            actor_user_id=str(doc["_id"]),
            target_id=str(invite["_id"]),
            project_id=invite["project_id"],
            after_state={"email": email},
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
