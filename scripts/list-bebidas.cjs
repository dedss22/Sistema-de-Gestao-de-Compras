const fs = require('fs');
const cat = JSON.parse(fs.readFileSync('C:/Users/Paralelo 17/.gemini/antigravity/scratch/lista-compras-casa/src/data/catalogo.json', 'utf8'));
const bebidas = cat.filter(i => i.fornecedor === 'bebidas');
console.log('Total bebidas items:', bebidas.length);
bebidas.forEach((b, idx) => {
  console.log((idx + 1) + '. [' + b.id + '] - ' + b.nome + ' (' + (b.subcategoria || '') + ')');
  console.log('   Desc: ' + (b.descricaoBreve || ''));
  console.log('   Imagem atual: ' + b.imagem);
  console.log('   Emoji: ' + (b.emoji || ''));
});
