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

  it('should return 400 if query is missing', async () => {
    await request(app)
      .get('/api/search/suggestions')
      .expect(400);
  });
});
