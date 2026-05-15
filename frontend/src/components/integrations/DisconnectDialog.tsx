import React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { Provider } from '../../types/integrations'

const PROVIDER_NAMES: Record<Provider, string> = {
  slack: 'Slack',
  jira: 'Jira',
  confluence: 'Confluence',
}

interface DisconnectDialogProps {
  open: boolean
  provider: Provider
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

const DisconnectDialog = ({ open, provider, onConfirm, onCancel, loading }: DisconnectDialogProps) => {
  const name = PROVIDER_NAMES[provider]

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
                className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-2xl p-6"
                style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <Dialog.Title className="text-base font-semibold" style={{ color: 'var(--color-text)' }}>
                      Disconnect {name}?
                    </Dialog.Title>
                    <Dialog.Description className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                      This will remove all stored tokens and sync history for {name}. This action cannot be undone.
                    </Dialog.Description>
                  </div>
                </div>

                <div
                  className="flex items-start gap-2.5 rounded-xl px-4 py-3 mb-5 text-xs"
                  style={{ backgroundColor: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.15)', color: '#991b1b' }}
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Synced data and configuration settings will be permanently deleted.
                </div>

                <div className="flex justify-end gap-2.5">
                  <button
                    onClick={onCancel}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150 disabled:opacity-50"
                    style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
                  >
                    Keep Connected
                  </button>
                  <button
                    onClick={onConfirm}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white transition-all duration-150 disabled:opacity-60"
                    style={{ backgroundColor: '#dc2626' }}
                  >
                    {loading && (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                    Disconnect
                  </button>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}

export default DisconnectDialog
