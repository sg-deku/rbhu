import { jsx as _jsx } from "react/jsx-runtime";
import { render, screen } from '@testing-library/react';
import IntegrationCard from '../components/integrations/IntegrationCard';
const noop = () => { };
const baseIntegration = {
    id: 'int-1',
    provider: 'slack',
    status: 'connected',
    accountName: 'My Team',
    accountEmail: null,
    syncStatus: 'idle',
    lastSyncedAt: null,
    syncedItemCount: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
};
describe('IntegrationCard', () => {
    it('renders with integration=null showing disconnected badge and Connect button', () => {
        render(_jsx(IntegrationCard, { provider: "slack", integration: null, onConnect: noop, onDisconnect: noop, onSyncNow: noop, onConfigure: noop }));
        expect(screen.getByText('Not Connected')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Connect' })).toBeInTheDocument();
    });
    it('renders with connected integration showing Connected badge and accountName', () => {
        render(_jsx(IntegrationCard, { provider: "slack", integration: baseIntegration, onConnect: noop, onDisconnect: noop, onSyncNow: noop, onConfigure: noop }));
        expect(screen.getByText('Connected')).toBeInTheDocument();
        expect(screen.getByText('My Team')).toBeInTheDocument();
    });
    it('renders with error status showing Error badge', () => {
        render(_jsx(IntegrationCard, { provider: "slack", integration: { ...baseIntegration, status: 'error' }, onConnect: noop, onDisconnect: noop, onSyncNow: noop, onConfigure: noop }));
        expect(screen.getByText('Error')).toBeInTheDocument();
    });
});
