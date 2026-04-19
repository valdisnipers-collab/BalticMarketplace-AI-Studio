import 'dotenv/config';
import { reindexAllListings, initSearchIndex } from '../server/services/search';

async function main() {
  console.log('Sāk Meilisearch reindex...');
  await initSearchIndex();
  await reindexAllListings();
  console.log('Reindex pabeigts!');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
