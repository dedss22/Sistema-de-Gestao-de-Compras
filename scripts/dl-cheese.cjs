const https = require('https');
const http = require('http');
const fs = require('fs');

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

async function run() {
  console.log('dl gouda:', await downloadMediaWiki('Aged Gouda cheese.jpg', 1000, 'temp-frios/aged-gouda.jpg'));
  console.log('dl camembert:', await downloadMediaWiki('Camembert (Cheese).jpg', 1000, 'temp-frios/camembert-cheese.jpg'));
  console.log('dl cheese 40:', await downloadMediaWiki('Cheese 40 bg 053006.jpg', 1000, 'temp-frios/cheese-40.jpg'));
}
run();
