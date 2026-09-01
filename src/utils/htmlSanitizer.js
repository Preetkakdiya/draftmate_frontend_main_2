/**
 * HTML Sanitizer & Legal Text Extractor Utility
 *
 * Extracts clean, formatted legal judgment text from Indian Kanoon HTML responses,
 * completely purging inline scripts (window.dataLayer, gtag), CSS stylesheets,
 * navigation headers, and PRISM banners, while preserving court headers and numbered paragraphs.
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
 * Line-by-line cleaner that strips residual JS code, CSS variables/keyframes,
 * and site boilerplate text.
 */
function cleanNoiseFromText(text) {
  if (!text) return '';

  let clean = text;

  // 1. Strip JavaScript functions, dataLayer, gtag, jQuery
  clean = clean.replace(/window\.dataLayer\s*=\s*[\s\S]*?;/gi, '');
  clean = clean.replace(/gtag\s*\([^)]*\)\s*;?/gi, '');
  clean = clean.replace(/\(function\s*\([\s\S]*?\}\)\(\);?/gi, '');
  clean = clean.replace(/\$\s*\(document\)[\s\S]*?\);?/gi, '');

  // 2. Strip CSS rules, root variables, keyframes
  clean = clean.replace(/:root\s*\{[\s\S]*?\}/gi, '');
  clean = clean.replace(/@keyframes[\s\S]*?\}/gi, '');
  clean = clean.replace(/@media[\s\S]*?\}\s*\}/gi, '');
  clean = clean.replace(/--[\w-]+\s*:[^;\}]+;?/gi, '');
  clean = clean.replace(/([.#][\w-]+|\w+)\s*\{[^}]*\}/gi, '');

  const lines = clean.split('\n');
  const cleanLines = [];

  const noiseKeywords = [
    'window.dataLayer', 'gtag(', 'function()', 'var ', 'const ', 'let ',
    ':root', '@keyframes', 'display:', 'color:', 'margin:', 'padding:',
    'font-family:', 'transform:', 'background:', 'box-shadow:', 'border:',
    'opacity:', 'border-radius:', 'position:', 'overflow:', 'backdrop-filter:',
    'Search laws, court judgments', 'Free features', 'Premium', 'Prism AI',
    'IKademy', 'Pricing', 'Login', 'Tools for analyzing structure',
    'Unlock Advanced Research', 'Integrated with over 4 crore', 'Get in PDF',
    'Print it!', 'Download Court Copy', '[Cites ', 'Cited by ', 'Mobile Navigation',
    'Case Recast AI', 'Talk with IK Doc', 'Disclaimer', 'Privacy Policy'
  ];

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check for noise keywords
    let isNoise = false;
    for (const kw of noiseKeywords) {
      if (trimmed.includes(kw)) {
        isNoise = true;
        break;
      }
    }
    if (isNoise) continue;

    // Check for JS/CSS code syntax
    if (
      trimmed.startsWith('{') || trimmed.endsWith('}') ||
      trimmed.includes('{ opacity:') || trimmed.includes('linear-gradient(') ||
      trimmed.includes('rgba(') || trimmed.includes('var(--')
    ) {
      continue;
    }

    cleanLines.push(trimmed);
  }

  let result = cleanLines.join('\n\n');
  result = decodeHtmlEntities(result);

  // Normalize multiple spaces and blank lines
  return result.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Strips HTML tags, embedded CSS/JS code blocks, and site chrome from Indian Kanoon responses,
 * returning clean full judgment text formatted into paragraphs.
 *
 * @param {string} htmlString - Raw HTML document from Indian Kanoon or snippet text
 * @returns {string} Clean, formatted plain text judgment
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
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');

  if (typeof window !== 'undefined' && window.DOMParser) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(preCleaned, 'text/html');

      // Remove UI noise elements
      const noiseElements = doc.querySelectorAll(
        'script, style, noscript, nav, header, footer, iframe, svg, button, input, form, ' +
        '.premium-banner, #case-recast-fab, #google_translate_element, .search-autocomplete-list, ' +
        '.ui-dialog, .ui-widget, .ui-autocomplete, #translatewarn, #courtcopyform, ' +
        '#pdfdoc, #printdoc, .mainnavigation, .siteheader, .sitefooter, .navigation, ' +
        '[id^="google_translate"], .expanded_doc_header, .doc_options, .ad-box, .banner'
      );
      noiseElements.forEach(el => el.remove());

      // Extract document elements: .docsource_main (header) and body containers (.expanded_doc, #judgements, .judgements, #doc, .doc_input)
      const docHeader = doc.querySelector('.docsource_main');
      const docContainers = doc.querySelectorAll('.expanded_doc, #judgements, .judgements, #doc, .doc, .doc_input');

      let paragraphList = [];

      if (docHeader) {
        const headerTxt = (docHeader.innerText || docHeader.textContent || '').trim();
        if (headerTxt) paragraphList.push(headerTxt);
      }

      if (docContainers && docContainers.length > 0) {
        docContainers.forEach(container => {
          const blockNodes = container.querySelectorAll('pre, blockquote, p, div.doc_input, div.item_title, h1, h2, h3, h4');
          if (blockNodes && blockNodes.length > 0) {
            blockNodes.forEach(node => {
              const txt = (node.innerText || node.textContent || '').trim();
              if (txt && !paragraphList.includes(txt)) {
                paragraphList.push(txt);
              }
            });
          } else {
            const txt = (container.innerText || container.textContent || '').trim();
            if (txt && !paragraphList.includes(txt)) {
              paragraphList.push(txt);
            }
          }
        });
      }

      // Fallback for general HTML structures
      if (paragraphList.length === 0) {
        const allBlocks = doc.body ? doc.body.querySelectorAll('pre, blockquote, p, h1, h2, h3, h4, div') : [];
        allBlocks.forEach(node => {
          if (node.children.length === 0 || Array.from(node.children).every(c => ['BR', 'A', 'SPAN', 'B', 'I', 'STRONG', 'EM'].includes(c.tagName))) {
            const txt = (node.innerText || node.textContent || '').trim();
            if (txt && txt.length > 5 && !paragraphList.includes(txt)) {
              paragraphList.push(txt);
            }
          }
        });
      }

      if (paragraphList.length === 0 && doc.body) {
        const bodyTxt = (doc.body.innerText || doc.body.textContent || '').trim();
        if (bodyTxt) paragraphList.push(bodyTxt);
      }

      const combined = paragraphList.join('\n\n');
      return cleanNoiseFromText(combined);
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
