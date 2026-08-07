import { newsService } from './server/providers/NewsService.js';
import { db } from './server/db/index.js';

async function main() {
  // Poison so both calls are cold misses.
  await db.setCachedNews('feed_base_v5_all', { articles: [], activeProvider: '' }, -3600);

  const t0 = Date.now();
  const [a, b] = await Promise.all([
    newsService.getPersonalizedFeed(['Technology'], undefined, 'all'),
    newsService.getPersonalizedFeed(['Technology', 'AI & ML'], undefined, 'all'),
  ]);
  console.log(`TWO CONCURRENT getPersonalizedFeed: ${Date.now() - t0}ms, a=${a.articles.length}, b=${b.articles.length}`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
