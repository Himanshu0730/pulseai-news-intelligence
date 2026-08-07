/**
 * Lightweight performance instrumentation used across the server so every
 * request stage can be timed without pulling in a tracing dependency.
 *
 * Format follows a stable, grep-able shape:
 *   [perf] Feed pipeline ......... 3214ms
 */
export function logPerf(label: string, ms: number): void {
  const width = 32;
  const padded = label.length >= width ? label.slice(0, width) : label.padEnd(width, '.');
  console.log(`[perf] ${padded} ${ms}ms`);
}

export function elapsedMs(start: number): number {
  return Date.now() - start;
}
