import asyncio
import os
import re
from datetime import datetime
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

load_dotenv("d:/FieldPulse-AI/FieldPulse-AI-1/backend/.env")

MONGO_URI = os.getenv("MONGO_URI")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "FieldPulse-Ai")

DEMO_PHONE = "+919876543210"
DEMO_NAME = "Ramesh Kumar"

async def main():
    print(f"Connecting to MongoDB: {MONGO_DB_NAME}...")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[MONGO_DB_NAME]
    
    projects_col = db["projects"]
    users_col = db["users"]
    
    projects = await projects_col.find({}).to_list(length=100)
    print(f"Found {len(projects)} projects.")
    
    project_ids = []
    for p in projects:
        pid = str(p["_id"])
        project_ids.append(pid)
        p_name = p.get("name", "Unnamed")
        engineers = p.get("engineers") or []
        print(f"  Project: {p_name} (id={pid}), current engineers: {len(engineers)}")
        
        # Check if DEMO_PHONE or variants exist
        has_demo = any(e.get("phone") in [DEMO_PHONE, "9876543210", "+91 98765 43210"] for e in engineers)
        if not has_demo:
            entry = {
                "phone": DEMO_PHONE,
                "name": DEMO_NAME,
                "status": "active",
                "added_at": datetime.utcnow()
            }
            await projects_col.update_one(
                {"_id": p["_id"]},
                {"$push": {"engineers": entry}}
            )
            print(f"    -> Added {DEMO_NAME} ({DEMO_PHONE}) to project {p_name}")
        else:
            print(f"    -> Demo engineer already in roster for {p_name}")

    # Also check / seed user document in users collection
    existing_user = await users_col.find_one({"phone": DEMO_PHONE})
    if not existing_user:
        # Check variants
        existing_user = await users_col.find_one({"phone": {"$in": [DEMO_PHONE, "9876543210", "+91 98765 43210"]}})
        
    if not existing_user:
        user_doc = {
            "_id": ObjectId(),
            "name": DEMO_NAME,
            "phone": DEMO_PHONE,
            "email": None,
            "password_hash": None,
            "role": "site_engineer",
            "project_ids": project_ids,
            "created_at": datetime.utcnow(),
        }
        await users_col.insert_one(user_doc)
        print(f"Created demo site engineer user in users collection: {DEMO_NAME} ({DEMO_PHONE})")
    else:
        # Ensure project_ids has all projects
        await users_col.update_one(
            {"_id": existing_user["_id"]},
            {"$set": {"project_ids": project_ids, "role": "site_engineer", "phone": DEMO_PHONE}}
        )
        print(f"Updated existing user {existing_user.get('name')} with {len(project_ids)} projects.")

    client.close()
    print("Done!")

if __name__ == "__main__":
    asyncio.run(main())
