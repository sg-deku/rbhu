import React from 'react'
import { motion } from 'framer-motion'
import { Provider, IntegrationDTO } from '../../types/integrations'
import StatusBadge from './StatusBadge'
import SyncStatusIndicator from './SyncStatusIndicator'
import { RefreshCw, Settings, Trash2, Link2 } from 'lucide-react'

const JiraIcon = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <rect width="32" height="32" rx="8" fill="#0052CC" />
    <path d="M16.471 7l-1.04 1.054-4.33 4.386a.764.764 0 000 1.073l5.37 5.44 5.37-5.44a.764.764 0 000-1.073L17.511 8.054 16.471 7z" fill="url(#jira-a)" />
    <path d="M16.471 14.046l-5.37 5.44a.764.764 0 000 1.073l4.33 4.387 1.04 1.054 1.04-1.054 4.33-4.387a.764.764 0 000-1.073l-5.37-5.44z" fill="url(#jira-b)" />
    <defs>
      <linearGradient id="jira-a" x1="16.471" y1="12.207" x2="12.142" y2="8.054" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0052CC" />
        <stop offset="1" stopColor="#2684FF" />
      </linearGradient>
      <linearGradient id="jira-b" x1="16.471" y1="19.792" x2="20.8" y2="23.946" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0052CC" />
        <stop offset="1" stopColor="#2684FF" />
      </linearGradient>
    </defs>
  </svg>
)

const SlackIcon = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <rect width="32" height="32" rx="8" fill="#fff" />
    <path d="M12.5 6C11.12 6 10 7.12 10 8.5S11.12 11 12.5 11H15V8.5C15 7.12 13.88 6 12.5 6z" fill="#E01E5A" />
    <path d="M12.5 13H6.5C5.12 13 4 14.12 4 15.5S5.12 18 6.5 18H12.5C13.88 18 15 16.88 15 15.5S13.88 13 12.5 13z" fill="#E01E5A" />
    <path d="M26 15.5C26 14.12 24.88 13 23.5 13S21 14.12 21 15.5V18h2.5C24.88 18 26 16.88 26 15.5z" fill="#2EB67D" />
    <path d="M19 6.5v6H21.5C22.88 12.5 24 11.38 24 10S22.88 7.5 21.5 7.5H19V6.5C19 5.12 17.88 4 16.5 4S14 5.12 14 6.5V12.5h5V6.5z" fill="#2EB67D" />
    <path d="M19.5 21H17v2.5c0 1.38 1.12 2.5 2.5 2.5S22 24.88 22 23.5 20.88 21 19.5 21z" fill="#ECB22E" />
    <path d="M19 19h6c1.38 0 2.5-1.12 2.5-2.5S26.38 14 25 14h-6v5z" fill="#ECB22E" />
    <path d="M8.5 19C7.12 19 6 20.12 6 21.5S7.12 24 8.5 24H11V21.5C11 20.12 9.88 19 8.5 19z" fill="#36C5F0" />
    <path d="M13 19H8.5C7.12 19 6 20.12 6 21.5S7.12 24 8.5 24H13c1.38 0 2.5-1.12 2.5-2.5S14.38 19 13 19z" fill="#36C5F0" />
    <path d="M13 14H10.5C9.12 14 8 15.12 8 16.5S9.12 19 10.5 19H13c1.38 0 2.5-1.12 2.5-2.5S14.38 14 13 14z" fill="#36C5F0" />
  </svg>
)

const ConfluenceIcon = () => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
    <rect width="32" height="32" rx="8" fill="#0052CC" />
    <path d="M7.2 21.6c-.3.5-.7 1.1-.9 1.5-.3.5-.1 1.1.4 1.4l4.2 2.3c.5.3 1.1.1 1.4-.4.2-.3.5-.8.9-1.4 2.3-3.6 4.7-3.2 8.1-1.5l4.2 2.1c.5.3 1.1 0 1.4-.5l1.9-4c.3-.5 0-1.1-.5-1.4-1.1-.5-3.2-1.6-5-2.5-6.3-3-11.7-2.6-16.1 4.4z" fill="url(#conf-a)" />
    <path d="M24.8 10.4c.3-.5.7-1.1.9-1.5.3-.5.1-1.1-.4-1.4L21.1 5.2c-.5-.3-1.1-.1-1.4.4-.2.3-.5.8-.9 1.4-2.3 3.6-4.7 3.2-8.1 1.5L6.5 6.4C6 6.1 5.4 6.4 5.1 6.9L3.2 11c-.3.5 0 1.1.5 1.4 1.1.5 3.2 1.6 5 2.5 6.3 3 11.7 2.5 16.1-4.5z" fill="url(#conf-b)" />
    <defs>
      <linearGradient id="conf-a" x1="20.5" y1="28" x2="10.3" y2="19" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0052CC" />
        <stop offset="1" stopColor="#2684FF" />
      </linearGradient>
      <linearGradient id="conf-b" x1="11.5" y1="4" x2="21.7" y2="13" gradientUnits="userSpaceOnUse">
        <stop stopColor="#0052CC" />
        <stop offset="1" stopColor="#2684FF" />
      </linearGradient>
    </defs>
  </svg>
)

const PROVIDER_ICONS: Record<Provider, React.FC> = {
  jira: JiraIcon,
  slack: SlackIcon,
  confluence: ConfluenceIcon,
}

const PROVIDER_INFO: Record<Provider, { name: string; description: string }> = {
  jira: {
    name: 'Jira',
    description: 'Sync your projects, sprints, and issues to power search and insights.',
  },
  slack: {
    name: 'Slack',
    description: 'Connect channels and messages to surface knowledge from conversations.',
  },
  confluence: {
    name: 'Confluence',
    description: 'Bring in your spaces and pages for unified documentation search.',
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
  disconnectingProvider?: Provider | null
  syncingProviders?: Set<Provider>
}

const IntegrationCard = ({
  provider,
  integration,
  onConnect,
  onDisconnect,
  onSyncNow,
  onConfigure,
  connectingProvider,
  disconnectingProvider,
  syncingProviders,
}: IntegrationCardProps) => {
  const info = PROVIDER_INFO[provider]
  const Icon = PROVIDER_ICONS[provider]
  const isConnected = integration?.status === 'connected'
  const isError = integration?.status === 'error'
  const isConnecting = connectingProvider === provider
  const isDisconnecting = disconnectingProvider === provider
  const isSyncing = syncingProviders?.has(provider) ?? false

  return (
    <motion.div
      className={`relative flex flex-col rounded-2xl border p-6 h-full transition-shadow duration-200 bg-white shadow-sm hover:shadow-md ${
        isConnected ? 'border-indigo-100 hover:border-indigo-200' : isError ? 'border-red-100' : 'border-gray-200 hover:border-gray-300'
      }`}
      whileHover={{ y: -2 }}
    >
      {isConnected && (
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-indigo-500 to-purple-500" />
      )}

      <div className="flex items-start justify-between mb-5">
        <div className="w-12 h-12 flex-shrink-0 rounded-xl overflow-hidden shadow-sm">
          <Icon />
        </div>
        <StatusBadge status={integration?.status ?? 'disconnected'} />
      </div>

      <div className="flex-1">
        <h3 className="text-lg font-bold mb-2 text-gray-900">
          {info.name}
        </h3>
        <p className="text-sm leading-relaxed mb-5 text-gray-500">
          {info.description}
        </p>

        {isConnected && (integration?.accountName || integration?.accountEmail) && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white bg-indigo-600 flex-shrink-0 shadow-sm">
              {(integration.accountName || integration.accountEmail || '?').charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-medium truncate text-gray-700">
              {integration.accountName || integration.accountEmail}
            </span>
          </div>
        )}

        {isConnected && integration && (
          <SyncStatusIndicator
            syncStatus={integration.syncStatus}
            lastSyncedAt={integration.lastSyncedAt}
          />
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-gray-100">
        {!isConnected ? (
          <button
            onClick={() => onConnect(provider)}
            disabled={isConnecting}
            className="w-full inline-flex justify-center items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
          >
            {isConnecting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Connecting…
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4" />
                Connect to {info.name}
              </>
            )}
          </button>
        ) : (
          <>
            <button
              onClick={() => onSyncNow(provider)}
              disabled={isSyncing}
              className="flex-1 inline-flex justify-center items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSyncing ? (
                <span className="w-4 h-4 border-2 border-indigo-700 border-t-transparent rounded-full animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Sync
            </button>
            <button
              onClick={() => onConfigure(provider)}
              className="flex-1 inline-flex justify-center items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg text-gray-700 bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-colors"
            >
              <Settings className="w-4 h-4 text-gray-500" />
              Configure
            </button>
            <button
              onClick={() => onDisconnect(provider)}
              disabled={isDisconnecting}
              className="flex-shrink-0 inline-flex justify-center items-center p-2 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              title="Disconnect"
            >
              {isDisconnecting ? (
                <span className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </>
        )}
      </div>
    </motion.div>
  )
}

export default IntegrationCard