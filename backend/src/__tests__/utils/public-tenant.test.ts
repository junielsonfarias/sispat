/**
 * Testes do resolvePublicMunicipalityId — resolução de tenant em rotas públicas.
 */

const mockPrisma = {
  municipality: { findUnique: jest.fn(), findMany: jest.fn() },
};
jest.mock('../../config/database', () => ({ prisma: mockPrisma }));

import {
  resolvePublicMunicipalityId,
  MunicipalityRequiredError,
} from '../../utils/public-tenant';

beforeEach(() => jest.clearAllMocks());

describe('resolvePublicMunicipalityId', () => {
  it('usa o id informado quando existe', async () => {
    mockPrisma.municipality.findUnique.mockResolvedValue({ id: 'mun-2' });
    await expect(resolvePublicMunicipalityId('mun-2')).resolves.toBe('mun-2');
    expect(mockPrisma.municipality.findMany).not.toHaveBeenCalled();
  });

  it('rejeita id informado inexistente', async () => {
    mockPrisma.municipality.findUnique.mockResolvedValue(null);
    await expect(resolvePublicMunicipalityId('xxx')).rejects.toBeInstanceOf(
      MunicipalityRequiredError,
    );
  });

  it('infere o único município quando nada é informado (deploy mono)', async () => {
    mockPrisma.municipality.findMany.mockResolvedValue([{ id: 'mun-1' }]);
    await expect(resolvePublicMunicipalityId()).resolves.toBe('mun-1');
  });

  it('retorna null quando não há nenhum município', async () => {
    mockPrisma.municipality.findMany.mockResolvedValue([]);
    await expect(resolvePublicMunicipalityId()).resolves.toBeNull();
  });

  it('exige o parâmetro quando há múltiplos municípios (não vaza)', async () => {
    mockPrisma.municipality.findMany.mockResolvedValue([{ id: 'mun-1' }, { id: 'mun-2' }]);
    await expect(resolvePublicMunicipalityId()).rejects.toBeInstanceOf(
      MunicipalityRequiredError,
    );
  });
});
