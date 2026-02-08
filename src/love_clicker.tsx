import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ConfettiOverlay } from './ui/ConfettiOverlay';
import { PixelButton } from './ui/PixelButton';
import { useLongPress } from './utils/useLongPress';

const loveMessages = [
  'ты моя кукуся',
  'очень сильно люблю<3',
  'ты самая лучшая',
  'мой лучик света',
  'с тобой так хорошо',
  'ты моё счастье',
  'ты - моя любовь',
  'самая мили девочка',
  'ты - мой дом',
  'без ума от тебя',
  'ты моя девочка',
  'ты моя сексуалка',
  'ты + я = <3',
  'мой пупсёныш',
  'обожаю тебя',
];

function pickNext(prev: string) {
  if (loveMessages.length <= 1) return loveMessages[0] ?? '';
  for (let i = 0; i < 8; i++) {
    const m = loveMessages[(Math.random() * loveMessages.length) | 0];
    if (m !== prev) return m;
  }
  return loveMessages[0] ?? '';
}

function hasDigit8(n: number) {
  return String(n).includes('8');
}
function allDigits8(n: number) {
  return /^8+$/.test(String(n));
}

export function LoveClickerGame({
  onBack,
  onToggleDebug,
  setDebugRefOverride,
}: {
  onBack: () => void;
  onToggleDebug: () => void;
  setDebugRefOverride: (v: { src: string; ox: number; oy: number } | null) => void;
}) {
  const lp = useLongPress(onToggleDebug, 520);

  const [clicks, setClicks] = useState(0);
  const [message, setMessage] = useState('Ты мой лучик света');
  const [confettiKeyBasic, setConfettiKeyBasic] = useState(0);
  const [confettiKeyHearts, setConfettiKeyHearts] = useState(0);

  const heartUrl = useMemo(() => '/assets/sprites/heart_big.png', []);

  useEffect(() => {
    setDebugRefOverride({ src: '/assets/ref/ref_games_screens/love_clicker_frame.png', ox: 0, oy: 0 });
    return () => setDebugRefOverride(null);
  }, [setDebugRefOverride]);

  useEffect(() => {
    const v = Number(localStorage.getItem('love_clicks') || '0');
    if (Number.isFinite(v) && v >= 0) setClicks(v);
  }, []);
  useEffect(() => {
    localStorage.setItem('love_clicks', String(clicks));
  }, [clicks]);

  const onHeart = () => {
    const next = clicks + 1;
    setClicks(next);
    if (next % 8 === 0) {
      setMessage((prev) => pickNext(prev));
    }

    // Confetti:
    // - Any number containing digit 8 => basic burst from top-left/top-right.
    // - "Hard" heart confetti ONLY for 8, 88, 888, ...
    if (allDigits8(next)) {
      setConfettiKeyHearts((k) => k + 1);
    } else if (hasDigit8(next)) {
      setConfettiKeyBasic((k) => k + 1);
    }
  };

  return (
    <div style={{ width: 375, height: 812, position: 'relative', background: '#FDF3F7' }}>
      {typeof document !== 'undefined' &&
        createPortal(
          <>
            <ConfettiOverlay burstKey={confettiKeyBasic} durationMs={650} emit="sides" kind="rect" rate={4} />
            <ConfettiOverlay
              burstKey={confettiKeyHearts}
              durationMs={1000}
              emit="sides"
              kind="heart"
              spriteUrl="/assets/sprites/heart_small.png"
              rate={7}
            />
          </>,
          document.body,
        )}

      <div
        className="ps2p"
        onPointerDown={lp.onPointerDown}
        onPointerUp={lp.onPointerUp}
        onPointerCancel={lp.onPointerCancel}
        onPointerLeave={lp.onPointerLeave}
        style={{
          position: 'absolute',
          top: 52,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: '#FF78A7',
          fontSize: 18,
          textShadow: '3px 3px 0 rgba(255,255,255,0.8)',
        }}
      >
        Любовный кликер
      </div>

      <div
        style={{
          position: 'absolute',
          top: 112,
          left: 32,
          right: 32,
          height: 98,
          background: '#ffffff',
          borderRadius: 10,
          border: '4px solid #FFB5D2',
          boxShadow: '0 6px 0 #FFB5D2',
        }}
      >
        <div
          className="ps2p"
          style={{
            textAlign: 'center',
            marginTop: 18,
            color: '#9B9B9B',
            fontSize: 10,
            letterSpacing: 1,
          }}
        >
          КЛИКОВ
        </div>
        <div
          className="ps2p"
          style={{
            textAlign: 'center',
            marginTop: 10,
            color: '#FF78A7',
            fontSize: 22,
          }}
        >
          {clicks}
        </div>
      </div>

      <PixelButton
        onClick={onHeart}
        style={{
          position: 'absolute',
          left: '50%',
          top: 390,
          transform: 'translate(-50%, -50%)',
          width: 112,
          height: 134,
          border: 0,
          background: 'transparent',
          padding: 0,
        }}
      >
        {/* Pixel-shadow without blur */}
        <img
          src={heartUrl}
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            left: 6,
            top: 8,
            width: '100%',
            height: '100%',
            opacity: 0.25,
            filter: 'brightness(0)',
          }}
        />
        <img
          src={heartUrl}
          alt=""
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'fill',
            display: 'block',
            position: 'relative',
          }}
        />
      </PixelButton>

      <PixelButton
        onClick={() => {}}
        className="ps2p"
        shadowY={6}
        shadowColor="#FFB5D2"
        style={{
          position: 'absolute',
          left: 32,
          right: 32,
          bottom: 112,
          height: 58,
          background: '#ffffff',
          borderRadius: 10,
          border: '4px solid #FFB5D2',
          color: '#FF78A7',
          fontSize: 10,
        }}
      >
        {message}
      </PixelButton>

      <PixelButton
        onClick={onBack}
        className="ps2p"
        shadowY={6}
        shadowColor="#D4527F"
        style={{
          position: 'absolute',
          left: 32,
          right: 32,
          bottom: 40,
          height: 58,
          background: '#FF78A7',
          border: '4px solid #D4527F',
          color: '#fff',
          fontSize: 12,
          textShadow: '2px 2px 0 rgba(0,0,0,0.25)',
        }}
      >
        Назад в меню
      </PixelButton>
    </div>
  );
}
