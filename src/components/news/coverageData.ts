/**
 * Response contract for the /news/compare-coverage endpoint.
 *
 * `sufficientCoverage` is additive to the original three-field contract
 * (previousCoverage / latestCoverage / whatChanged) so older responses that only
 * carried the strings still render the normal comparison view.
 */
export interface CoverageData {
  previousCoverage: string;
  latestCoverage: string;
  whatChanged: string;
  sufficientCoverage: boolean;
  message?: string;
}

/**
 * Defensively normalizes an arbitrary server response so the comparison modal
 * can never crash on a malformed/empty payload:
 *   - non-object/empty responses normalize to null (rendered as an unavailable
 *     state instead of a crash),
 *   - non-string fields are coerced to ''.
 */
export function normalizeCoverageData(raw: unknown): CoverageData | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const r = raw as Record<string, unknown>;
  const asString = (v: unknown): string => (typeof v === 'string' ? v : '');

  const previousCoverage = asString(r.previousCoverage);
  const latestCoverage = asString(r.latestCoverage);
  const whatChanged = asString(r.whatChanged);
  const hasContent = previousCoverage !== '' || latestCoverage !== '' || whatChanged !== '';

  return {
    previousCoverage,
    latestCoverage,
    whatChanged,
    sufficientCoverage: r.sufficientCoverage !== false && hasContent,
    message: typeof r.message === 'string' ? r.message : undefined,
  };
}
