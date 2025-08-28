import { Patrimonio, Sector } from '@/types'

export const generatePatrimonialNumber = (
  sectorId: string,
  allSectors: Sector[],
  allPatrimonios: Patrimonio[],
): string => {
  const sector = allSectors.find((s) => s.id === sectorId)
  if (!sector?.codigo) {
    throw new Error('Setor inválido ou sem código definido.')
  }

  const currentYear = new Date().getFullYear().toString()
  const sectorCode = sector.codigo

  const prefix = `${currentYear}${sectorCode}`

  // Filtrar patrimônios que começam com o prefixo
  const patrimoniosInSectorAndYear = allPatrimonios.filter((p) => {
    if (!p.numero_patrimonio) return false
    return p.numero_patrimonio.startsWith(prefix)
  })

  let maxSequence = 0
  patrimoniosInSectorAndYear.forEach((p) => {
    if (!p.numero_patrimonio) return
    
    const sequenceStr = p.numero_patrimonio.substring(prefix.length)
    const sequenceNum = parseInt(sequenceStr, 10)
    if (!isNaN(sequenceNum) && sequenceNum > maxSequence) {
      maxSequence = sequenceNum
    }
  })

  const nextSequence = (maxSequence + 1).toString().padStart(5, '0')

  return `${prefix}${nextSequence}`
}
