const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

function downloadMediaWiki(fileName, width, destPath, cb) {
  const userAgent = 'ListaComprasBahiaBot/1.0 (https://github.com/lista-compras; dev@listacompras.org)';
  const initialUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileName)}?width=${width}`;

  function get(url, hops = 0) {
    if (hops > 10) return cb(new Error('Too many redirects'));
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
        return cb(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      const file = fs.createWriteStream(destPath);
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          cb(null, fs.statSync(destPath).size);
        });
      });
    }).on('error', cb);
  }

  get(initialUrl);
}

downloadMediaWiki('Lobster Tail.jpg', 800, 'C:/Users/Paralelo 17/.gemini/antigravity/brain/cbc97375-7667-4ec2-b2ed-1498114b7a36/wiki-test-lobster.jpg', (err, size) => {
  if (err) console.error('Error:', err.message);
  else console.log('Downloaded Lobster Tail.jpg successfully! Size:', size, 'bytes');
});
