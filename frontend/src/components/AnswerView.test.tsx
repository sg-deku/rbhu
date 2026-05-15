import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AnswerView from './AnswerView';

describe('AnswerView', () => {
  it('renders loading state', () => {
    const { container } = render(<AnswerView answer="" isLoading={true} />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders answer correctly', () => {
    const answer = 'This is a **test** answer';
    render(<AnswerView answer={answer} isLoading={false} />);
    
    // Use heading to distinguish from the answer text containing 'answer'
    expect(screen.getByRole('heading', { name: /Answer/i })).toBeInTheDocument();
    expect(screen.getByText(/This is a/i)).toBeInTheDocument();
    
    // Markdown 'test' should be bold
    const boldElement = screen.getByText('test');
    expect(boldElement.tagName).toBe('STRONG');
  });

  it('renders nothing when answer is empty and not loading', () => {
    const { container } = render(<AnswerView answer="" isLoading={false} />);
    expect(container.firstChild).toBeNull();
  });
});
