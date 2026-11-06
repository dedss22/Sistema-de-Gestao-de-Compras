const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const userAgent = 'ListaComprasBahiaBot/1.0 (https://github.com/lista-compras; dev@listacompras.org)';

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

const items = [
  { id: 'picanha-prime', file: 'Picanha.jpg' },
  { id: 'ancho-argentino', file: 'Rib_eye_steak_-_400_gr.JPG' },
  { id: 'fraldinha-red', file: 'Flank steak.jpg' },
  { id: 'maminha-grill', file: 'Bürgermeisterstück.jpg' },
  { id: 'file-mignon', file: 'Beef tenderloin great.jpg' },
  { id: 'costela-bovina', file: 'Côte (Costela de boi) (3220167933).jpg' },
  { id: 'carne-moida', file: 'Hackfleisch-1.jpg' },
  { id: 'carne-seca-charque', file: 'Carne Seca.jpg' },
  { id: 'carne-do-sol', file: 'Carne de sol maturada.jpg' },
  { id: 'costelinha-suina', file: 'Raw pork spareribs.jpg' },
  { id: 'costelinha-salgada', file: 'Brazilian Costella.jpg' },
  { id: 'linguica-toscana', file: 'Bayreuther Bratwürste roh.JPG' },
  { id: 'calabresa', file: 'Chorizo sausage.JPG' },
  { id: 'paio', file: 'Polish sausage, Poznań 2014.jpg' },
  { id: 'bacon-manta', file: 'RawBacon.JPG' },
  { id: 'file-frango', file: 'Kycklingfilé.jpg' },
  { id: 'coracao-frango', file: 'Coraçãozinhos.jpeg' },
  { id: 'queijo-coalho-espeto', file: 'Queijo coalho.jpg' },
  { id: 'presunto-fatiado', file: 'Boiled ham.JPG' },
  { id: 'frios-variados', file: 'Charcuterie board with various cheeses meats olives and vegetables arranged.jpg' }
];

const destDir = path.join(__dirname, '../temp-acougue');
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

let i = 0;
function runNext() {
  if (i >= items.length) {
    console.log('All downloads finished!');
    return;
  }
  const item = items[i++];
  const destPath = path.join(destDir, `${item.id}.jpg`);
  downloadMediaWiki(item.file, 1000, destPath, (err, size) => {
    if (err) {
      console.error(`FAILED ${item.id} (${item.file}):`, err.message);
    } else {
      console.log(`OK ${item.id}: ${size} bytes`);
    }
    // Pausa pequena de 200ms para gentileza na API
    setTimeout(runNext, 200);
  });
}

runNext();
