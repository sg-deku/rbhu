import esClient from './search.service';

export const VECTOR_INDEX_NAME = 'documents_vector_index';

export interface DocumentMetadata {
  source_url: string;
  provider: string;
  original_id: string;
  timestamp: string;
  [key: string]: any;
}

/**
 * Ensures that the vector index exists with the correct mapping for kNN search.
 * RB-32: Configure Elasticsearch index with dense_vector mapping for kNN search.
 * RB-33: Define a comprehensive metadata schema (source_url, provider, original_id, timestamp).
 */
export const ensureIndexExists = async (indexName: string = VECTOR_INDEX_NAME) => {
  const { body: exists } = await esClient.indices.exists({ index: indexName }) as any;
  if (!exists) {
    await esClient.indices.create({
      index: indexName,
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
  }
};

/**
 * Indexes a document with its vector embedding.
 */
export const indexVectorDocument = async (
  id: string,
  embedding: number[],
  content: string,
  metadata: DocumentMetadata,
  indexName: string = VECTOR_INDEX_NAME
) => {
  await esClient.index({
    index: indexName,
    id,
    document: {
      embedding,
      content,
      metadata
    }
  });
};

/**
 * Performs a kNN similarity search.
 * RB-35: Build the kNN similarity search query logic.
 */
export const searchSimilarDocuments = async (
  embedding: number[],
  k: number = 5,
  indexName: string = VECTOR_INDEX_NAME
) => {
  const { body: response } = await esClient.search({
    index: indexName,
    knn: {
      field: 'embedding',
      query_vector: embedding,
      k: k,
      num_candidates: 100
    }
  }) as any;

  return response.hits.hits.map((hit: any) => ({
    id: hit._id,
    ...hit._source,
    score: hit._score
  }));
};

export const deleteIndex = async (indexName: string = VECTOR_INDEX_NAME) => {
  const { body: exists } = await esClient.indices.exists({ index: indexName }) as any;
  if (exists) {
    await esClient.indices.delete({ index: indexName });
  }
};

/**
 * Re-indexes by deleting and recreating the index.
 */
export const reindex = async (indexName: string = VECTOR_INDEX_NAME) => {
  await deleteIndex(indexName);
  await ensureIndexExists(indexName);
};
