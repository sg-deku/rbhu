import esClient from './search.service';

export const VECTOR_INDEX_NAME = 'documents_vector_index';

/**
 * Ensures that the vector index exists with the correct mapping for kNN search.
 * RB-32: Configure Elasticsearch index with dense_vector mapping for kNN search.
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
          content: { type: 'text' }
        }
      }
    });
  }
};

export const deleteIndex = async (indexName: string = VECTOR_INDEX_NAME) => {
  const { body: exists } = await esClient.indices.exists({ index: indexName }) as any;
  if (exists) {
    await esClient.indices.delete({ index: indexName });
  }
};
