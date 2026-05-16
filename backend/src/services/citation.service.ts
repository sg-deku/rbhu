import { SearchResult } from './ranking.service';

export interface Citation {
  sourceId: string;
  url?: string;
  provider?: string;
  title?: string;
}

export interface ParsedResponse {
  text: string;
  citations: Record<string, Citation>; // key is the citation index e.g., '1'
}

/**
 * RB-40: Implement Source Citation mapping to link generated chunks back to metadata.
 * Parses the LLM response, extracts [Source N] tags, and creates a map to actual metadata.
 */
export const parseAndMapCitations = (
  llmResponse: string,
  contexts: SearchResult[]
): ParsedResponse => {
  const citations: Record<string, Citation> = {};
  
  // Regex to find all [Source N] tags
  const citationRegex = /\[Source (\d+)\]/g;
  
  let match;
  while ((match = citationRegex.exec(llmResponse)) !== null) {
    const index = parseInt(match[1], 10);
    // Remember index is 1-based in the prompt
    const contextIndex = index - 1;
    
    if (contextIndex >= 0 && contextIndex < contexts.length) {
      const context = contexts[contextIndex];
      citations[index.toString()] = {
        sourceId: context.id,
        url: context.metadata?.source_url,
        provider: context.metadata?.provider,
        title: context.metadata?.title || context.metadata?.name,
      };
    }
  }

  return {
    text: llmResponse,
    citations
  };
};
