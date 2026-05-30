"""Shared configuration for the translator service."""

from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()


def _get_env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


SARVAM_API_KEY = _get_env("SARVAM_API_KEY")
SARVAM_API_URL = _get_env("SARVAM_API_URL", "https://api.sarvam.ai/v1/translate")
SARVAM_TRANSLATE_MODEL = _get_env("SARVAM_TRANSLATE_MODEL", "sarvam-translate:v1")
SARVAM_TRANSLATE_TIMEOUT_SECONDS = int(_get_env("SARVAM_TRANSLATE_TIMEOUT_SECONDS", "30") or "30")
SARVAM_TRANSLATE_BATCH_SIZE = int(_get_env("SARVAM_TRANSLATE_BATCH_SIZE", "10") or "10")