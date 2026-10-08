import os

import pytest

from app import auth


def test_production_secret_key_required_on_cloud(monkeypatch):
    monkeypatch.setenv("RAILWAY_ENVIRONMENT", "production")
    monkeypatch.delenv("SECRET_KEY", raising=False)
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        auth.assert_production_secret_key()


def test_production_rejects_dev_default_secret(monkeypatch):
    monkeypatch.setenv("RAILWAY_ENVIRONMENT", "production")
    monkeypatch.setenv("SECRET_KEY", auth._DEV_SECRET_KEY)
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        auth.assert_production_secret_key()


def test_local_allows_dev_fallback(monkeypatch):
    monkeypatch.delenv("RAILWAY_ENVIRONMENT", raising=False)
    monkeypatch.delenv("SECRET_KEY", raising=False)
    auth.assert_production_secret_key()
