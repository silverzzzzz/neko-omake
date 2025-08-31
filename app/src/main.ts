import './style.css';

interface AppInfo {
  id: string;
  title: string;
  description: string;
  path: string;
}

const apps: AppInfo[] = [
  {
    id: 'app1',
    title: 'シンプルゲーム',
    description: '矢印キーまたはWASDで緑の四角を動かすシンプルなゲーム',
    path: '/app1/index.html'
  },
  {
    id: 'app2',
    title: 'Nyango',
    description: '毛玉×木スタン×爪とぎ！犬も登場、毛玉3連でチュール出現',
    path: '/app2/index.html'
  },
  {
    id: 'app3',
    title: 'Nyancard',
    description: 'カードパック開封ゲーム - 様々なレアリティの猫カードを集めよう',
    path: '/app3/index.html'
  }
];

class AppLauncher {
  private container: HTMLElement;

  constructor() {
    this.container = document.getElementById('app') as HTMLElement;
    this.init();
  }

  private init(): void {
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div class="launcher">
        <div class="toolbar"><button class="theme-toggle" id="themeToggle">🌞 ライト</button></div>
        <h1 class="launcher-title">Neko-Omake アプリケーション</h1>
        <div class="app-grid">
          ${apps.map(app => this.createAppCard(app)).join('')}
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private createAppCard(app: AppInfo): string {
    const isAvailable = app.id === 'app1' || app.id === 'app2' || app.id === 'app3';
    return `
      <div class="app-card ${!isAvailable ? 'app-card--disabled' : ''}" data-app-id="${app.id}">
        <h2 class="app-card__title">${app.title}</h2>
        <p class="app-card__description">${app.description}</p>
        ${isAvailable 
          ? `<button class="app-card__button" data-app-path="${app.path}">起動</button>`
          : `<button class="app-card__button" disabled>準備中</button>`
        }
      </div>
    `;
  }

  private attachEventListeners(): void {
    // アプリ起動ボタンのイベントリスナーを追加
    const appButtons = document.querySelectorAll('.app-card__button[data-app-path]');
    appButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        const path = target.dataset.appPath;
        if (path) {
          window.location.href = path;
        }
      });
    });

    // テーマ切り替えボタン
    const btn = document.getElementById('themeToggle') as HTMLButtonElement | null;
    if (btn) {
      const current = getTheme();
      btn.textContent = current === 'dark' ? '🌙 ダーク' : '🌞 ライト';
      btn.addEventListener('click', () => {
        const next = getTheme() === 'dark' ? 'light' : 'dark';
        setTheme(next);
        btn.textContent = next === 'dark' ? '🌙 ダーク' : '🌞 ライト';
      });
    }
  }
}

type Theme = 'light' | 'dark';

function getTheme(): Theme {
  const saved = localStorage.getItem('theme') as Theme | null;
  return saved === 'dark' ? 'dark' : 'light';
}

function setTheme(theme: Theme): void {
  localStorage.setItem('theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
}

function initApp() {
  // デフォルトはライトテーマ
  setTheme(getTheme());
  new AppLauncher();
  console.log('アプリランチャーを起動しました');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
