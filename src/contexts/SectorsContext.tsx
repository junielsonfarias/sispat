import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useCallback,
  useEffect,
  useMemo,
} from 'react'
import { Sector } from '@/types'
import { generateId } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { useAuth } from './AuthContext'
import { isCircularDependency } from '@/lib/sector-utils'

interface SectorContextType {
  sectors: Sector[]
  getSectorById: (id: string) => Sector | undefined
  addSector: (name: string, parentId: string | null) => void
  updateSector: (id: string, name: string, parentId: string | null) => void
  deleteSector: (id: string) => void
}

const SectorContext = createContext<SectorContextType | null>(null)

const initialSectors: Sector[] = [
  {
    id: '1',
    name: 'Administração',
    parentId: null,
    municipalityId: '1',
  },
  {
    id: '2',
    name: 'Secretaria de Educação',
    parentId: '1',
    municipalityId: '1',
  },
  {
    id: '3',
    name: 'Secretaria de Saúde',
    parentId: '1',
    municipalityId: '1',
  },
  { id: '4', name: 'Gabinete', parentId: '1', municipalityId: '1' },
  { id: '5', name: 'Escola A', parentId: '2', municipalityId: '1' },
  { id: '6', name: 'Escola B', parentId: '2', municipalityId: '1' },
  {
    id: '7',
    name: 'Posto de Saúde Central',
    parentId: '3',
    municipalityId: '1',
  },
]

export const SectorProvider = ({ children }: { children: ReactNode }) => {
  const [allSectors, setAllSectors] = useState<Sector[]>(initialSectors)
  const { user } = useAuth()

  useEffect(() => {
    const storedSectors = localStorage.getItem('sispat_sectors')
    if (storedSectors) {
      setAllSectors(JSON.parse(storedSectors))
    } else {
      localStorage.setItem('sispat_sectors', JSON.stringify(initialSectors))
    }
  }, [])

  const sectors = useMemo(() => {
    if (user?.role === 'superuser') return allSectors
    if (user?.municipalityId) {
      return allSectors.filter((s) => s.municipalityId === user.municipalityId)
    }
    return []
  }, [allSectors, user])

  const persistSectors = (newSectors: Sector[]) => {
    localStorage.setItem('sispat_sectors', JSON.stringify(newSectors))
    setAllSectors(newSectors)
  }

  const getSectorById = useCallback(
    (id: string) => sectors.find((s) => s.id === id),
    [sectors],
  )

  const addSector = useCallback(
    (name: string, parentId: string | null) => {
      if (!user?.municipalityId) return
      const newSector: Sector = {
        id: generateId(),
        name,
        parentId,
        municipalityId: user.municipalityId,
      }
      const newSectors = [...allSectors, newSector]
      persistSectors(newSectors)
      toast({ description: 'Setor criado com sucesso.' })
    },
    [allSectors, user],
  )

  const updateSector = useCallback(
    (id: string, name: string, parentId: string | null) => {
      if (isCircularDependency(id, parentId, allSectors)) {
        toast({
          variant: 'destructive',
          title: 'Erro de Validação',
          description: 'Um setor não pode ser filho de si mesmo.',
        })
        return
      }
      const newSectors = allSectors.map((s) =>
        s.id === id ? { ...s, name, parentId } : s,
      )
      persistSectors(newSectors)
      toast({ description: 'Setor atualizado com sucesso.' })
    },
    [allSectors],
  )

  const deleteSector = useCallback(
    (id: string) => {
      const childSectors = allSectors.filter((s) => s.parentId === id)
      if (childSectors.length > 0) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Não é possível excluir um setor que possui subsetores.',
        })
        return
      }
      persistSectors(allSectors.filter((s) => s.id !== id))
      toast({ description: 'Setor excluído com sucesso.' })
    },
    [allSectors],
  )

  return (
    <SectorContext.Provider
      value={{ sectors, getSectorById, addSector, updateSector, deleteSector }}
    >
      {children}
    </SectorContext.Provider>
  )
}

export const useSectors = () => {
  const context = useContext(SectorContext)
  if (!context) {
    throw new Error('useSectors must be used within a SectorProvider')
  }
  return context
}
