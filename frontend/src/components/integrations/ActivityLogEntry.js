import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatDistanceToNow } from 'date-fns';
const PROVIDER_LABELS = {
    jira: 'Jira',
    slack: 'Slack',
    confluence: 'Confluence',
};
const EVENT_LABELS = {
    sync_success: 'Sync Succeeded',
    sync_failed: 'Sync Failed',
    connected: 'Connected',
    disconnected: 'Disconnected',
    config_updated: 'Configuration Updated',
};
const EVENT_COLORS = {
    sync_success: 'text-green-700',
    sync_failed: 'text-red-700',
    connected: 'text-blue-700',
    disconnected: 'text-gray-600',
    config_updated: 'text-yellow-700',
};
const ActivityLogEntry = ({ activity }) => {
    const label = EVENT_LABELS[activity.eventType] ?? activity.eventType;
    const color = EVENT_COLORS[activity.eventType] ?? 'text-gray-700';
    const providerLabel = PROVIDER_LABELS[activity.provider] ?? activity.provider;
    const relativeTime = formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true });
    return (_jsxs("div", { className: "flex items-start gap-3 py-3 border-b border-gray-100 last:border-0", children: [_jsx("div", { className: "flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600", children: providerLabel.charAt(0) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 mb-0.5", children: [_jsx("span", { className: `text-sm font-medium ${color}`, children: label }), _jsx("span", { className: "text-xs text-gray-400", children: "\u00B7" }), _jsx("span", { className: "text-xs text-gray-500", children: providerLabel }), _jsx("span", { className: "text-xs text-gray-400 ml-auto flex-shrink-0", children: relativeTime })] }), _jsx("p", { className: "text-sm text-gray-600 truncate", children: activity.message }), activity.eventType === 'sync_failed' && activity.detail && (_jsxs("details", { className: "mt-1", children: [_jsx("summary", { className: "text-xs text-red-600 cursor-pointer hover:underline", children: "Show error" }), _jsx("pre", { className: "mt-1 text-xs text-red-700 bg-red-50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-words", children: activity.detail })] }))] })] }));
};
export default ActivityLogEntry;
