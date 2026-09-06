import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.security import hash_password, verify_password
from app.models.user import UserInDB, UserRole
from app.api.auth import _make_auth_response

async def test():
    doc = {
        "_id": "64abcdef1234567890123456",
        "name": "Test PM",
        "email": "test@pm.com",
        "password_hash": hash_password("Password123!"),
        "role": "project_manager",
        "project_ids": []
    }
    try:
        user = UserInDB(**doc)
        print("UserInDB parsed:", user)
        res = _make_auth_response(user)
        print("AuthResponse:", res)
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(test())
