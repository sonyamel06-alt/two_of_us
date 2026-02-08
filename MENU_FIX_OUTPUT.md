Menu Fix Output

Files changed:
1) `src/screens/MenuScreen.tsx`

Changes:
- Moved the vertical "made with love" strip into a fixed viewport overlay via `createPortal(...)` so it is pinned to the real right edge of the phone viewport.
- Rebuilt Zzz animation so it spawns above the cat, animates upward and fades, and renders outside the cat container so it isn't clipped.
- Added `zzz.png` loading with one-time console warning fallback to text `Z`.

Key code blocks (from `src/screens/MenuScreen.tsx`):

1) Viewport overlay strip (fixed, outside scaled container):
```tsx
const marquee = typeof document !== 'undefined'
  ? createPortal(
      <div style={{
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
      }}>
        <div className="ps2p" style={{
          writingMode: 'vertical-rl',
          transform: 'rotate(180deg)',
          color: '#ffffff',
          opacity: 0.9,
          fontSize: 10,
          letterSpacing: 1,
          animation: 'marqueeY 6s linear infinite',
          whiteSpace: 'nowrap',
        }}>
          {marqueeText}
        </div>
      </div>,
      document.body,
    )
  : null;
```

2) Zzz layer (spawns above cat, visible, not clipped):
```tsx
<div style={{ position: 'absolute', left: 0, top: 0, width: 375, height: 812, pointerEvents: 'none', zIndex: 5 }}>
  {zzz.map((p) => {
    const age = performance.now() - p.born;
    const t = Math.min(1, age / 900);
    const y = p.y - t * 24;
    const op = t < 0.2 ? t / 0.2 : t > 0.85 ? (1 - t) / 0.15 : 1;
    return (
      <div key={p.id} className="ps2p" style={{ position: 'absolute', left: p.x, top: y, color: '#111', fontSize: 10, opacity: op * 0.9 }}>
        {zzzOk ? (
          <img
            src={zzzSrc}
            alt=""
            draggable={false}
            style={{ width: 14, height: 14, imageRendering: 'pixelated' }}
            onError={() => {
              if (!zzzWarned.current) {
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
    );
  })}
</div>
```
