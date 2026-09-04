"""
backend/app/core/config.py
Centralised settings loaded from environment variables via pydantic-settings.
"""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # MongoDB
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "fieldpulse_ai"

    # JWT
    JWT_SECRET_KEY: str = "changeme-super-secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_EXPIRE_DAYS: int = 7

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # HuggingFace
    HF_INFERENCE_API_KEY: str = ""
    HF_MISTRAL_MODEL: str = "mistralai/Mistral-7B-Instruct-v0.2"

    # OTP Provider (MSG91 / Twilio — left empty for mock mode)
    OTP_PROVIDER: str = "mock"          # "mock" | "msg91" | "twilio"
    MSG91_AUTH_KEY: str = ""
    MSG91_TEMPLATE_ID: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_FROM_NUMBER: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
