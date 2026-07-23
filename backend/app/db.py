import logging
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_DB_PATH = os.path.join(BASE_DIR, "database.db")

CLOUD_ENV_MARKERS = (
    "RENDER",
    "RAILWAY_ENVIRONMENT",
    "FLY_APP_NAME",
    "VERCEL",
    "AWS_EXECUTION_ENV",
)


def is_cloud_runtime() -> bool:
    return any(os.getenv(name) for name in CLOUD_ENV_MARKERS)


def resolve_sqlite_path() -> str:
    db_path = os.getenv("DATABASE_PATH", DEFAULT_DB_PATH).strip() or DEFAULT_DB_PATH
    return os.path.abspath(db_path)


def get_db_backend_name() -> str:
    return "sqlite"


def get_sqlite_path() -> str:
    return resolve_sqlite_path()


DB_PATH = resolve_sqlite_path()
db_dir = os.path.dirname(DB_PATH)
if db_dir:
    os.makedirs(db_dir, exist_ok=True)

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH.replace(os.sep, '/')}"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def log_db_startup_info() -> None:
    logger.info("Database: SQLite at %s", DB_PATH)
    if is_cloud_runtime() and not os.getenv("DATABASE_PATH", "").strip():
        logger.warning(
            "SQLite sin volumen persistente en cloud: los datos se pierden en cada deploy. "
            "Configurá DATABASE_PATH apuntando al Volume (ej. /data/database.db)."
        )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
