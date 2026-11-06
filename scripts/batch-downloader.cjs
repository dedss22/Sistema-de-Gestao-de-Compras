const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const userAgent = 'ListaComprasBahiaBot/1.0 (dev@listacompras.org)';

function downloadMediaWiki(fileName, width, destPath) {
  return new Promise((resolve, reject) => {
    const cleanName = fileName.replace(/^File:/i, '').trim();
    const initialUrl = 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(cleanName) + '?width=' + width;

    function get(url, hops = 0) {
      if (hops > 10) return reject(new Error('Too many redirects'));
      const mod = url.startsWith('https') ? https : http;
      const req = mod.get(url, { headers: { 'User-Agent': userAgent } }, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          let nextUrl = res.headers.location;
          if (nextUrl.startsWith('/')) nextUrl = 'https://commons.wikimedia.org' + nextUrl;
          return get(nextUrl, hops + 1);
        }
        if (res.statusCode !== 200) {
          return reject(new Error('HTTP ' + res.statusCode + ' for ' + url));
        }
        const fileStream = fs.createWriteStream(destPath);
        res.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close(() => {
            const stats = fs.statSync(destPath);
            if (stats.size < 500) {
              return reject(new Error('File too small: ' + stats.size + ' bytes'));
            }
            resolve(stats.size);
          });
        });
      });
      req.on('error', reject);
      req.setTimeout(25000, () => {
        req.destroy();
        reject(new Error('Timeout downloading ' + fileName));
      });
    }

    get(initialUrl);
  });
}

async function runBatch(itemsFile) {
  const items = JSON.parse(fs.readFileSync(itemsFile, 'utf8'));
  const tempDir = path.join(__dirname, '../temp-assets');
  const targetDir = path.join(__dirname, '../public/assets/itens');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

  const pyScript = path.join(__dirname, 'process-image.py');
  const results = { success: [], failed: [] };

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const ext = path.extname(item.wikiFile.split('?')[0]) || '.jpg';
    const tempFile = path.join(tempDir, `${item.id}${ext}`);

    console.log(`[${i + 1}/${items.length}] ${item.id} -> ${item.wikiFile}...`);

    let downloaded = false;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const size = await downloadMediaWiki(item.wikiFile, 1200, tempFile);
        console.log(`   OK download (${size} bytes)`);
        downloaded = true;
        break;
      } catch (err) {
        console.warn(`   Tentativa ${attempt} falhou: ${err.message}`);
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (!downloaded) {
      results.failed.push({ id: item.id, file: item.wikiFile });
      continue;
    }

    try {
      execSync(`python "${pyScript}" "${tempFile}" "${targetDir}" "${item.id}"`, { stdio: 'inherit' });
      results.success.push(item.id);
    } catch (procErr) {
      console.error(`   Erro processamento: ${procErr.message}`);
      results.failed.push({ id: item.id, file: item.wikiFile, error: 'Pillow' });
    }

    await new Promise(r => setTimeout(r, 200));
  }

  console.log('\n=== FINAL BATCH SUMMARY ===');
  console.log(`Success: ${results.success.length}/${items.length}`);
  console.log(`Failed: ${results.failed.length}/${items.length}`);
  if (results.failed.length > 0) {
    console.log('Failed:', JSON.stringify(results.failed, null, 2));
  }
}

const targetJson = process.argv[2];
if (!targetJson) {
  console.log('Usage: node batch-downloader.cjs <items.json>');
  process.exit(1);
}
runBatch(targetJson).catch(console.error);
