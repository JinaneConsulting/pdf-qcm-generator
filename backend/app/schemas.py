from typing import Optional
from fastapi_users import schemas
from pydantic import ConfigDict, EmailStr, Field, field_validator
from pydantic_core import PydanticCustomError
from datetime import datetime  # Assurez-vous que l'import est correct


class UserCreate(schemas.BaseUserCreate):
    full_name: Optional[str] = None
    profile_picture: Optional[str] = None
    sub: Optional[str] = None

    @field_validator('email')
    def validate_email(cls, v):
        if "@" not in v:
            raise PydanticCustomError("invalid_email", "Format email invalide")
        return v

class UserRead(schemas.BaseUser[int]):
    full_name: Optional[str] = None
    profile_picture: Optional[str] = None
    is_verified: bool
    is_superuser: bool
    sub: Optional[str] = None 
    created_at: datetime = Field(...)
    model_config = ConfigDict(
        from_attributes=True,
        arbitrary_types_allowed=True 
    )

class UserUpdate(schemas.BaseUserUpdate):
    full_name: Optional[str] = None