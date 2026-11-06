import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const catalogoPath = path.join(__dirname, '../src/data/catalogo.json');
const catalogo = JSON.parse(fs.readFileSync(catalogoPath, 'utf-8'));
const assetsDir = path.join(__dirname, '../public/assets/itens');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Visual themes per supplier
const THEMES = {
  peixaria: { bg: '#f0f9ff', accent: '#0284c7', circle: '#e0f2fe', emoji: '🐟' },
  acougue: { bg: '#fef2f2', accent: '#dc2626', circle: '#fee2e2', emoji: '🥩' },
  hortifruti: { bg: '#f0fdf4', accent: '#16a34a', circle: '#dcfce7', emoji: '🥑' },
  mercado: { bg: '#fffbeb', accent: '#d97706', circle: '#fef3c7', emoji: '🛒' }
};

// Specific emojis/icons for items
const ITEM_EMOJIS = {
  // Peixaria
  'robalo-postas': '🐟',
  'badejo-file': '🐟',
  'camarao-vg': '🦐',
  'polvo-inteiro': '🐙',
  'salmao-fresco': '🍣',
  'lagosta-cauda': '🦞',
  'lula-tubo': '🦑',
  'siri-catado': '🦀',
  'marisco-mangue': '🦪',
  'atum-lombo': '🐟',
  'dourado-postas': '🐠',
  'peixe-vermelho': '🐡',
  'camarao-medio': '🍤',
  'ostra-fresca': '🦪',
  'sururu-limpo': '🥘',
  'file-saint-peter': '🐟',
  'caranguejo-catado': '🦀',
  'camarao-seco': '🦐',
  'arraia-fresca': '🐡',
  'peixe-branco-moqueca': '🍲',

  // Açougue
  'picanha-prime': '🥩',
  'ancho-argentino': '🥩',
  'maminha-grill': '🥩',
  'file-mignon': '🍖',
  'fraldinha-red': '🥩',
  'linguica-artesanal': '🌭',
  'costelinha-suina': '🍖',
  'picanha-suina': '🥩',
  'bife-chorizo': '🥩',
  'alcatra-miolo': '🥩',
  'coxa-sobrecoxa-desossada': '🍗',
  'peito-frango-file': '🍗',
  'carne-moida-prime': '🥩',
  'costela-gaucha': '🍖',
  'coracao-frango': '🍢',
  'bacon-manta': '🥓',
  'paleta-cordeiro': '🍖',
  'queijo-coalho-espeto': '🧀',
  'linguica-cuiabana': '🌭',
  'lagarto-bovino': '🥩',

  // Hortifruti
  'manga-espada': '🥭',
  'banana-terra': '🍌',
  'coco-verde': '🥥',
  'limao-taiti': '🍋',
  'abacaxi-perola': '🍍',
  'maracuja-doce': '🍈',
  'cacau-fruta': '🍫',
  'mamao-papaya': '🍈',
  'tomate-italiano': '🍅',
  'cebola-branca': '🧅',
  'cebola-roxa': '🧅',
  'alho-roxo': '🧄',
  'cheiro-verde-coentro': '🌿',
  'alface-hidroponica': '🥬',
  'rucula-selvatica': '🌱',
  'mandioca-aipim': '🥔',
  'gengibre-raiz': '🫚',
  'melancia-baby': '🍉',
  'abacate-manteiga': '🥑',
  'hortela-fresco': '🍃',

  // Mercado
  'agua-mineral-5l': '💧',
  'agua-mineral-com-gas': '🫧',
  'gelo-filtrado-5kg': '🧊',
  'carvao-vegetal-especial': '🪵',
  'cafe-gourmet-moido': '☕',
  'tapioca-goma': '🥞',
  'leite-integral-fresco': '🥛',
  'pao-frances-artesanal': '🥖',
  'azeite-dende': '🫒',
  'leite-coco-artesanal': '🥥',
  'azeite-oliva-extra': '🍾',
  'queijo-mussarela': '🧀',
  'manteiga-fazenda': '🧈',
  'cerveja-heineken-longneck': '🍺',
  'gin-artesanal': '🍸',
  'cachaca-envelhecida': '🍶',
  'acucar-demerara': '🍯',
  'papel-toalha-duplo': '🧻',
  'detergente-biodegradavel': '🧼',
  'guardanapos-linho-papel': '🍽️'
};

catalogo.forEach((item) => {
  const theme = THEMES[item.fornecedor] || THEMES.mercado;
  const emoji = ITEM_EMOJIS[item.id] || theme.emoji;

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240" width="320" height="240">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="${theme.bg}"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.06"/>
    </filter>
  </defs>
  
  <!-- Fundo limpo e suave -->
  <rect width="320" height="240" rx="20" fill="url(#bgGrad)"/>
  
  <!-- Halo sutil sob o item -->
  <circle cx="160" cy="120" r="75" fill="${theme.circle}" filter="url(#shadow)"/>
  
  <!-- Ilustração do Item (Emoji ampliado e nítido) -->
  <text x="160" y="145" font-size="82" text-anchor="middle" font-family="'Segoe UI Emoji', 'Apple Color Emoji', 'Noto Color Emoji', sans-serif">
    ${emoji}
  </text>
  
  <!-- Borda sutil e elegante -->
  <rect x="1" y="1" width="318" height="238" rx="19" fill="none" stroke="${theme.accent}" stroke-width="1.5" stroke-opacity="0.15"/>
</svg>`;

  const svgPath = path.join(assetsDir, `${item.id}.svg`);
  fs.writeFileSync(svgPath, svgContent);

  // Also create .png as SVG content or copy if needed
  const pngPath = path.join(assetsDir, `${item.id}.png`);
  if (!fs.existsSync(pngPath)) {
    fs.writeFileSync(pngPath, svgContent);
  }
});

console.log('Todos os assets visuais gerados com sucesso!');
