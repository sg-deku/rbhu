import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import QueryHistory from './QueryHistory';

describe('QueryHistory', () => {
  const mockHistory = ['query 1', 'query 2'];

  it('renders correctly', () => {
    render(<QueryHistory history={mockHistory} onSelectQuery={() => {}} onClearHistory={() => {}} />);
    expect(screen.getByText(/Recent Queries/i)).toBeInTheDocument();
    expect(screen.getByText('query 1')).toBeInTheDocument();
    expect(screen.getByText('query 2')).toBeInTheDocument();
  });

  it('calls onSelectQuery when a query is clicked', () => {
    const onSelectQuery = vi.fn();
    render(<QueryHistory history={mockHistory} onSelectQuery={onSelectQuery} onClearHistory={() => {}} />);
    
    fireEvent.click(screen.getByText('query 1'));
    expect(onSelectQuery).toHaveBeenCalledWith('query 1');
  });

  it('calls onClearHistory when clear is clicked', () => {
    const onClearHistory = vi.fn();
    render(<QueryHistory history={mockHistory} onSelectQuery={() => {}} onClearHistory={onClearHistory} />);
    
    fireEvent.click(screen.getByText(/Clear/i));
    expect(onClearHistory).toHaveBeenCalled();
  });

  it('renders nothing when history is empty', () => {
    const { container } = render(<QueryHistory history={[]} onSelectQuery={() => {}} onClearHistory={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
