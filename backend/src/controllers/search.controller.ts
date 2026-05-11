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
