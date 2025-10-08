import { Patrimonio, Sector } from '@/types'

export const generatePatrimonialNumber = (
  sectorId: string,
  allSectors: Sector[],
  allPatrimonios: Patrimonio[],
): string => {
  const sector = allSectors.find((s) => s.id === sectorId)
  if (!sector || !sector.codigo) {
    throw new Error('Setor inválido ou sem código definido.')
  }

  // Verificar se allPatrimonios é um array válido
  if (!Array.isArray(allPatrimonios)) {
    console.warn('allPatrimonios não é um array, usando array vazio')
    allPatrimonios = []
  }

  const currentYear = new Date().getFullYear().toString()
  const sectorCode = sector.codigo

  const prefix = `${currentYear}${sectorCode}`

  const patrimoniosInSectorAndYear = allPatrimonios.filter((p) =>
    p.numero_patrimonio?.startsWith(prefix),
  )

  let maxSequence = 0
  patrimoniosInSectorAndYear.forEach((p) => {
    const sequenceStr = p.numero_patrimonio.substring(prefix.length)
    const sequenceNum = parseInt(sequenceStr, 10)
    if (!isNaN(sequenceNum) && sequenceNum > maxSequence) {
      maxSequence = sequenceNum
    }
  })

  const nextSequence = (maxSequence + 1).toString().padStart(6, '0')

  return `${prefix}${nextSequence}`
}
