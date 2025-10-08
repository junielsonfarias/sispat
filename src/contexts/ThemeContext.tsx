import {
  createContext,
  useState,
  useEffect,
  useCallback,
  useContext,
  ReactNode,
  useMemo,
} from 'react'
import { Theme } from '@/types'
import { useAuth } from './AuthContext'

interface ThemeContextType {
  themes: Theme[]
  activeTheme: Theme | null
  applyTheme: (themeId: string) => void
  saveTheme: (theme: Theme) => void
  deleteTheme: (themeId: string) => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

const defaultTheme: Omit<Theme, 'municipalityId'> = {
  id: 'default-light',
  name: 'Padrão Claro',
  colors: {
    background: '0 0% 100%',
    foreground: '224 71.4% 4.1%',
    card: '0 0% 100%',
    cardForeground: '224 71.4% 4.1%',
    popover: '0 0% 100%',
    popoverForeground: '224 71.4% 4.1%',
    primary: '217 91% 60%',
    primaryForeground: '210 20% 98%',
    secondary: '220 14.3% 95.9%',
    secondaryForeground: '220.9 39.3% 11%',
    muted: '220 14.3% 95.9%',
    mutedForeground: '220 8.9% 46.1%',
    accent: '220 14.3% 95.9%',
    accentForeground: '220.9 39.3% 11%',
    destructive: '0 84.2% 60.2%',
    destructiveForeground: '210 20% 98%',
    border: '220 13% 91%',
    input: '220 13% 91%',
    ring: '217 91% 60%',
  },
  borderRadius: '0.5rem',
  fontFamily: "'Inter var', sans-serif",
}

const defaultDarkTheme: Omit<Theme, 'municipalityId'> = {
  id: 'default-dark',
  name: 'Padrão Escuro',
  colors: {
    background: '224 71.4% 4.1%',
    foreground: '210 20% 98%',
    card: '224 71.4% 4.1%',
    cardForeground: '210 20% 98%',
    popover: '224 71.4% 4.1%',
    popoverForeground: '210 20% 98%',
    primary: '217 91% 60%',
    primaryForeground: '210 20% 98%',
    secondary: '215 27.9% 16.9%',
    secondaryForeground: '210 20% 98%',
    muted: '215 27.9% 16.9%',
    mutedForeground: '217.9 10.6% 64.9%',
    accent: '215 27.9% 16.9%',
    accentForeground: '210 20% 98%',
    destructive: '0 62.8% 30.6%',
    destructiveForeground: '210 20% 98%',
    border: '215 27.9% 16.9%',
    input: '215 27.9% 16.9%',
    ring: '217 91% 60%',
  },
  borderRadius: '0.5rem',
  fontFamily: "'Inter var', sans-serif",
}

const initialThemes: Theme[] = [
  { ...defaultTheme, municipalityId: '1' },
  { ...defaultDarkTheme, municipalityId: '1' },
]

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [allThemes, setAllThemes] = useState<Theme[]>(initialThemes)
  const [activeTheme, setActiveTheme] = useState<Theme | null>(null)
  
  // ✅ CORREÇÃO: Não usar useAuth aqui para evitar dependência circular
  // O ThemeProvider está dentro do AuthProvider, causando erro

  useEffect(() => {
    // In a real app, this would fetch from an API
    const storedThemes = localStorage.getItem('sispat_themes')
    if (storedThemes) {
      setAllThemes(JSON.parse(storedThemes))
    }
  }, [])

  const themes = useMemo(() => {
    // ✅ CORREÇÃO: Sistema single-municipality, retornar todos os temas
    return allThemes
  }, [allThemes])

  useEffect(() => {
    // ✅ CORREÇÃO: Sistema single-municipality, usar ID fixo
    const activeThemeId =
      localStorage.getItem(`sispat_active_theme_1`) ||
      'default-light'
    const themeToApply =
      themes.find((t) => t.id === activeThemeId) ||
      themes.find((t) => t.id === 'default-light')
    setActiveTheme(themeToApply || null)
  }, [themes])

  useEffect(() => {
    if (activeTheme) {
      const root = document.documentElement
      Object.entries(activeTheme.colors).forEach(([key, value]) => {
        const cssVarName = `--${key.replace(/([A-Z])/g, '-$1')}`.toLowerCase()
        root.style.setProperty(cssVarName, value)
      })
      root.style.setProperty('--radius', activeTheme.borderRadius)
      root.style.setProperty('--font-sans', activeTheme.fontFamily)
    }
  }, [activeTheme])

  const applyTheme = useCallback(
    (themeId: string) => {
      const themeToApply = themes.find((t) => t.id === themeId)
      if (themeToApply) {
        setActiveTheme(themeToApply)
        // ✅ CORREÇÃO: Sistema single-municipality, usar ID fixo
        localStorage.setItem(
          `sispat_active_theme_1`,
          themeId,
        )
      }
    },
    [themes],
  )

  const saveTheme = useCallback(
    (theme: Theme) => {
      // In a real app, this would be an API call
      const existingIndex = allThemes.findIndex((t) => t.id === theme.id)
      let newThemes
      if (existingIndex > -1) {
        newThemes = [...allThemes]
        newThemes[existingIndex] = theme
      } else {
        newThemes = [...allThemes, theme]
      }
      setAllThemes(newThemes)
      localStorage.setItem('sispat_themes', JSON.stringify(newThemes))
    },
    [allThemes],
  )

  const deleteTheme = useCallback(
    (themeId: string) => {
      // In a real app, this would be an API call
      const newThemes = allThemes.filter((t) => t.id !== themeId)
      setAllThemes(newThemes)
      localStorage.setItem('sispat_themes', JSON.stringify(newThemes))
      if (activeTheme?.id === themeId) {
        applyTheme('default-light')
      }
    },
    [allThemes, activeTheme, applyTheme],
  )

  return (
    <ThemeContext.Provider
      value={{
        themes,
        activeTheme,
        applyTheme,
        saveTheme,
        deleteTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
