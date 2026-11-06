const fs = require('fs');
const content = fs.readFileSync('scripts/build-complete-catalog.js', 'utf8');
const ids = ['banana-terra', 'coco-verde', 'laranja-suco', 'manga-palmer', 'maracuja'];
ids.forEach(id => {
  const match = content.match(new RegExp('id:\\s*"' + id + '"[\\s\\S]*?imagem:\\s*"([^"]+)"'));
  console.log(id, '->', match ? match[1] : 'NOT FOUND');
});
