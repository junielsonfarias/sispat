import { createContext, useCallback, useContext, useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

/**
 * Confirmação acessível e estilizada para ações destrutivas.
 *
 * Substitui `window.confirm()` (modal nativo do browser — inconsistente
 * visualmente, com a11y irregular, bloqueado em alguns navegadores mobile).
 *
 * Uso (em qualquer componente abaixo de `<ConfirmProvider>`):
 *   const confirm = useConfirm()
 *   const handleDelete = async () => {
 *     const ok = await confirm({
 *       title: 'Excluir patrimônio?',
 *       description: 'Esta ação não pode ser desfeita.',
 *       confirmText: 'Excluir',
 *       variant: 'destructive',
 *     })
 *     if (ok) deleteIt()
 *   }
 *
 * O Provider já está montado em `AppProviders.tsx` (raiz).
 */

export interface ConfirmOptions {
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive'
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

interface State extends ConfirmOptions {
  open: boolean
}

export const ConfirmProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<State>({ open: false, title: '' })
  const resolverRef = useRef<((value: boolean) => void) | null>(null)

  const confirm = useCallback<ConfirmFn>((opts) => {
    setState({ open: true, ...opts })
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const handleClose = (value: boolean) => {
    resolverRef.current?.(value)
    resolverRef.current = null
    setState((s) => ({ ...s, open: false }))
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog open={state.open} onOpenChange={(o) => !o && handleClose(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{state.title}</AlertDialogTitle>
            {state.description && (
              <AlertDialogDescription>{state.description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleClose(false)}>
              {state.cancelText ?? 'Cancelar'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleClose(true)}
              className={
                state.variant === 'destructive'
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : undefined
              }
            >
              {state.confirmText ?? 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  )
}

export const useConfirm = (): ConfirmFn => {
  const ctx = useContext(ConfirmContext)
  if (!ctx) {
    throw new Error('useConfirm deve ser usado dentro de <ConfirmProvider>')
  }
  return ctx
}
