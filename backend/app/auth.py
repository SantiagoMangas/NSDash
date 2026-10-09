from datetime import datetime, timedelta
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
import bcrypt
from sqlalchemy.orm import Session

from os import getenv

from . import models
from .access import ROLE_ADMIN
from .db import get_db, is_cloud_runtime

security = HTTPBearer()

_DEV_SECRET_KEY = "dev-only-insecure-secret-do-not-use-in-production"
SECRET_KEY = getenv("SECRET_KEY") or _DEV_SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24
MIN_PASSWORD_LENGTH = 8


def assert_production_secret_key() -> None:
    """En Railway/cloud: SECRET_KEY obligatoria y distinta del fallback de desarrollo."""
    if not is_cloud_runtime():
        return
    configured = (getenv("SECRET_KEY") or "").strip()
    if not configured or configured == _DEV_SECRET_KEY:
        raise RuntimeError(
            "SECRET_KEY debe estar definida en producción (Railway) con un valor "
            "secreto propio; no se permite la clave de desarrollo por defecto."
        )


def hash_password(password: str) -> str:
    """Hash a plain text password using bcrypt."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain text password against its hash."""
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def validate_password_strength(password: str) -> None:
    if len(password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"La contraseña debe tener al menos {MIN_PASSWORD_LENGTH} caracteres",
        )


def create_access_token(data: dict[str, Any]) -> str:
    """Create a JWT access token with 24h expiration."""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_access_token_for_user(user: models.User) -> str:
    return create_access_token(
        {
            "user_id": user.id,
            "tv": int(user.auth_token_version or 0),
        }
    )


def invalidate_user_sessions(user: models.User) -> None:
    user.auth_token_version = int(user.auth_token_version or 0) + 1


def _decode_bearer_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
            )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> int:
    """Extract user_id from JWT (sin validar versión de sesión)."""
    payload = _decode_bearer_token(credentials.credentials)
    return int(payload["user_id"])


def get_current_user(
    db: Session = Depends(get_db),
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> models.User:
    payload = _decode_bearer_token(credentials.credentials)
    user_id = int(payload["user_id"])
    token_version = int(payload.get("tv", 0))

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )
    if int(user.auth_token_version or 0) != token_version:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Sesión invalidada",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Cuenta desactivada",
        )
    return user


def require_admin(user: models.User = Depends(get_current_user)) -> models.User:
    if user.role != ROLE_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores",
        )
    return user


def require_full_session(user: models.User = Depends(get_current_user)) -> models.User:
    """Bloquea el resto de la app hasta cambiar contraseña temporal."""
    if user.must_change_password:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="password_change_required",
        )
    return user


get_current_user_legacy = get_current_user_id
