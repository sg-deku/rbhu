import { create } from 'zustand';
import { integrationService } from '../services/integration.service';
export const useIntegrationsStore = create((set, get) => ({
    integrations: [],
    loading: false,
    connectingProvider: null,
    disconnectingProvider: null,
    errorMessage: null,
    syncingProviders: new Set(),
    fetchIntegrations: async () => {
        set({ loading: true });
        try {
            const integrations = await integrationService.getIntegrations();
            const { syncingProviders } = get();
            const updatedSyncingProviders = new Set(syncingProviders);
            for (const provider of Array.from(syncingProviders)) {
                const integration = integrations.find((i) => i.provider === provider);
                if (integration && integration.syncStatus !== 'syncing') {
                    updatedSyncingProviders.delete(provider);
                }
            }
            set({ integrations, loading: false, syncingProviders: updatedSyncingProviders });
        }
        catch {
            set({ loading: false });
        }
    },
    connect: async (_provider) => {
        set({ connectingProvider: _provider });
        try {
            const authorizationUrl = await integrationService.initiateConnect(_provider);
            window.location.href = authorizationUrl;
        }
        catch {
            set({ connectingProvider: null, errorMessage: 'Failed to initiate connection' });
        }
    },
    triggerSync: async (_provider) => {
        const { syncingProviders, integrations } = get();
        const updated = new Set(syncingProviders);
        updated.add(_provider);
        const updatedIntegrations = integrations.map((i) => i.provider === _provider ? { ...i, syncStatus: 'syncing' } : i);
        set({ syncingProviders: updated, integrations: updatedIntegrations });
        try {
            await integrationService.triggerSync(_provider);
        }
        catch {
            const afterError = new Set(get().syncingProviders);
            afterError.delete(_provider);
            set({ syncingProviders: afterError, errorMessage: `Failed to sync ${_provider}` });
        }
    },
    disconnect: async (_provider) => {
        const { integrations } = get();
        set({ disconnectingProvider: _provider });
        set({ integrations: integrations.filter((i) => i.provider !== _provider) });
        try {
            await integrationService.deleteIntegration(_provider);
            set({ disconnectingProvider: null });
        }
        catch {
            set({ integrations, disconnectingProvider: null, errorMessage: `Failed to disconnect ${_provider}` });
        }
    },
}));
