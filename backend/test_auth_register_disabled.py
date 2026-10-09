"""POST /auth/register debe responder 403 y no crear usuarios."""

import pytest
from fastapi.testclient import TestClient

from app.db import SessionLocal
from app.main import app, on_startup
from app.models import User


@pytest.fixture(scope="module", autouse=True)
def _startup():
    on_startup()


@pytest.fixture
def client():
    return TestClient(app)


def test_register_returns_403_and_does_not_create_user(client: TestClient):
    email = "register-disabled-test@ns.local"
    password = "SomeValidPass123"

    with SessionLocal() as db:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            db.delete(existing)
            db.commit()
        count_before = db.query(User).count()

    res = client.post("/auth/register", json={"email": email, "password": password})
    assert res.status_code == 403
    assert "deshabilitado" in res.json().get("detail", "").lower()

    with SessionLocal() as db:
        assert db.query(User).filter(User.email == email).first() is None
        assert db.query(User).count() == count_before
