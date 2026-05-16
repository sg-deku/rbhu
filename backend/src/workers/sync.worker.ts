import { Worker, Job } from 'bullmq';
import { SYNC_QUEUE_NAME } from '../services/queue.service';
import { connection } from '../config/redis';
import prisma from '../config/database';
import { runSync } from '../services/integration-sync.service';

/**
 * RB-58: Implement the 'SyncJob' processor.
 * RB-60: Implement advanced Error/Retry logic.
 * RB-61: Build a progress reporting system to update DB status during sync.
 */
export const syncWorker = new Worker(SYNC_QUEUE_NAME, async (job: Job) => {
  const { integrationId, provider, triggeredBy } = job.data;

  // 1. Progress reporting: Create a SyncLog and update Integration status
  const syncLog = await prisma.syncLog.create({
    data: {
      integrationId,
      provider: provider as any,
      status: 'success', // We will update this if it fails or completes
      triggeredBy,
    }
  });

  await prisma.integration.update({
    where: { id: integrationId },
    data: { syncStatus: 'syncing' }
  });

  try {
    // 2. Fetch the integration details
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId }
    });

    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    // Update job progress
    await job.updateProgress(10);

    // 3. Run the sync process (Ingestion -> Transformation -> Indexing)
    const result = await runSync(integration);

    // Update job progress
    await job.updateProgress(90);

    // 4. Update success status in DB
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'success',
        syncedCount: result.syncedItemCount,
        completedAt: new Date()
      }
    });

    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        syncStatus: 'success',
        lastSyncedAt: new Date(),
        syncedItemCount: result.syncedItemCount
      }
    });

    await job.updateProgress(100);

    return result;

  } catch (error: any) {
    // 5. Handle Error and Retry
    await prisma.syncLog.update({
      where: { id: syncLog.id },
      data: {
        status: 'failed',
        errorMessage: error.message,
        completedAt: new Date()
      }
    });

    await prisma.integration.update({
      where: { id: integrationId },
      data: { syncStatus: 'failed' }
    });

    console.error(`Job ${job.id} failed for integration ${integrationId}:`, error.message);
    
    // Throw error so BullMQ knows the job failed and can apply exponential backoff
    throw error;
  }
}, {
  connection,
  concurrency: 5 // Process up to 5 syncs concurrently
});

syncWorker.on('completed', (job) => {
  console.log(`Sync Job ${job.id} completed successfully`);
});

syncWorker.on('failed', (job, err) => {
  console.log(`Sync Job ${job?.id} failed with error: ${err.message}`);
});

export default syncWorker;
