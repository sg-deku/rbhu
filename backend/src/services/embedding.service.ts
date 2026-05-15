/**
 * Service to handle embedding generation with batching support.
 * RB-34: Implement an embedding batching service to handle multiple chunks efficiently.
 */
export class EmbeddingService {
  private batchSize = 100;

  /**
   * Generates embeddings for an array of strings using batching.
   * @param texts Array of strings to embed.
   * @returns Array of embedding vectors.
   */
  async getEmbeddings(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    
    const allEmbeddings: number[][] = [];
    
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      const batchEmbeddings = await this.fetchEmbeddings(batch);
      allEmbeddings.push(...batchEmbeddings);
    }
    
    return allEmbeddings;
  }

  /**
   * Fetches embeddings for a single batch of strings.
   * In a real implementation, this would call an external API like OpenAI.
   */
  private async fetchEmbeddings(texts: string[]): Promise<number[][]> {
    // Placeholder logic for generating random embeddings
    // Dimensions: 1536 (OpenAI standard)
    return texts.map(() => Array.from({ length: 1536 }, () => Math.random()));
  }

  /**
   * Generates an embedding for a single string.
   */
  async getEmbedding(text: string): Promise<number[]> {
    const embeddings = await this.getEmbeddings([text]);
    return embeddings[0];
  }
}

export default new EmbeddingService();
