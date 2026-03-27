/**
 * Ensures skeleton UI stays visible long enough to read (avoids sub-100ms flashes
 * when the API responds instantly).
 */
export const MIN_SKELETON_MS = 520;

/** Wait until at least `MIN_SKELETON_MS` has passed since `startedAt`. Skips immediately if `signal` is aborted. */
export function waitMinSkeletonMs(startedAt: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.resolve();
  const elapsed = Date.now() - startedAt;
  const remaining = MIN_SKELETON_MS - elapsed;
  if (remaining <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    const id = window.setTimeout(resolve, remaining);
    if (!signal) return;
    const onAbort = () => {
      window.clearTimeout(id);
      resolve();
    };
    signal.addEventListener('abort', onAbort, { once: true });
  });
}
