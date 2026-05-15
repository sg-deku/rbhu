import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
const PROVIDER_SCOPES = {
    slack: ['channels:read', 'groups:read', 'users:read'],
    jira: ['read:jira-work', 'read:jira-user', 'offline_access'],
    confluence: ['read:confluence-space.summary', 'read:confluence-content.all', 'offline_access'],
};
const PROVIDER_NAMES = {
    slack: 'Slack',
    jira: 'Jira',
    confluence: 'Confluence',
};
const ConnectModal = ({ open, provider, onConfirm, onCancel, loading }) => {
    const [clientId, setClientId] = React.useState('');
    const [clientSecret, setClientSecret] = React.useState('');
    const scopes = PROVIDER_SCOPES[provider];
    const name = PROVIDER_NAMES[provider];
    const handleSubmit = (e) => {
        e.preventDefault();
        if (clientId && clientSecret) {
            onConfirm({ clientId, clientSecret });
        }
        else {
            onConfirm();
        }
    };
    return (_jsx(Dialog.Root, { open: open, onOpenChange: (isOpen) => { if (!isOpen)
            onCancel(); }, children: _jsxs(Dialog.Portal, { children: [_jsx(Dialog.Overlay, { className: "fixed inset-0 bg-black/40 z-40" }), _jsxs(Dialog.Content, { className: "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6", children: [_jsxs(Dialog.Title, { className: "text-lg font-semibold text-gray-900 mb-2", children: ["Connect to ", name] }), _jsx(Dialog.Description, { className: "text-sm text-gray-500 mb-4", children: "Enter your OAuth credentials and requested permissions." }), _jsxs("form", { onSubmit: handleSubmit, children: [_jsxs("div", { className: "space-y-4 mb-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Client ID (Optional if pre-configured)" }), _jsx("input", { type: "text", value: clientId, onChange: (e) => setClientId(e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm", placeholder: "Enter Client ID" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Client Secret (Optional if pre-configured)" }), _jsx("input", { type: "password", value: clientSecret, onChange: (e) => setClientSecret(e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm", placeholder: "Enter Client Secret" })] })] }), _jsx("p", { className: "text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2", children: "Required Permissions" }), _jsx("ul", { className: "mb-6 space-y-1", children: scopes.map((scope) => (_jsxs("li", { className: "flex items-center gap-2 text-sm text-gray-700", children: [_jsx("span", { className: "w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" }), scope] }, scope))) }), _jsxs("div", { className: "flex justify-end gap-3", children: [_jsx("button", { type: "button", onClick: onCancel, disabled: loading, className: "px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50", children: "Cancel" }), _jsxs("button", { type: "submit", disabled: loading, className: "flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50", children: [loading && (_jsx("span", { className: "w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" })), "Connect"] })] })] })] })] }) }));
};
export default ConnectModal;
