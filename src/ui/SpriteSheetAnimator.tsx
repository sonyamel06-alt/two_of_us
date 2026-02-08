import { useEffect, useMemo, useRef, useState } from 'react';

export type SpriteSheetConfig = {
  sheetUrl: string;
  frameW: number;
  frameH: number;
  cols: number;
  rows: number;
  // Frame sequences in "frame index" (0..cols*rows-1)
  seqUp: number[];
  seqDown: number[];
  seqSide: number[];
};

export type SpriteDir = 'up' | 'down' | 'left' | 'right';

function pickSeq(cfg: SpriteSheetConfig, dir: SpriteDir) {
  if (dir === 'up') return cfg.seqUp;
  if (dir === 'down') return cfg.seqDown;
  return cfg.seqSide;
}

export function SpriteSheetAnimator({
  cfg,
  dir,
  moving,
  fps,
  scale,
}: {
  cfg: SpriteSheetConfig;
  dir: SpriteDir;
  moving: boolean;
  fps: number;
  scale: number;
}) {
  const [, setTick] = useState(0);
  const idxRef = useRef(0);
  const lastRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const loop = (t: number) => {
      if (moving) {
        const stepMs = 1000 / Math.max(1, fps);
        if (lastRef.current === 0) lastRef.current = t;
        if (t - lastRef.current >= stepMs) {
          idxRef.current += 1;
          lastRef.current = t;
          setTick((v) => (v + 1) % 100000);
        }
      } else if (idxRef.current !== 0 || lastRef.current !== 0) {
        idxRef.current = 0;
        lastRef.current = 0;
        setTick((v) => (v + 1) % 100000);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [moving, fps]);

  const seq = useMemo(() => pickSeq(cfg, dir), [cfg, dir]);
  const frameIndex = moving ? seq[idxRef.current % seq.length] : seq[0];

  const col = frameIndex % cfg.cols;
  const row = Math.floor(frameIndex / cfg.cols);

  const w = Math.round(cfg.frameW * scale);
  const h = Math.round(cfg.frameH * scale);
  const sheetW = Math.round(cfg.frameW * cfg.cols * scale);
  const sheetH = Math.round(cfg.frameH * cfg.rows * scale);
  const bgX = -Math.round(col * cfg.frameW * scale);
  const bgY = -Math.round(row * cfg.frameH * scale);

  const flip = dir === 'left';

  return (
    <div
      style={{
        width: w,
        height: h,
        overflow: 'hidden',
        position: 'relative',
        transform: flip ? 'scaleX(-1)' : undefined,
        transformOrigin: 'center',
      }}
    >
      {/* Use <img> crop instead of background-image: better pixel rendering & fewer iOS quirks. */}
      <img
        src={cfg.sheetUrl}
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          left: bgX,
          top: bgY,
          width: sheetW,
          height: sheetH,
          maxWidth: 'none',
          maxHeight: 'none',
          display: 'block',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />
    </div>
  );
}
