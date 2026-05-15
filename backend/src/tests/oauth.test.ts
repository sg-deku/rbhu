process.env.GOOGLE_CLIENT_ID = 'dummy';
process.env.GOOGLE_CLIENT_SECRET = 'dummy';
process.env.GITHUB_CLIENT_ID = 'dummy';
process.env.GITHUB_CLIENT_SECRET = 'dummy';

import { PrismaClient } from '@prisma/client';

jest.mock('@prisma/client', () => {
  const mPrisma = {
    atlassianIntegration: {
      upsert: jest.fn(),
    },
  };
  return { PrismaClient: jest.fn(() => mPrisma) };
});

const prisma = new PrismaClient() as any;

describe('OAuth Config', () => {
  const userId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).fetch = jest.fn();
  });

  it('placeholder test', () => {
    expect(true).toBe(true);
  });
});
