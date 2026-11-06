const cat = require('../src/data/catalogo.json');
const hortifruti = cat.filter(i => i.fornecedor === 'hortifruti');
const mercado = cat.filter(i => i.fornecedor === 'mercado');

console.log('HORTIFRUTI COUNT:', hortifruti.length);
console.log('MERCADO COUNT:', mercado.length);

console.log('\n--- HORTIFRUTI ITEMS (38) ---');
hortifruti.forEach((it, idx) => {
  console.log((idx + 1) + '. ' + it.id + ' | ' + it.nome + ' | ' + it.subcategoria + ' | ' + (it.imagem.startsWith('/assets/') ? 'LOCAL' : 'REMOTE'));
});

console.log('\n--- MERCADO ITEMS (69) ---');
mercado.forEach((it, idx) => {
  console.log((idx + 1) + '. ' + it.id + ' | ' + it.nome + ' | ' + it.subcategoria + ' | ' + (it.imagem.startsWith('/assets/') ? 'LOCAL' : 'REMOTE'));
});
