/**
 * Configuração do Município Único - São Sebastião da Boa Vista
 * 
 * Este arquivo contém as configurações estáticas para o município único
 * após a migração do sistema multi-municipality para single-municipality.
 */

import { Municipality } from '@/types'
import { generateLogoUrl } from '@/lib/image-utils'

// Configuração do município único
export const MUNICIPALITY_CONFIG: Municipality = {
  id: '1',
  name: 'São Sebastião da Boa Vista',
  logoUrl: generateLogoUrl('government'),
  supervisorId: 'user-supervisor-1',
  fullAddress: 'Praça da Matriz, 123, Centro, São Sebastião da Boa Vista, PA',
  cnpj: '12.345.678/0001-99',
  contactEmail: 'contato@ssbv.pa.gov.br',
  mayorName: 'Prefeito Exemplo da Silva',
  mayorCpf: '123.456.789-00',
  accessStartDate: '2024-01-01',
  accessEndDate: '2026-12-31',
  history: [],
}

// Constantes para uso em toda a aplicação
export const MUNICIPALITY_ID = '1'
export const MUNICIPALITY_NAME = 'São Sebastião da Boa Vista'
export const MUNICIPALITY_SHORT_NAME = 'SSB Vista'
export const MUNICIPALITY_CNPJ = '12.345.678/0001-99'
export const MUNICIPALITY_EMAIL = 'contato@ssbv.pa.gov.br'

// Função helper para verificar se um item pertence ao município
export const belongsToMunicipality = (municipalityId?: string): boolean => {
  return municipalityId === MUNICIPALITY_ID || !municipalityId
}

// Função para obter o nome do município (sempre retorna o mesmo)
export const getMunicipalityName = (): string => MUNICIPALITY_NAME

// Função para obter a configuração completa do município
export const getMunicipalityConfig = (): Municipality => MUNICIPALITY_CONFIG
