import { useCallback, useRef, useState } from 'react';

/**
 * Helper anti-double clic pour actions async “critiques” (évite les envois multiples).
 * Usage : `const { run, pending } = useAsyncAction(); await run(() => apiCall())`.
 */
export function useAsyncAction() {
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);

  const run = useCallback(async <T,>(action: () => Promise<T>) => {
    if (pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    try {
      return await action();
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, []);

  return { pending, run } as const;
}

