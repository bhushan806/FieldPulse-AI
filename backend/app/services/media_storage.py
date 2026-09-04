"""
backend/app/services/media_storage.py
Cloudinary upload helpers for photos, videos, and audio.
"""
import io
from typing import Optional

import cloudinary
import cloudinary.uploader

from app.core.config import settings


def _configure():
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
    `resource_type` can be 'image', 'video', 'raw', or 'auto'.
    """
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
    cloudinary.uploader.destroy(public_id, resource_type=resource_type)
