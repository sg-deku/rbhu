import React from 'react'
import { render, screen } from '@testing-library/react'
import SyncStatusIndicator from '../components/integrations/SyncStatusIndicator'

describe('SyncStatusIndicator', () => {
  it('renders Idle badge with no timestamp when lastSyncedAt is null', () => {
    render(<SyncStatusIndicator syncStatus="idle" lastSyncedAt={null} />)
    expect(screen.getByText('Idle')).toBeInTheDocument()
    expect(screen.getByText('Idle')).toHaveClass('bg-gray-100', 'text-gray-500')
  })

  it('renders Syncing badge with spinner', () => {
    render(<SyncStatusIndicator syncStatus="syncing" lastSyncedAt={null} />)
    expect(screen.getByText('Syncing…')).toBeInTheDocument()
    expect(screen.getByText('Syncing…')).toHaveClass('bg-indigo-50', 'text-indigo-700')
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders Success badge with relative timestamp when lastSyncedAt is provided', () => {
    render(<SyncStatusIndicator syncStatus="success" lastSyncedAt="2026-05-13T09:00:00Z" />)
    expect(screen.getByText('Synced')).toBeInTheDocument()
    expect(screen.getByText('Synced')).toHaveClass('bg-emerald-50', 'text-emerald-700')
    expect(screen.getByText(/ago/i)).toBeInTheDocument()
  })

  it('renders Failed badge in red', () => {
    render(<SyncStatusIndicator syncStatus="failed" lastSyncedAt={null} />)
    expect(screen.getByText('Sync Failed')).toBeInTheDocument()
    expect(screen.getByText('Sync Failed')).toHaveClass('bg-red-50', 'text-red-700')
  })
})
