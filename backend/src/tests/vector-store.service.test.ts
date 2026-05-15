import esClient from '../services/search.service';
import { 
  ensureIndexExists, 
  VECTOR_INDEX_NAME, 
  deleteIndex,
  indexVectorDocument,
  searchSimilarDocuments
} from '../services/vector-store.service';

jest.mock('../services/search.service', () => ({
  indices: {
    exists: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
  },
  index: jest.fn(),
  search: jest.fn(),
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

  describe('indexVectorDocument', () => {
    it('should call esClient.index with correct parameters', async () => {
      const id = '1';
      const embedding = [0.1, 0.2];
      const content = 'test content';
      const metadata = {
        source_url: 'http://test.com',
        provider: 'jira',
        original_id: 'jira-1',
        timestamp: new Date().toISOString()
      };

      await indexVectorDocument(id, embedding, content, metadata);

      expect(esClient.index).toHaveBeenCalledWith({
        index: VECTOR_INDEX_NAME,
        id,
        document: {
          embedding,
          content,
          metadata
        }
      });
    });
  });

  describe('searchSimilarDocuments', () => {
    it('should call esClient.search with kNN parameters', async () => {
      const embedding = [0.1, 0.2];
      const mockResponse = {
        body: {
          hits: {
            hits: [
              { _id: '1', _score: 0.9, _source: { content: 'test 1', metadata: {} } },
              { _id: '2', _score: 0.8, _source: { content: 'test 2', metadata: {} } }
            ]
          }
        }
      };
      (esClient.search as jest.Mock).mockResolvedValue(mockResponse);

      const results = await searchSimilarDocuments(embedding, 2);

      expect(esClient.search).toHaveBeenCalledWith({
        index: VECTOR_INDEX_NAME,
        knn: {
          field: 'embedding',
          query_vector: embedding,
          k: 2,
          num_candidates: 100
        }
      });
      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('1');
      expect(results[0].score).toBe(0.9);
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
