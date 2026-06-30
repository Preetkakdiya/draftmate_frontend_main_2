import os
import shutil
import socket
import time

from sentence_transformers import SentenceTransformer, CrossEncoder
import easyocr

# EasyOCR/HuggingFace downloads pull from CDNs that frequently reset the
# connection mid-transfer. Give sockets a generous timeout and retry on failure.
socket.setdefaulttimeout(300)

MAX_RETRIES = 5
RETRY_BACKOFF_SECONDS = 10


def _with_retries(label, fn, cleanup=None):
    """Run fn(), retrying on any exception with linear backoff."""
    last_err = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            return fn()
        except Exception as err:  # noqa: BLE001 - network errors vary widely
            last_err = err
            print(f"⚠️ {label} failed (attempt {attempt}/{MAX_RETRIES}): {err}")
            if cleanup:
                cleanup()
            if attempt < MAX_RETRIES:
                wait = RETRY_BACKOFF_SECONDS * attempt
                print(f"   retrying in {wait}s...")
                time.sleep(wait)
    raise RuntimeError(f"{label} failed after {MAX_RETRIES} attempts") from last_err


def download_models():
    # Define explicit paths
    base_dir = "/app/models"
    embed_path = os.path.join(base_dir, "embedding")
    rerank_path = os.path.join(base_dir, "rerank")
    easyocr_path = os.path.join(base_dir, "easyocr")

    os.makedirs(base_dir, exist_ok=True)

    # 1. Embedding Model
    # We use the hardcoded HF ID for downloading, but save to the path expected by the app
    source_embed_model = "sentence-transformers/all-MiniLM-L6-v2"
    print(f"⬇️ Downloading embedding model: {source_embed_model}")

    def _embed():
        model = SentenceTransformer(source_embed_model)
        model.save(embed_path)

    _with_retries("Embedding model download", _embed)
    print(f"✅ Embedding model saved to: {embed_path}")

    # 2. Rerank Model
    source_rerank_model = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    print(f"⬇️ Downloading rerank model: {source_rerank_model}")

    def _rerank():
        model = CrossEncoder(source_rerank_model)
        model.save(rerank_path)

    _with_retries("Rerank model download", _rerank)
    print(f"✅ Rerank model saved to: {rerank_path}")

    # 3. EasyOCR Models
    print("⬇️ Downloading EasyOCR models...")
    os.makedirs(easyocr_path, exist_ok=True)

    def _easyocr():
        easyocr.Reader(['en'], gpu=False, model_storage_directory=easyocr_path)

    def _clean_partial():
        # A reset connection can leave a corrupt partial zip behind; wipe it so
        # the next attempt re-downloads cleanly instead of failing on extraction.
        if os.path.isdir(easyocr_path):
            shutil.rmtree(easyocr_path, ignore_errors=True)
        os.makedirs(easyocr_path, exist_ok=True)

    _with_retries("EasyOCR model download", _easyocr, cleanup=_clean_partial)
    print(f"✅ EasyOCR models saved to: {easyocr_path}")


if __name__ == "__main__":
    download_models()
