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
  { key: 'picanha', q: 'picanha raw OR churrasco' },
  { key: 'ancho', q: 'ribeye steak raw OR ancho' },
  { key: 'fraldinha', q: 'flank steak raw OR fraldinha' },
  { key: 'maminha', q: 'tri-tip steak raw OR maminha' },
  { key: 'file_mignon', q: 'beef tenderloin raw OR filet mignon raw' },
  { key: 'costela_bovina', q: 'beef ribs raw OR costela' },
  { key: 'carne_moida', q: 'ground beef raw OR minced beef raw' },
  { key: 'carne_sol', q: 'carne de sol OR carne seca' },
  { key: 'costelinha_suina', q: 'pork ribs raw OR pork spare ribs' },
  { key: 'linguica_toscana', q: 'fresh sausage raw OR bratwurst raw' },
  { key: 'calabresa', q: 'calabresa OR chorizo sausage' },
  { key: 'paio', q: 'smoked sausage OR kielbasa' },
  { key: 'bacon_manta', q: 'slab bacon raw OR pork belly raw' },
  { key: 'file_frango', q: 'chicken breast fillet raw' },
  { key: 'coracao_frango', q: 'chicken hearts skewer OR coracao de frango' },
  { key: 'queijo_coalho', q: 'queijo coalho espeto OR halloumi skewer' },
  { key: 'presunto_fatiado', q: 'ham slices folded OR sliced ham' },
  { key: 'frios_variados', q: 'charcuterie board cold cuts' }
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
