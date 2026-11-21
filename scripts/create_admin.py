#!/usr/bin/env python3
"""Provision one admin account locally; no API route creates admin users."""

import argparse
import getpass
import os
import sys
from pathlib import Path


BACKEND = Path(__file__).resolve().parents[1] / "backend"
sys.path.insert(0, str(BACKEND))

from app.admin_provisioning import create_admin  # noqa: E402
from app.database import SessionLocal  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Create a Founders Carnet admin user")
    parser.add_argument("email")
    parser.add_argument("full_name")
    args = parser.parse_args()
    password = os.environ.get("CARNET_ADMIN_PASSWORD") or getpass.getpass("Admin password: ")
    if len(password) < 12:
        parser.error("Admin password must contain at least 12 characters")
    try:
        with SessionLocal() as session:
            user = create_admin(session, args.email, args.full_name, password)
    except ValueError as exc:
        parser.error(str(exc))
    print(f"Created admin user {user.email} (id {user.id}).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
