import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '../../lib/utils'
import { SyncStatus } from '../../types/integrations'

interface SyncStatusIndicatorProps {
  syncStatus: SyncStatus
  lastSyncedAt: string | null
}

const syncConfig: Record<SyncStatus, { label: string; className: string; showSpinner: boolean }> = {
  idle: { label: 'Idle', className: 'bg-gray-100 text-gray-500', showSpinner: false },
  syncing: { label: 'Syncing', className: 'bg-blue-100 text-blue-700', showSpinner: true },
  success: { label: 'Success', className: 'bg-green-100 text-green-700', showSpinner: false },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-700', showSpinner: false },
}

const SyncStatusIndicator = ({ syncStatus, lastSyncedAt }: SyncStatusIndicatorProps) => {
  const config = syncConfig[syncStatus]

  return (
    <div className="flex items-center gap-2 mt-2">
      <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium', config.className)}>
        {config.showSpinner && (
          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {config.label}
      </span>
      {lastSyncedAt && (
        <span className="text-xs text-gray-400">
          {formatDistanceToNow(new Date(lastSyncedAt), { addSuffix: true })}
        </span>
      )}
    </div>
  )
}

export default SyncStatusIndicator
