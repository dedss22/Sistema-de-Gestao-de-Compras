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

const batch = [
  { name: 'Rib-steak-raw-MCB.jpg', dest: 'b2-ancho-1.jpg' },
  { name: 'Traditional entrecôte (rib-eye steak).jpg', dest: 'b2-ancho-2.jpg' },
  { name: 'Beef tenderloin picture.jpg', dest: 'b2-file-mignon-1.jpg' },
  { name: 'Flank steaks showing grain.jpg', dest: 'b2-fraldinha-1.jpg' },
  { name: 'Beef ribs 1 2017-02-04.jpg', dest: 'b2-costela-bovina-1.jpg' },
  { name: 'Beef short ribs.jpg', dest: 'b2-costela-bovina-2.jpg' },
  { name: 'Salsiccia Italian pork sausage.jpg', dest: 'b2-linguica-toscana-1.jpg' },
  { name: 'Chorizo cortado.jpg', dest: 'b2-calabresa-1.jpg' },
  { name: 'Palacioschorizo.jpg', dest: 'b2-calabresa-2.jpg' },
  { name: 'Sliced cooked ham.jpg', dest: 'b2-presunto-1.jpg' },
  { name: 'Kielbasa from Poland.jpg', dest: 'b2-paio-1.jpg' }
];

const destDir = path.join(__dirname, '../temp-acougue');

let i = 0;
function runNext() {
  if (i >= batch.length) {
    console.log('Batch 2 finished!');
    return;
  }
  const item = batch[i++];
  const destPath = path.join(destDir, item.dest);
  downloadMediaWiki(item.name, 1000, destPath, (err, size) => {
    if (err) {
      console.error(`FAILED ${item.dest}:`, err.message);
    } else {
      console.log(`OK ${item.dest}: ${size} bytes`);
    }
    setTimeout(runNext, 250);
  });
}
runNext();
