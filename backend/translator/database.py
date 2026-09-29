"""Database helpers for the translator service."""

import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

load_dotenv()

def _get_database_url() -> str:
    raw_url = (
        os.getenv("TRANSLATOR_DATABASE_URL")
        or os.getenv("DATABASE_URL")
        or os.getenv("POSTGRES_DSN")
    )
    if not raw_url:
        db_user = os.getenv("POSTGRES_USER", "postgres")
        db_pass = os.getenv("POSTGRES_PASSWORD") or os.getenv("PSQL_PASSWD") or ""
        db_host = os.getenv("POSTGRES_HOST", "db")
        db_port = os.getenv("POSTGRES_PORT", "5432")
        db_name = os.getenv("POSTGRES_DB", "postgres")
        raw_url = f"postgresql+psycopg2://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"
    elif raw_url.startswith("postgresql://"):
        raw_url = raw_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    return raw_url

DATABASE_URL = _get_database_url()

engine = None
SessionLocal = None

ENVIRONMENT = os.getenv("ENVIRONMENT", "development").strip().lower()

def init_engine():
    """Create the SQLAlchemy engine and session factory once a database URL is available."""
    global engine, SessionLocal

    if engine is None:
        try:
            engine = create_engine(
                DATABASE_URL,
                pool_pre_ping=True
            )
            with engine.connect() as conn:
                pass
        except Exception as e:
            if ENVIRONMENT == "production":
                print(f"[CRITICAL] Production AWS Translator PostgreSQL connection failed: {e}")
                raise e
            local_db_dir = os.path.join(os.path.expanduser("~"), ".draftmate_local_db")
            os.makedirs(local_db_dir, exist_ok=True)
            sqlite_path = os.path.join(local_db_dir, "draftmate_translator.db")
            print(f"[WARN] Translator PostgreSQL connection failed ({e}). Using local computer drive SQLite DB: {sqlite_path}")
            engine = create_engine(f"sqlite:///{sqlite_path}", connect_args={"check_same_thread": False})
        SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    return engine

init_engine()