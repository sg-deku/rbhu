import React from 'react'
import { render, screen } from '@testing-library/react'
import StatusBadge from '../components/integrations/StatusBadge'

describe('StatusBadge', () => {
  it('renders "Connected" with green styling for connected status', () => {
    render(<StatusBadge status="connected" />)
    const badge = screen.getByText('Connected')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-emerald-50', 'text-emerald-700')
  })

  it('renders "Error" with red styling for error status', () => {
    render(<StatusBadge status="error" />)
    const badge = screen.getByText('Error')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-red-50', 'text-red-700')
  })

  it('renders "Not Connected" with gray styling for disconnected status', () => {
    render(<StatusBadge status="disconnected" />)
    const badge = screen.getByText('Not Connected')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveClass('bg-gray-50', 'text-gray-500')
  })
})
