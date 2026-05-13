import { create } from 'zustand';
import { integrationService } from '../services/integration.service';
export const useIntegrationsStore = create((set) => ({
    integrations: [],
    loading: false,
    connectingProvider: null,
    errorMessage: null,
    fetchIntegrations: async () => {
        set({ loading: true });
        try {
            const integrations = await integrationService.getIntegrations();
            set({ integrations, loading: false });
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
}));
