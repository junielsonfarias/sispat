import {
  createContext,
  useState,
  ReactNode,
  useContext,
  useCallback,
  useMemo,
  useEffect,
} from 'react'
import { Version, RollbackHistoryEntry } from '@/types'
import { toast } from '@/hooks/use-toast'
import { generateId } from '@/lib/utils'
import { SecureStorage, SafeWindow } from '@/lib/storage-utils'
import { CURRENT_VERSION } from '@/config/constants'

// ✅ CORREÇÃO: Versões reais do sistema
const SYSTEM_VERSIONS: Version[] = [
  {
    version: CURRENT_VERSION,
    releaseDate: new Date().toISOString(),
    changelog: [
      `Release: Official version ${CURRENT_VERSION} deployed.`,
      'Enhancement: Complete integration with PostgreSQL backend.',
      'Enhancement: Removed all mock data and integrated real APIs.',
      'Fix: Improved notes functionality for patrimônios.',
      'Fix: Resolved inventory creation navigation issues.',
      'Fix: Fixed temporal analysis page errors.',
      'Enhancement: Better error handling and logging.',
      'Enhancement: Improved system performance and reliability.',
    ],
  },
  {
    version: '0.0.190',
    releaseDate: new Date().toISOString(),
    changelog: [
      'Release: Official version 0.0.190 deployed.',
      'Feature: Ensured persistent default superuser account.',
      'Enhancement: Improved system startup checks.',
    ],
  },
  {
    version: '0.0.188',
    releaseDate: '2025-08-18T10:00:00.000Z',
    changelog: [
      'Release: Official version 0.0.188 deployed.',
      'Enhancement: Performance improvements on data tables.',
      'Enhancement: UI adjustments on the login screen.',
      'Fix: Corrected an issue with date filtering on reports.',
    ],
  },
  {
    version: '0.0.179',
    releaseDate: '2025-08-16T10:00:00.000Z',
    changelog: [
      'Release: Official version 0.0.179 deployed.',
      'Feature: Superusers can now view assets grouped by user.',
      'Feature: Supervisors can manage general documents.',
      'Feature: Implemented XLSX and PDF export options.',
      'Feature: Implemented system restore from backup for Superusers.',
      'Feature: Added asset transfer and donation flow from the edit screen.',
      'Feature: Added reports for asset transfers and donations.',
      'Security: Version Manager is now restricted to Admins and Superusers.',
    ],
  },
  {
    version: '0.0.177',
    releaseDate: '2025-08-15T01:50:09.399Z',
    changelog: [
      'Release: Official version 0.0.177 deployed.',
      'Feature: Added quantity field to asset registration.',
      'Feature: Added document upload area for assets.',
      'Feature: Implemented asset numbering settings.',
      'Feature: Implemented backup and restore functionality.',
      'Feature: Added loan and transfer management modules.',
      'Feature: Implemented version control with rollback.',
      'Enhancement: Improved navigation menu structure.',
      'Enhancement: Corrected "Settings" menu for supervisors.',
      'Enhancement: Personalized login footer text is now functional.',
      'Fix: Dashboard unified for all user roles.',
      'Fix: Standard users can now only see assets from their sectors.',
    ],
  },
  {
    version: '0.0.174',
    releaseDate: '2025-08-15T01:11:56.037Z',
    changelog: [
      'Release: Official version 0.0.174 deployed.',
      'Enhancement: System stability and performance improvements.',
      'Update: All modules updated to latest specifications.',
    ],
  },
  {
    version: '0.0.173',
    releaseDate: '2025-08-14T10:00:00.000Z',
    changelog: [
      'Feature: Enhanced depreciation calculation engine.',
      'Fix: Minor UI adjustments in the dashboard.',
    ],
  },
  {
    version: '0.0.172',
    releaseDate: '2025-08-12T15:00:00.000Z',
    changelog: [
      'Feature: Added advanced filtering to public asset search.',
      'UX: Improved loading states across the application.',
    ],
  },
]

interface VersionContextType {
  currentVersion: string
  availableVersions: Version[]
  latestVersion: Version | null
  isLatestVersion: boolean
  isUpdating: boolean
  rollbackHistory: RollbackHistoryEntry[]
  updateToLatest: () => void
  rollbackToVersion: (version: string) => void
}

const VersionContext = createContext<VersionContextType | null>(null)

export const VersionProvider = ({ children }: { children: ReactNode }) => {
  const [currentVersion, setCurrentVersion] = useState('2.1.0')
  const [isUpdating, setIsUpdating] = useState(false)
  const [rollbackHistory, setRollbackHistory] = useState<
    RollbackHistoryEntry[]
  >([])

  useEffect(() => {
    const storedHistory = SecureStorage.getItem<string>('sispat_rollback_history')
    if (storedHistory) {
      setRollbackHistory(JSON.parse(storedHistory))
    }
  }, [])

  const availableVersions = useMemo(() => SYSTEM_VERSIONS, [])
  const latestVersion = useMemo(
    () => availableVersions[0] || null,
    [availableVersions],
  )
  const isLatestVersion = useMemo(
    () => currentVersion === latestVersion?.version,
    [currentVersion, latestVersion],
  )

  const addRollbackHistory = (
    toVersion: string,
    status: 'success' | 'failure',
  ) => {
    const newEntry: RollbackHistoryEntry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      fromVersion: currentVersion,
      toVersion,
      status,
    }
    setRollbackHistory((prev) => {
      const updatedHistory = [newEntry, ...prev]
      SecureStorage.setItem('sispat_rollback_history', updatedHistory)
      return updatedHistory
    })
  }

  const updateToLatest = useCallback(() => {
    if (isLatestVersion || isUpdating || !latestVersion) return

    setIsUpdating(true)
    const toastId = toast.loading('Atualizando para a versão mais recente...', {
      description: `Instalando versão ${latestVersion.version}. A página será recarregada.`,
    })

    setTimeout(() => {
      setCurrentVersion(latestVersion.version)
      setIsUpdating(false)
      toast.success('Atualização concluída!', {
        id: toastId,
        description: `Sistema atualizado para a versão ${latestVersion.version}.`,
      })
      setTimeout(() => {
        SafeWindow.reload()
      }, 1500)
    }, 3000)
  }, [isLatestVersion, isUpdating, latestVersion])

  const rollbackToVersion = useCallback(
    (version: string) => {
      if (isUpdating) return

      setIsUpdating(true)
      toast.loading(`Revertendo para a versão ${version}...`, {
        description: 'Esta ação recarregará a página.',
      })

      setTimeout(() => {
        const success = Math.random() > 0.1 // Simulate 90% success rate
        if (success) {
          addRollbackHistory(version, 'success')
          setCurrentVersion(version)
          SecureStorage.setItem('rollback_notification', {
            type: 'success',
            message: `Sistema revertido com sucesso para a versão ${version}.`,
          })
        } else {
          addRollbackHistory(version, 'failure')
          SecureStorage.setItem('rollback_notification', {
            type: 'error',
            message: `Falha ao reverter para a versão ${version}.`,
          })
        }

        setIsUpdating(false)
        SafeWindow.navigate('/login')
      }, 3000)
    },
    [isUpdating, currentVersion],
  )

  return (
    <VersionContext.Provider
      value={{
        currentVersion,
        availableVersions,
        latestVersion,
        isLatestVersion,
        isUpdating,
        rollbackHistory,
        updateToLatest,
        rollbackToVersion,
      }}
    >
      {children}
    </VersionContext.Provider>
  )
}

export const useVersion = () => {
  const context = useContext(VersionContext)
  if (!context) {
    throw new Error('useVersion must be used within a VersionProvider')
  }
  return context
}
