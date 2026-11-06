const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const userAgent = 'ListaComprasBahiaBot/1.0 (dev@listacompras.org)';

function downloadMediaWiki(fileName, width, destPath, cb) {
  const initialUrl = 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(fileName) + '?width=' + width;

  function get(url, hops = 0) {
    if (hops > 10) return cb(new Error('Too many redirects'));
    const mod = url.startsWith('https') ? https : http;
    mod.get(url, { headers: { 'User-Agent': userAgent } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let nextUrl = res.headers.location;
        if (nextUrl.startsWith('/')) nextUrl = 'https://commons.wikimedia.org' + nextUrl;
        return get(nextUrl, hops + 1);
      }
      if (res.statusCode !== 200) return cb(new Error('HTTP ' + res.statusCode));
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => { file.close(() => cb(null, fs.statSync(destPath).size)); });
    }).on('error', cb);
  }
  get(initialUrl);
}

const batch3 = [
  { name: 'Flank steaks.jpg', dest: 'b3-fraldinha.jpg' },
  { name: 'Raw Beef Short Ribs Slices.jpg', dest: 'b3-costela-bovina.jpg' },
  { name: 'Charque.jpg', dest: 'b3-charque.jpg' },
  { name: 'Carne seca (5502949528).jpg', dest: 'b3-carne-seca.jpg' },
  { name: 'Corazones de pollo.jpg', dest: 'b3-coracao-1.jpg' },
  { name: 'Chicken Hearts 02.JPG', dest: 'b3-coracao-2.jpg' },
  { name: 'Espetos de carne e queijo.jpg', dest: 'b3-espeto-queijo.jpg' },
  { name: 'Feijoada ingredients.png', dest: 'b3-feijoada-ingredientes.png' }
];

const destDir = path.join(__dirname, '../temp-acougue');
const artDir = 'C:/Users/Paralelo 17/.gemini/antigravity/brain/cbc97375-7667-4ec2-b2ed-1498114b7a36/acougue_temp';

let i = 0;
function runNext() {
  if (i >= batch3.length) {
    console.log('Batch 3 finished!');
    return;
  }
  const item = batch3[i++];
  const destPath = path.join(destDir, item.dest);
  downloadMediaWiki(item.name, 1000, destPath, (err, size) => {
    if (err) {
      console.error(`FAILED ${item.dest}:`, err.message);
    } else {
      console.log(`OK ${item.dest}: ${size} bytes`);
      fs.copyFileSync(destPath, path.join(artDir, item.dest));
    }
    setTimeout(runNext, 250);
  });
}
runNext();
