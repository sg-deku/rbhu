import { startScheduler } from '../services/scheduler.service';
import cron from 'node-cron';
import prisma from '../config/database';
import { addSyncJob } from '../services/queue.service';

jest.mock('node-cron', () => ({
  schedule: jest.fn((schedule, task) => {
    return { start: jest.fn(), stop: jest.fn() };
  })
}));

jest.mock('../config/database', () => ({
  integration: {
    findMany: jest.fn()
  }
}));

jest.mock('../services/queue.service', () => ({
  addSyncJob: jest.fn()
}));

describe('Scheduler Service (RB-59)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should schedule a cron job to run every hour', () => {
    startScheduler();
    expect(cron.schedule).toHaveBeenCalledWith('0 * * * *', expect.any(Function));
  });

  it('should fetch connected integrations and enqueue them', async () => {
    (prisma.integration.findMany as jest.Mock).mockResolvedValue([
      { id: 'int-1', userId: 'user-1', provider: 'slack', status: 'connected' },
      { id: 'int-2', userId: 'user-2', provider: 'jira', status: 'connected' }
    ]);

    startScheduler();
    
    const task = (cron.schedule as jest.Mock).mock.calls[0][1];
    
    // Manually trigger the cron task
    await task();

    expect(prisma.integration.findMany).toHaveBeenCalledWith({
      where: { status: 'connected' }
    });

    expect(addSyncJob).toHaveBeenCalledTimes(2);
    expect(addSyncJob).toHaveBeenCalledWith('int-1', 'user-1', 'slack', 'scheduler');
    expect(addSyncJob).toHaveBeenCalledWith('int-2', 'user-2', 'jira', 'scheduler');
  });
});
