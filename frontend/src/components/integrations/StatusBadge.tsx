import React from 'react'
import { cn } from '../../lib/utils'
import { IntegrationStatus } from '../../types/integrations'

interface StatusBadgeProps {
  status: IntegrationStatus
}

const statusConfig: Record<IntegrationStatus, { label: string; dotClass: string; className: string }> = {
  connected: {
    label: 'Connected',
    dotClass: 'bg-emerald-500',
    className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  },
  error: {
    label: 'Error',
    dotClass: 'bg-red-500',
    className: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  },
  disconnected: {
    label: 'Not Connected',
    dotClass: 'bg-gray-400',
    className: 'bg-gray-50 text-gray-500 ring-1 ring-gray-200',
  },
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = statusConfig[status]
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', config.className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', config.dotClass, status === 'connected' && 'animate-pulse')} />
      {config.label}
    </span>
  )
}

export default StatusBadge
