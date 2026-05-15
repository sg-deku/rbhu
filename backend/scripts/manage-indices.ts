import dotenv from 'dotenv';
import path from 'path';
import * as vectorStoreService from '../src/services/vector-store.service';

// Load env from root
dotenv.config({ path: path.join(__dirname, '../../.env') });

const action = process.argv[2];

/**
 * Script for index management operations.
 * RB-36: Implement index management scripts (creation, deletion, re-indexing).
 */
const main = async () => {
  try {
    switch (action) {
      case 'setup':
        console.log('Ensuring vector index exists...');
        await vectorStoreService.ensureIndexExists();
        console.log('✅ Done.');
        break;
      case 'delete':
        console.log('Deleting vector index...');
        await vectorStoreService.deleteIndex();
        console.log('✅ Done.');
        break;
      case 'reindex':
        console.log('Re-indexing vector store...');
        await vectorStoreService.reindex();
        console.log('✅ Done.');
        break;
      default:
        console.log('Usage: npx ts-node scripts/manage-indices.ts [setup|delete|reindex]');
    }
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
  process.exit(0);
};

main();
