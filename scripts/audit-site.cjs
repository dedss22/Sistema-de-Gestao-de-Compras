const fs = require('fs');
const cat = JSON.parse(fs.readFileSync('C:/Users/Paralelo 17/.gemini/antigravity/scratch/lista-compras-casa/src/data/catalogo.json', 'utf8'));

console.log('Total items in catalog: ' + cat.length);

const byFornecedor = {};
const imgCount = {};
const imgToItems = {};

cat.forEach(item => {
  const f = item.fornecedor || 'sem_fornecedor';
  if (!byFornecedor[f]) byFornecedor[f] = [];
  byFornecedor[f].push(item);

  const img = item.imagem || 'SEM_IMAGEM';
  imgCount[img] = (imgCount[img] || 0) + 1;
  if (!imgToItems[img]) imgToItems[img] = [];
  imgToItems[img].push(item.id + ' (' + item.nome + ' - ' + f + ')');
});

console.log('\n=== STATUS ATUAL POR FORNECEDOR ===');
for (const [f, items] of Object.entries(byFornecedor)) {
  const localCount = items.filter(i => (i.imagem || '').startsWith('/assets/')).length;
  console.log(f + ': ' + items.length + ' itens (Locais unicos: ' + localCount + '/' + items.length + ')');
}

console.log('\n=== IMAGENS REPETIDAS RESTANTES NO SITE INTEIRO ===');
let totalDuplicates = 0;
let dupImages = 0;
for (const [img, count] of Object.entries(imgCount)) {
  if (count > 1) {
    dupImages++;
    totalDuplicates += (count - 1);
    console.log('\n[REPETIDA ' + count + 'x] ' + img);
    imgToItems[img].forEach(it => console.log('   -> ' + it));
  }
}

console.log('\nResumo de Duplicatas: ' + dupImages + ' URLs repetidas, afetando ' + (dupImages + totalDuplicates) + ' itens.');
