import './components/card.css';
import { initExistingCard, type CardDom } from './components/card-component';

interface Card {
    id: number;
    name: string;
    image: string;
    rarity: 'common' | 'rare' | 'super-rare' | 'ultra-rare' | 'holographic';
    rarityDisplay: string;
}

const cardDatabase: Card[] = [
    // Common Cards (60% chance)
    { id: 1, name: "ミケ", image: "🐱", rarity: "common", rarityDisplay: "コモン" },
    { id: 2, name: "クロ", image: "🐈‍⬛", rarity: "common", rarityDisplay: "コモン" },
    { id: 3, name: "シロ", image: "🤍", rarity: "common", rarityDisplay: "コモン" },
    { id: 4, name: "トラ", image: "🐅", rarity: "common", rarityDisplay: "コモン" },
    { id: 5, name: "チャトラ", image: "🧡", rarity: "common", rarityDisplay: "コモン" },
    { id: 6, name: "ハチワレ", image: "🖤", rarity: "common", rarityDisplay: "コモン" },
    
    // Rare Cards (25% chance)
    { id: 7, name: "ペルシャ", image: "😸", rarity: "rare", rarityDisplay: "レア" },
    { id: 8, name: "メインクーン", image: "😺", rarity: "rare", rarityDisplay: "レア" },
    { id: 9, name: "スコティッシュ", image: "😻", rarity: "rare", rarityDisplay: "レア" },
    { id: 10, name: "マンチカン", image: "😽", rarity: "rare", rarityDisplay: "レア" },
    
    // Super Rare Cards (10% chance)
    { id: 11, name: "ライオン", image: "🦁", rarity: "super-rare", rarityDisplay: "スーパーレア" },
    { id: 12, name: "トラ", image: "🐅", rarity: "super-rare", rarityDisplay: "スーパーレア" },
    { id: 13, name: "ヒョウ", image: "🐆", rarity: "super-rare", rarityDisplay: "スーパーレア" },
    
    // Ultra Rare Cards (4% chance)
    { id: 14, name: "ネコ神様", image: "😇", rarity: "ultra-rare", rarityDisplay: "ウルトラレア" },
    { id: 15, name: "ゴールドキャット", image: "👑", rarity: "ultra-rare", rarityDisplay: "ウルトラレア" },
    
    // Holographic Cards (1% chance)
    { id: 16, name: "レインボーキャット", image: "🌈", rarity: "holographic", rarityDisplay: "ホログラム" },
    { id: 17, name: "コズミックキャット", image: "✨", rarity: "holographic", rarityDisplay: "ホログラム" },
];

class PackOpening {
    private packContainer: HTMLElement;
    private cardElement: HTMLElement;
    private resetButton: HTMLElement;
    private cardDom: CardDom;

    constructor() {
        this.packContainer = document.getElementById('packContainer')!;
        this.cardElement = document.getElementById('card')!;
        this.resetButton = document.getElementById('resetButton')!;
        // 既存DOMをカードコンポーネントとして初期化
        this.cardDom = initExistingCard(this.cardElement);

        console.log('PackOpening initialized');
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        console.log('Setting up event listeners');
        this.packContainer.addEventListener('click', () => {
            console.log('Pack clicked!');
            this.openPack();
        });
        this.packContainer.addEventListener('touchend', (e) => {
            e.preventDefault();
            console.log('Pack touched!');
            this.openPack();
        });
        this.resetButton.addEventListener('click', () => {
            console.log('Reset clicked!');
            this.reset();
        });
        this.resetButton.addEventListener('touchend', (e) => {
            e.preventDefault();
            console.log('Reset touched!');
            this.reset();
        });
    }

    private getRandomCard(): Card {
        const random = Math.random() * 100;
        
        if (random < 1) {
            // 1% chance for holographic
            return this.getRandomFromRarity('holographic');
        } else if (random < 5) {
            // 4% chance for ultra-rare
            return this.getRandomFromRarity('ultra-rare');
        } else if (random < 15) {
            // 10% chance for super-rare
            return this.getRandomFromRarity('super-rare');
        } else if (random < 40) {
            // 25% chance for rare
            return this.getRandomFromRarity('rare');
        } else {
            // 60% chance for common
            return this.getRandomFromRarity('common');
        }
    }

    private getRandomFromRarity(rarity: Card['rarity']): Card {
        const rarityCards = cardDatabase.filter(card => card.rarity === rarity);
        return rarityCards[Math.floor(Math.random() * rarityCards.length)];
    }

    private async openPack(): Promise<void> {
        console.log('Opening pack...');
        // Disable pack clicking
        this.packContainer.style.pointerEvents = 'none';
        
        // Pack opening animation
        this.packContainer.style.transform = 'scale(1.1) rotateY(10deg)';
        this.packContainer.style.transition = 'all 0.5s ease';
        
        await this.delay(500);
        
        // Hide pack with fade out
        this.packContainer.style.opacity = '0';
        this.packContainer.style.transform = 'scale(0.8) rotateY(45deg)';
        
        await this.delay(300);
        
        // Get random card and show it
        const card = this.getRandomCard();
        console.log('Got card:', card);
        this.displayCard(card);
        
        // Hide pack completely and show reset button
        this.packContainer.style.display = 'none';
        this.resetButton.style.display = 'block';
    }

    private displayCard(card: Card): void {
        const imgSrc = this.pickRarityImage(card.rarity);
        this.cardDom.setData({
            name: card.name,
            rarity: card.rarity,
            rarityDisplay: card.rarityDisplay,
            imageUrl: imgSrc || undefined,
            imageAlt: card.name,
        });

        // Show card with animation
        this.cardElement.style.display = 'flex';
        this.cardElement.classList.add('card-animate');

        // アニメーション終了後にクラスを外して transform をJSで上書き可能にする
        const onAnimEnd = (e: AnimationEvent) => {
            if (e.animationName === 'cardReveal') {
                // アニメの最終状態を維持（translateY(0)）したまま、JSの回転を上書き可能に
                this.cardElement.style.transform = 'translateY(0)';
                this.cardElement.style.opacity = '1';
                this.cardElement.classList.remove('card-animate');
                this.cardElement.removeEventListener('animationend', onAnimEnd);
            }
        };
        this.cardElement.addEventListener('animationend', onAnimEnd);

        // フォールバック: 稀に animationend が発火しない環境向け
        window.setTimeout(() => {
            try {
                const opacity = getComputedStyle(this.cardElement).opacity;
                if (opacity === '0') {
                    this.cardElement.style.opacity = '1';
                    this.cardElement.style.transform = 'translateY(0)';
                    this.cardElement.classList.remove('card-animate');
                }
            } catch {}
        }, 1200);
        
        // Add special effects for rare cards
        if (card.rarity === 'holographic') {
            this.addSparkleEffect();
        } else if (card.rarity === 'ultra-rare') {
            this.addGoldenGlow();
        }
    }

    private pickRarityImage(rarity: Card['rarity']): string {
        const rarityImagePaths: Record<Card['rarity'], string[]> = {
            'common': [
                '/app3/cards/common/nomal1.jpg',
                '/app3/cards/common/normal2.jpg',
            ],
            'rare': [
                '/app3/cards/rare/rare1.jpg',
                '/app3/cards/rare/rare2.jpeg',
            ],
            'super-rare': [
                '/app3/cards/super-rare/surper.jpg',
            ],
            'ultra-rare': [
                '/app3/cards/ultra-rare/ultra.jpg',
            ],
            'holographic': [
                '/app3/cards/holographic/holo.jpg',
            ],
        };
        const list = rarityImagePaths[rarity] || [];
        if (list.length === 0) return '';
        return list[Math.floor(Math.random() * list.length)];
    }

    private addSparkleEffect(): void {
        // Create sparkle particles
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                const sparkle = document.createElement('div');
                sparkle.style.position = 'fixed';
                sparkle.style.left = Math.random() * window.innerWidth + 'px';
                sparkle.style.top = Math.random() * window.innerHeight + 'px';
                sparkle.style.width = '4px';
                sparkle.style.height = '4px';
                sparkle.style.background = '#FFD700';
                sparkle.style.borderRadius = '50%';
                sparkle.style.pointerEvents = 'none';
                sparkle.style.zIndex = '1000';
                sparkle.style.boxShadow = '0 0 6px #FFD700';
                
                document.body.appendChild(sparkle);
                
                // Animate sparkle
                sparkle.animate([
                    { transform: 'translateY(0) scale(0)', opacity: 0 },
                    { transform: 'translateY(-100px) scale(1)', opacity: 1 },
                    { transform: 'translateY(-200px) scale(0)', opacity: 0 }
                ], {
                    duration: 2000,
                    easing: 'ease-out'
                }).onfinish = () => sparkle.remove();
            }, i * 100);
        }
    }

    private addGoldenGlow(): void {
        this.cardElement.style.boxShadow = '0 0 30px #FFD700';
        this.cardElement.style.border = '3px solid #FFD700';
    }

    private reset(): void {
        // Reset all styles and show pack again
        this.cardElement.style.display = 'none';
        this.cardElement.classList.remove('card-animate');
        this.cardElement.style.boxShadow = '';
        this.cardElement.style.border = '';
        
        this.resetButton.style.display = 'none';
        this.packContainer.style.display = 'block';
        this.packContainer.style.opacity = '1';
        this.packContainer.style.transform = 'scale(1) rotateY(0deg)';
        this.packContainer.style.pointerEvents = 'auto';
        this.packContainer.style.transition = 'transform 0.3s ease';
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize the pack opening game (dynamic import 対応)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new PackOpening());
} else {
    new PackOpening();
}
