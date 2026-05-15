import { render, screen, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import Toast from '../components/ui/Toast'

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('renders message and type correctly', () => {
    render(<Toast message="Success message" type="success" onDismiss={() => {}} />)
    expect(screen.getByText('Success message')).toBeInTheDocument()
  })

  it('calls onDismiss after 4 seconds', () => {
    const onDismiss = vi.fn()
    render(<Toast message="Test" type="success" onDismiss={onDismiss} />)
    
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('calls onDismiss when close button is clicked', async () => {
    const onDismiss = vi.fn()
    render(<Toast message="Test" type="success" onDismiss={onDismiss} />)
    
    const closeButton = screen.getByLabelText('Dismiss')
    closeButton.click()
    
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
