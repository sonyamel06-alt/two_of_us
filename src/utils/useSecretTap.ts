import { useMemo, useRef } from 'react';

// 5 taps within 1.2s toggles debug overlay (mobile-friendly).
export function useSecretTap(onTrigger: () => void) {
  const ref = useRef<{ n: number; t0: number }>({ n: 0, t0: 0 });
  return useMemo(() => {
    return () => {
      const now = performance.now();
      const s = ref.current;
      if (s.t0 === 0 || now - s.t0 > 1200) {
        s.t0 = now;
        s.n = 1;
        return;
      }
      s.n += 1;
      if (s.n >= 5) {
        s.t0 = 0;
        s.n = 0;
        onTrigger();
      }
    };
  }, [onTrigger]);
}

