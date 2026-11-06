import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buildScriptPath = path.join(__dirname, 'build-complete-catalog.js');
const catalogJsonPath = path.join(__dirname, '../src/data/catalogo.json');
const assetsDir = path.join(__dirname, '../public/assets/itens');

const catalog = JSON.parse(fs.readFileSync(catalogJsonPath, 'utf8'));
let buildContent = fs.readFileSync(buildScriptPath, 'utf8');

let updatedCount = 0;

for (const item of catalog) {
  const pngFile = path.join(assetsDir, `${item.id}.png`);
  if (fs.existsSync(pngFile)) {
    const newPath = `/assets/itens/${item.id}.png`;
    if (item.imagem !== newPath) {
      item.imagem = newPath;
      updatedCount++;
      console.log(`Updated catalogo.json: ${item.id} -> ${newPath}`);

      const regex = new RegExp(`(id:\\s*"${item.id}"[\\s\\S]*?imagem:\\s*")[^"]+(")`, 'm');
      if (regex.test(buildContent)) {
        buildContent = buildContent.replace(regex, `$1${newPath}$2`);
      } else {
        console.warn(`Could not find item ${item.id} in build-complete-catalog.js`);
      }
    }
  }
}

fs.writeFileSync(catalogJsonPath, JSON.stringify(catalog, null, 2), 'utf8');
fs.writeFileSync(buildScriptPath, buildContent, 'utf8');

console.log(`\nUpdated ${updatedCount} items to local /assets/itens/[id].png!`);
