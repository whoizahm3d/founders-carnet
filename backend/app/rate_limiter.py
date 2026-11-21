from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import get_settings


settings = get_settings()
AUTH_LIMIT = f"{settings.auth_rate_limit_per_minute}/minute"
AI_LIMIT = f"{settings.ai_rate_limit_per_minute}/minute"
limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=settings.rate_limit_storage_uri or settings.redis_url,
    headers_enabled=False,
    enabled=settings.rate_limit_enabled,
    in_memory_fallback_enabled=True,
)
