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
    path: '/app1/'
  },
  {
    id: 'app2',
    title: 'Nyango',
    description: '毛玉を転がしてカラスを倒すアクションパズルゲーム',
    path: '/app2/'
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
        <h1 class="launcher-title">Neko-Omake アプリケーション</h1>
        <div class="app-grid">
          ${apps.map(app => this.createAppCard(app)).join('')}
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private createAppCard(app: AppInfo): string {
    const isAvailable = app.id === 'app1' || app.id === 'app2';
    return `
      <div class="app-card ${!isAvailable ? 'app-card--disabled' : ''}" data-app-id="${app.id}">
        <h2 class="app-card__title">${app.title}</h2>
        <p class="app-card__description">${app.description}</p>
        ${isAvailable 
          ? `<button class="app-card__button" data-path="${app.path}">起動</button>`
          : `<button class="app-card__button" disabled>準備中</button>`
        }
      </div>
    `;
  }

  private attachEventListeners(): void {
    const buttons = this.container.querySelectorAll('.app-card__button:not([disabled])');
    buttons.forEach(button => {
      button.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        const path = target.getAttribute('data-path');
        if (path) {
          window.location.href = path;
        }
      });
    });
  }
}

function initApp() {
  new AppLauncher();
  console.log('アプリランチャーを起動しました');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}