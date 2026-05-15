import React, { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { Provider, ResourceDTO } from '../../types/integrations'
import { integrationService } from '../../services/integration.service'
import ResourceList from './ResourceList'

const PROVIDER_NAMES: Record<Provider, string> = {
  slack: 'Slack',
  jira: 'Jira',
  confluence: 'Confluence',
}

interface ConfigureDrawerProps {
  open: boolean
  provider: Provider
  onClose: () => void
  onSave: (ids: string[]) => Promise<void>
  onReconnect?: () => void
}

const ConfigureDrawer = ({ open, provider, onClose, onSave, onReconnect }: ConfigureDrawerProps) => {
  const [resources, setResources] = useState<ResourceDTO[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [reauthRequired, setReauthRequired] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const name = PROVIDER_NAMES[provider]

  useEffect(() => {
    if (!open) return
    setReauthRequired(false)
    setError(null)
    setResources([])
    setSelectedIds([])
    setLoading(true)

    Promise.all([
      integrationService.getResources(provider),
      integrationService.getConfig(provider),
    ])
      .then(([resourcesResult, configResult]) => {
        setResources(resourcesResult.data)
        setSelectedIds(configResult.selectedResourceIds)
      })
      .catch((err: any) => {
        if (err?.code === 'REAUTH_REQUIRED' || err?.status === 401) {
          setReauthRequired(true)
        } else {
          setError(err?.message || 'Failed to load resources')
        }
      })
      .finally(() => setLoading(false))
  }, [open, provider])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(selectedIds)
      onClose()
    } catch (err: any) {
      setError(err?.message || 'Failed to save configuration')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-40"
                style={{ backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className="fixed right-0 top-0 h-full w-full max-w-md z-50 flex flex-col shadow-2xl"
                style={{ backgroundColor: 'var(--color-card)', borderLeft: '1px solid var(--color-border)' }}
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <div
                  className="flex items-center justify-between px-6 py-5"
                  style={{ borderBottom: '1px solid var(--color-border)' }}
                >
                  <div>
                    <Dialog.Title className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
                      Configure {name}
                    </Dialog.Title>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                      Select resources to include in sync
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150"
                    style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-secondary)' }}
                    aria-label="Close"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-5">
                  {reauthRequired ? (
                    <div className="flex flex-col items-center text-center py-12 gap-4">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(99,102,241,0.1)' }}
                      >
                        <svg className="w-6 h-6" style={{ color: 'var(--color-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Session Expired</p>
                        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                          Your access token has expired. Please reconnect to continue.
                        </p>
                      </div>
                      <button
                        onClick={() => { onClose(); onReconnect?.() }}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white"
                        style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
                      >
                        Re-connect {name}
                      </button>
                    </div>
                  ) : error ? (
                    <div
                      className="flex items-start gap-3 rounded-xl px-4 py-3 mt-2"
                      style={{ backgroundColor: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)' }}
                    >
                      <svg className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
                      </svg>
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  ) : (
                    <>
                      <Dialog.Description className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                        Choose which {name} resources to include when syncing data.
                      </Dialog.Description>
                      <ResourceList
                        resources={resources}
                        selectedIds={selectedIds}
                        onChange={setSelectedIds}
                        loading={loading}
                      />
                    </>
                  )}
                </div>

                {!reauthRequired && (
                  <div
                    className="px-6 py-4 flex justify-end gap-2.5"
                    style={{ borderTop: '1px solid var(--color-border)' }}
                  >
                    <button
                      onClick={onClose}
                      disabled={saving}
                      className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 disabled:opacity-50"
                      style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving || loading}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white transition-all duration-150 disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
                    >
                      {saving && (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      )}
                      Save Changes
                    </button>
                  </div>
                )}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}

export default ConfigureDrawer
