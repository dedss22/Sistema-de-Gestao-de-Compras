import ExcelJS from 'exceljs';
import fs from 'fs';

const CORES_ESTILO = {
  headerBg: 'FF1E4638',
  headerSubBg: 'FF16362C',
  headerSubText: 'FFC2E0D4',
  borderDark: 'FF16362C',
  borderLight: 'FFE5E7EB',
  zebraEven: 'FFF9FAFB',
  zebraOdd: 'FFFFFFFF',
  totalBg: 'FFE8F5E9',
  totalText: 'FF1B5E20',

  // Badges
  peixaria: { bg: 'FFD1E7DD', text: 'FF0F5132' },
  acougue: { bg: 'FFCFE2FF', text: 'FF084298' },
  congelados: { bg: 'FFD0E3F0', text: 'FF0C4A6E' },
  'frios-laticinios': { bg: 'FFD4EDDA', text: 'FF155724' },
  hortifruti: { bg: 'FFDCFCE7', text: 'FF166534' },
  bebidas: { bg: 'FFE0F2FE', text: 'FF0369A1' },
  mercado: { bg: 'FFE2E8F0', text: 'FF1E293B' },
  doces: { bg: 'FFE2F0D9', text: 'FF385723' },
  limpeza: { bg: 'FFFEF3C7', text: 'FF92400E' },
  default: { bg: 'FFF1F5F9', text: 'FF334155' }
};

function obterCoresBadge(texto) {
  if (!texto) return CORES_ESTILO.default;
  const t = texto.toLowerCase();
  if (t.includes('peix')) return CORES_ESTILO.peixaria;
  if (t.includes('açou') || t.includes('acou') || t.includes('carn')) return CORES_ESTILO.acougue;
  if (t.includes('cong')) return CORES_ESTILO.congelados;
  if (t.includes('frio') || t.includes('lati') || t.includes('queij') || t.includes('manteig')) return CORES_ESTILO['frios-laticinios'];
  if (t.includes('horti') || t.includes('frut') || t.includes('verd')) return CORES_ESTILO.hortifruti;
  if (t.includes('bebi') || t.includes('suco') || t.includes('refr') || t.includes('águ') || t.includes('cerv')) return CORES_ESTILO.bebidas;
  if (t.includes('doce') || t.includes('sobre')) return CORES_ESTILO.doces;
  if (t.includes('limp') || t.includes('descar')) return CORES_ESTILO.limpeza;
  if (t.includes('merc') || t.includes('pão') || t.includes('cafe')) return CORES_ESTILO.mercado;
  return CORES_ESTILO.default;
}

async function testar() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Geral', {
    views: [{ showGridLines: true }],
    properties: { tabColor: { argb: 'FF1E4638' } }
  });

  ws.columns = [
    { width: 20 }, // Fornecedor
    { width: 24 }, // Categoria
    { width: 38 }, // Item
    { width: 12 }, // Qtd
    { width: 14 }, // Unid
    { width: 38 }, // Obs
    { width: 20 }  // Aceita
  ];

  // A1:G1 Banner Principal
  ws.mergeCells('A1:G1');
  const t1 = ws.getCell('A1');
  t1.value = 'PEDIDO DE COMPRAS • FALÉSIAS';
  t1.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  t1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CORES_ESTILO.headerBg } };
  t1.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 36;

  // A2:G2 Sub-Banner
  ws.mergeCells('A2:G2');
  const t2 = ws.getCell('A2');
  t2.value = 'Hospedagem & Gastronomia • Cardápio Digital da Estadia';
  t2.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: CORES_ESTILO.headerSubText } };
  t2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CORES_ESTILO.headerSubBg } };
  t2.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(2).height = 18;

  ws.getRow(3).height = 8; // Separador

  // Info Card
  const criarLinhaInfo = (rowNum, label1, val1, label2, val2) => {
    const row = ws.getRow(rowNum);
    row.height = 22;

    const lblStyle = {
      font: { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF4B5563' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } },
      alignment: { vertical: 'middle', horizontal: 'right' },
      border: {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      }
    };

    const valStyle = {
      font: { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF111827' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } },
      alignment: { vertical: 'middle', horizontal: 'left', indent: 1 },
      border: {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
      }
    };

    row.getCell(1).value = label1;
    Object.assign(row.getCell(1), lblStyle);

    row.getCell(2).value = val1;
    Object.assign(row.getCell(2), valStyle);
    ws.mergeCells(`B${rowNum}:C${rowNum}`);

    row.getCell(4).value = label2;
    Object.assign(row.getCell(4), lblStyle);

    row.getCell(5).value = val2;
    Object.assign(row.getCell(5), valStyle);
    ws.mergeCells(`E${rowNum}:G${rowNum}`);
  };

  criarLinhaInfo(4, 'Nº do Pedido:', '#1', 'Data & Hora de Envio:', '05/11/2026 às 10:44 (Bahia)');
  criarLinhaInfo(5, 'Casa:', 'Falésias', 'Período:', '05/11/2026 a 17/11/2026');
  criarLinhaInfo(6, 'Hóspedes:', '8 pessoas', 'Cozinheira:', 'Fernanda');
  criarLinhaInfo(7, 'Titular:', 'Mauricio', 'Resp. Equipe:', 'André (Concierge)');

  ws.getRow(8).height = 12; // Separador

  // Cabeçalho da Tabela
  const headers = [
    'FORNECEDOR',
    'CATEGORIA',
    'ITEM',
    '# QTD',
    'UNID.',
    'OBSERVAÇÃO / USO NO CARDÁPIO',
    'ACEITA SUBSTITUTO?'
  ];

  const headerRow = ws.getRow(9);
  headerRow.height = 28;

  headers.forEach((h, i) => {
    const c = headerRow.getCell(i + 1);
    c.value = h;
    c.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: CORES_ESTILO.headerBg } };
    c.alignment = {
      vertical: 'middle',
      horizontal: i === 2 || i === 5 ? 'left' : 'center',
      indent: i === 2 || i === 5 ? 1 : 0
    };
    c.border = {
      top: { style: 'thin', color: { argb: 'FF16362C' } },
      bottom: { style: 'medium', color: { argb: 'FF0E251E' } },
      left: { style: 'thin', color: { argb: 'FF2A5C4C' } },
      right: { style: 'thin', color: { argb: 'FF2A5C4C' } }
    };
  });

  // Linhas de dados de teste
  const itensTeste = [
    { forn: 'Peixaria', cat: 'Peixaria', item: 'Camarão Médio/Grande (Limpo)', qtd: 10, und: 'Kg', obs: 'Moqueca, Bobó, Recheios', aceita: true },
    { forn: 'Peixaria', cat: 'Peixaria', item: 'Camarão VG (Com cauda)', qtd: 6, und: 'Kg', obs: 'Grelhados, Empanado no Coco', aceita: true },
    { forn: 'Açougue', cat: 'Açougue', item: 'Filé Mignon (Peça Inteira Limpa)', qtd: 12, und: 'Kg', obs: 'Strogonoff, Parmegiana, Iscas', aceita: true },
    { forn: 'Frios & Laticínios', cat: 'Laticínios', item: 'Queijo Coalho (Espeto/Peça)', qtd: 6, und: 'Kg', obs: 'Petiscos e Café da manhã', aceita: true },
    { forn: 'Hortifruti', cat: 'Hortifruti', item: 'Melão Amarelo', qtd: 3, und: 'Unid.', obs: 'Café da manhã', aceita: true },
    { forn: 'Bebidas', cat: 'Bebidas', item: 'Água Mineral sem Gás 500ml', qtd: 25, und: 'Unid.', obs: 'Quartos e piscina', aceita: false },
    { forn: 'Mercado', cat: 'Mercearia', item: 'Azeite de Dendê', qtd: 3, und: 'Garrafas', obs: 'Moqueca, Bobó, Pirão', aceita: true }
  ];

  let currentLine = 10;
  itensTeste.forEach((it, idx) => {
    const row = ws.getRow(currentLine);
    row.height = 24;
    const isEven = idx % 2 === 1;
    const zebraBg = isEven ? CORES_ESTILO.zebraEven : CORES_ESTILO.zebraOdd;

    const fornColors = obterCoresBadge(it.forn);
    const catColors = obterCoresBadge(it.cat);

    const cellBorder = {
      top: { style: 'thin', color: { argb: CORES_ESTILO.borderLight } },
      bottom: { style: 'thin', color: { argb: CORES_ESTILO.borderLight } },
      left: { style: 'thin', color: { argb: CORES_ESTILO.borderLight } },
      right: { style: 'thin', color: { argb: CORES_ESTILO.borderLight } }
    };

    // 1. Fornecedor (Pílula)
    const cForn = row.getCell(1);
    cForn.value = it.forn.toUpperCase();
    cForn.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: fornColors.text } };
    cForn.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fornColors.bg } };
    cForn.alignment = { vertical: 'middle', horizontal: 'center' };
    cForn.border = cellBorder;

    // 2. Categoria (Pílula)
    const cCat = row.getCell(2);
    cCat.value = it.cat.toUpperCase();
    cCat.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: catColors.text } };
    cCat.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: catColors.bg } };
    cCat.alignment = { vertical: 'middle', horizontal: 'center' };
    cCat.border = cellBorder;

    // 3. Item
    const cItem = row.getCell(3);
    cItem.value = it.item;
    cItem.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF111827' } };
    cItem.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } };
    cItem.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    cItem.border = cellBorder;

    // 4. Qtd
    const cQtd = row.getCell(4);
    cQtd.value = it.qtd;
    cQtd.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: 'FF1E4638' } };
    cQtd.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } };
    cQtd.alignment = { vertical: 'middle', horizontal: 'center' };
    cQtd.border = cellBorder;

    // 5. Unid
    const cUnd = row.getCell(5);
    cUnd.value = it.und;
    cUnd.font = { name: 'Segoe UI', size: 9.5, bold: false, color: { argb: 'FF4B5563' } };
    cUnd.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } };
    cUnd.alignment = { vertical: 'middle', horizontal: 'center' };
    cUnd.border = cellBorder;

    // 6. Observação
    const cObs = row.getCell(6);
    cObs.value = it.obs || '-';
    cObs.font = { name: 'Segoe UI', size: 9.5, italic: it.obs ? false : true, color: { argb: 'FF4B5563' } };
    cObs.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } };
    cObs.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };
    cObs.border = cellBorder;

    // 7. Aceita Substituto (Pílula)
    const cAceita = row.getCell(7);
    cAceita.value = it.aceita ? 'Sim' : 'Não';
    cAceita.font = {
      name: 'Segoe UI',
      size: 9.5,
      bold: true,
      color: { argb: it.aceita ? 'FF166534' : 'FF991B1B' }
    };
    cAceita.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: it.aceita ? 'FFDCFCE7' : 'FFFEE2E2' }
    };
    cAceita.alignment = { vertical: 'middle', horizontal: 'center' };
    cAceita.border = cellBorder;

    currentLine++;
  });

  // Linha de Total
  const totalRow = ws.getRow(currentLine);
  totalRow.height = 26;

  ws.mergeCells(`A${currentLine}:C${currentLine}`);
  const cTotLbl = totalRow.getCell(1);
  cTotLbl.value = 'TOTAL DE ITENS NO PEDIDO';
  cTotLbl.font = { name: 'Segoe UI', size: 10.5, bold: true, color: { argb: 'FF1E4638' } };
  cTotLbl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
  cTotLbl.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
  cTotLbl.border = {
    top: { style: 'thin', color: { argb: 'FF16362C' } },
    bottom: { style: 'double', color: { argb: 'FF16362C' } }
  };

  const cTotQtd = totalRow.getCell(4);
  cTotQtd.value = itensTeste.reduce((acc, it) => acc + it.qtd, 0);
  cTotQtd.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FF1E4638' } };
  cTotQtd.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC8E6C9' } };
  cTotQtd.alignment = { vertical: 'middle', horizontal: 'center' };
  cTotQtd.border = {
    top: { style: 'thin', color: { argb: 'FF16362C' } },
    bottom: { style: 'double', color: { argb: 'FF16362C' } }
  };

  ws.mergeCells(`E${currentLine}:G${currentLine}`);
  const cTotDesc = totalRow.getCell(5);
  cTotDesc.value = `${itensTeste.length} itens distintos cadastrados`;
  cTotDesc.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: 'FF2E7D32' } };
  cTotDesc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
  cTotDesc.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  cTotDesc.border = {
    top: { style: 'thin', color: { argb: 'FF16362C' } },
    bottom: { style: 'double', color: { argb: 'FF16362C' } }
  };

  const buffer = await wb.xlsx.writeBuffer();
  fs.writeFileSync('C:/Users/Paralelo 17/.gemini/antigravity/scratch/lista-compras-casa/teste-planilha-styled.xlsx', buffer);
  console.log('Planilha estilizadíssima criada com sucesso! Bytes:', buffer.byteLength);
}

testar().catch(console.error);
