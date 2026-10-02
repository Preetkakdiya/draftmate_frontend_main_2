"""
main_file.py - FastAPI entrypoint for the DraftMate E-Signature microservice.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

# --- Local imports ---
from db import test_connection as test_db_connection
from routes import documents, signers, signatures, fields

# ==========================================
# APP CONFIG
# ==========================================
app = FastAPI(
    title="DraftMate E-Signature Service",
    description="Legally-valid electronic signatures for Indian legal documents",
    version="1.0.0",
)

# ==========================================
# CORS
# ==========================================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# STARTUP CHECKS
# ==========================================
@app.on_event("startup")
def startup_checks():
    print("=" * 60)
    print("🚀 DraftMate E-Signature Service starting…")
    print("=" * 60)

    ok = test_db_connection()
    if not ok:
        print("⚠️  WARNING: PostgreSQL connection failed")

    if not os.getenv("SMTP_USER") or not os.getenv("SMTP_PASS"):
        print("⚠️  WARNING: SMTP not configured")
    else:
        print(f"[E-SIGN MAILER] ✅ SMTP configured via {os.getenv('SMTP_HOST')}")

    auth_url = os.getenv("AUTH_SERVICE_URL", "http://127.0.0.1:8009")
    print(f"[E-SIGN AUTH] Auth service URL: {auth_url}")

    print("=" * 60)
    print("✅ Service ready")
    print("=" * 60)


# ==========================================
# HEALTH ENDPOINTS
# ==========================================
@app.get("/")
def root():
    return {
        "service": "DraftMate E-Signature",
        "status": "running",
        "version": "1.0.0",
    }


@app.get("/health")
def health():
    db_ok = test_db_connection()
    smtp_ok = bool(os.getenv("SMTP_USER") and os.getenv("SMTP_PASS"))
    return {
        "status": "healthy" if (db_ok and smtp_ok) else "degraded",
        "database": "ok" if db_ok else "down",
        "smtp": "ok" if smtp_ok else "not_configured",
    }


# ==========================================
# MOUNT ROUTES
# ==========================================
app.include_router(documents.router, prefix="/api/esign", tags=["Documents"])
app.include_router(fields.router, prefix="/api/esign", tags=["Fields (Editor)"])
app.include_router(signers.router, prefix="/api/esign", tags=["Signers (Public)"])
app.include_router(signatures.router, prefix="/api/esign", tags=["Signatures (Public)"])


# ==========================================
# LOCAL DEV RUNNER
# ==========================================
if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("ESIGN_SERVICE_PORT", "8020"))

    print("\nRegistered Routes:")
    for route in app.routes:
        methods = getattr(route, "methods", set())
        print(f"  {list(methods)}  {route.path}")

    uvicorn.run("main_file:app", host="0.0.0.0", port=port, reload=True)