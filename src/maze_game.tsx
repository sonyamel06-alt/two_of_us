import { useEffect, useMemo, useRef, useState } from 'react';
import { ConfettiOverlay } from './ui/ConfettiOverlay';
import { PixelButton } from './ui/PixelButton';
import { useLongPress } from './utils/useLongPress';
import { generateMaze, isFloor, randomFloor, type Maze } from './utils/mazeGen';

type Dir = 'up' | 'down' | 'left' | 'right';

const ME_FRAMES = Array.from({ length: 21 }, (_, i) => `/assets/sprites/me_frames/frame_${String(i).padStart(2, '0')}.png`);
const GF_FRAMES = Array.from({ length: 21 }, (_, i) => `/assets/sprites/gf_frames/frame_${String(i).padStart(2, '0')}.png`);

const SEQ = {
  down: [0, 1, 2, 3, 4, 5, 6], // facing front
  side: [7, 8, 9, 10, 11, 12, 13], // facing right
  up: [14, 15, 16, 17, 18, 19, 20], // facing back
};

const ME_SEQ = {
  down: [0, 1], // front
  left: [3, 4, 5, 6, 9, 10, 11, 12, 13],
  up: [14, 15, 16, 17, 18, 19, 20],
};

const DPAD = {
  cell: 56,
  border: 4,
  gap: 10,
};


function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

function dirFromStep(a: { x: number; y: number }, b: { x: number; y: number }): Dir {
  if (b.x > a.x) return 'right';
  if (b.x < a.x) return 'left';
  if (b.y > a.y) return 'down';
  return 'up';
}

function nextStepToward(m: Maze, from: { x: number; y: number }, to: { x: number; y: number }) {
  const W = m.size;
  const H = m.size;
  const key = (x: number, y: number) => y * 1024 + x;
  const startK = key(from.x, from.y);
  const goalK = key(to.x, to.y);
  const q: Array<{ x: number; y: number }> = [from];
  const prev = new Map<number, number>();
  prev.set(startK, -1);
  const dirs = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];
  while (q.length) {
    const cur = q.shift()!;
    const ck = key(cur.x, cur.y);
    if (ck === goalK) break;
    for (const d of dirs) {
      const nx = cur.x + d.dx;
      const ny = cur.y + d.dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      if (!isFloor(m, nx, ny)) continue;
      const nk = key(nx, ny);
      if (prev.has(nk)) continue;
      prev.set(nk, ck);
      q.push({ x: nx, y: ny });
    }
  }
  if (!prev.has(goalK)) return null;
  let k = goalK;
  let pk = prev.get(k)!;
  while (pk !== -1 && pk !== startK) {
    k = pk;
    pk = prev.get(k)!;
  }
  if (pk !== startK) return null;
  return { x: k % 1024, y: Math.floor(k / 1024) };
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = async () => {
      try {
        // Stabilize decoding on iOS Safari.
        // @ts-ignore
        if (img.decode) await img.decode();
      } catch {
        // ignore
      }
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function frameIndexForDir(dir: Dir, moving: boolean, tMs: number, fps: number) {
  const seq = dir === 'up' ? SEQ.up : dir === 'down' ? SEQ.down : SEQ.side;
  if (!moving) return seq[0];
  const i = Math.floor((tMs / 1000) * fps) % seq.length;
  return seq[i];
}

function meFrameIndex(dir: Dir, moving: boolean, tick: number) {
  const seq =
    dir === 'up' ? ME_SEQ.up :
    dir === 'down' ? ME_SEQ.down :
    ME_SEQ.left;
  if (!moving) return seq[0];
  const i = tick % seq.length;
  return seq[i];
}

export function MazeGame({
  onBack,
  onToggleDebug,
  setDebugRefOverride,
}: {
  onBack: () => void;
  onToggleDebug: () => void;
  setDebugRefOverride: (v: { src: string; ox: number; oy: number } | null) => void;
}) {
  const lp = useLongPress(onToggleDebug, 520);
  const INPUT_DEBUG = false; // TEMP: turn off when stable
  const SPRITE_DEBUG = false; // TEMP: turn off when stable
  // D-pad uses direct button clicks (no overlay) for stable input on iOS.

  const [level, setLevel] = useState(1);
  const [steps, setSteps] = useState(0);
  const [won, setWon] = useState(false);
  const [confettiKey, setConfettiKey] = useState(0);

  const [maze, setMaze] = useState<Maze>(() => generateMaze(9));
  const [me, setMe] = useState(() => ({ x: 1, y: 1 }));
  const [meDir, setMeDir] = useState<Dir>('down');
  const [meMoving, setMeMoving] = useState(false);
  const [meTick, setMeTick] = useState(0);
  const meMoveTimer = useRef<number | null>(null);
  const [gf, setGf] = useState(() => ({ x: 7, y: 7 }));
  const [gfRender, setGfRender] = useState(() => ({ x: 7, y: 7 }));
  const [gfDir, setGfDir] = useState<Dir>('down');
  const [gfMoving, setGfMoving] = useState(false);
  const [animTick, setAnimTick] = useState(0);
  const [atlas, setAtlas] = useState<{ outW: number; outH: number } | null>(null);
  const [meSize, setMeSize] = useState<{ w: number; h: number } | null>(null);
  const [imagesReady, setImagesReady] = useState(false);

  const gfAnim = useRef<{
    from: { x: number; y: number };
    to: { x: number; y: number };
    t0: number;
    dur: number;
    moving: boolean;
    dir: Dir;
  }>({ from: { x: 7, y: 7 }, to: { x: 7, y: 7 }, t0: 0, dur: 160, moving: false, dir: 'down' });

  // GF stays static for now; only the player moves.

  const ui = useMemo(() => {
    const cell = 28;
    const gap = 2;
    return { cell, gap };
  }, []);

  const tile = ui.cell + ui.gap;
  const gridPx = maze.size * ui.cell + (maze.size - 1) * ui.gap;
  const spriteScale = atlas ? ui.cell / atlas.outW : 1;
  const spriteW = atlas ? Math.round(atlas.outW * spriteScale) : ui.cell;
  const spriteH = atlas ? Math.round(atlas.outH * spriteScale) : ui.cell;
  const meScale = meSize ? ui.cell / meSize.w : 1;
  const meW = meSize ? Math.round(meSize.w * meScale) : ui.cell;
  const meH = meSize ? Math.round(meSize.h * meScale) : ui.cell;
  // Player is GF, NPC is ME.
  const playerFrameIdx = frameIndexForDir(meDir, meMoving, animTick * (1000 / 8), 8);
  const playerFrameSrc = GF_FRAMES[playerFrameIdx] ?? GF_FRAMES[0];
  const npcFrameIdx = meFrameIndex(gfDir, gfMoving, meTick);
  const npcFrameSrc = ME_FRAMES[npcFrameIdx] ?? ME_FRAMES[0];

  const startLevel = (nextLevel: number) => {
    const tileSize = clamp(9 + Math.floor((nextLevel - 1) / 1) * 2, 9, 11);
    const m = generateMaze(tileSize);
    const a = randomFloor(m);
    let b = randomFloor(m);
    let bestD = -1;
    for (let i = 0; i < 1200; i++) {
      const c = randomFloor(m, Math.floor(Math.random() * 1e9));
      const d = Math.abs(c.x - a.x) + Math.abs(c.y - a.y);
      if (d > bestD) {
        bestD = d;
        b = c;
      }
    }

    setMaze(m);
    setMe(a);
    setMeDir('down');
    setMeMoving(false);
    setGf(b);
    setGfRender(b);
    setSteps(0);
    setWon(false);
    setGfDir('down');
    setGfMoving(false);
    gfAnim.current = { from: b, to: b, t0: 0, dur: 160, moving: false, dir: 'down' };
  };

  useEffect(() => {
    startLevel(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let alive = true;
    fetch('/assets/sprites/gf_frames/atlas.json')
      .then((r) => r.json())
      .then((j) => {
        if (alive && j && typeof j.outW === 'number' && typeof j.outH === 'number') {
          setAtlas({ outW: j.outW, outH: j.outH });
        }
      })
      .catch(() => {
        if (alive) setAtlas({ outW: 32, outH: 32 });
      });
    loadImage(ME_FRAMES[0]).then((img) => {
      if (alive) setMeSize({ w: img.naturalWidth, h: img.naturalHeight });
    });
    Promise.all([...GF_FRAMES.map(loadImage), ...ME_FRAMES.map(loadImage)])
      .then(() => {
        if (alive) setImagesReady(true);
      })
      .catch(() => {
        if (alive) setImagesReady(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setDebugRefOverride({
      src: won
        ? '/assets/ref/ref_games_screens/find_each_other_win_frame.png'
        : '/assets/ref/ref_games_screens/find_each_other_game_frame.png',
      ox: -2,
      oy: 0,
    });
    return () => setDebugRefOverride(null);
  }, [won, setDebugRefOverride]);

  useEffect(() => {
    let raf: number | null = null;
    const loop = () => {
      const a = gfAnim.current;
      if (!a.moving) {
        raf = requestAnimationFrame(loop);
        return;
      }
      const t = Math.min(1, (performance.now() - a.t0) / a.dur);
      if (t >= 1) {
        a.moving = false;
        setGfRender(a.to);
        setGfMoving(false);
      } else {
        setGfRender({ x: a.from.x + (a.to.x - a.from.x) * t, y: a.from.y + (a.to.y - a.from.y) * t });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (!gfMoving) return;
    const id = setInterval(() => setAnimTick((v) => v + 1), 1000 / 8);
    return () => clearInterval(id);
  }, [gfMoving]);

  useEffect(() => {
    if (!meMoving) return;
    const id = setInterval(() => setMeTick((v) => v + 1), 1000 / 8);
    return () => clearInterval(id);
  }, [meMoving]);

  const tryMove = (d: Dir): { moved: boolean; blocked: string } => {
    if (won) return { moved: false, blocked: 'won' };
    const delta =
      d === 'left'
        ? { x: -1, y: 0 }
        : d === 'right'
          ? { x: 1, y: 0 }
          : d === 'up'
            ? { x: 0, y: -1 }
            : { x: 0, y: 1 };
    const nx = me.x + delta.x;
    const ny = me.y + delta.y;
    if (!isFloor(maze, nx, ny)) return { moved: false, blocked: 'wall' };

    const me2 = { x: nx, y: ny };
    setMe(me2);
    setSteps((v) => v + 1);
    setMeDir(d);
    setMeMoving(true);
    if (meMoveTimer.current) window.clearTimeout(meMoveTimer.current);
    meMoveTimer.current = window.setTimeout(() => setMeMoving(false), 180);

    const gfNext = nextStepToward(maze, gf, me2) ?? gf;
    if (gfNext.x !== gf.x || gfNext.y !== gf.y) {
      const d2 = dirFromStep(gf, gfNext);
      gfAnim.current = {
        from: gfRender,
        to: gfNext,
        t0: performance.now(),
        dur: 160,
        moving: true,
        dir: d2,
      };
      setGf(gfNext);
      setGfDir(d2);
      setGfMoving(true);
    }

    if (me2.x === gfNext.x && me2.y === gfNext.y) {
      setWon(true);
      setConfettiKey((k) => k + 1);
    }
    return { moved: true, blocked: '-' };
  };

  const onDir = (d: Dir) => {
    tryMove(d);
  };


  return (
    <div style={{ width: 375, height: 812, background: '#EDE2FF' }}>
      <div style={{ paddingTop: 34, paddingLeft: 22, paddingRight: 22, height: 812, boxSizing: 'border-box' }}>
        <div
          className="ps2p"
          onPointerDown={lp.onPointerDown}
          onPointerUp={lp.onPointerUp}
          onPointerCancel={lp.onPointerCancel}
          onPointerLeave={lp.onPointerLeave}
          style={{
            textAlign: 'center',
            color: '#ffffff',
            fontSize: 18,
            textShadow: '3px 3px 0 rgba(0,0,0,0.18)',
            marginTop: 10,
          }}
        >
          Найди друг друга
        </div>

        <div
          style={{
            marginTop: 22,
            height: 62,
            background: '#ffffff',
            borderRadius: 10,
            border: '4px solid #B6A4E8',
            boxShadow: '0 6px 0 rgba(0,0,0,0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 18px',
          }}
        >
          <InfoCol label="УРОВЕНЬ" value={String(level)} align="left" valueColor="#7D67D9" />
          <InfoCol label="ШАГИ" value={String(steps)} align="center" valueColor="#FF78A7" />
          <InfoCol label="💡" value="3" align="right" valueColor="#77B4FF" />
        </div>

        {!won && (
          <>
            <div
              style={{
                marginTop: 32,
                width: gridPx + 36,
                background: '#ffffff',
                borderRadius: 10,
                border: '4px solid #B6A4E8',
                boxShadow: '0 8px 0 rgba(0,0,0,0.14)',
                padding: 18,
                boxSizing: 'border-box',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              <div style={{ width: gridPx, height: gridPx, position: 'relative' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: `repeat(${maze.size}, ${ui.cell}px)`,
                    gridTemplateRows: `repeat(${maze.size}, ${ui.cell}px)`,
                    gap: `${ui.gap}px`,
                  }}
                >
                  {maze.tiles.map((row, y) =>
                    row.map((v, x) => (
                      <div
                        key={`${x}-${y}`}
                        style={{
                          width: ui.cell,
                          height: ui.cell,
                          background: v === 1 ? '#B6A4E8' : '#F3EDFF',
                          boxShadow: v === 1 ? 'inset 2px 2px 0 rgba(0,0,0,0.12)' : 'none',
                        }}
                      />
                    )),
                  )}
                </div>

                {imagesReady && atlas && meSize ? (
                  <>
                    <img
                      src={playerFrameSrc}
                      alt=""
                      draggable={false}
                      style={{
                        position: 'absolute',
                        left: Math.round(me.x * tile + (ui.cell - spriteW) / 2),
                        top: Math.round(me.y * tile + ui.cell - spriteH),
                        width: spriteW,
                        height: spriteH,
                        imageRendering: 'pixelated',
                        transform: meDir === 'left' ? 'scaleX(-1)' : 'none',
                        transformOrigin: 'center',
                        zIndex: 2,
                      }}
                    />
                    <img
                      src={npcFrameSrc}
                      alt=""
                      draggable={false}
                      style={{
                        position: 'absolute',
                        left: Math.round(gfRender.x * tile + (ui.cell - meW) / 2),
                        top: Math.round(gfRender.y * tile + ui.cell - meH),
                        width: meW,
                        height: meH,
                        imageRendering: 'pixelated',
                        transform: gfDir === 'right' ? 'scaleX(-1)' : 'none',
                        transformOrigin: 'center',
                        zIndex: 2,
                      }}
                    />
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        position: 'absolute',
                        left: Math.round(me.x * tile + ui.cell / 2 - 4),
                        top: Math.round(me.y * tile + ui.cell / 2 - 4),
                        width: 8,
                        height: 8,
                        background: '#FF78A7',
                        boxShadow: '0 0 0 2px #ffffff',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        left: Math.round(gfRender.x * tile + ui.cell / 2 - 4),
                        top: Math.round(gfRender.y * tile + ui.cell / 2 - 4),
                        width: 8,
                        height: 8,
                        background: '#77B4FF',
                        boxShadow: '0 0 0 2px #ffffff',
                      }}
                    />
                  </>
                )}
              </div>

              <div className="ps2p" style={{ textAlign: 'center', marginTop: 10, fontSize: 9, color: '#B6A4E8' }}>
                Найдите путь друг к другу!
              </div>
            </div>

            <div style={{ marginTop: 26, display: 'flex', justifyContent: 'center' }}>
              <DPad onDir={onDir} />
            </div>

            <PixelButton
              onClick={onBack}
              className="ps2p"
              shadowY={6}
              shadowColor="#D4527F"
              style={{
                marginTop: 18,
                width: '100%',
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
          </>
        )}

        {won && (
          <div style={{ position: 'relative', marginTop: 32 }}>
            <ConfettiOverlay burstKey={confettiKey} durationMs={1500} emit="top" kind="rect" rate={2} />

            <div
              style={{
                width: gridPx + 36,
                background: '#ffffff',
                borderRadius: 10,
                border: '4px solid #B6A4E8',
                boxShadow: '0 8px 0 rgba(0,0,0,0.14)',
                padding: 18,
                boxSizing: 'border-box',
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              <div style={{ width: gridPx, height: gridPx, position: 'relative' }}>
                <img
                  src="/assets/sprites/win_maze_game.png"
                  alt=""
                  draggable={false}
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: Math.round(gridPx * 0.9),
                    height: 'auto',
                  }}
                />
              </div>

              <div
                className="ps2p"
                style={{
                  textAlign: 'center',
                  marginTop: 12,
                  color: '#7D67D9',
                  fontSize: 11,
                  lineHeight: '16px',
                }}
              >
                УРА МЫ СНОВА ВМЕСТЕ
              </div>
            </div>

            <div style={{ marginTop: 18, display: 'grid', gap: 10 }}>
              <PixelButton
                onClick={() => {
                  setLevel(1);
                  startLevel(1);
                }}
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
                Сыграть заново
              </PixelButton>
              <PixelButton
                onClick={() => {
                  const next = level + 1;
                  setLevel(next);
                  startLevel(next);
                }}
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
                Следующий уровень
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
                  color: '#FFFFFF',
                  fontSize: 10,
                  textShadow: '2px 2px 0 rgba(0,0,0,0.25)',
                }}
              >
                Назад в меню
              </PixelButton>
            </div>
          </div>
        )}
      </div>

      {import.meta.env.DEV && (
        <div style={{ position: 'absolute', left: -9999, top: -9999 }}>
          <img src={GF_FRAMES[0]} alt="" />
          <img src={GF_FRAMES[7]} alt="" />
          <img src={GF_FRAMES[14]} alt="" />
          <img src={ME_FRAMES[0]} alt="" />
          <img src={ME_FRAMES[7]} alt="" />
          <img src={ME_FRAMES[14]} alt="" />
        </div>
      )}
    </div>
  );
}

function InfoCol({
  label,
  value,
  align,
  valueColor,
}: {
  label: string;
  value: string;
  align: 'left' | 'center' | 'right';
  valueColor: string;
}) {
  return (
    <div style={{ textAlign: align, minWidth: 96 }}>
      <div className="ps2p" style={{ fontSize: 9, color: '#9B9B9B' }}>
        {label}
      </div>
      <div className="ps2p" style={{ fontSize: 14, color: valueColor, marginTop: 8 }}>
        {value}
      </div>
    </div>
  );
}

function DPad({ onDir }: { onDir: (d: Dir) => void }) {
  const Btn = ({ label, dir }: { label: string; dir: Dir }) => (
    <PixelButton
      onClick={() => onDir(dir)}
      className="ps2p"
      shadowY={6}
      shadowColor="rgba(0,0,0,0.18)"
      style={{
        width: DPAD.cell,
        height: DPAD.cell,
        background: '#77B4FF',
        border: `${DPAD.border}px solid #4D86CC`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        fontSize: 16,
        touchAction: 'manipulation',
      }}
    >
      {label}
    </PixelButton>
  );

  const Empty = () => (
    <div
      style={{
        width: DPAD.cell,
        height: DPAD.cell,
        background: '#D8CCFF',
        border: `${DPAD.border}px solid #C7BAFF`,
      }}
    />
  );

  const cellOuter = DPAD.cell + DPAD.border * 2;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `${cellOuter}px ${cellOuter}px ${cellOuter}px`,
        gap: DPAD.gap,
      }}
    >
      <div />
      <Btn label="U" dir="up" />
      <div />
      <Btn label="L" dir="left" />
      <Empty />
      <Btn label="R" dir="right" />
      <div />
      <Btn label="D" dir="down" />
      <div />
    </div>
  );
}

