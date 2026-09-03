"""
Indian Kanoon API Service

Production-ready service for interacting with Indian Kanoon's official API.
Provides normalized response formats and includes error handling, retries, and logging.
"""

import os
import logging
import re
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from dotenv import load_dotenv

import httpx
from httpx import HTTPStatusError, TimeoutException, RequestError
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

# Configure logging
logger = logging.getLogger(__name__)


# Custom exceptions
class IndianKanoonAPIError(Exception):
    """Base exception for Indian Kanoon API errors."""
    pass


class AuthenticationError(IndianKanoonAPIError):
    """Raised when authentication with Indian Kanoon API fails."""
    pass


class RateLimitError(IndianKanoonAPIError):
    """Raised when rate limit is exceeded."""
    pass


class NotFoundError(IndianKanoonAPIError):
    """Raised when requested resource is not found."""
    pass


@dataclass
class NormalizedJudgment:
    """Normalized judgment object for DraftMate."""
    id: str
    title: str
    court: str
    citation: str
    date: str
    judges: List[str]
    summary: str
    pdf_url: str
    source: str = "Indian Kanoon"


class IndianKanoonService:
    """
    Reusable service class for Indian Kanoon API integration.
    
    Handles:
    - Environment variable configuration
    - Async HTTP requests with retries and timeouts
    - Request normalization
    - Response normalization
    - Comprehensive error handling
    """
    
    def __init__(self):
        """Initialize the service with environment variables."""
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), '.env')
        load_dotenv(env_path)
        load_dotenv()

        self.api_token = (os.getenv("INDIANKANOON_API_TOKEN", "") or os.getenv("IKApi", "")).strip()
        self.base_url = os.getenv("INDIANKANOON_BASE_URL", "https://api.indiankanoon.org").rstrip("/")
        
        if not self.api_token:
            logger.warning("INDIANKANOON_API_TOKEN is not set — API calls may fail")
        
        self.timeout = httpx.Timeout(30.0, connect=10.0)
    
    def _get_headers(self) -> Dict[str, str]:
        """
        Get headers required for Indian Kanoon API requests.
        
        Returns:
            Dictionary containing authentication and content-type headers.
        """
        return {
            "Authorization": f"Token {self.api_token}",
            "Content-Type": "application/x-www-form-urlencoded",
        }
    def _clean_text(self, text: str) -> str:
        """
        Clean HTML markup while preserving paragraph double-newlines and legal structure.
        """
        if not text:
            return ""

        # 1. Replace block closing tags with double newlines to preserve paragraphs
        cleaned = re.sub(r"<\s*/\s*(?:p|div|pre|blockquote|h[1-6]|tr|li)\s*>", "\n\n", text, flags=re.IGNORECASE)
        cleaned = re.sub(r"<\s*br\s*/?\s*>", "\n", cleaned, flags=re.IGNORECASE)

        # 2. Strip remaining HTML tags
        cleaned = re.sub(r"<[^>]+>", " ", cleaned)

        # 3. Decode common HTML entities
        cleaned = (
            cleaned.replace("&nbsp;", " ")
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&#39;", "'")
            .replace("&quot;", '"')
        )

        # 4. Clean up inline whitespace while keeping double newlines between paragraphs
        lines = [re.sub(r"[ \t]+", " ", line).strip() for line in cleaned.splitlines()]
        non_empty = [line for line in lines if line]
        return "\n\n".join(non_empty)

    async def get_document(self, doc_id: str) -> Optional[str]:
        """
        Get the full text of a document (judgment).
        """
        logger.info(f"Fetching document: {doc_id}")
        
        if self.api_token:
            try:
                data = await self._make_request(f"/doc/{doc_id}/")
                text = data.get("doc", "") or data.get("text", "") or data.get("headline", "")
                if text and len(text.strip()) > 50:
                    return self._clean_text(text)
            except Exception as e:
                logger.warning(f"Official API get_document failed for {doc_id}: {e}, falling back to web fetch...")

        try:
            url = f"https://indiankanoon.org/doc/{doc_id}/"
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.get(url, headers=headers, follow_redirects=True)
                if res.status_code == 200:
                    return self._clean_text(res.text)
        except Exception as web_err:
            logger.error(f"Web fetch for doc {doc_id} failed: {web_err}")

        return Nonene
    
    async def get_document_metadata(self, doc_id: str) -> Optional[NormalizedJudgment]:
        """
        Get metadata for a specific document without fetching full text.
        
        First tries to search for the document by ID, if that fails, try to 
        fetch the document and see if we can get any metadata (if available),
        or create a basic metadata object.
        
        Args:
            doc_id: Indian Kanoon document ID.
            
        Returns:
            Normalized judgment object with metadata, or None on failure.
        """
        logger.info(f"Fetching metadata for document: {doc_id}")
        
        if not self.api_token:
            logger.warning("INDIANKANOON_API_TOKEN not set, returning None")
            return None
        
        try:
            # First, try multiple search strategies
            search_queries = [
                doc_id,
                f'"{doc_id}"',
                f"doc:{doc_id}"
            ]
            
            for query in search_queries:
                results = await self.search_judgments(query, page=1)
                for result in results:
                    if str(result.id) == str(doc_id):
                        return result
            
            # If search fails, create a basic metadata object (since we at least have the doc ID)
            logger.warning(f"Could not find full metadata for doc ID {doc_id}, creating basic metadata")
            return NormalizedJudgment(
                id=str(doc_id),
                title=f"Judgment {doc_id}",
                court="Unknown Court",
                citation="",
                date="",
                judges=[],
                summary="",
                pdf_url=f"https://indiankanoon.org/doc/{doc_id}/"
            )
        except IndianKanoonAPIError:
            logger.exception(f"Failed to get metadata for document: {doc_id}")
            # Even if there's an error, create basic metadata
            return NormalizedJudgment(
                id=str(doc_id),
                title=f"Judgment {doc_id}",
                court="Unknown Court",
                citation="",
                date="",
                judges=[],
                summary="",
                pdf_url=f"https://indiankanoon.org/doc/{doc_id}/"
            )
    
    async def search_by_citation(self, citation: str) -> List[NormalizedJudgment]:
        """
        Search for judgments by citation.
        
        Args:
            citation: Citation string to search for.
            
        Returns:
            List of normalized judgment objects.
        """
        logger.info(f"Searching by citation: {citation}")
        return await self.search_judgments(f'citation:"{citation}"', page=1)
    
    async def search_by_act(self, act_name: str) -> List[NormalizedJudgment]:
        """
        Search for judgments related to a specific act.
        
        Args:
            act_name: Name of the act to search for.
            
        Returns:
            List of normalized judgment objects.
        """
        logger.info(f"Searching by act: {act_name}")
        return await self.search_judgments(act_name, page=1)

    def _is_clean_judgment(self, j: NormalizedJudgment) -> bool:
        """
        Check if a normalized judgment has clean, readable titles and summaries.
        Filters out entries corrupted by incorrect PDF extraction or RTF tags.
        """
        title = j.title or ""
        summary = j.summary or ""
        
        # Check for RTF/formatting tags or consecutive hashes/symbols that show corruption
        corruption_patterns = ["#CJ##", "aJ#####", "h8kT#", "##aJ", "###", "C.J.#", "a.J.#"]
        for pattern in corruption_patterns:
            if pattern in title or pattern in summary:
                return False
                
        # Check for excessive corrupted characters (like Latin-1 symbols or control chars) in title
        # Allow spaces, standard alphanumeric, standard English punctuation
        clean_chars_count = sum(1 for c in title if c.isalnum() or c.isspace() or c in ".,-()[]/\":';&_@*+?!=%")
        total_chars = len(title)
        if total_chars > 0 and (clean_chars_count / total_chars) < 0.9:
            return False
            
        return True
