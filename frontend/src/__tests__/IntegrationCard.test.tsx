import React from 'react'
import { render, screen } from '@testing-library/react'
import IntegrationCard from '../components/integrations/IntegrationCard'
import { IntegrationDTO } from '../types/integrations'

const noop = () => {}

const baseIntegration: IntegrationDTO = {
  id: 'int-1',
  provider: 'slack',
  status: 'connected',
  accountName: 'My Team',
  accountEmail: null,
  syncStatus: 'idle',
  lastSyncedAt: null,
  syncedItemCount: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('IntegrationCard', () => {
  it('renders with integration=null showing disconnected badge and Connect button', () => {
    render(
      <IntegrationCard
        provider="slack"
        integration={null}
        onConnect={noop}
        onDisconnect={noop}
        onSyncNow={noop}
        onConfigure={noop}
      />
    )
    expect(screen.getByText('Not Connected')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Connect/i })).toBeInTheDocument()
  })

  it('renders with connected integration showing Connected badge and accountName', () => {
    render(
      <IntegrationCard
        provider="slack"
        integration={baseIntegration}
        onConnect={noop}
        onDisconnect={noop}
        onSyncNow={noop}
        onConfigure={noop}
      />
    )
    expect(screen.getByText('Connected')).toBeInTheDocument()
    expect(screen.getByText('My Team')).toBeInTheDocument()
  })

  it('renders with error status showing Error badge', () => {
    render(
      <IntegrationCard
        provider="slack"
        integration={{ ...baseIntegration, status: 'error' }}
        onConnect={noop}
        onDisconnect={noop}
        onSyncNow={noop}
        onConfigure={noop}
      />
    )
    expect(screen.getByText('Error')).toBeInTheDocument()
  })
})
