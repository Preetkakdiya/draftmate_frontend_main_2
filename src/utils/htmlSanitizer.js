/**
 * HTML Sanitizer Utility
 *
 * Functions to strip HTML tags and decode common HTML entities,
 * returning clean plain text while preserving spacing and punctuation.
 */

/**
 * Decodes common HTML entities to their plain text equivalents
 * @param {string} text - Text with HTML entities
 * @returns {string} Text with decoded entities
 */
export const decodeHtmlEntities = (text) => {
  if (!text) return text;

  const entityMap = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™'
  };

  return text.replace(/&[#a-zA-Z0-9]+;/g, (match) => entityMap[match] || match);
};

/**
 * Shared cleanup: trim whitespace, remove leftover boilerplate lines, decode entities
 */
function cleanupRawText(raw) {
  const boilerplate = [
    /Skip to main content/gi,
    /Indian Kanoon\s*[-–]\s*Search engine for Indian Law/gi,
    /Search laws,?\s*court judgments/gi,
    /Unlock Advanced Research/gi,
    /Free features\s+Premium\s+Prism AI/gi,
    /Mobile Navigation/gi,
    /Know your Kanoon/gi,
    /Doc Gen Hub/gi,
    /Counter Argument/gi,
    /Case Predict AI/gi,
    /Talk with IK Doc/gi,
    /Get in PDF/gi,
    /Print it!/gi,
    /Download Court Copy/gi,
    /window\.__CF\$[^;]+;/gi,
    /dataLayer\.push[^;]+;/gi,
    /Legal Document View/gi,
    /Upgrade to Premium/gi,
    /Document Options/gi,
    /AI Integrated with over/gi,
  ];
  let text = raw;
  for (const pat of boilerplate) text = text.replace(pat, ' ');
  // Collapse multiple spaces/newlines but preserve paragraph breaks
  text = text.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return decodeHtmlEntities(text);
}

/**
 * Strips all HTML tags, embedded CSS/JS code blocks, and site header boilerplate
 * Uses DOMParser when available (browser) for reliable extraction,
 * falls back to regex for SSR environments.
 * @param {string} text - Text containing HTML or scraped markup
 * @returns {string} Clean plain text without CSS/JS code or navigation noise
 */
export const stripHtmlTags = (text) => {
  if (!text) return text;

  // ── Strategy 1: Use DOMParser (browser-native, most reliable) ───────────
  if (typeof window !== 'undefined' && window.DOMParser) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');

      // Remove all noisy elements entirely before extracting text
      const removeSelectors = [
        'script', 'style', 'noscript', 'nav', 'header', 'footer',
        '.premium-banner', '.modal', '#google_translate_element',
        '.search-autocomplete-list', '#case-recast-fab',
        '.ui-dialog', '.ui-widget', '.ui-autocomplete',
        '#translatewarn', '#courtcopyform', '#pdfdoc', '#printdoc',
        '.mainnavigation', '.siteheader', '.sitefooter', '.navigation',
        '[id^="google_translate"]', 'iframe',
      ];
      removeSelectors.forEach(sel => {
        try { doc.querySelectorAll(sel).forEach(el => el.remove()); } catch {}
      });

      // Try to find the actual judgment content container (Indian Kanoon structure)
      const judgmentSelectors = [
        '#judgments', '.judgments', '#doc', '.doc',
        '#main-doc', '.main-doc', '#judgment-doc',
        '.doc-content', '#doc-content', '.judgment-content',
        'pre', '.judgment',
      ];
      let contentEl = null;
      for (const sel of judgmentSelectors) {
        contentEl = doc.querySelector(sel);
        if (contentEl) break;
      }

      // Extract innerText (handles line breaks naturally) or textContent fallback
      const rawText = (contentEl || doc.body).innerText
        || (contentEl || doc.body).textContent
        || '';
      return cleanupRawText(rawText);
    } catch {
      // Fall through to regex approach
    }
  }

  // ── Strategy 2: Aggressive regex fallback (SSR / non-browser) ───────────
  let cleanText = text;

  // Remove entire block-level noise elements
  cleanText = cleanText.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  cleanText = cleanText.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  cleanText = cleanText.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
  cleanText = cleanText.replace(/<header[\s\S]*?<\/header>/gi, ' ');
  cleanText = cleanText.replace(/<nav[\s\S]*?<\/nav>/gi, ' ');
  cleanText = cleanText.replace(/<footer[\s\S]*?<\/footer>/gi, ' ');
  cleanText = cleanText.replace(/<iframe[\s\S]*?<\/iframe>/gi, ' ');

  // Remove all remaining HTML tags
  cleanText = cleanText.replace(/<[^>]*>/g, ' ');

  // Remove JS patterns: IIFE, window assignments, function declarations, $(...) calls
  cleanText = cleanText.replace(/\(function\s*\([\s\S]*?\}\s*\)\s*\(\s*[^)]*\)\s*;?/g, ' ');
  cleanText = cleanText.replace(/window\.\w+\s*=[\s\S]*?;/g, ' ');
  cleanText = cleanText.replace(/function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\}\s*/g, ' ');
  cleanText = cleanText.replace(/gtag\s*\([^)]*\)\s*;?/g, ' ');
  cleanText = cleanText.replace(/\$\s*\(document\)[\s\S]*?;\s*/g, ' ');

  // Remove CSS patterns: selectors with curly-brace blocks
  cleanText = cleanText.replace(/[.#]?[\w-]+(?:\s*[,:>+~\[\]()]*\s*[\w-]*)*\s*\{[^{}]*\}/g, ' ');
  cleanText = cleanText.replace(/@[\w-]+[^{]*\{[^{}]*\}/g, ' ');
  cleanText = cleanText.replace(/--[\w-]+\s*:[^;]+;/g, ' ');

  return cleanupRawText(cleanText);
};

export default {
  stripHtmlTags,
  decodeHtmlEntities
};
