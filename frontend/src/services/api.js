const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
const getToken = () => localStorage.getItem('token');
const headers = (auth = false) => ({ 'Content-Type': 'application/json', ...(auth && getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) });
export const api = {
    get: (endpoint, auth = true) => fetch(`${API_URL}${endpoint}`, { headers: headers(auth) }).then(r => r.json()),
    post: (endpoint, body, auth = true) => fetch(`${API_URL}${endpoint}`, { method: 'POST', headers: headers(auth), body: JSON.stringify(body) }).then(r => r.json()),
    put: (endpoint, body, auth = true) => fetch(`${API_URL}${endpoint}`, { method: 'PUT', headers: headers(auth), body: JSON.stringify(body) }).then(r => r.json()),
    delete: (endpoint, auth = true) => fetch(`${API_URL}${endpoint}`, { method: 'DELETE', headers: headers(auth) }).then(r => r.json()),
};
