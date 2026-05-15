import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
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

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
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

  const handleModalConfirm = async (config?: { clientId: string; clientSecret: string }) => {
    if (!connectingModalProvider) return
    setConnectingModalProvider(null)
    await connect(connectingModalProvider, config)
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

  const connectedCount = integrations.filter((i) => i.status === 'connected').length

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <nav className="flex items-center gap-2 text-sm mb-8" aria-label="Breadcrumb">
          <span style={{ color: 'var(--color-text-secondary)' }}>Settings</span>
          <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-medium" style={{ color: 'var(--color-text)' }}>Integrations</span>
        </nav>

        <div className="mb-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2" style={{ color: 'var(--color-text)' }}>
                Integrations
              </h1>
              <p className="text-base" style={{ color: 'var(--color-text-secondary)' }}>
                Connect your tools to sync data and keep everything in one place.
              </p>
            </div>
            {!loading && connectedCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium"
                style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: 'var(--color-primary)' }}
              >
                {connectedCount} of {PROVIDERS.length} connected
              </motion.div>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PROVIDERS.map((p) => (
              <div
                key={p}
                className="rounded-xl border animate-pulse"
                style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', height: '220px' }}
              />
            ))}
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {PROVIDERS.map((provider) => {
              const integration = integrations.find((i) => i.provider === provider) ?? null
              return (
                <motion.div key={provider} variants={itemVariants}>
                  <IntegrationCard
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
                </motion.div>
              )
            })}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4, ease: 'easeOut' }}
        >
          <ActivityLog
            activities={activities}
            page={activityPage}
            total={activityTotal}
            limit={20}
            onPageChange={(page) => fetchActivity(page)}
            loading={activityLoading}
          />
        </motion.div>
      </div>

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
