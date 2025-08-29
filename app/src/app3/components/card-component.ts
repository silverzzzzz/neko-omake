export type CardRarity = 'common' | 'rare' | 'super-rare' | 'ultra-rare' | 'holographic';

export interface CardData {
  name: string;
  rarity: CardRarity;
  rarityDisplay: string;
  imageUrl?: string;
  imageAlt?: string;
}

export interface CardDom {
  root: HTMLElement;
  nameEl: HTMLElement;
  imageEl: HTMLElement;
  rarityEl: HTMLElement;
  effectsEl: HTMLElement | null;
  setData: (data: CardData) => void;
}

export function createCardElement(initial?: Partial<CardData>): CardDom {
  const root = document.createElement('div');
  root.className = 'card';

  // inner DOM
  const nameEl = document.createElement('div');
  nameEl.className = 'card-name';
  nameEl.innerHTML = '<span class="name-text"></span><span class="name-badge">Trainer Gallery</span>';

  const imageEl = document.createElement('div');
  imageEl.className = 'card-image';

  const vignette = document.createElement('div');
  vignette.className = 'card-vignette';
  vignette.setAttribute('aria-hidden', 'true');

  const effectsEl = document.createElement('div');
  effectsEl.className = 'card-effects';
  effectsEl.setAttribute('aria-hidden', 'true');

  const rarityEl = document.createElement('div');
  rarityEl.className = 'card-rarity';

  root.appendChild(nameEl);
  root.appendChild(imageEl);
  root.appendChild(vignette);
  root.appendChild(effectsEl);
  root.appendChild(rarityEl);

  const dom: CardDom = {
    root,
    nameEl,
    imageEl,
    rarityEl,
    effectsEl,
    setData: (data: CardData) => applyData(dom, data),
  };

  attachInteractiveTilt(root);

  if (initial) {
    // apply defaults for safety
    dom.setData({
      name: initial.name ?? '',
      rarity: initial.rarity ?? 'common',
      rarityDisplay: initial.rarityDisplay ?? '',
      imageUrl: initial.imageUrl,
      imageAlt: initial.imageAlt ?? initial.name ?? '',
    });
  }

  return dom;
}

export function initExistingCard(root: HTMLElement): CardDom {
  const nameEl = root.querySelector('.card-name') as HTMLElement;
  // ensure name-text span exists for styling
  let nameText = nameEl.querySelector('.name-text') as HTMLElement | null;
  if (!nameText) {
    nameText = document.createElement('span');
    nameText.className = 'name-text';
    const badge = nameEl.querySelector('.name-badge');
    if (badge && badge.parentElement === nameEl) {
      nameEl.insertBefore(nameText, badge);
    } else {
      nameEl.appendChild(nameText);
    }
  }
  const imageEl = root.querySelector('.card-image') as HTMLElement;
  const rarityEl = root.querySelector('.card-rarity') as HTMLElement;
  const effectsEl = root.querySelector('.card-effects') as HTMLElement | null;

  attachInteractiveTilt(root);

  return {
    root, nameEl, imageEl, rarityEl, effectsEl,
    setData: (data: CardData) => applyData({ root, nameEl, imageEl, rarityEl, effectsEl, setData: () => {} }, data)
  } as CardDom;
}

function applyData(dom: CardDom, data: CardData): void {
  const nameText = dom.nameEl.querySelector('.name-text') as HTMLElement | null;
  if (nameText) {
    nameText.textContent = data.name;
  } else {
    dom.nameEl.textContent = data.name;
  }
  dom.root.setAttribute('data-rarity', data.rarity);
  dom.rarityEl.textContent = data.rarityDisplay;
  dom.rarityEl.className = `card-rarity ${data.rarity}`;
  if (data.imageUrl) {
    const alt = data.imageAlt ?? data.name ?? '';
    dom.imageEl.innerHTML = `<img src="${data.imageUrl}" alt="${alt}">`;
  } else {
    dom.imageEl.innerHTML = '';
  }
}

export function attachInteractiveTilt(el: HTMLElement): void {
  const update = (clientX: number, clientY: number) => {
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const px = Math.max(0, Math.min(1, x / rect.width));
    const py = Math.max(0, Math.min(1, y / rect.height));
    const ry = (px - 0.5) * 18;
    const rx = (0.5 - py) * 18;
    el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    el.classList.add('is-hovered');
    el.style.setProperty('--mx', px.toString());
    el.style.setProperty('--my', py.toString());
    const dx = px - 0.5; const dy = py - 0.5;
    const ang = Math.atan2(dy, dx) * 180 / Math.PI;
    const dist = Math.min(1, Math.hypot(dx, dy) * 2);
    el.style.setProperty('--ang-deg', `${ang}deg`);
    el.style.setProperty('--int', dist.toFixed(2));
    el.style.setProperty('--parx', dx.toFixed(3));
    el.style.setProperty('--pary', dy.toFixed(3));
  };

  const onPointerMove = (e: PointerEvent) => update(e.clientX, e.clientY);
  const onPointerEnter = (e: PointerEvent) => update(e.clientX, e.clientY);
  const onPointerOver = (e: PointerEvent) => update(e.clientX, e.clientY);
  const onPointerLeave = () => {
    el.classList.remove('is-hovered');
    el.style.transform = 'translateY(0)';
    el.style.removeProperty('--mx');
    el.style.removeProperty('--my');
    el.style.removeProperty('--parx');
    el.style.removeProperty('--pary');
  };
  const onPointerDown = (e: PointerEvent) => { try { (el as any).setPointerCapture?.(e.pointerId); } catch {} };
  const onPointerUp = (e: PointerEvent) => { try { (el as any).releasePointerCapture?.(e.pointerId); } catch {} };

  el.addEventListener('pointermove', onPointerMove, { passive: true } as any);
  el.addEventListener('pointerenter', onPointerEnter, { passive: true } as any);
  el.addEventListener('pointerover', onPointerOver, { passive: true } as any);
  el.addEventListener('pointerleave', onPointerLeave);
  el.addEventListener('pointerdown', onPointerDown);
  el.addEventListener('pointerup', onPointerUp);
}
