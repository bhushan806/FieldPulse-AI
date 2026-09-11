"""
backend/tests/test_production_hardening.py
Unit and integration tests verifying production security hardening and performance enhancements:
- OTP brute-force attempt limits and lockout
- Production demo-code bypass prohibition
- HTTP Security response headers (X-Frame-Options, X-Content-Type-Options, etc.)
- Dynamic CORS configuration
"""
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient

from app.core.config import settings
from app.services import otp_provider
from app.main import app


class TestSecurityHeadersAndCORS:
    def test_security_headers_present(self):
        client = TestClient(app)
        # Any request through the app middleware should return security headers
        resp = client.get("/docs")
        assert resp.headers.get("X-Content-Type-Options") == "nosniff"
        assert resp.headers.get("X-Frame-Options") == "DENY"
        assert resp.headers.get("X-XSS-Protection") == "1; mode=block"
        assert resp.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
        assert "camera=(self)" in resp.headers.get("Permissions-Policy", "")

    def test_cors_preflight_headers(self):
        client = TestClient(app)
        headers = {
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST",
        }
        resp = client.options("/api/auth/login", headers=headers)
        assert resp.headers.get("access-control-allow-origin") == "http://localhost:3000"


class TestOTPSecurityHardening:
    @pytest.mark.asyncio
    async def test_otp_lockout_after_max_attempts(self):
        """Verify that 5 failed attempts locks out and invalidates the OTP."""
        phone = "+919876543210"
        correct_otp = "852963"
        fake_store = {"phone": phone, "otp": correct_otp, "attempts": 0}

        mock_col = MagicMock()
        mock_col.find_one = AsyncMock(side_effect=lambda q: fake_store if q.get("phone") == phone else None)
        
        async def mock_update(q, update):
            if "$set" in update:
                fake_store.update(update["$set"])
        mock_col.update_one = AsyncMock(side_effect=mock_update)

        async def mock_delete(q):
            nonlocal fake_store
            if q.get("phone") == phone:
                fake_store = None
        mock_col.delete_many = AsyncMock(side_effect=mock_delete)

        with patch("app.services.otp_provider.get_otp_collection", return_value=mock_col):
            with patch.object(settings, "MAX_OTP_ATTEMPTS", 5):
                # Attempts 1 to 4 should fail and increment attempts counter
                for i in range(1, 5):
                    success = await otp_provider.verify_otp(phone, "000001")
                    assert success is False
                    assert fake_store is not None
                    assert fake_store["attempts"] == i

                # 5th failed attempt should trigger lockout and delete OTP
                success = await otp_provider.verify_otp(phone, "000001")
                assert success is False
                assert fake_store is None  # Invalidated

    @pytest.mark.asyncio
    async def test_production_mode_rejects_demo_code(self):
        """Verify that demo code '123456' is strictly rejected when ENVIRONMENT == 'production'."""
        phone = "+919876543210"
        with patch.object(settings, "ENVIRONMENT", "production"):
            with patch.object(settings, "OTP_PROVIDER", "mock"):
                mock_col = MagicMock()
                mock_col.find_one = AsyncMock(return_value={"phone": phone, "otp": "999999", "attempts": 0})
                mock_col.update_one = AsyncMock()
                with patch("app.services.otp_provider.get_otp_collection", return_value=mock_col):
                    # In production, demo code 123456 must NOT bypass verification
                    result = await otp_provider.verify_otp(phone, "123456")
                    assert result is False

    @pytest.mark.asyncio
    async def test_correct_otp_clears_record(self):
        """Verify successful verification cleans up the OTP record."""
        phone = "+919876543210"
        correct_otp = "123789"
        deleted = False

        mock_col = MagicMock()
        mock_col.find_one = AsyncMock(return_value={"phone": phone, "otp": correct_otp, "attempts": 0})

        async def mock_delete(q):
            nonlocal deleted
            deleted = True
        mock_col.delete_many = AsyncMock(side_effect=mock_delete)

        with patch("app.services.otp_provider.get_otp_collection", return_value=mock_col):
            success = await otp_provider.verify_otp(phone, correct_otp)
            assert success is True
            assert deleted is True
