"""JWT legacy (sin claim tv) y invalidación tras reset de coach."""

import os
import uuid

from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient
from jose import jwt

from app import auth, models
from app.db import SessionLocal
from app.main import app, migrate_user_profile_columns, on_startup, sync_user_roles_and_admin_profile

on_startup()
client = TestClient(app)
ADMIN_PW = os.environ["ADMIN_INITIAL_PASSWORD"]


def _login(email: str, password: str) -> str:
    res = client.post("/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


def test_legacy_admin_jwt_without_tv_valid_after_migration():
    """JWT emitido solo con user_id (sin auth_token_version) sigue válido para admin."""
    with SessionLocal() as db:
        user = db.query(models.User).filter(models.User.email == "admin@ns.com").first()
        assert user is not None
        legacy_token = auth.create_access_token({"user_id": user.id})

    payload = jwt.decode(legacy_token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
    assert "tv" not in payload

    migrate_user_profile_columns()
    with SessionLocal() as db:
        sync_user_roles_and_admin_profile(db)

    creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=legacy_token)
    with SessionLocal() as db:
        loaded = auth.get_current_user(db=db, credentials=creds)
        assert loaded.email == "admin@ns.com"
        assert loaded.role == "admin"


def test_coach_jwt_invalid_after_reset_password():
    admin_token = _login("admin@ns.com", ADMIN_PW)
    coach_email = f"jwt.reset.{uuid.uuid4().hex[:10]}@ns.com"
    create = client.post(
        "/admin/coaches",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "Coach JWT", "email": coach_email, "password": "TempPass99"},
    )
    assert create.status_code == 201, create.text
    coach_id = create.json()["id"]
    coach_token = _login(coach_email, "TempPass99")

    ok = client.get("/auth/me", headers={"Authorization": f"Bearer {coach_token}"})
    assert ok.status_code == 200, ok.text

    reset = client.post(
        f"/admin/coaches/{coach_id}/reset-password",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert reset.status_code == 200, reset.text

    stale = client.get("/auth/me", headers={"Authorization": f"Bearer {coach_token}"})
    assert stale.status_code == 401, stale.text
    assert "invalidad" in stale.json()["detail"].lower()
