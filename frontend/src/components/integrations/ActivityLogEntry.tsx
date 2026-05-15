import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ActivityDTO, Provider } from '../../types/integrations'

const PROVIDER_LABELS: Record<Provider, string> = {
  jira: 'Jira',
  slack: 'Slack',
  confluence: 'Confluence',
}

const PROVIDER_COLORS: Record<Provider, string> = {
  jira: '#0052CC',
  slack: '#E01E5A',
  confluence: '#0052CC',
}

const EVENT_LABELS: Record<string, string> = {
  sync_success: 'Sync Succeeded',
  sync_failed: 'Sync Failed',
  connected: 'Connected',
  disconnected: 'Disconnected',
  config_updated: 'Configuration Updated',
}

const EVENT_ICON: Record<string, React.ReactNode> = {
  sync_success: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  ),
  sync_failed: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  connected: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.1-1.1m-.758-4.9a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
  ),
  disconnected: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728M5.636 5.636a9 9 0 000 12.728M12 12v.01" />
    </svg>
  ),
  config_updated: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    </svg>
  ),
}

const EVENT_ICON_CLASSES: Record<string, { bg: string; text: string }> = {
  sync_success: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  sync_failed: { bg: 'bg-red-100', text: 'text-red-700' },
  connected: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  disconnected: { bg: 'bg-gray-100', text: 'text-gray-600' },
  config_updated: { bg: 'bg-amber-100', text: 'text-amber-700' },
}

const EVENT_LABEL_CLASSES: Record<string, string> = {
  sync_success: 'text-emerald-700',
  sync_failed: 'text-red-700',
  connected: 'text-indigo-700',
  disconnected: 'text-gray-600',
  config_updated: 'text-amber-700',
}

interface ActivityLogEntryProps {
  activity: ActivityDTO
}

const ActivityLogEntry = ({ activity }: ActivityLogEntryProps) => {
  const label = EVENT_LABELS[activity.eventType] ?? activity.eventType
  const labelClass = EVENT_LABEL_CLASSES[activity.eventType] ?? 'text-gray-700'
  const iconClasses = EVENT_ICON_CLASSES[activity.eventType] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
  const icon = EVENT_ICON[activity.eventType]
  const providerLabel = PROVIDER_LABELS[activity.provider as Provider] ?? activity.provider
  const providerColor = PROVIDER_COLORS[activity.provider as Provider] ?? '#6b7280'
  const relativeTime = formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })

  return (
    <div
      className="flex items-start gap-4 px-5 py-4"
      style={{ borderBottom: '1px solid var(--color-border)' }}
    >
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${iconClasses.bg} ${iconClasses.text}`}>
        {icon ?? providerLabel.charAt(0)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={`text-sm font-semibold ${labelClass}`}>{label}</span>
          <span
            className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: `${providerColor}18`,
              color: providerColor,
            }}
          >
            {providerLabel}
          </span>
          {activity.syncedItemCount !== undefined && activity.syncedItemCount !== null && (
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              · {activity.syncedItemCount} item{activity.syncedItemCount !== 1 ? 's' : ''}
            </span>
          )}
          <span className="ml-auto text-xs flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>
            {relativeTime}
          </span>
        </div>
        <p className="text-sm mt-0.5 truncate" style={{ color: 'var(--color-text-secondary)' }}>
          {activity.message}
        </p>
        {activity.eventType === 'sync_failed' && activity.detail && (
          <details className="mt-2">
            <summary
              className="text-xs cursor-pointer hover:underline font-medium"
              style={{ color: '#dc2626' }}
            >
              View error details
            </summary>
            <pre
              className="mt-2 text-xs rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words"
              style={{ backgroundColor: '#fef2f2', color: '#991b1b' }}
            >
              {activity.detail}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}

export default ActivityLogEntry
