interface Position {
  x: number;
  y: number;
}

interface Player {
  x: number;
  y: number;
  speed: number;
  moveCooldown: number;
}

interface Crow {
  x: number;
  y: number;
  dir: Position;
  moveTick: number;
  hit?: boolean;
  stun?: number;
}

interface Dog {
  x: number;
  y: number;
  dir: Position;
  moveTick: number;
  hp: number;
  hitOnce?: boolean;
  stun?: number;
}

interface GameState {
  score: number;
  lives: number;
  time: number;
  over: boolean;
  started: boolean;
  stage: number;
  lastDir: Position;
  grid: number[][];
  player: Player;
  crows: Crow[];
  dogs: Dog[];
  clawCharge: number; // 爪とぎ所持回数（簡易: 最大1）
}

class NyangoGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private images: { cat?: HTMLImageElement; crow?: HTMLImageElement; hairball?: HTMLImageElement; dog?: HTMLImageElement; tree?: HTMLImageElement; sand?: HTMLImageElement; tumetogi?: HTMLImageElement; churu?: HTMLImageElement } = {};
  private dpr = 1;
  
  private GRID_COLS = 12;
  private GRID_ROWS = 16;
  private TILE = 32;
  private BOARD_W: number;
  private BOARD_H: number;
  
  private state: GameState;
  private keys: Set<string> = new Set();
  
  private ui: {
    score: HTMLElement | null;
    lives: HTMLElement | null;
    time: HTMLElement | null;
    pushBtn: HTMLElement | null;
    startOverlay: HTMLElement | null;
    startBtn: HTMLElement | null;
    clawIcon: HTMLImageElement | null;
  };
  
  private flashMsg: string | null = null;
  private flashTimer = 0;
  private flashOverlay = true;
  private lastTime = 0;
  private secAccum = 0;
  // エッジ揺れ演出
  private shakeSide: 'top' | 'bottom' | 'left' | 'right' | null = null;
  private shakeTimer = 0;
  private shakeX: number | null = null;
  private shakeY: number | null = null;
  private shakeRadius = 2;
  
  private cssVar(name: string, fallback: string): string {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  constructor() {
    this.canvas = document.getElementById('game') as HTMLCanvasElement;
    if (!this.canvas) {
      this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    }
    this.ctx = this.canvas.getContext('2d')!;
    // ピクセルアート前提で拡大時の補間を無効化
    this.ctx.imageSmoothingEnabled = false;
    
    this.BOARD_W = this.GRID_COLS * this.TILE;
    this.BOARD_H = this.GRID_ROWS * this.TILE;
    
    this.ui = {
      score: document.getElementById('score'),
      lives: document.getElementById('lives'),
      time: document.getElementById('time'),
      pushBtn: document.getElementById('pushBtn'),
      startOverlay: document.getElementById('startOverlay'),
      startBtn: document.getElementById('startBtn'),
      clawIcon: document.getElementById('clawIcon') as HTMLImageElement | null
    };
    
    this.state = {
      score: 0,
      lives: 3,
      time: 60,
      over: false,
      started: false,
      stage: 1,
      lastDir: { x: 0, y: 1 },
      grid: [],
      player: { x: 1, y: 1, speed: 6, moveCooldown: 0 },
      crows: [],
      dogs: [],
      clawCharge: 0
    };
    
    this.init();
    this.loadAssets();
  }
  
  private loadAssets(): void {
    const load = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
    // public/ 配下に置けば /app2/icons/... で参照可能
    load('/app2/icons/cat.png').then(img => { this.images.cat = img; }).catch(() => {});
    load('/app2/icons/crow.png').then(img => { this.images.crow = img; }).catch(() => {});
    load('/app2/icons/hairball.png').then(img => { this.images.hairball = img; }).catch(() => {});
    load('/app2/icons/dog.png').then(img => { this.images.dog = img; }).catch(() => {});
    load('/app2/icons/tree.png').then(img => { this.images.tree = img; }).catch(() => {});
    load('/app2/icons/sand.png').then(img => { this.images.sand = img; }).catch(() => {});
    load('/app2/icons/tumetogi.png').then(img => { this.images.tumetogi = img; }).catch(() => {});
    load('/app2/icons/ciao.png').then(img => { this.images.churu = img; }).catch(() => {});
  }
  
  private init(): void {
    this.setupCanvas();
    this.setupEventListeners();
    this.buildStage();
    this.lastTime = performance.now();
    this.gameLoop();
    
    setInterval(() => this.handleKeyboardMove(), 90);
  }
  
  private setupCanvas(): void {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (this.canvas.id === 'game') {
      const maxW = Math.min(window.innerWidth - 24, 540);
      const maxH = window.innerHeight - 220;
      const aspect = 3 / 4;
      let w = Math.min(480, maxW);
      let h = Math.min(640, maxH);
      
      if (w / h > aspect) {
        w = Math.floor(h * aspect);
      } else {
        h = Math.floor(w / aspect);
      }
      
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      this.canvas.width = Math.floor(w * this.dpr);
      this.canvas.height = Math.floor(h * this.dpr);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    } else {
      if (isMobile) {
        this.canvas.width = Math.min(window.innerWidth, 480);
        this.canvas.height = Math.min(window.innerHeight - 150, 640);
      } else {
        this.canvas.width = 480;
        this.canvas.height = 640;
      }
    }
    
    window.addEventListener('resize', () => this.setupCanvas());
  }
  
  private boardOffset(): { offX: number; offY: number } {
    // dprスケール後も描画座標はCSSピクセル基準なので、CSSサイズから計算する
    const cssW = this.canvas.width / this.dpr;
    const cssH = this.canvas.height / this.dpr;
    const offX = Math.floor((cssW - this.BOARD_W) / 2);
    const offY = Math.floor((cssH - this.BOARD_H) / 2);
    return { offX, offY };
  }
  
  private rand(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  private buildStage(): void {
    // 初期化：外周は壁(1)、内部は砂山(3)でほぼ埋める
    this.state.grid = Array.from({ length: this.GRID_ROWS }, () => Array(this.GRID_COLS).fill(3));
    for (let y = 0; y < this.GRID_ROWS; y++) {
      for (let x = 0; x < this.GRID_COLS; x++) {
        if (x === 0 || y === 0 || x === this.GRID_COLS - 1 || y === this.GRID_ROWS - 1) {
          this.state.grid[y][x] = 1;
        }
      }
    }

    // プレイヤー初期位置
    
    this.state.player.x = 2;
    this.state.player.y = this.GRID_ROWS - 3;
    const px = this.state.player.x, py = this.state.player.y;
    const inBounds = (x: number, y: number) => x >= 1 && x < this.GRID_COLS - 1 && y >= 1 && y < this.GRID_ROWS - 1;
    const dirs: Position[] = [ {x:1,y:0}, {x:-1,y:0}, {x:0,y:1}, {x:0,y:-1} ];
    const shuffle = <T>(a: T[]): T[] => { for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; };
    const emptyNeighborCount = (x: number, y: number): number => {
      let c = 0;
      for (const d of dirs) { const nx=x+d.x, ny=y+d.y; if (inBounds(nx,ny) && this.state.grid[ny][nx] === 0) c++; }
      return c;
    };

    // 一筆書き通路を2〜3回生成（自己交差・分岐なしの線を複数作る）
    const carveOneStroke = (sx: number, sy: number, lenFactor: number = 0.12) => {
      if (!inBounds(sx, sy)) return;
      this.state.grid[sy][sx] = 0;
      const path: Position[] = [{ x: sx, y: sy }];
      const targetLen = Math.floor((this.GRID_COLS - 2) * (this.GRID_ROWS - 2) * lenFactor);
      let guard = 0;
      while (path.length < targetLen && guard < 8000) {
        guard++;
        const head = path[path.length - 1];
        const candHead = shuffle(dirs.slice()).map(d => ({x: head.x + d.x, y: head.y + d.y}))
          .filter(p => inBounds(p.x,p.y) && this.state.grid[p.y][p.x] !== 1 && this.state.grid[p.y][p.x] !== 0)
          .filter(p => emptyNeighborCount(p.x, p.y) === 1);
        if (candHead.length > 0) {
          const n = candHead[0];
          this.state.grid[n.y][n.x] = 0;
          path.push(n);
          continue;
        }
        const tail = path[0];
        const candTail = shuffle(dirs.slice()).map(d => ({x: tail.x + d.x, y: tail.y + d.y}))
          .filter(p => inBounds(p.x,p.y) && this.state.grid[p.y][p.x] !== 1 && this.state.grid[p.y][p.x] !== 0)
          .filter(p => emptyNeighborCount(p.x, p.y) === 1);
        if (candTail.length > 0) {
          const n = candTail[0];
          this.state.grid[n.y][n.x] = 0;
          path.unshift(n);
          continue;
        }
        break;
      }
    };

    carveOneStroke(px, py, 0.14 + Math.random() * 0.06);
    const extraStrokes = this.rand(1, 2); // 合計2〜3本
    for (let i = 0; i < extraStrokes; i++) {
      // 追加の開始点はランダム（内部）、既存通路から1マス離して開始
      let tries = 0;
      while (tries++ < 200) {
        const sx = this.rand(2, this.GRID_COLS - 3);
        const sy = this.rand(2, this.GRID_ROWS - 3);
        if (this.state.grid[sy][sx] !== 0 && emptyNeighborCount(sx, sy) === 0) {
          carveOneStroke(sx, sy, 0.08 + Math.random() * 0.05);
          break;
        }
      }
    }

    // 毛玉を5〜10個、空きマスに配置（互いに隣接しない）
    const collectEmpty = (): Array<{x:number;y:number}> => {
      const arr: Array<{x:number;y:number}> = [];
      for (let y = 1; y < this.GRID_ROWS - 1; y++) {
        for (let x = 1; x < this.GRID_COLS - 1; x++) {
          if (this.state.grid[y][x] === 0) arr.push({x,y});
        }
      }
      return arr;
    };
    let empties = collectEmpty();
    const hairballTarget = this.rand(5, 10);
    let placed = 0;
    const isAdjacentHairball = (x: number, y: number): boolean => {
      const n4 = [ [1,0],[-1,0],[0,1],[0,-1] ];
      for (const [dx,dy] of n4) {
        const nx = x + dx, ny = y + dy;
        if (this.state.grid[ny] && this.state.grid[ny][nx] === 2) return true;
      }
      return false;
    };
    // シャッフルしてから順に条件を満たす場所に置く
    empties = shuffle(empties);
    for (const cell of empties) {
      if (placed >= hairballTarget) break;
      const {x, y} = cell;
      if (Math.abs(x - px) + Math.abs(y - py) <= 1) continue; // プレイヤー隣接回避
      if (isAdjacentHairball(x, y)) continue; // 既存毛玉に隣接禁止
      this.state.grid[y][x] = 2; placed++;
    }

    // 初期配置では毛玉が隣接しないため、3連は発生しない（プレイヤー操作で作る）
    
    this.state.crows = [];
    this.state.dogs = [];
    const crowCount = Math.min(6 + this.state.stage, 12);
    const dogCount = Math.min(1 + Math.floor(this.state.stage / 2), 3);
    let attempts = 0;
    
    while (this.state.crows.length < crowCount && attempts < 500) {
      attempts++;
      const cx = this.rand(1, this.GRID_COLS - 2);
      const cy = this.rand(1, Math.floor(this.GRID_ROWS / 2));
      
      if (this.state.grid[cy][cx] === 0 && 
          (Math.abs(cx - this.state.player.x) + Math.abs(cy - this.state.player.y) > 6)) {
        this.state.crows.push({
          x: cx,
          y: cy,
          dir: this.pickDir(),
          moveTick: 0
        });
      }
    }
    
    attempts = 0;
    while (this.state.dogs.length < dogCount && attempts < 500) {
      attempts++;
      const dx = this.rand(1, this.GRID_COLS - 2);
      const dy = this.rand(1, Math.floor(this.GRID_ROWS / 2));
      if (this.state.grid[dy][dx] === 0 && (Math.abs(dx - this.state.player.x) + Math.abs(dy - this.state.player.y) > 8)) {
        this.state.dogs.push({ x: dx, y: dy, dir: this.pickDir(), moveTick: 0, hp: 2 });
      }
    }
    
    this.state.time = 60;
    this.state.over = false;
  }
  
  private pickDir(): Position {
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ];
    return dirs[this.rand(0, 3)];
  }
  
  private canWalk(x: number, y: number): boolean {
    const v = this.state.grid[y] && this.state.grid[y][x];
    return v === 0 || v === 4 || v === 5; // 空白 or 爪とぎ or チュールの上は移動可
  }
  
  private isHairball(x: number, y: number): boolean {
    return this.state.grid[y] && this.state.grid[y][x] === 2;
  }

  private isSand(x: number, y: number): boolean {
    return this.state.grid[y] && this.state.grid[y][x] === 3;
  }

  private isClawItem(x: number, y: number): boolean {
    return this.state.grid[y] && this.state.grid[y][x] === 4;
  }

  private isChuru(x: number, y: number): boolean {
    return this.state.grid[y] && this.state.grid[y][x] === 5;
  }

  private isPerimeter(x: number, y: number): boolean {
    return (x === 0 || y === 0 || x === this.GRID_COLS - 1 || y === this.GRID_ROWS - 1);
  }

  private isTreeCell(x: number, y: number): boolean {
    // 外周のうち、四隅を除き1マスおきに木を配置
    if (!this.isPerimeter(x, y)) return false;
    if ((x === 0 || x === this.GRID_COLS - 1) && (y === 0 || y === this.GRID_ROWS - 1)) return false;
    if (y === 0 || y === this.GRID_ROWS - 1) return x % 2 === 0;
    if (x === 0 || x === this.GRID_COLS - 1) return y % 2 === 0;
    return false;
  }
  
  private movePlayer(dx: number, dy: number): void {
    if (!this.state.started || this.state.over || (dx === 0 && dy === 0)) return;
    
    const nx = this.state.player.x + dx;
    const ny = this.state.player.y + dy;
    this.state.lastDir = { x: dx, y: dy };
    
    if (this.canWalk(nx, ny)) {
      this.state.player.x = nx;
      this.state.player.y = ny;
      // アイテム取得
      if (this.isClawItem(nx, ny)) {
        this.state.grid[ny][nx] = 0;
        this.state.clawCharge = 1;
        this.flash('爪とぎを手に入れた！', false);
      } else if (this.isChuru(nx, ny)) {
        this.state.grid[ny][nx] = 0;
        this.state.score += 500;
        this.flash('チュールを手に入れた！', false);
      }
    } else if (this.isHairball(nx, ny)) {
      this.pushHairball(nx, ny, dx, dy);
    }
  }
  
  private pushHairball(hx: number, hy: number, dx: number, dy: number): boolean {
    if (this.state.over) return false;
    
    let nx = hx + dx;
    let ny = hy + dy;
    
    if (!this.canWalk(nx, ny)) return false;
    
    this.state.grid[hy][hx] = 0;
    
    while (this.canWalk(nx, ny)) {
      hx = nx;
      hy = ny;
      nx += dx;
      ny += dy;
      
      for (const c of this.state.crows) {
        if (c.x === hx && c.y === hy) {
          c.hit = true;
        }
      }
      for (const d of this.state.dogs) {
        if (d.x === hx && d.y === hy) {
          d.hp -= 1;
          d.hitOnce = true;
        }
      }
    }
    
    this.state.grid[hy][hx] = 2;
    
    const beforeC = this.state.crows.length;
    this.state.crows = this.state.crows.filter(c => !c.hit);
    const killedC = beforeC - this.state.crows.length;

    const beforeD = this.state.dogs.length;
    this.state.dogs = this.state.dogs.filter(d => d.hp > 0);
    const killedD = beforeD - this.state.dogs.length;

    if (killedC > 0) {
      this.state.score += 100 * killedC * (killedC > 1 ? killedC : 1);
      this.flash(`カラスを倒した！x${killedC}`);
    }
    if (killedD > 0) {
      this.state.score += 200 * killedD;
      this.flash(`犬を倒した！x${killedD}`);
    }
    
    // 毛玉3揃えチェック（横/縦の連続3以上）→ チュール出現
    if (this.hasHairballMatch()) {
      this.spawnChuru();
      this.flash('チュールが出現！', false);
    }
    
    return true;
  }

  private hasHairballMatch(): boolean {
    // 横方向
    for (let y = 1; y < this.GRID_ROWS - 1; y++) {
      let run = 0;
      for (let x = 1; x < this.GRID_COLS - 1; x++) {
        if (this.state.grid[y][x] === 2) {
          run++;
          if (run >= 3) return true;
        } else {
          run = 0;
        }
      }
    }
    // 縦方向
    for (let x = 1; x < this.GRID_COLS - 1; x++) {
      let run = 0;
      for (let y = 1; y < this.GRID_ROWS - 1; y++) {
        if (this.state.grid[y][x] === 2) {
          run++;
          if (run >= 3) return true;
        } else {
          run = 0;
        }
      }
    }
    return false;
  }

  private spawnChuru(): void {
    // すでにチュールがたくさんある場合は制限（最大3個）
    let existing = 0;
    for (let y = 1; y < this.GRID_ROWS - 1; y++) {
      for (let x = 1; x < this.GRID_COLS - 1; x++) {
        if (this.state.grid[y][x] === 5) existing++;
      }
    }
    if (existing >= 3) return;

    const candidates: Array<{x:number;y:number}> = [];
    for (let y = 1; y < this.GRID_ROWS - 1; y++) {
      for (let x = 1; x < this.GRID_COLS - 1; x++) {
        if (this.state.grid[y][x] === 0) candidates.push({x,y});
      }
    }
    if (candidates.length === 0) return;
    const i = Math.floor(Math.random() * candidates.length);
    const {x,y} = candidates[i];
    this.state.grid[y][x] = 5; // チュール配置
  }
  
  private updateCrows(): void {
    for (const c of this.state.crows) {
      if (c.stun && c.stun > 0) { c.stun -= 1; continue; }
      c.moveTick = (c.moveTick || 0) + 1;
      if (c.moveTick % 12 !== 0) continue;
      
      let tries = 0;
      while (tries < 4) {
        const nx = c.x + c.dir.x;
        const ny = c.y + c.dir.y;
        
        if (this.canWalk(nx, ny)) {
          c.x = nx;
          c.y = ny;
          break;
        } else if (this.isHairball(nx, ny)) {
          const nx2 = nx + c.dir.x;
          const ny2 = ny + c.dir.y;
          if (this.canWalk(nx2, ny2) && Math.random() < 0.10) {
            this.state.grid[ny][nx] = 0;
            this.state.grid[ny2][nx2] = 2;
            c.x = nx;
            c.y = ny;
            break;
          }
        }
        c.dir = this.pickDir();
        tries++;
      }
    }
  }

  private updateDogs(): void {
    for (const d of this.state.dogs) {
      if (d.stun && d.stun > 0) { d.stun -= 1; continue; }
      d.moveTick = (d.moveTick || 0) + 1;
      if (d.moveTick % 18 !== 0) continue; // カラスより遅い
      d.hitOnce = false;
      let tries = 0;
      while (tries < 4) {
        const nx = d.x + d.dir.x;
        const ny = d.y + d.dir.y;
        if (this.canWalk(nx, ny)) {
          d.x = nx;
          d.y = ny;
          break;
        }
        d.dir = this.pickDir();
        tries++;
      }
    }
  }
  
  private hitPlayer(): void {
    this.state.lives--;
    this.flash('ダメージ！');
    
    if (this.state.lives <= 0) {
      this.state.over = true;
      this.flash('ゲームオーバー');
    } else {
      this.state.player.x = 2;
      this.state.player.y = this.GRID_ROWS - 3;
    }
  }
  
  private flash(msg: string, overlay: boolean = true): void {
    this.flashMsg = msg;
    this.flashTimer = 60;
    this.flashOverlay = overlay;
  }
  
  private draw(): void {
    const cssW = this.canvas.width / this.dpr;
    const cssH = this.canvas.height / this.dpr;
    this.ctx.fillStyle = this.cssVar('--canvas-bg', '#0b0e14');
    this.ctx.fillRect(0, 0, cssW, cssH);
    
    const { offX, offY } = this.boardOffset();
    this.ctx.save();
    this.ctx.translate(offX, offY);
    
    const tileA = this.cssVar('--tile-a', '#0f1320');
    const tileB = this.cssVar('--tile-b', '#0d111c');
    for (let y = 0; y < this.GRID_ROWS; y++) {
      for (let x = 0; x < this.GRID_COLS; x++) {
        const px = x * this.TILE;
        const py = y * this.TILE;
        
        this.ctx.fillStyle = (x + y) % 2 === 0 ? tileA : tileB;
        this.ctx.fillRect(px, py, this.TILE, this.TILE);
      }
    }
    
    for (let y = 0; y < this.GRID_ROWS; y++) {
      for (let x = 0; x < this.GRID_COLS; x++) {
        const v = this.state.grid[y][x];
        let px = x * this.TILE;
        let py = y * this.TILE;
        
        if (v === 1) {
          // 境界の壁を揺らす演出（押下地点から半径2マス以内のみ）
          if (this.shakeSide && this.shakeTimer > 0 && this.shakeX !== null && this.shakeY !== null) {
            const within = (Math.abs(x - this.shakeX) + Math.abs(y - this.shakeY)) <= this.shakeRadius;
            const phase = this.shakeTimer;
            const amp = 2;
            if (within) {
              if (this.shakeSide === 'top' && y === 0) {
                py += (phase % 2 === 0 ? amp : -amp);
              } else if (this.shakeSide === 'bottom' && y === this.GRID_ROWS - 1) {
                py += (phase % 2 === 0 ? -amp : amp);
              } else if (this.shakeSide === 'left' && x === 0) {
                px += (phase % 2 === 0 ? amp : -amp);
              } else if (this.shakeSide === 'right' && x === this.GRID_COLS - 1) {
                px += (phase % 2 === 0 ? -amp : amp);
              }
            }
          }
          this.ctx.fillStyle = this.cssVar('--wall-fill', '#22314a');
          this.ctx.fillRect(px + 2, py + 2, this.TILE - 4, this.TILE - 4);
          this.ctx.strokeStyle = this.cssVar('--wall-stroke', '#2f4366');
          this.ctx.strokeRect(px + 2, py + 2, this.TILE - 4, this.TILE - 4);
          // 木のオーバーレイ
          if (this.isTreeCell(x, y)) {
            if (this.images.tree) {
              this.ctx.save();
              this.ctx.imageSmoothingEnabled = false;
              this.ctx.drawImage(this.images.tree, px, py, this.TILE, this.TILE);
              this.ctx.restore();
            } else {
              this.ctx.fillStyle = '#2e7d32';
              this.ctx.fillRect(px + 6, py + 6, this.TILE - 12, this.TILE - 12);
            }
          }
        } else if (v === 2) {
          this.drawHairball(px, py);
        } else if (v === 3) {
          this.drawSand(px, py);
        } else if (v === 4) {
          this.drawClawItem(px, py);
        } else if (v === 5) {
          this.drawChuru(px, py);
        }
      }
    }
    
    this.drawCat(this.state.player.x * this.TILE, this.state.player.y * this.TILE);
    
    for (const c of this.state.crows) {
      this.drawCrow(c.x * this.TILE, c.y * this.TILE);
    }
    for (const d of this.state.dogs) {
      this.drawDog(d.x * this.TILE, d.y * this.TILE, d.hp);
    }
    
    this.ctx.restore();
    
    if (this.flashTimer > 0) {
      this.flashTimer--;
      if (this.flashOverlay) {
        this.ctx.save();
        this.ctx.globalAlpha = Math.min(1, this.flashTimer / 10);
        this.ctx.fillStyle = 'rgba(0,0,0,.4)';
        this.ctx.fillRect(0, 0, cssW, cssH);
        this.ctx.restore();
      }
      this.ctx.save();
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 24px system-ui';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(this.flashMsg || '', cssW / 2, cssH / 2);
      this.ctx.restore();
    }
    
    if (!this.state.started) {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(0,0,0,.35)';
      this.ctx.fillRect(0, 0, cssW, cssH);
      this.ctx.restore();
    } else if (this.state.over) {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(0,0,0,.55)';
      this.ctx.fillRect(0, 0, cssW, cssH);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 26px system-ui';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('ゲームオーバー', cssW / 2, cssH / 2 - 20);
      this.ctx.font = '16px system-ui';
      this.ctx.fillText('クリックでリスタート', cssW / 2, cssH / 2 + 12);
      this.ctx.restore();
    }
    
    this.updateHUD();
  }
  
  private drawCat(px: number, py: number): void {
    // 画像が存在すればそれを使用
    if (this.images.cat) {
      this.ctx.save();
      this.ctx.imageSmoothingEnabled = false;
      this.ctx.drawImage(this.images.cat, px, py, this.TILE, this.TILE);
      this.ctx.restore();
      return;
    }
    const r = this.TILE - 6;
    const x = px + 3;
    const y = py + 3;
    
    this.ctx.fillStyle = '#8ab4f8';
    this.ctx.fillRect(x, y, r, r);
    
    this.ctx.fillStyle = '#7aa2e8';
    this.ctx.beginPath();
    this.ctx.moveTo(x + 5, y + 5);
    this.ctx.lineTo(x + 12, y - 2);
    this.ctx.lineTo(x + 18, y + 5);
    this.ctx.closePath();
    this.ctx.fill();
    
    this.ctx.beginPath();
    this.ctx.moveTo(x + r - 18, y + 5);
    this.ctx.lineTo(x + r - 12, y - 2);
    this.ctx.lineTo(x + r - 5, y + 5);
    this.ctx.closePath();
    this.ctx.fill();
    
    this.ctx.fillStyle = '#0b1220';
    this.ctx.fillRect(x + 8, y + 12, 6, 6);
    this.ctx.fillRect(x + r - 14, y + 12, 6, 6);
    
    this.ctx.strokeStyle = '#cbd5e1';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(x - 2, y + 18);
    this.ctx.lineTo(x + 8, y + 18);
    this.ctx.moveTo(x + r - 8, y + 18);
    this.ctx.lineTo(x + r + 2, y + 18);
    this.ctx.stroke();
  }
  
  private drawHairball(px: number, py: number): void {
    if (this.images.hairball) {
      this.ctx.save();
      this.ctx.imageSmoothingEnabled = false;
      this.ctx.drawImage(this.images.hairball, px, py, this.TILE, this.TILE);
      this.ctx.restore();
      return;
    }
    const cx = px + this.TILE / 2;
    const cy = py + this.TILE / 2;
    const rad = this.TILE / 2 - 4;
    
    this.ctx.fillStyle = '#d6d3d1';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.strokeStyle = '#a8a29e';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, rad - 4, 0, Math.PI * 2);
    this.ctx.stroke();
    
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, rad - 8, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  private drawSand(px: number, py: number): void {
    if (this.images.sand) {
      this.ctx.save();
      this.ctx.imageSmoothingEnabled = false;
      this.ctx.drawImage(this.images.sand, px, py, this.TILE, this.TILE);
      this.ctx.restore();
      return;
    }
    this.ctx.fillStyle = '#c4b5a5';
    this.ctx.fillRect(px + 4, py + 4, this.TILE - 8, this.TILE - 8);
    this.ctx.strokeStyle = '#a78b71';
    this.ctx.strokeRect(px + 4, py + 4, this.TILE - 8, this.TILE - 8);
  }

  private drawClawItem(px: number, py: number): void {
    if (this.images.tumetogi) {
      this.ctx.save();
      this.ctx.imageSmoothingEnabled = false;
      this.ctx.drawImage(this.images.tumetogi, px, py, this.TILE, this.TILE);
      this.ctx.restore();
      return;
    }
    this.ctx.fillStyle = '#f59e0b';
    this.ctx.fillRect(px + 8, py + 8, this.TILE - 16, this.TILE - 16);
    this.ctx.strokeStyle = '#b45309';
    this.ctx.strokeRect(px + 8, py + 8, this.TILE - 16, this.TILE - 16);
  }

  private drawChuru(px: number, py: number): void {
    if (this.images.churu) {
      this.ctx.save();
      this.ctx.imageSmoothingEnabled = false;
      this.ctx.drawImage(this.images.churu, px, py, this.TILE, this.TILE);
      this.ctx.restore();
      return;
    }
    this.ctx.fillStyle = '#ff6b6b';
    this.ctx.fillRect(px + 6, py + 6, this.TILE - 12, this.TILE - 12);
    this.ctx.strokeStyle = '#b91c1c';
    this.ctx.strokeRect(px + 6, py + 6, this.TILE - 12, this.TILE - 12);
  }
  
  private drawCrow(px: number, py: number): void {
    if (this.images.crow) {
      this.ctx.save();
      this.ctx.imageSmoothingEnabled = false;
      this.ctx.drawImage(this.images.crow, px, py, this.TILE, this.TILE);
      this.ctx.restore();
      return;
    }
    const r = this.TILE - 6;
    const x = px + 3;
    const y = py + 3;
    
    this.ctx.fillStyle = '#1f2937';
    this.ctx.fillRect(x, y, r, r);
    
    this.ctx.fillStyle = '#f59e0b';
    this.ctx.fillRect(x + r - 6, y + 12, 6, 6);
    
    this.ctx.fillStyle = '#e5e7eb';
    this.ctx.fillRect(x + 6, y + 8, 5, 5);
  }

  private drawDog(px: number, py: number, hp: number): void {
    if (this.images.dog) {
      this.ctx.save();
      this.ctx.imageSmoothingEnabled = false;
      this.ctx.drawImage(this.images.dog, px, py, this.TILE, this.TILE);
      this.ctx.restore();
      return;
    }
    const r = this.TILE - 6;
    const x = px + 3;
    const y = py + 3;
    this.ctx.fillStyle = '#6b7280';
    this.ctx.fillRect(x, y, r, r);
    this.ctx.fillStyle = '#374151';
    this.ctx.fillRect(x + 4, y + 4, r - 8, r - 8);
    // HP表示（簡易）
    this.ctx.fillStyle = '#fbbf24';
    for (let i = 0; i < hp; i++) {
      this.ctx.fillRect(x + 4 + i * 8, y + r - 6, 6, 4);
    }
  }
  
  private updateHUD(): void {
    if (this.ui.score) {
      this.ui.score.textContent = `SCORE: ${this.state.score}`;
    }
    if (this.ui.lives) {
      this.ui.lives.textContent = `LIVES: ${'❤'.repeat(this.state.lives)}`;
    }
    if (this.ui.time) {
      this.ui.time.textContent = `TIME: ${this.state.time}`;
    }
    if (this.ui.clawIcon) {
      if (this.state.clawCharge > 0) {
        this.ui.clawIcon.classList.remove('hidden');
        this.ui.clawIcon.classList.add('claw-blink');
      } else {
        this.ui.clawIcon.classList.add('hidden');
        this.ui.clawIcon.classList.remove('claw-blink');
      }
    }
  }
  
  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }
      this.keys.add(e.key);
      if (e.key === ' ') {
        this.pushAction();
      }
    });
    
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key);
    });
    
    this.canvas.addEventListener('mousedown', () => {
      if (this.state.over) {
        this.restart();
      }
    });
    
    this.canvas.addEventListener('touchstart', () => {
      if (this.state.over) {
        this.restart();
      }
    }, { passive: true });
    
    if (this.ui.pushBtn) {
      this.ui.pushBtn.addEventListener('touchstart', (e) => {
        this.pushAction();
        e.preventDefault();
      }, { passive: false });
      
      this.ui.pushBtn.addEventListener('mousedown', () => {
        this.pushAction();
      });
    }
    // D-pad（十字キー）: data-key属性を持つボタンを監視
    const dpadBtns = document.querySelectorAll('[data-key]') as NodeListOf<HTMLElement>;
    dpadBtns.forEach((el) => {
      const key = el.getAttribute('data-key');
      if (!key) return;
      el.addEventListener('touchstart', (e) => {
        this.keys.add(key);
        e.preventDefault();
      }, { passive: false });
      el.addEventListener('touchend', (e) => {
        this.keys.delete(key);
        e.preventDefault();
      }, { passive: false });
      el.addEventListener('touchcancel', (e) => {
        this.keys.delete(key);
        e.preventDefault();
      }, { passive: false });
      el.addEventListener('mousedown', () => {
        this.keys.add(key);
      });
      window.addEventListener('mouseup', () => {
        this.keys.delete(key);
      });
      el.addEventListener('click', () => {
        if (!this.state.started) return;
        if (key === 'ArrowLeft') this.movePlayer(-1, 0);
        else if (key === 'ArrowRight') this.movePlayer(1, 0);
        else if (key === 'ArrowUp') this.movePlayer(0, -1);
        else if (key === 'ArrowDown') this.movePlayer(0, 1);
      });
    });
    if (this.ui.startBtn) {
      this.ui.startBtn.addEventListener('click', () => this.startGame());
    }
  }
  
  private handleKeyboardMove(): void {
    let dx = 0, dy = 0;
    
    if (this.keys.has('ArrowLeft') || this.keys.has('a')) dx = -1;
    else if (this.keys.has('ArrowRight') || this.keys.has('d')) dx = 1;
    else if (this.keys.has('ArrowUp') || this.keys.has('w')) dy = -1;
    else if (this.keys.has('ArrowDown') || this.keys.has('s')) dy = 1;
    
    if (!this.state.started) return;
    if (dx || dy) {
      this.movePlayer(dx, dy);
    }
  }
  
  private pushAction(): void {
    if (!this.state.started) return;
    const dx = this.state.lastDir.x;
    const dy = this.state.lastDir.y;
    const nx = this.state.player.x + dx;
    const ny = this.state.player.y + dy;
    
    if (this.isHairball(nx, ny)) {
      this.pushHairball(nx, ny, dx, dy);
      return;
    }
    if (this.isSand(nx, ny)) {
      // 砂山を崩す（簡易実装）
      this.state.grid[ny][nx] = 0;
      // 一定確率で爪とぎドロップ
      if (Math.random() < 0.18) {
        this.state.grid[ny][nx] = 4; // 爪とぎアイテム
      }
      this.flash('ザザーッ！（砂山が崩れた）', false);
      return;
    }
    // 境界に対して押した場合はエッジ揺れ
    if (this.isBorderCell(nx, ny)) {
      const side = this.borderSide(nx, ny);
      if (this.isTreeCell(nx, ny)) {
        // 木スタン：半径2マス、約1秒停止（表示は出さない）
        this.treeStun(nx, ny, 2, 60);
      }
      if (side) this.edgeShake(side, nx, ny);
    }
    // 爪とぎ直接攻撃（隣接マスの敵を攻撃、犬も一撃）
    if (this.state.clawCharge > 0) {
      let killedC = 0, killedD = 0;
      const beforeC = this.state.crows.length;
      this.state.crows = this.state.crows.filter(c => !(c.x === nx && c.y === ny));
      killedC = beforeC - this.state.crows.length;
      const beforeD = this.state.dogs.length;
      this.state.dogs = this.state.dogs.filter(d => !(d.x === nx && d.y === ny));
      killedD = beforeD - this.state.dogs.length;
      if (killedC + killedD > 0) {
        this.state.score += killedC * 100 + killedD * 200;
        this.state.clawCharge = 0;
        this.flash(`爪とぎ攻撃！x${killedC + killedD}`, false);
        return;
      }
    }
  }
  
  // バーチャルスティックはD-padへ置き換え済み
  
  private restart(): void {
    this.state.score = 0;
    this.state.lives = 3;
    this.state.stage = 1;
    this.state.time = 60;
    this.state.over = false;
    this.buildStage();
    this.secAccum = 0;
    this.lastTime = performance.now();
  }
  
  private startGame(): void {
    this.restart();
    this.state.started = true;
    if (this.ui.startOverlay) {
      this.ui.startOverlay.classList.add('hidden');
    }
  }
  
  private gameLoop(): void {
    const now = performance.now();
    const dt = Math.min(33, now - this.lastTime);
    this.lastTime = now;
    
    if (this.state.started && !this.state.over) {
      this.secAccum += dt;
      this.updateCrows();
      this.updateDogs();
      
      if (this.secAccum >= 1000) {
        this.state.time--;
        this.secAccum -= 1000;
        if (this.state.time <= 0) {
          this.state.over = true;
          this.flash('時間切れ！');
        }
      }
      
      for (const c of this.state.crows) {
        if (c.x === this.state.player.x && c.y === this.state.player.y) {
          this.hitPlayer();
          break;
        }
      }
      for (const d of this.state.dogs) {
        if (d.x === this.state.player.x && d.y === this.state.player.y) {
          this.hitPlayer();
          break;
        }
      }
      
      if (this.state.crows.length === 0 && this.state.dogs.length === 0) {
        this.state.stage++;
        this.state.score += 500;
        this.flash('ステージクリア！');
        this.buildStage();
      }
    }
    
    // エッジ揺れの時間経過
    if (this.shakeTimer > 0) {
      this.shakeTimer -= 1;
      if (this.shakeTimer <= 0) {
        this.shakeTimer = 0;
        this.shakeSide = null;
        this.shakeX = null;
        this.shakeY = null;
      }
    }

    this.draw();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }
  
  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  // ===== エッジ関連ユーティリティ =====
  private isBorderCell(x: number, y: number): boolean {
    if (y < 0 || y >= this.GRID_ROWS || x < 0 || x >= this.GRID_COLS) return false;
    return this.state.grid[y][x] === 1 && (x === 0 || y === 0 || x === this.GRID_COLS - 1 || y === this.GRID_ROWS - 1);
  }

  private borderSide(x: number, y: number): 'top' | 'bottom' | 'left' | 'right' | null {
    if (y === 0) return 'top';
    if (y === this.GRID_ROWS - 1) return 'bottom';
    if (x === 0) return 'left';
    if (x === this.GRID_COLS - 1) return 'right';
    return null;
  }

  private edgeShake(side: 'top' | 'bottom' | 'left' | 'right', x: number, y: number): void {
    if (this.shakeTimer > 0) return; // 連打防止
    this.shakeSide = side;
    this.shakeTimer = 18;
    this.shakeX = x;
    this.shakeY = y;
    // ここでは揺れ演出のみ。効果（スタン付与）はpushAction側で木セルに対して実行
  }

  private treeStun(cx: number, cy: number, radius: number, frames: number): void {
    const r2 = radius * radius;
    for (const c of this.state.crows) {
      const dx = c.x - cx; const dy = c.y - cy;
      if (dx * dx + dy * dy <= r2) c.stun = Math.max(c.stun || 0, frames);
    }
    for (const d of this.state.dogs) {
      const dx = d.x - cx; const dy = d.y - cy;
      if (dx * dx + dy * dy <= r2) d.stun = Math.max(d.stun || 0, frames);
    }
  }
}

new NyangoGame();

console.log('Nyango ゲームを開始しました！');
console.log('毛玉を押してカラスを倒そう！');
export {};
