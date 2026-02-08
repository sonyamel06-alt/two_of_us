import type { DesignSize } from './PixelPerfectViewport';

export function DebugOverlay({
  enabled,
  design,
  refImage,
}: {
  enabled: boolean;
  design: DesignSize;
  refImage: { src: string; ox: number; oy: number };
}) {
  if (!enabled) return null;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 10000,
      }}
    >
      <img
        alt=""
        src={refImage.src}
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          opacity: 0.35,
          transform: `translate(${refImage.ox}px, ${refImage.oy}px) scale(${design.h / 3248})`,
          transformOrigin: 'top left',
        }}
      />
    </div>
  );
}
