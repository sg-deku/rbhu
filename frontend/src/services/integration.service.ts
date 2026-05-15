import { api } from './api'
import { IntegrationDTO, Provider, ActivityDTO, ResourceDTO } from '../types/integrations'

export const integrationService = {
  getIntegrations: async (): Promise<IntegrationDTO[]> => {
    const data = await api.get('/integrations')
    return data.data
  },

  initiateConnect: async (provider: Provider, customConfig?: { clientId: string; clientSecret: string }): Promise<string> => {
    const data = await api.post(`/integrations/${provider}/connect`, customConfig || {})
    return data.data.authorizationUrl
  },

  triggerSync: async (provider: Provider): Promise<{ jobId: string; status: string }> => {
    const data = await api.post(`/integrations/${provider}/sync`, {})
    return data.data
  },

  deleteIntegration: async (provider: Provider): Promise<void> => {
    await api.delete(`/integrations/${provider}`)
  },

  getResources: async (provider: Provider, page = 1, limit = 50): Promise<{ data: ResourceDTO[]; pagination: any }> => {
    const data = await api.get(`/integrations/${provider}/resources?page=${page}&limit=${limit}`)
    if (!data.success) {
      const err: any = new Error(data.message || 'Failed to fetch resources')
      err.code = data.code
      err.status = data.code === 'REAUTH_REQUIRED' ? 401 : 500
      throw err
    }
    return { data: data.data, pagination: data.pagination }
  },

  getConfig: async (provider: Provider): Promise<{ selectedResourceIds: string[] }> => {
    const data = await api.get(`/integrations/${provider}/config`)
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch config')
    }
    return data.data
  },

  updateConfig: async (provider: Provider, selectedResourceIds: string[]): Promise<{ selectedResourceIds: string[] }> => {
    const data = await api.put(`/integrations/${provider}/config`, { selectedResourceIds })
    if (!data.success) {
      throw new Error(data.message || 'Failed to update config')
    }
    return data.data
  },

  getActivity: async (page = 1, limit = 20): Promise<{ data: ActivityDTO[]; pagination: any }> => {
    const data = await api.get(`/integrations/activity?page=${page}&limit=${limit}`)
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch activity')
    }
    return { data: data.data, pagination: data.pagination }
  },
}
