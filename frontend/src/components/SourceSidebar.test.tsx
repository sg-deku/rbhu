import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SourceSidebar from './SourceSidebar';

describe('SourceSidebar', () => {
  const mockSources = [
    { id: '1', title: 'Test Source 1', snippet: 'Snippet 1', url: 'https://example.com/1' },
    { id: '2', title: 'Test Source 2', snippet: 'Snippet 2', url: 'https://example.com/2' },
  ];

  it('renders loading state', () => {
    const { container } = render(<SourceSidebar sources={[]} isLoading={true} />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders sources correctly', () => {
    render(<SourceSidebar sources={mockSources} isLoading={false} />);
    expect(screen.getByText(/Sources/i)).toBeInTheDocument();
    expect(screen.getByText('Test Source 1')).toBeInTheDocument();
    expect(screen.getByText('Test Source 2')).toBeInTheDocument();
    expect(screen.getByText('Snippet 1')).toBeInTheDocument();
    
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', 'https://example.com/1');
  });

  it('renders nothing when sources list is empty and not loading', () => {
    const { container } = render(<SourceSidebar sources={[]} isLoading={false} />);
    expect(container.firstChild).toBeNull();
  });
});
