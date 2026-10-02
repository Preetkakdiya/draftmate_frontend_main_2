# """
# auth_dependency.py - FastAPI dependency that validates a DraftMate session
# by calling the existing login_db service (port 8009). Returns the user_id.

# Matches the same auth pattern used elsewhere in DraftMate:
#     Authorization: Bearer <session_id>
# """
# import os
# import requests
# from fastapi import Header, HTTPException
# from typing import Optional
# from dotenv import load_dotenv

# load_dotenv()

# AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://127.0.0.1:8009")
# AUTH_TIMEOUT_SECONDS = 5


# def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
#     """
#     FastAPI dependency: extracts session_id from Authorization header,
#     calls login_db /verify_session, returns user_id.

#     Usage in route:
#         @router.post("/documents")
#         def create_doc(user_id: str = Depends(get_current_user_id)):
#             ...
#     """
#     if not authorization or not authorization.startswith("Bearer "):
#         raise HTTPException(
#             status_code=401,
#             detail="Missing or invalid Authorization header. Expected: 'Bearer <session_id>'",
#         )

#     session_id = authorization.split(" ", 1)[1].strip()
#     if not session_id:
#         raise HTTPException(status_code=401, detail="Missing session token.")

#     # Call login_db's /verify_session endpoint
#     try:
#         resp = requests.get(
#             f"{AUTH_SERVICE_URL}/verify_session/{session_id}",
#             timeout=AUTH_TIMEOUT_SECONDS,
#         )
#     except requests.RequestException as e:
#         print(f"[E-SIGN AUTH] ❌ Auth service unreachable: {e}")
#         raise HTTPException(
#             status_code=503,
#             detail="Authentication service temporarily unavailable.",
#         )

#     if resp.status_code != 200:
#         raise HTTPException(status_code=401, detail="Invalid or expired session.")

#     data = resp.json()
#     if not data.get("valid") or not data.get("user_id"):
#         raise HTTPException(status_code=401, detail="Session validation failed.")

#     return str(data["user_id"])


# def get_optional_user_id(authorization: Optional[str] = Header(None)) -> Optional[str]:
#     """
#     Same as get_current_user_id, but returns None if no auth provided
#     (instead of raising 401). Useful for public endpoints that behave
#     differently for logged-in users.
#     """
#     if not authorization:
#         return None
#     try:
#         return get_current_user_id(authorization)
#     except HTTPException:
#         return None





"""
auth_dependency.py - FastAPI dependency that validates a DraftMate session
by calling the existing login_db service (port 8009). Returns the user_id.

DEV MODE: If ESIGN_DEV_MODE=true in .env, bypasses auth entirely
and uses the raw session_id as user_id. Perfect for local testing.
"""
import os
import requests
from fastapi import Header, HTTPException
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

AUTH_SERVICE_URL = os.getenv("AUTH_SERVICE_URL", "http://127.0.0.1:8009")
AUTH_TIMEOUT_SECONDS = 5
DEV_MODE = os.getenv("ESIGN_DEV_MODE", "false").lower() == "true"


def get_current_user_id(authorization: Optional[str] = Header(None)) -> str:
    """
    FastAPI dependency: extracts session_id from Authorization header.
    In DEV_MODE, uses session_id directly as user_id (skips auth verification).
    In production, calls login_db /verify_session to get real user_id.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or invalid Authorization header. Expected: 'Bearer <session_id>'",
        )

    session_id = authorization.split(" ", 1)[1].strip()
    if not session_id:
        raise HTTPException(status_code=401, detail="Missing session token.")

    # ==========================================
    # DEV MODE — Skip auth service, use session_id as user_id
    # ==========================================
    if DEV_MODE:
        # Convert session_id (UUID) directly into a valid user_id
        # This gives you a stable, consistent identity for testing
        print(f"[E-SIGN AUTH] 🔓 DEV MODE — accepting session_id as user_id: {session_id[:8]}…")
        return session_id

    # ==========================================
    # PRODUCTION MODE — Verify via login_db service
    # ==========================================
    try:
        resp = requests.get(
            f"{AUTH_SERVICE_URL}/verify_session/{session_id}",
            timeout=AUTH_TIMEOUT_SECONDS,
        )
    except requests.RequestException as e:
        print(f"[E-SIGN AUTH] ❌ Auth service unreachable: {e}")
        raise HTTPException(
            status_code=503,
            detail="Authentication service temporarily unavailable.",
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")

    data = resp.json()
    if not data.get("valid") or not data.get("user_id"):
        raise HTTPException(status_code=401, detail="Session validation failed.")

    return str(data["user_id"])


def get_optional_user_id(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """Same as get_current_user_id, but returns None if no auth (instead of 401)."""
    if not authorization:
        return None
    try:
        return get_current_user_id(authorization)
    except HTTPException:
        return None