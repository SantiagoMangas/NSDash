"""Evidencia: tabla %RM por log (no best_historical)."""

from __future__ import annotations

import json

from fastapi.testclient import TestClient

from app.main import app, on_startup

on_startup()
client = TestClient(app)

login = client.post("/auth/login", json={"email": "admin@ns.com", "password": "1234"})
assert login.status_code == 200
headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

exercises = client.get("/exercises", headers=headers).json()
squat = next(e for e in exercises if e["name"] == "Sentadilla - Back Squat")
logs = [
    l
    for l in client.get("/logs", headers=headers).json()
    if l["exercise_id"] == squat["id"]
]
logs.sort(key=lambda x: x["date"])
assert len(logs) >= 2, "need 2+ squat logs for evidence"

a, b = logs[0], logs[-1]
sa = client.get(f"/logs/{a['id']}/summary", headers=headers)
sb = client.get(f"/logs/{b['id']}/summary", headers=headers)
assert sa.status_code == 200 and sb.status_code == 200
body_a, body_b = sa.json(), sb.json()

out = {
    "log_a": {"id": a["id"], "date": a["date"], "estimated_rm": body_a["estimated_rm"]},
    "log_b": {"id": b["id"], "date": b["date"], "estimated_rm": body_b["estimated_rm"]},
    "first_row_weight_a": body_a["percentages"][0]["weight"],
    "first_row_weight_b": body_b["percentages"][0]["weight"],
    "tables_differ": body_a["percentages"] != body_b["percentages"],
}
print(json.dumps(out, indent=2))
assert out["tables_differ"] or body_a["estimated_rm"] != body_b["estimated_rm"]
