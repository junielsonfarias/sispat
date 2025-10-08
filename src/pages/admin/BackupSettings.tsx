import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Download, Upload, History, Loader2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { useAuth } from '@/hooks/useAuth'
import { useSectors } from '@/contexts/SectorContext'
import { useLocais } from '@/contexts/LocalContext'
import { MUNICIPALITY_NAME } from '@/config/municipality'
import { format } from 'date-fns'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

interface BackupHistory {
  date: Date
  user: string
  fileSize: string
}

export default function BackupSettings() {
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [backupHistory, setBackupHistory] = useState<BackupHistory[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { patrimonios, setPatrimonios } = usePatrimonio()
  const { user, users } = useAuth()
  const { sectors, setSectors } = useSectors()
  const { locais, setLocais } = useLocais()

  const createBackup = () => {
    if (!user) return
    setIsBackingUp(true)
    try {
      const backupData = {
        patrimonios,
        users,
        sectors,
        locais,
        municipality: MUNICIPALITY_NAME,
        createdAt: new Date(),
      }
      const jsonString = JSON.stringify(backupData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sispat-backup-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setBackupHistory((prev) => [
        ...prev,
        {
          date: new Date(),
          user: user.name,
          fileSize: `${(blob.size / 1024).toFixed(2)} KB`,
        },
      ])
      toast({ description: 'Backup criado com sucesso.' })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao criar o backup.',
      })
    } finally {
      setIsBackingUp(false)
    }
  }

  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        if (
          !data.patrimonios ||
          !data.users ||
          !data.sectors ||
          !data.locais
        ) {
          throw new Error('Arquivo de backup inválido ou corrompido.')
        }
        setIsRestoring(true)
        setPatrimonios(data.patrimonios)
        // Note: In a real app, you'd need a setUsers in AuthContext
        // For this mock, we'll assume it exists for demonstration
        // setUsers(data.users);
        setSectors(data.sectors)
        setLocais(data.locais)
        toast({
          title: 'Sucesso!',
          description: 'Dados restaurados com sucesso a partir do backup.',
        })
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Erro na Restauração',
          description:
            error instanceof Error
              ? error.message
              : 'Falha ao processar o arquivo de backup.',
        })
      } finally {
        setIsRestoring(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/configuracoes">Configurações</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Backup e Restauração</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <h1 className="text-2xl font-bold">Backup e Restauração</h1>
      <Card>
        <CardHeader>
          <CardTitle>Backup dos Dados</CardTitle>
          <CardDescription>
            Crie um backup completo de todos os dados do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            É altamente recomendável realizar backups regularmente para garantir
            a segurança dos seus dados. O arquivo de backup conterá todos os
            bens, usuários, setores e configurações.
          </p>
          <Button onClick={createBackup} disabled={isBackingUp}>
            {isBackingUp ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isBackingUp ? 'Gerando...' : 'Criar Novo Backup'}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Restaurar a partir de um Backup</CardTitle>
          <CardDescription>
            Restaure o sistema a partir de um arquivo de backup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Atenção: A restauração substituirá todos os dados atuais do sistema.
            Esta ação não pode ser desfeita.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" disabled={isRestoring}>
                <Upload className="mr-2 h-4 w-4" /> Restaurar Backup
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Restauração</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja restaurar os dados? Todos os dados
                  atuais serão perdidos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => fileInputRef.current?.click()}
                >
                  Confirmar e Escolher Arquivo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".json"
            onChange={handleRestore}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Backups</CardTitle>
        </CardHeader>
        <CardContent>
          {backupHistory.length > 0 ? (
            <ul className="space-y-2">
              {backupHistory.map((item, index) => (
                <li
                  key={index}
                  className="flex justify-between items-center text-sm"
                >
                  <span>
                    {format(item.date, 'dd/MM/yyyy HH:mm')} - {item.user}
                  </span>
                  <span>{item.fileSize}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center justify-center text-muted-foreground h-24">
              <History className="mr-2 h-5 w-5" />
              <p>Nenhum backup realizado ainda.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
