const https = require('https');

function searchWiki(query, cb) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=' + encodeURIComponent(query + ' filetype:bitmap') + '&gsrnamespace=6&prop=imageinfo&iiprop=url|mime|size&format=json';
  https.get(url, { headers: { 'User-Agent': 'ListaComprasApp/1.0 (test@example.com)' } }, res => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        const pages = json.query ? Object.values(json.query.pages) : [];
        const results = pages
          .filter(p => p.imageinfo && p.imageinfo[0].mime && p.imageinfo[0].mime.startsWith('image/'))
          .map(p => ({
            title: p.title,
            url: p.imageinfo[0].url,
            width: p.imageinfo[0].width,
            height: p.imageinfo[0].height
          }));
        cb(null, results.slice(0, 5));
      } catch(e) { cb(e); }
    });
  }).on('error', cb);
}

const queries = [
  { key: 'polvo', q: 'octopus market raw' },
  { key: 'lula', q: 'squid rings raw food' },
  { key: 'ostras', q: 'oysters raw ice half shell' },
  { key: 'lagosta', q: 'lobster tail raw fresh' }
];

let idx = 0;
function next() {
  if (idx >= queries.length) return;
  const item = queries[idx++];
  searchWiki(item.q, (err, res) => {
    console.log('=== ' + item.key.toUpperCase() + ' ===');
    console.log(res);
    next();
  });
}
next();
