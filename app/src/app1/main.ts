class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private player: {
    x: number;
    y: number;
    width: number;
    height: number;
    speed: number;
    color: string;
  };

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    
    this.canvas.width = 800;
    this.canvas.height = 600;

    this.player = {
      x: this.canvas.width / 2 - 25,
      y: this.canvas.height / 2 - 25,
      width: 50,
      height: 50,
      speed: 5,
      color: '#4ade80'
    };

    this.init();
  }

  private init(): void {
    this.setupEventListeners();
    this.gameLoop();
  }

  private setupEventListeners(): void {
    const keys: { [key: string]: boolean } = {};

    window.addEventListener('keydown', (e) => {
      keys[e.key] = true;
    });

    window.addEventListener('keyup', (e) => {
      keys[e.key] = false;
    });

    const handleMovement = () => {
      if (keys['ArrowUp'] || keys['w']) {
        this.player.y = Math.max(0, this.player.y - this.player.speed);
      }
      if (keys['ArrowDown'] || keys['s']) {
        this.player.y = Math.min(
          this.canvas.height - this.player.height,
          this.player.y + this.player.speed
        );
      }
      if (keys['ArrowLeft'] || keys['a']) {
        this.player.x = Math.max(0, this.player.x - this.player.speed);
      }
      if (keys['ArrowRight'] || keys['d']) {
        this.player.x = Math.min(
          this.canvas.width - this.player.width,
          this.player.x + this.player.speed
        );
      }
    };

    setInterval(handleMovement, 16);
  }

  private render(): void {
    this.ctx.fillStyle = '#1e1b4b';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.ctx.fillStyle = this.player.color;
    this.ctx.fillRect(
      this.player.x,
      this.player.y,
      this.player.width,
      this.player.height
    );

    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = '16px Arial';
    this.ctx.fillText('矢印キーまたはWASDで移動', 10, 30);
  }

  private gameLoop(): void {
    this.render();
    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  public destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

const game = new Game();

console.log('ゲームを開始しました！');
console.log('矢印キーまたはWASDキーで操作できます。');