import { buildGeneratorPrompt, GENERATOR_SYSTEM_PROMPT } from '../services/prompt.service';
import { SearchResult } from '../services/ranking.service';

describe('Prompt Service (RB-39)', () => {
  it('should export a generator system prompt with strict rules', () => {
    expect(GENERATOR_SYSTEM_PROMPT).toContain('CRITICAL RULES');
    expect(GENERATOR_SYSTEM_PROMPT).toContain('ONLY use the provided context');
    expect(GENERATOR_SYSTEM_PROMPT).toContain('[Source N]');
  });

  it('should build a generator prompt with formatted contexts and the query', () => {
    const mockResults: SearchResult[] = [
      {
        id: '1',
        content: 'This is the first piece of information.',
        score: 0.9,
        metadata: { source_url: 'https://example.com/doc1' }
      },
      {
        id: '2',
        content: 'This is the second piece of information.',
        score: 0.8,
        metadata: {} // No URL
      }
    ];

    const query = 'What is the information?';
    const prompt = buildGeneratorPrompt(query, mockResults);

    // Should include contexts with 1-based indexing
    expect(prompt).toContain('[Source 1]');
    expect(prompt).toContain('Content: This is the first piece of information.');
    expect(prompt).toContain('Source URL: https://example.com/doc1');

    expect(prompt).toContain('[Source 2]');
    expect(prompt).toContain('Content: This is the second piece of information.');
    expect(prompt).not.toContain('Source URL: undefined'); // Assuming we handle undefined properly

    // Should include the query
    expect(prompt).toContain('USER QUESTION:\nWhat is the information?');
    expect(prompt).toContain('ANSWER:');
  });

  it('should handle empty contexts gracefully', () => {
    const prompt = buildGeneratorPrompt('Tell me something', []);
    expect(prompt).toContain('CONTEXT:\n\n\nUSER QUESTION:\nTell me something');
  });
});
