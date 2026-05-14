import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { integrationService } from '../../services/integration.service';
import ResourceList from './ResourceList';
const PROVIDER_NAMES = {
    slack: 'Slack',
    jira: 'Jira',
    confluence: 'Confluence',
};
const ConfigureDrawer = ({ open, provider, onClose, onSave, onReconnect }) => {
    const [resources, setResources] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [reauthRequired, setReauthRequired] = useState(false);
    const [error, setError] = useState(null);
    const name = PROVIDER_NAMES[provider];
    useEffect(() => {
        if (!open)
            return;
        setReauthRequired(false);
        setError(null);
        setResources([]);
        setSelectedIds([]);
        setLoading(true);
        Promise.all([
            integrationService.getResources(provider),
            integrationService.getConfig(provider),
        ])
            .then(([resourcesResult, configResult]) => {
            setResources(resourcesResult.data);
            setSelectedIds(configResult.selectedResourceIds);
        })
            .catch((err) => {
            if (err?.code === 'REAUTH_REQUIRED' || err?.status === 401) {
                setReauthRequired(true);
            }
            else {
                setError(err?.message || 'Failed to load resources');
            }
        })
            .finally(() => setLoading(false));
    }, [open, provider]);
    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(selectedIds);
            onClose();
        }
        catch (err) {
            setError(err?.message || 'Failed to save configuration');
        }
        finally {
            setSaving(false);
        }
    };
    return (_jsx(Dialog.Root, { open: open, onOpenChange: (isOpen) => { if (!isOpen)
            onClose(); }, children: _jsxs(Dialog.Portal, { children: [_jsx(Dialog.Overlay, { className: "fixed inset-0 bg-black/40 z-40" }), _jsxs(Dialog.Content, { className: "fixed right-0 top-0 h-full w-full max-w-md z-50 bg-white shadow-xl flex flex-col", children: [_jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b border-gray-200", children: [_jsxs(Dialog.Title, { className: "text-lg font-semibold text-gray-900", children: ["Configure ", name] }), _jsx("button", { onClick: onClose, className: "p-1 text-gray-400 hover:text-gray-600 rounded", "aria-label": "Close", children: _jsx("svg", { className: "w-5 h-5", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M6 18L18 6M6 6l12 12" }) }) })] }), _jsx("div", { className: "flex-1 overflow-y-auto px-6 py-4", children: reauthRequired ? (_jsxs("div", { className: "text-center py-8", children: [_jsx("p", { className: "text-sm text-gray-600 mb-4", children: "Your access token has expired. Please reconnect." }), _jsx("button", { onClick: () => { onClose(); onReconnect?.(); }, className: "px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700", children: "Re-connect" })] })) : error ? (_jsx("p", { className: "text-sm text-red-600 py-4", children: error })) : (_jsxs(_Fragment, { children: [_jsxs(Dialog.Description, { className: "text-sm text-gray-500 mb-4", children: ["Select the ", name, " resources to include in sync."] }), _jsx(ResourceList, { resources: resources, selectedIds: selectedIds, onChange: setSelectedIds, loading: loading })] })) }), !reauthRequired && (_jsxs("div", { className: "px-6 py-4 border-t border-gray-200 flex justify-end gap-3", children: [_jsx("button", { onClick: onClose, disabled: saving, className: "px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50", children: "Cancel" }), _jsxs("button", { onClick: handleSave, disabled: saving || loading, className: "flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50", children: [saving && (_jsx("span", { className: "w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" })), "Save"] })] }))] })] }) }));
};
export default ConfigureDrawer;
