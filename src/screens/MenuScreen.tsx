import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLongPress } from '../utils/useLongPress';
import { PixelButton } from '../ui/PixelButton';

export function MenuScreen({
  onGoCatch,
  onGoMaze,
  onGoClicker,
  onSecretTap,
  onToggleDebug,
  setDebugRefOverride,
}: {
  onGoCatch: () => void;
  onGoMaze: () => void;
  onGoClicker: () => void;
  onSecretTap: () => void;
  onToggleDebug: () => void;
  setDebugRefOverride: (v: { src: string; ox: number; oy: number } | null) => void;
}) {
  const [isKiss, setIsKiss] = useState(false);
  const lp = useLongPress(onToggleDebug, 520);

  // Scale settings
  const COUPLE_SCALE = 1.35;
  const CAT_SCALE = 1;

  const zzzSrc = useMemo(() => '/assets/sprites/zzz.png', []);
  const [zzzOk, setZzzOk] = useState(true);
  const zzzWarned = useRef(false);
  // Simple Z "particle" loop (fallback to text if no sprite).
  const [zzz, setZzz] = useState<Array<{ id: number; x: number; y: number }>>([]);
  useEffect(() => {
    const int = window.setInterval(() => {
      setZzz((prev) => {
        const now = performance.now();
        const next = prev.slice(-6);
        next.push({ id: Math.floor(now), x: 100 + Math.random() * 12, y: 740 });
        return next;
      });
    }, 2000);
    return () => window.clearInterval(int);
  }, []);

  const coupleSrc = isKiss ? '/assets/sprites/couple_kiss.png' : '/assets/sprites/couple_hug.png';

  useEffect(() => {
    setDebugRefOverride({
      src: isKiss
        ? '/assets/ref/ref_menu_frames/ref_menu_frame2.png'
        : '/assets/ref/ref_menu_frames/ref_menu_frame1.png',
      ox: 0,
      oy: 0,
    });
    return () => setDebugRefOverride(null);
  }, [isKiss, setDebugRefOverride]);

  const marqueeText = useMemo(() => 'made with love '.repeat(24).trim(), []);

  const marquee = typeof document !== 'undefined'
    ? createPortal(
        <div
          style={{
            position: 'fixed',
            right: 0,
            top: 0,
            bottom: 0,
            width: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            pointerEvents: 'none',
            zIndex: 20,
          }}
        >
          <div
            className="ps2p"
            style={{
              writingMode: 'vertical-rl',
              transform: 'rotate(180deg)',
              color: '#ffffff',
              opacity: 0.9,
              fontSize: 10,
              letterSpacing: 1,
              animation: 'marqueeY 6s linear infinite',
              whiteSpace: 'nowrap',
            }}
          >
            {marqueeText}
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      {marquee}
      <div
        style={{
          width: 375,
          height: 812,
          position: 'relative',
          background: '#9DD3B3',
          overflow: 'hidden',
        }}
      >
      {/* Secret debug toggle hotspot */}
      <div
        onPointerDown={onSecretTap}
        style={{ position: 'absolute', left: 0, top: 0, width: 44, height: 44, zIndex: 50 }}
      />

      {/* Title */}
      <div style={{ position: 'absolute', top: 76, left: 0, right: 0, textAlign: 'center' }}>
        <div
          className="ps2p"
          onPointerDown={lp.onPointerDown}
          onPointerUp={lp.onPointerUp}
          onPointerCancel={lp.onPointerCancel}
          onPointerLeave={lp.onPointerLeave}
          style={{
            color: '#ffffff',
            fontSize: 22,
            textShadow: '3px 3px 0 rgba(0,0,0,0.18)',
          }}
        >
          Two of us
        </div>
        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'center', gap: 10, alignItems: 'center' }}>
          <div style={{ width: 64, height: 4, background: '#E44B8A' }} />
          <img
            src="/assets/sprites/heart_small.png"
            alt=""
            draggable={false}
            style={{ width: 24, height: 24, imageRendering: 'pixelated' }}
          />
          <div style={{ width: 64, height: 4, background: '#E44B8A' }} />
        </div>
      </div>

      {/* Buttons */}
      <div style={{ position: 'absolute', top: 244, left: 0, right: 0, display: 'grid', gap: 18 }}>
        <MenuButton src="/assets/ui/catch_hearts_button.png" alt="Поймай сердечки" onClick={onGoCatch} />
        <MenuButton src="/assets/ui/labyrinth_button.png" alt="Лабиринтик" onClick={onGoMaze} />
        <MenuButton src="/assets/ui/love_clicker_button.png" alt="Любовный кликер" onClick={onGoClicker} />
      </div>

      {/* Couple + Cat */}
      <div style={{ position: 'absolute', left: 0, right: 32, bottom: 0, height: 330 }}>
        <img
          src={coupleSrc}
          alt=""
          draggable={false}
          onPointerDown={() => setIsKiss((v) => !v)}
          style={{
            position: 'absolute',
            left: 50,
            bottom: 0,
            width: 210 * COUPLE_SCALE,
            height: 'auto',
            cursor: 'pointer',
          }}
        />
        <img
          src="/assets/sprites/cat_sleep.png"
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            left: 16,
            bottom: 3,
            width: 170 * CAT_SCALE,
            height: 'auto',
          }}
        />

      </div>

      {/* Zzz layer */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: 375, height: 812, pointerEvents: 'none', zIndex: 5 }}>
        {zzz.map((p) => (
          <div
            key={p.id}
            className="ps2p"
            style={{
              position: 'absolute',
              left: p.x,
              top: p.y,
              color: '#111',
              fontSize: 10,
              opacity: 0,
              animation: 'zzzFloat 0.9s linear forwards',
            }}
          >
            {zzzOk ? (
              <img
                src={zzzSrc}
                alt=""
                draggable={false}
                style={{ width: 14, height: 14, imageRendering: 'pixelated' }}
                onError={() => {
                  if (!zzzWarned.current) {
                    // eslint-disable-next-line no-console
                    console.warn('zzz.png not found, falling back to text Z');
                    zzzWarned.current = true;
                  }
                  setZzzOk(false);
                }}
              />
            ) : (
              <span>Z</span>
            )}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes marqueeY {
          0% { transform: rotate(180deg) translateY(0); }
          100% { transform: rotate(180deg) translateY(220px); }
        }
        @keyframes zzzFloat {
          0% { transform: translateY(0); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateY(-26px); opacity: 0; }
        }
      `}</style>
    </div>
    </>
  );
}

function MenuButton({
  src,
  alt,
  onClick,
}: {
  src: string;
  alt: string;
  onClick: () => void;
}) {
  return (
    <PixelButton
      onClick={onClick}
      style={{
        border: 0,
        background: 'transparent',
        padding: 0,
        margin: '0 auto',
        width: 250,
        height: 58,
      }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </PixelButton>
  );
}
