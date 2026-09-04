"""
backend/app/models/_helpers.py
Shared helpers used across all models: PyObjectId, GeoPoint.
"""
from typing import Any, List
from bson import ObjectId
from pydantic import GetCoreSchemaHandler
from pydantic_core import core_schema


class PyObjectId(ObjectId):
    """Custom type so Pydantic v2 knows how to validate/serialise BSON ObjectIds."""

    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError(f"Invalid ObjectId: {v}")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_core_schema__(
        cls, source_type: Any, handler: GetCoreSchemaHandler
    ) -> core_schema.CoreSchema:
        return core_schema.no_info_plain_validator_function(
            cls.validate,
            serialization=core_schema.to_string_ser_schema(),
        )


class GeoPoint:
    """GeoJSON Point used for location fields."""
    type: str = "Point"
    coordinates: List[float]   # [longitude, latitude]

    def __init__(self, lng: float, lat: float):
        self.type = "Point"
        self.coordinates = [lng, lat]

    def dict(self):
        return {"type": self.type, "coordinates": self.coordinates}


# Pydantic BaseModel-compatible GeoPoint
from pydantic import BaseModel

class GeoPoint(BaseModel):
    type: str = "Point"
    coordinates: List[float]   # [longitude, latitude]
