"""Re-embed ecosystem_profiles with the configured embedding model.

Run from the repository root or from backend/ after activating the rag venv:

    python backend/scripts/reembed_all.py [--model MODEL] [--batch BATCH] [--dry-run]

The script is idempotent: rows already tagged with the target model are skipped.
No rows are deleted. Vectors are updated in-place.

WARNING -- UNTESTED ON A LIVE DATABASE
This script has never been run against a real pgvector database. It has been
reviewed for logic only. Verify on a database snapshot or staging environment
before running in production.

COMPLIANCE CHUNKS -- USE THE CORPUS INDEXER INSTEAD
This script does NOT re-embed compliance_chunks. The corpus indexer
(backend/app/services/corpus_indexer.py) calls encoder.prepare_chunks() before
embedding, which splits long chunks into ordered :continuation-N passages
(53 of 240 chunks exceed E5's 512-token limit, producing 301 passages). This
script cannot replicate that splitting because it only has row texts, not the
original CitationChunk objects. Re-running the corpus indexer with E5 is the
correct and safe path:

    cd backend
    python -m app.services.corpus_indexer

The indexer is idempotent for text that has not changed: it re-embeds only rows
whose embedding_model differs from the configured model.

ECOSYSTEM PROFILES
Profile texts are symmetric (startup and investor both use the passage: prefix
via encoder.encode()). The matching query filters by embedding_model, so
existing MPNet-encoded profiles are invisible to E5 queries and must be
re-embedded here.

Requires:
  - DATABASE_URL env var (or SQLite default via app settings)
  - sentence-transformers installed in the active venv (rag/.venv)
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

# Allow running from repo root or from backend/.
_REPO_ROOT = Path(__file__).resolve().parents[2]
_BACKEND_DIR = _REPO_ROOT / "backend"
for _p in (_REPO_ROOT, _BACKEND_DIR):
    if str(_p) not in sys.path:
        sys.path.insert(0, str(_p))


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Re-embed ecosystem_profiles with the configured embedding model"
    )
    parser.add_argument(
        "--target",
        default="ecosystem_profiles",
        choices=["ecosystem_profiles", "compliance_chunks"],
        help="Target table to re-embed (default: ecosystem_profiles). compliance_chunks is refused with instructions to re-run corpus_indexer.",
    )
    parser.add_argument(
        "--model",
        default=None,
        help="Embedding model name. Defaults to the value in app settings.",
    )
    parser.add_argument(
        "--batch",
        type=int,
        default=64,
        help="Rows per batch (default 64).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print counts without writing to the database.",
    )
    return parser.parse_args()


def _build_encoder(model_name: str):
    from rag.compliance.embeddings import SentenceTransformerEncoder

    print(f"Loading encoder: {model_name}")
    enc = SentenceTransformerEncoder(model_name)
    # Force model load now so errors surface before the DB loop.
    enc._load_model()
    return enc


def _reembed_profiles(session, encoder, model_name: str, batch: int, dry_run: bool) -> int:
    from app.feature_models import EcosystemProfile
    from app.tasks import profile_match_text

    total = 0
    offset = 0
    while True:
        rows = (
            session.query(EcosystemProfile)
            .filter(
                (EcosystemProfile.embedding_model != model_name)
                | (EcosystemProfile.embedding_model.is_(None))
            )
            .order_by(EcosystemProfile.id)
            .limit(batch)
            .offset(offset)
            .all()
        )
        if not rows:
            break
        texts = [profile_match_text(row) for row in rows]
        vectors = encoder.encode(texts)
        if not dry_run:
            for row, vec in zip(rows, vectors):
                row.embedding = list(vec)
                row.embedding_model = model_name
            session.commit()
        total += len(rows)
        print(f"  profiles: processed {total} rows")
        if dry_run:
            offset += batch
    return total


def main() -> None:
    args = _parse_args()

    from app.config import get_settings
    from app.database import get_db

    settings = get_settings()
    model_name: str = args.model or settings.embedding_model_name
    print(f"Target model: {model_name}")
    print(f"Target table: {args.target}")
    print(f"Batch size:   {args.batch}")
    print(f"Dry run:      {args.dry_run}")
    print()

    if args.target == "compliance_chunks":
        sys.exit(
            "ERROR: Refusing to re-embed compliance_chunks in-place.\n"
            "       The corpus indexer must be used instead so that prepare_chunks()\n"
            "       correctly splits long passages into continuation passages (53 of 240\n"
            "       chunks exceed E5's 512-token limit, producing 301 passages):\n\n"
            "           cd backend\n"
            "           python -m app.services.corpus_indexer\n"
        )

    # Inform operator that compliance_chunks requires the corpus indexer
    print(
        "NOTE: compliance_chunks are NOT re-embedded by this script.\n"
        "      Re-run the corpus indexer to re-index compliance chunks with the\n"
        "      new model (it handles passage splitting and is idempotent):\n\n"
        "          cd backend\n"
        "          python -m app.services.corpus_indexer\n"
    )

    encoder = _build_encoder(model_name)

    db_gen = get_db()
    session = next(db_gen)
    try:
        print("Re-embedding ecosystem_profiles ...")
        n_profiles = _reembed_profiles(session, encoder, model_name, args.batch, args.dry_run)
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass

    action = "Would update" if args.dry_run else "Updated"
    print()
    print(f"{action} {n_profiles} ecosystem profile(s).")
    print("Run the corpus indexer separately for compliance_chunks (see note above).")


if __name__ == "__main__":
    main()
