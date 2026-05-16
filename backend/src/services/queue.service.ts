import { Queue, QueueEvents, Job } from 'bullmq';
import { connection } from '../config/redis';

export const SYNC_QUEUE_NAME = 'integration-sync-queue';

/**
 * RB-57: Set up BullMQ with Redis for robust task management.
 */
export const syncQueue = new Queue(SYNC_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // Wait 5s before first retry, then 10s, 20s...
    },
    removeOnComplete: {
      age: 3600 * 24 * 7, // Keep completed jobs for 7 days
    },
    removeOnFail: {
      age: 3600 * 24 * 30, // Keep failed jobs for 30 days
    },
  },
});

export const syncQueueEvents = new QueueEvents(SYNC_QUEUE_NAME, { connection });

export const addSyncJob = async (
  integrationId: string,
  userId: string,
  provider: string,
  triggeredBy: 'user' | 'scheduler' = 'user'
) => {
  return syncQueue.add('sync-job', {
    integrationId,
    userId,
    provider,
    triggeredBy
  });
};
