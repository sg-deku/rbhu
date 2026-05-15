import { jsx as _jsx } from "react/jsx-runtime";
import { cn } from '../../lib/utils';
const statusConfig = {
    connected: { label: 'Connected', className: 'bg-green-100 text-green-700' },
    error: { label: 'Error', className: 'bg-red-100 text-red-700' },
    disconnected: { label: 'Not Connected', className: 'bg-gray-100 text-gray-500' },
};
const StatusBadge = ({ status }) => {
    const config = statusConfig[status];
    return (_jsx("span", { className: cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', config.className), children: config.label }));
};
export default StatusBadge;
