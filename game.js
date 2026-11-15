/* Snake – Retro-LCD-Handy-Snake. Keine Abhängigkeiten. */
(() => {
  'use strict';

  // ------------------------------------------------------------------
  // Konstanten
  // ------------------------------------------------------------------
  const INK = '#38452f';                 // Pixelfarbe
  const SPEED = [0, 460, 380, 310, 250, 200, 160, 125, 95, 70]; // ms pro Schritt je Level
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };
  const START_LEN = 7;
  const STORE = 'lcd-snake-v1';

  // ------------------------------------------------------------------
  // Einstellungen (persistiert)
  // ------------------------------------------------------------------
  const S = { level: 5, maze: 0, sound: true, top: 0 };
  try { Object.assign(S, JSON.parse(localStorage.getItem(STORE) || '{}')); } catch (e) { /* egal */ }
  S.level = Math.min(9, Math.max(1, S.level | 0 || 5));
  S.top = Math.max(0, S.top | 0);
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { /* egal */ } };

  // ------------------------------------------------------------------
  // Pixel-Font (5 Zeilen hoch, variable Breite) – [breite, zeile0..zeile4]
  // ------------------------------------------------------------------
  const FONT = {
    '0': [3, 7, 5, 5, 5, 7], '1': [3, 2, 6, 2, 2, 7], '2': [3, 7, 1, 7, 4, 7], '3': [3, 7, 1, 3, 1, 7],
    '4': [3, 5, 5, 7, 1, 1], '5': [3, 7, 4, 7, 1, 7], '6': [3, 7, 4, 7, 5, 7], '7': [3, 7, 1, 1, 2, 2],
    '8': [3, 7, 5, 7, 5, 7], '9': [3, 7, 5, 7, 1, 7],
    A: [3, 2, 5, 7, 5, 5], B: [3, 6, 5, 6, 5, 6], C: [3, 3, 4, 4, 4, 3], D: [3, 6, 5, 5, 5, 6],
    E: [3, 7, 4, 6, 4, 7], F: [3, 7, 4, 6, 4, 4], G: [4, 7, 8, 11, 9, 7], H: [3, 5, 5, 7, 5, 5],
    I: [3, 7, 2, 2, 2, 7], J: [3, 1, 1, 1, 5, 2], K: [3, 5, 5, 6, 5, 5], L: [3, 4, 4, 4, 4, 7],
    M: [5, 17, 27, 21, 17, 17], N: [4, 9, 13, 11, 9, 9], O: [4, 6, 9, 9, 9, 6], P: [3, 6, 5, 6, 4, 4],
    Q: [4, 6, 9, 9, 10, 5], R: [3, 6, 5, 6, 5, 5], S: [3, 3, 4, 2, 1, 6], T: [3, 7, 2, 2, 2, 2],
    U: [3, 5, 5, 5, 5, 7], V: [3, 5, 5, 5, 5, 2], W: [5, 17, 17, 21, 27, 17], X: [3, 5, 5, 2, 5, 5],
    Y: [3, 5, 5, 2, 2, 2], Z: [3, 7, 1, 2, 4, 7],
    ' ': [2, 0, 0, 0, 0, 0], '.': [1, 0, 0, 0, 0, 1], ':': [1, 0, 1, 0, 1, 0], '!': [1, 1, 1, 1, 0, 1],
    '-': [3, 0, 0, 7, 0, 0], '?': [3, 6, 1, 2, 0, 2], ',': [2, 0, 0, 0, 1, 2], '/': [3, 1, 1, 2, 4, 4],
    '=': [3, 0, 7, 0, 7, 0], '<': [3, 1, 2, 4, 2, 1], '>': [3, 4, 2, 1, 2, 4], '+': [3, 0, 2, 7, 2, 0],
    '(': [2, 1, 2, 2, 2, 1], ')': [2, 2, 1, 1, 1, 2], "'": [1, 1, 1, 0, 0, 0],
  };
  const norm = (s) => String(s).toUpperCase()
    .replace(/Ä/g, 'AE').replace(/Ö/g, 'OE').replace(/Ü/g, 'UE').replace(/ß/g, 'SS');

  // Bonustiere 7x4 (eigene Entwürfe)
  const BUGS = [
    ['#.###.#', '.#####.', '.#####.', '#.#.#.#'], // Käfer
    ['.####.#', '#.#####', '#######', '.####.#'], // Fisch
    ['#.#.#.#', '.#####.', '#.###.#', '.#...#.'], // Spinne
    ['.##....', '#####..', '######.', '.#.#.##'], // Maus
    ['#.....#', '##.#.##', '.#####.', '...#...'], // Vogel
  ];

  // ------------------------------------------------------------------
  // Labyrinthe (eigene Layouts, skalieren mit der Feldgröße)
  // ------------------------------------------------------------------
  const border = (set, c, r) => {
    for (let x = 0; x < c; x++) { set(x, 0); set(x, r - 1); }
    for (let y = 0; y < r; y++) { set(0, y); set(c - 1, y); }
  };
  const MAZES = [
    { name: 'Ohne', gen: () => {} },
    { name: 'Kasten', gen: border },
    {
      name: 'Korridor', gen: (set, c, r) => {
        for (let x = 0; x < c; x++) { set(x, 0); set(x, r - 1); }
      },
    },
    {
      name: 'Kreuz', gen: (set, c, r) => {
        const mx = c >> 1, my = r >> 1;
        for (let x = Math.floor(c * 0.25); x < Math.ceil(c * 0.75); x++) set(x, my);
        for (let y = Math.floor(r * 0.25); y < Math.ceil(r * 0.75); y++) set(mx, y);
      },
    },
    {
      name: 'Inseln', gen: (set, c, r) => {
        border(set, c, r);
        const bw = Math.max(2, Math.round(c / 7)), bh = Math.max(2, Math.round(r / 7));
        for (const fx of [0.27, 0.73]) for (const fy of [0.27, 0.73]) {
          const x0 = Math.round(c * fx - bw / 2), y0 = Math.round(r * fy - bh / 2);
          for (let y = y0; y < y0 + bh; y++) for (let x = x0; x < x0 + bw; x++) set(x, y);
        }
      },
    },
    {
      name: 'Zickzack', gen: (set, c, r) => {
        border(set, c, r);
        const len = Math.round(r * 0.58);
        const x1 = Math.round(c / 3), x2 = Math.round(2 * c / 3);
        for (let y = 1; y < len; y++) set(x1, y);
        for (let y = r - 2; y > r - 1 - len; y--) set(x2, y);
      },
    },
  ];
  if (!(S.maze >= 0 && S.maze < MAZES.length)) S.maze = 0;

  // ------------------------------------------------------------------
  // Framebuffer
  // ------------------------------------------------------------------
  let W = 0, H = 0, cols = 0, rows = 0;
  let fb = new Uint8Array(0);       // Soll-Zustand
  let lum = new Float32Array(0);    // angezeigte Helligkeit (LCD-Trägheit)

  const px = (x, y, v = 1) => { if (x >= 0 && y >= 0 && x < W && y < H) fb[y * W + x] = v; };
  const rect = (x, y, w, h, v = 1) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, v); };
  const outline = (x, y, w, h) => { rect(x, y, w, 1); rect(x, y + h - 1, w, 1); rect(x, y, 1, h); rect(x + w - 1, y, 1, h); };

  function textW(s, sc = 1) {
    s = norm(s);
    let w = 0;
    for (const ch of s) w += ((FONT[ch] || FONT['?'])[0] + 1) * sc;
    return Math.max(0, w - sc);
  }
  function text(s, x, y, v = 1, sc = 1) {
    s = norm(s);
    for (const ch of s) {
      const g = FONT[ch] || FONT['?'], w = g[0];
      for (let r = 0; r < 5; r++) {
        const bits = g[r + 1];
        for (let c = 0; c < w; c++) if ((bits >> (w - 1 - c)) & 1) rect(x + c * sc, y + r * sc, sc, sc, v);
      }
      x += (w + 1) * sc;
    }
    return x;
  }
  const center = (s, y, sc = 1, v = 1) => text(s, Math.floor((W - textW(s, sc)) / 2), y, v, sc);
  const sprite = (rowsArr, x, y, v = 1) => rowsArr.forEach((row, j) => {
    for (let i = 0; i < row.length; i++) if (row[i] === '#') px(x + i, y + j, v);
  });
  const softkey = (label) => center(label, H - 6);

  function wrap(str, maxW) {
    const out = [];
    for (const para of norm(str).split('\n')) {
      if (!para.trim()) { out.push(''); continue; }
      let line = '';
      for (const word of para.split(' ')) {
        const t = line ? line + ' ' + word : word;
        if (textW(t) <= maxW || !line) line = t; else { out.push(line); line = word; }
      }
      out.push(line);
    }
    return out;
  }

  // Feldgeometrie: Rahmen ab y=8, Zellen 4px Raster, 3px Füllung
  const cellX = (x) => 2 + 4 * x;
  const cellY = (y) => 10 + 4 * y;

  // ------------------------------------------------------------------
  // Canvas / Layout
  // ------------------------------------------------------------------
  const lcdEl = document.getElementById('lcd');
  const cvs = document.getElementById('screen');
  const ctx = cvs.getContext('2d');
  const gridCv = document.createElement('canvas');
  let cell = 1, gap = 0, dirty = true;

  function layout() {
    const cw = lcdEl.clientWidth - 8, ch = lcdEl.clientHeight - 8;
    if (cw <= 0 || ch <= 0) return;
    if (!G) {
      // Feldgröße an Bildschirm anpassen (nur außerhalb eines laufenden Spiels)
      const P = Math.max(3, Math.round(Math.min(cw / 84, ch / 56)));
      const nc = Math.max(14, Math.floor((cw / P - 3) / 4));
      const nr = Math.max(9, Math.floor((ch / P - 11) / 4));
      if (nc !== cols || nr !== rows) {
        cols = nc; rows = nr;
        W = 4 * cols + 3; H = 4 * rows + 11;
        fb = new Uint8Array(W * H);
        lum = new Float32Array(W * H);
      }
    }
    const dpr = window.devicePixelRatio || 1;
    cell = Math.max(1, Math.floor(Math.min(cw / W, ch / H) * dpr));
    gap = cell >= 4 ? Math.max(1, Math.round(cell * 0.1)) : 0;
    cvs.width = W * cell; cvs.height = H * cell;
    const cssW = cvs.width / dpr, cssH = cvs.height / dpr;
    cvs.style.width = cssW + 'px'; cvs.style.height = cssH + 'px';
    cvs.style.left = Math.round((lcdEl.clientWidth - cssW) / 2 * dpr) / dpr + 'px';
    cvs.style.top = Math.round((lcdEl.clientHeight - cssH) / 2 * dpr) / dpr + 'px';

    // schwaches Pixelraster (ausgeschaltete LCD-Pixel)
    gridCv.width = cvs.width; gridCv.height = cvs.height;
    const g = gridCv.getContext('2d');
    g.fillStyle = INK; g.globalAlpha = 0.045;
    const s = cell - gap;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) g.fillRect(x * cell, y * cell, s, s);
    dirty = true;
  }

  function present(dt) {
    const kOn = 1 - Math.exp(-dt / 30), kOff = 1 - Math.exp(-dt / 80);
    let changed = dirty;
    dirty = false;
    for (let i = 0; i < fb.length; i++) {
      const v = lum[i];
      if (fb[i]) {
        if (v < 1) { const n = v + (1 - v) * kOn; lum[i] = n > 0.98 ? 1 : n; changed = true; }
      } else if (v > 0) { const n = v - v * kOff; lum[i] = n < 0.02 ? 0 : n; changed = true; }
    }
    if (!changed) return;
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    ctx.drawImage(gridCv, 0, 0);
    ctx.fillStyle = INK;
    const s = cell - gap, sh = Math.max(1, Math.round(cell * 0.18));
    // Schatten der Pixel auf dem Hintergrund
    for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
      const v = lum[i]; if (!v) continue;
      ctx.globalAlpha = v * 0.08; ctx.fillRect(x * cell + sh, y * cell + sh, s, s);
    }
    for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
      const v = lum[i]; if (!v) continue;
      ctx.globalAlpha = v * 0.95; ctx.fillRect(x * cell, y * cell, s, s);
    }
    ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------------
  // Sound
  // ------------------------------------------------------------------
  let AC = null;
  function audioUnlock() {
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; } }
    if (AC.state === 'suspended') AC.resume();
  }
  function tone(f, t0, d, vol = 0.05) {
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = 'square'; o.frequency.value = f;
    g.gain.setValueAtTime(vol, t0); g.gain.setValueAtTime(0, t0 + d);
    o.connect(g).connect(AC.destination);
    o.start(t0); o.stop(t0 + d + 0.02);
  }
  function sfx(name) {
    if (!S.sound || !AC) return;
    const t = AC.currentTime + 0.005;
    switch (name) {
      case 'key': tone(1250, t, 0.03, 0.025); break;
      case 'eat': tone(1760, t, 0.035); break;
      case 'bonus': tone(1320, t, 0.04); tone(1760, t + 0.06, 0.04); tone(2350, t + 0.12, 0.07); break;
      case 'crash': tone(523, t, 0.1); tone(392, t + 0.12, 0.1); tone(262, t + 0.24, 0.3); break;
    }
  }

  // ------------------------------------------------------------------
  // Spiel
  // ------------------------------------------------------------------
  let state = 'splash';
  let G = null;
  let acc = 0;
  const menu = { sel: 0, off: 0 };
  const sub = { sel: 0, off: 0 };

  function buildWalls(m) {
    const w = new Uint8Array(cols * rows);
    MAZES[m].gen((x, y) => { if (x >= 0 && y >= 0 && x < cols && y < rows) w[y * cols + x] = 1; }, cols, rows);
    return w;
  }

  function findStart(walls, len) {
    const mid = rows >> 1;
    for (let k = 0; k < rows * 2; k++) {
      const y = mid + (k % 2 ? (k + 1) / 2 : -k / 2);
      if (y < 0 || y >= rows) continue;
      for (let x0 = Math.max(1, Math.floor(cols * 0.15)); x0 + len + 4 <= cols; x0++) {
        let ok = true;
        for (let x = x0; x < x0 + len + 4; x++) if (walls[y * cols + x]) { ok = false; break; }
        if (ok) return { x: x0, y };
      }
    }
    return { x: 1, y: 1 };
  }

  function newGame() {
    G = null;
    layout();
    const walls = buildWalls(S.maze);
    const st = findStart(walls, START_LEN);
    const snake = [];
    for (let i = 0; i < START_LEN; i++) snake.push({ x: st.x + START_LEN - 1 - i, y: st.y });
    G = { walls, snake, dir: 'right', queue: [], food: null, bonus: null, score: 0, eaten: 0, bulges: [], paused: false };
    G.food = randomFree();
    acc = 0;
    state = 'play';
  }

  const onSnake = (x, y, skipTail = false) => {
    const n = G.snake.length - (skipTail ? 1 : 0);
    for (let i = 0; i < n; i++) if (G.snake[i].x === x && G.snake[i].y === y) return true;
    return false;
  };
  const onBonus = (x, y) => G.bonus && y === G.bonus.y && (x === G.bonus.x || x === G.bonus.x + 1);
  const isFree = (x, y) => !G.walls[y * cols + x] && !onSnake(x, y) &&
    !(G.food && G.food.x === x && G.food.y === y) && !onBonus(x, y);

  function randomFree() {
    for (let t = 0; t < 400; t++) {
      const x = (Math.random() * cols) | 0, y = (Math.random() * rows) | 0;
      if (isFree(x, y)) return { x, y };
    }
    const all = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (isFree(x, y)) all.push({ x, y });
    return all.length ? all[(Math.random() * all.length) | 0] : null;
  }

  function spawnBonus() {
    for (let t = 0; t < 400; t++) {
      const x = (Math.random() * (cols - 1)) | 0, y = (Math.random() * rows) | 0;
      if (isFree(x, y) && isFree(x + 1, y)) {
        G.bonus = { x, y, kind: (Math.random() * BUGS.length) | 0, t: 20 + ((cols + rows) >> 2) };
        return;
      }
    }
  }

  function turn(d) {
    const q = G.queue;
    const last = q.length ? q[q.length - 1] : G.dir;
    if (d === last || d === OPP[last] || q.length >= 3) return;
    q.push(d);
  }

  function step() {
    if (G.queue.length) G.dir = G.queue.shift();
    const [dx, dy] = DIRS[G.dir];
    const h = G.snake[0];
    const nx = (h.x + dx + cols) % cols, ny = (h.y + dy + rows) % rows;
    const eat = G.food && G.food.x === nx && G.food.y === ny;
    if (G.walls[ny * cols + nx] || onSnake(nx, ny, !eat)) return die();

    G.snake.unshift({ x: nx, y: ny });
    if (!eat) G.snake.pop();
    G.bulges = G.bulges.map((b) => b + 1).filter((b) => b < G.snake.length);

    if (eat) {
      G.score += S.level;
      G.eaten++;
      G.bulges.push(0);
      sfx('eat');
      G.food = randomFree();
      if (!G.food) return gameOver();
      if (G.eaten % 5 === 0 && !G.bonus) spawnBonus();
    }
    if (G.bonus) {
      if (onBonus(nx, ny)) {
        G.score += S.level * 5 + G.bonus.t;
        G.bonus = null;
        G.bulges.push(0);
        sfx('bonus');
      } else if (--G.bonus.t <= 0) G.bonus = null;
    }
  }

  function die() {
    state = 'dying';
    G.deadAt = performance.now();
    sfx('crash');
    if (navigator.vibrate) navigator.vibrate(150);
  }

  function gameOver() {
    G.newTop = G.score > S.top;
    if (G.newTop) { S.top = G.score; save(); }
    G.overAt = performance.now();
    state = 'gameover';
  }

  function pause() {
    if (!G || state !== 'play') return;
    G.paused = true;
    menu.sel = 0; menu.off = 0;
    state = 'menu';
  }
  function resume() { G.paused = false; acc = 0; state = 'play'; }
  function toMenu() { state = 'menu'; menu.sel = 0; menu.off = 0; layout(); }

  // ------------------------------------------------------------------
  // Zeichnen: Spielfeld
  // ------------------------------------------------------------------
  const wrapD = (a, b) => { const d = b - a; return d > 1 ? -1 : d < -1 ? 1 : d; };

  function connect(a, b) {
    if (a.y === b.y) {
      if (b.x === a.x + 1) rect(cellX(a.x) + 3, cellY(a.y), 1, 3);
      else if (b.x === a.x - 1) rect(cellX(b.x) + 3, cellY(a.y), 1, 3);
      else if (Math.abs(b.x - a.x) === cols - 1) { rect(1, cellY(a.y), 1, 3); rect(W - 2, cellY(a.y), 1, 3); }
    } else if (a.x === b.x) {
      if (b.y === a.y + 1) rect(cellX(a.x), cellY(a.y) + 3, 3, 1);
      else if (b.y === a.y - 1) rect(cellX(a.x), cellY(b.y) + 3, 3, 1);
      else if (Math.abs(b.y - a.y) === rows - 1) { rect(cellX(a.x), 9, 3, 1); rect(cellX(a.x), H - 2, 3, 1); }
    }
  }

  function drawSnake(sn, dir, mouth, bulges) {
    const n = sn.length;
    for (let i = 0; i < n; i++) {
      rect(cellX(sn[i].x), cellY(sn[i].y), 3, 3);
      if (i < n - 1) connect(sn[i], sn[i + 1]);
    }
    // Kopf: Auge, ggf. offenes Maul
    const hx = cellX(sn[0].x), hy = cellY(sn[0].y);
    px(hx + 1, hy + 1, 0);
    if (mouth) { const m = { right: [2, 1], left: [0, 1], up: [1, 0], down: [1, 2] }[dir]; px(hx + m[0], hy + m[1], 0); }
    // Schwanzspitze verjüngen
    if (n > 1) {
      const t = sn[n - 1], p = sn[n - 2];
      const dx = wrapD(t.x, p.x), dy = wrapD(t.y, p.y);
      const tx = cellX(t.x), ty = cellY(t.y);
      if (dx === 1) { px(tx, ty, 0); px(tx, ty + 2, 0); }
      else if (dx === -1) { px(tx + 2, ty, 0); px(tx + 2, ty + 2, 0); }
      else if (dy === 1) { px(tx, ty, 0); px(tx + 2, ty, 0); }
      else if (dy === -1) { px(tx, ty + 2, 0); px(tx + 2, ty + 2, 0); }
    }
    // gefressene Happen wandern als Beule durch den Körper
    for (const b of bulges || []) {
      if (b <= 0 || b >= n) continue;
      const x = cellX(sn[b].x), y = cellY(sn[b].y);
      rect(x, y, 3, 3);
      px(x - 1, y + 1); px(x + 3, y + 1); px(x + 1, y - 1); px(x + 1, y + 3);
    }
  }

  function drawFood(f) {
    const x = cellX(f.x), y = cellY(f.y);
    px(x + 1, y); px(x, y + 1); px(x + 2, y + 1); px(x + 1, y + 2);
  }

  function drawWalls(w) {
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      if (!w[i]) continue;
      const X = cellX(x), Y = cellY(y);
      const R = x + 1 < cols && w[i + 1], D = y + 1 < rows && w[i + cols];
      rect(X, Y, 3, 3);
      if (R) rect(X + 3, Y, 1, 3);
      if (D) rect(X, Y + 3, 3, 1);
      if (R && D && w[i + cols + 1]) px(X + 3, Y + 3);
      // bis an den Rahmen auffüllen
      if (x === 0) { rect(X - 1, Y, 1, 3); if (D) px(X - 1, Y + 3); }
      if (x === cols - 1) { rect(X + 3, Y, 1, 3); if (D) px(X + 3, Y + 3); }
      if (y === 0) { rect(X, Y - 1, 3, 1); if (R) px(X + 3, Y - 1); }
      if (y === rows - 1) { rect(X, Y + 3, 3, 1); if (R) px(X + 3, Y + 3); }
      if (x === 0 && y === 0) px(X - 1, Y - 1);
      if (x === cols - 1 && y === 0) px(X + 3, Y - 1);
      if (x === 0 && y === rows - 1) px(X - 1, Y + 3);
      if (x === cols - 1 && y === rows - 1) px(X + 3, Y + 3);
    }
  }

  function mouthOpen() {
    const [dx, dy] = DIRS[G.queue[0] || G.dir];
    const h = G.snake[0];
    const x = (h.x + dx + cols) % cols, y = (h.y + dy + rows) % rows;
    return (G.food && G.food.x === x && G.food.y === y) || onBonus(x, y);
  }

  function renderGame(now, showSnake) {
    text(String(G.score).padStart(4, '0'), 1, 1);
    if (G.bonus) {
      sprite(BUGS[G.bonus.kind], W - 8, 1);
      const t = String(G.bonus.t).padStart(2, '0');
      text(t, W - 10 - textW(t), 1);
    }
    outline(0, 8, W, H - 8);
    drawWalls(G.walls);
    if (G.food) drawFood(G.food);
    if (G.bonus && (G.bonus.t > 5 || Math.floor(now / 160) % 2)) sprite(BUGS[G.bonus.kind], cellX(G.bonus.x), cellY(G.bonus.y));
    if (showSnake) drawSnake(G.snake, G.dir, state === 'play' && mouthOpen(), G.bulges);
  }

  // ------------------------------------------------------------------
  // Zeichnen: Menüs
  // ------------------------------------------------------------------
  const RADIO_OFF = ['.###.', '#...#', '#...#', '#...#', '.###.'];
  const RADIO_ON = ['.###.', '#...#', '#.#.#', '#...#', '.###.'];

  function scrollbar(top, trackH, pos, count) {
    const x = W - 3;
    for (let y = top; y < top + trackH; y += 2) px(x + 1, y);
    const th = Math.max(5, Math.min(Math.floor(trackH / 3), Math.floor(trackH / Math.max(1, count))));
    const ty = top + (count > 1 ? Math.round((trackH - th) * pos / (count - 1)) : 0);
    rect(x, ty, 3, th);
  }

  function drawList(title, labels, st, opts = {}) {
    const n = labels.length, top = 9, ih = 8;
    const vis = Math.max(1, Math.floor((H - top - 8) / ih));
    if (st.sel < st.off) st.off = st.sel;
    if (st.sel >= st.off + vis) st.off = st.sel - vis + 1;
    st.off = Math.max(0, Math.min(st.off, Math.max(0, n - vis)));
    text(title, 1, 1);
    const idx = String(st.sel + 1);
    text(idx, W - 1 - textW(idx), 1);
    for (let k = 0; k < vis && st.off + k < n; k++) {
      const i = st.off + k, y = top + k * ih, inv = i === st.sel;
      if (inv) rect(1, y, W - 6, 7);
      let tx = 3;
      if (opts.radio != null) { sprite(i === opts.radio ? RADIO_ON : RADIO_OFF, 3, y + 1, inv ? 0 : 1); tx = 10; }
      text(labels[i], tx, y + 1, inv ? 0 : 1);
    }
    scrollbar(top, vis * ih - 1, st.sel, n);
    softkey('OK');
    return { bottom: top + Math.min(n, vis) * ih, allVisible: n <= vis };
  }

  function menuItems() {
    const it = [];
    if (G && G.paused) it.push(['Weiter', resume]);
    it.push(['Neues Spiel', newGame]);
    it.push(['Level', () => { state = 'level'; }]);
    it.push(['Labyrinth', () => { state = 'maze'; sub.sel = S.maze; sub.off = 0; }]);
    it.push(['Rekord', () => { state = 'top'; }]);
    it.push(['Anleitung', () => { state = 'help'; sub.off = 0; }]);
    it.push(['Ton: ' + (S.sound ? 'an' : 'aus'), () => { S.sound = !S.sound; save(); syncSoundKey(); }]);
    return it;
  }

  function renderLevel() {
    text('Level', 1, 1);
    const sc = Math.max(2, Math.min(5, Math.floor((H - 34) / 10)));
    const d = String(S.level), dw = textW(d, sc);
    const y = Math.floor((H - 5 * sc) / 2) - 5;
    const x = Math.floor((W - dw) / 2);
    text(d, x, y, 1, sc);
    const ay = y + Math.floor(5 * sc / 2) - 2;
    if (S.level > 1) text('<', x - 8, ay);
    if (S.level < 9) text('>', x + dw + 5, ay);
    // Balkenanzeige
    const bx = Math.floor((W - (9 * 5 - 2)) / 2), by = H - 10;
    for (let i = 0; i < 9; i++) {
      const h = i + 1;
      if (i < S.level) rect(bx + i * 5, by - h + 1, 3, h);
      else rect(bx + i * 5, by, 3, 1);
    }
    softkey('OK');
  }

  function renderMaze() {
    const res = drawList('Labyrinth', MAZES.map((m) => m.name), sub, { radio: S.maze });
    if (!res.allVisible) return;
    // Vorschau des markierten Labyrinths
    const y0 = res.bottom + 1, availH = H - 9 - y0, availW = W - 8;
    const sc = Math.floor(Math.min(availW / (cols + 2), availH / (rows + 2)));
    if (sc < 1) return;
    const w = buildWalls(sub.sel);
    const pw = cols * sc + 2, ph = rows * sc + 2;
    const ox = Math.floor((W - 4 - pw) / 2), oy = y0 + Math.floor((availH - ph) / 2);
    outline(ox, oy, pw, ph);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (w[y * cols + x]) rect(ox + 1 + x * sc, oy + 1 + y * sc, sc, sc);
  }

  function renderTop() {
    text('Rekord', 1, 1);
    const sc = W >= 80 ? 3 : 2;
    const s = String(S.top);
    const y = Math.floor((H - 5 * sc) / 2) - 4;
    center(s, y, sc);
    center('Punkte', y + 5 * sc + 4);
    softkey('OK');
  }

  const HELP = 'Steuere die Schlange mit dem Steuerkreuz, den Pfeiltasten oder per Wischen auf dem Display.\n\n' +
    'Friss das Futter, um zu wachsen. Jeder Happen bringt so viele Punkte wie das eingestellte Level.\n\n' +
    'Nach jedem 5. Happen taucht kurz ein Bonustier auf. Je schneller du es erwischst, desto mehr Punkte.\n\n' +
    'Beiss dich nicht selbst und meide die Mauern. Wo kein Rand ist, geht es auf der anderen Seite weiter.\n\n' +
    'C = Pause / Zurueck';

  function renderHelp() {
    text('Anleitung', 1, 1);
    const lines = wrap(HELP, W - 8);
    const top = 9, lh = 7, vis = Math.max(1, Math.floor((H - top - 8) / lh));
    const maxOff = Math.max(0, lines.length - vis);
    sub.off = Math.max(0, Math.min(sub.off, maxOff));
    for (let k = 0; k < vis && sub.off + k < lines.length; k++) text(lines[sub.off + k], 2, top + k * lh);
    scrollbar(top, vis * lh - 1, sub.off, maxOff + 1);
    softkey('OK');
  }

  function renderSplash(now) {
    const sc = Math.max(2, Math.min(Math.floor((W - 8) / 20), Math.floor(H / 5 / 4)));
    const ty = Math.max(4, Math.floor(H * 0.22));
    center('SNAKE', ty, sc);
    // kleine Schlange läuft durchs Bild
    let r = 0;
    while (cellY(r) < ty + 5 * sc + 8) r++;
    if (cellY(r) + 3 < H - 10) {
      const hx = Math.floor(now / 140) % cols;
      const sn = [];
      for (let i = 0; i < 8; i++) sn.push({ x: (hx - i + cols * 2) % cols, y: r });
      drawSnake(sn, 'right', false, [Math.floor(now / 140) % 10]);
    }
    if (S.top) center('Rekord ' + S.top, H - 16);
    if (Math.floor(now / 600) % 2 === 0) center('Start mit OK', H - 7);
  }

  function renderGameOver(now) {
    const sc = W >= 80 ? 3 : 2;
    const block = 5 + 6 + 5 + 4 + 5 * sc + (G.newTop ? 6 + 5 : 0);
    let y = Math.max(2, Math.floor((H - 8 - block) / 2));
    center('Spiel vorbei!', y); y += 11;
    center('Punkte:', y); y += 9;
    center(String(G.score), y, sc); y += 5 * sc + 6;
    if (G.newTop && Math.floor(now / 400) % 2 === 0) center('Neuer Rekord!', y);
    softkey('OK');
  }

  function render(now) {
    fb.fill(0);
    switch (state) {
      case 'splash': renderSplash(now); break;
      case 'play': renderGame(now, true); break;
      case 'dying': renderGame(now, Math.floor((now - G.deadAt) / 220) % 2 === 1); break;
      case 'gameover': renderGameOver(now); break;
      case 'menu': drawList('Snake', menuItems().map((m) => m[0]), menu); break;
      case 'level': renderLevel(); break;
      case 'maze': renderMaze(); break;
      case 'top': renderTop(); break;
      case 'help': renderHelp(); break;
    }
  }

  // ------------------------------------------------------------------
  // Eingabe
  // ------------------------------------------------------------------
  function listNav(k, st, n, onOk, onBack) {
    if (k === 'up') st.sel = (st.sel - 1 + n) % n;
    else if (k === 'down') st.sel = (st.sel + 1) % n;
    else if (k === 'ok' || k === 'right') onOk(st.sel);
    else if (k === 'back' || k === 'left') onBack();
  }

  function press(k) {
    audioUnlock();
    if (k === 'sound') { S.sound = !S.sound; save(); syncSoundKey(); sfx('key'); return; }
    if (state !== 'play' && state !== 'dying') sfx('key');
    const now = performance.now();
    switch (state) {
      case 'splash':
        if (k === 'ok' || k === 'right') toMenu();
        break;
      case 'play':
        if (DIRS[k]) turn(k);
        else if (k === 'back') pause();
        break;
      case 'gameover':
        if ((k === 'ok' || k === 'back') && now - G.overAt > 500) { G = null; toMenu(); }
        break;
      case 'menu': {
        const items = menuItems();
        if (menu.sel >= items.length) menu.sel = 0;
        listNav(k, menu, items.length, (i) => items[i][1](), () => { if (G && G.paused) resume(); else state = 'splash'; });
        break;
      }
      case 'level':
        if (k === 'up' || k === 'right') S.level = Math.min(9, S.level + 1);
        else if (k === 'down' || k === 'left') S.level = Math.max(1, S.level - 1);
        else { save(); state = 'menu'; }
        break;
      case 'maze':
        listNav(k, sub, MAZES.length, (i) => { S.maze = i; save(); state = 'menu'; }, () => { state = 'menu'; });
        break;
      case 'top':
        if (k === 'ok' || k === 'back' || k === 'left') state = 'menu';
        break;
      case 'help':
        if (k === 'up') sub.off--;
        else if (k === 'down') sub.off++;
        else if (k === 'ok' || k === 'back' || k === 'left') state = 'menu';
        break;
    }
  }

  const soundKey = document.getElementById('soundKey');
  function syncSoundKey() { soundKey.classList.toggle('muted', !S.sound); }
  syncSoundKey();

  const isDir = (k) => k in DIRS;
  const canRepeat = () => state !== 'play' && state !== 'dying';

  // Seitentasten
  document.querySelectorAll('.side-key').forEach((b) => {
    const k = b.dataset.k;
    const up = () => b.classList.remove('down');
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('down'); press(k); });
    b.addEventListener('pointerup', up);
    b.addEventListener('pointercancel', up);
    b.addEventListener('pointerleave', up);
    b.addEventListener('contextmenu', (e) => e.preventDefault());
  });

  // Steuerkreuz: Richtung über Winkel zur Mitte – Daumen kann rollen
  const dpad = document.getElementById('dpad');
  let dpId = null, dpZoneCur = null, repT = null;
  function dpZone(e) {
    const r = dpad.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2);
    if (Math.hypot(x, y) < r.width * 0.15) return 'ok';
    return Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : (y > 0 ? 'down' : 'up');
  }
  function dpSet(z) {
    clearTimeout(repT);
    dpZoneCur = z;
    if (z) dpad.dataset.press = z; else delete dpad.dataset.press;
    if (!z) return;
    press(z);
    if (isDir(z)) {
      const rep = () => { if (dpZoneCur === z && canRepeat()) press(z); repT = setTimeout(rep, 110); };
      repT = setTimeout(rep, 380);
    }
  }
  dpad.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    dpId = e.pointerId;
    try { dpad.setPointerCapture(e.pointerId); } catch (_) { /* egal */ }
    dpSet(dpZone(e));
  });
  dpad.addEventListener('pointermove', (e) => {
    if (e.pointerId !== dpId) return;
    const z = dpZone(e);
    if (z !== dpZoneCur && z !== 'ok') dpSet(z);
  });
  const dpEnd = (e) => { if (e.pointerId !== dpId) return; dpId = null; dpSet(null); };
  dpad.addEventListener('pointerup', dpEnd);
  dpad.addEventListener('pointercancel', dpEnd);
  dpad.addEventListener('contextmenu', (e) => e.preventDefault());

  // Wischen auf dem Display
  let sw = null;
  lcdEl.addEventListener('pointerdown', (e) => { sw = { x: e.clientX, y: e.clientY, moved: false }; });
  lcdEl.addEventListener('pointermove', (e) => {
    if (!sw) return;
    const dx = e.clientX - sw.x, dy = e.clientY - sw.y;
    if (Math.hypot(dx, dy) < 22) return;
    press(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    sw = { x: e.clientX, y: e.clientY, moved: true };
  });
  lcdEl.addEventListener('pointerup', () => {
    if (sw && !sw.moved && (state === 'splash' || state === 'gameover')) press('ok');
    sw = null;
  });
  lcdEl.addEventListener('pointercancel', () => { sw = null; });

  // Tastatur (Ziffern 2/4/6/8 wie auf dem Handy, Numpad wie Pfeiltasten)
  const KEYS = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
    Digit2: 'up', Digit8: 'down', Digit4: 'left', Digit6: 'right',
    Numpad8: 'up', Numpad2: 'down', Numpad4: 'left', Numpad6: 'right',
    Enter: 'ok', NumpadEnter: 'ok', Space: 'ok', Digit5: 'ok', Numpad5: 'ok',
    Escape: 'back', Backspace: 'back', KeyC: 'back', KeyP: 'back', KeyM: 'sound',
  };
  window.addEventListener('keydown', (e) => {
    const k = KEYS[e.code];
    if (!k || e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    if (e.repeat && (!isDir(k) || !canRepeat())) return;
    press(k);
    if (isDir(k) || k === 'ok') dpad.dataset.press = k;
  });
  window.addEventListener('keyup', (e) => { if (KEYS[e.code]) delete dpad.dataset.press; });

  // Automatisch pausieren, wenn die Seite verlassen wird
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('blur', pause);

  new ResizeObserver(layout).observe(lcdEl);
  window.addEventListener('resize', layout);

  // ------------------------------------------------------------------
  // Hauptschleife
  // ------------------------------------------------------------------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(100, now - last);
    last = now;
    if (W) {
      if (state === 'play') {
        acc += dt;
        const iv = SPEED[S.level];
        while (acc >= iv && state === 'play') { acc -= iv; step(); }
      } else if (state === 'dying' && now - G.deadAt > 1800) {
        gameOver();
      }
      render(now);
      present(dt);
    }
    requestAnimationFrame(frame);
  }
  layout();
  requestAnimationFrame(frame);
})();
