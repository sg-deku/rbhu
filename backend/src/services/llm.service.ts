import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'test-key',
});

/**
 * RB-37: Implement Query Refinement using LLM to transform natural language into search terms.
 * This service takes a natural language query and refines it into a set of keywords optimized for vector search.
 */
export const refineQuery = async (query: string): Promise<string> => {
  if (!process.env.OPENAI_API_KEY) {
    // Fallback for testing/local without API key
    return query.trim();
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a search query refinement assistant. Your task is to extract the core entities, keywords, and intent from the user\'s natural language query. Return ONLY a highly optimized search string that will yield the best results in a vector/BM25 search engine. Do not include any explanations.'
        },
        {
          role: 'user',
          content: query
        }
      ],
      temperature: 0.3,
      max_tokens: 50,
    });

    return response.choices[0]?.message?.content?.trim() || query;
  } catch (error) {
    console.error('Error refining query:', error);
    return query; // Fallback to original query if LLM fails
  }
};
