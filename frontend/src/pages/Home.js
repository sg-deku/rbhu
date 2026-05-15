import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
const Home = () => (_jsxs("div", { className: "container mx-auto px-4 py-8", children: [_jsx("h1", { className: "text-3xl font-bold", children: "Welcome to rbhu \uD83D\uDE80" }), _jsx("p", { className: "text-gray-600 mt-2 mb-6", children: "Your project is ready! Start building something amazing." }), _jsx(Link, { to: "/settings/integrations", className: "bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors", children: "Manage Integrations" })] }));
export default Home;
