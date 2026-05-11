import logging
from typing import Any
from lex_bot.config import EMBEDDING_MODEL_NAME

logger = logging.getLogger(__name__)

_embedding_model = None

def get_embedding_model() -> Any:
    """
    Lazy-load and return the SentenceTransformer singleton.
    This prevents loading the ~1.5GB model multiple times across different modules,
    and avoids loading it at startup if it's never actually used.
    """
    global _embedding_model
    if _embedding_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"🔍 Loading global Embedding Model: {EMBEDDING_MODEL_NAME}...")
            # Use CPU to avoid blocking / VRAM issues in multi-threaded setup unless GPU is specified
            _embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME, device='cpu')
            logger.info("✅ Global Embedding Model loaded successfully")
        except ImportError:
            logger.error("SentenceTransformers not installed.")
        except Exception as e:
            logger.error(f"❌ Global Model Loading Failed: {e}")
            
    return _embedding_model
