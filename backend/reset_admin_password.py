import sys

from app.auth import hash_password
from app.db import SessionLocal
from app.models import User


def reset_admin_password(email: str, new_password: str) -> int:
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user is None:
            print(f"Usuario con email {email!r} no existe.")
            return 1

        user.password_hash = hash_password(new_password)
        db.commit()
        print(f"Contraseña actualizada correctamente para {email}.")
        return 0
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(reset_admin_password("admin@ns.com", "1234"))
