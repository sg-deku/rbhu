import { submitFeedback, getFeedbackStats } from '../services/feedback.service';
import prisma from '../config/database';

jest.mock('../config/database', () => ({
  feedback: {
    create: jest.fn(),
    count: jest.fn()
  }
}));

describe('Feedback Service (RB-42)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should submit feedback successfully', async () => {
    const mockFeedback = {
      id: 'fb-1',
      userId: 'user-1',
      query: 'test query',
      response: 'test response',
      isPositive: true,
      comment: 'great answer',
      createdAt: new Date()
    };

    (prisma.feedback.create as jest.Mock).mockResolvedValue(mockFeedback);

    const result = await submitFeedback('user-1', 'test query', 'test response', true, 'great answer');

    expect(prisma.feedback.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        query: 'test query',
        response: 'test response',
        isPositive: true,
        comment: 'great answer'
      }
    });
    expect(result).toEqual(mockFeedback);
  });

  it('should get feedback stats', async () => {
    // total count
    (prisma.feedback.count as jest.Mock)
      .mockResolvedValueOnce(10) // total
      .mockResolvedValueOnce(8)  // positive
      .mockResolvedValueOnce(2); // negative

    const stats = await getFeedbackStats();

    expect(stats.total).toBe(10);
    expect(stats.positive).toBe(8);
    expect(stats.negative).toBe(2);
    expect(stats.positivePercentage).toBe(80);
  });

  it('should handle stats with no feedback', async () => {
    (prisma.feedback.count as jest.Mock).mockResolvedValue(0);

    const stats = await getFeedbackStats();

    expect(stats.total).toBe(0);
    expect(stats.positivePercentage).toBe(0);
  });
});
