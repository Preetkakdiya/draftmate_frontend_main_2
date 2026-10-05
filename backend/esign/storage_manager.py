"""
storage_manager.py - Abstraction over file storage.
Supports:
  - local : saves files under LOCAL_STORAGE_PATH (development)
  - efs   : saves files to an AWS EFS mount point (AWS ECS / EC2)
  - s3    : uploads / downloads from AWS S3 (AWS production)

Switch by setting STORAGE_BACKEND in .env
"""
import os
import uuid
import re
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

STORAGE_BACKEND = os.getenv("STORAGE_BACKEND", "local").lower()
LOCAL_STORAGE_PATH = os.getenv("LOCAL_STORAGE_PATH", "./storage")
EFS_MOUNT_PATH = os.getenv("EFS_MOUNT_PATH", "")

# S3 config
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")
S3_BUCKET = os.getenv("S3_BUCKET") or os.getenv("S3_BUCKET_NAME")  # support both key names

# Absolute path resolution
BASE_DIR = Path(__file__).parent

# ==========================================
# STARTUP VALIDATION
# ==========================================
if STORAGE_BACKEND == "efs":
    if not EFS_MOUNT_PATH:
        raise RuntimeError(
            "❌ EFS_MOUNT_PATH not set in .env — cannot use EFS storage backend.\n"
            "   Mount your EFS: sudo mount -t efs fs-xxxx.efs.region.amazonaws.com:/ /mnt/efs\n"
            "   Then set: EFS_MOUNT_PATH=/mnt/efs"
        )
    STORAGE_ROOT = Path(EFS_MOUNT_PATH).resolve()
    (STORAGE_ROOT / "originals").mkdir(parents=True, exist_ok=True)
    (STORAGE_ROOT / "signed").mkdir(parents=True, exist_ok=True)

elif STORAGE_BACKEND == "s3":
    if not S3_BUCKET:
        raise RuntimeError(
            "❌ S3_BUCKET not set in .env — cannot use S3 storage backend.\n"
            "   Set: S3_BUCKET=your-bucket-name"
        )
    if not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY:
        raise RuntimeError(
            "❌ AWS_ACCESS_KEY_ID or AWS_SECRET_ACCESS_KEY not set in .env.\n"
            "   These are required for S3 storage backend."
        )
    STORAGE_ROOT = None  # not used for S3

else:
    # local (default)
    STORAGE_ROOT = (
        (BASE_DIR / LOCAL_STORAGE_PATH).resolve()
        if not os.path.isabs(LOCAL_STORAGE_PATH)
        else Path(LOCAL_STORAGE_PATH)
    )
    (STORAGE_ROOT / "originals").mkdir(parents=True, exist_ok=True)
    (STORAGE_ROOT / "signed").mkdir(parents=True, exist_ok=True)


# ==========================================
# S3 CLIENT (lazy — only created when needed)
# ==========================================
_s3_client = None

def _get_s3():
    """Returns a cached boto3 S3 client. Lazy-init so import doesn't fail if boto3 missing."""
    global _s3_client
    if _s3_client is None:
        try:
            import boto3
            _s3_client = boto3.client(
                "s3",
                aws_access_key_id=AWS_ACCESS_KEY_ID,
                aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
                region_name=AWS_REGION,
            )
            print(f"[E-SIGN STORAGE] ✅ S3 client initialised — bucket: {S3_BUCKET} | region: {AWS_REGION}")
        except ImportError:
            raise RuntimeError(
                "❌ boto3 is not installed. Run: pip install boto3\n"
                "   Or add 'boto3' to requirements.txt"
            )
    return _s3_client


# ==========================================
# STORAGE MANAGER
# ==========================================
class StorageManager:
    """
    Uniform interface for saving/reading/deleting files.
    Swap backend via STORAGE_BACKEND env var without changing any route code.
    """

    def __init__(self):
        self.backend = STORAGE_BACKEND
        root_display = str(STORAGE_ROOT) if STORAGE_ROOT else f"s3://{S3_BUCKET}"
        print(f"[E-SIGN STORAGE] Backend: {self.backend} | Root: {root_display}")

    # -----------------------------
    # SAVE
    # -----------------------------
    def save_original(self, file_bytes: bytes, original_filename: str) -> str:
        """
        Saves an uploaded PDF.
        Returns a storage key (absolute path for local/efs, S3 key for s3)
        that is stored in documents.file_url.
        """
        safe_name = self._sanitize_filename(original_filename)
        unique_name = f"{uuid.uuid4().hex}_{safe_name}"

        if self.backend in ("local", "efs"):
            path = STORAGE_ROOT / "originals" / unique_name
            path.write_bytes(file_bytes)
            return str(path)

        elif self.backend == "s3":
            s3_key = f"esign/originals/{unique_name}"
            return self._save_s3(file_bytes, s3_key)

        raise NotImplementedError(f"Backend '{self.backend}' not supported")

    def save_signed(self, file_bytes: bytes, document_id: str) -> str:
        """Saves the final signed/stamped PDF."""
        filename = f"{document_id}_signed.pdf"

        if self.backend in ("local", "efs"):
            path = STORAGE_ROOT / "signed" / filename
            path.write_bytes(file_bytes)
            return str(path)

        elif self.backend == "s3":
            s3_key = f"esign/signed/{filename}"
            return self._save_s3(file_bytes, s3_key)

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
    # DELETE
    # -----------------------------
    def delete_file(self, storage_key: str) -> None:
        if self.backend in ("local", "efs"):
            try:
                Path(storage_key).unlink(missing_ok=True)
            except Exception as e:
                print(f"[E-SIGN STORAGE] Failed to delete {storage_key}: {e}")

        elif self.backend == "s3":
            try:
                _get_s3().delete_object(Bucket=S3_BUCKET, Key=storage_key)
                print(f"[E-SIGN STORAGE] 🗑️ Deleted S3 object: {storage_key}")
            except Exception as e:
                print(f"[E-SIGN STORAGE] ❌ Failed to delete S3 object {storage_key}: {e}")

    # -----------------------------
    # HELPERS
    # -----------------------------
    @staticmethod
    def _sanitize_filename(name: str) -> str:
        """Strip path separators and dangerous chars."""
        base = os.path.basename(name)
        return re.sub(r"[^\w\.\-]", "_", base)[:100]

    # -----------------------------
    # S3 IMPLEMENTATION
    # -----------------------------
    def _save_s3(self, file_bytes: bytes, key: str) -> str:
        """Upload bytes to S3. Returns the S3 key (used as storage_key for later reads)."""
        try:
            _get_s3().put_object(
                Bucket=S3_BUCKET,
                Key=key,
                Body=file_bytes,
                ContentType="application/pdf",
            )
            print(f"[E-SIGN STORAGE] ✅ Uploaded to S3: s3://{S3_BUCKET}/{key}")
            return key  # store just the key; reconstruct URL when needed
        except Exception as e:
            print(f"[E-SIGN STORAGE] ❌ S3 upload failed for key '{key}': {e}")
            raise RuntimeError(f"S3 upload failed: {e}") from e

    def _read_s3(self, key: str) -> bytes:
        """Download a file from S3 by its key."""
        try:
            resp = _get_s3().get_object(Bucket=S3_BUCKET, Key=key)
            data = resp["Body"].read()
            print(f"[E-SIGN STORAGE] ✅ Downloaded from S3: {key} ({len(data)} bytes)")
            return data
        except Exception as e:
            print(f"[E-SIGN STORAGE] ❌ S3 download failed for key '{key}': {e}")
            raise RuntimeError(f"S3 download failed: {e}") from e

    def _exists_s3(self, key: str) -> bool:
        """Check if an S3 object exists without downloading it."""
        try:
            _get_s3().head_object(Bucket=S3_BUCKET, Key=key)
            return True
        except Exception:
            return False

    def get_presigned_url(self, storage_key: str, expiry_seconds: int = 3600) -> str:
        """
        Generate a pre-signed S3 URL for temporary public download access.
        Only works with S3 backend. For local/efs, returns the raw file path.
        """
        if self.backend == "s3":
            try:
                url = _get_s3().generate_presigned_url(
                    "get_object",
                    Params={"Bucket": S3_BUCKET, "Key": storage_key},
                    ExpiresIn=expiry_seconds,
                )
                return url
            except Exception as e:
                raise RuntimeError(f"Failed to generate pre-signed URL: {e}") from e
        # local / efs — just return the path (useful for dev)
        return storage_key


# Singleton instance for imports
storage = StorageManager()