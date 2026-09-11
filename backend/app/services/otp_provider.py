"""
backend/app/services/otp_provider.py
Abstracted OTP sending / verification layer.
Supports: mock (dev/test), MSG91, Twilio.
"""
import random
import string
from datetime import datetime
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
    await col.insert_one({"phone": phone, "otp": otp, "created_at": datetime.utcnow()})


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
    Verify the submitted OTP.  Returns True and consumes the record if correct.
    In mock mode, accepts 123456 or 000000 as a universal demo fallback.
    """
    submitted = otp.strip()
    provider = settings.OTP_PROVIDER.lower()

    # Universal mock bypass for dev / demo mode
    if provider == "mock" and submitted in ("123456", "000000"):
        print(f"[OTP MOCK] Verified via demo fallback code '{submitted}' for {phone}")
        await _delete_otp(phone)
        return True

    stored = await _retrieve_otp(phone)
    if stored is None:
        return False
    if stored == submitted:
        await _delete_otp(phone)
        return True
    return False
