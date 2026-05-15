import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useIntegrationsStore } from '../../stores/useIntegrationsStore'
import IntegrationCard from '../../components/integrations/IntegrationCard'
import ConnectModal from '../../components/integrations/ConnectModal'
import DisconnectDialog from '../../components/integrations/DisconnectDialog'
import ConfigureDrawer from '../../components/integrations/ConfigureDrawer'
import ActivityLog from '../../components/integrations/ActivityLog'
import Toast from '../../components/ui/Toast'
import { Provider } from '../../types/integrations'

const PROVIDERS: Provider[] = ['jira', 'slack', 'confluence']

const PROVIDER_META: Record<Provider, { name: string; category: string }> = {
  jira: { name: 'Jira', category: 'Project Management' },
  slack: { name: 'Slack', category: 'Communication' },
  confluence: { name: 'Confluence', category: 'Documentation' },
}

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
  const [addIntegrationOpen, setAddIntegrationOpen] = useState(false)
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
    setAddIntegrationOpen(false)
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

  const activeIntegrations = integrations.filter(i => i.status === 'connected' || i.status === 'error')
  const activeProviders = new Set(activeIntegrations.map(i => i.provider))
  const availableProviders = PROVIDERS.filter(p => !activeProviders.has(p))

  return (
    <div className="min-h-full" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-start justify-between gap-4 mb-10">
          <div>
            <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--color-text)' }}>
              Integrations
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Connect your tools to sync data and surface knowledge across your workspace.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setAddIntegrationOpen(true)}
            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-150"
            style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Integration
          </motion.button>
        </div>

        {loading ? (
          <div className="space-y-8">
            <div>
              <div className="h-5 w-36 rounded mb-4 animate-pulse" style={{ backgroundColor: 'var(--color-border)' }} />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2].map(i => (
                  <div key={i} className="rounded-xl border animate-pulse" style={{ backgroundColor: 'var(--color-card)', borderColor: 'var(--color-border)', height: '220px' }} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            {activeIntegrations.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                    Active Integrations
                  </h2>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: 'var(--color-primary)' }}
                  >
                    {activeIntegrations.length}
                  </span>
                </div>
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {activeIntegrations.map(integration => (
                    <motion.div key={integration.provider} variants={itemVariants}>
                      <IntegrationCard
                        provider={integration.provider}
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
                  ))}
                </motion.div>
              </section>
            )}

            {availableProviders.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-5">
                  <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-secondary)' }}>
                    Available to Connect
                  </h2>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                  >
                    {availableProviders.length}
                  </span>
                </div>
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                >
                  {availableProviders.map(provider => (
                    <motion.div key={provider} variants={itemVariants}>
                      <IntegrationCard
                        provider={provider}
                        integration={null}
                        onConnect={handleConnect}
                        onDisconnect={handleDisconnect}
                        onSyncNow={handleSyncNow}
                        onConfigure={handleConfigure}
                        connectingProvider={connectingProvider}
                        disconnectingProvider={disconnectingProvider}
                        syncingProviders={syncingProviders}
                      />
                    </motion.div>
                  ))}
                </motion.div>
              </section>
            )}

            {activeIntegrations.length === 0 && availableProviders.length === 0 && (
              <div className="text-center py-20">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
                  <svg className="w-8 h-8" style={{ color: 'var(--color-text-secondary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <p className="text-base font-medium mb-1" style={{ color: 'var(--color-text)' }}>No integrations available</p>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Check back soon for new integrations.</p>
              </div>
            )}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4, ease: 'easeOut' }}
          className="mt-10"
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

      <AnimatePresence>
        {addIntegrationOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
              onClick={() => setAddIntegrationOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -16 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              onClick={() => setAddIntegrationOpen(false)}
            >
              <div
                className="w-full max-w-md rounded-2xl p-6"
                style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>Add Integration</h2>
                  <button
                    onClick={() => setAddIntegrationOpen(false)}
                    className="p-1.5 rounded-lg transition-all duration-150"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm mb-5" style={{ color: 'var(--color-text-secondary)' }}>Choose a tool to connect to your workspace.</p>
                <div className="space-y-2">
                  {availableProviders.length === 0 ? (
                    <p className="text-sm text-center py-6" style={{ color: 'var(--color-text-secondary)' }}>All available integrations are already connected.</p>
                  ) : (
                    availableProviders.map(provider => (
                      <button
                        key={provider}
                        onClick={() => handleConnect(provider)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm transition-all duration-150"
                        style={{
                          backgroundColor: 'var(--color-bg-secondary)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text)',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-primary)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)' }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{PROVIDER_META[provider].name}</span>
                          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{PROVIDER_META[provider].category}</span>
                        </div>
                        <svg className="w-4 h-4" style={{ color: 'var(--color-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
