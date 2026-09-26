"""Inventario del plantel demo. Uso: PYTHONPATH=. python scripts/demo_inventory.py"""

import json

from app.db import SessionLocal
from app.demo_seed import ADMIN_EMAIL, showcase_inventory, seed_showcase_data
from app.main import on_startup


def main() -> None:
    on_startup()
    db = SessionLocal()
    try:
        seed_stats = seed_showcase_data(db)
        report = showcase_inventory(db)
        report["seed_run"] = seed_stats
        print(json.dumps(report, indent=2, ensure_ascii=False))
    finally:
        db.close()


if __name__ == "__main__":
    main()
