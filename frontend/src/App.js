import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import IntegrationsPage from './pages/settings/IntegrationsPage';
import './styles/index.css';
const ProtectedRoute = ({ children }) => {
    const { token, loading } = useAuth();
    if (loading)
        return null;
    if (!token)
        return _jsx(Navigate, { to: "/login", replace: true });
    return _jsx(_Fragment, { children: children });
};
function App() {
    return (_jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsx(Route, { path: "/register", element: _jsx(Register, {}) }), _jsx(Route, { path: "/", element: _jsx(ProtectedRoute, { children: _jsx(Home, {}) }) }), _jsx(Route, { path: "/settings/integrations", element: _jsx(ProtectedRoute, { children: _jsx(IntegrationsPage, {}) }) })] }) }));
}
export default App;
