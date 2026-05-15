import { Request, Response } from 'express';
import { searchDocuments } from '../services/search.service';

export const getSuggestions = async (req: Request, res: Response) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
    // For now, let's just use searchDocuments to get suggestions from an 'answers' index
    // In a real app, this might be a separate suggestions index or a different ES feature
    const suggestions = await searchDocuments('answers', q, ['title', 'content']);
    res.json(suggestions.map((s: any) => s.title).filter(Boolean));
  } catch (err) {
    console.error('Suggestions error:', err);
    res.status(500).json({ error: 'Failed to fetch suggestions' });
  }
};

export const searchQuery = async (req: Request, res: Response) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    // Mock answer for now - will be replaced with streaming in RB-46
    const mockAnswer = `This is a mock answer for your query: **${query}**.
    
It supports **Markdown** formatting like:
- Lists
- [Links](https://google.com)
- \`code snippets\`

The real implementation will stream the answer in real-time.`;

    const sources = [
      { id: '1', title: 'Source 1', snippet: 'Snippet from source 1...', url: '#' },
      { id: '2', title: 'Source 2', snippet: 'Snippet from source 2...', url: '#' }
    ];

    res.json({ answer: mockAnswer, sources });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
};

export const searchStream = async (req: Request, res: Response) => {
  const { query } = req.query;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query is required' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const fullAnswer = `This is a streamed answer for: **${query}**.
    
It demonstrates real-time capabilities by sending chunks of text sequentially. 
Markdown is fully supported and rendered as the text arrives.

Hope this helps!`;

  const chunks = fullAnswer.split(' ');
  
  for (const chunk of chunks) {
    res.write(`data: ${JSON.stringify({ chunk: chunk + ' ' })}\n\n`);
    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
  }

  res.write(`data: ${JSON.stringify({ done: true, sources: [
    { id: '1', title: 'Streamed Source 1', snippet: 'Content from stream...', url: '#' }
  ] })}\n\n`);
  res.end();
};
