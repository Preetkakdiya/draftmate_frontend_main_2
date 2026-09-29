import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env'))

POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD") or os.getenv("PSQL_PASSWD") or ""
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "db")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "postgres")

POSTGRES_DSN = os.getenv("POSTGRES_DSN") or os.getenv("DATABASE_URL") or f"postgresql+psycopg2://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
if POSTGRES_DSN.startswith("postgresql://"):
    POSTGRES_DSN = POSTGRES_DSN.replace("postgresql://", "postgresql+psycopg2://", 1)

ENVIRONMENT = os.getenv("ENVIRONMENT", "development").strip().lower()

def _get_engine():
    try:
        eng = create_engine(POSTGRES_DSN, pool_pre_ping=True)
        with eng.connect() as conn:
            pass
        return eng
    except Exception as e:
        if ENVIRONMENT == "production":
            print(f"[CRITICAL] Production AWS PostgreSQL database connection failed: {e}")
            raise e
        local_db_dir = os.path.join(os.path.expanduser("~"), ".draftmate_local_db")
        os.makedirs(local_db_dir, exist_ok=True)
        sqlite_path = os.path.join(local_db_dir, "draftmate_library.db")
        print(f"[WARN] Local Development PostgreSQL unavailable ({e}). Using local computer drive SQLite DB: {sqlite_path}")
        return create_engine(f"sqlite:///{sqlite_path}", connect_args={"check_same_thread": False})

engine = _get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
