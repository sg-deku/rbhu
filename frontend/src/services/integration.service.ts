import { api } from './api'
import { IntegrationDTO, Provider } from '../types/integrations'

export const integrationService = {
  getIntegrations: async (): Promise<IntegrationDTO[]> => {
    const data = await api.get('/integrations')
    return data.data
  },

  initiateConnect: async (provider: Provider): Promise<string> => {
    const data = await api.post(`/integrations/${provider}/connect`, {})
    return data.data.authorizationUrl
  },

  triggerSync: async (provider: Provider): Promise<{ jobId: string; status: string }> => {
    const data = await api.post(`/integrations/${provider}/sync`, {})
    return data.data
  },

  deleteIntegration: async (provider: Provider): Promise<void> => {
    await api.delete(`/integrations/${provider}`)
  },

  getResources: async (_provider: Provider): Promise<any[]> => {
    return Promise.resolve([])
  },

  getConfig: async (_provider: Provider): Promise<any> => {
    return Promise.resolve(null)
  },

  updateConfig: async (_provider: Provider, _config: any): Promise<void> => {
    return Promise.resolve()
  },

  listActivity: async (): Promise<any[]> => {
    return Promise.resolve([])
  },
}
