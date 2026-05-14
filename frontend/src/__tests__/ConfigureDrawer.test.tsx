import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ConfigureDrawer from '../components/integrations/ConfigureDrawer'
import { integrationService } from '../services/integration.service'

vi.mock('../services/integration.service', () => ({
  integrationService: {
    getResources: vi.fn(),
    getConfig: vi.fn(),
    updateConfig: vi.fn(),
  },
}))

const mockGetResources = integrationService.getResources as ReturnType<typeof vi.fn>
const mockGetConfig = integrationService.getConfig as ReturnType<typeof vi.fn>

const testResources = [
  { id: 'C001', name: 'general', type: 'channel' },
  { id: 'C002', name: 'random', type: 'channel' },
]

describe('ConfigureDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetResources.mockResolvedValue({ data: testResources, pagination: { page: 1, limit: 50, total: 2 } })
    mockGetConfig.mockResolvedValue({ selectedResourceIds: [] })
  })

  it('renders with open=true for slack showing resource list after loading', async () => {
    render(
      <ConfigureDrawer
        open={true}
        provider="slack"
        onClose={() => {}}
        onSave={async () => {}}
      />
    )
    expect(screen.getByText('Configure Slack')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText('general')).toBeInTheDocument()
      expect(screen.getByText('random')).toBeInTheDocument()
    })
  })

  it('toggles checkbox and adds to selection', async () => {
    render(
      <ConfigureDrawer
        open={true}
        provider="slack"
        onClose={() => {}}
        onSave={async () => {}}
      />
    )
    await waitFor(() => screen.getByText('general'))
    const checkbox = screen.getAllByRole('checkbox')[0]
    expect(checkbox).not.toBeChecked()
    fireEvent.click(checkbox)
    expect(checkbox).toBeChecked()
  })

  it('calls onSave with selected IDs when Save is clicked', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(
      <ConfigureDrawer
        open={true}
        provider="slack"
        onClose={() => {}}
        onSave={onSave}
      />
    )
    await waitFor(() => screen.getByText('general'))
    fireEvent.click(screen.getAllByRole('checkbox')[0])
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(['C001'])
    })
  })

  it('shows re-auth prompt when getResources returns REAUTH_REQUIRED', async () => {
    const reauthError: any = new Error('Reauth required')
    reauthError.code = 'REAUTH_REQUIRED'
    mockGetResources.mockRejectedValue(reauthError)

    render(
      <ConfigureDrawer
        open={true}
        provider="slack"
        onClose={() => {}}
        onSave={async () => {}}
      />
    )
    await waitFor(() => {
      expect(screen.getByText(/access token has expired/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /re-connect/i })).toBeInTheDocument()
    })
  })
})
