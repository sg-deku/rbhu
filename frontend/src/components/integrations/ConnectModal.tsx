import React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { Provider } from '../../types/integrations'

const PROVIDER_SCOPES: Record<Provider, string[]> = {
  slack: ['channels:read', 'groups:read', 'users:read'],
  jira: ['read:jira-work', 'read:jira-user', 'offline_access'],
  confluence: ['read:confluence-space.summary', 'read:confluence-content.all', 'offline_access'],
}

const PROVIDER_NAMES: Record<Provider, string> = {
  slack: 'Slack',
  jira: 'Jira',
  confluence: 'Confluence',
}

interface ConnectModalProps {
  open: boolean
  provider: Provider
  onConfirm: (config?: { clientId: string; clientSecret: string }) => void
  onCancel: () => void
  loading?: boolean
}

const ConnectModal = ({ open, provider, onConfirm, onCancel, loading }: ConnectModalProps) => {
  const [clientId, setClientId] = React.useState('')
  const [clientSecret, setClientSecret] = React.useState('')
  const scopes = PROVIDER_SCOPES[provider]
  const name = PROVIDER_NAMES[provider]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (clientId && clientSecret) {
      onConfirm({ clientId, clientSecret })
    } else {
      onConfirm()
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel() }}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-40"
                style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-2xl p-6"
                style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex items-center gap-3 mb-1">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
                  >
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <Dialog.Title className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
                    Connect to {name}
                  </Dialog.Title>
                </div>
                <Dialog.Description className="text-sm mb-5 ml-12" style={{ color: 'var(--color-text-secondary)' }}>
                  Enter your OAuth credentials and review requested permissions.
                </Dialog.Description>

                <form onSubmit={handleSubmit}>
                  <div className="space-y-4 mb-5">
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
                        Client ID
                        <span className="ml-1 font-normal" style={{ color: 'var(--color-text-secondary)' }}>(optional if pre-configured)</span>
                      </label>
                      <input
                        type="text"
                        value={clientId}
                        onChange={(e) => setClientId(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm rounded-lg outline-none transition-all duration-150"
                        style={{
                          backgroundColor: 'var(--color-bg-secondary)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text)',
                        }}
                        placeholder="Enter Client ID"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
                        Client Secret
                        <span className="ml-1 font-normal" style={{ color: 'var(--color-text-secondary)' }}>(optional if pre-configured)</span>
                      </label>
                      <input
                        type="password"
                        value={clientSecret}
                        onChange={(e) => setClientSecret(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm rounded-lg outline-none transition-all duration-150"
                        style={{
                          backgroundColor: 'var(--color-bg-secondary)',
                          border: '1px solid var(--color-border)',
                          color: 'var(--color-text)',
                        }}
                        placeholder="Enter Client Secret"
                      />
                    </div>
                  </div>

                  <div
                    className="rounded-xl p-4 mb-5"
                    style={{ backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                      Required Permissions
                    </p>
                    <ul className="space-y-2">
                      {scopes.map((scope) => (
                        <li key={scope} className="flex items-center gap-2.5 text-xs" style={{ color: 'var(--color-text)' }}>
                          <span
                            className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: 'rgba(99,102,241,0.12)' }}
                          >
                            <svg className="w-2.5 h-2.5" style={{ color: 'var(--color-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                          <code className="font-mono">{scope}</code>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={onCancel}
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 disabled:opacity-50"
                      style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white transition-all duration-150 disabled:opacity-60"
                      style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
                    >
                      {loading && (
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      )}
                      Connect to {name}
                    </button>
                  </div>
                </form>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}

export default ConnectModal
