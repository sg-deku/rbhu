import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ActivityLog from '../components/integrations/ActivityLog'
import { ActivityDTO } from '../types/integrations'

const testActivities: ActivityDTO[] = [
  {
    id: 'act-1',
    provider: 'slack',
    eventType: 'sync_success',
    message: 'Sync completed for slack',
    detail: null,
    syncedItemCount: 5,
    createdAt: new Date('2026-05-13T09:00:00Z').toISOString(),
  },
  {
    id: 'act-2',
    provider: 'jira',
    eventType: 'connected',
    message: 'Connected to jira',
    detail: null,
    syncedItemCount: null,
    createdAt: new Date('2026-05-13T08:00:00Z').toISOString(),
  },
]

describe('ActivityLog', () => {
  it('renders list of activities', () => {
    render(
      <ActivityLog
        activities={testActivities}
        page={1}
        total={2}
        limit={20}
        onPageChange={() => {}}
      />
    )
    expect(screen.getByText('Sync completed for slack')).toBeInTheDocument()
    expect(screen.getByText('Connected to jira')).toBeInTheDocument()
  })

  it('shows "No activity yet" when activities is empty', () => {
    render(
      <ActivityLog
        activities={[]}
        page={1}
        total={0}
        limit={20}
        onPageChange={() => {}}
      />
    )
    expect(screen.getByText(/no activity yet/i)).toBeInTheDocument()
  })

  it('calls onPageChange with next page when Next is clicked', () => {
    const onPageChange = vi.fn()
    render(
      <ActivityLog
        activities={testActivities}
        page={1}
        total={25}
        limit={20}
        onPageChange={onPageChange}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('disables Previous button on first page', () => {
    render(
      <ActivityLog
        activities={testActivities}
        page={1}
        total={25}
        limit={20}
        onPageChange={() => {}}
      />
    )
    expect(screen.getByRole('button', { name: /prev/i })).toBeDisabled()
  })
})
