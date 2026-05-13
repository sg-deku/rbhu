import React from 'react'
import { Provider, IntegrationDTO } from '../../types/integrations'
import StatusBadge from './StatusBadge'

const PROVIDER_INFO: Record<Provider, { name: string; description: string }> = {
  jira: {
    name: 'Jira',
    description: 'Connect Jira to sync your projects and issues.',
  },
  slack: {
    name: 'Slack',
    description: 'Connect Slack to sync your channels and messages.',
  },
  confluence: {
    name: 'Confluence',
    description: 'Connect Confluence to sync your spaces and pages.',
  },
}

interface IntegrationCardProps {
  provider: Provider
  integration: IntegrationDTO | null
  onConnect: (provider: Provider) => void
  onDisconnect: (provider: Provider) => void
  onSyncNow: (provider: Provider) => void
  onConfigure: (provider: Provider) => void
  connectingProvider?: Provider | null
}

const IntegrationCard = ({
  provider,
  integration,
  onConnect,
  onDisconnect,
  onSyncNow,
  onConfigure,
  connectingProvider,
}: IntegrationCardProps) => {
  const info = PROVIDER_INFO[provider]
  const isConnected = integration?.status === 'connected'
  const isConnecting = connectingProvider === provider

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{info.name}</h3>
        <StatusBadge status={integration?.status ?? 'disconnected'} />
      </div>
      <p className="text-sm text-gray-500 mb-4">{info.description}</p>
      {isConnected && (integration?.accountName || integration?.accountEmail) && (
        <p className="text-sm text-gray-700 mb-4">
          {integration.accountName || integration.accountEmail}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {!isConnected ? (
          <button
            onClick={() => onConnect(provider)}
            disabled={isConnecting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isConnecting ? 'Connecting...' : 'Connect'}
          </button>
        ) : (
          <>
            <button
              onClick={() => onSyncNow(provider)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
            >
              Sync Now
            </button>
            <button
              onClick={() => onConfigure(provider)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
            >
              Configure
            </button>
            <button
              onClick={() => onDisconnect(provider)}
              className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 rounded hover:bg-red-200"
            >
              Disconnect
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default IntegrationCard
