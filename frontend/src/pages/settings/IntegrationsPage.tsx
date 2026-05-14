import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useIntegrationsStore } from '../../stores/useIntegrationsStore'
import IntegrationCard from '../../components/integrations/IntegrationCard'
import ConnectModal from '../../components/integrations/ConnectModal'
import Toast from '../../components/ui/Toast'
import { Provider } from '../../types/integrations'

const PROVIDERS: Provider[] = ['jira', 'slack', 'confluence']

interface ToastState {
  message: string
  type: 'success' | 'error'
}

const IntegrationsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { integrations, loading, connectingProvider, fetchIntegrations, connect } = useIntegrationsStore()
  const [connectingModalProvider, setConnectingModalProvider] = useState<Provider | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)

  useEffect(() => {
    fetchIntegrations()
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
                onDisconnect={() => {}}
                onSyncNow={() => {}}
                onConfigure={() => {}}
                connectingProvider={connectingProvider}
              />
            )
          })}
        </div>
      )}

      {connectingModalProvider && (
        <ConnectModal
          open={true}
          provider={connectingModalProvider}
          onConfirm={handleModalConfirm}
          onCancel={handleModalCancel}
          loading={connectingProvider === connectingModalProvider}
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
