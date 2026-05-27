"""Storage path helpers for translator uploads."""

from pathlib import Path
from uuid import uuid4


def get_original_upload_path(filename: str | None) -> Path:
    base_dir = Path(__file__).resolve().parent
    original_dir = base_dir / "original"
    original_dir.mkdir(parents=True, exist_ok=True)

    safe_name = Path(filename or "document").name
    return original_dir / f"{uuid4()}_{safe_name}"


def get_translated_upload_path(filename: str | None) -> Path:
    base_dir = Path(__file__).resolve().parent
    translated_dir = base_dir / "translated"
    translated_dir.mkdir(parents=True, exist_ok=True)

    safe_name = Path(filename or "document").name
    return translated_dir / f"{uuid4()}_{safe_name}"


def delete_local_file(file_path: str | None) -> None:
    if not file_path:
        return

    path = Path(file_path)
    if path.exists():
        path.unlink()
