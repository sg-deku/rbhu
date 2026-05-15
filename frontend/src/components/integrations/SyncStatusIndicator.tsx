import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '../../lib/utils'
import { SyncStatus } from '../../types/integrations'

interface SyncStatusIndicatorProps {
  syncStatus: SyncStatus
  lastSyncedAt: string | null
}

const syncConfig: Record<SyncStatus, { label: string; className: string; showSpinner: boolean }> = {
  idle: { label: 'Idle', className: 'text-gray-500 bg-gray-100 ring-1 ring-gray-200', showSpinner: false },
  syncing: { label: 'Syncing…', className: 'text-indigo-700 bg-indigo-50 ring-1 ring-indigo-200', showSpinner: true },
  success: { label: 'Synced', className: 'text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200', showSpinner: false },
  failed: { label: 'Sync Failed', className: 'text-red-700 bg-red-50 ring-1 ring-red-200', showSpinner: false },
}

const CheckIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
)

const AlertIcon = () => (
  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
  </svg>
)

const SyncStatusIndicator = ({ syncStatus, lastSyncedAt }: SyncStatusIndicatorProps) => {
  const config = syncConfig[syncStatus]

  return (
    <div className="flex items-center gap-2">
      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', config.className)}>
        {config.showSpinner && (
          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {syncStatus === 'success' && <CheckIcon />}
        {syncStatus === 'failed' && <AlertIcon />}
        {config.label}
      </span>
      {lastSyncedAt && syncStatus !== 'syncing' && (
        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          {formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })}
        </span>
      )}
    </div>
  )
}

export default SyncStatusIndicator
