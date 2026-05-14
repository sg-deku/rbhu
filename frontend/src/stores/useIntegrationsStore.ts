import { create } from 'zustand'
import { IntegrationDTO, Provider } from '../types/integrations'
import { integrationService } from '../services/integration.service'

interface IntegrationsStore {
  integrations: IntegrationDTO[]
  loading: boolean
  connectingProvider: Provider | null
  errorMessage: string | null
  syncingProviders: Set<Provider>
  fetchIntegrations: () => Promise<void>
  connect: (_provider: Provider) => Promise<void>
  triggerSync: (_provider: Provider) => Promise<void>
}

export const useIntegrationsStore = create<IntegrationsStore>((set, get) => ({
  integrations: [],
  loading: false,
  connectingProvider: null,
  errorMessage: null,
  syncingProviders: new Set<Provider>(),

  fetchIntegrations: async () => {
    set({ loading: true })
    try {
      const integrations = await integrationService.getIntegrations()
      const { syncingProviders } = get()
      const updatedSyncingProviders = new Set(syncingProviders)
      for (const provider of Array.from(syncingProviders)) {
        const integration = integrations.find((i) => i.provider === provider)
        if (integration && integration.syncStatus !== 'syncing') {
          updatedSyncingProviders.delete(provider)
        }
      }
      set({ integrations, loading: false, syncingProviders: updatedSyncingProviders })
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

  triggerSync: async (_provider: Provider) => {
    const { syncingProviders, integrations } = get()
    const updated = new Set(syncingProviders)
    updated.add(_provider)
    const updatedIntegrations = integrations.map((i) =>
      i.provider === _provider ? { ...i, syncStatus: 'syncing' as const } : i
    )
    set({ syncingProviders: updated, integrations: updatedIntegrations })
    try {
      await integrationService.triggerSync(_provider)
    } catch {
      const afterError = new Set(get().syncingProviders)
      afterError.delete(_provider)
      set({ syncingProviders: afterError, errorMessage: `Failed to sync ${_provider}` })
    }
  },
}))
