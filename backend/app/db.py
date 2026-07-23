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


def resolve_database_url() -> tuple[str, dict]:
    database_url = os.getenv("DATABASE_URL", "").strip()
    if database_url:
        if database_url.startswith("postgres://"):
            database_url = database_url.replace("postgres://", "postgresql://", 1)
        return database_url, {}

    db_path = os.getenv("DATABASE_PATH", DEFAULT_DB_PATH).strip() or DEFAULT_DB_PATH
    db_dir = os.path.dirname(os.path.abspath(db_path))
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    sqlite_url = f"sqlite:///{db_path.replace(os.sep, '/')}"
    return sqlite_url, {"check_same_thread": False}


def get_db_backend_name() -> str:
    if os.getenv("DATABASE_URL", "").strip():
        return "postgresql"
    return "sqlite"


def get_sqlite_path() -> str:
    return os.path.abspath(os.getenv("DATABASE_PATH", DEFAULT_DB_PATH))


SQLALCHEMY_DATABASE_URL, _connect_args = resolve_database_url()
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=_connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def log_db_startup_info() -> None:
    backend = get_db_backend_name()
    if backend == "postgresql":
        logger.info("Database: PostgreSQL (persistent via DATABASE_URL)")
        return

    db_path = get_sqlite_path()
    logger.info("Database: SQLite at %s", db_path)
    if is_cloud_runtime() and not os.getenv("DATABASE_PATH", "").strip():
        logger.warning(
            "SQLite sin volumen persistente en cloud: los datos se pierden en cada deploy. "
            "Configurá DATABASE_URL (PostgreSQL) o DATABASE_PATH en un disco persistente."
        )


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
