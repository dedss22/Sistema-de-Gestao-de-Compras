const fs = require('fs');
const path = require('path');

const catalogoPath = path.resolve(__dirname, '../src/data/catalogo.json');
const buildScriptPath = path.resolve(__dirname, 'build-complete-catalog.js');

const coldCuts = [
  {
    id: "salame-italiano",
    nome: "Salame Italiano Fatiado",
    fornecedor: "frios-laticinios",
    subcategoria: "Frios Nobres & Fatiados",
    unidade: "kg",
    quantidade_por_pessoa_dia: 0.05,
    ativo: true,
    favorito: true,
    kit_tags: ["drinks", "churrasco"],
    descricaoBreve: "Fatias finas de salame italiano curado com especiarias nobres para tábua de frios.",
    imagem: "/assets/itens/salame-italiano.png",
    emoji: "🥩"
  },
  {
    id: "peito-peru",
    nome: "Peito de Peru Defumado Fatiado",
    fornecedor: "frios-laticinios",
    subcategoria: "Frios Nobres & Fatiados",
    unidade: "kg",
    quantidade_por_pessoa_dia: 0.06,
    ativo: true,
    favorito: true,
    kit_tags: ["cafe_manha", "criancas"],
    descricaoBreve: "Peito de peru defumado magro fatiado fininho, leve e saboroso.",
    imagem: "/assets/itens/peito-peru.png",
    emoji: "🍗"
  },
  {
    id: "presunto-parma",
    nome: "Presunto Cru Tipo Parma / Jamón Fatiado",
    fornecedor: "frios-laticinios",
    subcategoria: "Frios Nobres & Fatiados",
    unidade: "kg",
    quantidade_por_pessoa_dia: 0.05,
    ativo: true,
    favorito: true,
    kit_tags: ["drinks"],
    descricaoBreve: "Presunto cru curado lentamente, fatiado finíssimo, perfeito para tábuas nobres.",
    imagem: "/assets/itens/presunto-parma.png",
    emoji: "🥓"
  },
  {
    id: "copa-fatiada",
    nome: "Copa Curada Nobre Fatiada",
    fornecedor: "frios-laticinios",
    subcategoria: "Frios Nobres & Fatiados",
    unidade: "kg",
    quantidade_por_pessoa_dia: 0.05,
    ativo: true,
    favorito: false,
    kit_tags: ["drinks"],
    descricaoBreve: "Copa suína maturada artesanalmente com pimenta e vinho, sabor marcante.",
    imagem: "/assets/itens/copa-fatiada.png",
    emoji: "🥩"
  },
  {
    id: "lombo-defumado",
    nome: "Lombo Canadense Defumado Fatiado",
    fornecedor: "frios-laticinios",
    subcategoria: "Frios Nobres & Fatiados",
    unidade: "kg",
    quantidade_por_pessoa_dia: 0.05,
    ativo: true,
    favorito: false,
    kit_tags: ["cafe_manha", "drinks"],
    descricaoBreve: "Lombo suíno magro delicadamente defumado e fatiado para lanches e petiscos.",
    imagem: "/assets/itens/lombo-defumado.png",
    emoji: "🥓"
  },
  {
    id: "mortadela-defumada",
    nome: "Mortadela Defumada Especial Fatiada",
    fornecedor: "frios-laticinios",
    subcategoria: "Frios Nobres & Fatiados",
    unidade: "kg",
    quantidade_por_pessoa_dia: 0.06,
    ativo: true,
    favorito: false,
    kit_tags: ["cafe_manha", "drinks"],
    descricaoBreve: "Mortadela nobre defumada fatiada fininha no padrão charcutaria italiana.",
    imagem: "/assets/itens/mortadela-defumada.png",
    emoji: "🥩"
  }
];

const cheeses = [
  {
    id: "queijo-gorgonzola",
    nome: "Queijo Gorgonzola Nobre",
    fornecedor: "frios-laticinios",
    subcategoria: "Queijos Especiais",
    unidade: "kg",
    quantidade_por_pessoa_dia: 0.05,
    ativo: true,
    favorito: true,
    kit_tags: ["drinks"],
    descricaoBreve: "Queijo azul nobre de textura cremosa e veios azuis de sabor acentuado.",
    imagem: "/assets/itens/queijo-gorgonzola.png",
    emoji: "🧀"
  },
  {
    id: "queijo-brie",
    nome: "Queijo Brie Cremoso",
    fornecedor: "frios-laticinios",
    subcategoria: "Queijos Especiais",
    unidade: "un",
    quantidade_por_pessoa_dia: 0.06,
    ativo: true,
    favorito: true,
    kit_tags: ["drinks"],
    descricaoBreve: "Peça de queijo brie com casca branca aveludada e massa macia e cremosa.",
    imagem: "/assets/itens/queijo-brie.png",
    emoji: "🧀"
  },
  {
    id: "queijo-gouda",
    nome: "Queijo Gouda Holandês",
    fornecedor: "frios-laticinios",
    subcategoria: "Queijos Especiais",
    unidade: "kg",
    quantidade_por_pessoa_dia: 0.06,
    ativo: true,
    favorito: true,
    kit_tags: ["drinks", "cafe_manha"],
    descricaoBreve: "Queijo gouda suave e amanteigado de consistência macia para tábuas e sanduíches.",
    imagem: "/assets/itens/queijo-gouda.png",
    emoji: "🧀"
  },
  {
    id: "queijo-provolone",
    nome: "Queijo Provolone Defumado",
    fornecedor: "frios-laticinios",
    subcategoria: "Queijos Especiais",
    unidade: "kg",
    quantidade_por_pessoa_dia: 0.06,
    ativo: true,
    favorito: false,
    kit_tags: ["drinks", "churrasco"],
    descricaoBreve: "Provolone curado e defumado em lascas ou cubos para petisco de boteco chique.",
    imagem: "/assets/itens/queijo-provolone.png",
    emoji: "🧀"
  },
  {
    id: "queijo-parmesao-pedaco",
    nome: "Queijo Parmesão Tipo Grana (Cunha / Pedaço)",
    fornecedor: "frios-laticinios",
    subcategoria: "Queijos Especiais",
    unidade: "kg",
    quantidade_por_pessoa_dia: 0.05,
    ativo: true,
    favorito: true,
    kit_tags: ["drinks"],
    descricaoBreve: "Cunha de parmesão curado cristalino para lascar diretamente na tábua de frios.",
    imagem: "/assets/itens/queijo-parmesao-pedaco.png",
    emoji: "🧀"
  }
];

// 1. Update catalogo.json
let cat = JSON.parse(fs.readFileSync(catalogoPath, 'utf8'));

// Remove frios-variados
cat = cat.filter(x => x.id !== 'frios-variados');

// Find index of presunto-fatiado to insert coldCuts right after it
const presuntoIdx = cat.findIndex(x => x.id === 'presunto-fatiado');
if (presuntoIdx !== -1) {
  // Remove if any already exist to avoid duplicates
  const newIds = new Set([...coldCuts, ...cheeses].map(x => x.id));
  cat = cat.filter(x => !newIds.has(x.id));
  
  // Re-find presuntoIdx
  const pIdx = cat.findIndex(x => x.id === 'presunto-fatiado');
  cat.splice(pIdx + 1, 0, ...coldCuts);
} else {
  cat.push(...coldCuts);
}

// Find index of queijo-parmesao-ralado to insert cheeses right after it
const parmesaoIdx = cat.findIndex(x => x.id === 'queijo-parmesao-ralado');
if (parmesaoIdx !== -1) {
  cat.splice(parmesaoIdx + 1, 0, ...cheeses);
} else {
  cat.push(...cheeses);
}

fs.writeFileSync(catalogoPath, JSON.stringify(cat, null, 2), 'utf8');
console.log('catalogo.json updated successfully! Total items:', cat.length);

// 2. Update build-complete-catalog.js
let buildCode = fs.readFileSync(buildScriptPath, 'utf8');

// Replace frios-variados block with coldCuts in build-complete-catalog.js
const friosBlockRegex = /\{\s*id:\s*"frios-variados"[\s\S]*?emoji:\s*"🧀"\s*\},?\n/m;
if (friosBlockRegex.test(buildCode)) {
  const coldCutsJs = coldCuts.map(item => `  {\n    id: "${item.id}",\n    nome: "${item.nome}",\n    fornecedor: "${item.fornecedor}",\n    subcategoria: "${item.subcategoria}",\n    unidade: "${item.unidade}",\n    quantidade_por_pessoa_dia: ${item.quantidade_por_pessoa_dia.toFixed(2)},\n    ativo: true,\n    favorito: ${item.favorito},\n    kit_tags: ${JSON.stringify(item.kit_tags)},\n    descricaoBreve: "${item.descricaoBreve}",\n    imagem: "${item.imagem}",\n    emoji: "${item.emoji}"\n  }`).join(',\n') + ',\n';
  buildCode = buildCode.replace(friosBlockRegex, coldCutsJs);
  console.log('Replaced frios-variados in build-complete-catalog.js with coldCuts');
}

// Add cheeses right after queijo-parmesao-ralado
const parmesaoBlockRegex = /(\{\s*id:\s*"queijo-parmesao-ralado"[\s\S]*?emoji:\s*"🧀"\s*\},?\n)/m;
if (parmesaoBlockRegex.test(buildCode) && !buildCode.includes('queijo-gorgonzola')) {
  const cheesesJs = cheeses.map(item => `  {\n    id: "${item.id}",\n    nome: "${item.nome}",\n    fornecedor: "${item.fornecedor}",\n    subcategoria: "${item.subcategoria}",\n    unidade: "${item.unidade}",\n    quantidade_por_pessoa_dia: ${item.quantidade_por_pessoa_dia.toFixed(2)},\n    ativo: true,\n    favorito: ${item.favorito},\n    kit_tags: ${JSON.stringify(item.kit_tags)},\n    descricaoBreve: "${item.descricaoBreve}",\n    imagem: "${item.imagem}",\n    emoji: "${item.emoji}"\n  }`).join(',\n') + ',\n';
  buildCode = buildCode.replace(parmesaoBlockRegex, `$1${cheesesJs}`);
  console.log('Added cheeses after queijo-parmesao-ralado in build-complete-catalog.js');
}

fs.writeFileSync(buildScriptPath, buildCode, 'utf8');
console.log('build-complete-catalog.js updated successfully!');
