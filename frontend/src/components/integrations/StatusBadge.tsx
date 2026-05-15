import React from 'react'
import { cn } from '../../lib/utils'
import { IntegrationStatus } from '../../types/integrations'

interface StatusBadgeProps {
  status: IntegrationStatus
}

const statusConfig: Record<IntegrationStatus, { label: string; className: string }> = {
  connected: { label: 'Connected', className: 'bg-green-100 text-green-700' },
  error: { label: 'Error', className: 'bg-red-100 text-red-700' },
  disconnected: { label: 'Not Connected', className: 'bg-gray-100 text-gray-500' },
}

const StatusBadge = ({ status }: StatusBadgeProps) => {
  const config = statusConfig[status]
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium', config.className)}>
      {config.label}
    </span>
  )
}

export default StatusBadge
