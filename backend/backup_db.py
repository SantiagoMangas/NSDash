#!/usr/bin/env python3
"""Copia la base SQLite local a backend/backups/ antes de un deploy."""

import shutil
import sys
from datetime import datetime
from pathlib import Path

from app.db import get_sqlite_path


def backup() -> int:
    source = Path(get_sqlite_path())
    if not source.exists():
        print(f"No existe la base de datos en {source}")
        return 1

    backups_dir = Path(__file__).resolve().parent / "backups"
    backups_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    target = backups_dir / f"database_{timestamp}.db"

    shutil.copy2(source, target)
    print(f"Backup creado: {target}")
    print(f"Origen: {source}")
    return 0


if __name__ == "__main__":
    sys.exit(backup())
