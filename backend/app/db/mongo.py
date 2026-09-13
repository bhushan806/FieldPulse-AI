"""
backend/app/db/mongo.py
Motor async MongoDB client, database/collection accessors, and index creation.
"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import ASCENDING, DESCENDING, GEOSPHERE
from app.core.config import settings


_client: AsyncIOMotorClient | None = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(
            settings.MONGO_URI,
            serverSelectionTimeoutMS=10000,
            connectTimeoutMS=10000,
        )
    return _client

def get_database() -> AsyncIOMotorDatabase:
    return get_client()[settings.MONGO_DB_NAME]


# ---------------------------------------------------------------------------
# Collection helpers
# ---------------------------------------------------------------------------

def get_users_collection():
    return get_database()["users"]


def get_projects_collection():
    return get_database()["projects"]


def get_activities_collection():
    return get_database()["schedule_activities"]


def get_captures_collection():
    return get_database()["captures"]


def get_audit_logs_collection():
    return get_database()["audit_logs"]


def get_notifications_collection():
    return get_database()["notifications"]


def get_otp_collection():
    return get_database()["otp_store"]


def get_activity_events_collection():
    return get_database()["activity_events"]


def get_schedule_baselines_collection():
    return get_database()["schedule_baselines"]


def get_issues_collection():
    return get_database()["issues"]


def get_documents_collection():
    return get_database()["documents"]


def get_ai_threads_collection():
    return get_database()["ai_threads"]


# ---------------------------------------------------------------------------
# Startup / shutdown
# ---------------------------------------------------------------------------

async def connect_db():
    """Called at application startup — verifies connection and creates indexes."""
    try:
        client = get_client()
        # Ping to confirm connection (5 second timeout)
        await asyncio.wait_for(
            client.admin.command("ping"),
            timeout=10.0
        )
        print(f"[DB] Connected to MongoDB: {settings.MONGO_DB_NAME}")
        await create_indexes()
    except Exception as exc:
        print(f"[DB] WARNING MongoDB connection failed at startup: {exc}")
        print("[DB] The application will start, but database requests will fail until resolved.")
        print("[DB]    Check: Is your Atlas cluster paused? Is your IP whitelisted?")


async def disconnect_db():
    """Called at application shutdown."""
    global _client
    if _client is not None:
        _client.close()
        _client = None
        print("[DB] MongoDB connection closed.")


async def create_indexes():
    """Create all required indexes."""
    db = get_database()

    # users
    await db["users"].create_index([("phone", ASCENDING)], sparse=True)
    await db["users"].create_index([("email", ASCENDING)], unique=True, sparse=True)

    # schedule_activities
    await db["schedule_activities"].create_index([("project_id", ASCENDING)])
    await db["schedule_activities"].create_index([("project_id", ASCENDING), ("status", ASCENDING)])
    await db["schedule_activities"].create_index([("activity_code", ASCENDING)], sparse=True)
    await db["schedule_activities"].create_index(
        [("location", GEOSPHERE)], sparse=True
    )

    # captures
    await db["captures"].create_index([("project_id", ASCENDING)])
    await db["captures"].create_index([("project_id", ASCENDING), ("status", ASCENDING)])
    await db["captures"].create_index([("user_id", ASCENDING)])
    await db["captures"].create_index([("status", ASCENDING)])
    await db["captures"].create_index([("created_at", DESCENDING)])

    # issues
    await db["issues"].create_index([("project_id", ASCENDING), ("status", ASCENDING)])
    await db["issues"].create_index([("assigned_to", ASCENDING)], sparse=True)
    await db["issues"].create_index([("created_at", DESCENDING)])

    # documents
    await db["documents"].create_index([("project_id", ASCENDING), ("created_at", DESCENDING)])
    await db["documents"].create_index([("created_at", DESCENDING)])

    # projects
    await db["projects"].create_index([("created_at", DESCENDING)])

    # audit_logs
    await db["audit_logs"].create_index([("target_id", ASCENDING)])
    await db["audit_logs"].create_index([("actor_user_id", ASCENDING)])

    # notifications
    await db["notifications"].create_index([("project_id", ASCENDING)])

    # otp_store — TTL index: documents auto-expire after 300 seconds (5 min)
    await db["otp_store"].create_index(
        [("created_at", ASCENDING)], expireAfterSeconds=300
    )

    # activity_events
    await db["activity_events"].create_index([
        ("project_id", ASCENDING),
        ("activity_id", ASCENDING),
        ("timestamp", ASCENDING),
    ])
    await db["activity_events"].create_index([
        ("activity_id", ASCENDING),
        ("event_type", ASCENDING),
        ("timestamp", ASCENDING),
    ])
    await db["activity_events"].create_index([
        ("activity_id", ASCENDING),
        ("source_id", ASCENDING),
    ])
    await db["activity_events"].create_index([
        ("project_id", ASCENDING),
        ("timestamp", ASCENDING),
    ])
    await db["activity_events"].create_index([
        ("idempotency_key", ASCENDING),
    ], unique=True, sparse=True)

    # schedule_baselines
    await db["schedule_baselines"].create_index([
        ("project_id", ASCENDING),
        ("activity_id", ASCENDING),
        ("version", ASCENDING),
    ], unique=True, sparse=True)

    # ai_threads (user-isolated AI conversations)
    await db["ai_threads"].create_index([
        ("user_id", ASCENDING),
        ("updated_at", DESCENDING),
    ])
    await db["ai_threads"].create_index([
        ("user_id", ASCENDING),
        ("project_id", ASCENDING),
    ])

    print("[DB] All indexes created / verified.")
