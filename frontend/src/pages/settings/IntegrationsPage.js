import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useIntegrationsStore } from '../../stores/useIntegrationsStore';
import IntegrationCard from '../../components/integrations/IntegrationCard';
import ConnectModal from '../../components/integrations/ConnectModal';
import DisconnectDialog from '../../components/integrations/DisconnectDialog';
import Toast from '../../components/ui/Toast';
const PROVIDERS = ['jira', 'slack', 'confluence'];
const IntegrationsPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const { integrations, loading, connectingProvider, disconnectingProvider, syncingProviders, fetchIntegrations, connect, triggerSync, disconnect } = useIntegrationsStore();
    const [connectingModalProvider, setConnectingModalProvider] = useState(null);
    const [disconnectingModalProvider, setDisconnectingModalProvider] = useState(null);
    const [toast, setToast] = useState(null);
    const pollingRef = useRef(null);
    useEffect(() => {
        fetchIntegrations();
    }, []);
    useEffect(() => {
        const connectedParam = searchParams.get('connected');
        const errorParam = searchParams.get('error');
        const reasonParam = searchParams.get('reason');
        if (connectedParam) {
            setToast({ message: `Successfully connected ${connectedParam}`, type: 'success' });
            setSearchParams({}, { replace: true });
        }
        else if (errorParam) {
            const msg = reasonParam
                ? `Failed to connect ${errorParam}: ${reasonParam}`
                : `Failed to connect ${errorParam}`;
            setToast({ message: msg, type: 'error' });
            setSearchParams({}, { replace: true });
        }
    }, []);
    useEffect(() => {
        if (syncingProviders.size > 0) {
            if (!pollingRef.current) {
                pollingRef.current = setInterval(() => {
                    fetchIntegrations();
                }, 10000);
            }
        }
        else {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
        }
        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
        };
    }, [syncingProviders.size]);
    const handleConnect = (provider) => {
        setConnectingModalProvider(provider);
    };
    const handleModalConfirm = async () => {
        if (!connectingModalProvider)
            return;
        setConnectingModalProvider(null);
        await connect(connectingModalProvider);
    };
    const handleModalCancel = () => {
        setConnectingModalProvider(null);
    };
    const handleSyncNow = async (provider) => {
        await triggerSync(provider);
    };
    const handleDisconnect = (provider) => {
        setDisconnectingModalProvider(provider);
    };
    const handleDisconnectConfirm = async () => {
        if (!disconnectingModalProvider)
            return;
        const provider = disconnectingModalProvider;
        setDisconnectingModalProvider(null);
        await disconnect(provider);
        const { errorMessage } = useIntegrationsStore.getState();
        if (errorMessage) {
            setToast({ message: `Failed to disconnect ${provider}. Please try again.`, type: 'error' });
        }
        else {
            setToast({ message: `Disconnected ${provider.charAt(0).toUpperCase() + provider.slice(1)}`, type: 'success' });
        }
    };
    const handleDisconnectCancel = () => {
        setDisconnectingModalProvider(null);
    };
    return (_jsxs("div", { className: "container mx-auto px-4 py-8", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900 mb-6", children: "Integrations" }), loading ? (_jsx("div", { className: "flex justify-center items-center py-12", children: _jsx("div", { className: "w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" }) })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: PROVIDERS.map((provider) => {
                    const integration = integrations.find((i) => i.provider === provider) ?? null;
                    return (_jsx(IntegrationCard, { provider: provider, integration: integration, onConnect: handleConnect, onDisconnect: handleDisconnect, onSyncNow: handleSyncNow, onConfigure: () => { }, connectingProvider: connectingProvider, disconnectingProvider: disconnectingProvider, syncingProviders: syncingProviders }, provider));
                }) })), connectingModalProvider && (_jsx(ConnectModal, { open: true, provider: connectingModalProvider, onConfirm: handleModalConfirm, onCancel: handleModalCancel, loading: connectingProvider === connectingModalProvider })), disconnectingModalProvider && (_jsx(DisconnectDialog, { open: true, provider: disconnectingModalProvider, onConfirm: handleDisconnectConfirm, onCancel: handleDisconnectCancel, loading: disconnectingProvider === disconnectingModalProvider })), toast && (_jsx(Toast, { message: toast.message, type: toast.type, onDismiss: () => setToast(null) }))] }));
};
export default IntegrationsPage;
