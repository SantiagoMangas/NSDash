"""Contraseñas temporales: secrets, sin logs, una sola vez en la respuesta HTTP."""

import logging
import os
import uuid
from unittest.mock import patch

from fastapi.testclient import TestClient

from app import user_routes
from app.main import app, on_startup

on_startup()
client = TestClient(app)
ADMIN_PW = os.environ["ADMIN_INITIAL_PASSWORD"]


def _admin_token() -> str:
    res = client.post("/auth/login", json={"email": "admin@ns.com", "password": ADMIN_PW})
    assert res.status_code == 200
    return res.json()["access_token"]


def test_generate_temporary_password_uses_secrets_module():
    with patch("app.user_routes.secrets.choice", side_effect=lambda x: "a") as mock_choice:
        password = user_routes._generate_temporary_password()
        assert mock_choice.called
        assert len(password) >= 8


def test_reset_password_not_logged_and_returned_once(caplog):
    caplog.set_level(logging.DEBUG)
    token = _admin_token()
    email = f"pwd.reset.{uuid.uuid4().hex[:10]}@ns.com"
    create = client.post(
        "/admin/coaches",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Pwd", "email": email, "password": "TempPass99"},
    )
    assert create.status_code == 201
    coach_id = create.json()["id"]

    with caplog.at_level(logging.DEBUG):
        reset = client.post(
            f"/admin/coaches/{coach_id}/reset-password",
            headers={"Authorization": f"Bearer {token}"},
        )
    assert reset.status_code == 200
    temp = reset.json()["temporary_password"]
    assert len(temp) >= 8
    assert temp not in caplog.text

    get_coach = client.get("/admin/coaches", headers={"Authorization": f"Bearer {token}"})
    assert get_coach.status_code == 200
    row = next(c for c in get_coach.json() if c["id"] == coach_id)
    assert "temporary_password" not in row
    assert temp not in str(get_coach.json())


def test_create_coach_returns_temporary_password_once_in_body():
    token = _admin_token()
    email = f"pwd.create.{uuid.uuid4().hex[:10]}@ns.com"
    plain = "MyTempPass88"
    create = client.post(
        "/admin/coaches",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Nuevo", "email": email, "password": plain},
    )
    assert create.status_code == 201
    body = create.json()
    assert body["temporary_password"] == plain
    assert body["must_change_password"] is True

    listing = client.get("/admin/coaches", headers={"Authorization": f"Bearer {token}"})
    row = next(c for c in listing.json() if c["email"] == email)
    assert "temporary_password" not in row
