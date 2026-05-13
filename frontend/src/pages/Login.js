import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login, loading } = useAuth();
    const handleSubmit = async (e) => {
        e.preventDefault();
        await login(email, password);
    };
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gray-50", children: _jsxs("div", { className: "max-w-md w-full bg-white p-8 rounded-lg shadow", children: [_jsx("h2", { className: "text-2xl font-bold mb-6", children: "Login" }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsx("input", { type: "email", value: email, onChange: e => setEmail(e.target.value), placeholder: "Email", className: "w-full border p-2 rounded mb-4", required: true }), _jsx("input", { type: "password", value: password, onChange: e => setPassword(e.target.value), placeholder: "Password", className: "w-full border p-2 rounded mb-4", required: true }), _jsx("button", { type: "submit", disabled: loading, className: "w-full bg-blue-600 text-white py-2 rounded", children: loading ? 'Logging in...' : 'Login' })] })] }) }));
};
export default Login;
