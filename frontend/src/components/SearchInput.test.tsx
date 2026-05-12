import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SearchInput from './SearchInput';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    search: {
      getSuggestions: vi.fn(),
    },
  },
}));

describe('SearchInput', () => {
  it('renders correctly', () => {
    render(<SearchInput onSearch={() => {}} />);
    expect(screen.getByPlaceholderText(/Ask anything.../i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Search/i })).toBeInTheDocument();
  });

  it('calls onSearch when form is submitted', () => {
    const onSearch = vi.fn();
    render(<SearchInput onSearch={onSearch} />);
    
    const input = screen.getByPlaceholderText(/Ask anything.../i);
    fireEvent.change(input, { target: { value: 'test query' } });
    
    const button = screen.getByRole('button', { name: /Search/i });
    fireEvent.click(button);
    
    expect(onSearch).toHaveBeenCalledWith('test query');
  });

  it('shows suggestions when typing', async () => {
    const suggestions = ['suggestion 1', 'suggestion 2'];
    vi.mocked(api.search.getSuggestions).mockResolvedValue(suggestions);
    
    render(<SearchInput onSearch={() => {}} />);
    
    const input = screen.getByPlaceholderText(/Ask anything.../i);
    fireEvent.change(input, { target: { value: 'test' } });
    
    await waitFor(() => {
      expect(screen.getByText('suggestion 1')).toBeInTheDocument();
      expect(screen.getByText('suggestion 2')).toBeInTheDocument();
    });
  });

  it('calls onSearch when a suggestion is clicked', async () => {
    const onSearch = vi.fn();
    const suggestions = ['clicked suggestion'];
    vi.mocked(api.search.getSuggestions).mockResolvedValue(suggestions);
    
    render(<SearchInput onSearch={onSearch} />);
    
    const input = screen.getByPlaceholderText(/Ask anything.../i);
    fireEvent.change(input, { target: { value: 'test' } });
    
    const suggestionElement = await screen.findByText('clicked suggestion');
    fireEvent.click(suggestionElement);
    
    expect(onSearch).toHaveBeenCalledWith('clicked suggestion');
  });
});
