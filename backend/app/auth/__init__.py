from .backend import fastapi_users, current_active_user  # Import relatif correct
from .router import router

__all__ = ["fastapi_users", "current_active_user", "router"]