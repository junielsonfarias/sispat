import { useState } from 'react'
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
import { Download, History, Loader2, Info } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { toast } from '@/hooks/use-toast'
import { api } from '@/services/api-adapter'
import type { Patrimonio } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { useSectors } from '@/contexts/SectorContext'
import { useLocais } from '@/contexts/LocalContext'
import { MUNICIPALITY_NAME } from '@/config/municipality'
import { format } from 'date-fns'

interface BackupHistory {
  date: Date
  user: string
  fileSize: string
}

export default function BackupSettings() {
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [backupHistory, setBackupHistory] = useState<BackupHistory[]>([])

  const { user, users } = useAuth()
  const { sectors } = useSectors()
  const { locais } = useLocais()

  const createBackup = async () => {
    if (!user) return
    setIsBackingUp(true)
    try {
      // Busca o conjunto COMPLETO sob demanda (o contexto não carrega mais tudo
      // no login). Sem isto, o backup sairia vazio.
      const resp = await api.get<{ patrimonios: Patrimonio[] }>('/patrimonios?all=true')
      const patrimonios = Array.isArray(resp) ? resp : (resp.patrimonios ?? [])
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
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Restauração indisponível</AlertTitle>
            <AlertDescription>
              A restauração a partir de um arquivo ainda não está disponível.
              Para evitar perda ou troca acidental de dados entre municípios,
              ela só será habilitada quando a restauração com persistência no
              servidor (e validação de município) estiver implementada.
            </AlertDescription>
          </Alert>
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
