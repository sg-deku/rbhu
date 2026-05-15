import React from 'react'
import { motion } from 'framer-motion'
import { Provider, IntegrationDTO } from '../../types/integrations'
import StatusBadge from './StatusBadge'
import SyncStatusIndicator from './SyncStatusIndicator'

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
      className="relative flex flex-col rounded-xl border p-6 h-full transition-shadow duration-200"
      style={{
        backgroundColor: 'var(--color-card)',
        borderColor: isConnected ? 'rgba(99,102,241,0.3)' : isError ? 'rgba(239,68,68,0.3)' : 'var(--color-border)',
        boxShadow: '0 1px 3px var(--color-shadow)',
      }}
      whileHover={{
        y: -3,
        boxShadow: '0 8px 24px var(--color-shadow)',
        transition: { duration: 0.2, ease: 'easeOut' },
      }}
    >
      {isConnected && (
        <div
          className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl"
          style={{ background: 'linear-gradient(90deg, var(--color-primary), var(--color-secondary))' }}
        />
      )}

      <div className="flex items-start justify-between mb-5">
        <div className="w-10 h-10 flex-shrink-0">
          <Icon />
        </div>
        <StatusBadge status={integration?.status ?? 'disconnected'} />
      </div>

      <div className="flex-1">
        <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
          {info.name}
        </h3>
        <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          {info.description}
        </p>

        {isConnected && (integration?.accountName || integration?.accountEmail) && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--color-bg-secondary)' }}>
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
            >
              {(integration.accountName || integration.accountEmail || '?').charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-medium truncate" style={{ color: 'var(--color-text)' }}>
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

      <div className="flex flex-wrap gap-2 mt-5 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
        {!isConnected ? (
          <button
            onClick={() => onConnect(provider)}
            disabled={isConnecting}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
          >
            {isConnecting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Connecting…
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Connect
              </>
            )}
          </button>
        ) : (
          <>
            <button
              onClick={() => onSyncNow(provider)}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ color: 'var(--color-primary)', backgroundColor: 'rgba(99,102,241,0.08)' }}
            >
              {isSyncing ? (
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              Sync
            </button>
            <button
              onClick={() => onConfigure(provider)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150"
              style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-secondary)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Configure
            </button>
            <button
              onClick={() => onDisconnect(provider)}
              disabled={isDisconnecting}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed ml-auto"
              style={{ color: '#dc2626', backgroundColor: 'rgba(220,38,38,0.08)' }}
            >
              {isDisconnecting && (
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              )}
              Disconnect
            </button>
          </>
        )}
      </div>
    </motion.div>
  )
}

export default IntegrationCard
