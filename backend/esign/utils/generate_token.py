"""
generate_token.py - Secure random token generator for signing links.
Each signer gets a unique, unguessable token embedded in their email link.
"""
import secrets


def generate_signing_token(length_bytes: int = 32) -> str:
    """
    Returns a URL-safe token like:
    'sVc7bJ_9x2Q8pE4vN1kL0mT6yR3zU5aF8gH2wX7cB9d'

    32 bytes = 43 chars = 2^256 possible values (impossible to brute-force).
    """
    return secrets.token_urlsafe(length_bytes)


def generate_otp(length: int = 6) -> str:
    """
    Returns a numeric OTP string like '482915'.
    Uses cryptographically secure randomness — NOT random.randint().
    """
    return "".join(str(secrets.randbelow(10)) for _ in range(length))