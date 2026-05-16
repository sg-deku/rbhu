/**
 * Represents a document snippet returned from the vector store.
 */
export interface SearchResult {
  id: string;
  content: string;
  score: number;
  metadata: any;
}

/**
 * RB-38: Build a context ranking/filtering layer to prioritize the most relevant snippets.
 * Filters out results below a minimum score threshold and limits to the top N results.
 * 
 * @param results The raw search results from the vector store
 * @param minScoreThreshold The minimum similarity score required to keep a result
 * @param maxResults The maximum number of results to return
 * @returns Ranked and filtered array of search results
 */
export const rankAndFilterResults = (
  results: SearchResult[],
  minScoreThreshold: number = 0.7,
  maxResults: number = 5
): SearchResult[] => {
  // 1. Filter by threshold
  const filtered = results.filter(result => result.score >= minScoreThreshold);

  // 2. Sort descending by score
  const sorted = filtered.sort((a, b) => b.score - a.score);

  // 3. Limit to maxResults
  return sorted.slice(0, maxResults);
};
