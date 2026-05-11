import { Client } from '@elastic/elasticsearch';

const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: process.env.ELASTICSEARCH_USERNAME ? {
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD!,
  } : undefined,
});

export const checkConnection = async (): Promise<void> => {
  try {
    await esClient.ping();
    console.log('✅ Elasticsearch connected');
  } catch (err) {
    console.error('❌ Elasticsearch connection failed:', err);
  }
};

export const createIndex = async (indexName: string, mappings: any): Promise<void> => {
  const exists = await esClient.indices.exists({ index: indexName });
  if (!exists) {
    await esClient.indices.create({ index: indexName, mappings });
  }
};

export const indexDocument = async (index: string, id: string, document: any): Promise<void> => {
  await esClient.index({ index, id, document });
};

export const searchDocuments = async (index: string, query: string, fields: string[]): Promise<any[]> => {
  const response = await esClient.search({
    index,
    query: {
      multi_match: {
        query,
        fields,
        fuzziness: 'AUTO',
      },
    },
  });
  return response.hits.hits.map((hit: any) => ({ id: hit._id, ...hit._source, score: hit._score }));
};

export const deleteDocument = async (index: string, id: string): Promise<void> => {
  await esClient.delete({ index, id });
};

export default esClient;
