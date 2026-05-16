import { Response } from 'express';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'test-key',
});

/**
 * RB-41: Build a response streaming service to push answers to the frontend incrementally.
 * Uses Server-Sent Events (SSE) to stream the response.
 */
export const streamResponse = async (
  res: Response,
  systemPrompt: string,
  userPrompt: string
): Promise<void> => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      stream: true,
      temperature: 0.1,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        // Send each chunk as an SSE message
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // Send a final [DONE] message
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('Streaming error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message || 'An error occurred during streaming' })}\n\n`);
    res.end();
  }
};
