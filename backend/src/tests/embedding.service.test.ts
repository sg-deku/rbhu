import embeddingService from '../services/embedding.service';

describe('EmbeddingService', () => {
  it('should generate embeddings for an array of strings', async () => {
    const texts = ['hello', 'world'];
    const embeddings = await embeddingService.getEmbeddings(texts);

    expect(embeddings).toHaveLength(2);
    expect(embeddings[0]).toHaveLength(1536);
    expect(embeddings[1]).toHaveLength(1536);
  });

  it('should handle batching correctly', async () => {
    const texts = Array.from({ length: 250 }, (_, i) => `text ${i}`);
    const embeddings = await embeddingService.getEmbeddings(texts);

    expect(embeddings).toHaveLength(250);
  });

  it('should generate embedding for a single string', async () => {
    const text = 'hello';
    const embedding = await embeddingService.getEmbedding(text);

    expect(embedding).toHaveLength(1536);
  });

  it('should return empty array for empty input', async () => {
    const embeddings = await embeddingService.getEmbeddings([]);
    expect(embeddings).toEqual([]);
  });
});
