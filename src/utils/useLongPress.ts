import { useMemo, useRef } from 'react';

export function useLongPress(onLongPress: () => void, ms = 520) {
  const t = useRef<number | null>(null);
  const fired = useRef(false);

  return useMemo(() => {
    const clear = () => {
      if (t.current != null) window.clearTimeout(t.current);
      t.current = null;
    };

    return {
      onPointerDown: () => {
        fired.current = false;
        clear();
        t.current = window.setTimeout(() => {
          fired.current = true;
          onLongPress();
        }, ms);
      },
      onPointerUp: () => clear(),
      onPointerCancel: () => clear(),
      onPointerLeave: () => clear(),
      // Used when you want to prevent click from firing after long-press.
      didLongPress: () => fired.current,
    };
  }, [onLongPress, ms]);
}

