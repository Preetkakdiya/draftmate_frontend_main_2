/**
 * India Court-Ready Document Formatting Presets Spec
 * Per Supreme Court Circular F.No.01/Judl./2020, Delhi HC Practice Direction 2022, etc.
 */

export const COURT_PRESETS = {
  supreme_court: {
    id: 'supreme_court',
    name: 'Supreme Court of India',
    subtitle: 'Order XV Rule 1 (A4, 14pt, 1.5 Line, 4cm Margins)',
    paper: 'A4',
    widthDxa: 11906,  // 21 cm
    heightDxa: 16838, // 29.7 cm
    fontFamily: 'Times New Roman',
    bodyFontSize: 28,     // 14pt in half-points
    headingFontSize: 32,  // 16pt in half-points
    quoteFontSize: 24,    // 12pt in half-points
    lineSpacing: 360,     // 1.5 spacing (360 twentieths of a pt or 1.5 multiple)
    lineSpacingRule: 'multiple',
    marginTopDxa: 1134,   // 2 cm = 1134 dxa
    marginBottomDxa: 1134,// 2 cm
    marginLeftDxa: 2268,  // 4 cm = 2268 dxa
    marginRightDxa: 2268, // 4 cm
    alignment: 'justify',
    badge: 'SC Default',
    description: 'Mandated by SC circular F.No.01/Judl./2020: A4 paper, Times New Roman 14pt, 1.5 line spacing, 4cm left/right margins.'
  },
  delhi_hc: {
    id: 'delhi_hc',
    name: 'Delhi High Court & District Courts',
    subtitle: 'Practice Direction 01.11.2022 (A4, 14pt, 1.5 Line, 4cm Margins)',
    paper: 'A4',
    widthDxa: 11906,
    heightDxa: 16838,
    fontFamily: 'Times New Roman',
    bodyFontSize: 28,     // 14pt
    headingFontSize: 32,  // 16pt
    quoteFontSize: 24,    // 12pt
    lineSpacing: 360,     // 1.5
    lineSpacingRule: 'multiple',
    marginTopDxa: 1134,   // 2 cm
    marginBottomDxa: 1134,// 2 cm
    marginLeftDxa: 2268,  // 4 cm
    marginRightDxa: 2268, // 4 cm
    alignment: 'justify',
    badge: 'Delhi HC',
    description: 'Delhi High Court Practice Direction (in force from 01.11.2022): A4 paper, Times New Roman 14pt, 1.5 line spacing, 4cm side margins.'
  },
  punjab_haryana_hc: {
    id: 'punjab_haryana_hc',
    name: 'Punjab & Haryana High Court',
    subtitle: 'Rules & Orders Vol V (A4, 14pt, Double Spacing)',
    paper: 'A4',
    widthDxa: 11906,
    heightDxa: 16838,
    fontFamily: 'Times New Roman',
    bodyFontSize: 28,     // 14pt
    headingFontSize: 32,  // 16pt
    quoteFontSize: 24,    // 12pt
    lineSpacing: 480,     // 2.0 Double spacing
    lineSpacingRule: 'multiple',
    marginTopDxa: 1800,   // 1.25 inch = 1800 dxa
    marginBottomDxa: 1080,// 0.75 inch = 1080 dxa
    marginLeftDxa: 1800,  // 1.25 inch = 1800 dxa
    marginRightDxa: 1800, // 1.25 inch = 1800 dxa
    alignment: 'justify',
    badge: 'P&H HC',
    description: 'P&H High Court Rules & Orders Vol V: Double spacing, 14pt Times New Roman, 1.25" top/left/right margins, 0.75" bottom margin.'
  },
  hp_hc: {
    id: 'hp_hc',
    name: 'Himachal Pradesh High Court',
    subtitle: 'Rules of Procedure (A4, 16pt Body, 18pt Heading)',
    paper: 'A4',
    widthDxa: 11906,
    heightDxa: 16838,
    fontFamily: 'Times New Roman',
    bodyFontSize: 32,     // 16pt
    headingFontSize: 36,  // 18pt
    quoteFontSize: 28,    // 14pt
    lineSpacing: 360,     // 1.5
    lineSpacingRule: 'multiple',
    marginTopDxa: 1134,   // 2 cm
    marginBottomDxa: 1134,// 2 cm
    marginLeftDxa: 2268,  // 4 cm
    marginRightDxa: 2268, // 4 cm
    alignment: 'justify',
    badge: 'HP HC',
    description: 'HP High Court Rules of Procedure (Appendix-II): 16pt body font, 18pt headings, 1.5 line spacing, 4cm side margins.'
  },
  district_court: {
    id: 'district_court',
    name: 'Generic District Court / Tribunal',
    subtitle: 'Standard Indian Court Formatting (A4, 14pt, 1.5 Line)',
    paper: 'A4',
    widthDxa: 11906,
    heightDxa: 16838,
    fontFamily: 'Times New Roman',
    bodyFontSize: 28,     // 14pt
    headingFontSize: 32,  // 16pt
    quoteFontSize: 24,    // 12pt
    lineSpacing: 360,     // 1.5
    lineSpacingRule: 'multiple',
    marginTopDxa: 1440,   // 1 inch = 1440 dxa
    marginBottomDxa: 1440,// 1 inch
    marginLeftDxa: 2160,  // 1.5 inch = 2160 dxa
    marginRightDxa: 1440, // 1 inch
    alignment: 'justify',
    badge: 'District Court',
    description: 'Standard District Court & Tribunal preset: A4 paper, 14pt Times New Roman, 1.5 line spacing, 1.5" left margin for binding.'
  }
};

export const DEFAULT_COURT_PRESET_ID = 'supreme_court';

/**
 * Automatically detects target Indian Court preset based on document text / cause title headers.
 */
export const detectCourtPresetFromText = (text) => {
  if (!text || typeof text !== 'string') return COURT_PRESETS.supreme_court;

  const sample = text.slice(0, 4000).toUpperCase();

  // 1. Supreme Court of India
  if (/SUPREME COURT OF INDIA|IN THE SUPREME COURT|SPECIAL LEAVE PETITION|\bSLP\b|ORDER XV RULE 1/i.test(sample)) {
    return COURT_PRESETS.supreme_court;
  }

  // 2. Delhi High Court & Delhi District Courts
  if (/HIGH COURT OF DELHI|DELHI HIGH COURT|IN THE HIGH COURT OF DELHI|TIS HAZARI|PATIALA HOUSE|KARKARDOOMA|ROHINI COURT|DWARKA COURT|SAKET COURT/i.test(sample)) {
    return COURT_PRESETS.delhi_hc;
  }

  // 3. Punjab & Haryana High Court
  if (/PUNJAB AND HARYANA|PUNJAB & HARYANA|HIGH COURT OF PUNJAB|CHANDIGARH HIGH COURT|HIGH COURT AT CHANDIGARH/i.test(sample)) {
    return COURT_PRESETS.punjab_haryana_hc;
  }

  // 4. Himachal Pradesh High Court
  if (/HIMACHAL PRADESH|HIGH COURT OF HIMACHAL|HIGH COURT AT SHIMLA/i.test(sample)) {
    return COURT_PRESETS.hp_hc;
  }

  // 5. Generic District Court / Tribunal
  if (/DISTRICT & SESSIONS|DISTRICT COURT|NCLT|TRIBUNAL|CONSUMER COMMISSION|FAMILY COURT|BEFORE THE LEARNED/i.test(sample)) {
    return COURT_PRESETS.district_court;
  }

  // Default fallback
  return COURT_PRESETS.supreme_court;
};

export default COURT_PRESETS;
