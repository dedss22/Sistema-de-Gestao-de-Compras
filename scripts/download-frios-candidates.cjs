const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

function downloadMediaWiki(fileName, width, destPath) {
  return new Promise((resolve, reject) => {
    const userAgent = 'ListaComprasBahiaBot/1.0 (https://github.com/lista-compras; dev@listacompras.org)';
    const initialUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=${width}`;

    function get(url, hops = 0) {
      if (hops > 10) return reject(new Error('Too many redirects'));
      const mod = url.startsWith('https') ? https : http;
      mod.get(url, { headers: { 'User-Agent': userAgent } }, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let nextUrl = res.headers.location;
          if (nextUrl.startsWith('/')) {
            nextUrl = 'https://commons.wikimedia.org' + nextUrl;
          }
          return get(nextUrl, hops + 1);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        const file = fs.createWriteStream(destPath);
        res.pipe(file);
        file.on('finish', () => {
          file.close(() => {
            const size = fs.statSync(destPath).size;
            resolve(size);
          });
        });
      }).on('error', reject);
    }

    get(initialUrl);
  });
}

const list = [
  { id: 'salame-italiano', file: 'Salami aka.jpg' },
  { id: 'peito-peru', file: 'Sliced turkey.jpg' },
  { id: 'presunto-parma', file: 'Prosciutto di Parma - affettato2.jpg' },
  { id: 'presunto-parma-alt', file: 'Jamón serrano (by Awersowy).jpg' },
  { id: 'copa-fatiada', file: 'Sweetcapicola.JPG' },
  { id: 'lombo-defumado', file: 'Lachsschinken.jpg' },
  { id: 'mortadela-defumada', file: 'Mortadella-2.jpg' },
  { id: 'mortadela-defumada-alt', file: 'Mortadella Bologna IGP.jpg' },
  { id: 'queijo-gorgonzola', file: 'Gorgonzola 1.jpg' },
  { id: 'queijo-gorgonzola-alt', file: 'Gorgonzola 3.jpg' },
  { id: 'queijo-brie', file: 'Brie de Meaux close.jpg' },
  { id: 'queijo-brie-alt', file: 'Brie.00.JPG' },
  { id: 'queijo-gouda', file: 'Gouda Frico.jpg' },
  { id: 'queijo-provolone', file: 'Provolone Dolce.jpg' },
  { id: 'queijo-parmesao-pedaco', file: 'Parmigiano reggiano piece.jpg' }
];

async function run() {
  const destDir = path.resolve(__dirname, '../temp-frios');
  for (const item of list) {
    const destPath = path.join(destDir, `${item.id}.jpg`);
    try {
      console.log(`Downloading ${item.file} as ${item.id}...`);
      const size = await downloadMediaWiki(item.file, 1000, destPath);
      console.log(`  -> OK: ${size} bytes`);
    } catch(err) {
      console.error(`  -> FAIL: ${err.message}`);
    }
  }
  console.log('All downloads completed!');
}

run();
