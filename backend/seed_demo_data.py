#!/usr/bin/env python3
"""Carga atletas y registros de demo. Uso: python seed_demo_data.py"""

from app.db import Base, SessionLocal, engine
from app.demo_seed import (
    ADMIN_EMAIL,
    has_demo_data,
    has_resistencia_demo_data,
    seed_demo_data,
    seed_resistencia_demo_data,
)


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if has_demo_data(db):
            print(f"Los datos demo de fuerza ya existen para {ADMIN_EMAIL}.")
        created_athletes, created_logs = seed_demo_data(db)
        print(
            f"Fuerza — atletas nuevos: {created_athletes}, registros nuevos: {created_logs}."
        )

        if has_resistencia_demo_data(db):
            print(f"Los datos demo de resistencia ya existen para {ADMIN_EMAIL}.")
        res_athletes, res_vam, res_speed, res_rsa = seed_resistencia_demo_data(db)
        print(
            f"Resistencia — atletas nuevos: {res_athletes}, "
            f"VAM: {res_vam}, velocidad: {res_speed}, RSA: {res_rsa}."
        )
    finally:
        db.close()


if __name__ == "__main__":
    main()
