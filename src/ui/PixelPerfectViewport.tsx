import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

export type DesignSize = { w: number; h: number };

type Measure = { w: number; h: number };

function useVisualViewportSize(): Measure {
  const [m, setM] = useState<Measure>(() => ({
    w: Math.round(window.visualViewport?.width ?? window.innerWidth),
    h: Math.round(window.visualViewport?.height ?? window.innerHeight),
  }));

  useEffect(() => {
    const vv = window.visualViewport;
    const on = () =>
      setM({
        w: Math.round(vv?.width ?? window.innerWidth),
        h: Math.round(vv?.height ?? window.innerHeight),
      });

    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    vv?.addEventListener('resize', on);
    vv?.addEventListener('scroll', on);
    on();
    return () => {
      window.removeEventListener('resize', on);
      window.removeEventListener('orientationchange', on);
      vv?.removeEventListener('resize', on);
      vv?.removeEventListener('scroll', on);
    };
  }, []);

  return m;
}

export function PixelPerfectViewport({
  design,
  background,
  children,
}: {
  design: DesignSize;
  background: string;
  children: (ctx: { scale: number; isLandscape: boolean }) => React.ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const safeRef = useRef<HTMLDivElement | null>(null);

  const vv = useVisualViewportSize();
  const [safeBox, setSafeBox] = useState<Measure>(() => ({ w: vv.w, h: vv.h }));

  // Measure the real "safe-area padded" content box. This prevents iOS Safari side clipping.
  useLayoutEffect(() => {
    const el = safeRef.current;
    if (!el) return;
    let raf: number | null = null;

    const measure = () => {
      const r = el.getBoundingClientRect();
      setSafeBox({ w: Math.round(r.width), h: Math.round(r.height) });
      raf = null;
    };
    const on = () => {
      if (raf != null) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    on();

    const ro = new ResizeObserver(() => on());
    ro.observe(el);
    window.addEventListener('resize', on);
    window.addEventListener('orientationchange', on);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', on);
      window.removeEventListener('orientationchange', on);
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [vv.w, vv.h]);

  const scaleExact = Math.min(safeBox.w / design.w, safeBox.h / design.h);
  const scaleInt = Math.floor(scaleExact);
  const scale = scaleInt >= 1 ? scaleInt : scaleExact;
  const isLandscape = safeBox.w > safeBox.h;

  const ctx = useMemo(() => ({ scale, isLandscape }), [scale, isLandscape]);

  // Keep the outer background in sync (prevents black sidebars).
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    el.style.background = background;
  }, [background]);

  return (
    <div
      ref={rootRef}
      className="ppv-root"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background,
        // Keep taps/clicks reliable on iOS Safari; scroll/zoom is prevented elsewhere.
        touchAction: 'manipulation',
        overscrollBehavior: 'none',
      }}
    >
      <div
        ref={safeRef}
        style={{
          position: 'absolute',
          inset: 0,
          paddingTop: 'env(safe-area-inset-top)',
          paddingRight: 'env(safe-area-inset-right)',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: design.w,
            height: design.h,
            transform: `translate(-50%, -50%) scale(${scale})`,
            transformOrigin: 'center',
          }}
        >
          {children(ctx)}
        </div>
      </div>
    </div>
  );
}
