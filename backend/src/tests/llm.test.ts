import { refineQuery } from '../services/llm.service';
import { OpenAI } from 'openai';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => {
      return {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [
                {
                  message: {
                    content: 'refined keywords search optimized'
                  }
                }
              ]
            })
          }
        }
      };
    })
  };
});

describe('LLM Service - Query Refinement (RB-37)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should return original query if OPENAI_API_KEY is not set', async () => {
    delete process.env.OPENAI_API_KEY;
    const query = 'How do I deploy to kubernetes?';
    const result = await refineQuery(query);
    expect(result).toBe(query);
  });

  it('should use LLM to refine query when API key is present', async () => {
    process.env.OPENAI_API_KEY = 'test-api-key';
    const query = 'How do I deploy to kubernetes?';
    const result = await refineQuery(query);
    expect(result).toBe('refined keywords search optimized');
  });
});
