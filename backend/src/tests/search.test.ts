import request from 'supertest';
import app from '../server';

describe('Search API', () => {
  it('should return suggestions', async () => {
    // Note: This test might fail if Elasticsearch is not running
    // In a real CI, we would mock the esClient or use a test container
    const res = await request(app)
      .get('/api/search/suggestions?q=test')
      .expect(200);
    
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('should return 400 if query is missing', async () => {
    await request(app)
      .get('/api/search/suggestions')
      .expect(400);
  });
});
