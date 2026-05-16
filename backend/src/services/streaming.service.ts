import { Response } from 'express';
import { OpenAI } from 'openai';
import { SearchResult } from './ranking.service';

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
  userPrompt: string,
  sources: SearchResult[]
): Promise<void> => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Map sources to what frontend expects
  const frontendSources = sources.map((s, idx) => ({
    id: s.id || `source-${idx}`,
    title: s.metadata?.title || s.metadata?.name || `[Source ${idx + 1}]`,
    snippet: s.content.substring(0, 100) + '...',
    url: s.metadata?.source_url || '#'
  }));

  if (!process.env.OPENAI_API_KEY) {
    // Mock response if no API key
    const mockAnswer = `This is a mock streamed response since OPENAI_API_KEY is not set.\n\nHere are some citations: [Source 1], [Source 2].`;
    const chunks = mockAnswer.split(' ');
    
    for (const chunk of chunks) {
      res.write(`data: ${JSON.stringify({ chunk: chunk + ' ' })}\n\n`);
      await new Promise(r => setTimeout(r, 50));
    }

    res.write(`data: ${JSON.stringify({ done: true, sources: frontendSources })}\n\n`);
    res.end();
    return;
  }

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
        res.write(`data: ${JSON.stringify({ chunk: content })}\n\n`);
      }
    }

    // Send a final message with sources
    res.write(`data: ${JSON.stringify({ done: true, sources: frontendSources })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Streaming error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message || 'An error occurred during streaming' })}\n\n`);
    res.end();
  }
};
