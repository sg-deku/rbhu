import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../../lib/utils';
const syncConfig = {
    idle: { label: 'Idle', className: 'bg-gray-100 text-gray-500', showSpinner: false },
    syncing: { label: 'Syncing', className: 'bg-blue-100 text-blue-700', showSpinner: true },
    success: { label: 'Success', className: 'bg-green-100 text-green-700', showSpinner: false },
    failed: { label: 'Failed', className: 'bg-red-100 text-red-700', showSpinner: false },
};
const SyncStatusIndicator = ({ syncStatus, lastSyncedAt }) => {
    const config = syncConfig[syncStatus];
    return (_jsxs("div", { className: "flex items-center gap-2 mt-2", children: [_jsxs("span", { className: cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium', config.className), children: [config.showSpinner && (_jsx("span", { className: "w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" })), config.label] }), lastSyncedAt && (_jsx("span", { className: "text-xs text-gray-400", children: formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true }) }))] }));
};
export default SyncStatusIndicator;
