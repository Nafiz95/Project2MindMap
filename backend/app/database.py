from collections.abc import Generator
import os
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.models import Base
from app.services.database_profiles import LLM_WIKI_PROFILE, inspect_database_file

ROOT_DIR = Path(__file__).resolve().parents[2]


def resolve_database_path(value: str | Path) -> Path:
    path = Path(value)
    if not path.is_absolute():
        path = ROOT_DIR / path
    return path.resolve()


def preferred_default_database() -> Path:
    configured = os.getenv("PROJECT2MINDMAP_DB")
    if configured:
        return resolve_database_path(configured)
    wiki_path = resolve_database_path(ROOT_DIR / "llm_wiki.db")
    wiki_inspection = inspect_database_file(wiki_path)
    if wiki_inspection["database_profile"] == LLM_WIKI_PROFILE and wiki_inspection["is_populated"]:
        return wiki_path
    return resolve_database_path(ROOT_DIR / "project2mindmap.db")


ACTIVE_DB_PATH = preferred_default_database()
DEFAULT_DB_PATH = ACTIVE_DB_PATH
DATABASE_URL = f"sqlite:///{ACTIVE_DB_PATH.as_posix()}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


@event.listens_for(Engine, "connect")
def set_sqlite_pragma(dbapi_connection, _connection_record) -> None:
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


def init_db(drop_existing: bool = False) -> None:
    if drop_existing:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def configure_database(db_path: Path) -> None:
    global ACTIVE_DB_PATH, DEFAULT_DB_PATH, DATABASE_URL, SessionLocal, engine

    ACTIVE_DB_PATH = resolve_database_path(db_path)
    DEFAULT_DB_PATH = ACTIVE_DB_PATH
    DATABASE_URL = f"sqlite:///{ACTIVE_DB_PATH.as_posix()}"
    engine.dispose()
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    SessionLocal.configure(bind=engine)


def get_active_db_path() -> Path:
    return ACTIVE_DB_PATH


def get_session() -> Generator[Session, None, None]:
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()
