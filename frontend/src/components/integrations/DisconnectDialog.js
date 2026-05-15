import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as Dialog from '@radix-ui/react-dialog';
const PROVIDER_NAMES = {
    slack: 'Slack',
    jira: 'Jira',
    confluence: 'Confluence',
};
const DisconnectDialog = ({ open, provider, onConfirm, onCancel, loading }) => {
    const name = PROVIDER_NAMES[provider];
    return (_jsx(Dialog.Root, { open: open, onOpenChange: (isOpen) => { if (!isOpen)
            onCancel(); }, children: _jsxs(Dialog.Portal, { children: [_jsx(Dialog.Overlay, { className: "fixed inset-0 bg-black/40 z-40" }), _jsxs(Dialog.Content, { className: "fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6", children: [_jsxs(Dialog.Title, { className: "text-lg font-semibold text-gray-900 mb-2", children: ["Disconnect ", name] }), _jsxs(Dialog.Description, { className: "text-sm text-gray-600 mb-6", children: ["This will remove all stored tokens and sync history for ", name, ". This action cannot be undone."] }), _jsxs("div", { className: "flex justify-end gap-3", children: [_jsx("button", { onClick: onCancel, disabled: loading, className: "px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50", children: "Cancel" }), _jsxs("button", { onClick: onConfirm, disabled: loading, className: "flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50", children: [loading && (_jsx("span", { className: "w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" })), "Disconnect"] })] })] })] }) }));
};
export default DisconnectDialog;
