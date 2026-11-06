const https = require('https');

function getCategoryMembers(category, cb) {
  const url = 'https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:' + encodeURIComponent(category) + '&cmtype=file&cmlimit=25&format=json';
  https.get(url, { headers: { 'User-Agent': 'ListaComprasBahiaBot/1.0 (dev@listacompras.org)' } }, res => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        const members = (json.query?.categorymembers || []).map(m => m.title.replace('File:', ''));
        cb(null, members);
      } catch(e) { cb(e); }
    });
  }).on('error', cb);
}

const categories = [
  'Beef_cuts',
  'Beef_steaks',
  'Raw_beef',
  'Raw_meat',
  'Picanha',
  'Sausages_of_Brazil',
  'Sausages',
  'Sliced_ham',
  'Churrasco',
  'Yakitori'
];

let idx = 0;
function runNext() {
  if (idx >= categories.length) return;
  const cat = categories[idx++];
  getCategoryMembers(cat, (err, members) => {
    console.log('=== Category:' + cat + ' ===');
    console.log(members);
    runNext();
  });
}
runNext();
