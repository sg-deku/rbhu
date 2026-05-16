import { SearchResult } from './ranking.service';

/**
 * RB-39: Develop the Generator Prompt with strict rules for facts and citations.
 */
export const GENERATOR_SYSTEM_PROMPT = `You are a helpful, accurate, and highly intelligent AI answering engine.
Your goal is to answer the user's question based strictly on the provided context snippets.

CRITICAL RULES:
1. ONLY use the provided context to answer the question. Do not hallucinate or include outside information.
2. If the context does not contain enough information to answer the question, state: "I do not have enough information to answer this question based on the provided context."
3. Every factual claim MUST be followed by a citation.
4. Citations must use the format [Source N] where N is the index of the provided context.
5. Keep your answer concise, direct, and well-structured.

CONTEXT FORMAT:
You will receive context blocks in the format:
[Source N]
Content: ...
Source URL: ...
`;

/**
 * Builds the complete prompt for the LLM based on user query and ranked results.
 */
export const buildGeneratorPrompt = (query: string, contexts: SearchResult[]): string => {
  let contextText = '';
  
  contexts.forEach((ctx, index) => {
    // 1-based indexing for citations
    contextText += `[Source ${index + 1}]\n`;
    contextText += `Content: ${ctx.content}\n`;
    if (ctx.metadata?.source_url) {
      contextText += `Source URL: ${ctx.metadata.source_url}\n`;
    }
    contextText += '\n';
  });

  return `CONTEXT:\n${contextText}\n\nUSER QUESTION:\n${query}\n\nANSWER:`;
};
