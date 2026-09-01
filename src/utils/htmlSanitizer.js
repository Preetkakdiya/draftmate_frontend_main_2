/**
 * HTML Sanitizer & Legal Text Extractor Utility
 *
 * Extracts complete, formatted legal judgment text from Indian Kanoon HTML responses,
 * completely stripping UI components, CSS rules, analytics scripts, and banners while
 * preserving paragraph structure, court headings, and numbered orders.
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
 * Post-processes extracted text:
 * Purges leftover CSS rules, JS code blocks, analytics, and Indian Kanoon site chrome.
 */
function postProcessLegalText(text) {
  if (!text) return text;
  let clean = text;

  // 1. Remove JS patterns (window.dataLayer, gtag, IIFE, jQuery, function declarations)
  clean = clean.replace(/window\.dataLayer\s*=\s*[\s\S]*?;/gi, '');
  clean.replace(/window\.\w+\s*=\s*[\s\S]*?;/gi, '');
  clean = clean.replace(/gtag\s*\([^)]*\)\s*;?/gi, '');
  clean = clean.replace(/\(function\s*\([^)]*\)\s*\{[\s\S]*?\}\s*\)\s*\([^)]*\)\s*;?/gi, '');
  clean = clean.replace(/\$\s*\(document\)[\s\S]*?\)\s*;?/gi, '');
  clean = clean.replace(/function\s+\w*\s*\([^)]*\)\s*\{[\s\S]*?\}/gi, '');

  // 2. Remove CSS rule blocks (:root {...}, @keyframes {...}, .class {...}, #id {...})
  clean = clean.replace(/:root\s*\{[\s\S]*?\}/gi, '');
  clean = clean.replace(/@keyframes\s+[\w-]+\s*\{[\s\S]*?\}/gi, '');
  clean = clean.replace(/@media\s+[^{]+\{[\s\S]*?\}\s*\}/gi, '');
  clean = clean.replace(/([.#][\w-]+|\w+)\s*\{[^}]*\}/gi, '');
  clean = clean.replace(/--[\w-]+\s*:[^;\}]+;?/gi, '');

  // 3. Filter line-by-line to remove remaining code snippets & site boilerplate
  const ikBoilerplatePatterns = [
    /Skip to main content/i,
    /Search laws,?\s*court judgments/i,
    /Unlock Advanced Research/i,
    /Free features\s+Premium/i,
    /Tools for analyzing structure/i,
    /AI Integrated with over/i,
    /\[Cites \d+\s*,\s*Cited by \d+\s*\]/i,
    /Case Recast AI/i,
    /Related AI tags/i,
    /About\s+Disclaimer\s+Privacy Policy/i,
    /Warning on translation/i,
    /Get in PDF/i,
    /Print it!/i,
    /Download Court Copy/i,
    /Mobile Navigation/i,
    /Know your Kanoon/i,
    /Doc Gen Hub/i,
    /Counter Argument/i,
    /Case Predict AI/i,
    /Talk with IK Doc/i,
  ];

  const lines = clean.split('\n');
  const filteredLines = [];

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip CSS / JS / JSON code lines
    if (
      trimmed.startsWith('{') || trimmed.endsWith('}') ||
      trimmed.includes('var ') || trimmed.includes('const ') || trimmed.includes('let ') ||
      trimmed.includes('function(') || trimmed.includes('document.get') ||
      trimmed.includes('display:') || trimmed.includes('color:') || trimmed.includes('margin:') ||
      trimmed.includes('padding:') || trimmed.includes('font-family:') || trimmed.includes('transform:') ||
      trimmed.includes('background:') || trimmed.includes('box-shadow:') || trimmed.includes('border:')
    ) {
      continue;
    }

    // Skip site boilerplate
    let isBoilerplate = false;
    for (const pat of ikBoilerplatePatterns) {
      if (pat.test(trimmed)) {
        isBoilerplate = true;
        break;
      }
    }
    if (isBoilerplate) continue;

    filteredLines.push(trimmed);
  }

  // Join lines into clean formatted paragraphs
  let result = filteredLines.join('\n\n');
  result = decodeHtmlEntities(result);

  // Collapse multiple spaces but preserve paragraph breaks
  return result.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Strips all HTML tags, embedded CSS/JS code blocks, and site header boilerplate
 * extracting the COMPLETE judgment text (all paragraphs and court orders).
 *
 * @param {string} htmlString - Raw HTML document from Indian Kanoon
 * @returns {string} Clean, formatted plain text judgment
 */
export const stripHtmlTags = (htmlString) => {
  if (!htmlString) return htmlString;

  // ── Strategy 1: Browser DOMParser ─────────────────────────────────────────
  if (typeof window !== 'undefined' && window.DOMParser) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlString, 'text/html');

      // 1. Remove noisy non-content elements
      const noisySelectors = [
        'script', 'style', 'noscript', 'nav', 'header', 'footer', 'iframe', 'svg',
        'button', 'input', 'form', '.premium-banner', '#case-recast-fab',
        '#google_translate_element', '.search-autocomplete-list', '.ui-dialog',
        '.ui-widget', '.ui-autocomplete', '#translatewarn', '#courtcopyform',
        '#pdfdoc', '#printdoc', '.mainnavigation', '.siteheader', '.sitefooter',
        '.navigation', '[id^="google_translate"]', '.expanded_doc_header'
      ];

      noisySelectors.forEach(sel => {
        try {
          doc.querySelectorAll(sel).forEach(el => el.remove());
        } catch {}
      });

      // 2. Target ALL document content sections (title + full judgment body)
      const contentElements = doc.querySelectorAll(
        '.docsource_main, #judgements, .judgements, #judgments, .judgments, ' +
        '.expanded_doc, #doc, .doc, #main-doc, .doc-content, .judgment-content, ' +
        'blockquote, pre, .doc_input'
      );

      let extractedParagraphs = [];

      if (contentElements && contentElements.length > 0) {
        contentElements.forEach(container => {
          // Extract text from block-level children or pre elements
          const blockNodes = container.querySelectorAll('h1, h2, h3, h4, p, pre, blockquote, div.doc_input, div.item_title');
          if (blockNodes && blockNodes.length > 0) {
            blockNodes.forEach(b => {
              const txt = (b.innerText || b.textContent || '').trim();
              if (txt && !extractedParagraphs.includes(txt)) {
                extractedParagraphs.push(txt);
              }
            });
          } else {
            const txt = (container.innerText || container.textContent || '').trim();
            if (txt && !extractedParagraphs.includes(txt)) {
              extractedParagraphs.push(txt);
            }
          }
        });
      }

      // If specific containers did not yield enough text, fall back to doc.body
      if (extractedParagraphs.join('\n').length < 150) {
        extractedParagraphs = [];
        const bodyBlocks = doc.body.querySelectorAll('h1, h2, h3, h4, p, pre, blockquote, div');
        bodyBlocks.forEach(b => {
          // Only take leaf nodes or text block elements to avoid parent duplication
          if (
            b.children.length === 0 ||
            Array.from(b.children).every(c => ['BR', 'A', 'SPAN', 'B', 'I', 'STRONG', 'EM'].includes(c.tagName))
          ) {
            const txt = (b.innerText || b.textContent || '').trim();
            if (txt && txt.length > 5 && !extractedParagraphs.includes(txt)) {
              extractedParagraphs.push(txt);
            }
          }
        });
      }

      const rawCombined = extractedParagraphs.join('\n\n');
      return postProcessLegalText(rawCombined);
    } catch (e) {
      console.warn('DOMParser extraction failed, using fallback:', e);
    }
  }

  // ── Strategy 2: Regex Fallback ────────────────────────────────────────────
  let cleanText = htmlString;
  cleanText = cleanText.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  cleanText = cleanText.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  cleanText = cleanText.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
  cleanText = cleanText.replace(/<header[\s\S]*?<\/header>/gi, ' ');
  cleanText = cleanText.replace(/<nav[\s\S]*?<\/nav>/gi, ' ');
  cleanText = cleanText.replace(/<footer[\s\S]*?<\/footer>/gi, ' ');
  cleanText = cleanText.replace(/<iframe[\s\S]*?<\/iframe>/gi, ' ');
  cleanText = cleanText.replace(/<[^>]*>/g, ' ');

  return postProcessLegalText(cleanText);
};

export default {
  stripHtmlTags,
  decodeHtmlEntities
};
