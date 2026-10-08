import os
import uuid

from fastapi.testclient import TestClient

from app.main import app, on_startup

on_startup()
client = TestClient(app)

ADMIN_PW = os.environ["ADMIN_INITIAL_PASSWORD"]


def _login(email: str, password: str) -> str:
    res = client.post("/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


def test_admin_can_list_coaches():
    token = _login("admin@ns.com", ADMIN_PW)
    res = client.get("/admin/coaches", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200


def test_coach_forbidden_on_admin_coaches():
    admin_token = _login("admin@ns.com", ADMIN_PW)
    coach_email = f"coach.{uuid.uuid4().hex[:10]}@ns.com"
    create = client.post(
        "/admin/coaches",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Coach Prueba",
            "email": coach_email,
            "password": "TempPass99",
        },
    )
    assert create.status_code == 201, create.text
    coach_token = _login(coach_email, "TempPass99")
    res = client.get("/admin/coaches", headers={"Authorization": f"Bearer {coach_token}"})
    assert res.status_code == 403


def test_deactivated_coach_jwt_rejected():
    admin_token = _login("admin@ns.com", ADMIN_PW)
    coach_email = f"coach.inactive.{uuid.uuid4().hex[:10]}@ns.com"
    create = client.post(
        "/admin/coaches",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Coach Inactivo",
            "email": coach_email,
            "password": "TempPass99",
        },
    )
    assert create.status_code == 201, create.text
    coach_id = create.json()["id"]
    coach_token = _login(coach_email, "TempPass99")

    ok = client.get("/auth/me", headers={"Authorization": f"Bearer {coach_token}"})
    assert ok.status_code == 200, ok.text

    deactivate = client.patch(
        f"/admin/coaches/{coach_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"is_active": False},
    )
    assert deactivate.status_code == 200, deactivate.text

    after = client.get("/athletes", headers={"Authorization": f"Bearer {coach_token}"})
    assert after.status_code == 401, after.text
    assert "desactivada" in after.json()["detail"].lower()


def test_admin_can_update_coach_profile():
    admin_token = _login("admin@ns.com", ADMIN_PW)
    coach_email = f"coach.edit.{uuid.uuid4().hex[:10]}@ns.com"
    create = client.post(
        "/admin/coaches",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "Antes", "email": coach_email, "password": "TempPass99"},
    )
    assert create.status_code == 201, create.text
    coach_id = create.json()["id"]

    patch = client.patch(
        f"/admin/coaches/{coach_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Después",
            "phone": "+54 11 5555-0000",
            "bio": "Bio coach",
        },
    )
    assert patch.status_code == 200, patch.text
    body = patch.json()
    assert body["name"] == "Después"
    assert body["phone"] == "+54 11 5555-0000"
    assert body["bio"] == "Bio coach"


def test_duplicate_email_on_coach_update_returns_409():
    admin_token = _login("admin@ns.com", ADMIN_PW)
    email_a = f"a.{uuid.uuid4().hex[:10]}@ns.com"
    email_b = f"b.{uuid.uuid4().hex[:10]}@ns.com"
    c1 = client.post(
        "/admin/coaches",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "Uno", "email": email_a, "password": "TempPass99"},
    )
    c2 = client.post(
        "/admin/coaches",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "Dos", "email": email_b, "password": "TempPass99"},
    )
    assert c1.status_code == 201 and c2.status_code == 201
    coach_b_id = c2.json()["id"]

    dup = client.patch(
        f"/admin/coaches/{coach_b_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"email": email_a},
    )
    assert dup.status_code == 409, dup.text
    assert "email" in dup.json()["detail"].lower()


def test_coach_forbidden_on_admin_coach_patch():
    admin_token = _login("admin@ns.com", ADMIN_PW)
    coach_email = f"coach.patch.{uuid.uuid4().hex[:10]}@ns.com"
    create = client.post(
        "/admin/coaches",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "Coach", "email": coach_email, "password": "TempPass99"},
    )
    assert create.status_code == 201, create.text
    coach_id = create.json()["id"]
    coach_token = _login(coach_email, "TempPass99")

    res = client.patch(
        f"/admin/coaches/{coach_id}",
        headers={"Authorization": f"Bearer {coach_token}"},
        json={"name": "Hack"},
    )
    assert res.status_code == 403


def test_reset_password_invalidates_previous_jwt():
    admin_token = _login("admin@ns.com", ADMIN_PW)
    coach_email = f"coach.reset.{uuid.uuid4().hex[:10]}@ns.com"
    create = client.post(
        "/admin/coaches",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "Reset", "email": coach_email, "password": "TempPass99"},
    )
    assert create.status_code == 201, create.text
    coach_id = create.json()["id"]
    old_token = _login(coach_email, "TempPass99")

    ok = client.get("/auth/me", headers={"Authorization": f"Bearer {old_token}"})
    assert ok.status_code == 200, ok.text

    reset = client.post(
        f"/admin/coaches/{coach_id}/reset-password",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert reset.status_code == 200, reset.text
    temp = reset.json()["temporary_password"]
    assert len(temp) >= 8

    stale = client.get("/auth/me", headers={"Authorization": f"Bearer {old_token}"})
    assert stale.status_code == 401, stale.text
    assert "invalidad" in stale.json()["detail"].lower()

    new_token = _login(coach_email, temp)
    me = client.get("/auth/me", headers={"Authorization": f"Bearer {new_token}"})
    assert me.status_code == 200, me.text
    assert me.json()["must_change_password"] is True
