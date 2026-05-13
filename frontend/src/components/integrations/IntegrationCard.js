import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import StatusBadge from './StatusBadge';
const PROVIDER_INFO = {
    jira: {
        name: 'Jira',
        description: 'Connect Jira to sync your projects and issues.',
    },
    slack: {
        name: 'Slack',
        description: 'Connect Slack to sync your channels and messages.',
    },
    confluence: {
        name: 'Confluence',
        description: 'Connect Confluence to sync your spaces and pages.',
    },
};
const IntegrationCard = ({ provider, integration, onConnect, onDisconnect, onSyncNow, onConfigure, connectingProvider, }) => {
    const info = PROVIDER_INFO[provider];
    const isConnected = integration?.status === 'connected';
    const isConnecting = connectingProvider === provider;
    return (_jsxs("div", { className: "bg-white rounded-lg shadow border border-gray-200 p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-900", children: info.name }), _jsx(StatusBadge, { status: integration?.status ?? 'disconnected' })] }), _jsx("p", { className: "text-sm text-gray-500 mb-4", children: info.description }), isConnected && (integration?.accountName || integration?.accountEmail) && (_jsx("p", { className: "text-sm text-gray-700 mb-4", children: integration.accountName || integration.accountEmail })), _jsx("div", { className: "flex flex-wrap gap-2", children: !isConnected ? (_jsx("button", { onClick: () => onConnect(provider), disabled: isConnecting, className: "px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50", children: isConnecting ? 'Connecting...' : 'Connect' })) : (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => onSyncNow(provider), className: "px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700", children: "Sync Now" }), _jsx("button", { onClick: () => onConfigure(provider), className: "px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200", children: "Configure" }), _jsx("button", { onClick: () => onDisconnect(provider), className: "px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded hover:bg-red-200", children: "Disconnect" })] })) })] }));
};
export default IntegrationCard;
