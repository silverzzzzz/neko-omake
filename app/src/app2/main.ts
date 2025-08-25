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
}

class NyangoGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private images: { cat?: HTMLImageElement; crow?: HTMLImageElement; hairball?: HTMLImageElement } = {};
  private dpr = 1;
  
  private GRID_COLS = 12;
  private GRID_ROWS = 16;
  private TILE = 32;
  private BOARD_W: number;
  private BOARD_H: number;
  
  private state: GameState;
  private keys: Set<string> = new Set();
  private stickActive = false;
  private stickStart = { x: 0, y: 0 };
  
  private ui: {
    score: HTMLElement | null;
    lives: HTMLElement | null;
    time: HTMLElement | null;
    pushBtn: HTMLElement | null;
    stick: HTMLElement | null;
    nub: HTMLElement | null;
    startOverlay: HTMLElement | null;
    startBtn: HTMLElement | null;
  };
  
  private flashMsg: string | null = null;
  private flashTimer = 0;
  private flashOverlay = true;
  private lastTime = 0;
  private secAccum = 0;
  // エッジ揺れ演出
  private shakeSide: 'top' | 'bottom' | 'left' | 'right' | null = null;
  private shakeTimer = 0;
  
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
      stick: document.getElementById('stick'),
      nub: document.getElementById('nub'),
      startOverlay: document.getElementById('startOverlay'),
      startBtn: document.getElementById('startBtn')
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
      crows: []
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
    this.state.grid = Array.from({ length: this.GRID_ROWS }, () => Array(this.GRID_COLS).fill(0));
    
    for (let y = 0; y < this.GRID_ROWS; y++) {
      for (let x = 0; x < this.GRID_COLS; x++) {
        if (x === 0 || y === 0 || x === this.GRID_COLS - 1 || y === this.GRID_ROWS - 1) {
          this.state.grid[y][x] = 1;
        }
      }
    }
    
    for (let y = 1; y < this.GRID_ROWS - 1; y++) {
      for (let x = 1; x < this.GRID_COLS - 1; x++) {
        if (Math.random() < 0.10) {
          this.state.grid[y][x] = 1;
        } else if (Math.random() < 0.08) {
          this.state.grid[y][x] = 2;
        }
      }
    }
    
    this.state.player.x = 2;
    this.state.player.y = this.GRID_ROWS - 3;
    this.state.grid[this.state.player.y][this.state.player.x] = 0;
    this.state.grid[this.state.player.y][this.state.player.x + 1] = 0;
    
    this.state.crows = [];
    const crowCount = Math.min(6 + this.state.stage, 12);
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
    return this.state.grid[y] && this.state.grid[y][x] === 0;
  }
  
  private isHairball(x: number, y: number): boolean {
    return this.state.grid[y] && this.state.grid[y][x] === 2;
  }
  
  private movePlayer(dx: number, dy: number): void {
    if (!this.state.started || this.state.over || (dx === 0 && dy === 0)) return;
    
    const nx = this.state.player.x + dx;
    const ny = this.state.player.y + dy;
    this.state.lastDir = { x: dx, y: dy };
    
    if (this.canWalk(nx, ny)) {
      this.state.player.x = nx;
      this.state.player.y = ny;
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
    }
    
    this.state.grid[hy][hx] = 2;
    
    const before = this.state.crows.length;
    this.state.crows = this.state.crows.filter(c => !c.hit);
    const killed = before - this.state.crows.length;
    
    if (killed > 0) {
      this.state.score += 100 * killed * (killed > 1 ? killed : 1);
      this.flash(`カラスを倒した！x${killed}`);
    }
    
    return true;
  }
  
  private updateCrows(): void {
    for (const c of this.state.crows) {
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
          // 境界の壁を揺らす演出
          if (this.shakeSide && this.shakeTimer > 0) {
            const phase = this.shakeTimer;
            const amp = 2;
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
          this.ctx.fillStyle = this.cssVar('--wall-fill', '#22314a');
          this.ctx.fillRect(px + 2, py + 2, this.TILE - 4, this.TILE - 4);
          this.ctx.strokeStyle = this.cssVar('--wall-stroke', '#2f4366');
          this.ctx.strokeRect(px + 2, py + 2, this.TILE - 4, this.TILE - 4);
        } else if (v === 2) {
          this.drawHairball(px, py);
        }
      }
    }
    
    this.drawCat(this.state.player.x * this.TILE, this.state.player.y * this.TILE);
    
    for (const c of this.state.crows) {
      this.drawCrow(c.x * this.TILE, c.y * this.TILE);
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
    
    if (this.ui.stick) {
      this.ui.stick.addEventListener('touchstart', (e) => {
        const t = e.changedTouches[0];
        this.onStickStart(t.clientX, t.clientY);
        e.preventDefault();
      }, { passive: false });
      
      this.ui.stick.addEventListener('touchmove', (e) => {
        const t = e.changedTouches[0];
        this.onStickMove(t.clientX, t.clientY);
        e.preventDefault();
      }, { passive: false });
      
      this.ui.stick.addEventListener('touchend', (e) => {
        this.onStickEnd();
        e.preventDefault();
      }, { passive: false });
      
      this.ui.stick.addEventListener('mousedown', (e) => {
        this.onStickStart(e.clientX, e.clientY);
      });
      
      this.ui.stick.addEventListener('mousemove', (e) => {
        if (this.stickActive) {
          this.onStickMove(e.clientX, e.clientY);
        }
      });
      
      window.addEventListener('mouseup', () => this.onStickEnd());
    }
    
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
    // 境界に対して押した場合はエッジ揺れ
    if (this.isBorderCell(nx, ny)) {
      const side = this.borderSide(nx, ny);
      if (side) this.edgeShake(side);
    }
  }
  
  private stickCenter(): { x: number; y: number } {
    if (!this.ui.stick) return { x: 0, y: 0 };
    const rect = this.ui.stick.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    };
  }
  
  private setNub(dx: number, dy: number): void {
    if (!this.ui.nub) return;
    const len = Math.hypot(dx, dy);
    const max = 60;
    if (len > max) {
      dx = dx / len * max;
      dy = dy / len * max;
    }
    this.ui.nub.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }
  
  private resetNub(): void {
    if (!this.ui.nub) return;
    this.ui.nub.style.transform = 'translate(-50%, -50%)';
  }
  
  private dirFromVector(dx: number, dy: number): Position {
    if (Math.abs(dx) > Math.abs(dy)) {
      return { x: Math.sign(dx), y: 0 };
    } else {
      return { x: 0, y: Math.sign(dy) };
    }
  }
  
  private onStickStart(x: number, y: number): void {
    this.stickActive = true;
    this.stickStart = { x, y };
    this.setNub(0, 0);
  }
  
  private onStickMove(x: number, y: number): void {
    if (!this.stickActive) return;
    const cx = this.stickCenter();
    const dx = x - cx.x;
    const dy = y - cx.y;
    this.setNub(dx, dy);
    const dir = this.dirFromVector(dx, dy);
    if (dir.x || dir.y) {
      this.movePlayer(dir.x, dir.y);
    }
  }
  
  private onStickEnd(): void {
    this.stickActive = false;
    this.resetNub();
  }
  
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
      
      if (this.state.crows.length === 0) {
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

  private edgeShake(side: 'top' | 'bottom' | 'left' | 'right'): void {
    if (this.shakeTimer > 0) return; // 連打防止
    this.shakeSide = side;
    this.shakeTimer = 18;
    const before = this.state.crows.length;
    if (side === 'top') {
      this.state.crows = this.state.crows.filter(c => c.y !== 1);
    } else if (side === 'bottom') {
      this.state.crows = this.state.crows.filter(c => c.y !== this.GRID_ROWS - 2);
    } else if (side === 'left') {
      this.state.crows = this.state.crows.filter(c => c.x !== 1);
    } else if (side === 'right') {
      this.state.crows = this.state.crows.filter(c => c.x !== this.GRID_COLS - 2);
    }
    const killed = before - this.state.crows.length;
    if (killed > 0) {
      this.state.score += 100 * killed;
      this.flash(`バリアヒット！x${killed}`, false);
    } else {
      this.flash('バリアシェイク！', false);
    }
  }
}

const game = new NyangoGame();

console.log('Nyango ゲームを開始しました！');
console.log('毛玉を押してカラスを倒そう！');
