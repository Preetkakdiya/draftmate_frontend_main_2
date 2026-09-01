/**
 * HTML Sanitizer Utility
 *
 * Functions to strip HTML tags, embedded JS/CSS code, and site boilerplate
 * from legal text (e.g. Indian Kanoon scraped pages), returning clean plain text.
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
 * Purges JS statements, inline scripts, CSS rules, and site boilerplate
 */
function purgeJsAndCssNoise(text) {
  if (!text) return text;
  let clean = text;

  // 1. Remove JS patterns: window.dataLayer, gtag, IIFE, $(document).ready, function declarations
  clean = clean.replace(/window\.dataLayer\s*=\s*[\s\S]*?;/gi, ' ');
  clean = clean.replace(/window\.\w+\s*=\s*[\s\S]*?;/gi, ' ');
  clean = clean.replace(/gtag\s*\([^)]*\)\s*;?/gi, ' ');
  clean = clean.replace(/\(function\s*\([^)]*\)\s*\{[\s\S]*?\}\s*\)\s*\([^)]*\)\s*;?/gi, ' ');
  clean = clean.replace(/\$\s*\(document\)[\s\S]*?\)\s*;?/gi, ' ');
  clean = clean.replace(/\$\s*\([^)]*\)[\s\S]*?;\s*/gi, ' ');
  clean = clean.replace(/function\s+\w*\s*\([^)]*\)\s*\{[\s\S]*?\}/gi, ' ');

  // 2. Remove CSS rule blocks: :root { ... }, @keyframes { ... }, @media { ... }, .class { ... }
  clean = clean.replace(/:root\s*\{[\s\S]*?\}/gi, ' ');
  clean = clean.replace(/@keyframes\s+[\w-]+\s*\{[\s\S]*?\}/gi, ' ');
  clean = clean.replace(/@media\s+[^{]+\{[\s\S]*?\}\s*\}/gi, ' ');
  clean = clean.replace(/([.#][\w-]+|\w+)\s*\{[^}]*\}/gi, ' ');
  clean = clean.replace(/--[\w-]+\s*:[^;\}]+;?/gi, ' ');

  // 3. Remove Indian Kanoon navigation boilerplate and UI strings
  const ikBoilerplate = [
    /Skip to main content/gi,
    /Indian Kanoon\s*[-–]\s*Search engine for Indian Law/gi,
    /Search laws,?\s*court judgments/gi,
    /Unlock Advanced Research/gi,
    /Free features\s+Premium\s+Premium features\s+Prism AI\s+IKademy\s+Pricing\s+Login/gi,
    /Tools for analyzing structure and cite text of judgments/gi,
    /AI Integrated with over \d+ crore judgments[^\n]*/gi,
    /\[Cites \d+\s*,\s*Cited by \d+\s*\]/gi,
    /Case Recast AI/gi,
    /Related AI tags, queries and research notes/gi,
    /About\s+Disclaimer\s+Privacy Policy\s+Terms\s+Case Removal\s+Blog\s+Share URL\s+Mobile View/gi,
    /Warning on translation/gi,
    /The option to translate the legal documents is to overcome language barriers[^\n]*/gi,
    /Signature Not Verified[^\n]*/gi,
    /Digitally signed by[^\n]*/gi,
    /Get in PDF/gi,
    /Print it!/gi,
    /Download Court Copy/gi,
    /Mobile Navigation/gi,
    /Know your Kanoon/gi,
    /Doc Gen Hub/gi,
    /Counter Argument/gi,
    /Case Predict AI/gi,
    /Talk with IK Doc/gi,
  ];

  for (const pat of ikBoilerplate) {
    clean = clean.replace(pat, ' ');
  }

  // Collapse whitespace
  clean = clean.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return decodeHtmlEntities(clean);
}

/**
 * Strips all HTML tags, embedded CSS/JS code blocks, and site header boilerplate
 * @param {string} text - Text containing HTML or scraped markup
 * @returns {string} Clean plain text without CSS/JS code or navigation noise
 */
export const stripHtmlTags = (text) => {
  if (!text) return text;

  // ── Strategy 1: Use DOMParser (browser) to parse HTML structure ────────
  if (typeof window !== 'undefined' && window.DOMParser) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');

      // Remove script/style/nav/header/footer elements entirely
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

      // Try Indian Kanoon container selectors (checking correct spelling variants)
      const judgmentSelectors = [
        '#judgements', '.judgements', '#judgments', '.judgments',
        '.docsource_main', '.expanded_doc', '#doc', '.doc',
        '#main-doc', '.main-doc', '#judgment-doc',
        '.doc-content', '#doc-content', '.judgment-content',
        'pre', '.judgment',
      ];
      let contentEl = null;
      for (const sel of judgmentSelectors) {
        contentEl = doc.querySelector(sel);
        if (contentEl) break;
      }

      // Extract innerText or textContent
      const rawText = (contentEl || doc.body).innerText
        || (contentEl || doc.body).textContent
        || '';

      return purgeJsAndCssNoise(rawText);
    } catch {
      // Fall through to regex strategy
    }
  }

  // ── Strategy 2: Regex fallback ──────────────────────────────────────────
  let cleanText = text;

  // Remove block tags
  cleanText = cleanText.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  cleanText = cleanText.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  cleanText = cleanText.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
  cleanText = cleanText.replace(/<header[\s\S]*?<\/header>/gi, ' ');
  cleanText = cleanText.replace(/<nav[\s\S]*?<\/nav>/gi, ' ');
  cleanText = cleanText.replace(/<footer[\s\S]*?<\/footer>/gi, ' ');
  cleanText = cleanText.replace(/<iframe[\s\S]*?<\/iframe>/gi, ' ');

  // Remove all HTML tags
  cleanText = cleanText.replace(/<[^>]*>/g, ' ');

  return purgeJsAndCssNoise(cleanText);
};

export default {
  stripHtmlTags,
  decodeHtmlEntities
};
