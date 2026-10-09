"""Copia de seguridad manual de la SQLite de NSDash.

Uso (desde backend/):
  python scripts/sqlite_backup.py

Ver docs/BACKUP.md (Railway: el backup fiable es el automático al arrancar el API).
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

_BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(_BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(_BACKEND_ROOT))

from app.db import resolve_sqlite_path  # noqa: E402
from app.sqlite_startup_backup import backup_dir_for_db, copy_sqlite_backup  # noqa: E402


def main() -> None:
    default_db = Path(resolve_sqlite_path())
    parser = argparse.ArgumentParser(description="Backup SQLite NSDash")
    parser.add_argument("--db", type=Path, default=default_db, help="Ruta al .db (default: DATABASE_PATH)")
    parser.add_argument(
        "--out",
        type=Path,
        default=None,
        help="Directorio de salida (default: SQLITE_BACKUP_DIR o carpeta del .db)",
    )
    args = parser.parse_args()
    src = args.db.resolve()
    if not src.is_file():
        raise SystemExit(f"No existe la base: {src}")
    out_dir = (args.out or backup_dir_for_db(src)).resolve()
    dest = copy_sqlite_backup(db_path=src, out_dir=out_dir)
    assert dest is not None
    print(f"Backup: {dest}")
    print(f"Tamaño: {dest.stat().st_size} bytes")


if __name__ == "__main__":
    main()
