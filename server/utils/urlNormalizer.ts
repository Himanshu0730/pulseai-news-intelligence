import crypto from 'crypto';

/**
 * Normalizes news URLs by removing tracking query parameters, fragments (#),
 * standardizing protocol, hostnames, trailing slashes, and mobile AMP variants.
 */
export function normalizeUrl(rawUrl: string): string {
  if (!rawUrl) return '';

  try {
    const urlObj = new URL(rawUrl.trim());

    // 1. Force https
    urlObj.protocol = 'https:';

    // 2. Strip fragment/hash (#)
    urlObj.hash = '';

    // 3. Normalize hostname (lowercase, strip www. prefix for consistent matching)
    urlObj.hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '');

    // 4. Remove known tracking query parameters
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
      'fbclid', 'gclid', 'msclkid', 'ref', 's', 'source', 'm', 'amp', 'outputType'
    ];
    trackingParams.forEach((param) => urlObj.searchParams.delete(param));

    // 5. Remove AMP paths or clean path
    let pathname = urlObj.pathname.replace(/\/amp\/?$/, '/');
    pathname = pathname.replace(/\/+$/, '') || '/';
    urlObj.pathname = pathname;

    return urlObj.toString();
  } catch {
    // Return stripped string if URL parsing fails
    return rawUrl.trim().toLowerCase().split('?')[0].split('#')[0].replace(/\/+$/, '');
  }
}

/**
 * Generates a deterministic, stable 16-character article ID derived from its canonical URL.
 * Guarantees identical IDs across different news providers or refetches of the same story.
 */
export function generateDeterministicArticleId(url: string, title?: string): string {
  const canonicalUrl = normalizeUrl(url);
  const basis = canonicalUrl || (title ? title.trim().toLowerCase() : String(Date.now()));
  const hash = crypto.createHash('sha256').update(basis).digest('hex').substring(0, 16);
  return `art_${hash}`;
}

/**
 * Computes Jaccard similarity score between two text strings (0.0 to 1.0)
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  const tokens1 = tokenizeForSimilarity(text1);
  const tokens2 = tokenizeForSimilarity(text2);
  return jaccardSimilarity(tokens1, tokens2);
}

/**
 * Lower-cases, strips punctuation and stop words, then tokenizes text into a Set.
 * Exported so the O(n^2) deduplication pipeline can tokenize each title once and
 * reuse the token sets across all pair comparisons instead of re-tokenizing per pair.
 */
export function tokenizeForSimilarity(text: string): Set<string> {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'in', 'of', 'to', 'for', 'with', 'on', 'at',
    'from', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'this', 'that', 'it', 'has', 'have'
  ]);

  return new Set(
    String(text || '')
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w))
  );
}

/**
 * Jaccard similarity between two token sets with a cheap upper-bound short-circuit:
 * Jaccard <= min(|A|,|B|) / max(|A|,|B|), so pairs whose sizes differ enough can never
 * reach the 0.75 duplicate threshold and are skipped without any intersection scan.
 */
export function jaccardSimilarity(tokens1: Set<string>, tokens2: Set<string>): number {
  const min = tokens1.size < tokens2.size ? tokens1 : tokens2;
  const max = tokens1.size < tokens2.size ? tokens2 : tokens1;

  if (max.size === 0 || min.size / max.size < 0.75) return 0;

  let intersection = 0;
  for (const tok of min) {
    if (max.has(tok)) intersection++;
  }
  if (intersection === 0) return 0;

  const union = tokens1.size + tokens2.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
