/**
 * Testes do parser do relatório "Movimentos de Liquidação" (material permanente).
 * Usa fixtures de texto embutidas (o PDF real é gitignored) cobrindo os casos
 * difíceis: item com descrição quebrada em 2 linhas, NF com vários itens,
 * UG com fontes mistas e o mapa subelemento→tipo.
 */

import {
  parseRelatorioLiquidacao,
  tipoDoSubelemento,
  formaDoEmpenho,
  origemDaFonte,
} from '../../services/importacaoMaterialService';

// Fixture que imita o layout de largura fixa extraído do PDF.
const RELATORIO = `Pará                                    MOVIMENTOS DE LIQUIDAÇÃO
Governo Municipal de São Sebastião da Boa Vista       Exercício de 2026     Página : 0001
Prefeitura Municipal de São Sebastião da Boa Vista
Classif. Econômica 4.4.90.52.00                       Discriminado por: item
----------------------------------------------------------------------------------------
                   DOTAÇÃO              EMPENHO    NOTA FISCAL            LIQUIDAÇÃO   VALOR(R$)
----------------------------------------------------------------------------------------

02 08.
 15 122 0010 2.030 Manutenção da Secretaria Municipal de Desenvolvimento Urbano
      4.4.90.52.00 Equipamentos e material permanente
      4.4.90.52.48 Veículos diversos
 10/04/2026  VR MULTIMARCAS LTDA
             LC 9.2026-003               09040002   mercadoria Nº 360 série 1 de 10/04/2026   10040013   46.980,00
                       quantidade  unidade especificação                 valor unitário   valor total
                           1,0000  UNIDAD  VEÍCULO TIPO TRICICLO CARGO 800 KG.   46.980,00   46.980,00
                                                       TOTAL SUBELEMENTO (4.4.90.52.48).......   46.980,00
                                                                       SUB-TOTAL.......   46.980,00
                                                       TOTAL PROJ/ATIV.(2.030)................   46.980,00
----------------------------------------------------------------------------------------
                                              TOTAL GERAL DE LIQUIDAÇÕES...   46.980,00
----------------------------------------------------------------------------------------
TOTAL GERAL DE LIQUIDAÇÃO DA UG (PREFEITURA MUNICIPAL DE SÃO SEBASTIÃO DA BOA VISTA) POR FONTE DE RECURSOS
                       15000000  -Recursos não vinculados de impostos..........   46.980,00
----------------------------------------------------------------------------------------



Pará                                    MOVIMENTOS DE LIQUIDAÇÃO
Governo Municipal de São Sebastião da Boa Vista       Exercício de 2026     Página : 0001
Fundo Municipal de Saúde
Classif. Econômica 4.4.90.52.00                       Discriminado por: item
----------------------------------------------------------------------------------------
                   DOTAÇÃO              EMPENHO    NOTA FISCAL            LIQUIDAÇÃO   VALOR(R$)
----------------------------------------------------------------------------------------

03 01.
 10 301 0012 2.035 Manutenção do Fundo Municipal de Saúde
      4.4.90.52.00 Equipamentos e material permanente
      4.4.90.52.42 Mobiliário em geral
 02/02/2026  ANJOS & ANJOS LTDA
             CD A/2025-002               12010005   mercadoria Nº 2765 série 1 de 29/01/2026   02020051   29.673,00
                       quantidade  unidade especificação                 valor unitário   valor total
                           7,0000  UNIDAD  AR-CONDICIONADO SPLIT INVERTER   24.000
                                           BTUS                                     4.239,00   29.673,00
                           2,0000  UNIDAD  FREEZER HORIZONTAL 2 TAMPAS - 519 LITROS   3.988,25   7.976,50
                                                       TOTAL SUBELEMENTO (4.4.90.52.42).......   37.649,50
----------------------------------------------------------------------------------------
TOTAL GERAL DE LIQUIDAÇÃO DA UG (FUNDO MUNICIPAL DE SAÚDE) POR FONTE DE RECURSOS
                       15001002  -Receita de imposto e transf. - Saúde.........   7.976,50
                       16010000  -Transferência SUS-Bloco de estruturação......   29.673,00
----------------------------------------------------------------------------------------
`;

describe('parseRelatorioLiquidacao', () => {
  const r = parseRelatorioLiquidacao(RELATORIO);

  it('não gera avisos e detecta exercício e UGs', () => {
    expect(r.avisos).toEqual([]);
    expect(r.exercicio).toBe('2026');
    expect(r.ugs.map((u) => u.nome)).toEqual([
      'Prefeitura Municipal de São Sebastião da Boa Vista',
      'Fundo Municipal de Saúde',
    ]);
  });

  it('extrai o item simples (veículo) com NF, fornecedor e empenho', () => {
    const v = r.itens.find((x) => x.descricao.startsWith('VEÍCULO'));
    expect(v).toBeDefined();
    expect(v!.quantidade).toBe(1);
    expect(v!.valorUnitario).toBe(46980);
    expect(v!.valorTotal).toBe(46980);
    expect(v!.numeroNotaFiscal).toBe('360/1');
    expect(v!.fornecedor).toBe('VR MULTIMARCAS LTDA');
    expect(v!.numeroEmpenho).toBe('09040002');
    expect(v!.numeroLiquidacao).toBe('10040013');
    expect(v!.dataAquisicao.slice(0, 10)).toBe('2026-04-10'); // data da NF
    expect(v!.tipoSugerido).toBe('Veículo');
    expect(v!.formaAquisicaoSugerida).toBe('Licitação');
    expect(v!.ug).toBe('Prefeitura Municipal de São Sebastião da Boa Vista');
  });

  it('junta a descrição de item quebrada em duas linhas', () => {
    const ac = r.itens.find((x) => x.descricao.includes('AR-CONDICIONADO'));
    expect(ac).toBeDefined();
    expect(ac!.descricao).toBe('AR-CONDICIONADO SPLIT INVERTER 24.000 BTUS');
    expect(ac!.quantidade).toBe(7);
    expect(ac!.valorUnitario).toBe(4239);
    expect(ac!.valorTotal).toBe(29673);
    expect(ac!.tipoSugerido).toBe('Mobiliário em Geral');
    expect(ac!.formaAquisicaoSugerida).toBe('Dispensa/Compra Direta');
  });

  it('todos os itens satisfazem quantidade × unitário = total', () => {
    for (const x of r.itens) {
      expect(Math.abs(x.quantidade * x.valorUnitario - x.valorTotal)).toBeLessThan(0.05);
    }
  });

  it('sugere origem_recurso por UG: única → proprio; fontes mistas → null', () => {
    const pref = r.ugs.find((u) => u.nome.startsWith('Prefeitura'))!;
    expect(pref.origemRecursoSugerida).toBe('proprio');
    const saude = r.ugs.find((u) => u.nome.startsWith('Fundo Municipal de Saúde'))!;
    expect(saude.fontes).toHaveLength(2);
    expect(saude.origemRecursoSugerida).toBeNull(); // imposto (proprio) + SUS (transferencia)
  });
});

describe('mapas de derivação', () => {
  it('subelemento → tipo', () => {
    expect(tipoDoSubelemento('48', 'Veículos diversos')).toBe('Veículo');
    expect(tipoDoSubelemento('42', 'Mobiliário em geral')).toBe('Mobiliário em Geral');
    expect(tipoDoSubelemento('99', 'Outros materiais permanentes')).toBe('Outros Materiais Permanentes');
    expect(tipoDoSubelemento('77', 'Categoria Nova')).toBe('Categoria Nova'); // fallback ao nome
  });

  it('empenho → forma de aquisição', () => {
    expect(formaDoEmpenho('LC 9.2026-003')).toBe('Licitação');
    expect(formaDoEmpenho('CD A.2026-001')).toBe('Dispensa/Compra Direta');
    expect(formaDoEmpenho('XX outro')).toBe('Compra');
  });

  it('fonte → origem_recurso', () => {
    expect(origemDaFonte('Recursos não vinculados de impostos')).toBe('proprio');
    expect(origemDaFonte('Transferência SUS-Bloco de estruturação')).toBe('transferencia_ente');
    expect(origemDaFonte('Transf. do FUNDEB - Comple. União')).toBe('transferencia_ente');
    expect(origemDaFonte('Recurso de convênio federal')).toBe('convenio');
    expect(origemDaFonte('Emenda parlamentar individual')).toBe('emenda');
    expect(origemDaFonte('Fonte desconhecida xyz')).toBeNull();
  });
});
