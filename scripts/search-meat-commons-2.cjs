const https = require('https');

function searchWiki(query, cb) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=' + encodeURIComponent(query + ' filetype:bitmap') + '&gsrnamespace=6&prop=imageinfo&iiprop=url|mime|size&format=json';
  https.get(url, { headers: { 'User-Agent': 'ListaComprasBahiaBot/1.0 (dev@listacompras.org)' } }, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        const pages = json.query ? Object.values(json.query.pages) : [];
        const results = pages
          .filter(p => p.imageinfo && p.imageinfo[0].mime && p.imageinfo[0].mime.startsWith('image/'))
          .map(p => ({
            title: p.title.replace('File:', ''),
            width: p.imageinfo[0].width,
            height: p.imageinfo[0].height
          }));
        cb(null, results.slice(0, 5));
      } catch(e) { cb(e); }
    });
  }).on('error', cb);
}

const queries = [
  { key: 'ancho', q: 'ribeye steak raw OR entrecote raw' },
  { key: 'file_mignon', q: 'filet mignon raw OR beef tenderloin' },
  { key: 'file_frango', q: 'raw chicken breast OR raw chicken fillet' },
  { key: 'queijo_coalho', q: 'queijo coalho OR coalho' },
  { key: 'presunto_fatiado', q: 'sliced ham OR jambon blanc' },
  { key: 'costelinha_suina', q: 'raw pork ribs OR raw ribs' },
  { key: 'picanha_fatiada', q: 'picanha raw OR picanha fatiada' }
];

let idx = 0;
function next() {
  if (idx >= queries.length) return;
  const item = queries[idx++];
  searchWiki(item.q, (err, res) => {
    console.log('=== ' + item.key.toUpperCase() + ' ===');
    if (res && res.length) {
      res.forEach(r => console.log('  -', r.title, `(${r.width}x${r.height})`));
    } else {
      console.log('  (None found)');
    }
    next();
  });
}
next();
