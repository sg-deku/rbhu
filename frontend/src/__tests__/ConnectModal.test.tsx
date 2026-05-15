import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ConnectModal from '../components/integrations/ConnectModal'

describe('ConnectModal', () => {
  it('renders with open=true for slack showing Connect to Slack heading', () => {
    render(
      <ConnectModal
        open={true}
        provider="slack"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    )
    expect(screen.getByRole('heading', { name: 'Connect to Slack' })).toBeInTheDocument()
  })

  it('shows Slack scopes when provider=slack', () => {
    render(
      <ConnectModal
        open={true}
        provider="slack"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    )
    expect(screen.getByText('channels:read')).toBeInTheDocument()
    expect(screen.getByText('groups:read')).toBeInTheDocument()
    expect(screen.getByText('users:read')).toBeInTheDocument()
  })

  it('shows Jira scopes when provider=jira', () => {
    render(
      <ConnectModal
        open={true}
        provider="jira"
        onConfirm={() => {}}
        onCancel={() => {}}
      />
    )
    expect(screen.getByRole('heading', { name: 'Connect to Jira' })).toBeInTheDocument()
    expect(screen.getByText('read:jira-work')).toBeInTheDocument()
    expect(screen.getByText('read:jira-user')).toBeInTheDocument()
  })

  it('calls onCancel when Cancel button is clicked', () => {
    const onCancel = vi.fn()
    render(
      <ConnectModal
        open={true}
        provider="slack"
        onConfirm={() => {}}
        onCancel={onCancel}
      />
    )
    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('calls onConfirm when Connect button is clicked', () => {
    const onConfirm = vi.fn()
    render(
      <ConnectModal
        open={true}
        provider="slack"
        onConfirm={onConfirm}
        onCancel={() => {}}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: /connect/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('shows spinner and disables buttons when loading=true', () => {
    render(
      <ConnectModal
        open={true}
        provider="slack"
        onConfirm={() => {}}
        onCancel={() => {}}
        loading={true}
      />
    )
    const connectBtn = screen.getByRole('button', { name: /connect/i })
    expect(connectBtn).toBeDisabled()
    const cancelBtn = screen.getByRole('button', { name: /cancel/i })
    expect(cancelBtn).toBeDisabled()
  })
})
