import { Request, Response } from 'express';
import { searchDocuments } from '../services/search.service';
import { refineQuery } from '../services/llm.service';
import embeddingService from '../services/embedding.service';
import { searchSimilarDocuments } from '../services/vector-store.service';
import { rankAndFilterResults } from '../services/ranking.service';
import { buildGeneratorPrompt, GENERATOR_SYSTEM_PROMPT } from '../services/prompt.service';
import { streamResponse } from '../services/streaming.service';

export const getSuggestions = async (req: Request, res: Response) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Query parameter "q" is required' });
  }

  try {
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
    const refined = await refineQuery(query);
    const queryEmbedding = await embeddingService.getEmbedding(refined);
    let results: any[] = [];
    
    try {
      results = await searchSimilarDocuments(queryEmbedding, 10);
    } catch (e) {
      console.log('Index might not exist yet or connection failed', e);
    }

    const ranked = rankAndFilterResults(results, 0.5, 5);

    const sources = ranked.map((s, idx) => ({
      id: s.id,
      title: s.metadata?.title || s.metadata?.name || `[Source ${idx + 1}]`,
      snippet: s.content.substring(0, 100) + '...',
      url: s.metadata?.source_url || '#'
    }));

    res.json({ answer: 'Please use the stream endpoint for the answer.', sources });
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

  try {
    // 1. Refine query
    const refined = await refineQuery(query);
    
    // 2. Generate embedding
    const queryEmbedding = await embeddingService.getEmbedding(refined);
    
    // 3. Vector search
    let rawResults: any[] = [];
    try {
      rawResults = await searchSimilarDocuments(queryEmbedding, 10);
    } catch (e) {
      console.log('Search error - maybe index not created', e);
    }

    // 4. Rank and Filter
    // Using a lower threshold for testing if there are no good matches
    const rankedResults = rankAndFilterResults(rawResults, 0.1, 5);

    // 5. Build prompt
    const userPrompt = buildGeneratorPrompt(query, rankedResults);

    // 6. Stream response
    await streamResponse(res, GENERATOR_SYSTEM_PROMPT, userPrompt, rankedResults);

  } catch (err: any) {
    console.error('Stream error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Search pipeline failed' });
    } else {
      res.write(`data: ${JSON.stringify({ error: 'Pipeline failed' })}\n\n`);
      res.end();
    }
  }
};
