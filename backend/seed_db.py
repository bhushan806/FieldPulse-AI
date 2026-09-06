"""
backend/seed_db.py
Run once to create demo users in MongoDB.

Usage (with venv active):
  python seed_db.py
"""
import asyncio
from datetime import datetime
from passlib.context import CryptContext
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
import ssl

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "FieldPulse-Ai")

from app.core.security import hash_password

DEMO_USERS = [
    {
        "name": "Priya Sharma (PM)",
        "email": "pm@fieldpulse.dev",
        "phone": None,
        "password": "Password123!",
        "role": "project_manager",
    },
    {
        "name": "Ankit Verma (HQ)",
        "email": "hq@fieldpulse.dev",
        "phone": None,
        "password": "Password123!",
        "role": "hq_admin",
    },
    {
        "name": "Sonal Mehta (Auditor)",
        "email": "auditor@fieldpulse.dev",
        "phone": None,
        "password": "Password123!",
        "role": "auditor",
    },
    {
        # Platform Admin — full access to all roles and analytics
        # Login via hidden route /login-admin (not linked from any public page)
        "name": "Platform Admin",
        "email": "admin@fieldpulse.dev",
        "phone": None,
        "password": "AdminPass123!",
        "role": "platform_admin",
    },
]


async def seed():
    # Use tlsAllowInvalidCertificates to bypass SSL issues on some networks
    client = AsyncIOMotorClient(
        MONGO_URI,
        serverSelectionTimeoutMS=30000,
    )
    db = client[MONGO_DB_NAME]
    users_col = db["users"]
    projects_col = db["projects"]
    activities_col = db["schedule_activities"]

    # Test connection
    await client.admin.command("ping")
    print(f"[SEED] Connected to MongoDB: {MONGO_DB_NAME}")

    pm_id = None

    for user_data in DEMO_USERS:
        existing = await users_col.find_one({"email": user_data["email"]})
        if existing:
            print(f"[SEED] User {user_data['email']} already exists — skipping.")
            if user_data["role"] == "project_manager":
                pm_id = str(existing["_id"])
            continue

        from bson import ObjectId
        oid = ObjectId()
        doc = {
            "_id": oid,
            "name": user_data["name"],
            "email": user_data["email"],
            "phone": user_data["phone"],
            "password_hash": hash_password(user_data["password"]),
            "role": user_data["role"],
            "project_ids": [],
            "created_at": datetime.utcnow(),
        }
        await users_col.insert_one(doc)
        if user_data["role"] == "project_manager":
            pm_id = str(oid)
        print(f"[SEED] Created {user_data['role']}: {user_data['email']}")

    # Create demo project
    from bson import ObjectId
    existing_project = await projects_col.find_one({"name": "Sector 4 Pipeline"})
    if existing_project:
        print("[SEED] Demo project already exists — skipping.")
        project_id = str(existing_project["_id"])
    else:
        p_oid = ObjectId()
        project_doc = {
            "_id": p_oid,
            "name": "Sector 4 Pipeline",
            "description": "Oil pipeline installation from pumping station to refinery.",
            "location": "Assam, India",
            "status": "active",
            "pm_user_id": pm_id,
            "created_at": datetime.utcnow(),
        }
        await projects_col.insert_one(project_doc)
        project_id = str(p_oid)
        print(f"[SEED] Created project: Sector 4 Pipeline (id={project_id})")

    # Create demo schedule activities
    existing_acts = await activities_col.count_documents({"project_id": project_id})
    if existing_acts == 0:
        sample_activities = [
            {
                "project_id": project_id,
                "activity_code": "EXC-01",
                "activity_name": "Site Excavation Phase 1",
                "location": {"type": "Point", "coordinates": [94.92, 27.47]},
                "planned_start": datetime(2026, 9, 1),
                "planned_end": datetime(2026, 9, 10),
                "percent_complete": 45,
                "status": "in_progress",
                "keywords": ["excavation", "earthwork", "digging"],
            },
            {
                "project_id": project_id,
                "activity_code": "PIP-04",
                "activity_name": "Pipeline Welding Segment A",
                "location": {"type": "Point", "coordinates": [94.93, 27.46]},
                "planned_start": datetime(2026, 9, 3),
                "planned_end": datetime(2026, 9, 8),
                "percent_complete": 90,
                "status": "delayed",
                "keywords": ["welding", "pipeline", "joining"],
            },
            {
                "project_id": project_id,
                "activity_code": "FND-02",
                "activity_name": "Foundation Pouring Section B",
                "location": {"type": "Point", "coordinates": [94.91, 27.48]},
                "planned_start": datetime(2026, 9, 5),
                "planned_end": datetime(2026, 9, 12),
                "percent_complete": 0,
                "status": "planned",
                "keywords": ["foundation", "concrete", "pouring"],
            },
        ]
        await activities_col.insert_many(sample_activities)
        print(f"[SEED] Created {len(sample_activities)} sample activities.")
    else:
        print(f"[SEED] Activities already exist — skipping.")

    # Update PM's project_ids
    if pm_id:
        await users_col.update_one(
            {"_id": ObjectId(pm_id)},
            {"$addToSet": {"project_ids": project_id}}
        )
        print("[SEED] Linked project to PM user.")

    client.close()
    print("\n[SEED] Done! Login credentials:")
    print("  PM:      pm@fieldpulse.dev  / Password123!")
    print("  HQ:      hq@fieldpulse.dev  / Password123!")
    print("  Auditor: auditor@fieldpulse.dev / Password123!")
    print("  Engineer: any phone number — check backend logs for OTP")


if __name__ == "__main__":
    asyncio.run(seed())
