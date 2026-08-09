import { Article } from '../providers/types.js';

/**
 * Geographic scope normalization layer.
 *
 * Provider articles (GNews/NewsAPI) do not carry a `region` field — only the
 * curated RSS feeds do. Rather than guessing scope from crude title matching,
 * this module assigns a region from the source/domain when the provider did
 * not, so India/World/All scoping is backed by geographic metadata everywhere.
 *
 * Filtering is strict: `india` keeps only India-tagged content, `world` drops
 * India-tagged content, `all` returns everything. There is deliberately NO
 * lenient fallback — a scope means what it says.
 */

export type GeoScope = 'india' | 'world' | 'all';
export type ArticleRegion = NonNullable<Article['region']>;

const INDIA_SOURCE_PATTERNS: RegExp[] = [
  /the\s*hindu/i,
  /indian\s*express/i,
  /ndtv/i,
  /times\s*of\s*india/i,
  /hindustan\s*times/i,
  /economic\s*times/i,
  /business\s*standard/i,
  /businessline/i,
  /moneycontrol/i,
  /livemint/i,
  /financial\s*express/i,
  /press\s*information\s*bureau/i,
  /\bpib\b/i,
  /prs\s*india/i,
  /news18/i,
  /india\s*today/i,
  /aaj\s*tak/i,
  /\babp\b/i,
  /zee\s*news/i,
  /firstpost/i,
  /business\s*today/i,
  /the\s*quint/i,
  /deccan\s*herald/i,
  /deccan\s*chronicle/i,
  /bangalore\s*mirror/i,
  /bombay\s*times/i,
  /the\s*wire/i,
  /scroll\.in/i,
  /new\s*indian\s*express/i,
  /tribune\s*india/i,
  /the\s*statesman/i,
  /daily\s*hunt/i,
  /outlook\s*india/i,
  /india\.com/i,
  /republic\s*world/i,
  /\bwion/i,
  /sakshi/i,
  /jagran/i,
  /amar\s*ujala/i,
  /dainik\s*bhaskar/i,
  /navbharat/i,
  /asianet/i,
  /\bani\b/i,
  /\bpti\b/i,
  /press\s*trust\s*of\s*india/i,
  /rediff/i,
  /\bsify\b/i,
  /oneindia/i,
  /zeenews/i,
  /et\s*now/i,
  /cnbc-?tv18/i,
  /mirror\s*now/i,
  /gadgets\s*360/i,
  /india\s*tv/i,
  /the\s*federal/i,
  /opindia/i,
  /aninews/i,
  /google\s*news\s*\(?\s*india\s*\)?/i,
  /the\s*print/i,
  /times\s*now/i,
  /republic/i,
  /daily\s*news\s*and\s*analysis/i,
  /\bdna\b/i,
  /business\s*insider\s*india/i,
  /huffpost\s*india/i,
  /news9/i,
  /mathrubhumi/i,
  /devdiscourse/i,
  /business\s*world/i,
  /bw\s*businessworld/i,
  /india\s*blooms/i,
  /5\s*dariya/i,
  /the\s*caravan/i,
  /the\s*pioneer/i,
  /free\s*press\s*journal/i,
  /telangana\s*today/i,
  /the\s*hans\s*india/i,
  /asian\s*age/i,
  /news\s*nation/i,
  /zee\s*business/i,
  /the\s*better\s*india/i,
  /bollywood\s*hungama/i,
  /filmibeat/i,
  /\bians\b/i,
  /united\s*news\s*of\s*india/i,
  /dailyo/i,
  /the\s*daily\s*guardian/i,
  /punjab\s*kesari/i,
  /international\s*business\s*times\s*india/i,
  /newsbytes/i,
  /pragativadi/i,
  /the\s*siasat\s*daily/i,
  /assam\s*tribune/i,
  /sentinel\s*assam/i,
  /morung\s*express/i,
  /the\s*shillong\s*times/i,
  /news\s*18/i,
  /tv18/i,
  /odisha\s*tv/i,
  /the\s*tribune\b/i,
  /etv\s*bharat/i,
];

// NewsAPI's Google News editions report a country-scoped source id (e.g.
// 'google-news-in') but serve every article from the shared news.google.com
// domain, so the domain cannot disambiguate them. The provider source id is the
// authoritative India signal; the 'Google News (India)' name pattern above is
// only a fallback for providers that drop the id.
const INDIA_SOURCE_IDS: string[] = ['google-news-in'];

const INDIA_DOMAIN_HINTS: string[] = [
  'pib.gov.in',
  'indianexpress.com',
  'ndtv.com',
  'timesofindia.com',
  'hindustantimes.com',
  'economictimes.indiatimes.com',
  'indiatimes.com',
  'business-standard.com',
  'thehindubusinessline.com',
  'moneycontrol.com',
  'livemint.com',
  'financialexpress.com',
  'news18.com',
  'indiatoday.in',
  'thequint.com',
  'deccanherald.com',
  'newindianexpress.com',
  'thestatesman.com',
  'tribuneindia.com',
  'firstpost.com',
  'india.com',
  'wionews.com',
  'cnbctv18.com',
  'aajtak.in',
  'jagran.com',
  'amarujala.com',
  'oneindia.com',
  'rediff.com',
  'sify.com',
  'thefederal.com',
  'opindia.com',
  'aninews.in',
  'thehindu.com',
  'theprint.in',
  'timesnownews.com',
  'republicworld.com',
  'dnaindia.com',
  'businessinsider.in',
  'news9live.com',
  'mathrubhumi.com',
  'devdiscourse.com',
  'businessworld.in',
  'indiablooms.com',
  '5dariyanews.com',
  'caravanmagazine.in',
  'theweek.in',
  'dailypioneer.com',
  'freepressjournal.in',
  'telanganatoday.com',
  'thehansindia.com',
  'asianage.com',
  'newsnationtv.com',
  'zeebiz.com',
  'thebetterindia.com',
  'bollywoodhungama.com',
  'filmibeat.com',
  'ians.in',
  'uniindia.com',
  'dailyo.in',
  'dailyguardian.co.in',
  'newsx.in',
  'punjabkesari.com',
  'ibtimes.co.in',
  'newsbytesapp.com',
  'pragativadi.com',
  'siasat.com',
  'assamtribune.com',
  'sentinelassam.com',
  'morungexpress.com',
  'theshillongtimes.com',
  'odishatv.in',
  'kalingatv.com',
  'tribuneindia.com',
  'etvbharat.com',
  'outlookindia.com',
];

const GLOBAL_SOURCE_PATTERNS: RegExp[] = [
  /bbc/i,
  /cnn/i,
  /reuters/i,
  /associated\s*press/i,
  /\bap\b/i,
  /al\s*jazeera/i,
  /the\s*guardian/i,
  /new\s*york\s*times/i,
  /nytimes/i,
  /washington\s*post/i,
  /bloomberg/i,
  /financial\s*times/i,
  /\bft\.com/i,
  /forbes/i,
  /techcrunch/i,
  /ars\s*technica/i,
  /nature\s*journal/i,
  /science\s*daily/i,
  /space\.com/i,
  /medical\s*xpress/i,
  /variety/i,
  /carbon\s*brief/i,
  /venturebeat/i,
  /wall\s*street\s*journal/i,
  /\bwsj\b/i,
  /the\s*economist/i,
  /usa\s*today/i,
  /\bnpr\b/i,
  /axios/i,
  /politico/i,
  /france\s*24/i,
  /\bdw\b/i,
  /deutsche\s*welle/i,
  /nikkei/i,
  /straits\s*times/i,
  /scmp/i,
  /south\s*china\s*morning/i,
  /espn/i,
];

const INDIA_KEYWORDS: string[] = [
  'india', 'indian', 'delhi', 'mumbai', 'bengaluru', 'bangalore', 'isro', 'rbi', 'upi',
  'ondc', 'pib', 'pune', 'hyderabad', 'chennai', 'gujarat', 'assam', 'maharashtra',
  'kerala', 'tamil nadu', 'telangana', 'west bengal', 'uttar pradesh', 'rajasthan',
];

function sourceText(article: Article): string {
  return `${article.source?.name || ''} ${article.url || ''}`.toLowerCase();
}

/**
 * Best-effort region detection for an article. Respects an existing region
 * field; otherwise infers 'India' from known Indian outlets/domains or 'Global'
 * from major international outlets. Returns undefined when unknown.
 */
export function detectArticleRegion(article: Article): ArticleRegion | undefined {
  if (article.region) return article.region;
  if (article.source?.id && INDIA_SOURCE_IDS.includes(article.source.id)) {
    return 'India';
  }
  const source = sourceText(article);
  if (INDIA_SOURCE_PATTERNS.some((re) => re.test(source)) || INDIA_DOMAIN_HINTS.some((d) => source.includes(d))) {
    return 'India';
  }
  if (GLOBAL_SOURCE_PATTERNS.some((re) => re.test(source))) {
    return 'Global';
  }
  return undefined;
}

/** Fill the `region` field on every article that the provider left empty. */
export function normalizeArticleRegions(articles: Article[]): Article[] {
  return articles.map((article) => {
    if (article.region) return article;
    const region = detectArticleRegion(article);
    return region ? { ...article, region } : article;
  });
}

/**
 * Strict region-based scope filter. No lenient fallback: an empty result means
 * genuinely no content matched the scope.
 */
export function filterArticlesByScope<T extends { region?: string }>(articles: T[], scope?: GeoScope): T[] {
  if (scope === 'india') {
    return articles.filter((a) => a.region === 'India' || a.region === 'Indian State');
  }
  if (scope === 'world') {
    return articles.filter((a) => a.region !== 'India' && a.region !== 'Indian State');
  }
  return articles;
}

/**
 * India relevance used for scoring/explanation tags only. Region metadata wins;
 * keyword matching is only a fallback for articles with no geographic metadata
 * at all, and is never used to hard-filter scope.
 */
export function isIndiaArticle(article: Article): boolean {
  const region = detectArticleRegion(article);
  if (region === 'India' || region === 'Indian State') return true;
  if (region === 'Global' || region === 'International' || region === 'South Asia') return false;
  const text = `${article.title || ''} ${article.description || ''}`.toLowerCase();
  return INDIA_KEYWORDS.some((k) => text.includes(k));
}
