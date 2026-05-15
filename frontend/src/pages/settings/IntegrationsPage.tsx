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
import { Plus, Link as LinkIcon, X, Plug } from 'lucide-react'

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
  const { 
    integrations, loading, connectingProvider, disconnectingProvider, syncingProviders, 
    fetchIntegrations, connect, triggerSync, disconnect, activities, activityPage, 
    activityTotal, activityLoading, fetchActivity, updateConfig 
  } = useIntegrationsStore()
  
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

  const activeIntegrations = (integrations || []).filter(i => i.status === 'connected' || i.status === 'error')
  const activeProviders = new Set(activeIntegrations.map(i => i.provider))
  const availableProviders = PROVIDERS.filter(p => !activeProviders.has(p))

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">Integrations</h1>
          <p className="text-sm text-gray-500">Connect your tools to sync data and surface knowledge across your workspace.</p>
        </div>
        {availableProviders.length > 0 && (
          <button
            onClick={() => setAddIntegrationOpen(true)}
            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Integration
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-8">
          <div>
            <div className="h-5 w-36 rounded mb-4 bg-gray-200 animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2].map(i => (
                <div key={i} className="rounded-xl border border-gray-200 bg-white h-52 animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          {activeIntegrations.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-5">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Active Integrations
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                  {activeIntegrations.length} Connected
                </span>
              </div>
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
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
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                  Available to Connect
                </h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
                  {availableProviders.length} Available
                </span>
              </div>
              <motion.div
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
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
            <div className="text-center py-24 bg-white border border-gray-200 rounded-2xl border-dashed">
              <div className="w-12 h-12 bg-gray-50 rounded-xl mx-auto mb-4 flex items-center justify-center border border-gray-100 shadow-sm">
                <Plug className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-base font-medium text-gray-900 mb-1">No integrations available</p>
              <p className="text-sm text-gray-500">Check back soon for new integrations.</p>
            </div>
          )}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4, ease: 'easeOut' }}
        className="mt-12 pt-10 border-t border-gray-200"
      >
        <div className="mb-6">
          <h2 className="text-lg font-bold text-gray-900">Activity Log</h2>
          <p className="text-sm text-gray-500">Recent synchronization events and status changes.</p>
        </div>
        <ActivityLog
          activities={activities}
          page={activityPage}
          total={activityTotal}
          limit={20}
          onPageChange={(page) => fetchActivity(page)}
          loading={activityLoading}
        />
      </motion.div>

      <AnimatePresence>
        {addIntegrationOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
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
                className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                  <h2 className="text-lg font-bold text-gray-900">Add Integration</h2>
                  <button
                    onClick={() => setAddIntegrationOpen(false)}
                    className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-5 bg-gray-50">
                  <p className="text-sm text-gray-500 mb-4">Choose a tool to connect to your workspace.</p>
                  <div className="space-y-2">
                    {availableProviders.length === 0 ? (
                      <p className="text-sm text-center py-6 text-gray-500 bg-white border border-gray-200 rounded-xl border-dashed">
                        All available integrations are already connected.
                      </p>
                    ) : (
                      availableProviders.map(provider => (
                        <button
                          key={provider}
                          onClick={() => handleConnect(provider)}
                          className="group w-full flex items-center justify-between px-4 py-3.5 bg-white border border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-sm transition-all text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 group-hover:border-indigo-100 transition-colors">
                              <LinkIcon className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                            </div>
                            <div>
                              <span className="block font-semibold text-gray-900">{PROVIDER_META[provider].name}</span>
                              <span className="block text-xs text-gray-500 mt-0.5">{PROVIDER_META[provider].category}</span>
                            </div>
                          </div>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-50 text-gray-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <Plus className="w-4 h-4" />
                          </div>
                        </button>
                      ))
                    )}
                  </div>
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