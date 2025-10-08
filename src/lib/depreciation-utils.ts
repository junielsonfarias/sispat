import { Patrimonio } from '@/types'
import { differenceInMonths } from 'date-fns'

export interface DepreciationInfo {
  accumulatedDepreciation: number
  bookValue: number
  annualDepreciation: number
  monthlyDepreciation: number
  depreciatedMonths: number
  remainingLifeMonths: number
  remainingLife: number
  depreciationRate: number
  isFullyDepreciated: boolean
  lastDepreciationDate: Date
}

export const calculateDepreciation = (
  patrimonio: Patrimonio,
): DepreciationInfo => {
  const {
    valor_aquisicao = patrimonio.valorAquisicao,
    data_aquisicao = patrimonio.dataAquisicao,
    vida_util_anos = patrimonio.vidaUtilAnos || 0,
    valor_residual = patrimonio.valorResidual || 0,
  } = patrimonio

  const now = new Date()
  const lastDepreciationDate = now

  if (vida_util_anos <= 0 || valor_aquisicao <= valor_residual) {
    return {
      accumulatedDepreciation: 0,
      bookValue: valor_aquisicao,
      annualDepreciation: 0,
      monthlyDepreciation: 0,
      depreciatedMonths: 0,
      remainingLifeMonths: 0,
      remainingLife: 0,
      depreciationRate: 0,
      isFullyDepreciated: vida_util_anos <= 0,
      lastDepreciationDate,
    }
  }

  const depreciableValue = valor_aquisicao - valor_residual
  const annualDepreciation = depreciableValue / vida_util_anos
  const monthlyDepreciation = annualDepreciation / 12

  const acquisitionDate = new Date(data_aquisicao)
  const totalMonthsSinceAcquisition = differenceInMonths(now, acquisitionDate)
  const totalMonthsOfLife = vida_util_anos * 12

  const effectiveDepreciatedMonths = Math.max(
    0,
    Math.min(totalMonthsSinceAcquisition, totalMonthsOfLife),
  )

  const accumulatedDepreciation =
    effectiveDepreciatedMonths * monthlyDepreciation

  const bookValue = Math.max(
    valor_residual,
    valor_aquisicao - accumulatedDepreciation,
  )

  const remainingLifeMonths = totalMonthsOfLife - effectiveDepreciatedMonths

  const depreciationRate = vida_util_anos > 0 ? (100 / vida_util_anos) : 0
  const remainingLife = Math.max(0, remainingLifeMonths / 12)

  return {
    accumulatedDepreciation,
    bookValue,
    annualDepreciation,
    monthlyDepreciation,
    depreciatedMonths: effectiveDepreciatedMonths,
    remainingLifeMonths: Math.max(0, remainingLifeMonths),
    remainingLife,
    depreciationRate,
    isFullyDepreciated: effectiveDepreciatedMonths >= totalMonthsOfLife,
    lastDepreciationDate,
  }
}
