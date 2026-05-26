import { runEmbeddingBatch } from './dist/jobs/embedding-batch.js';

console.log('Starting manual embedding batch...');
await runEmbeddingBatch();
console.log('Embedding batch completed!');
process.exit(0);
