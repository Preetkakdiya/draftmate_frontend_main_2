import { mockClients } from '../../data/mockClients';

const STORAGE_KEY = 'draftmate_clients';

const initializeStorage = () => {
  if (!localStorage.getItem(STORAGE_KEY)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockClients));
  }
};

export const clientService = {
  async getClients() {
    await new Promise(r => setTimeout(r, 100));
    initializeStorage();
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  },

  async getClientById(id) {
    await new Promise(r => setTimeout(r, 100));
    initializeStorage();
    const clients = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return clients.find(client => client.id === id);
  },

  async createClient(clientData) {
    await new Promise(r => setTimeout(r, 100));
    initializeStorage();
    const clients = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const newClient = {
      ...clientData,
      id: `client-${Date.now()}`
    };
    clients.unshift(newClient);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
    return newClient;
  },

  async updateClient(id, clientData) {
    await new Promise(r => setTimeout(r, 100));
    initializeStorage();
    let clients = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const index = clients.findIndex(client => client.id === id);
    if (index !== -1) {
      clients[index] = { ...clients[index], ...clientData };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
      return clients[index];
    }
    throw new Error('Client not found');
  },

  async deleteClient(id) {
    await new Promise(r => setTimeout(r, 100));
    initializeStorage();
    let clients = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    clients = clients.filter(client => client.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
    return true;
  }
};
