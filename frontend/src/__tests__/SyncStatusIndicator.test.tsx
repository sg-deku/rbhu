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
    expect(screen.getByText('Syncing')).toBeInTheDocument()
    expect(screen.getByText('Syncing')).toHaveClass('bg-blue-100', 'text-blue-700')
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders Success badge with relative timestamp when lastSyncedAt is provided', () => {
    render(<SyncStatusIndicator syncStatus="success" lastSyncedAt="2026-05-13T09:00:00Z" />)
    expect(screen.getByText('Success')).toBeInTheDocument()
    expect(screen.getByText('Success')).toHaveClass('bg-green-100', 'text-green-700')
    const timeEl = document.querySelector('.text-gray-400')
    expect(timeEl).toBeInTheDocument()
  })

  it('renders Failed badge in red', () => {
    render(<SyncStatusIndicator syncStatus="failed" lastSyncedAt={null} />)
    expect(screen.getByText('Failed')).toBeInTheDocument()
    expect(screen.getByText('Failed')).toHaveClass('bg-red-100', 'text-red-700')
  })
})
