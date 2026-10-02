"""
storage_manager.py - Abstraction over file storage.
Currently supports:
  - local : saves files under LOCAL_STORAGE_PATH
  - efs   : saves files to an AWS EFS mount point (EFS_MOUNT_PATH)
  - s3    : uploads to AWS S3 (implement when ready)

Switch by setting STORAGE_BACKEND in .env
"""
import os
import uuid
from pathlib import Path
from typing import BinaryIO
from dotenv import load_dotenv

load_dotenv()

STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local").lower()
LOCAL_STORAGE_PATH = os.getenv("LOCAL_STORAGE_PATH", "./storage")
EFS_MOUNT_PATH = os.getenv("EFS_MOUNT_PATH", "")

# Absolute path resolution
BASE_DIR = Path(__file__).parent

if STORAGE_BACKEND == "efs":
    if not EFS_MOUNT_PATH:
        raise RuntimeError(
            "❌ EFS_MOUNT_PATH not set in .env — cannot use EFS storage backend."
        )
    STORAGE_ROOT = Path(EFS_MOUNT_PATH).resolve()
else:
    STORAGE_ROOT = (
        (BASE_DIR / LOCAL_STORAGE_PATH).resolve()
        if not os.path.isabs(LOCAL_STORAGE_PATH)
        else Path(LOCAL_STORAGE_PATH)
    )

# Ensure storage directories exist on startup
(STORAGE_ROOT / "originals").mkdir(parents=True, exist_ok=True)
(STORAGE_ROOT / "signed").mkdir(parents=True, exist_ok=True)


class StorageManager:
    """
    Uniform interface for saving/reading/deleting files.
    Swap implementations without changing route code.
    """

    def __init__(self):
        self.backend = STORAGE_BACKEND
        print(f"[E-SIGN STORAGE] Backend: {self.backend} | Root: {STORAGE_ROOT}")

    # -----------------------------
    # SAVE
    # -----------------------------
    def save_original(self, file_bytes: bytes, original_filename: str) -> str:
        """
        Saves an uploaded PDF. Returns a storage key (relative path or S3 URL)
        that should be stored in documents.file_url.
        """
        safe_name = self._sanitize_filename(original_filename)
        unique_name = f"{uuid.uuid4().hex}_{safe_name}"

        if self.backend in ("local", "efs"):
            path = STORAGE_ROOT / "originals" / unique_name
            path.write_bytes(file_bytes)
            return str(path)

        elif self.backend == "s3":
            return self._save_s3(file_bytes, f"originals/{unique_name}")

        raise NotImplementedError(f"Backend '{self.backend}' not supported")

    def save_signed(self, file_bytes: bytes, document_id: str) -> str:
        """Saves the final signed/stamped PDF."""
        filename = f"{document_id}_signed.pdf"

        if self.backend in ("local", "efs"):
            path = STORAGE_ROOT / "signed" / filename
            path.write_bytes(file_bytes)
            return str(path)

        elif self.backend == "s3":
            return self._save_s3(file_bytes, f"signed/{filename}")

        raise NotImplementedError(f"Backend '{self.backend}' not supported")

    # -----------------------------
    # READ
    # -----------------------------
    def read_file(self, storage_key: str) -> bytes:
        """Reads any file (original or signed) by its storage key."""
        if self.backend in ("local", "efs"):
            return Path(storage_key).read_bytes()

        elif self.backend == "s3":
            return self._read_s3(storage_key)

        raise NotImplementedError

    def file_exists(self, storage_key: str) -> bool:
        if self.backend in ("local", "efs"):
            return Path(storage_key).exists()
        elif self.backend == "s3":
            return self._exists_s3(storage_key)
        return False

    # -----------------------------
    # DELETE (optional cleanup)
    # -----------------------------
    def delete_file(self, storage_key: str) -> None:
        if self.backend in ("local", "efs"):
            try:
                Path(storage_key).unlink(missing_ok=True)
            except Exception as e:
                print(f"[E-SIGN STORAGE] Failed to delete {storage_key}: {e}")

    # -----------------------------
    # HELPERS
    # -----------------------------
    @staticmethod
    def _sanitize_filename(name: str) -> str:
        """Strip path separators and dangerous chars."""
        import re
        base = os.path.basename(name)
        return re.sub(r"[^\w\.\-]", "_", base)[:100]

    # -----------------------------
    # S3 stubs (implement when needed)
    # -----------------------------
    def _save_s3(self, file_bytes: bytes, key: str) -> str:
        # TODO: implement using boto3 — you already have credentials in .env
        raise NotImplementedError("S3 backend not implemented yet. Switch STORAGE_BACKEND=local for now.")

    def _read_s3(self, key: str) -> bytes:
        raise NotImplementedError

    def _exists_s3(self, key: str) -> bool:
        raise NotImplementedError


# Singleton instance for imports
storage = StorageManager()