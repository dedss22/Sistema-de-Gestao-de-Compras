const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const cat = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/catalogo.json'), 'utf8'));
const assetsDir = path.join(__dirname, '../public/assets/itens');

const statsByFornecedor = {};
const allHashes = new Set();
let duplicates = 0;
let totalOk = 0;

cat.forEach(item => {
  const f = item.fornecedor;
  if (!statsByFornecedor[f]) {
    statsByFornecedor[f] = { total: 0, ok: 0, minSize: Infinity, maxSize: 0, totalBytes: 0 };
  }
  statsByFornecedor[f].total++;

  const pngPath = path.join(assetsDir, `${item.id}.png`);
  if (fs.existsSync(pngPath)) {
    const s = fs.statSync(pngPath).size;
    const buf = fs.readFileSync(pngPath);
    const h = crypto.createHash('md5').update(buf).digest('hex');
    if (allHashes.has(h)) duplicates++;
    allHashes.add(h);

    if (s >= 20000) {
      statsByFornecedor[f].ok++;
      totalOk++;
    }
    statsByFornecedor[f].minSize = Math.min(statsByFornecedor[f].minSize, s);
    statsByFornecedor[f].maxSize = Math.max(statsByFornecedor[f].maxSize, s);
    statsByFornecedor[f].totalBytes += s;
  }
});

console.log('=== AUDITORIA GERAL DE IMAGENS DO CATÁLOGO ===');
console.log('Total de Itens:', cat.length);
console.log('Total com Imagem Dedicada Alta Resolução (>20KB):', totalOk, '/', cat.length);
console.log('Imagens Duplicadas:', duplicates);
console.log('\nPor Categoria / Fornecedor:');
Object.entries(statsByFornecedor).forEach(([forn, data]) => {
  const avgKb = Math.round(data.totalBytes / data.total / 1024);
  console.log(`- ${forn.padEnd(12)}: ${data.ok}/${data.total} itens 100% OK | Média: ${avgKb} KB | Min: ${Math.round(data.minSize/1024)} KB | Max: ${Math.round(data.maxSize/1024)} KB`);
});
