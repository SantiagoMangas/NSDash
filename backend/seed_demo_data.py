#!/usr/bin/env python3
"""Carga atletas y registros de demo. Uso: python seed_demo_data.py"""

from app.db import Base, SessionLocal, engine
from app.demo_seed import ADMIN_EMAIL, has_demo_data, seed_demo_data


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if has_demo_data(db):
            print(f"Los datos demo ya existen para {ADMIN_EMAIL}.")
        created_athletes, created_logs = seed_demo_data(db)
        print(
            f"Listo. Atletas nuevos: {created_athletes}, registros nuevos: {created_logs}."
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
