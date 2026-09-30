const API_BASE_URL = "/api/v1/library/terms";

const handleResponse = async (response, message) => {
  if (!response.ok) {
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }
  return response.json();
};

export const dictionaryService = {
  searchTerms: async (query = "", page = 1, limit = 20) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

   
    if (query && query.trim()) params.set("query", query.trim());

    const response = await fetch(`${API_BASE_URL}?${params.toString()}`);
    return handleResponse(response, "Failed to search terms");
  },

  getTermById: async (termId) => {
    const response = await fetch(`${API_BASE_URL}/${termId}`);
    return handleResponse(response, "Failed to fetch term details");
  },
};