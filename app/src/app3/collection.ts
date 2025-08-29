import './components/card.css';
import { createCardElement, type CardRarity } from './components/card-component';

type Sample = {
  name: string;
  rarity: CardRarity;
  rarityDisplay: string;
  imageUrl: string;
};

const samples: Sample[] = [
  { name: 'コモン', rarity: 'common', rarityDisplay: 'コモン', imageUrl: '/app3/cards/common/nomal1.jpg' },
  { name: 'レア', rarity: 'rare', rarityDisplay: 'レア', imageUrl: '/app3/cards/rare/rare1.jpg' },
  { name: 'スーパーレア', rarity: 'super-rare', rarityDisplay: 'スーパーレア', imageUrl: '/app3/cards/super-rare/surper.jpg' },
  { name: 'ウルトラレア', rarity: 'ultra-rare', rarityDisplay: 'ウルトラレア', imageUrl: '/app3/cards/ultra-rare/ultra.jpg' },
  { name: 'ホログラム', rarity: 'holographic', rarityDisplay: 'ホログラム', imageUrl: '/app3/cards/holographic/holo.jpg' },
];

function ensureGrid(): HTMLElement {
  let grid = document.getElementById('grid');
  if (!grid) {
    grid = document.createElement('div');
    grid.id = 'grid';
    grid.className = 'collection-grid';
    document.body.appendChild(grid);
  }
  return grid;
}

function renderCollection(): void {
  const grid = ensureGrid();
  grid.innerHTML = '';
  for (const s of samples) {
    const card = createCardElement({
      name: s.name,
      rarity: s.rarity,
      rarityDisplay: s.rarityDisplay,
      imageUrl: s.imageUrl,
      imageAlt: s.name,
    });
    grid.appendChild(card.root);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderCollection);
} else {
  renderCollection();
}

