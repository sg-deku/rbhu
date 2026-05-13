const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const authService = {
    login: async (email, password) => {
        const res = await fetch(`${API_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
        const data = await res.json();
        if (!data.success)
            throw new Error(data.message);
        return data;
    },
    register: async (name, email, password) => {
        const res = await fetch(`${API_URL}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password }) });
        const data = await res.json();
        if (!data.success)
            throw new Error(data.message);
        return data;
    },
    getProfile: async (token) => {
        const res = await fetch(`${API_URL}/auth/profile`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (!data.success)
            throw new Error(data.message);
        return data.user;
    }
};
