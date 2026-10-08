import logging
import os
from pathlib import Path



from app.sqlite_startup_backup import _prune_old_backups, copy_sqlite_backup, try_backup_sqlite_before_migrations





def test_prune_keeps_only_five_newest(tmp_path: Path):

    out = tmp_path

    paths = []

    base_time = 1_700_000_000.0
    for i in range(7):
        p = out / f"database-2026010{i}-12000{i}.db"
        p.write_bytes(b"x")
        os.utime(p, (base_time + i, base_time + i))
        paths.append(p)

    _prune_old_backups(out, 5)

    remaining = sorted(out.glob("database-*.db"), key=lambda x: x.stat().st_mtime)
    assert len(remaining) == 5
    assert remaining == paths[-5:]





def test_copy_sqlite_backup_creates_file(tmp_path: Path):

    db = tmp_path / "database.db"

    db.write_bytes(b"sqlite")

    dest = copy_sqlite_backup(db_path=db, out_dir=tmp_path, retention=5)

    assert dest is not None

    assert dest.is_file()

    assert dest.read_bytes() == b"sqlite"





def test_startup_backup_failure_does_not_raise(caplog):

    import app.sqlite_startup_backup as mod



    original = mod.copy_sqlite_backup



    def boom(**_kwargs):

        raise RuntimeError("disk full")



    mod.copy_sqlite_backup = boom  # type: ignore[assignment]

    try:

        with caplog.at_level(logging.ERROR):

            try_backup_sqlite_before_migrations()

    finally:

        mod.copy_sqlite_backup = original  # type: ignore[assignment]



    assert any("Backup pre-migración falló" in r.message for r in caplog.records)


