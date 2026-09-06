import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from app.models.user import UserInDB
from app.api.auth import _make_auth_response

load_dotenv()

async def test():
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "FieldPulse-Ai")
    
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[MONGO_DB_NAME]
    
    doc = await db["users"].find_one({"email": "hq@fieldpulse.dev"})
    if doc:
        print("Found doc:", doc)
        try:
            user = UserInDB(**doc)
            print("Parsed user:", user)
            resp = _make_auth_response(user)
            print("Auth response:", resp)
        except Exception as e:
            print("Error parsing:", e)

if __name__ == "__main__":
    asyncio.run(test())
