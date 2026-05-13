import { create } from 'zustand'
import { IntegrationDTO, Provider } from '../types/integrations'
import { integrationService } from '../services/integration.service'

interface IntegrationsStore {
  integrations: IntegrationDTO[]
  loading: boolean
  connectingProvider: Provider | null
  errorMessage: string | null
  fetchIntegrations: () => Promise<void>
  connect: (_provider: Provider) => Promise<void>
}

export const useIntegrationsStore = create<IntegrationsStore>((set) => ({
  integrations: [],
  loading: false,
  connectingProvider: null,
  errorMessage: null,

  fetchIntegrations: async () => {
    set({ loading: true })
    try {
      const integrations = await integrationService.getIntegrations()
      set({ integrations, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  connect: async (_provider: Provider) => {
    set({ connectingProvider: _provider })
    try {
      const authorizationUrl = await integrationService.initiateConnect(_provider)
      window.location.href = authorizationUrl
    } catch {
      set({ connectingProvider: null, errorMessage: 'Failed to initiate connection' })
    }
  },
}))
