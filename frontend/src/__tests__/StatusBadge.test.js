import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen } from '@testing-library/react';
import StatusBadge from '../components/integrations/StatusBadge';
describe('StatusBadge', () => {
    it('renders "Connected" with green styling for connected status', () => {
        render(_jsx(StatusBadge, { status: "connected" }));
        const badge = screen.getByText('Connected');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveClass('bg-green-100', 'text-green-700');
    });
    it('renders "Error" with red styling for error status', () => {
        render(_jsx(StatusBadge, { status: "error" }));
        const badge = screen.getByText('Error');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveClass('bg-red-100', 'text-red-700');
    });
    it('renders "Not Connected" with gray styling for disconnected status', () => {
        render(_jsx(StatusBadge, { status: "disconnected" }));
        const badge = screen.getByText('Not Connected');
        expect(badge).toBeInTheDocument();
        expect(badge).toHaveClass('bg-gray-100', 'text-gray-500');
    });
});
