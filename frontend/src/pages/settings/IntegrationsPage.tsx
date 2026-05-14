import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useIntegrationsStore } from '../../stores/useIntegrationsStore'
import IntegrationCard from '../../components/integrations/IntegrationCard'
import ConnectModal from '../../components/integrations/ConnectModal'
import DisconnectDialog from '../../components/integrations/DisconnectDialog'
import ConfigureDrawer from '../../components/integrations/ConfigureDrawer'
import ActivityLog from '../../components/integrations/ActivityLog'
import Toast from '../../components/ui/Toast'
import { Provider } from '../../types/integrations'

const PROVIDERS: Provider[] = ['jira', 'slack', 'confluence']

interface ToastState {
  message: string
  type: 'success' | 'error'
}

const IntegrationsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { integrations, loading, connectingProvider, disconnectingProvider, syncingProviders, fetchIntegrations, connect, triggerSync, disconnect, activities, activityPage, activityTotal, activityLoading, fetchActivity, updateConfig } = useIntegrationsStore()
  const [connectingModalProvider, setConnectingModalProvider] = useState<Provider | null>(null)
  const [disconnectingModalProvider, setDisconnectingModalProvider] = useState<Provider | null>(null)
  const [configuringProvider, setConfiguringProvider] = useState<Provider | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetchIntegrations()
    fetchActivity(1)
  }, [])

  useEffect(() => {
    const connectedParam = searchParams.get('connected')
    const errorParam = searchParams.get('error')
    const reasonParam = searchParams.get('reason')

    if (connectedParam) {
      setToast({ message: `Successfully connected ${connectedParam}`, type: 'success' })
      setSearchParams({}, { replace: true })
    } else if (errorParam) {
      const msg = reasonParam
        ? `Failed to connect ${errorParam}: ${reasonParam}`
        : `Failed to connect ${errorParam}`
      setToast({ message: msg, type: 'error' })
      setSearchParams({}, { replace: true })
    }
  }, [])

  useEffect(() => {
    if (syncingProviders.size > 0) {
      if (!pollingRef.current) {
        pollingRef.current = setInterval(() => {
          fetchIntegrations()
        }, 10_000)
      }
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [syncingProviders.size])

  const handleConnect = (provider: Provider) => {
    setConnectingModalProvider(provider)
  }

  const handleModalConfirm = async () => {
    if (!connectingModalProvider) return
    setConnectingModalProvider(null)
    await connect(connectingModalProvider)
  }

  const handleModalCancel = () => {
    setConnectingModalProvider(null)
  }

  const handleSyncNow = async (provider: Provider) => {
    await triggerSync(provider)
  }

  const handleDisconnect = (provider: Provider) => {
    setDisconnectingModalProvider(provider)
  }

  const handleDisconnectConfirm = async () => {
    if (!disconnectingModalProvider) return
    const provider = disconnectingModalProvider
    setDisconnectingModalProvider(null)
    await disconnect(provider)
    const { errorMessage } = useIntegrationsStore.getState()
    if (errorMessage) {
      setToast({ message: `Failed to disconnect ${provider}. Please try again.`, type: 'error' })
    } else {
      setToast({ message: `Disconnected ${provider.charAt(0).toUpperCase() + provider.slice(1)}`, type: 'success' })
    }
  }

  const handleDisconnectCancel = () => {
    setDisconnectingModalProvider(null)
  }

  const handleConfigure = (provider: Provider) => {
    setConfiguringProvider(provider)
  }

  const handleConfigureSave = async (selectedIds: string[]) => {
    if (!configuringProvider) return
    await updateConfig(configuringProvider, selectedIds)
    setToast({ message: `Configuration saved for ${configuringProvider}`, type: 'success' })
  }

  const handleConfigureClose = () => {
    setConfiguringProvider(null)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Integrations</h1>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PROVIDERS.map((provider) => {
            const integration = integrations.find((i) => i.provider === provider) ?? null
            return (
              <IntegrationCard
                key={provider}
                provider={provider}
                integration={integration}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onSyncNow={handleSyncNow}
                onConfigure={handleConfigure}
                connectingProvider={connectingProvider}
                disconnectingProvider={disconnectingProvider}
                syncingProviders={syncingProviders}
              />
            )
          })}
        </div>
      )}

      <ActivityLog
        activities={activities}
        page={activityPage}
        total={activityTotal}
        limit={20}
        onPageChange={(page) => fetchActivity(page)}
        loading={activityLoading}
      />

      {connectingModalProvider && (
        <ConnectModal
          open={true}
          provider={connectingModalProvider}
          onConfirm={handleModalConfirm}
          onCancel={handleModalCancel}
          loading={connectingProvider === connectingModalProvider}
        />
      )}

      {disconnectingModalProvider && (
        <DisconnectDialog
          open={true}
          provider={disconnectingModalProvider}
          onConfirm={handleDisconnectConfirm}
          onCancel={handleDisconnectCancel}
          loading={disconnectingProvider === disconnectingModalProvider}
        />
      )}

      {configuringProvider && (
        <ConfigureDrawer
          open={true}
          provider={configuringProvider}
          onClose={handleConfigureClose}
          onSave={handleConfigureSave}
          onReconnect={() => setConnectingModalProvider(configuringProvider)}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  )
}

export default IntegrationsPage
