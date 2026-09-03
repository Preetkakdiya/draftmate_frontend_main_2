/**
 * HTML Sanitizer & Legal Text Extractor Utility
 *
 * Extracts complete, formatted legal judgment text from Indian Kanoon HTML responses,
 * preserving all document sections: court header, bench names, party names, main order,
 * citations, quoted judgments, bench signatures, and record of proceedings.
 */

export const decodeHtmlEntities = (text) => {
  if (!text) return '';
  return text
    .replace(/&#x27;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (m, dec) => String.fromCharCode(dec))
    .replace(/&#x([0-9a-f]+);/gi, (m, hex) => String.fromCharCode(parseInt(hex, 16)));
};

/**
 * Line-by-line cleaner that decodes HTML entities and strips residual JS code,
 * CSS rules, and site chrome while preserving legal case text.
 */
function cleanNoiseFromText(text) {
  if (!text) return '';

  let clean = decodeHtmlEntities(text);

  // 1. Strip JavaScript functions, dataLayer, gtag, jQuery
  clean = clean.replace(/window\.dataLayer\s*=\s*[\s\S]*?;/gi, '');
  clean = clean.replace(/gtag\s*\([^)]*\)\s*;?/gi, '');
  clean = clean.replace(/\(function\s*\([\s\S]*?\}\)\(\);?/gi, '');
  clean = clean.replace(/\$\s*\(document\)[\s\S]*?\);?/gi, '');

  // 2. Strip CSS blocks and rules
  clean = clean.replace(/:root\s*\{[\s\S]*?\}/gi, '');
  clean = clean.replace(/@keyframes[\s\S]*?\}/gi, '');
  clean = clean.replace(/@media[\s\S]*?\}\s*\}/gi, '');
  clean = clean.replace(/--[\w-]+\s*:[^;\}]+;?/gi, '');
  clean = clean.replace(/([.#][\w-]+|\w+)\s*\{[^}]*\}/gi, '');

  const lines = clean.split('\n');
  const cleanLines = [];

  const noiseKeywords = [
    'window.dataLayer', 'gtag(', 'function()',
    ':root', '@keyframes', 'display:', 'font-family:', 'backdrop-filter:',
    'Search laws, court judgments', 'Free features', 'IKademy', 'Pricing',
    'Login', 'Tools for analyzing structure', 'Unlock Advanced Research',
    'Integrated with over 4 crore', 'Print it!', 'Download Court Copy',
    'Mobile Navigation', 'Case Recast AI', 'Talk with IK Doc'
  ];

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Legal sentence protection: Do NOT strip lines that are substantial legal text (> 80 chars or legal keywords)
    const isSubstantialLegalText = trimmed.length > 80 || /^\d+[\.\)]\s/.test(trimmed) || /^(ORDER|JUDGMENT|HELD|Bench:|Petitioner|Respondent|Court|Section|Act|Versus|VS\.)/i.test(trimmed);

    // Check for noise keywords
    let isNoise = false;
    for (const kw of noiseKeywords) {
      if (trimmed.includes(kw) && !isSubstantialLegalText) {
        isNoise = true;
        break;
      }
    }
    if (isNoise) continue;

    // Check for CSS rule syntax
    if (
      (!isSubstantialLegalText && (trimmed.startsWith('{') || trimmed.endsWith('}'))) ||
      trimmed.includes('{ opacity:') || trimmed.includes('linear-gradient(') ||
      trimmed.includes('rgba(') || trimmed.includes('var(--')
    ) {
      continue;
    }

    cleanLines.push(trimmed);
  }

  let result = cleanLines.join('\n\n');
  return result.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Strips HTML tags, embedded CSS/JS code blocks, and site chrome from Indian Kanoon responses,
 * returning the ENTIRE judgment document in full detail.
 *
 * @param {string} htmlString - Raw HTML document from Indian Kanoon or snippet text
 * @returns {string} Complete plain text judgment
 */
export const stripHtmlTags = (htmlString) => {
  if (!htmlString) return '';
  if (typeof htmlString !== 'string') return '';

  // If input is plain text without HTML markup, clean noise and return
  if (!htmlString.includes('<')) {
    return cleanNoiseFromText(htmlString);
  }

  // Pre-clean <script>, <style>, <noscript> blocks before DOM parsing
  let preCleaned = htmlString
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<\s*\/\s*(?:p|div|pre|blockquote|h[1-6]|tr|li)\s*>/gi, '\n\n')
    .replace(/<\s*br\s*\/?>/gi, '\n');

  if (typeof window !== 'undefined' && window.DOMParser) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(preCleaned, 'text/html');

      // Remove website UI noise elements
      const noiseElements = doc.querySelectorAll(
        'script, style, noscript, nav, header, footer, iframe, svg, button, input, form, ' +
        '.premium-banner, #case-recast-fab, #google_translate_element, .search-autocomplete-list, ' +
        '.ui-dialog, .ui-widget, .ui-autocomplete, #translatewarn, #courtcopyform, ' +
        '#pdfdoc, #printdoc, .mainnavigation, .siteheader, .sitefooter, .navigation, ' +
        '[id^="google_translate"], .expanded_doc_header, .doc_options, .ad-box, .banner'
      );
      noiseElements.forEach(el => el.remove());

      // Extract all text content preserving newlines
      const bodyTxt = doc.body ? (doc.body.innerText || doc.body.textContent || '') : doc.documentElement.textContent;
      if (bodyTxt && bodyTxt.trim().length > 30) {
        return cleanNoiseFromText(bodyTxt);
      }
    } catch (e) {
      console.warn('DOMParser failed:', e);
    }
  }

  // Regex Fallback
  return cleanNoiseFromText(preCleaned.replace(/<[^>]*>/g, ' '));
};

export default {
  stripHtmlTags,
  decodeHtmlEntities
};
