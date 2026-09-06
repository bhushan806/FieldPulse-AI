"""
backend/app/services/media_storage.py
Cloudinary upload helpers for photos, videos, and audio.
"""
import io
import os
from typing import Optional

import cloudinary
import cloudinary.uploader

from app.core.config import settings

def _configure():
    if settings.CLOUDINARY_CLOUD_NAME and settings.CLOUDINARY_API_KEY:
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
            secure=True,
        )

_configure()

async def upload_media(
    file_bytes: bytes,
    filename: str,
    folder: str = "fieldpulse",
    resource_type: str = "auto",
) -> str:
    """
    Upload bytes to Cloudinary.
    Returns the secure_url string.
    If Cloudinary is not configured, falls back to local disk storage for dev.
    """
    if not settings.CLOUDINARY_CLOUD_NAME or not settings.CLOUDINARY_API_KEY:
        # Fallback to local storage
        uploads_dir = os.path.join(os.getcwd(), "uploads", folder)
        os.makedirs(uploads_dir, exist_ok=True)
        # filename usually looks like "project_id/uuid.jpg", so just take basename to avoid subdirs inside local uploads
        safe_filename = os.path.basename(filename)
        local_path = os.path.join(uploads_dir, safe_filename)
        with open(local_path, "wb") as f:
            f.write(file_bytes)
        return f"/uploads/{folder}/{safe_filename}"

    result = cloudinary.uploader.upload(
        io.BytesIO(file_bytes),
        folder=folder,
        public_id=filename,
        resource_type=resource_type,
        overwrite=True,
    )
    return result["secure_url"]

async def delete_media(public_id: str, resource_type: str = "image") -> None:
    """Delete an asset from Cloudinary by its public_id."""
    if not settings.CLOUDINARY_CLOUD_NAME:
        return
    cloudinary.uploader.destroy(public_id, resource_type=resource_type)
