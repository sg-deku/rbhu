import request from 'supertest';
import app from '../server';
import * as searchService from '../services/search.service';

jest.mock('../services/search.service');

describe('Search API', () => {
  it('should return suggestions', async () => {
    const mockSuggestions = [
      { id: '1', title: 'Test Suggestion', content: 'Content' }
    ];
    (searchService.searchDocuments as jest.Mock).mockResolvedValue(mockSuggestions);

    const res = await request(app)
      .get('/api/search/suggestions?q=test')
      .expect(200);
    
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toContain('Test Suggestion');
  });

  it('should return 400 if query is missing for suggestions', async () => {
    await request(app)
      .get('/api/search/suggestions')
      .expect(400);
  });

  it('should submit query', async () => {
    const res = await request(app)
      .post('/api/search/query')
      .send({ query: 'test' })
      .expect(200);
    
    expect(res.body.answer).toBeDefined();
    expect(res.body.sources).toBeDefined();
  });

  it('should stream results', async () => {
    const res = await request(app)
      .get('/api/search/stream?query=test')
      .expect(200);
    
    expect(res.header['content-type']).toBe('text/event-stream');
  });
});
