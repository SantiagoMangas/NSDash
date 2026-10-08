"""Run log_kind + pull_up_modality migrations twice on a DB copy; print counts."""
import os
import shutil
import sqlite3
import sys
from pathlib import Path

backend = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(backend))
os.environ.setdefault("DATABASE_PATH", "")

src = backend / "app" / "database.db"
dst = backend / "app" / "database_migration_test.db"
if dst.exists():
    dst.unlink()
shutil.copy2(src, dst)

os.environ["DATABASE_PATH"] = str(dst)

from app.db import engine  # noqa: E402
from app.main import (  # noqa: E402
    migrate_exercise_log_kind_column,
    migrate_training_log_pull_up_modality_column,
)


def table_counts(conn: sqlite3.Connection) -> dict[str, int]:
    c = conn.cursor()
    out = {}
    for t in ("users", "athletes", "teams", "training_logs"):
        c.execute(f"SELECT COUNT(*) FROM {t}")
        out[t] = c.fetchone()[0]
    return out


def maxima_snapshot(conn: sqlite3.Connection) -> tuple[int, list[tuple]]:
    c = conn.cursor()
    c.execute(
        "SELECT id, name FROM athletes WHERE name LIKE '%Alvarez%' OR name LIKE '%Máxima%' OR name LIKE '%Maxima%'"
    )
    rows = c.fetchall()
    if not rows:
        return 0, []
    aid = rows[0][0]
    c.execute(
        "SELECT id, date, estimated_rm FROM training_logs WHERE athlete_id=? ORDER BY date, id",
        (aid,),
    )
    logs = [(r[0], r[1], r[2]) for r in c.fetchall()]
    return len(logs), logs


conn = sqlite3.connect(dst)
print("=== BEFORE (copy, no extra migrations) ===")
print("counts:", table_counts(conn))
n, logs = maxima_snapshot(conn)
print(f"Maxima logs: {n}")
print("RM fingerprint:", tuple((d, rm) for _, d, rm in logs))

for run in (1, 2):
    migrate_exercise_log_kind_column()
    migrate_training_log_pull_up_modality_column()
    conn = sqlite3.connect(dst)
    print(f"=== AFTER migration run {run} ===")
    print("counts:", table_counts(conn))
    n2, logs2 = maxima_snapshot(conn)
    print(f"Maxima logs: {n2}")
    print("RM fingerprint:", tuple((d, rm) for _, d, rm in logs2))
    assert logs == logs2, "Maxima RMs changed!"
    conn.close()

print("OK: counts stable, Maxima RMs unchanged across 2 migration runs")
