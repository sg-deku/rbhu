import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/auth.service';
const AuthContext = createContext(undefined);
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        if (token)
            authService.getProfile(token).then(setUser).catch(() => { setToken(null); localStorage.removeItem('token'); });
    }, [token]);
    const login = async (email, password) => {
        setLoading(true);
        try {
            const data = await authService.login(email, password);
            setToken(data.token);
            setUser(data.user);
            localStorage.setItem('token', data.token);
        }
        finally {
            setLoading(false);
        }
    };
    const register = async (name, email, password) => {
        setLoading(true);
        try {
            const data = await authService.register(name, email, password);
            setToken(data.token);
            setUser(data.user);
            localStorage.setItem('token', data.token);
        }
        finally {
            setLoading(false);
        }
    };
    const logout = () => { setToken(null); setUser(null); localStorage.removeItem('token'); };
    return _jsx(AuthContext.Provider, { value: { user, token, loading, login, register, logout }, children: children });
};
export const useAuth = () => { const ctx = useContext(AuthContext); if (!ctx)
    throw new Error('useAuth must be used within AuthProvider'); return ctx; };
