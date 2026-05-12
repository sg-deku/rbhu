const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const getToken = () => localStorage.getItem('token')
const headers = (auth = false) => ({ 'Content-Type': 'application/json', ...(auth && getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) })

export const api = {
  get: (endpoint: string, auth = true) => fetch(`${API_URL}${endpoint}`, { headers: headers(auth) }).then(r => r.json()),
  post: (endpoint: string, body: any, auth = true) => fetch(`${API_URL}${endpoint}`, { method: 'POST', headers: headers(auth), body: JSON.stringify(body) }).then(r => r.json()),
  put: (endpoint: string, body: any, auth = true) => fetch(`${API_URL}${endpoint}`, { method: 'PUT', headers: headers(auth), body: JSON.stringify(body) }).then(r => r.json()),
  delete: (endpoint: string, auth = true) => fetch(`${API_URL}${endpoint}`, { method: 'DELETE', headers: headers(auth) }).then(r => r.json()),
  search: {
    getSuggestions: (q: string) => fetch(`${API_URL}/search/suggestions?q=${encodeURIComponent(q)}`, { headers: headers(false) }).then(r => r.json()),
    query: (query: string) => api.post('/search/query', { query }, false),
  }
}
