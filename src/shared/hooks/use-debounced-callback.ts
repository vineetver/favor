import { useCallback, useEffect, useRef } from "react";

// biome-ignore lint/suspicious/noExplicitAny: Generic function type requires any for flexibility
type AnyFunction = (...args: any[]) => any;

/**
 * A hook that returns a debounced version of the provided callback.
 * The callback will only be invoked after `delay` milliseconds have passed
 * since the last call.
 *
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds (default: 300)
 * @returns A debounced version of the callback
 *
 * @example
 * const debouncedSearch = useDebouncedCallback((value: string) => {
 *   updateUrl(value);
 * }, 300);
 *
 * <input onChange={(e) => debouncedSearch(e.target.value)} />
 */
export function useDebouncedCallback<T extends AnyFunction>(
  callback: T,
  delay = 300,
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay],
  );

  return debouncedCallback;
}

/**
 * Cancel function type for useDebouncedCallbackWithCancel
 */
export type CancelFn = () => void;

/**
 * A hook that returns a debounced callback along with a cancel function.
 * Useful when you need to cancel pending debounced calls (e.g., on clear filters).
 *
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds (default: 300)
 * @returns A tuple of [debouncedCallback, cancelFn]
 *
 * @example
 * const [debouncedUpdate, cancelUpdate] = useDebouncedCallbackWithCancel(
 *   (value: string) => updateUrl(value),
 *   300
 * );
 *
 * const handleClear = () => {
 *   cancelUpdate(); // Cancel any pending debounced updates
 *   clearAllFilters();
 * };
 */
export function useDebouncedCallbackWithCancel<T extends AnyFunction>(
  callback: T,
  delay = 300,
): [(...args: Parameters<T>) => void, CancelFn] {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay],
  );

  return [debouncedCallback, cancel];
}
