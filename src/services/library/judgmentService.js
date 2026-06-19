// judgmentService.js
// localStorage-based service — swap body with Library_Service API calls when ready.

const SAVED_JUDGMENTS_KEY = 'draftmate_saved_judgments';

export const judgmentService = {
  getSavedJudgments: async () => {
    await new Promise(r => setTimeout(r, 100));
    return JSON.parse(localStorage.getItem(SAVED_JUDGMENTS_KEY) || '[]');
  },

  saveJudgment: async (judgment) => {
    await new Promise(r => setTimeout(r, 100));
    const saved = await judgmentService.getSavedJudgments();
    const exists = saved.find(j => j.id === judgment.id);
    if (!exists) {
      saved.unshift({ ...judgment, savedAt: new Date().toISOString() });
      localStorage.setItem(SAVED_JUDGMENTS_KEY, JSON.stringify(saved));
    }
    return true;
  },

  removeJudgment: async (judgmentId) => {
    await new Promise(r => setTimeout(r, 100));
    let saved = await judgmentService.getSavedJudgments();
    saved = saved.filter(j => j.id !== judgmentId);
    localStorage.setItem(SAVED_JUDGMENTS_KEY, JSON.stringify(saved));
    return true;
  },

  isSaved: async (judgmentId) => {
    const saved = await judgmentService.getSavedJudgments();
    return !!saved.find(j => j.id === judgmentId);
  },
};
