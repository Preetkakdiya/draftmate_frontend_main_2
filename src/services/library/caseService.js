import { mockCases } from '../../data/mockCases';

const STORAGE_KEY = 'draftmate_cases';

const initializeStorage = () => {
  if (!localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockCases));
  }
};

export const caseService = {
  async getCases() {
    await new Promise(r => setTimeout(r, 100));
    initializeStorage();
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  },

  async getCaseById(id) {
    await new Promise(r => setTimeout(r, 100));
    initializeStorage();
    const cases = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return cases.find(c => c.id === id);
  },

  async createCase(caseData) {
    await new Promise(r => setTimeout(r, 100));
    initializeStorage();
    const cases = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const newCase = {
      ...caseData,
      id: `case-${Date.now()}`
    };
    cases.unshift(newCase);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
    return newCase;
  },

  async updateCase(id, caseData) {
    await new Promise(r => setTimeout(r, 100));
    initializeStorage();
    let cases = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const index = cases.findIndex(c => c.id === id);
    if (index !== -1) {
      cases[index] = { ...cases[index], ...caseData };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
      return cases[index];
    }
    throw new Error('Case not found');
  },

  async deleteCase(id) {
    await new Promise(r => setTimeout(r, 100));
    initializeStorage();
    let cases = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    cases = cases.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
    return true;
  }
};
