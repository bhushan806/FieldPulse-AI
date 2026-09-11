"""
backend/app/services/otp_provider.py
Abstracted OTP sending / verification layer.
Supports: mock (dev/test), MSG91, Twilio.
"""
import random
import string
from datetime import datetime, timezone
from typing import Optional

from app.core.config import settings
from app.db.mongo import get_otp_collection


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _generate_otp(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


async def _store_otp(phone: str, otp: str) -> None:
    col = get_otp_collection()
    await col.delete_many({"phone": phone})          # one OTP per phone at a time
    await col.insert_one({
        "phone": phone,
        "otp": otp,
        "attempts": 0,
        "created_at": datetime.now(timezone.utc),
    })


async def _retrieve_otp(phone: str) -> Optional[str]:
    col = get_otp_collection()
    doc = await col.find_one({"phone": phone})
    return doc["otp"] if doc else None


async def _delete_otp(phone: str) -> None:
    await get_otp_collection().delete_many({"phone": phone})


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def send_otp(phone: str) -> str:
    """
    Generate and deliver an OTP.
    Returns the OTP string (for logging / test assertions in mock mode).
    """
    otp = _generate_otp()
    await _store_otp(phone, otp)

    provider = settings.OTP_PROVIDER.lower()

    if provider == "mock":
        # In mock mode just print — visible in server logs
        print(f"[OTP MOCK] Phone={phone}  OTP={otp} (Fallback: 123456)")

    elif provider == "msg91":
        import httpx
        url = "https://api.msg91.com/api/v5/otp"
        params = {
            "authkey": settings.MSG91_AUTH_KEY,
            "template_id": settings.MSG91_TEMPLATE_ID,
            "mobile": phone,
            "otp": otp,
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(url, json=params)
            resp.raise_for_status()

    elif provider == "twilio":
        from twilio.rest import Client as TwilioClient
        client = TwilioClient(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        client.messages.create(
            body=f"Your FieldPulse AI OTP is {otp}. Valid for 5 minutes.",
            from_=settings.TWILIO_FROM_NUMBER,
            to=phone,
        )

    else:
        raise ValueError(f"Unknown OTP_PROVIDER: {provider}")

    return otp


async def verify_otp(phone: str, otp: str) -> bool:
    """
    Verify the submitted OTP. Returns True and consumes the record if correct.
    In mock mode, accepts 123456 or 000000 as universal demo fallback ONLY in non-production environments.
    Enforces maximum attempt limits (MAX_OTP_ATTEMPTS) to mitigate brute-force attacks.
    """
    submitted = otp.strip()
    provider = settings.OTP_PROVIDER.lower()
    is_production = getattr(settings, "ENVIRONMENT", "development").lower() == "production"

    # Universal mock bypass for dev / demo mode ONLY when not in production
    if not is_production and provider == "mock" and submitted in ("123456", "000000"):
        print(f"[OTP MOCK] Verified via demo fallback code '{submitted}' for {phone}")
        await _delete_otp(phone)
        return True

    col = get_otp_collection()
    doc = await col.find_one({"phone": phone})
    if not doc:
        return False

    attempts = doc.get("attempts", 0) + 1
    max_attempts = getattr(settings, "MAX_OTP_ATTEMPTS", 5)

    if attempts >= max_attempts:
        # Exceeded attempt limit: invalidate OTP immediately to prevent further brute-force
        print(f"[OTP SECURITY] Lockout: Phone {phone} reached max attempts ({attempts}/{max_attempts}). Invalidated.")
        await _delete_otp(phone)
        return False

    if doc.get("otp") == submitted:
        await _delete_otp(phone)
        return True
    else:
        # Track failed attempt
        await col.update_one({"phone": phone}, {"$set": {"attempts": attempts}})
        return False
