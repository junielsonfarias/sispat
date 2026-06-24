/**
 * Resolução de município para ROTAS PÚBLICAS (sem autenticação).
 *
 * As rotas públicas não têm um `req.user` para derivar o tenant, então sem
 * cuidado elas misturam dados de todos os municípios (vazamento latente —
 * inofensivo em deploy mono-município, crítico assim que houver um 2º).
 *
 * Estratégia: aceitar um `municipalityId` opcional na query. Quando ausente,
 * cair no único município existente (mantém o deploy mono funcionando sem
 * mudança de contrato); quando houver vários e nada for informado, exigir o
 * parâmetro (400) em vez de vazar.
 */

import { prisma } from '../config/database';

export class MunicipalityRequiredError extends Error {
  constructor(
    message = 'Informe municipalityId: há mais de um município cadastrado.',
  ) {
    super(message);
    this.name = 'MunicipalityRequiredError';
  }
}

/**
 * Retorna o id do município a usar numa rota pública, ou `null` se o sistema
 * ainda não tem nenhum município.
 *
 * @throws MunicipalityRequiredError quando o id informado não existe, ou
 * quando há múltiplos municípios e nenhum foi informado.
 */
export const resolvePublicMunicipalityId = async (
  requested?: string | null,
): Promise<string | null> => {
  if (requested) {
    const found = await prisma.municipality.findUnique({
      where: { id: requested },
      select: { id: true },
    });
    if (!found) throw new MunicipalityRequiredError('Município não encontrado.');
    return found.id;
  }

  // Sem id informado: só é seguro inferir se existir exatamente um município.
  const municipios = await prisma.municipality.findMany({
    select: { id: true },
    take: 2,
  });
  if (municipios.length === 0) return null;
  if (municipios.length === 1) return municipios[0].id;
  throw new MunicipalityRequiredError();
};
