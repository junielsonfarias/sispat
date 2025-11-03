import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useCallback,
  useEffect,
  useMemo,
} from 'react'
import { NumberingPattern } from '@/types'
import { useAuth } from './AuthContext'
import { api } from '@/services/api-adapter'
import { toast } from '@/hooks/use-toast'

interface NumberingPatternContextType {
  pattern: NumberingPattern | null
  savePattern: (pattern: NumberingPattern) => void
}

const NumberingPatternContext =
  createContext<NumberingPatternContextType | null>(null)

export const NumberingPatternProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [pattern, setPattern] = useState<NumberingPattern | null>(null)
  const { user } = useAuth()

  const fetchPattern = useCallback(async () => {
    if (!user) return
    
    try {
      const data = await api.get<NumberingPattern>('/config/numbering-pattern')
      setPattern(data)
    } catch (error) {
      // Silenciar erro se não houver padrão
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchPattern()
    }
  }, [user, fetchPattern])

  const savePattern = useCallback(
    async (patternToSave: NumberingPattern) => {
      if (!user) return

      try {
        await api.put('/config/numbering-pattern', patternToSave)
        await fetchPattern()
        toast({ description: 'Padrão de numeração salvo com sucesso.' })
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Falha ao salvar padrão de numeração.',
        })
      }
    },
    [user, fetchPattern],
  )

  return (
    <NumberingPatternContext.Provider value={{ pattern, savePattern }}>
      {children}
    </NumberingPatternContext.Provider>
  )
}

export const useNumberingPattern = () => {
  const context = useContext(NumberingPatternContext)
  if (!context) {
    throw new Error(
      'useNumberingPattern must be used within a NumberingPatternProvider',
    )
  }
  return context
}
