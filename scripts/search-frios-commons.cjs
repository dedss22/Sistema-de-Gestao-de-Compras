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
            url: p.imageinfo[0].url,
            width: p.imageinfo[0].width,
            height: p.imageinfo[0].height
          }));
        cb(null, results.slice(0, 5));
      } catch(e) { cb(e); }
    });
  }).on('error', cb);
}

const items = [
  { id: 'salame-italiano', q: 'sliced salami plate OR salami slices' },
  { id: 'peito-peru', q: 'sliced smoked turkey breast OR sliced turkey breast' },
  { id: 'presunto-parma', q: 'prosciutto di parma slices OR sliced jamon serrano' },
  { id: 'copa-fatiada', q: 'capocollo slices OR coppa cured meat' },
  { id: 'lombo-defumado', q: 'smoked pork loin sliced OR lachsschinken' },
  { id: 'mortadela-defumada', q: 'mortadella slices OR sliced bologna mortadella' },
  { id: 'queijo-gorgonzola', q: 'gorgonzola wedge OR gorgonzola cheese piece' },
  { id: 'queijo-brie', q: 'brie cheese wedge OR french brie' },
  { id: 'queijo-gouda', q: 'gouda cheese wedge OR sliced gouda' },
  { id: 'queijo-provolone', q: 'provolone cheese OR provolone dolce' },
  { id: 'queijo-parmesao-pedaco', q: 'parmigiano reggiano wedge piece OR parmesan wedge' }
];

let idx = 0;
function next() {
  if (idx >= items.length) {
    console.log('Done searching!');
    return;
  }
  const item = items[idx++];
  searchWiki(item.q, (err, res) => {
    console.log(`\n=== [${item.id}] query: "${item.q}" ===`);
    if (err) console.error(err);
    else {
      res.forEach((r, i) => {
        console.log(`  ${i+1}. ${r.title} (${r.width}x${r.height})`);
      });
    }
    setTimeout(next, 500);
  });
}

next();
