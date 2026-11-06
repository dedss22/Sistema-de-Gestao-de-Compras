const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const userAgent = 'ListaComprasBahiaBot/1.0 (dev@listacompras.org)';

const items = [
  {
    id: 'banana-terra',
    wikiFile: 'Plantain 01.jpg' // High resolution 6016x4016 authentic plantains
  },
  {
    id: 'coco-verde',
    wikiFile: 'Coconut Drink, Pangandaran.JPG' // 2000x1376 fresh green coconut with straw
  },
  {
    id: 'laranja-suco',
    wikiFile: '(330-365) Healthy (6195816251).jpg' // 3549x2662 beautiful ripe oranges whole and cut
  },
  {
    id: 'manga-palmer',
    wikiFile: 'Mangos - single and halved.jpg' // 8256x5504 juicy ripe mango whole and halved
  },
  {
    id: 'maracuja',
    wikiFile: 'Passionsfrucht-Gelbe Marakuja (offen).jpg' // 2048x1536 genuine yellow passion fruit cut open showing seeds & pulp
  }
];

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
      if (res.statusCode !== 200) return cb(new Error('HTTP ' + res.statusCode + ' for ' + url));
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          const stats = fs.statSync(destPath);
          cb(null, stats.size);
        });
      });
    }).on('error', cb);
  }
  get(initialUrl);
}

const tempDir = path.join(__dirname, '../temp-assets');
const targetDir = path.join(__dirname, '../public/assets/itens');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

let idx = 0;
function processNext() {
  if (idx >= items.length) {
    console.log('\nAll 5 priority items downloaded and processed successfully!');
    return;
  }
  const item = items[idx++];
  const tempPath = path.join(tempDir, `${item.id}.jpg`);
  console.log(`Downloading ${item.id}: ${item.wikiFile}...`);
  downloadMediaWiki(item.wikiFile, 1200, tempPath, (err, size) => {
    if (err) {
      console.error(`Error downloading ${item.id}:`, err.message);
    } else {
      console.log(`Downloaded ${item.id} (${size} bytes). Processing crop 800x600...`);
      try {
        const pyScript = path.join(__dirname, 'process-image.py');
        execSync(`python "${pyScript}" "${tempPath}" "${targetDir}" "${item.id}"`, { stdio: 'inherit' });
      } catch (e) {
        console.error(`Error processing ${item.id}:`, e.message);
      }
    }
    setTimeout(processNext, 200);
  });
}

processNext();
