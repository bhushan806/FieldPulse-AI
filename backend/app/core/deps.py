"""
backend/app/core/deps.py
FastAPI dependency callables: get_current_user, role guards.
"""
from typing import List

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.security import decode_token
from app.db.mongo import get_users_collection
from app.models.user import UserInDB, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserInDB:
    """Validates Bearer JWT and returns the UserInDB document."""
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if payload is None or payload.get("type") != "access":
        raise credentials_exc

    user_id: str = payload.get("sub")
    if not user_id:
        raise credentials_exc

    users_col = get_users_collection()
    from bson import ObjectId
    try:
        doc = await users_col.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise credentials_exc

    if doc is None:
        raise credentials_exc

    return UserInDB(**doc)


def require_roles(allowed: List[UserRole]):
    """
    Dependency factory that ensures the current user's role is in `allowed`.
    platform_admin always passes regardless of the allowed list.
    Usage:
        Depends(require_roles([UserRole.project_manager, UserRole.hq_admin]))
    """
    async def _guard(current_user: UserInDB = Depends(get_current_user)) -> UserInDB:
        if current_user.role == UserRole.platform_admin:
            return current_user  # platform_admin bypasses every role check
        if current_user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' is not authorised for this action.",
            )
        return current_user

    return _guard


def user_can_access_project(current_user: UserInDB, project_id: str) -> bool:
    """Return whether a user is allowed to read or mutate a project.

    HQ and auditors are organisation-wide roles. Every other role must be
    explicitly assigned to the project in the persisted user record.
    """
    if current_user.role in (UserRole.platform_admin, UserRole.hq_admin, UserRole.auditor):
        return True
    return project_id in current_user.project_ids


def require_project_access(current_user: UserInDB, project_id: str) -> None:
    """Raise a consistent error before a project-scoped data operation."""
    if not user_can_access_project(current_user, project_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to this project.",
        )


# Convenience pre-built guards
require_engineer       = require_roles([UserRole.site_engineer])
require_pm             = require_roles([UserRole.project_manager])
require_hq_admin       = require_roles([UserRole.hq_admin])
require_auditor        = require_roles([UserRole.auditor])
require_pm_or_above    = require_roles([UserRole.project_manager, UserRole.hq_admin, UserRole.auditor])
require_hq_or_auditor  = require_roles([UserRole.hq_admin, UserRole.auditor])
require_platform_admin = require_roles([UserRole.platform_admin])
