import { parseAndMapCitations } from '../services/citation.service';
import { SearchResult } from '../services/ranking.service';

describe('Citation Service (RB-40)', () => {
  const mockContexts: SearchResult[] = [
    {
      id: 'doc-1',
      content: 'Kubernetes is a container orchestration tool.',
      score: 0.9,
      metadata: { source_url: 'https://k8s.io', provider: 'confluence', title: 'Intro to K8s' }
    },
    {
      id: 'doc-2',
      content: 'Docker is a container runtime.',
      score: 0.8,
      metadata: { source_url: 'https://docker.com', provider: 'jira' }
    }
  ];

  it('should extract citations and map them to context metadata', () => {
    const responseText = 'Kubernetes is used for orchestration [Source 1], while Docker is a runtime [Source 2].';
    const result = parseAndMapCitations(responseText, mockContexts);

    expect(result.text).toBe(responseText);
    expect(result.citations['1']).toBeDefined();
    expect(result.citations['1'].sourceId).toBe('doc-1');
    expect(result.citations['1'].url).toBe('https://k8s.io');
    expect(result.citations['1'].provider).toBe('confluence');
    expect(result.citations['1'].title).toBe('Intro to K8s');

    expect(result.citations['2']).toBeDefined();
    expect(result.citations['2'].sourceId).toBe('doc-2');
    expect(result.citations['2'].url).toBe('https://docker.com');
  });

  it('should handle missing citations gracefully', () => {
    const responseText = 'This is a general statement without citations.';
    const result = parseAndMapCitations(responseText, mockContexts);

    expect(result.text).toBe(responseText);
    expect(Object.keys(result.citations).length).toBe(0);
  });

  it('should ignore invalid citation indices', () => {
    const responseText = 'This refers to a non-existent source [Source 5].';
    const result = parseAndMapCitations(responseText, mockContexts);

    expect(result.text).toBe(responseText);
    expect(Object.keys(result.citations).length).toBe(0);
  });

  it('should handle multiple occurrences of the same citation', () => {
    const responseText = 'Fact A [Source 1]. Fact B [Source 1].';
    const result = parseAndMapCitations(responseText, mockContexts);

    expect(Object.keys(result.citations).length).toBe(1);
    expect(result.citations['1'].sourceId).toBe('doc-1');
  });
});
