"""Background work for profile embeddings and scheduled account deletion."""

from datetime import datetime, timezone
import hashlib
import logging

from celery.utils.log import get_task_logger
from sqlalchemy import select

from app.celery_app import celery_app
from app.database import SessionLocal
from app.feature_models import EcosystemProfile, ResumeOptimization
from app.models import User
from app.services.feature_ai import get_encoder
from app.services.llm_cache import clear_structured_response_cache
from app.services.matching import profile_match_text
from app.services.corpus_indexer import main as index_corpus_main
from app.services.resume_optimizer import delete_resume_pdf


logger = get_task_logger(__name__)
standard_logger = logging.getLogger(__name__)

# Keep these module-level dependencies replaceable for isolated task tests.
database_session_factory = SessionLocal
configured_encoder_factory = get_encoder


@celery_app.task(
    name="app.tasks.regenerate_ecosystem_profile_embedding",
    ignore_result=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=300,
    max_retries=5,
)
def regenerate_ecosystem_profile_embedding(profile_id: int) -> str:
    """Regenerate a profile vector from its latest saved fields (FR-7, NFR-20)."""
    with database_session_factory() as session:
        profile = session.scalar(
            select(EcosystemProfile)
            .where(EcosystemProfile.id == profile_id)
            .with_for_update()
        )
        if profile is None:
            return "missing"

        text = profile_match_text(profile)
        source_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
        encoder = configured_encoder_factory()
        if profile.source_hash == source_hash and profile.embedding_model == encoder.model_name:
            return "skipped"
        vector = encoder.encode([text])[0]
        profile.embedding = list(vector)
        profile.embedding_model = encoder.model_name
        profile.source_hash = source_hash
        session.commit()
        return "updated"


@celery_app.task(name="app.tasks.regenerate_stale_embeddings", ignore_result=True,
                 autoretry_for=(Exception,), retry_backoff=True, retry_backoff_max=300, max_retries=5)
def regenerate_stale_embeddings(batch_size: int = 100) -> dict[str, int]:
    if not 1 <= batch_size <= 1000:
        raise ValueError("batch_size must be between 1 and 1000")
    encoder = configured_encoder_factory()
    updated = skipped = 0
    with database_session_factory() as session:
        profiles = session.scalars(select(EcosystemProfile).order_by(EcosystemProfile.id)).all()
        pending = []
        for profile in profiles:
            source_hash = hashlib.sha256(profile_match_text(profile).encode("utf-8")).hexdigest()
            if profile.source_hash == source_hash and profile.embedding_model == encoder.model_name:
                skipped += 1
                continue
            pending.append((profile, source_hash))
        for offset in range(0, len(pending), batch_size):
            batch = pending[offset:offset + batch_size]
            vectors = encoder.encode([profile_match_text(profile) for profile, _ in batch])
            for (profile, source_hash), vector in zip(batch, vectors, strict=True):
                profile.embedding = list(vector)
                profile.embedding_model = encoder.model_name
                profile.source_hash = source_hash
            updated += len(batch)
        session.commit()
    standard_logger.info("Embedding regeneration finished: updated=%d skipped=%d", updated, skipped)
    return {"updated": updated, "skipped": skipped}


@celery_app.task(name="app.tasks.index_compliance_corpus", ignore_result=True,
                 autoretry_for=(Exception,), retry_backoff=True, retry_backoff_max=300, max_retries=5)
def index_compliance_corpus() -> dict[str, int]:
    index_corpus_main()
    standard_logger.info("Compliance corpus indexing task completed")
    return {"completed": 1}


@celery_app.task(
    name="app.tasks.purge_due_accounts",
    ignore_result=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=300,
    max_retries=5,
)
def purge_due_accounts(cutoff_iso: str | None = None, batch_size: int = 100) -> int:
    """Purge disabled accounts whose 30-day deletion window has elapsed (NFR-10, NFR-11)."""
    if not 1 <= batch_size <= 1000:
        raise ValueError("batch_size must be between 1 and 1000")
    cutoff = _parse_cutoff(cutoff_iso)

    with database_session_factory() as session:
        users = session.scalars(
            select(User)
            .where(
                User.is_active.is_(False),
                User.deletion_scheduled_for.is_not(None),
                User.deletion_scheduled_for <= cutoff,
            )
            .order_by(User.deletion_scheduled_for, User.id)
            .limit(batch_size)
            .with_for_update(skip_locked=True)
        ).all()

        for user in users:
            resume_keys = session.scalars(
                select(ResumeOptimization.storage_key).where(
                    ResumeOptimization.user_id == user.id
                )
            ).all()
            clear_structured_response_cache(user.id)
            for storage_key in resume_keys:
                delete_resume_pdf(storage_key)
            session.delete(user)

        session.commit()
        purged_count = len(users)

    if purged_count:
        logger.info("Purged %d due account(s)", purged_count)
    return purged_count


def _parse_cutoff(value: str | None) -> datetime:
    if value is None:
        return datetime.now(timezone.utc).replace(tzinfo=None)
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is not None:
        return parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed
