import { useEffect, useMemo, useState } from 'react';
import { DebugOverlay } from './ui/DebugOverlay';
import { MenuScreen } from './screens/MenuScreen';
import { CatchHeartsScreen } from './screens/CatchHeartsScreen';
import { MazeGame } from './maze_game';
import { LoveClickerGame } from './love_clicker';
import { PixelPerfectViewport, type DesignSize } from './ui/PixelPerfectViewport';
import { useSecretTap } from './utils/useSecretTap';

export type ScreenId = 'menu' | 'catch' | 'maze' | 'clicker';

const DESIGN: DesignSize = { w: 375, h: 812 };

export function App() {
  const [screen, setScreen] = useState<ScreenId>('menu');
  const [debug, setDebug] = useState(false);
  const [debugRefOverride, setDebugRefOverride] = useState<{ src: string; ox: number; oy: number } | null>(null);
  const secretTap = useSecretTap(() => setDebug((v) => !v));

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'd' || e.key === 'D' || e.code === 'KeyD') setDebug((v) => !v);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    // iOS Safari: stop pinch/gesture zoom and wheel scroll while keeping pointer clicks working.
    const stop = (e: Event) => e.preventDefault();
    window.addEventListener('gesturestart', stop as any, { passive: false } as any);
    window.addEventListener('gesturechange', stop as any, { passive: false } as any);
    window.addEventListener('gestureend', stop as any, { passive: false } as any);
    window.addEventListener('wheel', stop, { passive: false });
    return () => {
      window.removeEventListener('gesturestart', stop as any);
      window.removeEventListener('gesturechange', stop as any);
      window.removeEventListener('gestureend', stop as any);
      window.removeEventListener('wheel', stop);
    };
  }, []);

  const ref = useMemo(() => {
    if (debugRefOverride) return debugRefOverride;
    switch (screen) {
      case 'menu':
        return { src: '/assets/ref/ref_menu_frames/ref_menu_frame1.png', ox: 0, oy: 0 };
      case 'catch':
        return { src: '/assets/ref/ref_games_screens/catch_hearts_frame.png', ox: 0, oy: 0 };
      case 'maze':
        // Export is 1516px wide; at 0.25 scale it's 379 design px, so shift -2 to align center.
        return { src: '/assets/ref/ref_games_screens/find_each_other_game_frame.png', ox: -2, oy: 0 };
      case 'clicker':
        return { src: '/assets/ref/ref_games_screens/love_clicker_frame.png', ox: 0, oy: 0 };
    }
  }, [screen, debugRefOverride]);

  const bg = useMemo(() => {
    switch (screen) {
      case 'menu':
        return '#9DD3B3';
      case 'catch':
        return '#E7D0FF';
      case 'maze':
        return '#EDE2FF';
      case 'clicker':
        return '#FDF3F7';
    }
  }, [screen]);

  return (
    <PixelPerfectViewport design={DESIGN} background={bg}>
      {(ctx) => (
        <div style={{ width: DESIGN.w, height: DESIGN.h, position: 'relative' }}>
          {screen === 'menu' && (
            <MenuScreen
              onSecretTap={secretTap}
              onToggleDebug={() => setDebug((v) => !v)}
              onGoCatch={() => setScreen('catch')}
              onGoMaze={() => setScreen('maze')}
              onGoClicker={() => setScreen('clicker')}
              setDebugRefOverride={setDebugRefOverride}
            />
          )}

          {screen === 'catch' && (
            <CatchHeartsScreen
              onBack={() => {
                setDebugRefOverride(null);
                setScreen('menu');
              }}
              onToggleDebug={() => setDebug((v) => !v)}
              setDebugRefOverride={setDebugRefOverride}
            />
          )}

          {screen === 'maze' && (
            <MazeGame
              onBack={() => {
                setDebugRefOverride(null);
                setScreen('menu');
              }}
              onToggleDebug={() => setDebug((v) => !v)}
              setDebugRefOverride={setDebugRefOverride}
            />
          )}

          {screen === 'clicker' && (
            <LoveClickerGame
              onBack={() => {
                setDebugRefOverride(null);
                setScreen('menu');
              }}
              onToggleDebug={() => setDebug((v) => !v)}
              setDebugRefOverride={setDebugRefOverride}
            />
          )}

          <DebugOverlay enabled={debug} design={DESIGN} refImage={ref} />

          {ctx.isLandscape && (
            <div
              className="ps2p"
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.85)',
                color: '#fff',
                zIndex: 9999,
                fontSize: 12,
                textAlign: 'center',
                padding: 24,
              }}
            >
              Поверни телефон вертикально
            </div>
          )}
        </div>
      )}
    </PixelPerfectViewport>
  );
}

