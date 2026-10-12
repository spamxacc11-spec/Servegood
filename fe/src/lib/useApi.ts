import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage } from "./api";

export interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
  setData: (updater: T | ((prev: T | null) => T)) => void;
}

interface Result<T> {
  /** Which request this result answers (key plus reload counter). */
  forKey: string | null;
  /** Which key the data belongs to; data is only shown while the key is unchanged. */
  forBase: string | null;
  data: T | null;
  error: string | null;
}

/**
 * Loads data and re-loads whenever `key` changes. `key` should encode every
 * input the fetcher depends on (for example `restaurants?${params}`); passing
 * `null` skips the request, for when an input is not ready yet.
 *
 * Loading is derived rather than stored: the hook is loading whenever its
 * latest result answers an older request. A response that arrives after the
 * key has moved on is ignored, so fast filter changes never show stale
 * results. On reload() the current data stays on screen until fresh data
 * arrives; when the key changes, data from the old key is never shown.
 */
export function useApi<T>(key: string | null, fetcher: () => Promise<T>): ApiState<T> {
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState<Result<T>>({ forKey: null, forBase: null, data: null, error: null });
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const requestKey = key === null ? null : `${key}#${tick}`;

  useEffect(() => {
    if (requestKey === null) return;
    const base = requestKey.slice(0, requestKey.lastIndexOf("#"));
    let current = true;
    fetcherRef
      .current()
      .then((data) => {
        if (current) setResult({ forKey: requestKey, forBase: base, data, error: null });
      })
      .catch((e: unknown) => {
        if (current)
          setResult((prev) => ({
            forKey: requestKey,
            forBase: base,
            data: prev.forBase === base ? prev.data : null,
            error: errorMessage(e),
          }));
      });
    return () => {
      current = false;
    };
  }, [requestKey]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const setData = useCallback((updater: T | ((prev: T | null) => T)) => {
    setResult((prev) => ({
      ...prev,
      data: typeof updater === "function" ? (updater as (p: T | null) => T)(prev.data) : updater,
    }));
  }, []);

  const settled = result.forKey === requestKey;
  return {
    data: key !== null && result.forBase === key ? result.data : null,
    error: settled ? result.error : null,
    loading: requestKey !== null && !settled,
    reload,
    setData,
  };
}
