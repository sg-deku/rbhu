import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import DisconnectDialog from '../components/integrations/DisconnectDialog'

describe('DisconnectDialog', () => {
  it('renders with open=true for slack showing warning copy', () => {
    render(
      <DisconnectDialog
        open={true}
        provider="slack"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    )
    expect(screen.getByText('Disconnect Slack')).toBeInTheDocument()
    expect(screen.getByText(/stored tokens and sync history for Slack/)).toBeInTheDocument()
    expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument()
  })

  it('calls onCancel when Cancel button is clicked', () => {
    const onCancel = vi.fn()
    render(
      <DisconnectDialog
        open={true}
        provider="slack"
        onConfirm={() => {}}
        onCancel={onCancel}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('calls onConfirm when Disconnect button is clicked', () => {
    const onConfirm = vi.fn()
    render(
      <DisconnectDialog
        open={true}
        provider="slack"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /disconnect/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('shows spinner and disables Disconnect button when loading=true', () => {
    render(
      <DisconnectDialog
        open={true}
        provider="slack"
        onConfirm={() => {}}
        onCancel={() => {}}
        loading={true}
      />
    )
    const disconnectBtn = screen.getByRole('button', { name: /disconnect/i })
    expect(disconnectBtn).toBeDisabled()
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })
})
