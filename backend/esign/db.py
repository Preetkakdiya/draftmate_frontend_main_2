"""
db.py - PostgreSQL connection manager for the E-Signature service.
Supports both NeonDB (serverless) and standard PostgreSQL (production).
Uses connection pooling for efficient access.

Configuration priority:
  1. DATABASE_URL — full connection string (NeonDB or PostgreSQL)
  2. Individual params: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
"""
import os
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()


def _build_dsn():
    """
    Build the PostgreSQL DSN from env vars.
    Priority: DATABASE_URL > individual PG* params for standard PostgreSQL.
    """
    dsn = os.getenv("DATABASE_URL")
    if dsn:
        return dsn

    pg_host = os.getenv("PGHOST")
    pg_port = os.getenv("PGPORT", "5432")
    pg_user = os.getenv("PGUSER")
    pg_password = os.getenv("PGPASSWORD")
    pg_database = os.getenv("PGDATABASE")

    if pg_host and pg_user and pg_password and pg_database:
        return f"postgresql://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_database}"

    raise RuntimeError(
        "❌ DATABASE_URL or PGHOST+PGUSER+PGPASSWORD+PGDATABASE not set in .env — cannot start E-Signature service."
    )


DATABASE_URL = _build_dsn()

# SSL settings: require SSL for production PostgreSQL; optional for local dev
SSLMODE = os.getenv("PGSSLMODE", "require")
if f"sslmode={SSLMODE}" not in DATABASE_URL:
    DATABASE_URL = f"{DATABASE_URL}&sslmode={SSLMODE}" if "?" in DATABASE_URL else f"{DATABASE_URL}?sslmode={SSLMODE}"

# Pool: min 1, max 10 connections (fine for MVP)
_db_pool = None


def _init_pool():
    """Lazy-init the connection pool once per process."""
    global _db_pool
    if _db_pool is None:
        try:
            _db_pool = pool.SimpleConnectionPool(
                minconn=1,
                maxconn=10,
                dsn=DATABASE_URL,
                connect_timeout=5,
                keepalives=1,
                keepalives_idle=30,
                keepalives_interval=10,
                keepalives_count=5,
            )
            print("[E-SIGN DB] ✅ Connected to PostgreSQL successfully")
        except Exception as e:
            print(f"[E-SIGN DB] ❌ PostgreSQL connection failed: {e}")
            raise


class PooledConnectionProxy:
    """
    Wraps a pooled connection so `.close()` returns it to the pool
    instead of actually closing it. Matches the pattern in login_db/auth.py.
    """

    def __init__(self, conn, db_pool):
        self.conn = conn
        self.pool = db_pool

    def cursor(self, *args, **kwargs):
        # Default to RealDictCursor so rows behave like dicts
        if "cursor_factory" not in kwargs:
            kwargs["cursor_factory"] = RealDictCursor
        return self.conn.cursor(*args, **kwargs)

    def commit(self):
        self.conn.commit()

    def rollback(self):
        self.conn.rollback()

    def close(self):
        self.pool.putconn(self.conn)


def get_db_connection():
    """
    Returns a pooled connection wrapped in PooledConnectionProxy.
    Always use with try/finally to release back to pool.

    Usage:
        conn = get_db_connection()
        cur = conn.cursor()
        try:
            cur.execute("SELECT ...")
            ...
        finally:
            cur.close()
            conn.close()
    """
    _init_pool()
    raw_conn = _db_pool.getconn()
    return PooledConnectionProxy(raw_conn, _db_pool)


def test_connection():
    """Quick sanity check — call this on startup."""
    try:
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("SELECT NOW() as time, version() as version")
        row = cur.fetchone()
        cur.close()
        conn.close()
        print(f"[E-SIGN DB] ✅ Test query OK — Server time: {row['time']}")
        return True
    except Exception as e:
        print(f"[E-SIGN DB] ❌ Test query failed: {e}")
        return False