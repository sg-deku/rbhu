import prisma from '../config/database';

/**
 * RB-42: Implement feedback loop logic (thumbs up/down) for answer quality.
 */
export const submitFeedback = async (
  userId: string,
  query: string,
  response: string,
  isPositive: boolean,
  comment?: string
) => {
  return prisma.feedback.create({
    data: {
      userId,
      query,
      response,
      isPositive,
      comment
    }
  });
};

export const getFeedbackStats = async () => {
  const total = await prisma.feedback.count();
  const positive = await prisma.feedback.count({ where: { isPositive: true } });
  const negative = await prisma.feedback.count({ where: { isPositive: false } });

  return {
    total,
    positive,
    negative,
    positivePercentage: total > 0 ? (positive / total) * 100 : 0
  };
};
