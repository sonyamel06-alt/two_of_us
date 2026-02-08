import type { Maze } from './mazeGen';
import { isFloor } from './mazeGen';

export function nextStepToward(m: Maze, from: { x: number; y: number }, to: { x: number; y: number }) {
  if (from.x === to.x && from.y === to.y) return null;
  const W = m.size;
  const H = m.size;
  const q: Array<{ x: number; y: number }> = [];
  const prev = new Map<number, number>();
  const key = (x: number, y: number) => y * 1024 + x;
  const startK = key(from.x, from.y);
  const goalK = key(to.x, to.y);

  q.push(from);
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
  // Walk backward from goal to start, find the step after start.
  let k = goalK;
  let pk = prev.get(k)!;
  while (pk !== -1 && pk !== startK) {
    k = pk;
    pk = prev.get(k)!;
  }
  if (pk !== startK) return null;
  const x = k % 1024;
  const y = Math.floor(k / 1024);
  return { x, y };
}

