import { api } from './api';
export const integrationService = {
    getIntegrations: async () => {
        const data = await api.get('/integrations');
        return data.data;
    },
    initiateConnect: async (provider) => {
        const data = await api.post(`/integrations/${provider}/connect`, {});
        return data.data.authorizationUrl;
    },
    triggerSync: async (provider) => {
        const data = await api.post(`/integrations/${provider}/sync`, {});
        return data.data;
    },
    deleteIntegration: async (_provider) => {
        return Promise.resolve();
    },
    getResources: async (_provider) => {
        return Promise.resolve([]);
    },
    getConfig: async (_provider) => {
        return Promise.resolve(null);
    },
    updateConfig: async (_provider, _config) => {
        return Promise.resolve();
    },
    listActivity: async () => {
        return Promise.resolve([]);
    },
};
