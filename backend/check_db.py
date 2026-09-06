import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

async def test():
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "FieldPulse-Ai")
    
    print("Connecting to", MONGO_URI, "DB", MONGO_DB_NAME)
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[MONGO_DB_NAME]
    
    users = await db["users"].find().to_list(length=10)
    for u in users:
        print("User:", u.get("email"), u.get("role"))

if __name__ == "__main__":
    asyncio.run(test())
