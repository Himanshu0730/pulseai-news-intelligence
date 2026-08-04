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
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'in', 'of', 'to', 'for', 'with', 'on', 'at',
    'from', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'this', 'that', 'it', 'has', 'have'
  ]);

  const tokenize = (str: string) =>
    new Set(
      str
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !stopWords.has(w))
    );

  const tokens1 = tokenize(text1);
  const tokens2 = tokenize(text2);

  if (tokens1.size === 0 || tokens2.size === 0) return 0;

  const intersection = new Set([...tokens1].filter((x) => tokens2.has(x)));
  const union = new Set([...tokens1, ...tokens2]);

  return intersection.size / union.size;
}
