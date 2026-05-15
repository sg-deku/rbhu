import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { ActivityDTO, Provider } from '../../types/integrations'

const PROVIDER_LABELS: Record<Provider, string> = {
  jira: 'Jira',
  slack: 'Slack',
  confluence: 'Confluence',
}

const EVENT_LABELS: Record<string, string> = {
  sync_success: 'Sync Succeeded',
  sync_failed: 'Sync Failed',
  connected: 'Connected',
  disconnected: 'Disconnected',
  config_updated: 'Configuration Updated',
}

const EVENT_COLORS: Record<string, string> = {
  sync_success: 'text-green-700',
  sync_failed: 'text-red-700',
  connected: 'text-blue-700',
  disconnected: 'text-gray-600',
  config_updated: 'text-yellow-700',
}

interface ActivityLogEntryProps {
  activity: ActivityDTO
}

const ActivityLogEntry = ({ activity }: ActivityLogEntryProps) => {
  const label = EVENT_LABELS[activity.eventType] ?? activity.eventType
  const color = EVENT_COLORS[activity.eventType] ?? 'text-gray-700'
  const providerLabel = PROVIDER_LABELS[activity.provider as Provider] ?? activity.provider
  const relativeTime = formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })

  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-600">
        {providerLabel.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-sm font-medium ${color}`}>{label}</span>
          <span className="text-xs text-gray-400">·</span>
          <span className="text-xs text-gray-500">{providerLabel}</span>
          <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{relativeTime}</span>
        </div>
        <p className="text-sm text-gray-600 truncate">{activity.message}</p>
        {activity.eventType === 'sync_failed' && activity.detail && (
          <details className="mt-1">
            <summary className="text-xs text-red-600 cursor-pointer hover:underline">Show error</summary>
            <pre className="mt-1 text-xs text-red-700 bg-red-50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-words">{activity.detail}</pre>
          </details>
        )}
      </div>
    </div>
  )
}

export default ActivityLogEntry
