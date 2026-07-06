import { mockDiaryEntries } from '../../data/mockDiary';

const STORAGE_KEY = 'draftmate_diary_entries';

// Initialize localStorage with mock data if empty
const initializeStorage = () => {
  if (!localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockDiaryEntries));
  }
};

export const diaryService = {
  async getEntries() {
    await new Promise(r => setTimeout(r, 100));
    initializeStorage();
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  },

  async getEntryById(id) {
    await new Promise(r => setTimeout(r, 100));
    initializeStorage();
    const entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return entries.find(entry => entry.id === id);
  },

  async createEntry(entryData) {
    await new Promise(r => setTimeout(r, 100));
    initializeStorage();
    const entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const newEntry = {
      ...entryData,
      id: Date.now().toString(),
      hearingHistory: [],
    };
    entries.unshift(newEntry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    return newEntry;
  },

  async updateEntry(id, entryData) {
    await new Promise(r => setTimeout(r, 100));
    initializeStorage();
    const entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const index = entries.findIndex(entry => entry.id === id);
    if (index !== -1) {
      entries[index] = { ...entries[index], ...entryData };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      return entries[index];
    }
    throw new Error('Entry not found');
  },

  async deleteEntry(id) {
    await new Promise(r => setTimeout(r, 100));
    initializeStorage();
    const entries = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const filteredEntries = entries.filter(entry => entry.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredEntries));
    return true;
  },
};
