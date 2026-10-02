import { mockTrackingCases } from '../../data/mockTrackingCases';

const STORAGE_KEY = 'draftmate_tracked_cases';

const initializeStorage = () => {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (!existing) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  } else {
    try {
      const parsed = JSON.parse(existing);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.filter(c => c.id !== 'tracking-1' && c.id !== 'tracking-2' && !c.caseTitle?.includes('Ramesh Sharma') && !c.caseTitle?.includes('Priya Enterprises'));
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
        }
      }
    } catch (e) {
      console.warn('[trackingService] Storage init notice:', e);
    }
  }
};

export const trackingService = {
  async getTrackedCases() {
    await new Promise(r => setTimeout(r, 100));
    initializeStorage();
    const explicitTracked = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const libraryCases = JSON.parse(localStorage.getItem('draftmate_cases') || '[]');

    const libraryTrackedMapped = libraryCases
      .filter(c => 
        c.caseNumber !== 'GEN-0001' && 
        c.caseTitle !== 'General Documents' && 
        c.caseType !== 'Folder' &&
        !c.caseNumber?.startsWith('DIR-') &&
        !c.caseNumber?.startsWith('FLD-')
      )
      .map(c => ({
        id: c.id || `tracking-${c.caseNumber}`,
        cnrNumber: c.cnrNumber || c.caseNumber || 'N/A',
        caseNumber: c.caseNumber,
        caseTitle: c.caseTitle,
        courtEstablishment: c.court || 'Court Establishment',
        caseStage: c.status || 'Pending',
        lastUpdated: c.filingDate || new Date().toISOString().split('T')[0],
        nextHearingDate: c.nextHearingDate || '',
        nextHearingTime: '10:30 AM',
        latestOrder: c.description || 'Case active in Legal Library.',
        latestProceeding: `Next hearing scheduled for ${c.nextHearingDate || 'TBD'}`,
        isLibraryCase: true
      }));

    const existingNumSet = new Set(explicitTracked.map(e => String(e.caseNumber || e.cnrNumber).toLowerCase().trim()));
    const combined = [...explicitTracked];

    for (const libItem of libraryTrackedMapped) {
      const numKey = String(libItem.caseNumber || libItem.cnrNumber).toLowerCase().trim();
      if (numKey && !existingNumSet.has(numKey)) {
        combined.push(libItem);
      }
    }

    return combined;
  },

  async getTrackedCaseById(id) {
    await new Promise(r => setTimeout(r, 100));
    const cases = await this.getTrackedCases();
    return cases.find(c => String(c.id) === String(id));
  },

  async createTrackedCase(caseData) {
    await new Promise(r => setTimeout(r, 100));
    initializeStorage();
    const cases = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const newCase = {
      ...caseData,
      id: `tracking-${Date.now()}`
    };
    cases.unshift(newCase);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
    window.dispatchEvent(new Event('tracked_cases_updated'));
    window.dispatchEvent(new Event('cases_updated'));
    return newCase;
  },

  async updateTrackedCase(id, caseData) {
    await new Promise(r => setTimeout(r, 100));
    initializeStorage();
    let cases = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const index = cases.findIndex(c => String(c.id) === String(id));
    if (index !== -1) {
      cases[index] = { ...cases[index], ...caseData };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
      window.dispatchEvent(new Event('tracked_cases_updated'));
      window.dispatchEvent(new Event('cases_updated'));
      return cases[index];
    }
    throw new Error('Tracked case not found');
  },

  async deleteTrackedCase(id) {
    await new Promise(r => setTimeout(r, 100));
    initializeStorage();
    let cases = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    cases = cases.filter(c => String(c.id) !== String(id));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
    window.dispatchEvent(new Event('tracked_cases_updated'));
    window.dispatchEvent(new Event('cases_updated'));
    return true;
  }
};
