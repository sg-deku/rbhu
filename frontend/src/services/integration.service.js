import { api } from './api';
export const integrationService = {
    getIntegrations: async () => {
        const data = await api.get('/integrations');
        return data.data;
    },
    initiateConnect: async (provider, customConfig) => {
        const data = await api.post(`/integrations/${provider}/connect`, customConfig || {});
        return data.data.authorizationUrl;
    },
    triggerSync: async (provider) => {
        const data = await api.post(`/integrations/${provider}/sync`, {});
        return data.data;
    },
    deleteIntegration: async (provider) => {
        await api.delete(`/integrations/${provider}`);
    },
    getResources: async (provider, page = 1, limit = 50) => {
        const data = await api.get(`/integrations/${provider}/resources?page=${page}&limit=${limit}`);
        if (!data.success) {
            const err = new Error(data.message || 'Failed to fetch resources');
            err.code = data.code;
            err.status = data.code === 'REAUTH_REQUIRED' ? 401 : 500;
            throw err;
        }
        return { data: data.data, pagination: data.pagination };
    },
    getConfig: async (provider) => {
        const data = await api.get(`/integrations/${provider}/config`);
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch config');
        }
        return data.data;
    },
    updateConfig: async (provider, selectedResourceIds) => {
        const data = await api.put(`/integrations/${provider}/config`, { selectedResourceIds });
        if (!data.success) {
            throw new Error(data.message || 'Failed to update config');
        }
        return data.data;
    },
    getActivity: async (page = 1, limit = 20) => {
        const data = await api.get(`/integrations/activity?page=${page}&limit=${limit}`);
        if (!data.success) {
            throw new Error(data.message || 'Failed to fetch activity');
        }
        return { data: data.data, pagination: data.pagination };
    },
};
