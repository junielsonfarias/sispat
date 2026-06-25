/**
 * Nome do Local de entrada dos bens importados (espelha
 * ALMOXARIFADO_LOCAL_NOME do backend). Bem "aguardando distribuição" enquanto
 * seu local for o Almoxarifado. Constante única para evitar literais espalhados.
 */
export const ALMOXARIFADO_NOME = 'Almoxarifado'

/** Compara um nome de local com o Almoxarifado (case-insensitive, com trim). */
export const isAlmoxarifado = (localNome?: string | null): boolean =>
  (localNome ?? '').trim().toLowerCase() === ALMOXARIFADO_NOME.toLowerCase()
