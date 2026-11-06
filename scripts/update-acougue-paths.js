import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const buildScriptPath = path.join(__dirname, 'build-complete-catalog.js');
const catalogJsonPath = path.join(__dirname, '../src/data/catalogo.json');

const acougueIds = [
  'file-mignon', 'costela-bovina', 'picanha-prime', 'fraldinha-red',
  'maminha-grill', 'linguica-toscana', 'coracao-frango', 'carne-moida',
  'carne-seca-charque', 'carne-do-sol', 'file-frango', 'calabresa',
  'paio', 'costelinha-salgada', 'costelinha-suina', 'bacon-manta',
  'presunto-fatiado', 'frios-variados', 'ancho-argentino', 'queijo-coalho-espeto'
];

// 1. Update build-complete-catalog.js
let buildContent = fs.readFileSync(buildScriptPath, 'utf8');
for (const id of acougueIds) {
  const regex = new RegExp(`(id:\\s*"${id}"[\\s\\S]*?imagem:\\s*")[^"]+(")`, 'm');
  if (regex.test(buildContent)) {
    buildContent = buildContent.replace(regex, `$1/assets/itens/${id}.png$2`);
    console.log(`Updated build script for: ${id}`);
  } else {
    console.warn(`Could not find item ${id} in build script`);
  }
}
fs.writeFileSync(buildScriptPath, buildContent, 'utf8');

// 2. Update catalogo.json
const catalog = JSON.parse(fs.readFileSync(catalogJsonPath, 'utf8'));
let updatedCount = 0;
for (const item of catalog) {
  if (acougueIds.includes(item.id)) {
    item.imagem = `/assets/itens/${item.id}.png`;
    updatedCount++;
    console.log(`Updated catalogo.json for: ${item.id} -> ${item.imagem}`);
  }
}
fs.writeFileSync(catalogJsonPath, JSON.stringify(catalog, null, 2), 'utf8');
console.log(`All done! Updated ${updatedCount} items in catalogo.json.`);
