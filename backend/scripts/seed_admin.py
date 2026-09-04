"""
scripts/seed_admin.py
Bootstrap the first HQ Admin account.
Usage: python scripts/seed_admin.py
"""
import asyncio
from datetime import datetime
import os
import sys

# Add backend to path so we can import from app
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

from app.core.security import hash_password
from app.models.user import UserRole
from bson import ObjectId

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "FieldPulse-Ai")


async def seed_admin():
    print(f"Connecting to MongoDB at {MONGO_URI}...")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[MONGO_DB_NAME]
    users_col = db["users"]

    # Check if we already have an HQ admin
    existing = await users_col.find_one({"role": UserRole.hq_admin.value, "email": "hq@fieldpulse.dev"})
    if existing:
        print(f"✅ HQ Admin already exists: {existing.get('email')}")
        return

    admin_doc = {
        "_id": ObjectId(),
        "name": "Super Admin (HQ)",
        "email": "hq@fieldpulse.dev",
        "phone": None,
        "password_hash": hash_password("Password123!"),
        "role": UserRole.hq_admin.value,
        "project_ids": [],
        "created_at": datetime.utcnow(),
    }
    
    await users_col.insert_one(admin_doc)
    print("✅ Created first HQ Admin successfully!")
    print(f"  Email: {admin_doc['email']}")
    print(f"  Password: Password123!")

if __name__ == "__main__":
    asyncio.run(seed_admin())
