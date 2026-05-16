import { streamResponse } from '../services/streaming.service';

jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => {
      return {
        chat: {
          completions: {
            create: jest.fn().mockImplementation(async function* () {
              yield { choices: [{ delta: { content: 'Hello' } }] };
              yield { choices: [{ delta: { content: ' World' } }] };
            })
          }
        }
      };
    })
  };
});

describe('Streaming Service (RB-41)', () => {
  it('should stream chunks as Server-Sent Events', async () => {
    const mockRes = {
      setHeader: jest.fn(),
      write: jest.fn(),
      end: jest.fn()
    } as any;

    await streamResponse(mockRes, 'System prompt', 'User prompt');

    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
    expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(mockRes.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');

    expect(mockRes.write).toHaveBeenCalledWith(`data: {"content":"Hello"}\n\n`);
    expect(mockRes.write).toHaveBeenCalledWith(`data: {"content":" World"}\n\n`);
    expect(mockRes.write).toHaveBeenCalledWith(`data: [DONE]\n\n`);
    expect(mockRes.end).toHaveBeenCalled();
  });
});
