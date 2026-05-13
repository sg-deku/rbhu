import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useIntegrationsStore } from '../../stores/useIntegrationsStore';
import IntegrationCard from '../../components/integrations/IntegrationCard';
const PROVIDERS = ['jira', 'slack', 'confluence'];
const IntegrationsPage = () => {
    const [searchParams] = useSearchParams();
    const { integrations, loading, connectingProvider, fetchIntegrations, connect } = useIntegrationsStore();
    useEffect(() => {
        fetchIntegrations();
    }, []);
    const connectedParam = searchParams.get('connected');
    const errorParam = searchParams.get('error');
    const reasonParam = searchParams.get('reason');
    return (_jsxs("div", { className: "container mx-auto px-4 py-8", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900 mb-6", children: "Integrations" }), connectedParam && (_jsxs("div", { className: "mb-4 p-4 bg-green-50 border border-green-200 rounded text-green-700 text-sm", children: ["Successfully connected ", connectedParam] })), errorParam && (_jsxs("div", { className: "mb-4 p-4 bg-red-50 border border-red-200 rounded text-red-700 text-sm", children: ["Failed to connect ", errorParam, reasonParam ? `: ${reasonParam}` : ''] })), loading ? (_jsx("div", { className: "flex justify-center items-center py-12", children: _jsx("div", { className: "w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" }) })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: PROVIDERS.map((provider) => {
                    const integration = integrations.find((i) => i.provider === provider) ?? null;
                    return (_jsx(IntegrationCard, { provider: provider, integration: integration, onConnect: connect, onDisconnect: () => { }, onSyncNow: () => { }, onConfigure: () => { }, connectingProvider: connectingProvider }, provider));
                }) }))] }));
};
export default IntegrationsPage;
