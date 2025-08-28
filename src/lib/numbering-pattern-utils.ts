import {
  NumberingPattern,
  NumberingPatternComponent,
  Patrimonio,
} from '@/types'
import { format } from 'date-fns'

export const generatePreview = (
  components: NumberingPatternComponent[],
): string => {
  const now = new Date()
  return components
    .map((comp) => {
      switch (comp.type) {
        case 'text':
          return comp.value || ''
        case 'year':
          return format(now, comp.format === 'YY' ? 'yy' : 'yyyy')
        case 'sequence':
          return '1'.padStart(comp.length || 4, '0')
        default:
          return ''
      }
    })
    .join('')
}

export const generateNextAssetNumber = (
  pattern: NumberingPattern,
  existingPatrimonios: Patrimonio[],
): string => {
  const now = new Date()
  let prefix = ''
  let sequenceComponent: NumberingPatternComponent | undefined

  for (const comp of pattern.components) {
    switch (comp.type) {
      case 'text':
        prefix += comp.value || ''
        break
      case 'year':
        prefix += format(now, comp.format === 'YY' ? 'yy' : 'yyyy')
        break
      case 'sequence':
        sequenceComponent = comp
        break
    }
  }

  if (!sequenceComponent) {
    return `${prefix}NO_SEQUENCE`
  }

  const sequenceLength = sequenceComponent.length || 4
  const relevantPatrimonios = existingPatrimonios.filter(
    (p) =>
      p.numero_patrimonio.startsWith(prefix) &&
      p.municipalityId === pattern.municipalityId,
  )

  let maxSequence = 0
  for (const p of relevantPatrimonios) {
    const sequenceStr = p.numero_patrimonio.slice(prefix.length)
    const sequenceNum = parseInt(sequenceStr, 10)
    if (!isNaN(sequenceNum) && sequenceNum > maxSequence) {
      maxSequence = sequenceNum
    }
  }

  const nextSequence = (maxSequence + 1)
    .toString()
    .padStart(sequenceLength, '0')
  return `${prefix}${nextSequence}`
}
