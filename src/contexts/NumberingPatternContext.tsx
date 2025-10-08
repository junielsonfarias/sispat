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
import { generateId } from '@/lib/utils'

interface NumberingPatternContextType {
  pattern: NumberingPattern | null
  savePattern: (pattern: NumberingPattern) => void
}

const NumberingPatternContext =
  createContext<NumberingPatternContextType | null>(null)

const defaultPatternComponents = [
  { id: generateId(), type: 'year' as const, format: 'YYYY' as const },
  { id: generateId(), type: 'sequence' as const, length: 5 },
]

export const NumberingPatternProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [patterns, setPatterns] = useState<NumberingPattern[]>([])
  const { user } = useAuth()

  useEffect(() => {
    // In a real app, this would fetch from an API
    const stored = localStorage.getItem('sispat_numbering_patterns')
    if (stored) {
      setPatterns(JSON.parse(stored))
    }
  }, [])

  const persist = (newPatterns: NumberingPattern[]) => {
    // In a real app, this would be an API call
    localStorage.setItem(
      'sispat_numbering_patterns',
      JSON.stringify(newPatterns),
    )
    setPatterns(newPatterns)
  }

  const pattern = useMemo(() => {
    if (!user?.municipalityId) return null
    const p = patterns.find((p) => p.municipalityId === user.municipalityId)
    if (p) return p
    return {
      municipalityId: user.municipalityId,
      components: defaultPatternComponents,
    }
  }, [patterns, user])

  const savePattern = useCallback(
    (patternToSave: NumberingPattern) => {
      if (!user?.municipalityId) return

      setPatterns((prev) => {
        const existingIndex = prev.findIndex(
          (p) => p.municipalityId === patternToSave.municipalityId,
        )
        let newPatterns
        if (existingIndex > -1) {
          newPatterns = [...prev]
          newPatterns[existingIndex] = patternToSave
        } else {
          newPatterns = [...prev, patternToSave]
        }
        persist(newPatterns)
        return newPatterns
      })
    },
    [user],
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
