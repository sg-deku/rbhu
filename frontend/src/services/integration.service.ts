import { api } from './api'
import { IntegrationDTO, Provider } from '../types/integrations'

export const integrationService = {
  getIntegrations: async (): Promise<IntegrationDTO[]> => {
    const data = await api.get('/integrations')
    return data.data
  },

  initiateConnect: async (_provider: Provider): Promise<string> => {
    return Promise.resolve('')
  },

  triggerSync: async (_provider: Provider): Promise<{ jobId: string; status: string }> => {
    return Promise.resolve({ jobId: '', status: '' })
  },

  deleteIntegration: async (_provider: Provider): Promise<void> => {
    return Promise.resolve()
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
