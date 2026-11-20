"""Guard conditions and lock enforcement for compliance evaluation test runs.

Rules enforced:
1. Git working tree must be clean for .py code under rag/ and backend/.
   (Non-code files, results/, .md files, and caches are ignored).
2. The test run lock file must not already exist (prevents a second test run).
3. The explicit --confirm-test-run flag must be passed.
"""

from __future__ import annotations

import json
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Sequence

_REPO = Path(__file__).resolve().parents[2]


def get_git_commit_hash(repo_root: Path = _REPO) -> str:
    """Return the current HEAD commit hash, or a fallback hash if git fails."""
    try:
        proc = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=repo_root,
            capture_output=True,
            text=True,
            check=True,
        )
        return proc.stdout.strip()
    except Exception:
        return "unknown"


def parse_porcelain_line(line: str) -> str | None:
    """Extract relative path from a git status --porcelain line."""
    stripped = line.strip()
    if not stripped:
        return None
    # Format: XY <path> or XY <path1> -> <path2>
    parts = line[3:].strip()
    if " -> " in parts:
        parts = parts.split(" -> ", 1)[1].strip()
    return parts.strip('"')


def is_ignored_path(path_str: str) -> bool:
    """Check whether a path should be ignored by code-cleanliness checks."""
    normalized = path_str.replace("\\", "/")
    # Ignore anything not ending in .py
    if not normalized.endswith(".py"):
        return True
    # Ignore results directory
    if "rag/evaluation/results/" in normalized:
        return True
    # Ignore caches and virtual environments
    if "/__pycache__/" in normalized or normalized.startswith("__pycache__/"):
        return True
    if "/.pytest_cache/" in normalized or normalized.startswith(".pytest_cache/"):
        return True
    if "/.venv/" in normalized or normalized.startswith(".venv/"):
        return True
    return False


def is_relevant_code_path(path_str: str) -> bool:
    """Check whether a path is Python code under rag/ or backend/."""
    normalized = path_str.replace("\\", "/")
    if is_ignored_path(normalized):
        return False
    return normalized.startswith("rag/") or normalized.startswith("backend/")


def get_uncommitted_code_files(
    repo_root: Path = _REPO,
    status_output: str | None = None,
) -> list[str]:
    """Return a list of uncommitted .py files under rag/ and backend/."""
    if status_output is None:
        try:
            proc = subprocess.run(
                ["git", "status", "--porcelain"],
                cwd=repo_root,
                capture_output=True,
                text=True,
                check=True,
            )
            status_output = proc.stdout
        except Exception as exc:
            raise RuntimeError(f"Failed to query git status: {exc}") from exc

    dirty: list[str] = []
    for line in status_output.splitlines():
        rel_path = parse_porcelain_line(line)
        if rel_path and is_relevant_code_path(rel_path):
            dirty.append(rel_path.replace("\\", "/"))
    return sorted(dirty)


def is_git_working_tree_clean_for_code(
    repo_root: Path = _REPO,
    status_output: str | None = None,
) -> tuple[bool, list[str]]:
    """Return (clean, list_of_dirty_python_files)."""
    dirty = get_uncommitted_code_files(repo_root, status_output=status_output)
    return len(dirty) == 0, dirty


def check_test_run_guards(
    lock_file: Path,
    confirm_flag: bool,
    repo_root: Path = _REPO,
    status_output: str | None = None,
) -> None:
    """Enforce all three test run conditions. Raises RuntimeError on violation."""
    if not confirm_flag:
        raise RuntimeError(
            "Test run refused: missing explicit --confirm-test-run flag."
        )

    if lock_file.exists():
        raise RuntimeError(
            f"Test run refused: lock file already exists at {lock_file}. "
            "The test split cannot be run a second time."
        )

    clean, dirty_files = is_git_working_tree_clean_for_code(
        repo_root, status_output=status_output
    )
    if not clean:
        raise RuntimeError(
            "Test run refused: uncommitted .py code changes found in: "
            + ", ".join(dirty_files)
            + ". Working tree for rag/ and backend/ code must be clean before running test split."
        )


def write_test_run_lock(
    lock_file: Path,
    run_type: str,
    metadata: dict[str, object] | None = None,
    repo_root: Path = _REPO,
) -> None:
    """Write lock file with commit hash and timestamp."""
    lock_file.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "run_type": run_type,
        "git_commit": get_git_commit_hash(repo_root),
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "metadata": metadata or {},
    }
    lock_file.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
