export type Maze = {
  size: number; // tile grid size (odd), e.g. 9, 11
  tiles: number[][]; // 1 wall, 0 floor
};

function shuffle<T>(arr: T[], rng: () => number) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// Perfect maze via randomized DFS on cell-grid, expanded to tile-grid (2n+1).
export function generateMaze(tileSizeOdd: number, seed = Math.floor(Math.random() * 1e9)): Maze {
  const size = Math.max(5, tileSizeOdd | 1);
  const cellW = (size - 1) / 2;
  const cellH = (size - 1) / 2;

  // xorshift32
  let s = seed | 0;
  const rng = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };

  const visited: boolean[][] = Array.from({ length: cellH }, () => Array.from({ length: cellW }, () => false));
  const tiles: number[][] = Array.from({ length: size }, () => Array.from({ length: size }, () => 1));

  const carveCell = (cx: number, cy: number) => {
    visited[cy][cx] = true;
    tiles[cy * 2 + 1][cx * 2 + 1] = 0;

    const dirs = [
      { dx: 1, dy: 0 },
      { dx: -1, dy: 0 },
      { dx: 0, dy: 1 },
      { dx: 0, dy: -1 },
    ];
    shuffle(dirs, rng);

    for (const d of dirs) {
      const nx = cx + d.dx;
      const ny = cy + d.dy;
      if (nx < 0 || ny < 0 || nx >= cellW || ny >= cellH) continue;
      if (visited[ny][nx]) continue;
      // Knock down wall between cells.
      tiles[cy * 2 + 1 + d.dy][cx * 2 + 1 + d.dx] = 0;
      carveCell(nx, ny);
    }
  };

  carveCell(Math.floor(rng() * cellW), Math.floor(rng() * cellH));
  return { size, tiles };
}

export function isFloor(m: Maze, x: number, y: number) {
  return y >= 0 && x >= 0 && y < m.size && x < m.size && m.tiles[y][x] === 0;
}

export function randomFloor(m: Maze, seed = Math.floor(Math.random() * 1e9)) {
  // Keep it deterministic-ish with a local rng.
  let s = seed | 0;
  const rng = () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
  for (let i = 0; i < 5000; i++) {
    const x = Math.floor(rng() * m.size);
    const y = Math.floor(rng() * m.size);
    if (isFloor(m, x, y)) return { x, y };
  }
  return { x: 1, y: 1 };
}

