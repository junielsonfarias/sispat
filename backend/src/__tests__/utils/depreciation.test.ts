import { depreciacaoAcumulada, valorContabilLiquido } from '../../utils/depreciation';

describe('depreciation (backend) — valor contábil líquido', () => {
  const base = {
    valor_aquisicao: 1200,
    data_aquisicao: new Date('2025-06-30'),
    vida_util_anos: 10,
    valor_residual: 0,
  };

  it('depreciação linear acumulada após 12 meses', () => {
    // mensal = (1200-0) / (10*12) = 10; 12 meses => 120
    expect(depreciacaoAcumulada(base, new Date('2026-06-30'))).toBe(120);
    expect(valorContabilLiquido(base, new Date('2026-06-30'))).toBe(1080);
  });

  it('não deprecia antes da aquisição', () => {
    expect(depreciacaoAcumulada(base, new Date('2025-01-01'))).toBe(0);
    expect(valorContabilLiquido(base, new Date('2025-01-01'))).toBe(1200);
  });

  it('valor líquido nunca abaixo do residual (totalmente depreciado)', () => {
    const bem = { ...base, valor_residual: 200 };
    // após a vida útil inteira, líquido = residual
    expect(valorContabilLiquido(bem, new Date('2050-01-01'))).toBe(200);
  });

  it('sem vida útil definida => sem depreciação (líquido = bruto)', () => {
    const bem = { valor_aquisicao: 500, data_aquisicao: new Date('2020-01-01'), vida_util_anos: null, valor_residual: null };
    expect(depreciacaoAcumulada(bem, new Date('2026-01-01'))).toBe(0);
    expect(valorContabilLiquido(bem, new Date('2026-01-01'))).toBe(500);
  });
});
