import { useEffect, useRef } from 'react'
import type { UseFormReturn } from 'react-hook-form'

/**
 * Auto-save de formulário longo em localStorage.
 *
 * Persiste o draft de `form.watch()` periodicamente. Restaura ao montar
 * (uma vez) e limpa quando `flush` for chamado (use no `onSubmit` que
 * realmente persistiu no servidor).
 *
 * Uso:
 *   const { clearDraft } = useFormAutosave(form, { key: 'BensCreate' })
 *   const onSubmit = async (data) => {
 *     await api.post(...)
 *     clearDraft()
 *   }
 *
 * Não persiste:
 * - Arquivos (File objects)
 * - Campos que vierem em `excludeFields`
 *
 * @param form  react-hook-form returned object
 * @param opts.key      chave única no localStorage (use prefixo + identificador)
 * @param opts.delay    ms entre auto-saves (default 1000)
 * @param opts.excludeFields nomes de campos a não persistir
 * @param opts.enabled  se false, desliga o hook
 */
export interface UseFormAutosaveOptions<T> {
  key: string
  delay?: number
  excludeFields?: ReadonlyArray<keyof T & string>
  enabled?: boolean
}

const PREFIX = 'sispat_draft:'

const isFileLike = (v: unknown): boolean =>
  typeof File !== 'undefined' && v instanceof File

const stripFiles = <T extends Record<string, unknown>>(
  obj: T,
  excluded: ReadonlyArray<string>,
): Record<string, unknown> => {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (excluded.includes(k)) continue
    if (isFileLike(v)) continue
    if (Array.isArray(v)) {
      const filtered = v.filter((x) => !isFileLike(x))
      out[k] = filtered
    } else {
      out[k] = v
    }
  }
  return out
}

export const useFormAutosave = <T extends Record<string, unknown>>(
  form: UseFormReturn<T>,
  opts: UseFormAutosaveOptions<T>,
) => {
  const storageKey = `${PREFIX}${opts.key}`
  const delay = opts.delay ?? 1000
  const enabled = opts.enabled ?? true
  const excluded = opts.excludeFields ?? []
  const restoredRef = useRef(false)

  // Restaurar uma vez ao montar
  useEffect(() => {
    if (!enabled || restoredRef.current) return
    restoredRef.current = true
    try {
      const raw = localStorage.getItem(storageKey)
      if (!raw) return
      const draft = JSON.parse(raw) as Partial<T>
      // Só aplica se o form ainda está nos defaults (não sobrescreve dados que
      // o caller já preencheu via reset/setValue após o load do registro)
      const isPristine = Object.keys(form.formState.dirtyFields).length === 0
      if (isPristine) {
        Object.entries(draft).forEach(([k, v]) => {
          if (v !== undefined) {
            form.setValue(k as never, v as never, { shouldDirty: false })
          }
        })
      }
    } catch {
      // ignora drafts corrompidos
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Persistir com debounce
  useEffect(() => {
    if (!enabled) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const subscription = form.watch((values) => {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        try {
          const sanitized = stripFiles(
            values as Record<string, unknown>,
            excluded as ReadonlyArray<string>,
          )
          localStorage.setItem(storageKey, JSON.stringify(sanitized))
        } catch {
          // QuotaExceededError ou outro — ignora silenciosamente
        }
      }, delay)
    })
    return () => {
      if (timer) clearTimeout(timer)
      subscription.unsubscribe()
    }
  }, [form, storageKey, delay, enabled, excluded])

  const clearDraft = () => {
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // ignora
    }
  }

  return { clearDraft }
}
