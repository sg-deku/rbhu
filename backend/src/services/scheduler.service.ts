import cron from 'node-cron';
import prisma from '../config/database';
import { addSyncJob } from './queue.service';

/**
 * RB-59: Build a Cron scheduler for periodic incremental synchronization.
 */
export const startScheduler = () => {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    console.log('Running periodic synchronization scheduler...');
    try {
      // Find all connected integrations
      const integrations = await prisma.integration.findMany({
        where: {
          status: 'connected',
        }
      });

      console.log(`Found ${integrations.length} connected integrations to sync.`);

      for (const integration of integrations) {
        // Enqueue a sync job for each
        await addSyncJob(
          integration.id,
          integration.userId,
          integration.provider,
          'scheduler'
        );
      }
    } catch (error) {
      console.error('Failed to run periodic scheduler:', error);
    }
  });

  console.log('Cron scheduler started (Runs every hour).');
};
