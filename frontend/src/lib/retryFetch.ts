/**
 * Retry configuration constants.
 * Using named constants instead of magic numbers.
 */
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Determines whether a failed request should be retried.
 *
 * Retries on:
 *   - Network errors / "Failed to fetch"
 *   - HTTP 5xx server errors
 *   - Timeout errors
 *
 * Does NOT retry on:
 *   - HTTP 4xx client errors (401, 403, 404, etc.)
 */
function isRetryableError(error: unknown): boolean {
  // axios-style errors have a `response` property
  if (error && typeof error === 'object') {
    const axiosError = error as { response?: { status?: number }; code?: string; message?: string };

    // 4xx client errors — do not retry
    if (axiosError.response?.status !== undefined) {
      const status = axiosError.response.status;
      if (status >= 400 && status < 500) {
        return false;
      }
      // 5xx server errors — retry
      if (status >= 500) {
        return true;
      }
    }

    // Network / timeout errors (no HTTP response received)
    if (!axiosError.response) {
      return true;
    }
  }

  // Generic or unknown errors (e.g. "Failed to fetch") — retry
  return true;
}

/**
 * Waits for the given number of milliseconds.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executes `fn` with automatic retry logic.
 *
 * - Up to MAX_RETRY_ATTEMPTS total attempts (1 initial + retries)
 * - RETRY_DELAY_MS pause between each attempt
 * - Only retries on retriable errors (5xx, network, timeout)
 * - Non-retriable errors (4xx) are thrown immediately without retrying
 *
 * @param fn - The async function to execute and potentially retry.
 * @returns The resolved value of `fn`.
 * @throws The last error if all attempts fail, or the first 4xx error.
 */
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const shouldRetry = isRetryableError(error);
      const hasAttemptsLeft = attempt < MAX_RETRY_ATTEMPTS;

      if (!shouldRetry || !hasAttemptsLeft) {
        throw error;
      }

      // Wait before next attempt (retry is transparent to the user)
      await delay(RETRY_DELAY_MS);
    }
  }

  // This point is unreachable in practice, but TypeScript needs it.
  throw lastError;
}
