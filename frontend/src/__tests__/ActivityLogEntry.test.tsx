import React from 'react'
import { render, screen } from '@testing-library/react'
import ActivityLogEntry from '../components/integrations/ActivityLogEntry'
import { ActivityDTO } from '../types/integrations'

const baseActivity: ActivityDTO = {
  id: 'act-1',
  provider: 'slack',
  eventType: 'sync_success',
  message: 'Sync completed for slack',
  detail: null,
  syncedItemCount: 5,
  createdAt: new Date('2026-05-13T09:00:00Z').toISOString(),
}

describe('ActivityLogEntry', () => {
  it('renders sync_success without expandable section', () => {
    render(<ActivityLogEntry activity={baseActivity} />)
    expect(screen.getByText('Sync Succeeded')).toBeInTheDocument()
    expect(screen.queryByText(/show error/i)).not.toBeInTheDocument()
  })

  it('renders sync_failed with expandable details element', () => {
    const failedActivity: ActivityDTO = {
      ...baseActivity,
      eventType: 'sync_failed',
      message: 'Sync failed for slack',
      detail: 'Connection timeout',
    }
    render(<ActivityLogEntry activity={failedActivity} />)
    expect(screen.getByText('Sync Failed')).toBeInTheDocument()
    expect(screen.getByText(/show error/i)).toBeInTheDocument()
    const detailsEl = screen.getByText(/show error/i).closest('details')
    expect(detailsEl).toBeInTheDocument()
  })

  it('renders relative timestamp string', () => {
    render(<ActivityLogEntry activity={baseActivity} />)
    expect(screen.getByText(/ago/i)).toBeInTheDocument()
  })

  it('renders the message text', () => {
    render(<ActivityLogEntry activity={baseActivity} />)
    expect(screen.getByText('Sync completed for slack')).toBeInTheDocument()
  })
})
