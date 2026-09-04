"""
backend/scripts/seed_schedule_data.py
One-off seed script for development / demo.

Creates:
  - 1 demo project (Oil India Pipeline Project Alpha)
  - 4 users (one per role)
  - 10 schedule activities with realistic data

Run with:
    cd backend
    python -m scripts.seed_schedule_data

Requires MONGO_URI to be set in .env (or as an environment variable).
"""
import asyncio
import os
import sys
from datetime import datetime, timedelta

# Allow running from backend/ directory
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.core.security import hash_password

# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------

PROJECT_ID = ObjectId()
NOW = datetime.utcnow()

USERS = [
    {
        "_id": ObjectId(),
        "name": "Rajesh Kumar",
        "phone": "+919876543210",
        "email": None,
        "password_hash": None,
        "role": "site_engineer",
        "project_ids": [str(PROJECT_ID)],
        "created_at": NOW,
    },
    {
        "_id": ObjectId(),
        "name": "Priya Sharma",
        "phone": None,
        "email": "pm@fieldpulse.dev",
        "password_hash": hash_password("Password123!"),
        "role": "project_manager",
        "project_ids": [str(PROJECT_ID)],
        "created_at": NOW,
    },
    {
        "_id": ObjectId(),
        "name": "Arun Mehta",
        "phone": None,
        "email": "hq@fieldpulse.dev",
        "password_hash": hash_password("Password123!"),
        "role": "hq_admin",
        "project_ids": [str(PROJECT_ID)],
        "created_at": NOW,
    },
    {
        "_id": ObjectId(),
        "name": "Sunita Patel",
        "phone": None,
        "email": "auditor@fieldpulse.dev",
        "password_hash": hash_password("Password123!"),
        "role": "auditor",
        "project_ids": [str(PROJECT_ID)],
        "created_at": NOW,
    },
]

PROJECT = {
    "_id": PROJECT_ID,
    "name": "OIL Pipeline Alpha — Assam Sector",
    "description": "Cross-country pipeline laying from Duliajan to Numaligarh (demo project)",
    "location": {"type": "Point", "coordinates": [95.3326, 27.3692]},  # Duliajan, Assam
    "status": "on_track",
    "created_at": NOW,
}

_activities_data = [
    ("ACT-001", "Site Survey & Soil Testing",          0,  14, 100.0, ["survey", "soil testing", "geotechnical"]),
    ("ACT-002", "Right-of-Way Clearance",              7,  21, 80.0,  ["clearance", "right of way", "ROW", "legal"]),
    ("ACT-003", "Excavation — Km 0 to Km 5",           14, 35, 60.0,  ["excavation", "digging", "trench"]),
    ("ACT-004", "Pipe Stringing — Km 0 to Km 5",       21, 42, 40.0,  ["pipe stringing", "pipeline laying"]),
    ("ACT-005", "Welding — Km 0 to Km 3",              28, 49, 30.0,  ["welding", "joint", "pipe joint"]),
    ("ACT-006", "Non-Destructive Testing (NDT)",        35, 56, 20.0,  ["NDT", "testing", "quality check", "inspection"]),
    ("ACT-007", "Anti-Corrosion Coating",               42, 63, 10.0,  ["coating", "anti-corrosion", "painting"]),
    ("ACT-008", "Backfilling & Compaction — Km 0-3",   49, 70, 5.0,   ["backfilling", "compaction", "soil"]),
    ("ACT-009", "Cathodic Protection Installation",     56, 77, 0.0,   ["cathodic", "protection", "electrical"]),
    ("ACT-010", "Hydrostatic Pressure Testing",         70, 90, 0.0,   ["hydrostatic", "pressure test", "commissioning"]),
]

ACTIVITIES = []
for code, name, start_offset, end_offset, pct, keywords in _activities_data:
    ACTIVITIES.append({
        "_id": ObjectId(),
        "project_id": str(PROJECT_ID),
        "activity_code": code,
        "activity_name": name,
        "location": {"type": "Point", "coordinates": [95.33 + start_offset * 0.001, 27.37]},
        "planned_start": NOW - timedelta(days=90) + timedelta(days=start_offset),
        "planned_end": NOW - timedelta(days=90) + timedelta(days=end_offset),
        "percent_complete": pct,
        "status": "completed" if pct >= 100 else ("in_progress" if pct > 0 else "not_started"),
        "keywords": keywords,
    })


# ---------------------------------------------------------------------------
# Seed runner
# ---------------------------------------------------------------------------

async def seed():
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB_NAME]

    print(f"[Seed] Connected to MongoDB: {settings.MONGO_URI} / {settings.MONGO_DB_NAME}")

    # Clear existing demo data
    await db["projects"].delete_many({"name": PROJECT["name"]})
    await db["users"].delete_many({"email": {"$in": [u["email"] for u in USERS if u["email"]]}})
    await db["users"].delete_many({"phone": {"$in": [u["phone"] for u in USERS if u["phone"]]}})
    await db["schedule_activities"].delete_many({"project_id": str(PROJECT_ID)})

    # Insert
    await db["projects"].insert_one(PROJECT)
    print(f"[Seed] Project inserted: {PROJECT['name']} (id={PROJECT_ID})")

    await db["users"].insert_many(USERS)
    print(f"[Seed] {len(USERS)} users inserted.")
    for u in USERS:
        email_val = str(u.get('email') or 'N/A')
        phone_val = str(u.get('phone') or 'N/A')
        print(f"       - {u['role']:20s}  email={email_val:30s}  phone={phone_val}")

    await db["schedule_activities"].insert_many(ACTIVITIES)
    print(f"[Seed] {len(ACTIVITIES)} activities inserted for project {PROJECT_ID}.")

    print("\n[Seed] ✅ Done! Demo credentials:")
    print("  Site Engineer : phone=+919876543210  (OTP login, use mock mode)")
    print("  Project Manager: pm@fieldpulse.dev       / Password123!")
    print("  HQ Admin       : hq@fieldpulse.dev       / Password123!")
    print("  Auditor        : auditor@fieldpulse.dev  / Password123!")
    print(f"\n  Project ID: {PROJECT_ID}")

    client.close()


if __name__ == "__main__":
    asyncio.run(seed())
