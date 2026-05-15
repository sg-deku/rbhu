import esClient from '../services/search.service';
import { ensureIndexExists, VECTOR_INDEX_NAME, deleteIndex } from '../services/vector-store.service';

jest.mock('../services/search.service', () => ({
  indices: {
    exists: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('VectorStoreService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ensureIndexExists', () => {
    it('should create index if it does not exist', async () => {
      (esClient.indices.exists as jest.Mock).mockResolvedValue({ body: false });
      (esClient.indices.create as jest.Mock).mockResolvedValue({ body: { acknowledged: true } });

      await ensureIndexExists();

      expect(esClient.indices.exists).toHaveBeenCalledWith({ index: VECTOR_INDEX_NAME });
      expect(esClient.indices.create).toHaveBeenCalledWith({
        index: VECTOR_INDEX_NAME,
        mappings: {
          properties: {
            embedding: {
              type: 'dense_vector',
              dims: 1536,
              index: true,
              similarity: 'cosine'
            },
            content: { type: 'text' },
            metadata: {
              properties: {
                source_url: { type: 'keyword' },
                provider: { type: 'keyword' },
                original_id: { type: 'keyword' },
                timestamp: { type: 'date' }
              }
            }
          }
        }
      });
    });

    it('should not create index if it already exists', async () => {
      (esClient.indices.exists as jest.Mock).mockResolvedValue({ body: true });

      await ensureIndexExists();

      expect(esClient.indices.exists).toHaveBeenCalledWith({ index: VECTOR_INDEX_NAME });
      expect(esClient.indices.create).not.toHaveBeenCalled();
    });
  });

  describe('deleteIndex', () => {
    it('should delete index if it exists', async () => {
      (esClient.indices.exists as jest.Mock).mockResolvedValue({ body: true });
      (esClient.indices.delete as jest.Mock).mockResolvedValue({ body: { acknowledged: true } });

      await deleteIndex();

      expect(esClient.indices.exists).toHaveBeenCalledWith({ index: VECTOR_INDEX_NAME });
      expect(esClient.indices.delete).toHaveBeenCalledWith({ index: VECTOR_INDEX_NAME });
    });

    it('should not delete index if it does not exist', async () => {
      (esClient.indices.exists as jest.Mock).mockResolvedValue({ body: false });

      await deleteIndex();

      expect(esClient.indices.exists).toHaveBeenCalledWith({ index: VECTOR_INDEX_NAME });
      expect(esClient.indices.delete).not.toHaveBeenCalled();
    });
  });
});
