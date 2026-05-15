import cron from 'node-cron';
import { syncAllIntegrations } from './integration.service';

export function startIntegrationScheduler(): void {
  cron.schedule('*/30 * * * *', async () => {
    await syncAllIntegrations();
  });
}
