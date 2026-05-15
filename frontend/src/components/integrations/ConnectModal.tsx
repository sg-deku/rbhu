import React from 'react'
import * as Dialog from '@radix-ui/react-dialog'
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
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6">
          <Dialog.Title className="text-lg font-semibold text-gray-900 mb-2">
            Connect to {name}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-gray-500 mb-4">
            Enter your OAuth credentials and requested permissions.
          </Dialog.Description>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client ID (Optional if pre-configured)
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Enter Client ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Secret (Optional if pre-configured)
                </label>
                <input
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Enter Client Secret"
                />
              </div>
            </div>

            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Required Permissions
            </p>
            <ul className="mb-6 space-y-1">
              {scopes.map((scope) => (
                <li key={scope} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  {scope}
                </li>
              ))}
            </ul>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {loading && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                Connect
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

export default ConnectModal
