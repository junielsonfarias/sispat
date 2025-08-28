import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Key, Plus, Eye, EyeOff, Copy, Trash2, RefreshCw, AlertTriangle,
  CheckCircle, Clock, Activity, Shield, Globe, Database
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ApiKey {
  id: string
  name: string
  permissions: string[]
  is_active: boolean
  rate_limit_per_hour: number
  created_at: string
  last_used_at: string | null
  expires_at: string | null
  description: string | null
}

interface NewApiKey {
  id: string
  name: string
  apiKey: string
  created_at: string
}

export const ApiKeyManager: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [newApiKey, setNewApiKey] = useState<NewApiKey | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showNewKey, setShowNewKey] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [showApiKey, setShowApiKey] = useState<string | null>(null)
  const { user } = useAuth()

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
    rateLimitPerHour: 1000
  })

  useEffect(() => {
    fetchApiKeys()
  }, [])

  const fetchApiKeys = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/auth/api-keys', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setApiKeys(data.data)
      }
    } catch (error) {
      console.error('Erro ao buscar API keys:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao carregar API keys'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const createApiKey = async () => {
    try {
      setIsCreating(true)
      const response = await fetch('/api/auth/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data = await response.json()
        setNewApiKey(data.data)
        setShowNewKey(true)
        setFormData({
          name: '',
          description: '',
          permissions: [],
          rateLimitPerHour: 1000
        })
        fetchApiKeys()
        
        toast({
          title: 'API Key Criada',
          description: 'Nova API key criada com sucesso'
        })
      }
    } catch (error) {
      console.error('Erro ao criar API key:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao criar API key'
      })
    } finally {
      setIsCreating(false)
    }
  }

  const revokeApiKey = async (apiKeyId: string) => {
    if (!confirm('Tem certeza que deseja revogar esta API key? Esta ação não pode ser desfeita.')) {
      return
    }

    try {
      const response = await fetch(`/api/auth/api-keys/${apiKeyId}/revoke`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        toast({
          title: 'API Key Revogada',
          description: 'API key foi revogada com sucesso'
        })
        fetchApiKeys()
      }
    } catch (error) {
      console.error('Erro ao revogar API key:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao revogar API key'
      })
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: 'Copiado',
        description: 'API key copiada para a área de transferência'
      })
    } catch (error) {
      console.error('Erro ao copiar:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao copiar API key'
      })
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca'
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: ptBR })
  }

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'read': return <Eye className="h-4 w-4" />
      case 'write': return <Plus className="h-4 w-4" />
      case 'admin': return <Shield className="h-4 w-4" />
      case 'public': return <Globe className="h-4 w-4" />
      default: return <Database className="h-4 w-4" />
    }
  }

  const getPermissionColor = (permission: string) => {
    switch (permission) {
      case 'read': return 'default'
      case 'write': return 'secondary'
      case 'admin': return 'destructive'
      case 'public': return 'outline'
      default: return 'default'
    }
  }

  const availablePermissions = [
    { value: 'read', label: 'Leitura', description: 'Acesso de leitura aos dados públicos' },
    { value: 'write', label: 'Escrita', description: 'Acesso de escrita (requer aprovação)' },
    { value: 'admin', label: 'Administrador', description: 'Acesso completo ao sistema' },
    { value: 'public', label: 'Público', description: 'Acesso apenas a dados públicos' }
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Carregando API keys...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar API Keys</h1>
          <p className="text-muted-foreground">
            Crie e gerencie suas chaves de API para integração externa
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova API Key
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Criar Nova API Key</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Nome da API Key</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Integração Sistema Municipal"
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva o propósito desta API key"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="permissions">Permissões</Label>
                <Select
                  value={formData.permissions[0] || ''}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, permissions: [value] }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione as permissões" />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePermissions.map((permission) => (
                      <SelectItem key={permission.value} value={permission.value}>
                        <div className="flex items-center gap-2">
                          {getPermissionIcon(permission.value)}
                          <div>
                            <div className="font-medium">{permission.label}</div>
                            <div className="text-sm text-muted-foreground">{permission.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="rateLimit">Rate Limit (requisições/hora)</Label>
                <Input
                  id="rateLimit"
                  type="number"
                  value={formData.rateLimitPerHour}
                  onChange={(e) => setFormData(prev => ({ ...prev, rateLimitPerHour: parseInt(e.target.value) }))}
                  min="1"
                  max="10000"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setFormData({
                  name: '',
                  description: '',
                  permissions: [],
                  rateLimitPerHour: 1000
                })}>
                  Cancelar
                </Button>
                <Button 
                  onClick={createApiKey} 
                  disabled={!formData.name || isCreating}
                >
                  {isCreating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Key className="h-4 w-4 mr-2" />
                      Criar API Key
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Nova API Key Modal */}
      {newApiKey && (
        <Dialog open={showNewKey} onOpenChange={setShowNewKey}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>API Key Criada com Sucesso</DialogTitle>
            </DialogHeader>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Guarde esta API key em um local seguro. Ela não será exibida novamente.
              </AlertDescription>
            </Alert>
            <div className="space-y-4">
              <div>
                <Label>Nome</Label>
                <p className="font-medium">{newApiKey.name}</p>
              </div>
              <div>
                <Label>API Key</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={newApiKey.apiKey}
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(newApiKey.apiKey)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setShowNewKey(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Suas API Keys ({apiKeys.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="text-center py-8">
              <Key className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhuma API key criada ainda</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Permissões</TableHead>
                  <TableHead>Rate Limit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último Uso</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((apiKey) => (
                  <TableRow key={apiKey.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{apiKey.name}</p>
                        {apiKey.description && (
                          <p className="text-sm text-muted-foreground">{apiKey.description}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {apiKey.permissions.map((permission) => (
                          <Badge key={permission} variant={getPermissionColor(permission)}>
                            {getPermissionIcon(permission)}
                            <span className="ml-1">{permission}</span>
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        {apiKey.rate_limit_per_hour}/h
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={apiKey.is_active ? 'default' : 'secondary'}>
                        {apiKey.is_active ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Ativa
                          </>
                        ) : (
                          <>
                            <Clock className="h-4 w-4 mr-1" />
                            Revogada
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(apiKey.last_used_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(apiKey.created_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {apiKey.is_active && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => revokeApiKey(apiKey.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Segurança:</strong> Mantenha suas API keys seguras e nunca as compartilhe. 
          Use rate limiting apropriado e revogue keys que não estão mais sendo usadas.
        </AlertDescription>
      </Alert>
    </div>
  )
}
