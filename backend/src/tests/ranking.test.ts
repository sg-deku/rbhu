import { rankAndFilterResults, SearchResult } from '../services/ranking.service';

describe('Ranking Service (RB-38)', () => {
  const mockResults: SearchResult[] = [
    { id: '1', content: 'Doc 1', score: 0.95, metadata: {} },
    { id: '2', content: 'Doc 2', score: 0.65, metadata: {} },
    { id: '3', content: 'Doc 3', score: 0.85, metadata: {} },
    { id: '4', content: 'Doc 4', score: 0.75, metadata: {} },
    { id: '5', content: 'Doc 5', score: 0.45, metadata: {} },
    { id: '6', content: 'Doc 6', score: 0.88, metadata: {} },
  ];

  it('should filter results below the minimum score threshold', () => {
    const ranked = rankAndFilterResults(mockResults, 0.8, 10);
    expect(ranked.length).toBe(3);
    expect(ranked.map(r => r.id)).toEqual(['1', '6', '3']);
  });

  it('should sort results in descending order by score', () => {
    const ranked = rankAndFilterResults(mockResults, 0.0, 10);
    expect(ranked.length).toBe(6);
    expect(ranked[0].id).toBe('1'); // 0.95
    expect(ranked[1].id).toBe('6'); // 0.88
    expect(ranked[2].id).toBe('3'); // 0.85
    expect(ranked[3].id).toBe('4'); // 0.75
    expect(ranked[4].id).toBe('2'); // 0.65
    expect(ranked[5].id).toBe('5'); // 0.45
  });

  it('should limit the number of results to maxResults', () => {
    const ranked = rankAndFilterResults(mockResults, 0.0, 2);
    expect(ranked.length).toBe(2);
    expect(ranked[0].id).toBe('1');
    expect(ranked[1].id).toBe('6');
  });

  it('should use default parameters if not provided', () => {
    // defaults: threshold 0.7, max 5
    const ranked = rankAndFilterResults(mockResults);
    expect(ranked.length).toBe(4); // 0.95, 0.88, 0.85, 0.75
    expect(ranked.map(r => r.id)).toEqual(['1', '6', '3', '4']);
  });
});
