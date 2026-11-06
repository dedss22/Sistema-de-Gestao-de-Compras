const https = require('https');

function getPhoto(urlPath) {
  https.get('https://unsplash.com/photos/' + urlPath, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  }, res => {
    let html = '';
    res.on('data', c => { if (html.length < 200000) html += c; });
    res.on('end', () => {
      const match = html.match(/https:\/\/images\.unsplash\.com\/photo-[0-9a-zA-Z-]+/g);
      console.log(urlPath, [...new Set(match)].slice(0, 3));
    });
  });
}

getPhoto('oyster-on-ice-kvoVmMHHM9A');
