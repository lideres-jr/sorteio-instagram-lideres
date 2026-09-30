from functools import lru_cache

from app.config import get_settings
from app.repositories.base import DrawRepository
from app.repositories.memory import InMemoryDrawRepository
from app.repositories.supabase import SupabaseDrawRepository
from app.services.draw import DrawService
from app.services.instagram import InstagramClient


@lru_cache
def get_repository() -> DrawRepository:
    settings = get_settings()
    if settings.storage_backend == "supabase":
        if not settings.supabase_url or not settings.supabase_key:
            raise RuntimeError(
                "STORAGE_BACKEND=supabase exige SUPABASE_URL e SUPABASE_KEY."
            )
        return SupabaseDrawRepository(settings.supabase_url, settings.supabase_key)
    return InMemoryDrawRepository()


def get_draw_service() -> DrawService:
    return DrawService(get_repository())


def get_instagram_client() -> InstagramClient:
    settings = get_settings()
    return InstagramClient(
        settings.instagram_access_token, settings.instagram_api_version
    )

