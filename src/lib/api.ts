const BASE = 'http://localhost:3001/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path: string, options: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Request failed');
  }
  return res.json();
}

export const api = {
  login: (email: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (name: string, email: string, password: string, role: string) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, role }) }),

  getClients: () => request('/clients'),
  addClient: (client: object) => request('/clients', { method: 'POST', body: JSON.stringify(client) }),
  updateClient: (id: string, client: object) => request(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(client) }),

  addDispute: (clientId: string, dispute: object) =>
    request(`/clients/${clientId}/disputes`, { method: 'POST', body: JSON.stringify(dispute) }),
  updateDispute: (id: string, dispute: object) =>
    request(`/disputes/${id}`, { method: 'PUT', body: JSON.stringify(dispute) }),

  addAccount: (clientId: string, account: object) =>
    request(`/clients/${clientId}/accounts`, { method: 'POST', body: JSON.stringify(account) }),

  addNote: (clientId: string, note: object) =>
    request(`/clients/${clientId}/notes`, { method: 'POST', body: JSON.stringify(note) }),

  addLetter: (clientId: string, letter: object) =>
    request(`/clients/${clientId}/letters`, { method: 'POST', body: JSON.stringify(letter) }),

  addScore: (clientId: string, score: object) =>
    request(`/clients/${clientId}/scores`, { method: 'POST', body: JSON.stringify(score) }),

  fetchReport: (clientId: string) =>
    request(`/clients/${clientId}/fetch-report`, { method: 'POST' }),

  getReportDownloadUrl: (clientId: string) =>
    `http://localhost:3001/api/clients/${clientId}/fetch-report/download`,

  getTasks: () => request('/tasks'),
  addTask: (task: object) => request('/tasks', { method: 'POST', body: JSON.stringify(task) }),
  updateTask: (id: string, task: object) => request(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(task) }),
};
