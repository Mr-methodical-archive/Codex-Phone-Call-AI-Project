export interface RetryOptions {
  retries?: number;
  factor?: number;
  minDelayMs?: number;
  maxDelayMs?: number;
  onRetry?: (error: unknown, attempt: number) => void;
  shouldRetry?: (error: unknown) => boolean;
}

const defaultOptions: Required<Omit<RetryOptions, 'shouldRetry'>> & Pick<RetryOptions, 'shouldRetry'> = {
  retries: 3,
  factor: 2,
  minDelayMs: 250,
  maxDelayMs: 2_000,
  onRetry: () => {},
  shouldRetry: () => true
};

export async function withRetry<T>(operation: (attempt: number) => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { retries, factor, minDelayMs, maxDelayMs, onRetry, shouldRetry } = { ...defaultOptions, ...options };
  let attempt = 0;
  let delay = minDelayMs;

  while (true) {
    try {
      return await operation(attempt + 1);
    } catch (error) {
      attempt += 1;
      if (attempt >= retries || !shouldRetry?.(error)) {
        throw error;
      }
      onRetry(error, attempt);
      await new Promise((resolve) => setTimeout(resolve, Math.min(delay, maxDelayMs)));
      delay *= factor;
    }
  }
}
