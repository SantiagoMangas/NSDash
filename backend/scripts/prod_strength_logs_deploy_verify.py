#!/usr/bin/env python3
"""
Foto y verificación post-deploy de logs de fuerza en producción (solo lectura).

Requiere variables de entorno (no leer ni guardar credenciales en el repo):
  PROD_API_URL, PROD_LOGIN_EMAIL, PROD_LOGIN_PASSWORD
  SNAPSHOT_DIR (opcional; default: %LOCALAPPDATA%/nsdash-deploy)

Uso:
  python scripts/prod_strength_logs_deploy_verify.py --phase pre
  python scripts/prod_strength_logs_deploy_verify.py --phase post
  python scripts/prod_strength_logs_deploy_verify.py --phase compare
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.strength_log_kinds import LOG_KIND_PULL_UP, resolve_log_kind_for_exercise_name
from app.strength_rm import compute_brzycki_rm, validate_rm_reps

_PROTECTED_ATHLETE_MARKER = "Alvarez"  # filtro interno; salida sin nombres


def _require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise SystemExit(f"Falta variable de entorno: {name}")
    return value


def _api_json(
    base: str,
    path: str,
    token: str | None = None,
    *,
    method: str = "GET",
    body: dict | None = None,
) -> object:
    headers: dict[str, str] = {}
    data: bytes | None = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{base.rstrip('/')}{path}", data=data, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode())


def _login(base: str, email: str, password: str) -> str:
    payload = _api_json(
        base,
        "/auth/login",
        method="POST",
        body={"email": email, "password": password},
    )
    return str(payload["access_token"])


def _snapshot_dir() -> Path:
    raw = os.getenv("SNAPSHOT_DIR", "").strip()
    if raw:
        out = Path(raw).expanduser()
    else:
        out = Path(os.environ.get("LOCALAPPDATA", ".")) / "nsdash-deploy"
    out.mkdir(parents=True, exist_ok=True)
    return out


def _expected_rm_brzycki(weight: float, reps: int) -> float | None:
    try:
        validate_rm_reps(int(reps))
        return round(compute_brzycki_rm(float(weight), int(reps)), 2)
    except ValueError:
        return None


def _fetch_snapshot(base: str, token: str) -> dict:
    exercises = _api_json(base, "/exercises", token)
    logs = _api_json(base, "/logs", token)
    athletes = _api_json(base, "/athletes", token)

    ex_by_id = {int(e["id"]): e for e in exercises}
    protected_id: int | None = None
    for athlete in athletes:
        name = str(athlete.get("name") or "")
        if _PROTECTED_ATHLETE_MARKER in name or "Máxima" in name or "Maxima" in name:
            protected_id = int(athlete["id"])
            break

    rows: list[dict] = []
    for log in logs:
        ex = ex_by_id.get(int(log["exercise_id"]))
        ex_name = ex["name"] if ex else f"exercise_id={log['exercise_id']}"
        log_kind = (
            str(ex.get("log_kind") or resolve_log_kind_for_exercise_name(ex_name))
            if ex
            else resolve_log_kind_for_exercise_name(ex_name)
        )
        weight = float(log["weight"])
        reps = int(log["reps"])
        stored_rm = log.get("estimated_rm")
        stored_rm_rounded = (
            round(float(stored_rm), 2) if stored_rm is not None else None
        )
        if log_kind == LOG_KIND_PULL_UP:
            expected_rm = None
        else:
            expected_rm = _expected_rm_brzycki(weight, reps)

        rows.append(
            {
                "id": int(log["id"]),
                "exercise": ex_name,
                "exercise_id": int(log["exercise_id"]),
                "athlete_id": int(log["athlete_id"]),
                "weight": weight,
                "reps": reps,
                "estimated_rm": stored_rm_rounded,
                "expected_rm_brzycki": expected_rm,
                "log_kind": log_kind,
            }
        )

    protected_logs = [
        r for r in rows if protected_id is not None and r["athlete_id"] == protected_id
    ]
    pct_changes: list[float] = []
    for row in protected_logs:
        before = row["estimated_rm"]
        after = row["expected_rm_brzycki"]
        if before is not None and after is not None and before != 0:
            pct_changes.append(round((after - before) / before * 100, 4))

    summary_sample_log_id: int | None = None
    for log in logs:
        if log.get("estimated_rm") is not None:
            summary_sample_log_id = int(log["id"])
            break

    summary_percentages: list[dict] | None = None
    if summary_sample_log_id is not None:
        try:
            summary = _api_json(base, f"/logs/{summary_sample_log_id}/summary", token)
            summary_percentages = summary.get("percentages")
        except urllib.error.HTTPError:
            summary_percentages = None

    return {
        "api_base": base,
        "logs_total": len(rows),
        "rows": rows,
        "protected_athlete": {
            "athlete_id": protected_id,
            "rm_estimated_logs_count": len(
                [r for r in protected_logs if r["log_kind"] != LOG_KIND_PULL_UP]
            ),
            "pull_up_logs_count": len(
                [r for r in protected_logs if r["log_kind"] == LOG_KIND_PULL_UP]
            ),
            "logs": [
                {
                    "id": r["id"],
                    "weight": r["weight"],
                    "reps": r["reps"],
                    "estimated_rm_before_snapshot": r["estimated_rm"],
                    "expected_rm_brzycki": r["expected_rm_brzycki"],
                    "rm_change_pct_vs_brzycki": (
                        round(
                            (r["expected_rm_brzycki"] - r["estimated_rm"])
                            / r["estimated_rm"]
                            * 100,
                            4,
                        )
                        if r["estimated_rm"] is not None
                        and r["expected_rm_brzycki"] is not None
                        and r["estimated_rm"] != 0
                        else None
                    ),
                }
                for r in protected_logs
                if r["log_kind"] != LOG_KIND_PULL_UP
            ],
            "rm_change_pct_min": min(pct_changes) if pct_changes else None,
            "rm_change_pct_max": max(pct_changes) if pct_changes else None,
        },
        "summary_sample_log_id": summary_sample_log_id,
        "summary_sample_percentages": summary_percentages,
    }


def _write_snapshot(phase: str, data: dict) -> Path:
    dest = _snapshot_dir() / f"strength-logs-{phase}.json"
    dest.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    return dest


def _compare(pre: dict, post: dict) -> dict:
    pre_by_id = {r["id"]: r for r in pre["rows"]}
    post_by_id = {r["id"]: r for r in post["rows"]}
    issues: list[str] = []

    if set(pre_by_id) != set(post_by_id):
        issues.append(
            f"Conjunto de IDs distinto: pre={len(pre_by_id)} post={len(post_by_id)}"
        )

    for log_id, before in pre_by_id.items():
        after = post_by_id.get(log_id)
        if after is None:
            issues.append(f"log {log_id}: desapareció en post")
            continue

        if before["log_kind"] == LOG_KIND_PULL_UP:
            if after["estimated_rm"] is not None:
                issues.append(f"log {log_id}: dominada con estimated_rm no null")
            continue

        pre_rm = before["estimated_rm"]
        post_rm = after["estimated_rm"]
        expected = after["expected_rm_brzycki"]

        if before["log_kind"] != LOG_KIND_PULL_UP and post_rm != expected:
            issues.append(
                f"log {log_id} ({before['exercise']}): post RM {post_rm} != "
                f"esperado Brzycki {expected}"
            )

        pre_summary = pre.get("summary_sample_percentages")
        post_summary = post.get("summary_sample_percentages")
        if pre_summary and post_summary and pre_summary != post_summary:
            issues.append(
                f"summary log {pre.get('summary_sample_log_id')}: tabla %RM cambió"
            )

    protected_post = post.get("protected_athlete") or {}
    protected_id = protected_post.get("athlete_id")
    pre_prot: dict[int, dict] = {}
    deploy_pct: list[float] = []
    if protected_id is not None:
        pre_prot = {
            r["id"]: r
            for r in pre["rows"]
            if r["athlete_id"] == protected_id and r["log_kind"] != LOG_KIND_PULL_UP
        }
        for log_id, row in pre_prot.items():
            aft = post_by_id.get(log_id)
            if aft is None:
                continue
            before_rm = row.get("estimated_rm")
            after_rm = aft.get("estimated_rm")
            if before_rm is not None and after_rm is not None and before_rm != 0:
                deploy_pct.append(
                    round((after_rm - before_rm) / before_rm * 100, 4)
                )

    if protected_post.get("rm_estimated_logs_count") != 33:
        issues.append(
            "Atleta protegido: se esperaban 33 logs rm_estimated, "
            f"hay {protected_post.get('rm_estimated_logs_count')}"
        )

    return {
        "ok": not issues,
        "issues": issues,
        "protected_post": {
            "rm_estimated_logs_count": protected_post.get("rm_estimated_logs_count"),
            "rm_change_pct_min": min(deploy_pct) if deploy_pct else None,
            "rm_change_pct_max": max(deploy_pct) if deploy_pct else None,
            "logs_with_rm_change": sum(
                1
                for log_id, row in pre_prot.items()
                if post_by_id.get(log_id, {}).get("estimated_rm") != row.get("estimated_rm")
            ),
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--phase", choices=("pre", "post", "compare"), required=True)
    args = parser.parse_args()

    if args.phase == "compare":
        out_dir = _snapshot_dir()
        pre_path = out_dir / "strength-logs-pre.json"
        post_path = out_dir / "strength-logs-post.json"
        if not pre_path.is_file() or not post_path.is_file():
            raise SystemExit(f"Faltan {pre_path} o {post_path}")
        pre = json.loads(pre_path.read_text(encoding="utf-8"))
        post = json.loads(post_path.read_text(encoding="utf-8"))
        report = _compare(pre, post)
        report_path = out_dir / "strength-logs-compare-report.json"
        report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
        print(json.dumps(report, indent=2, ensure_ascii=False))
        print(f"Reporte: {report_path}")
        return 1 if not report["ok"] else 0

    base = _require_env("PROD_API_URL")
    email = _require_env("PROD_LOGIN_EMAIL")
    password = _require_env("PROD_LOGIN_PASSWORD")
    token = _login(base, email, password)
    snapshot = _fetch_snapshot(base, token)
    path = _write_snapshot(args.phase, snapshot)
    print(f"Snapshot {args.phase}: {path}")
    print(f"Logs: {snapshot['logs_total']}")
    pa = snapshot["protected_athlete"]
    print(
        f"Atleta protegido (sin nombre): rm_estimated={pa['rm_estimated_logs_count']} "
        f"pct min/max={pa['rm_change_pct_min']}/{pa['rm_change_pct_max']}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())