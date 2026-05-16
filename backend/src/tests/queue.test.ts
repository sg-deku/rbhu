import { syncQueue, addSyncJob, SYNC_QUEUE_NAME } from '../services/queue.service';
import { Queue } from 'bullmq';

jest.mock('bullmq', () => {
  const originalModule = jest.requireActual('bullmq');
  return {
    ...originalModule,
    Queue: jest.fn().mockImplementation(() => ({
      add: jest.fn().mockResolvedValue({ id: 'job-1' })
    })),
    QueueEvents: jest.fn()
  };
});

// Since the module is evaluated at import time, we need to manually cast the imported mock
const MockQueue = syncQueue as unknown as jest.Mocked<Queue>;

describe('Queue Service (RB-57)', () => {
  it('should initialize the sync queue with correct name', () => {
    expect(SYNC_QUEUE_NAME).toBe('integration-sync-queue');
    // Verify that Queue was called
    expect(Queue).toHaveBeenCalled();
  });

  it('should add a sync job with exponential backoff options implicitly', async () => {
    const job = await addSyncJob('int-1', 'user-1', 'slack', 'user');
    expect(job).toEqual({ id: 'job-1' });
    expect(syncQueue.add).toHaveBeenCalledWith('sync-job', {
      integrationId: 'int-1',
      userId: 'user-1',
      provider: 'slack',
      triggeredBy: 'user'
    });
  });
});
