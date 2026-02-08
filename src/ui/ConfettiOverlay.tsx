import { useEffect, useRef, useState } from 'react';

type P = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  vr: number;
  color: string;
};

export function ConfettiOverlay({
  burstKey,
  durationMs,
  emit = 'top',
  kind = 'rect',
  spriteUrl,
  rate = 2,
}: {
  burstKey: number;
  durationMs: number;
  emit?: 'top' | 'sidesTop' | 'sides';
  kind?: 'rect' | 'heart';
  spriteUrl?: string;
  rate?: number;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const raf = useRef<number | null>(null);
  const ps = useRef<P[]>([]);
  const [active, setActive] = useState(false);
  const activeRef = useRef(false);
  const until = useRef(0);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const sizeRef = useRef<{ w: number; h: number; dpr: number }>({ w: 0, h: 0, dpr: 1 });

  useEffect(() => {
    if (burstKey === 0) return;
    setActive(true);
    activeRef.current = true;
    until.current = performance.now() + durationMs;
  }, [burstKey, durationMs]);

  useEffect(() => {
    if (kind !== 'heart' || !spriteUrl) return;
    const img = new Image();
    img.src = spriteUrl;
    imgRef.current = img;
  }, [kind, spriteUrl]);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const resize = () => {
      // Must use the OUTER viewport, not PixelPerfectViewport design size.
      const w = Math.max(1, Math.floor(window.innerWidth));
      const h = Math.max(1, Math.floor(window.innerHeight));
      const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
      sizeRef.current = { w, h, dpr };
      c.style.width = `${w}px`;
      c.style.height = `${h}px`;
      c.width = w * dpr;
      c.height = h * dpr;
      // Draw in CSS pixels.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
    };
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('orientationchange', resize);

    const colors = ['#FF78A7', '#77B4FF', '#FFB85E', '#C7B7FF', '#FFFFFF'];

    const spawn = (n: number) => {
      for (let i = 0; i < n; i++) {
        const { w: W, h: H } = sizeRef.current;
        const fromSides = emit === 'sidesTop' || emit === 'sides';
        const fromLeft = fromSides ? Math.random() < 0.5 : false;
        const x =
          emit === 'sides'
            ? fromLeft
              ? 0
              : W
            : emit === 'sidesTop'
              ? fromLeft
                ? 18
                : W - 18
              : Math.random() * W;
        const y =
          emit === 'sides'
            ? 130 + Math.random() * 10
            : -10 - Math.random() * 90;

        const baseVx =
          emit === 'sides'
            ? fromLeft
              ? 1
              : -1
            : fromSides
              ? fromLeft
                ? 1
                : -1
              : Math.random() - 0.5;

        const baseVy = emit === 'sides' ? (-0.8 + Math.random() * 0.8) : 1;
        ps.current.push({
          x,
          y,
          vx:
            emit === 'sides'
              ? baseVx * (1 + Math.random() * 80)
              : baseVx * (1.4 + Math.random() * 1.2),
          vy: emit === 'sides' ? baseVy : 1.5 + Math.random() * 2.4,
          w: kind === 'heart' ? 12 : 4 + Math.floor(Math.random() * 4),
          h: kind === 'heart' ? 12 : 4 + Math.floor(Math.random() * 6),
          rot: Math.random() * Math.PI * 2,
          vr: (Math.random() - 0.5) * 0.12,
          color: colors[(Math.random() * colors.length) | 0],
        });

        // Force spawn flush to physical edge: start just offscreen so it enters from the edge.
        const p = ps.current[ps.current.length - 1];
        if (emit === 'sides') {
          p.x = fromLeft ? -p.w : W + p.w;
        }
      }
    };

    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 16.666);
      last = t;

      const { w: W, h: H } = sizeRef.current;
      ctx.clearRect(0, 0, W, H);
      const now = performance.now();
      const isOn = activeRef.current && now < until.current;
      if (activeRef.current && !isOn) {
        activeRef.current = false;
        setActive(false);
      }
      if (isOn) spawn(rate);

      const arr = ps.current;
      for (let i = arr.length - 1; i >= 0; i--) {
        const p = arr[i];
        p.x += p.vx * dt * 2.6;
        p.y += p.vy * dt * 3.2;
        p.rot += p.vr * dt * 4;
        p.vy += 0.06 * dt;
        if (p.y > H + 30 || p.x < -40 || p.x > W + 40) {
          arr.splice(i, 1);
          continue;
        }

        const ix = (p.x - p.w / 2) | 0;
        const iy = (p.y - p.h / 2) | 0;

        if (kind === 'heart' && imgRef.current && imgRef.current.complete) {
          // Hearts: no rotation to keep them crisp.
          ctx.drawImage(imgRef.current, ix, iy, p.w | 0, p.h | 0);
        } else {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(((-p.w / 2) | 0), ((-p.h / 2) | 0), p.w | 0, p.h | 0);
          ctx.restore();
        }
      }

      raf.current = requestAnimationFrame(loop);
    };

    raf.current = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('orientationchange', resize);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  // Always render the canvas so refs/effects are stable (React 18 StrictMode mounts effects twice in dev).
  return (
    <canvas
      ref={ref}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 999,
        display: active || ps.current.length ? 'block' : 'none',
        overflow: 'hidden',
      }}
    />
  );
}
