const fs = require('fs');
const path = require('path');

const catPath = path.join(__dirname, '../src/data/catalogo.json');
const buildPath = path.join(__dirname, 'build-complete-catalog.js');

const cat = JSON.parse(fs.readFileSync(catPath, 'utf8'));

const targetFrios = [
  'presunto-fatiado',
  'frios-variados',
  'queijo-mussarela',
  'queijo-prato',
  'queijo-coalho',
  'queijo-parmesao-ralado',
  'requeijao-cremoso',
  'manteiga-sal',
  'leite-integral'
];

const subcatMap = {
  'presunto-fatiado': 'Frios Nobres & Fatiados',
  'frios-variados': 'Frios Nobres & Fatiados',
  'queijo-mussarela': 'Queijos Especiais',
  'queijo-prato': 'Queijos Especiais',
  'queijo-coalho': 'Queijos Especiais',
  'queijo-parmesao-ralado': 'Queijos Especiais',
  'requeijao-cremoso': 'Manteiga & Laticínios',
  'manteiga-sal': 'Manteiga & Laticínios',
  'leite-integral': 'Manteiga & Laticínios'
};

cat.forEach(item => {
  if (targetFrios.includes(item.id)) {
    item.fornecedor = 'frios-laticinios';
    item.subcategoria = subcatMap[item.id];
  }
  if (item.id === 'ovos-frescos') {
    item.subcategoria = 'Ovos e Despensa';
  }
});

fs.writeFileSync(catPath, JSON.stringify(cat, null, 2), 'utf8');

let buildContent = fs.readFileSync(buildPath, 'utf8');
targetFrios.forEach(id => {
  const fornRegex = new RegExp('(id:\\s*"' + id + '"[\\s\\S]*?fornecedor:\\s*")[^"]+(")', 'm');
  buildContent = buildContent.replace(fornRegex, '$1frios-laticinios$2');

  const subRegex = new RegExp('(id:\\s*"' + id + '"[\\s\\S]*?subcategoria:\\s*")[^"]+(")', 'm');
  buildContent = buildContent.replace(subRegex, '$1' + subcatMap[id] + '$2');
});
buildContent = buildContent.replace(/(id:\s*"ovos-frescos"[\s\S]*?subcategoria:\s*")[^"]+(")/m, '$1Ovos e Despensa$2');

fs.writeFileSync(buildPath, buildContent, 'utf8');

console.log('Successfully updated catalogo.json and build-complete-catalog.js');
