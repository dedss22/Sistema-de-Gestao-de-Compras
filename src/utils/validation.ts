import { ItemPedido } from '../types';

export interface AlertaItemEssencial {
  id: string;
  nome: string;
  motivo: string;
  itemIdSugerido: string;
  unidade: string;
  quantidadeSugerida: number;
}

export function verificarItensEssenciais(
  itens: Record<string, ItemPedido>,
  numHospedes: number,
  numDias: number
): AlertaItemEssencial[] {
  const alertas: AlertaItemEssencial[] = [];
  const listaItens = Object.values(itens).filter(i => i.quantidade > 0);

  // 1. Café Moído (Fixo em 2 pacotes conforme solicitado)
  const temCafe = listaItens.some(i => 
    i.id.includes('cafe') || i.nome.toLowerCase().includes('café') || i.nome.toLowerCase().includes('cafe')
  );
  if (!temCafe) {
    alertas.push({
      id: 'cafe',
      nome: 'Café Moído',
      motivo: 'O primeiro café da manhã da estadia não pode faltar.',
      itemIdSugerido: 'cafe-po',
      unidade: 'pacote',
      quantidadeSugerida: 2
    });
  }

  // 2. Leite Fresco / Integral (Fixo em 2 litros conforme solicitado)
  const temLeite = listaItens.some(i => 
    i.id === 'leite-integral' || (i.nome.toLowerCase().includes('leite') && !i.nome.toLowerCase().includes('coco') && !i.nome.toLowerCase().includes('condensado') && !i.nome.toLowerCase().includes('creme'))
  );
  if (!temLeite) {
    alertas.push({
      id: 'leite',
      nome: 'Leite Fresco',
      motivo: 'Indispensável para o café com leite matinal e receitas.',
      itemIdSugerido: 'leite-integral',
      unidade: 'litro',
      quantidadeSugerida: 2
    });
  }

  // 3. Saco de Lixo Reforçado
  const temSacoLixo = listaItens.some(i => 
    i.id === 'saco-lixo-50l' || i.id.includes('saco-lixo') || i.nome.toLowerCase().includes('saco de lixo') || i.nome.toLowerCase().includes('sacos de lixo')
  );
  if (!temSacoLixo) {
    alertas.push({
      id: 'saco-lixo',
      nome: 'Saco de Lixo Reforçado',
      motivo: 'Descarte higiênico e manutenção de lixeiras da cozinha, banheiros e piscina.',
      itemIdSugerido: 'saco-lixo-50l',
      unidade: 'pacote',
      quantidadeSugerida: 1
    });
  }

  // 7. Esponja Dupla Face
  const temEsponja = listaItens.some(i => 
    i.id === 'esponja-louca' || i.nome.toLowerCase().includes('esponja')
  );
  if (!temEsponja) {
    alertas.push({
      id: 'esponja',
      nome: 'Esponja de Louça',
      motivo: 'Essencial para a limpeza e manutenção de louças, copos e bancadas.',
      itemIdSugerido: 'esponja-louca',
      unidade: 'pacote',
      quantidadeSugerida: 1
    });
  }

  // 8. Detergente Lava-Louças
  const temDetergente = listaItens.some(i => 
    i.id === 'detergente-louca' || i.nome.toLowerCase().includes('detergente')
  );
  if (!temDetergente) {
    alertas.push({
      id: 'detergente',
      nome: 'Detergente Lava-Louças',
      motivo: 'Item de uso diário fundamental para a pia e lavagem de utensílios.',
      itemIdSugerido: 'detergente-louca',
      unidade: 'garrafa',
      quantidadeSugerida: 1
    });
  }

  // 9. Plástico Filme PVC
  const temPlasticoFilme = listaItens.some(i => 
    i.id === 'plastico-filme' || i.nome.toLowerCase().includes('plástico filme') || i.nome.toLowerCase().includes('plastico filme') || (i.nome.toLowerCase().includes('filme') && i.nome.toLowerCase().includes('pvc'))
  );
  if (!temPlasticoFilme) {
    alertas.push({
      id: 'plastico-filme',
      nome: 'Plástico Filme PVC',
      motivo: 'Perfeito para vedar travessas, manter o frescor de alimentos e organizar a geladeira.',
      itemIdSugerido: 'plastico-filme',
      unidade: 'un',
      quantidadeSugerida: 1
    });
  }

  // 10. Papel Alumínio
  const temPapelAluminio = listaItens.some(i => 
    i.id === 'papel-aluminio' || i.nome.toLowerCase().includes('papel alumínio') || i.nome.toLowerCase().includes('papel aluminio') || i.nome.toLowerCase().includes('folha de alumínio')
  );
  if (!temPapelAluminio) {
    alertas.push({
      id: 'papel-aluminio',
      nome: 'Papel Alumínio',
      motivo: 'Indispensável para cobrir assadeiras no forno e envolver grelhados na brasa.',
      itemIdSugerido: 'papel-aluminio',
      unidade: 'un',
      quantidadeSugerida: 1
    });
  }

  // 11. Guardanapo Grande
  const temGuardanapoGrande = listaItens.some(i => 
    i.id === 'guardanapos-papel-grande' || (i.nome.toLowerCase().includes('guardanapo') && (i.nome.toLowerCase().includes('grande') || i.nome.toLowerCase().includes(' g')))
  );
  if (!temGuardanapoGrande) {
    alertas.push({
      id: 'guardanapo-grande',
      nome: 'Guardanapos de Papel (Grande)',
      motivo: 'Tamanho G refinado para compor a mesa posta dos almoços e jantares.',
      itemIdSugerido: 'guardanapos-papel-grande',
      unidade: 'pacote',
      quantidadeSugerida: 1
    });
  }

  // 12. Guardanapo Pequeno
  const temGuardanapoPequeno = listaItens.some(i => 
    i.id === 'guardanapos-papel-pequeno' || (i.nome.toLowerCase().includes('guardanapo') && (i.nome.toLowerCase().includes('pequeno') || i.nome.toLowerCase().includes(' p')))
  );
  if (!temGuardanapoPequeno) {
    alertas.push({
      id: 'guardanapo-pequeno',
      nome: 'Guardanapos de Papel (Pequeno)',
      motivo: 'Prático para petiscos, sobremesas, coquetéis e apoio na área da piscina.',
      itemIdSugerido: 'guardanapos-papel-pequeno',
      unidade: 'pacote',
      quantidadeSugerida: 1
    });
  }

  // 13. Papel Toalha
  const temPapelToalha = listaItens.some(i => 
    i.id === 'papel-toalha' || i.nome.toLowerCase().includes('papel toalha') || i.nome.toLowerCase().includes('toalha de papel')
  );
  if (!temPapelToalha) {
    alertas.push({
      id: 'papel-toalha',
      nome: 'Papel Toalha Folha Dupla',
      motivo: 'Alta absorção para secar carnes, peixes, mãos e bancadas da cozinha.',
      itemIdSugerido: 'papel-toalha',
      unidade: 'pacote',
      quantidadeSugerida: 1
    });
  }

  // 14. Sal Refinado
  const temSalRefinado = listaItens.some(i => 
    i.id === 'sal-refinado' || (i.nome.toLowerCase().includes('sal') && i.nome.toLowerCase().includes('refinado'))
  );
  if (!temSalRefinado) {
    alertas.push({
      id: 'sal-refinado',
      nome: 'Sal Refinado Iodado',
      motivo: 'Tempero essencial básico para todas as preparações culinárias da casa.',
      itemIdSugerido: 'sal-refinado',
      unidade: 'kg',
      quantidadeSugerida: 1
    });
  }

  // 15. Creme de Leite (2 unidades)
  const temCremeLeite = listaItens.some(i => 
    i.id === 'creme-leite' || i.nome.toLowerCase().includes('creme de leite')
  );
  if (!temCremeLeite) {
    alertas.push({
      id: 'creme-leite',
      nome: 'Creme de Leite',
      motivo: 'Cremoso e versátil para molhos de massas, estrogonofes e sobremesas.',
      itemIdSugerido: 'creme-leite',
      unidade: 'un',
      quantidadeSugerida: 2
    });
  }

  // 16. Água Sanitária
  const temAguaSanitaria = listaItens.some(i => 
    i.id === 'agua-sanitaria' || i.nome.toLowerCase().includes('água sanitária') || i.nome.toLowerCase().includes('agua sanitaria') || i.nome.toLowerCase().includes('sanitária')
  );
  if (!temAguaSanitaria) {
    alertas.push({
      id: 'agua-sanitaria',
      nome: 'Água Sanitária',
      motivo: 'Indispensável para desinfecção profunda e higienização geral dos ambientes.',
      itemIdSugerido: 'agua-sanitaria',
      unidade: 'un',
      quantidadeSugerida: 1
    });
  }

  // 17. Leite Condensado (2 unidades)
  const temLeiteCondensado = listaItens.some(i => 
    i.id === 'leite-condensado' || i.nome.toLowerCase().includes('leite condensado')
  );
  if (!temLeiteCondensado) {
    alertas.push({
      id: 'leite-condensado',
      nome: 'Leite Condensado',
      motivo: 'Essencial para pudins, sobremesas geladas, coberturas e doces da estadia.',
      itemIdSugerido: 'leite-condensado',
      unidade: 'un',
      quantidadeSugerida: 2
    });
  }

  // 18. Leite de Coco
  const temLeiteCoco = listaItens.some(i => 
    i.id === 'leite-coco' || i.nome.toLowerCase().includes('leite de coco')
  );
  if (!temLeiteCoco) {
    alertas.push({
      id: 'leite-coco',
      nome: 'Leite de Coco',
      motivo: 'Ingrediente clássico para moquecas, peixes, tapiocas doces e molhos baianos.',
      itemIdSugerido: 'leite-coco',
      unidade: 'Litros',
      quantidadeSugerida: 1
    });
  }

  // 19. Óleo / Azeite de Dendê
  const temDende = listaItens.some(i => 
    i.id === 'azeite-dende' || i.nome.toLowerCase().includes('dendê') || i.nome.toLowerCase().includes('dende')
  );
  if (!temDende) {
    alertas.push({
      id: 'azeite-dende',
      nome: 'Azeite de Dendê',
      motivo: 'Sabor e cor marcantes para frutos do mar, bobó de camarão e pratos típicos.',
      itemIdSugerido: 'azeite-dende',
      unidade: 'garrafa',
      quantidadeSugerida: 1
    });
  }

  // 20. Azeite de Oliva
  const temAzeite = listaItens.some(i => 
    i.id === 'azeite-oliva-extra' || (i.nome.toLowerCase().includes('azeite') && !i.nome.toLowerCase().includes('dendê') && !i.nome.toLowerCase().includes('dende'))
  );
  if (!temAzeite) {
    alertas.push({
      id: 'azeite-oliva-extra',
      nome: 'Azeite de Oliva Extra Virgem',
      motivo: 'Azeite nobre para temperar saladas, grelhar peixes e finalizar pratos.',
      itemIdSugerido: 'azeite-oliva-extra',
      unidade: 'garrafa',
      quantidadeSugerida: 1
    });
  }

  // 21. Goma de Tapioca
  const temTapioca = listaItens.some(i => 
    i.id === 'goma-tapioca' || i.nome.toLowerCase().includes('goma de tapioca') || (i.nome.toLowerCase().includes('tapioca') && i.nome.toLowerCase().includes('fresca'))
  );
  if (!temTapioca) {
    alertas.push({
      id: 'goma-tapioca',
      nome: 'Goma de Tapioca Fresca',
      motivo: 'O lanche mais pedido na praia e café da manhã leve e tradicional.',
      itemIdSugerido: 'goma-tapioca',
      unidade: 'pacote',
      quantidadeSugerida: 1
    });
  }

  // 22. Maionese
  const temMaionese = listaItens.some(i => 
    i.id === 'maionese' || i.nome.toLowerCase().includes('maionese')
  );
  if (!temMaionese) {
    alertas.push({
      id: 'maionese',
      nome: 'Maionese Tradicional',
      motivo: 'Perfeita para saladas de batata, sanduíches rápidos e acompanhamento de churrasco.',
      itemIdSugerido: 'maionese',
      unidade: 'un',
      quantidadeSugerida: 1
    });
  }

  // 23. Ketchup
  const temKetchup = listaItens.some(i => 
    i.id === 'ketchup' || i.nome.toLowerCase().includes('ketchup')
  );
  if (!temKetchup) {
    alertas.push({
      id: 'ketchup',
      nome: 'Ketchup Tradicional',
      motivo: 'Favorito para petiscos na piscina, hambúrgueres caseiros e pizzas à noite.',
      itemIdSugerido: 'ketchup',
      unidade: 'frasco',
      quantidadeSugerida: 1
    });
  }

  // 24. Requeijão Cremoso
  const temRequeijao = listaItens.some(i => 
    i.id === 'requeijao-cremoso' || i.nome.toLowerCase().includes('requeijão') || i.nome.toLowerCase().includes('requeijao')
  );
  if (!temRequeijao) {
    alertas.push({
      id: 'requeijao-cremoso',
      nome: 'Requeijão Cremoso',
      motivo: 'Cremoso e delicioso para pães quentinhos, torradas e tapiocas matinais.',
      itemIdSugerido: 'requeijao-cremoso',
      unidade: 'un',
      quantidadeSugerida: 1
    });
  }

  // 25. Manteiga (500g)
  const temManteiga = listaItens.some(i => 
    i.id === 'manteiga-sal' || (i.nome.toLowerCase().includes('manteiga') && !i.nome.toLowerCase().includes('abacate') && !i.nome.toLowerCase().includes('couve'))
  );
  if (!temManteiga) {
    alertas.push({
      id: 'manteiga',
      nome: 'Manteiga de Primeira com Sal (500g)',
      motivo: 'Ponto de pomada perfeito para o café da manhã, tapiocas e preparos na chapa.',
      itemIdSugerido: 'manteiga-sal',
      unidade: 'un',
      quantidadeSugerida: 1
    });
  }

  // 26. Massa de Pastel Pequena
  const temMassaPastel = listaItens.some(i => 
    i.id === 'massa-pastel' || (i.nome.toLowerCase().includes('pastel') && (i.nome.toLowerCase().includes('pequena') || !i.nome.toLowerCase().includes('grande')))
  );
  if (!temMassaPastel) {
    alertas.push({
      id: 'massa-pastel',
      nome: 'Massa para Pastéis Pequena',
      motivo: 'Petisco crocante e irresistível para fritar na beira da piscina com os amigos.',
      itemIdSugerido: 'massa-pastel',
      unidade: 'pacote',
      quantidadeSugerida: 1
    });
  }

  // 27. Massa Pronta para Bolo
  const temMassaBolo = listaItens.some(i => 
    i.id === 'massa-bolo' || i.nome.toLowerCase().includes('massa pronta para bolo') || i.nome.toLowerCase().includes('massa de bolo')
  );
  if (!temMassaBolo) {
    alertas.push({
      id: 'massa-bolo',
      nome: 'Massa Pronta para Bolo',
      motivo: 'Preparo rápido e sem erro para um bolo caseiro quentinho no café da tarde.',
      itemIdSugerido: 'massa-bolo',
      unidade: 'pacote',
      quantidadeSugerida: 1
    });
  }

  // 28. Fermento Químico
  const temFermento = listaItens.some(i => 
    i.id === 'fermento-bolo' || (i.nome.toLowerCase().includes('fermento') && i.nome.toLowerCase().includes('bolo'))
  );
  if (!temFermento) {
    alertas.push({
      id: 'fermento',
      nome: 'Fermento Químico em Pó',
      motivo: 'Indispensável para fazer bolos e tortas crescerem fofinhos e macios.',
      itemIdSugerido: 'fermento-bolo',
      unidade: 'un',
      quantidadeSugerida: 1
    });
  }

  // 29. Adoçante Líquido
  const temAdocante = listaItens.some(i => 
    i.id === 'adocante' || i.nome.toLowerCase().includes('adoçante') || i.nome.toLowerCase().includes('adocante')
  );
  if (!temAdocante) {
    alertas.push({
      id: 'adocante',
      nome: 'Adoçante Dietético Líquido',
      motivo: 'Alternativa prática e zero calorias para adoçar cafés, sucos e bebidas.',
      itemIdSugerido: 'adocante',
      unidade: 'frasco',
      quantidadeSugerida: 1
    });
  }

  // 30. Carvão Vegetal (se houver carnes para churrasco e não houver carvão)
  const temCarneChurrasco = listaItens.some(i => 
    i.id === 'picanha-prime' || 
    i.id === 'costela-bovina' || 
    i.id === 'fraldinha-red' || 
    i.id === 'maminha-grill' || 
    i.id === 'linguica-toscana' ||
    i.id === 'ancho-argentino'
  );
  const temCarvao = listaItens.some(i => 
    i.id.includes('carvao') || i.nome.toLowerCase().includes('carvão') || i.nome.toLowerCase().includes('carvao')
  );

  if (temCarneChurrasco && !temCarvao) {
    const qtdCarvao = Math.max(2, Math.round(numHospedes * 0.3));
    alertas.push({
      id: 'carvao',
      nome: 'Carvão Vegetal',
      motivo: 'Você selecionou carnes para churrasco, mas não adicionou carvão para a brasa!',
      itemIdSugerido: 'carvao-vegetal',
      unidade: 'pacote',
      quantidadeSugerida: qtdCarvao
    });
  }

  return alertas;
}
