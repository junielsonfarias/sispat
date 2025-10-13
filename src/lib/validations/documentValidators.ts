/**
 * Validadores de documentos brasileiros
 * CPF, CNPJ, CEP
 */

/**
 * Valida CPF
 */
export function validateCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  cpf = cpf.replace(/[^\d]/g, '')

  // Verifica se tem 11 dígitos
  if (cpf.length !== 11) return false

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(cpf)) return false

  // Valida primeiro dígito verificador
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpf.charAt(i)) * (10 - i)
  }
  let digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== parseInt(cpf.charAt(9))) return false

  // Valida segundo dígito verificador
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpf.charAt(i)) * (11 - i)
  }
  digit = 11 - (sum % 11)
  if (digit >= 10) digit = 0
  if (digit !== parseInt(cpf.charAt(10))) return false

  return true
}

/**
 * Valida CNPJ
 */
export function validateCNPJ(cnpj: string): boolean {
  // Remove caracteres não numéricos
  cnpj = cnpj.replace(/[^\d]/g, '')

  // Verifica se tem 14 dígitos
  if (cnpj.length !== 14) return false

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(cnpj)) return false

  // Valida primeiro dígito verificador
  let size = cnpj.length - 2
  let numbers = cnpj.substring(0, size)
  const digits = cnpj.substring(size)
  let sum = 0
  let pos = size - 7

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--
    if (pos < 2) pos = 9
  }

  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(0))) return false

  // Valida segundo dígito verificador
  size = size + 1
  numbers = cnpj.substring(0, size)
  sum = 0
  pos = size - 7

  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--
    if (pos < 2) pos = 9
  }

  result = sum % 11 < 2 ? 0 : 11 - (sum % 11)
  if (result !== parseInt(digits.charAt(1))) return false

  return true
}

/**
 * Valida CPF ou CNPJ
 */
export function validateCPFOrCNPJ(document: string): boolean {
  const cleaned = document.replace(/[^\d]/g, '')
  
  if (cleaned.length === 11) {
    return validateCPF(cleaned)
  } else if (cleaned.length === 14) {
    return validateCNPJ(cleaned)
  }
  
  return false
}

/**
 * Valida CEP
 */
export function validateCEP(cep: string): boolean {
  // Remove caracteres não numéricos
  cep = cep.replace(/[^\d]/g, '')

  // Verifica se tem 8 dígitos
  if (cep.length !== 8) return false

  // Verifica se não é uma sequência de números iguais
  if (/^(\d)\1{7}$/.test(cep)) return false

  return true
}

/**
 * Formata CPF
 */
export function formatCPF(cpf: string): string {
  cpf = cpf.replace(/[^\d]/g, '')
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

/**
 * Formata CNPJ
 */
export function formatCNPJ(cnpj: string): string {
  cnpj = cnpj.replace(/[^\d]/g, '')
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

/**
 * Formata CEP
 */
export function formatCEP(cep: string): string {
  cep = cep.replace(/[^\d]/g, '')
  return cep.replace(/(\d{5})(\d{3})/, '$1-$2')
}

/**
 * Schemas Zod para validação
 */
import { z } from 'zod'

export const cpfSchema = z
  .string()
  .refine(validateCPF, { message: 'CPF inválido' })

export const cnpjSchema = z
  .string()
  .refine(validateCNPJ, { message: 'CNPJ inválido' })

export const cpfOrCnpjSchema = z
  .string()
  .refine(validateCPFOrCNPJ, { message: 'CPF/CNPJ inválido' })

export const cepSchema = z
  .string()
  .refine(validateCEP, { message: 'CEP inválido' })

