import React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
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
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6">
          <Dialog.Title className="text-lg font-semibold text-gray-900 mb-2">
            Disconnect {name}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-gray-600 mb-6">
            This will remove all stored tokens and sync history for {name}. This action cannot be undone.
          </Dialog.Description>
          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded hover:bg-red-700 disabled:opacity-50"
            >
              {loading && (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Disconnect
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default DisconnectDialog
