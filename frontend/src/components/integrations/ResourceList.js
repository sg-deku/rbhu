import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const ResourceList = ({ resources, selectedIds, onChange, loading }) => {
    const toggle = (id) => {
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter((s) => s !== id));
        }
        else {
            onChange([...selectedIds, id]);
        }
    };
    if (loading) {
        return (_jsx("ul", { className: "space-y-2", children: [1, 2, 3, 4, 5].map((i) => (_jsxs("li", { className: "flex items-center gap-3 p-2", children: [_jsx("div", { className: "w-4 h-4 bg-gray-200 rounded animate-pulse flex-shrink-0" }), _jsx("div", { className: "h-4 bg-gray-200 rounded animate-pulse flex-1" })] }, i))) }));
    }
    return (_jsx("ul", { className: "space-y-1", children: resources.map((resource) => (_jsx("li", { children: _jsxs("label", { className: "flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: selectedIds.includes(resource.id), onChange: () => toggle(resource.id), className: "w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" }), _jsx("span", { className: "text-sm text-gray-700", children: resource.name }), _jsx("span", { className: "text-xs text-gray-400 ml-auto", children: resource.type })] }) }, resource.id))) }));
};
export default ResourceList;
