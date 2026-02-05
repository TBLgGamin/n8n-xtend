export type DebouncedFunction<T extends (...args: never[]) => void> = T & {
  cancel: () => void;
};

export function createDebounced<T extends (...args: never[]) => void>(
  fn: T,
  delayMs: number,
): DebouncedFunction<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const debounced = ((...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delayMs);
  }) as DebouncedFunction<T>;

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}

export function createThrottled<T extends (...args: never[]) => void>(fn: T, delayMs: number): T {
  let lastCallTime = 0;

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCallTime < delayMs) return;
    lastCallTime = now;
    fn(...args);
  }) as T;
}
