import { create } from 'zustand'
import { IntegrationDTO, Provider, ActivityDTO } from '../types/integrations'
import { integrationService } from '../services/integration.service'

interface IntegrationsStore {
  integrations: IntegrationDTO[]
  loading: boolean
  connectingProvider: Provider | null
  disconnectingProvider: Provider | null
  errorMessage: string | null
  syncingProviders: Set<Provider>
  activities: ActivityDTO[]
  activityPage: number
  activityTotal: number
  activityLoading: boolean
  fetchIntegrations: () => Promise<void>
  connect: (_provider: Provider, _customConfig?: { clientId: string; clientSecret: string }) => Promise<void>
  triggerSync: (_provider: Provider) => Promise<void>
  disconnect: (_provider: Provider) => Promise<void>
  fetchActivity: (_page?: number) => Promise<void>
  updateConfig: (_provider: Provider, _selectedResourceIds: string[]) => Promise<void>
}

export const useIntegrationsStore = create<IntegrationsStore>((set, get) => ({
  integrations: [],
  loading: false,
  connectingProvider: null,
  disconnectingProvider: null,
  errorMessage: null,
  syncingProviders: new Set<Provider>(),
  activities: [],
  activityPage: 1,
  activityTotal: 0,
  activityLoading: false,

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

  connect: async (_provider: Provider, _customConfig?: { clientId: string; clientSecret: string }) => {
    set({ connectingProvider: _provider })
    try {
      const authorizationUrl = await integrationService.initiateConnect(_provider, _customConfig)
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

  disconnect: async (_provider: Provider) => {
    const { integrations } = get()
    set({ disconnectingProvider: _provider })
    set({ integrations: integrations.filter((i) => i.provider !== _provider) })
    try {
      await integrationService.deleteIntegration(_provider)
      set({ disconnectingProvider: null })
    } catch {
      set({ integrations, disconnectingProvider: null, errorMessage: `Failed to disconnect ${_provider}` })
    }
  },

  fetchActivity: async (_page = 1) => {
    set({ activityLoading: true, activityPage: _page })
    try {
      const result = await integrationService.getActivity(_page)
      set({ activities: result.data, activityTotal: result.pagination.total, activityLoading: false })
    } catch {
      set({ activityLoading: false })
    }
  },

  updateConfig: async (_provider: Provider, _selectedResourceIds: string[]) => {
    await integrationService.updateConfig(_provider, _selectedResourceIds)
    const { fetchActivity } = get()
    await fetchActivity(1)
  },
}))
