#!/usr/bin/env python3
"""Carga plantel demo (equipos, fuerza, resistencia). Uso: python seed_demo_data.py"""

from app.db import Base, SessionLocal, engine
from app.demo_seed import ADMIN_EMAIL, has_showcase_data, seed_showcase_data
from app.main import on_startup


def main() -> None:
    on_startup()
    db = SessionLocal()
    try:
        if has_showcase_data(db):
            print(f"Showcase ya presente para {ADMIN_EMAIL}; se completan faltantes…")
        stats = seed_showcase_data(db)
        print("Showcase NSDash:", stats)
    finally:
        db.close()


if __name__ == "__main__":
    main()
