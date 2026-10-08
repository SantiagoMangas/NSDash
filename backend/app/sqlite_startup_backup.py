"""Copia SQLite antes de migraciones (arranque y script CLI)."""

from __future__ import annotations

import logging
import os
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path

from .db import resolve_sqlite_path

logger = logging.getLogger(__name__)

BACKUP_NAME_RE = re.compile(r"^database-\d{8}-\d{6}\.db$")
DEFAULT_RETENTION = 5


def backup_dir_for_db(db_path: Path) -> Path:
    configured = os.getenv("SQLITE_BACKUP_DIR", "").strip()
    if configured:
        return Path(configured)
    return db_path.parent


def retention_count() -> int:
    raw = os.getenv("SQLITE_BACKUP_RETENTION", "").strip()
    if not raw:
        return DEFAULT_RETENTION
    try:
        value = int(raw)
    except ValueError:
        return DEFAULT_RETENTION
    return max(1, value)


def _prune_old_backups(out_dir: Path, keep: int) -> None:
    candidates = [
        p
        for p in out_dir.iterdir()
        if p.is_file() and BACKUP_NAME_RE.match(p.name)
    ]
    candidates.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    for stale in candidates[keep:]:
        try:
            stale.unlink()
            logger.info("Backup antiguo eliminado: %s", stale.name)
        except OSError as exc:
            logger.warning("No se pudo eliminar backup %s: %s", stale, exc)


def copy_sqlite_backup(
    db_path: Path | None = None,
    out_dir: Path | None = None,
    retention: int | None = None,
) -> Path | None:
    """
    Copia la base a database-YYYYMMDD-HHMMSS.db y conserva los últimos `retention`.
    Devuelve la ruta del backup o None si no había archivo fuente.
    """
    src = (db_path or Path(resolve_sqlite_path())).resolve()
    if not src.is_file():
        return None

    dest_dir = (out_dir or backup_dir_for_db(src)).resolve()
    dest_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    dest = dest_dir / f"database-{stamp}.db"
    shutil.copy2(src, dest)
    _prune_old_backups(dest_dir, retention if retention is not None else retention_count())
    return dest


def try_backup_sqlite_before_migrations() -> None:
    """No lanza: registra error y permite continuar el arranque."""
    try:
        dest = copy_sqlite_backup()
        if dest is None:
            logger.info("Backup pre-migración omitido: aún no existe la base de datos")
            return
        logger.info(
            "Backup pre-migración creado: %s (%s bytes)",
            dest,
            dest.stat().st_size,
        )
    except Exception:
        logger.exception("Backup pre-migración falló; el arranque continúa")
