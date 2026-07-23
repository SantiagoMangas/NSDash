"""One-off migration: copy athletes and logs from test.db into app/database.db."""

import sqlite3
from pathlib import Path

SOURCE = Path("test.db")
TARGET = Path("app/database.db")


def migrate() -> None:
    if not SOURCE.exists():
        print("No test.db found, nothing to migrate.")
        return

    src = sqlite3.connect(SOURCE)
    dst = sqlite3.connect(TARGET)
    src_cur = src.cursor()
    dst_cur = dst.cursor()

    dst_cur.execute("SELECT COUNT(*) FROM athletes")
    if dst_cur.fetchone()[0] > 0:
        print("Target database already has athletes, skipping migration.")
        src.close()
        dst.close()
        return

    src_cur.execute("SELECT id, name, coach_id FROM athletes ORDER BY id")
    athletes = src_cur.fetchall()
    id_map: dict[int, int] = {}

    for old_id, name, _coach_id in athletes:
        dst_cur.execute(
            "INSERT INTO athletes (name, coach_id) VALUES (?, ?)",
            (name, 1),
        )
        id_map[old_id] = dst_cur.lastrowid

    src_cur.execute(
        "SELECT athlete_id, exercise_id, date, weight, reps, estimated_rm FROM training_logs"
    )
    for athlete_id, exercise_id, log_date, weight, reps, estimated_rm in src_cur.fetchall():
        dst_cur.execute(
            """
            INSERT INTO training_logs (athlete_id, exercise_id, date, weight, reps, estimated_rm)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (id_map[athlete_id], exercise_id, log_date, weight, reps, estimated_rm),
        )

    dst.commit()
    print(f"Migrated {len(athletes)} athletes and training logs into {TARGET}.")

    src.close()
    dst.close()


if __name__ == "__main__":
    migrate()
