import { API_CONFIG } from '../../services/endpoints';

// 5-minute cache
const CACHE_TTL = 5 * 60 * 1000; 
const cache = new Map();

const getCacheKey = (key) => `bareacts:${key}`;

const getCached = (key) => {
  const cached = cache.get(getCacheKey(key));
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
};

const setCached = (key, data) => {
  cache.set(getCacheKey(key), { data, timestamp: Date.now() });
};

const clearCache = () => {
  cache.clear();
};

const fetchBareActsEndpoint = async (endpoint) => {
  const url = `${API_CONFIG.LIBRARY.BASE_URL}${endpoint}`;
  console.log("Fetching:", url);
  const response = await fetch(url);
  console.log("Response status:", response.status);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${endpoint}`);
  }
  const json = await response.json();
  console.log("SEARCH RESPONSE", json); // STEP 1 - Full JSON response
  return json.success ? json.data : null;
};

export const bareActsApi = {
  async getActs() {
    console.log("Calling getActs...");
    const cached = getCached('acts');
    if (cached) return cached;
    const data = await fetchBareActsEndpoint(API_CONFIG.LIBRARY.ENDPOINTS.BARE_ACTS.GET_ACTS);
    console.log("getActs data:", data);
    setCached('acts', data);
    return data;
  },

  async getActById(actId) {
    console.log("Calling getActById with id:", actId);
    const cached = getCached(`act:${actId}`);
    if (cached) return cached;
    const data = await fetchBareActsEndpoint(API_CONFIG.LIBRARY.ENDPOINTS.BARE_ACTS.GET_ACT(actId));
    console.log("getActById data:", data);
    setCached(`act:${actId}`, data);
    return data;
  },

  async getSections(actId, chapterId = null) {
    console.log("Calling getSections...");
    const cached = getCached(`sections:${actId}:${chapterId}`);
    if (cached) return cached;
    let url = API_CONFIG.LIBRARY.ENDPOINTS.BARE_ACTS.GET_SECTIONS(actId);
    if (chapterId) {
      url += `?chapter_id=${chapterId}`;
    }
    const data = await fetchBareActsEndpoint(url);
    setCached(`sections:${actId}:${chapterId}`, data);
    return data;
  },

  async searchActs(query) {
    console.log("Calling searchActs with query:", query);
    const cached = getCached(`search:acts:${query}`);
    if (cached) return cached;
    const url = `${API_CONFIG.LIBRARY.ENDPOINTS.BARE_ACTS.SEARCH_ACTS}?query=${encodeURIComponent(query)}`;
    const data = await fetchBareActsEndpoint(url);
    console.log("NORMALIZED", data); // STEP 2 - Normalized data
    setCached(`search:acts:${query}`, data);
    return data;
  },

  async searchSections(query) {
    const cached = getCached(`search:sections:${query}`);
    if (cached) return cached;
    const url = `${API_CONFIG.LIBRARY.ENDPOINTS.BARE_ACTS.SEARCH_SECTIONS}?query=${encodeURIComponent(query)}`;
    const data = await fetchBareActsEndpoint(url);
    setCached(`search:sections:${query}`, data);
    return data;
  },

  async getCategories() {
    console.log("Calling getCategories...");
    const cached = getCached('categories');
    if (cached) return cached;
    const data = await fetchBareActsEndpoint(API_CONFIG.LIBRARY.ENDPOINTS.BARE_ACTS.GET_CATEGORIES);
    console.log("getCategories data:", data);
    setCached('categories', data);
    return data;
  },

  async clearCache() {
    clearCache();
  }
};
