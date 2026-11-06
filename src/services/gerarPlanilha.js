import ExcelJS from 'exceljs';

// Mapeamento amigável de nomes de fornecedores
const NOMES_FORNECEDORES = {
  peixaria: 'Peixaria',
  acougue: 'Açougue',
  'frios-laticinios': 'Frios & Laticínios',
  hortifruti: 'Hortifruti',
  bebidas: 'Bebidas',
  mercado: 'Mercado'
};

// Paleta de Cores e Estilos Profissionais (Tema Concierge Trancoso / Bahia)
const PALETA = {
  headerBg: 'FF1E4638',         // Verde Floresta / Esmeralda Profundo
  headerSubBg: 'FF16362C',      // Verde Floresta Escuro
  headerSubText: 'FFC2E0D4',    // Verde Suave
  borderDark: 'FF16362C',       // Borda Escura
  borderLight: 'FFE5E7EB',      // Borda Cinza Clara
  borderHeaderInner: 'FF2A5C4C',// Borda Interna do Cabeçalho
  zebraEven: 'FFF9FAFB',        // Fundo Linha Par
  zebraOdd: 'FFFFFFFF',         // Fundo Linha Ímpar
  totalBg: 'FFE8F5E9',          // Fundo Totalizador
  totalText: 'FF1B5E20',        // Texto Totalizador
  totalAccentBg: 'FFC8E6C9',    // Destaque Quantidade Total

  // Pílulas / Badges por Fornecedor e Categoria (inspirado no modelo das referências)
  peixaria: { bg: 'FFD1E7DD', text: 'FF0F5132' },
  acougue: { bg: 'FFCFE2FF', text: 'FF084298' },
  congelados: { bg: 'FFD0E3F0', text: 'FF0C4A6E' },
  'frios-laticinios': { bg: 'FFD4EDDA', text: 'FF155724' },
  laticinios: { bg: 'FFD4EDDA', text: 'FF155724' },
  hortifruti: { bg: 'FFDCFCE7', text: 'FF166534' },
  bebidas: { bg: 'FFE0F2FE', text: 'FF0369A1' },
  mercado: { bg: 'FFE2E8F0', text: 'FF1E293B' },
  mercearia: { bg: 'FFE2E8F0', text: 'FF1E293B' },
  doces: { bg: 'FFE2F0D9', text: 'FF385723' },
  limpeza: { bg: 'FFFEF3C7', text: 'FF92400E' },
  sim: { bg: 'FFDCFCE7', text: 'FF166534' },
  nao: { bg: 'FFFEE2E2', text: 'FF991B1B' },
  default: { bg: 'FFF1F5F9', text: 'FF334155' }
};

// Cores das Abas do Excel
const CORES_ABAS = {
  geral: 'FF1E4638',
  peixaria: 'FF10B981',
  acougue: 'FF3B82F6',
  'frios-laticinios': 'FF059669',
  hortifruti: 'FF16A34A',
  bebidas: 'FF0284C7',
  mercado: 'FF64748B'
};

/**
 * Identifica as cores do badge com base no texto do fornecedor ou categoria
 */
function obterCoresBadge(texto) {
  if (!texto) return PALETA.default;
  const t = texto.toLowerCase();
  if (t.includes('peix')) return PALETA.peixaria;
  if (t.includes('açou') || t.includes('acou') || t.includes('carn')) return PALETA.acougue;
  if (t.includes('cong')) return PALETA.congelados;
  if (t.includes('frio') || t.includes('lati') || t.includes('queij') || t.includes('manteig')) return PALETA['frios-laticinios'];
  if (t.includes('horti') || t.includes('frut') || t.includes('verd')) return PALETA.hortifruti;
  if (t.includes('bebi') || t.includes('suco') || t.includes('refr') || t.includes('águ') || t.includes('cerv')) return PALETA.bebidas;
  if (t.includes('doce') || t.includes('sobre')) return PALETA.doces;
  if (t.includes('limp') || t.includes('descar')) return PALETA.limpeza;
  if (t.includes('merc') || t.includes('pão') || t.includes('cafe')) return PALETA.mercado;
  return PALETA.default;
}

/**
 * Formata data e hora no fuso horário brasileiro (America/Bahia)
 */
export function formatarDataHoraBahia(isoString) {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return date.toLocaleString('pt-BR', {
      timeZone: 'America/Bahia',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

/**
 * Formata data no formato brasileiro DD/MM/AAAA
 */
export function formatarDataBr(dataStr) {
  if (!dataStr) return '';
  try {
    if (dataStr.includes('T')) {
      const date = new Date(dataStr);
      return date.toLocaleDateString('pt-BR', { timeZone: 'America/Bahia' });
    }
    const [ano, mes, dia] = dataStr.split('-');
    return `${dia}/${mes}/${ano}`;
  } catch {
    return dataStr;
  }
}

/**
 * Configura o cabeçalho decorado e o cartão de informações da estadia
 */
function aplicarCabecalhoDecorado(ws, { tituloAba, estadia, pedido }) {
  const nomeCasa = (estadia?.casa || 'Casa').toUpperCase();
  const entradaFmt = formatarDataBr(estadia?.entrada);
  const saidaFmt = formatarDataBr(estadia?.saida);
  const finalizadoEmFmt = formatarDataHoraBahia(pedido?.finalizado_em);

  // 1. Banner Principal (Linha 1)
  ws.mergeCells('A1:G1');
  const banner = ws.getCell('A1');
  banner.value = `PEDIDO DE COMPRAS • ${nomeCasa}`;
  banner.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  banner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA.headerBg } };
  banner.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 36;

  // 2. Sub-Banner Informativo (Linha 2)
  ws.mergeCells('A2:G2');
  const subBanner = ws.getCell('A2');
  subBanner.value = `${tituloAba} • Cardápio Digital da Estadia`;
  subBanner.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: PALETA.headerSubText } };
  subBanner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA.headerSubBg } };
  subBanner.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(2).height = 18;

  // 3. Separador (Linha 3)
  ws.getRow(3).height = 8;

  // 4. Cartão de Informações em 2 Colunas (Linhas 4 a 7)
  const lblStyle = {
    font: { name: 'Segoe UI', size: 9.5, bold: true, color: { argb: 'FF4B5563' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } },
    alignment: { vertical: 'middle', horizontal: 'right' },
    border: {
      top: { style: 'thin', color: { argb: PALETA.borderLight } },
      bottom: { style: 'thin', color: { argb: PALETA.borderLight } },
      left: { style: 'thin', color: { argb: PALETA.borderLight } },
      right: { style: 'thin', color: { argb: PALETA.borderLight } }
    }
  };

  const valStyle = {
    font: { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF111827' } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } },
    alignment: { vertical: 'middle', horizontal: 'left', indent: 1 },
    border: {
      top: { style: 'thin', color: { argb: PALETA.borderLight } },
      bottom: { style: 'thin', color: { argb: PALETA.borderLight } },
      left: { style: 'thin', color: { argb: PALETA.borderLight } },
      right: { style: 'thin', color: { argb: PALETA.borderLight } }
    }
  };

  const criarLinhaInfo = (rowNum, label1, val1, label2, val2, val1BoldColor = null) => {
    const row = ws.getRow(rowNum);
    row.height = 22;

    // Col A
    row.getCell(1).value = label1;
    Object.assign(row.getCell(1), lblStyle);

    // Col B e C mescladas
    row.getCell(2).value = val1;
    Object.assign(row.getCell(2), valStyle);
    if (val1BoldColor) {
      row.getCell(2).font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: val1BoldColor } };
    }
    ws.mergeCells(`B${rowNum}:C${rowNum}`);

    // Col D
    row.getCell(4).value = label2;
    Object.assign(row.getCell(4), lblStyle);

    // Col E a G mescladas
    row.getCell(5).value = val2;
    Object.assign(row.getCell(5), valStyle);
    ws.mergeCells(`E${rowNum}:G${rowNum}`);
  };

  criarLinhaInfo(4, 'Nº do Pedido:', `#${pedido?.numero || 1}`, 'Data & Hora de Envio:', `${finalizadoEmFmt} (Bahia)`, PALETA.headerBg);
  criarLinhaInfo(5, 'Casa / Destino:', estadia?.casa || '-', 'Período da Estadia:', `${entradaFmt} a ${saidaFmt}`);
  criarLinhaInfo(6, 'Hóspedes:', `${estadia?.hospedes || '-'} pessoas`, 'Cozinheira:', pedido?.cozinheira || 'Não informada', PALETA.headerBg);
  criarLinhaInfo(7, 'Titular:', estadia?.titular || 'Não informado', 'Resp. Equipe:', estadia?.funcionario || 'Não informado');

  // Separador antes da tabela (Linha 8)
  ws.getRow(8).height = 12;

  // 5. Cabeçalho da Tabela de Itens (Linha 9)
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
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA.headerBg } };
    c.alignment = {
      vertical: 'middle',
      horizontal: i === 2 || i === 5 ? 'left' : 'center',
      indent: i === 2 || i === 5 ? 1 : 0
    };
    c.border = {
      top: { style: 'thin', color: { argb: PALETA.borderDark } },
      bottom: { style: 'medium', color: { argb: 'FF0E251E' } },
      left: { style: 'thin', color: { argb: PALETA.borderHeaderInner } },
      right: { style: 'thin', color: { argb: PALETA.borderHeaderInner } }
    };
  });
}

/**
 * Preenche e estiliza as linhas de itens de uma aba
 */
/**
 * Preenche e estiliza as linhas de itens de uma aba,
 * habilitando o AutoFiltro do Excel (setinhas de ordenação A-Z e filtragem de categorias)
 */
function preencherLinhasItens(ws, itens) {
  let linhaAtual = 10;
  let somaQtd = 0;

  const cellBorder = {
    top: { style: 'thin', color: { argb: PALETA.borderLight } },
    bottom: { style: 'thin', color: { argb: PALETA.borderLight } },
    left: { style: 'thin', color: { argb: PALETA.borderLight } },
    right: { style: 'thin', color: { argb: PALETA.borderLight } }
  };

  // Ordena os itens por padrão: Categoria (A-Z) -> Nome do Item (A-Z)
  const itensOrdenados = [...itens].sort((a, b) => {
    const catA = (a.categoria || a.subcategoria || '').trim().toLowerCase();
    const catB = (b.categoria || b.subcategoria || '').trim().toLowerCase();
    const compCat = catA.localeCompare(catB, 'pt-BR');
    if (compCat !== 0) return compCat;

    const nomeA = (a.item || a.nome || '').trim().toLowerCase();
    const nomeB = (b.item || b.nome || '').trim().toLowerCase();
    return nomeA.localeCompare(nomeB, 'pt-BR');
  });

  itensOrdenados.forEach((it, idx) => {
    const row = ws.getRow(linhaAtual);
    row.height = 24;

    const isEven = idx % 2 === 1;
    const zebraBg = isEven ? PALETA.zebraEven : PALETA.zebraOdd;

    const fornKey = it.fornecedor || 'mercado';
    const fornNome = it.fornecedorNome || NOMES_FORNECEDORES[fornKey] || fornKey;
    const cat = it.categoria || it.subcategoria || '-';
    const nomeItem = it.item || it.nome || '';
    const qtdNum = Number(it.quantidade) || 0;
    const und = it.unidade || 'un';
    const obs = it.observacao ? it.observacao.trim() : '-';
    const aceita = Boolean(it.aceitaSubstituto);

    somaQtd += qtdNum;

    const fornColors = obterCoresBadge(fornNome);
    const catColors = obterCoresBadge(cat);

    // 1. Fornecedor (Pílula)
    const cForn = row.getCell(1);
    cForn.value = fornNome.toUpperCase();
    cForn.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: fornColors.text } };
    cForn.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fornColors.bg } };
    cForn.alignment = { vertical: 'middle', horizontal: 'center' };
    cForn.border = cellBorder;

    // 2. Categoria (Pílula)
    const cCat = row.getCell(2);
    cCat.value = cat.toUpperCase();
    cCat.font = { name: 'Segoe UI', size: 9, bold: true, color: { argb: catColors.text } };
    cCat.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: catColors.bg } };
    cCat.alignment = { vertical: 'middle', horizontal: 'center' };
    cCat.border = cellBorder;

    // 3. Item
    const cItem = row.getCell(3);
    cItem.value = nomeItem;
    cItem.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF111827' } };
    cItem.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } };
    cItem.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    cItem.border = cellBorder;

    // 4. # Qtd
    const cQtd = row.getCell(4);
    cQtd.value = qtdNum;
    cQtd.font = { name: 'Segoe UI', size: 11, bold: true, color: { argb: PALETA.headerBg } };
    cQtd.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } };
    cQtd.alignment = { vertical: 'middle', horizontal: 'center' };
    cQtd.border = cellBorder;

    // 5. Unid.
    const cUnd = row.getCell(5);
    cUnd.value = und;
    cUnd.font = { name: 'Segoe UI', size: 9.5, bold: false, color: { argb: 'FF4B5563' } };
    cUnd.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } };
    cUnd.alignment = { vertical: 'middle', horizontal: 'center' };
    cUnd.border = cellBorder;

    // 6. Observação / Uso no Cardápio
    const cObs = row.getCell(6);
    cObs.value = obs;
    cObs.font = {
      name: 'Segoe UI',
      size: 9.5,
      italic: obs === '-',
      color: { argb: obs === '-' ? 'FF9CA3AF' : 'FF4B5563' }
    };
    cObs.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: zebraBg } };
    cObs.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: true };
    cObs.border = cellBorder;

    // 7. Aceita Substituto? (Pílula Sim/Não)
    const cAceita = row.getCell(7);
    cAceita.value = aceita ? 'Sim' : 'Não';
    cAceita.font = {
      name: 'Segoe UI',
      size: 9.5,
      bold: true,
      color: { argb: aceita ? PALETA.sim.text : PALETA.nao.text }
    };
    cAceita.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: aceita ? PALETA.sim.bg : PALETA.nao.bg }
    };
    cAceita.alignment = { vertical: 'middle', horizontal: 'center' };
    cAceita.border = cellBorder;

    linhaAtual++;
  });

  const ultimaLinhaItens = linhaAtual - 1;

  // Habilita o AutoFiltro nativo do Excel da Linha 9 (cabeçalho) até a última linha de itens
  // Isso insere os seletores nativos (setinhas ▼) em todas as colunas:
  // FORNECEDOR, CATEGORIA, ITEM, # QTD, UNID., OBSERVAÇÃO, ACEITA SUBSTITUTO?
  // permitindo ordenar de A-Z ou Z-A e filtrar por categorias diretamente no Excel!
  if (itensOrdenados.length > 0) {
    ws.autoFilter = `A9:G${ultimaLinhaItens}`;
  }

  // Linha de Rodapé / Totalizador
  const totalRow = ws.getRow(linhaAtual);
  totalRow.height = 26;

  // A:C mescladas
  ws.mergeCells(`A${linhaAtual}:C${linhaAtual}`);
  const cTotLbl = totalRow.getCell(1);
  cTotLbl.value = 'TOTAL DO PEDIDO';
  cTotLbl.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: PALETA.headerBg } };
  cTotLbl.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA.totalBg } };
  cTotLbl.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
  cTotLbl.border = {
    top: { style: 'thin', color: { argb: PALETA.headerBg } },
    bottom: { style: 'double', color: { argb: PALETA.headerBg } }
  };

  // Col D (Qtd Total) com recálculo automático via SUBTOTAL caso o usuário filtre dados no Excel
  const cTotQtd = totalRow.getCell(4);
  if (itensOrdenados.length > 0) {
    cTotQtd.value = {
      formula: `SUBTOTAL(9, D10:D${ultimaLinhaItens})`,
      result: somaQtd
    };
  } else {
    cTotQtd.value = somaQtd;
  }
  cTotQtd.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: PALETA.headerBg } };
  cTotQtd.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA.totalAccentBg } };
  cTotQtd.alignment = { vertical: 'middle', horizontal: 'center' };
  cTotQtd.border = {
    top: { style: 'thin', color: { argb: PALETA.headerBg } },
    bottom: { style: 'double', color: { argb: PALETA.headerBg } }
  };

  // E:G mescladas
  ws.mergeCells(`E${linhaAtual}:G${linhaAtual}`);
  const cTotDesc = totalRow.getCell(5);
  cTotDesc.value = `${itens.length} ${itens.length === 1 ? 'item listado' : 'itens listados'}`;
  cTotDesc.font = { name: 'Segoe UI', size: 9.5, italic: true, color: { argb: PALETA.totalText } };
  cTotDesc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALETA.totalBg } };
  cTotDesc.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  cTotDesc.border = {
    top: { style: 'thin', color: { argb: PALETA.headerBg } },
    bottom: { style: 'double', color: { argb: PALETA.headerBg } }
  };
}

/**
 * Gera um Workbook ExcelJS estruturado com design profissional,
 * contendo a aba "Geral" e abas separadas por fornecedor com cores correspondentes.
 */
export async function gerarWorkbookPedido(pedido, estadia) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Sistema de Compras • Concierge';
  wb.created = new Date();

  const listaItens = Array.isArray(pedido?.itens) ? pedido.itens : [];

  // Configuração padrão de larguras de colunas
  const colunasLarguras = [
    { width: 22 }, // Fornecedor
    { width: 25 }, // Categoria
    { width: 42 }, // Item
    { width: 12 }, // # Qtd
    { width: 14 }, // Unid.
    { width: 38 }, // Observação
    { width: 20 }  // Aceita Substituto
  ];

  // 1. Aba "Geral" (Todos os itens)
  const wsGeral = wb.addWorksheet('Geral', {
    views: [{ showGridLines: true }],
    properties: { tabColor: { argb: CORES_ABAS.geral } }
  });
  wsGeral.columns = colunasLarguras;

  aplicarCabecalhoDecorado(wsGeral, {
    tituloAba: 'Visão Geral Consolidada',
    estadia,
    pedido
  });
  preencherLinhasItens(wsGeral, listaItens);

  // 2. Abas por Fornecedor (somente para fornecedores que tiverem itens)
  const fornecedoresPresentes = [
    'peixaria',
    'acougue',
    'frios-laticinios',
    'hortifruti',
    'bebidas',
    'mercado'
  ];

  for (const fornId of fornecedoresPresentes) {
    const itensDoForn = listaItens.filter((i) => i.fornecedor === fornId);
    if (itensDoForn.length === 0) continue;

    const nomeFornOficial = NOMES_FORNECEDORES[fornId] || fornId;
    const nomeAba = fornId === 'frios-laticinios'
      ? 'Frios e Laticinios'
      : nomeFornOficial;

    const wsForn = wb.addWorksheet(nomeAba.slice(0, 31), {
      views: [{ showGridLines: true }],
      properties: { tabColor: { argb: CORES_ABAS[fornId] || CORES_ABAS.geral } }
    });
    wsForn.columns = colunasLarguras;

    aplicarCabecalhoDecorado(wsForn, {
      tituloAba: `Setor: ${nomeFornOficial}`,
      estadia,
      pedido
    });
    preencherLinhasItens(wsForn, itensDoForn);
  }

  return wb;
}

/**
 * Dispara o download da planilha (.xlsx) de alta qualidade visual no navegador
 */
export async function baixarPlanilhaPedido(pedido, estadia) {
  try {
    const wb = await gerarWorkbookPedido(pedido, estadia);
    const buffer = await wb.xlsx.writeBuffer();

    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const casaSlug = (estadia?.casa || 'casa')
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');

    const nomeArquivo = `Pedido_${pedido?.numero || 1}_${casaSlug}.xlsx`;

    if (typeof window !== 'undefined') {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nomeArquivo;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 2000);
    }
  } catch (err) {
    console.error('Erro ao gerar planilha Excel estilizada:', err);
  }
}
