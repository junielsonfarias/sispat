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

/**
 * Campos mínimos necessários para calcular a depreciação.
 * Qualquer objeto que contenha esses campos é compatível (ex.: Patrimonio,
 * PatrimonioAnalytics), sem exigir o tipo completo.
 */
export interface DepreciationInput {
  valor_aquisicao: number
  data_aquisicao: Date | string
  vida_util_anos?: number
  valor_residual?: number
}

export const calculateDepreciation = (
  patrimonio: DepreciationInput,
): DepreciationInfo => {
  const {
    valor_aquisicao,
    data_aquisicao,
    vida_util_anos = 0,
    valor_residual = 0,
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
