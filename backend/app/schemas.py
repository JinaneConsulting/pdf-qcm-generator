from typing import Optional
from uuid import UUID
from fastapi_users import schemas
from pydantic import ConfigDict

class UserCreate(schemas.BaseUserCreate):
    full_name: Optional[str] = None

class UserRead(schemas.BaseUser[UUID]):
    full_name: Optional[str] = None
    is_verified: bool
    is_superuser: bool

    model_config = ConfigDict(from_attributes=True)

class UserUpdate(schemas.BaseUserUpdate):
    full_name: Optional[str] = None
