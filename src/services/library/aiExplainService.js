// aiExplainService.js
// Future-ready service layer for the AI Explanation system.
// Currently uses mock responses.
// To connect a real AI backend, replace the body of `explainSection()` with
// a fetch() call to Lex Bot, Deep Research Service, OpenAI, Claude or Gemini.

const SAVED_EXPLANATIONS_KEY = 'draftmate_saved_explanations';

// ─── Mock Response Database ────────────────────────────────────────────────
const mockExplanations = {
  // IPC Section 420
  'ipc-420': {
    simpleMeaning: 'Cheating and dishonestly inducing delivery of property.',
    legalApplicability: 'Used in fraud, deception and dishonest inducement cases.',
    punishment: 'Imprisonment and/or fine.',
    judicialInterpretation: 'Courts have held that Section 420 requires both cheating and dishonest inducement. The offence is complete when the victim parts with property based on the fraudulent representation. Reference: Ram Jethmalani v. Union of India (2011).',
    practicalExample: 'Investment scam promising fake returns.',
    keyTakeaways: [
      'Requires both cheating and dishonest inducement.',
      'Property must be delivered as a result of the deception.',
      'Cognizable and non-bailable offence.',
      'Maximum punishment is 7 years imprisonment.',
    ],
  },
  // BNS Section 1
  'bns-1': {
    simpleMeaning: 'This section gives the Act its official name — "Bharatiya Nyaya Sanhita, 2023" — and states from which date the law came into force. It also defines which geographic areas and persons the law covers.',
    legalApplicability: 'Applicable across the entire territory of India, including the State of Jammu & Kashmir. Applies to all Indian citizens and to all persons committing offences within Indian territory.',
    punishment: 'This is a preliminary section and does not itself prescribe any punishment. It merely lays the foundation and jurisdiction for the rest of the Act.',
    judicialInterpretation: 'Courts have consistently held that "commencement" provisions are strictly construed — no liability can arise for acts committed before the Act\'s notified date. Reference: R v. Inhabitants of St Mary, Whitechapel (1848).',
    practicalExample: 'If a person commits an offence on 30th June 2024 (after the BNS came into force), they will be prosecuted under the BNS, not the old Indian Penal Code (IPC 1860).',
    keyTakeaways: [
      'The BNS officially replaced the Indian Penal Code (IPC), 1860.',
      'It came into force on 1st July 2024.',
      'Applies to all of India including Jammu & Kashmir.',
      'Acts committed before the commencement date are still tried under the IPC.',
    ],
  },
  // BNS Section 2
  'bns-2': {
    simpleMeaning: 'This section is the dictionary of the entire Act. It defines key terms used throughout the BNS so that there is no ambiguity in their interpretation.',
    legalApplicability: 'The definitions in this section control the meaning of every term used in the BNS. Courts are bound to use these definitions unless the context otherwise requires.',
    punishment: 'No punishment prescribed. This is a definitional section only.',
    judicialInterpretation: 'Courts apply the principle of "strict construction" for penal statutes. If a definition is ambiguous, the benefit of doubt goes to the accused. See: Heydon\'s Case (1584).',
    practicalExample: 'The term "document" as defined in this section would include a WhatsApp message or a digital PDF, making them valid evidence under the BNS.',
    keyTakeaways: [
      'Definitions section — foundational to the entire Act.',
      '"Document" includes electronic records.',
      '"Person" includes companies and other legal entities.',
      'Definitions apply unless context specifically excludes them.',
    ],
  },
  // Constitution Article 21
  'constitution-21': {
    simpleMeaning: 'Article 21 guarantees that no person can be deprived of their right to life or personal liberty except by a procedure that is established by law. This is one of the most fundamental rights in the Indian Constitution.',
    legalApplicability: 'Available to all persons — both citizens and non-citizens — in India. It covers a wide spectrum of rights beyond just physical survival, including the right to dignity, privacy, livelihood, education, and a speedy trial.',
    punishment: 'This article does not prescribe a punishment. It is a Constitutional right. Violation by the State entitles the victim to seek constitutional remedies under Articles 32 or 226.',
    judicialInterpretation: [
      'Maneka Gandhi v. Union of India (1978): Expanded "procedure established by law" to require the procedure be fair, just, and reasonable.',
      'K.S. Puttaswamy v. Union of India (2017): Right to Privacy declared a fundamental right under Article 21.',
      'Olga Tellis v. Bombay Municipal Corporation (1985): Right to livelihood is part of the right to life.',
    ].join(' '),
    practicalExample: 'If police detain a person without following due process (no FIR, no produced before a magistrate within 24 hours), the detained person can file a Writ of Habeas Corpus under Article 32, invoking Article 21.',
    keyTakeaways: [
      'One of the most expansive rights in Indian jurisprudence.',
      'Applies to all persons, including non-citizens.',
      'Includes right to privacy, dignity, livelihood, and a speedy trial.',
      'The procedure of deprivation must be fair, just, and reasonable (post-Maneka Gandhi).',
      'Can only be restricted by a law — not by executive action alone.',
    ],
  },
  // Contract Act Section 3
  'contract-3': {
    simpleMeaning: 'This section explains how a proposal (offer) is communicated, how acceptance of a proposal is communicated, and how revocation of a proposal or acceptance is done — all in the context of forming a valid contract.',
    legalApplicability: 'Governs the moment a legally binding offer or acceptance comes into existence. This is critical for determining when a contract is formed and its enforceability.',
    punishment: 'No punishment — this is a contract formation section, not a penal provision.',
    judicialInterpretation: 'Postal Rule: In Household Fire Insurance Co. v. Grant (1879), an acceptance sent by post is complete when the letter is posted, not when received — a principle adopted in Indian law.',
    practicalExample: 'If Company A sends an email offer to Company B, and Company B replies "We accept" — the contract is formed at the moment Company B sends the acceptance email, not when Company A reads it.',
    keyTakeaways: [
      'Communication of proposal is complete when the other party receives it.',
      'Communication of acceptance is complete when sent (against the proposer) and when received (against the acceptor).',
      'Either party can revoke before the acceptance is communicated.',
      'The "postal rule" applies to acceptance by post in India.',
    ],
  },
};

// Default/fallback explanation for sections without specific mocks
const generateGenericExplanation = (act, section) => ({
  simpleMeaning: `Section ${section.number} of the ${act.name} (${act.shortName}) titled "${section.title}" deals with foundational provisions of the Act. The section establishes legal norms and obligations that are binding on persons within the jurisdiction of this legislation.`,
  legalApplicability: `This section applies to all persons and entities governed by the ${act.name}. Courts are required to interpret this section in light of the broader objectives of the Act, as well as settled judicial precedents in this area of law.`,
  punishment: `The provision under this section may attract civil or criminal liability depending on the nature of the violation. Specific penalties are prescribed either within this section or cross-referenced to other provisions of the Act.`,
  judicialInterpretation: `Courts have consistently upheld the legislative intent behind such provisions. The Supreme Court and various High Courts have interpreted similar provisions broadly to advance the purpose of the legislation, while strictly construing penal aspects in favour of the accused.`,
  practicalExample: `Consider a scenario where a party fails to comply with the requirements set out in Section ${section.number}. In such cases, the aggrieved party may approach the relevant authority or court for appropriate relief — including damages, injunctions, or criminal prosecution — depending on the category of breach.`,
  keyTakeaways: [
    `Section ${section.number} is a key provision of the ${act.shortName}.`,
    'Both procedural and substantive compliance is required.',
    'Non-compliance may attract civil and/or criminal consequences.',
    'Always read this section in conjunction with adjacent provisions for full context.',
    'Seek qualified legal advice before taking any action based on this section.',
  ],
});

// ─── Service Functions ─────────────────────────────────────────────────────

export const aiExplainService = {
  /**
   * Fetches an AI explanation for a given section.
   * Future: replace body with API call to Lex Bot / OpenAI / Claude / Gemini.
   *
   * @param {object} act - The Act object
   * @param {object} section - The Section object
   * @returns {Promise<object>} - The explanation object
   */
  explainSection: async (act, section) => {
    // Simulate network latency (1.2s – 2.5s for realistic feel)
    const delay = 1200 + Math.random() * 1300;
    await new Promise(r => setTimeout(r, delay));

    const key = `${act.id}-${section.number}`;
    const explanation = mockExplanations[key] || generateGenericExplanation(act, section);

    return {
      ...explanation,
      generatedAt: new Date().toISOString(),
      model: 'DraftMate AI (Mock)',
      actId: act.id,
      actName: act.name,
      sectionNumber: section.number,
      sectionTitle: section.title,
    };
  },

  /**
   * Regenerates explanation (in production: triggers a new API call with different seed/temperature).
   */
  regenerateExplanation: async (act, section) => {
    return aiExplainService.explainSection(act, section);
  },

  /**
   * Saves an explanation locally for offline access.
   */
  saveExplanation: async (explanation) => {
    await new Promise(r => setTimeout(r, 100));
    const saved = JSON.parse(localStorage.getItem(SAVED_EXPLANATIONS_KEY) || '[]');
    const key = `${explanation.actId}-${explanation.sectionNumber}`;
    // Remove old version if exists
    const updated = saved.filter(e => `${e.actId}-${e.sectionNumber}` !== key);
    updated.unshift({ ...explanation, savedAt: new Date().toISOString() });
    localStorage.setItem(SAVED_EXPLANATIONS_KEY, JSON.stringify(updated));
    return true;
  },
};
