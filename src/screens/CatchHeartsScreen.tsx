import { useEffect, useMemo, useRef, useState } from 'react';
import { useLongPress } from '../utils/useLongPress';
import { PixelButton } from '../ui/PixelButton';

type Heart = {
  id: number;
  x: number;
  y: number;
  v: number; // px/sec
  s: number; // px size
};

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function rectsIntersect(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function CatchHeartsScreen({
  onBack,
  onToggleDebug,
  setDebugRefOverride,
}: {
  onBack: () => void;
  onToggleDebug: () => void;
  setDebugRefOverride: (v: { src: string; ox: number; oy: number } | null) => void;
}) {
  const heartSrc = useMemo(() => '/assets/sprites/heart_small.png', []);
  const starSrc = useMemo(() => '/assets/sprites/star.png', []);
  const catcherSrc = useMemo(() => '/assets/sprites/catch_hearts_sprite.png', []);

  const lp = useLongPress(onToggleDebug, 520);

  const [level, setLevel] = useState(1);
  const [caught, setCaught] = useState(0);
  const [combo, setCombo] = useState(0);
  const [missed, setMissed] = useState(0);
  const [mode, setMode] = useState<'play' | 'win' | 'fail'>('play');
  const [kiss, setKiss] = useState(false);

  const heartsRef = useRef<Heart[]>([]);
  const spawnAtRef = useRef<number>(0);
  const lastTRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const [, force] = useState(0);

  // Catcher position in design coords (x is left).
  const catcher = useRef({ x: 18 });
  const dragging = useRef<{ active: boolean; pointerId: number; dx: number }>({ active: false, pointerId: -1, dx: 0 });

  // Layout constants in design coords (375x812).
  const hud = { top: 22, left: 22, right: 22, h: 62 };
  const back = { left: 32, right: 32, bottom: 40, h: 58 };
  const field = {
    left: 0,
    right: 0,
    top: hud.top + hud.h + 14,
    bottom: 812 - back.bottom - back.h - 8,
  };

  // Catcher image size as in ref scale.
  const catcherDraw = { w: 166, h: 296, bottom: back.bottom + back.h + 16 };

  const catcherBounds = useMemo(() => {
    const minX = 0;
    const maxX = 375 - catcherDraw.w;
    return { minX, maxX };
  }, [mode]);

  useEffect(() => {
    setDebugRefOverride({ src: '/assets/ref/ref_games_screens/catch_hearts_frame.png', ox: 0, oy: 0 });
    return () => setDebugRefOverride(null);
  }, [setDebugRefOverride]);

  const daysSince = () => {
    const start = Date.UTC(2023, 10, 12); // 12.11.2023
    const now = Date.now();
    return Math.max(1, Math.floor((now - start) / (24 * 3600 * 1000)));
  };

  const levelTarget = useMemo(() => {
    if (level === 1) return 50;
    if (level === 2) return 88;
    if (level === 3) return 100;
    if (level === 4) return 150;
    if (level === 5) return 188;
    if (level === 6) return 200;
    if (level === 7) return 300;
    if (level === 8) return 400;
    if (level === 9) return 500;
    if (level === 10) return 600;
    if (level === 11) return 700;
    return daysSince();
  }, [level]);

  const missLimit = Math.floor(levelTarget * 0.3);

  const resetLevel = (nextLevel: number) => {
    setLevel(nextLevel);
    setCaught(0);
    setCombo(0);
    setMissed(0);
    setMode('play');
    setKiss(false);
    heartsRef.current = [];
    spawnAtRef.current = performance.now() + 700;
  };

  useEffect(() => {
    spawnAtRef.current = performance.now() + 700;
    const loop = (t: number) => {
      if (mode !== 'play') {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      const last = lastTRef.current || t;
      lastTRef.current = t;
      const dt = Math.min(0.05, (t - last) / 1000);

      const fieldH = field.bottom - field.top;
      const baseV = fieldH / 5; // ~5 sec top->bottom at level 1

      // Spawn with random interval 700..1200ms.
      if (t >= spawnAtRef.current) {
        const id = (t * 1000) | 0;
        const s = 18;
        const x = 20 + Math.random() * (375 - 40 - s);
        const v = baseV * (0.75 + Math.random() * 0.75);
        heartsRef.current.push({ id, x, y: field.top - 20, v, s });
        spawnAtRef.current = t + (700 + Math.random() * 500);
      }

      const hearts = heartsRef.current;
      const catcherX = catcher.current.x;
      const catcherY = 812 - catcherDraw.bottom - catcherDraw.h;

      // Hitbox: hands/upper torso (tuned to the sprite).
      const catcherHit = {
        x: catcherX + 30,
        y: catcherY + 34,
        w: 108,
        h: 74,
      };

      let missed = false;
      for (let i = hearts.length - 1; i >= 0; i--) {
        const h = hearts[i];
        h.y += h.v * dt;

        const heartHit = { x: h.x + 2, y: h.y + 2, w: h.s - 4, h: h.s - 4 };
        if (rectsIntersect(heartHit, catcherHit)) {
          hearts.splice(i, 1);
          setCaught((v) => v + 1);
          setCombo((v) => v + 1);
          continue;
        }

        if (h.y > field.bottom + 10) {
          hearts.splice(i, 1);
          missed = true;
        }
      }
      if (missed) {
        setCombo(0);
        setMissed((v) => v + 1);
      }

      force((v) => (v + 1) % 100000);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDownField = (e: React.PointerEvent) => {
    const px = e.nativeEvent.offsetX;
    const nextX = clamp(px - catcherDraw.w / 2, catcherBounds.minX, catcherBounds.maxX);
    catcher.current.x = nextX;
    dragging.current = { active: true, pointerId: e.pointerId, dx: px - catcher.current.x };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMoveField = (e: React.PointerEvent) => {
    const d = dragging.current;
    if (!d.active || d.pointerId !== e.pointerId) return;
    const px = e.nativeEvent.offsetX;
    catcher.current.x = clamp(px - d.dx, catcherBounds.minX, catcherBounds.maxX);
  };

  const onPointerUpField = (e: React.PointerEvent) => {
    const d = dragging.current;
    if (d.pointerId !== e.pointerId) return;
    dragging.current.active = false;
  };

  // Ref shows x0 at start; treat combo as "streak count" and display multiplier (streak-1).
  const comboX = Math.max(0, combo - 1);

  useEffect(() => {
    if (mode !== 'play') return;
    if (missed > missLimit) {
      setMode('fail');
      heartsRef.current = [];
      return;
    }
    if (caught >= levelTarget) {
      if (level >= 12) {
        setMode('win');
        heartsRef.current = [];
        setKiss(false);
        setTimeout(() => setKiss(true), 1000);
      } else {
        resetLevel(level + 1);
      }
    }
  }, [caught, level, levelTarget, missLimit, missed, mode]);

  return (
    <div style={{ width: 375, height: 812, position: 'relative', background: '#E7D0FF', overflow: 'hidden' }}>
      {/* HUD (long press here toggles debug; screen has no separate title) */}
      <div
        onPointerDown={lp.onPointerDown}
        onPointerUp={lp.onPointerUp}
        onPointerCancel={lp.onPointerCancel}
        onPointerLeave={lp.onPointerLeave}
        style={{
          position: 'absolute',
          top: hud.top,
          left: hud.left,
          right: hud.right,
          height: hud.h,
          background: '#ffffff',
          borderRadius: 10,
          border: '4px solid #FF78A7',
          boxShadow: '0 6px 0 rgba(0,0,0,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={heartSrc} alt="" draggable={false} style={{ width: 20, height: 20 }} />
          <div>
            <div className="ps2p" style={{ fontSize: 10, color: '#9B9B9B', lineHeight: '10px' }}>
              очки
            </div>
            <div className="ps2p" style={{ fontSize: 12, color: '#FF78A7', marginTop: 6 }}>
              {caught}/{levelTarget}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div className="ps2p" style={{ fontSize: 10, color: '#9B9B9B', lineHeight: '10px' }}>
              комбо
            </div>
            <div className="ps2p" style={{ fontSize: 12, color: '#FF78A7', marginTop: 6 }}>
              x{comboX}
            </div>
          </div>
          <img src={starSrc} alt="" draggable={false} style={{ width: 22, height: 22 }} />
        </div>
      </div>

      {/* Field (drag anywhere) */}
      <div
        onPointerDown={onPointerDownField}
        onPointerMove={onPointerMoveField}
        onPointerUp={onPointerUpField}
        onPointerCancel={onPointerUpField}
        style={{
          position: 'absolute',
          left: field.left,
          right: field.right,
          top: field.top,
          bottom: 812 - field.bottom,
          touchAction: 'none',
        }}
      >
        {/* Hearts (pointer-events none so they don't break drag on iOS) */}
        {heartsRef.current.map((h) => (
          <img
            key={h.id}
            src={heartSrc}
            alt=""
            draggable={false}
            style={{
              position: 'absolute',
              left: Math.round(h.x),
              top: Math.round(h.y - field.top),
              width: h.s,
              height: h.s,
              pointerEvents: 'none',
            }}
          />
        ))}
      </div>

      {/* Catcher */}
      <img
        src={catcherSrc}
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          left: Math.round(catcher.current.x),
          bottom: catcherDraw.bottom,
          width: catcherDraw.w,
          height: catcherDraw.h,
          pointerEvents: 'none',
        }}
      />

      {mode === 'play' && (
        <PixelButton
          onClick={onBack}
          className="ps2p"
          shadowY={6}
          shadowColor="#D4527F"
          style={{
            position: 'absolute',
            left: back.left,
            right: back.right,
            bottom: back.bottom,
            height: back.h,
            background: '#FF78A7',
            border: '4px solid #D4527F',
            color: '#fff',
            fontSize: 12,
            textShadow: '2px 2px 0 rgba(0,0,0,0.25)',
          }}
        >
          Назад в меню
        </PixelButton>
      )}

      {mode === 'fail' && (
        <div style={{ position: 'absolute', left: 22, right: 22, bottom: 120, textAlign: 'center' }}>
          <div className="ps2p" style={{ color: '#FF78A7', fontSize: 12, marginBottom: 12 }}>
            Слишком много пропусков
          </div>
          <PixelButton
            onClick={() => resetLevel(level)}
            className="ps2p"
            shadowY={6}
            shadowColor="#B6A4E8"
            style={{
              width: '100%',
              height: 54,
              background: '#FFFFFF',
              border: '4px solid #B6A4E8',
              color: '#7D67D9',
              fontSize: 10,
              marginBottom: 10,
            }}
          >
            Повторить уровень
          </PixelButton>
          <PixelButton
            onClick={onBack}
            className="ps2p"
            shadowY={6}
            shadowColor="#D4527F"
            style={{
              width: '100%',
              height: 54,
              background: '#FF78A7',
              border: '4px solid #D4527F',
              color: '#fff',
              fontSize: 10,
            }}
          >
            Назад в меню
          </PixelButton>
        </div>
      )}

      {mode === 'win' && (
        <div style={{ position: 'absolute', left: 22, right: 22, top: 160, textAlign: 'center' }}>
          <img
            src={kiss ? '/assets/sprites/couple_kiss.png' : '/assets/sprites/couple_hug.png'}
            alt=""
            draggable={false}
            style={{ width: 220, height: 'auto', imageRendering: 'pixelated' }}
          />
          <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
            <PixelButton
              onClick={() => resetLevel(1)}
              className="ps2p"
              shadowY={6}
              shadowColor="#B6A4E8"
              style={{
                height: 54,
                background: '#FFFFFF',
                border: '4px solid #B6A4E8',
                color: '#7D67D9',
                fontSize: 10,
              }}
            >
              Начать заново
            </PixelButton>
            <PixelButton
              onClick={onBack}
              className="ps2p"
              shadowY={6}
              shadowColor="#D4527F"
              style={{
                height: 54,
                background: '#FF78A7',
                border: '4px solid #D4527F',
                color: '#fff',
                fontSize: 10,
              }}
            >
              Назад в меню
            </PixelButton>
          </div>
        </div>
      )}
    </div>
  );
}
