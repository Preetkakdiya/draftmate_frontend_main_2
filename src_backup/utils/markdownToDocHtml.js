import DOMPurify from 'dompurify';

/**
 * Transforms Markdown and non-standard AI Legal Research responses into
 * clean, semantic, DOMPurify-sanitized HTML for ONLYOFFICE PasteHtml insertion.
 * Enforces standard Calibri 11pt document typography, fixes placeholder collisions,
 * and ensures all inserted citations ([1], [2], statutory IPC/CrPC sections, case names, Kanoon links)
 * are clean, valid, clickable URLs that open the exact source page when clicked.
 */

const escapeHtml = (str) => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

/**
 * Sanitizes & cleans target URLs by removing trailing brackets ], parentheses ), periods ., commas, etc.
 * Normalizes protocol to https:// to prevent 404 errors.
 */
export const cleanTargetUrl = (rawUrl) => {
  if (!rawUrl) return '';
  let cleaned = String(rawUrl).trim();

  // Strip trailing punctuation like ], ), ., ,, ;, :, >
  cleaned = cleaned.replace(/[\s\)\].!?,;:>]+$/g, '');

  // Ensure trailing slash for Indian Kanoon doc URLs if stripped down to digits (e.g. /doc/172598580)
  if (/\/doc\/\d+$/i.test(cleaned)) {
    cleaned += '/';
  }

  // Ensure proper https:// protocol
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
    cleaned = 'https://' + cleaned;
  } else if (cleaned.startsWith('http://')) {
    cleaned = cleaned.replace(/^http:\/\//i, 'https://');
  }

  return cleaned;
};

/**
 * Formats inline text elements with safe placeholder replacements:
 * - Bold: **text** or __text__ -> <strong>text</strong>
 * - Italic: *text* or _text_ -> <em>text</em>
 * - Hyperlinks: [label](url) -> <a href="url">label</a>
 * - Bracketed URLs: [Indian Kanoon - http://...] -> <a href="url">[label]</a>
 * - Naked URLs: http(s):// -> <a href="url">url</a>
 * - Citations: [1], [2] -> <a href="url" target="_blank"><sup>[1]</sup></a> (Clickable source links)
 * - Statutory Provisions: "Section 12 of Contempt of Courts Act", "Section 406 IPC", "Article 30" -> Clickable Kanoon search link
 * - Legal Case Names: "X vs Y", "X v. Y", "In re X" -> <a href="..." target="_blank"><em>Case Name</em></a>
 */
export const formatInlineText = (text, sources = []) => {
  if (!text) return '';
  let str = text;

  // Build a lookup map for sources by index (both 1-indexed and 0-indexed)
  const sourceMap = {};
  if (Array.isArray(sources)) {
    sources.forEach((s, i) => {
      const idx = s.index !== undefined ? s.index : (i + 1);
      sourceMap[idx] = s;
      sourceMap[String(idx)] = s;
      if (s.id !== undefined) sourceMap[s.id] = s;
    });
  }

  // Use SAFE non-markdown placeholders (no underscores/asterisks) to avoid corruption
  const replacements = [];
  const addPlaceholder = (html) => {
    const token = `XPH${replacements.length}XPH`;
    replacements.push({ token, html });
    return token;
  };

  // 1. Bracketed URLs e.g. [Indian Kanoon - http://indiankanoon.org/doc/172598580/]
  const bracketedUrlRegex = /\[([^\]]*?)(https?:\/\/[^\s\]]+|(?:www\.)?indiankanoon\.org\/[^\s\]]+)([^\]]*?)\]/gi;
  str = str.replace(bracketedUrlRegex, (match, prefix, rawUrl, suffix) => {
    const validUrl = cleanTargetUrl(rawUrl);
    const labelText = (prefix + suffix).replace(new RegExp('^[' + '-:\\\\s' + ']+|[' + '-:\\\\s' + ']+$', 'g'), '').trim();
    const displayLabel = labelText ? `[${escapeHtml(labelText)} - ${validUrl}]` : `[${validUrl}]`;
    return addPlaceholder(`<a href="${validUrl}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">${displayLabel}</a>`);
  });

  // 2. Explicit Markdown links [label](url)
  str = str.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (match, label, url) => {
    const validUrl = cleanTargetUrl(url);
    return addPlaceholder(`<a href="${validUrl}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">${escapeHtml(label)}</a>`);
  });

  // 3. Naked URLs (e.g. http://indiankanoon.org/doc/172598580/ or indiankanoon.org/doc/172598580/)
  const urlRegex = /(?<!\]\(|href=")(\b(?:https?:\/\/|(?:www\.)?indiankanoon\.org\/)[^\s<>\)\],]+)/gi;
  str = str.replace(urlRegex, (match) => {
    const validUrl = cleanTargetUrl(match);
    return addPlaceholder(`<a href="${validUrl}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">${validUrl}</a>`);
  });

  // 4. Contextual Citation Tags e.g. [1], [2], [3] -> Clickable Source Links
  str = str.replace(/([^\n.!?]{2,60})?\s*\[(\d+)\]/g, (match, contextBefore, num) => {
    const source = sourceMap[num] || sourceMap[parseInt(num)];

    let rawTargetUrl = source?.url || source?.link || source?.source_url || source?.href;
    if (!rawTargetUrl && source?.doc_id) {
      rawTargetUrl = `https://indiankanoon.org/doc/${source.doc_id}/`;
    }
    if (!rawTargetUrl && source?.docid) {
      rawTargetUrl = `https://indiankanoon.org/doc/${source.docid}/`;
    }
    if (!rawTargetUrl) {
      const cleanContext = (contextBefore || '').replace(/[\*\_\[\]]/g, '').trim();
      const searchQuery = source?.citation || source?.title || source?.name || cleanContext || (`Citation ${num}`);
      rawTargetUrl = `https://indiankanoon.org/search/?formInput=${encodeURIComponent(searchQuery)}`;
    }

    const validUrl = cleanTargetUrl(rawTargetUrl);
    const titleAttr = escapeHtml(source?.title || source?.citation || source?.name || `Citation [${num}]`);
    const prefixText = contextBefore ? contextBefore : '';
    const citationHtml = `<a href="${validUrl}" target="_blank" rel="noopener noreferrer" title="${titleAttr}" style="color: #2563eb; text-decoration: underline; font-weight: bold;"><sup>[${num}]</sup></a>`;
    
    return `${prefixText}${addPlaceholder(citationHtml)}`;
  });

  // 5. Statutory Law References (e.g., Section 406 of the Indian Penal Code (IPC), Article 226 of the Constitution of India, Section 12 of Contempt of Courts Act)
  const statuteRegex = /\b(?:Sections?|Article|Sec\.?)\s+\d+(?:\(\d+\))?(?:\([a-zA-Z]\))?(?:\s*,\s*\d+(?:\(\d+\))?)*(?:\s+and\s+\d+(?:\(\d+\))?)?\s+(?:of\s+(?:the\s+)?)?[A-Z][A-Za-z0-9\s,()'-]+(?:Act|Code|Constitution|IPC|CrPC|CPC|I\.P\.C\.|Cr\.P\.C\.|C\.P\.C\.)(?:\s*,\s*\d{4})?\b/gi;
  str = str.replace(statuteRegex, (match) => {
    if (match.includes('XPH') || match.includes('<a')) return match;
    const searchUrl = `https://indiankanoon.org/search/?formInput=${encodeURIComponent(match)}`;
    // Bold + Underlined statutory law highlight (matching python-docx sec_run.bold = True, sec_run.font.underline = True)
    return addPlaceholder(`<a href="${searchUrl}" target="_blank" rel="noopener noreferrer" style="color: #000000; font-weight: bold; text-decoration: underline;">${escapeHtml(match)}</a>`);
  });

  // 6. Bold: **text** or __text__
  str = str.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');

  // 7. Italic: *text* or _text_
  str = str.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');

  // 8. Legal Case Name Auto-detection (e.g. Anand Kumar Mohatta v. State, Radhey Shyam v. Chhabi Nath)
  const caseRegex = /\b([A-Z][A-Za-z0-9.&'/-]*(?:\s+[A-Z][A-Za-z0-9.&'/-]*)*)\s+(?:vs\.?|v\.?|VERSUS)\s+([A-Z][A-Za-z0-9.&'/-]*(?:\s+[A-Z][A-Za-z0-9.&'/-]*)*)\b|\bIn\s+re\s+([A-Z][A-Za-z0-9.&'/-]*(?:\s+[A-Z][A-Za-z0-9.&'/-]*)*)\b/g;
  str = str.replace(caseRegex, (match) => {
    if (match.includes('<strong>') || match.includes('<em>') || match.includes('XPH') || match.includes('<a')) return match;
    const searchUrl = `https://indiankanoon.org/search/?formInput=${encodeURIComponent(match)}`;
    return addPlaceholder(`<a href="${searchUrl}" target="_blank" rel="noopener noreferrer" style="color: #000000; text-decoration: underline; font-style: italic; font-weight: bold;"><em>${escapeHtml(match)}</em></a>`);
  });

  // Restore placeholders safely
  replacements.forEach(({ token, html }) => {
    str = str.replace(token, html);
  });

  return str;
};

/**
 * Detects whether a trimmed line is part of a centered court caption block.
 * These are short lines (≤ 90 chars) that form the case header:
 *   SUMMONS / NOTICE / PETITION / WRIT / ORDER / JUDGMENT
 *   IN THE … COURT …
 *   PLAINTIFF_NAME, / Petitioner / Respondent
 *   v. / vs. / VERSUS
 *   Case No.: …  / No. … / Petition No. …
 */
const isCaptionLine = (text) => {
  if (!text || text.length > 90) return false;
  const t = text.trim();
  if (!t) return false;

  // Explicit court document keywords
  if (/^(SUMMONS|NOTICE|PETITION|WRIT|ORDER|JUDGMENT|DECREE|WARRANT|SUBPOENA|COMPLAINT|AFFIDAVIT|BAIL APPLICATION|CHARGE SHEET|CRIMINAL WRIT PETITION|CIVIL WRIT PETITION)\b/i.test(t)) return true;
  if (/^IN THE\b/i.test(t)) return true;
  if (/^BEFORE THE\b/i.test(t)) return true;
  if (/\b(SUPREME COURT|HIGH COURT|DISTRICT COURT|SESSION(S)? COURT|FAMILY COURT|CIVIL COURT|CRIMINAL COURT|TRIBUNAL|MAGISTRATE|JURISDICTION)\b/i.test(t)) return true;
  if (/^v\.?$|^vs\.?$|^versus$/i.test(t)) return true;
  if (/^(\.\.\.\s*)?(Plaintiff|Defendant|Petitioner|Respondent|Appellant|Appellee|Complainant|Accused|Applicant)s?\s*[(),.]?\s*$/i.test(t)) return true;
  if (/^(Case|Petition|Application|Suit|Appeal|Complaint|FIR|CRL|Cr\.?P\.?C?|WP|SLP|CA|OP)\s*(No\.?|Number)[\s:]/i.test(t)) return true;
  if (/^(DIVISION|DEPARTMENT|BENCH|COURT NO\.?|COURT ROOM)[\s:]/i.test(t)) return true;
  if (t.length <= 60 && t === t.toUpperCase() && /[A-Z]/.test(t) && !/[.!?](?:\s|$)/.test(t.slice(0, -1))) return true;
  if (t.length <= 60 && /,$/.test(t) && !/^(WHEREAS|WHEREAS,|AND,|THE ABOVE)/.test(t)) return true;

  return false;
};

/**
 * Detects a section heading like "TO THE DEFENDANT(S):" or "WHEREAS:" — left-aligned bold.
 */
const isSectionHeading = (text) => {
  if (!text) return false;
  const t = text.trim();
  if (t.length <= 80 && /[:\-]\s*$/.test(t) && t === t.toUpperCase() && /[A-Z]/.test(t)) return true;
  if (/^TO THE\b/i.test(t) && t.length <= 80) return true;
  if (/^(WHEREAS|NOW THEREFORE|BE IT KNOWN|BE IT RESOLVED|KNOW ALL MEN BY THESE PRESENTS)\b/i.test(t)) return true;
  return false;
};

/**
 * Main AST & Structure Parser: Converts raw text -> AST -> Styled HTML
 * matching Indian Court Legal Document Standards (Times New Roman 12pt, 1.5 line spacing, 0.5" indent, Legal margins).
 */
export const convertMarkdownToDocHtml = (rawInput, sources = []) => {
  if (!rawInput || !rawInput.trim()) return '';

  console.log('[MarkdownToDocHtml] --- Step 1: Original AI Response ---');
  console.log(rawInput);
  console.log('[MarkdownToDocHtml] Sources for citations:', sources);

  const lines = rawInput.replace(/\r\n/g, '\n').split('\n');
  const ast = [];
  let currentList = null;

  const flushList = () => {
    if (currentList) {
      ast.push(currentList);
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    // 1. Markdown Headings (# Heading, ## Heading, ### Heading)
    const mdHeaderMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (mdHeaderMatch) {
      flushList();
      const level = Math.min(mdHeaderMatch[1].length, 3);
      ast.push({ type: 'heading', level, text: mdHeaderMatch[2].trim() });
      continue;
    }

    // 2. Section headings like "TO THE DEFENDANT(S):" — left-aligned bold
    if (isSectionHeading(trimmed)) {
      flushList();
      ast.push({ type: 'section', text: trimmed });
      continue;
    }

    // 3. Court caption lines — centered bold or right-aligned party label
    if (isCaptionLine(trimmed)) {
      flushList();
      const isPartyDesignation = /^(\.\.\.\s*)?(Petitioner|Respondent|Plaintiff|Defendant|Appellant|Appellee)s?\s*$/i.test(trimmed);
      if (isPartyDesignation) {
        ast.push({ type: 'party_label', text: trimmed });
      } else {
        ast.push({ type: 'caption', text: trimmed });
      }
      continue;
    }

    // 4. Major Numbered Heading (e.g. "1. **Brief Answer**")
    const majorNumberedMatch = trimmed.match(/^(\d+)\.\s+(\*\*(.*?)\*\*|__(.*?)__|([A-Z0-9\s:/-]{3,}))(?:\s*(.*))?$/i);
    if (majorNumberedMatch) {
      flushList();
      const number = majorNumberedMatch[1];
      const titleText = majorNumberedMatch[3] || majorNumberedMatch[4] || majorNumberedMatch[5] || '';
      const inlineContent = majorNumberedMatch[6] ? majorNumberedMatch[6].trim() : '';
      ast.push({ type: 'heading', level: 2, text: `${number}. ${titleText.trim().replace(/:$/, '')}` });
      if (inlineContent) ast.push({ type: 'paragraph', text: inlineContent });
      continue;
    }

    // 5. Bullet Subsection Heading
    const bulletHeadingMatch = trimmed.match(/^[-*]\s+\*\*(.*?)\:\*\*\s*(.*)$/);
    if (bulletHeadingMatch) {
      flushList();
      const titleText = bulletHeadingMatch[1].trim();
      const inlineContent = bulletHeadingMatch[2].trim();
      ast.push({ type: 'heading', level: 3, text: titleText });
      if (inlineContent) ast.push({ type: 'paragraph', text: inlineContent });
      continue;
    }

    // 6. Inline Bold Section Title
    const inlineBoldHeadingMatch = trimmed.match(/^\*\*(.*?)\:\*\*\s*(.*)$/);
    if (inlineBoldHeadingMatch) {
      flushList();
      const titleText = inlineBoldHeadingMatch[1].trim();
      const inlineContent = inlineBoldHeadingMatch[2].trim();
      ast.push({ type: 'heading', level: 3, text: titleText });
      if (inlineContent) ast.push({ type: 'paragraph', text: inlineContent });
      continue;
    }

    // 7. Blockquote Detection
    const quoteMatch = trimmed.match(/^&gt;|> (.*)$/);
    if (quoteMatch) {
      flushList();
      ast.push({ type: 'blockquote', text: quoteMatch[1] || '' });
      continue;
    }

    // 8. Bullet List Items (- item, * item)
    const bulletItemMatch = rawLine.match(/^(\s*)[-*]\s+(.+)$/);
    if (bulletItemMatch) {
      const indent = bulletItemMatch[1].length;
      const itemText = bulletItemMatch[2].trim();
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push({ text: itemText, indent });
      continue;
    }

    // 9. Numbered List Items (1. item, 2. item)
    const numberedItemMatch = rawLine.match(/^(\s*)(\d+)\.\s+(.+)$/);
    if (numberedItemMatch) {
      const indent = numberedItemMatch[1].length;
      const itemText = numberedItemMatch[3].trim();
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push({ text: itemText, indent });
      continue;
    }

    // 10. Regular Paragraph text
    if (!currentList && ast.length > 0 && ast[ast.length - 1].type === 'paragraph') {
      ast[ast.length - 1].text += ' ' + trimmed;
    } else {
      flushList();
      ast.push({ type: 'paragraph', text: trimmed });
    }
  }

  flushList();

  console.log('[MarkdownToDocHtml] --- Step 2: Detected AST Structure ---', ast);

  // ── HTML Renderer — Indian Court Legal Document Standard (Times New Roman 12pt, 1.5 line spacing) ──
  const FONT_FAMILY = "font-family:'Times New Roman', Times, serif;";
  const BASE = `box-sizing:border-box;width:100%;max-width:100%;word-wrap:break-word;overflow-wrap:break-word;word-break:normal;${FONT_FAMILY}`;
  let htmlResult = `<div style="${FONT_FAMILY}font-size:12pt;line-height:1.5;color:#000000;${BASE}margin:0;padding:0;">\n`;

  ast.forEach((node) => {
    if (node.type === 'heading') {
      const fontSize = node.level === 1 ? '14pt' : node.level === 2 ? '13pt' : '12pt';
      const marginTop = node.level === 1 ? '18pt' : node.level === 2 ? '14pt' : '10pt';
      const textAlign = node.level === 1 ? 'center' : 'left';
      htmlResult += `<h${node.level} style="font-size:${fontSize};font-weight:bold;color:#000;margin-top:${marginTop};margin-bottom:8pt;margin-left:0;margin-right:0;padding:0;line-height:1.3;text-align:${textAlign};${BASE}">${formatInlineText(node.text, sources)}</h${node.level}>\n`;

    } else if (node.type === 'caption') {
      // Court header & Case Title: centered, bold, Times New Roman 14pt/12pt
      const t = node.text.trim();
      const isHeaderLine = /^(IN THE|BEFORE THE|SUPREME COURT|HIGH COURT|DISTRICT COURT|RECORD OF PROCEEDINGS)/i.test(t);
      const isVs = /^v\.?$|^vs\.?$|^versus$/i.test(t);
      const fontSize = isHeaderLine ? '14pt' : '12pt';
      const marginBottom = isHeaderLine ? '12pt' : (isVs ? '6pt' : '4pt');
      const marginTop = isVs ? '6pt' : '2pt';
      htmlResult += `<p style="font-size:${fontSize};font-weight:bold;color:#000;text-align:center;margin-top:${marginTop};margin-bottom:${marginBottom};margin-left:0;margin-right:0;padding:0;line-height:1.4;${BASE}">${formatInlineText(t, sources)}</p>\n`;

    } else if (node.type === 'party_label') {
      // "... Petitioner" or "... Respondent" designation line — right aligned, bold
      const textWithPrefix = node.text.trim().startsWith('...') ? node.text.trim() : `... ${node.text.trim()}`;
      htmlResult += `<p style="font-size:12pt;font-weight:bold;color:#000;text-align:right;margin-top:2pt;margin-bottom:6pt;margin-left:0;margin-right:0;padding:0;${BASE}">${formatInlineText(textWithPrefix, sources)}</p>\n`;

    } else if (node.type === 'section') {
      // Section heading: left-aligned, bold — e.g. "TO THE DEFENDANT(S):"
      htmlResult += `<p style="font-size:12pt;font-weight:bold;color:#000;text-align:left;margin-top:14pt;margin-bottom:6pt;margin-left:0;margin-right:0;padding:0;${BASE}">${formatInlineText(node.text, sources)}</p>\n`;

    } else if (node.type === 'paragraph') {
      // Core Body Paragraph: Justified alignment, 1.5 line spacing, 0.5" first-line indent
      htmlResult += `<p style="font-size:12pt;line-height:1.5;color:#000000;margin-top:0;margin-bottom:8pt;margin-left:0;margin-right:0;padding:0;text-align:justify;text-indent:0.5in;${BASE}">${formatInlineText(node.text, sources)}</p>\n`;

    } else if (node.type === 'blockquote') {
      htmlResult += `<blockquote style="font-size:11.5pt;font-style:italic;border-left:3px solid #334155;padding-left:12pt;margin-top:6pt;margin-bottom:8pt;margin-left:0.5in;margin-right:0;color:#1e293b;${BASE}">${formatInlineText(node.text, sources)}</blockquote>\n`;

    } else if (node.type === 'ul' || node.type === 'ol') {
      const tag = node.type;
      htmlResult += `<${tag} style="font-size:12pt;line-height:1.5;color:#000000;margin-top:0;margin-bottom:8pt;margin-left:0;margin-right:0;padding-left:24pt;${BASE}">\n`;
      node.items.forEach((item) => {
        htmlResult += `  <li style="margin-bottom:4pt;margin-right:0;${BASE}">${formatInlineText(item.text, sources)}</li>\n`;
      });
      htmlResult += `</${tag}>\n`;
    }
  });

  htmlResult += `</div>`;

  console.log('[MarkdownToDocHtml] --- Step 3: Raw Generated HTML ---');
  console.log(htmlResult);

  // HTML Sanitization using DOMPurify
  const sanitizedHtml = DOMPurify.sanitize(htmlResult.trim(), {
    ALLOWED_TAGS: [
      'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'strong', 'em', 'b', 'i', 'u',
      'ul', 'ol', 'li', 'blockquote',
      'a', 'br', 'span', 'sub', 'sup'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'title', 'style'],
  });

  console.log('[MarkdownToDocHtml] --- Step 4: Final Sanitized HTML ---');
  console.log(sanitizedHtml);

  return sanitizedHtml;
};

export default convertMarkdownToDocHtml;
