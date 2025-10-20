import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { 
  Mail, 
  Settings, 
  TestTube, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  Save
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/services/api-adapter'

const emailConfigSchema = z.object({
  host: z.string().min(1, 'Host é obrigatório'),
  port: z.number().min(1, 'Porta deve ser maior que 0').max(65535, 'Porta deve ser menor que 65536'),
  secure: z.boolean().default(false),
  user: z.string().email('Email do usuário deve ser válido'),
  password: z.string().min(1, 'Senha é obrigatória'),
  fromAddress: z.string().email('Endereço de origem deve ser um email válido'),
  enabled: z.boolean().default(false),
})

type EmailConfigFormValues = z.infer<typeof emailConfigSchema>

interface EmailConfig {
  id: string
  host: string
  port: number
  secure: boolean
  user: string
  fromAddress: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}

interface EmailConfigResponse {
  configured: boolean
  enabled: boolean
  config?: EmailConfig
}

export default function EmailConfig() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [emailConfig, setEmailConfig] = useState<EmailConfigResponse | null>(null)
  const [testEmail, setTestEmail] = useState('')

  const form = useForm<EmailConfigFormValues>({
    resolver: zodResolver(emailConfigSchema),
    defaultValues: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      user: '',
      password: '',
      fromAddress: '',
      enabled: false,
    },
  })

  // Carregar configuração atual
  useEffect(() => {
    loadEmailConfig()
  }, [])

  const loadEmailConfig = async () => {
    try {
      setIsLoading(true)
      const response = await api.get<EmailConfigResponse>('/email-config')
      setEmailConfig(response)
      
      if (response.config) {
        form.reset({
          host: response.config.host,
          port: response.config.port,
          secure: response.config.secure,
          user: response.config.user,
          password: '', // Não carregar senha por segurança
          fromAddress: response.config.fromAddress,
          enabled: response.config.enabled,
        })
      }
    } catch (error) {
      console.error('Erro ao carregar configuração de email:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao carregar configuração de email.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: EmailConfigFormValues) => {
    try {
      setIsLoading(true)
      
      const response = await api.put('/email-config', data)
      
      toast({
        title: 'Sucesso',
        description: 'Configuração de email salva com sucesso.',
      })
      
      // Recarregar configuração
      await loadEmailConfig()
    } catch (error) {
      console.error('Erro ao salvar configuração:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao salvar configuração de email.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      toast({
        variant: 'destructive',
        title: 'Email inválido',
        description: 'Digite um email válido para teste.',
      })
      return
    }

    try {
      setIsTesting(true)
      
      await api.post('/email-config/test', { email: testEmail })
      
      toast({
        title: 'Email de teste enviado',
        description: `Email de teste enviado para ${testEmail}. Verifique sua caixa de entrada.`,
      })
      
      setTestEmail('')
    } catch (error) {
      console.error('Erro ao enviar email de teste:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao enviar email de teste.',
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleDeleteConfig = async () => {
    try {
      setIsDeleting(true)
      
      await api.delete('/email-config')
      
      toast({
        title: 'Configuração desabilitada',
        description: 'Configuração de email foi desabilitada.',
      })
      
      // Recarregar configuração
      await loadEmailConfig()
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Erro ao desabilitar configuração:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao desabilitar configuração de email.',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusBadge = () => {
    if (!emailConfig?.configured) {
      return <Badge variant="secondary">Não Configurado</Badge>
    }
    
    if (emailConfig.enabled) {
      return <Badge variant="default" className="bg-green-600">Ativo</Badge>
    }
    
    return <Badge variant="destructive">Desabilitado</Badge>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configuração de Email</h1>
          <p className="text-muted-foreground">
            Configure o serviço de email para envio de notificações e recuperação de senha
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
        </div>
      </div>

      {/* Status da Configuração */}
      {emailConfig?.configured && (
        <Alert>
          <Mail className="h-4 w-4" />
          <AlertTitle>Configuração de Email</AlertTitle>
          <AlertDescription>
            {emailConfig.enabled ? (
              <>
                <CheckCircle className="inline h-4 w-4 text-green-600 mr-1" />
                Serviço de email ativo e funcionando. Emails podem ser enviados.
              </>
            ) : (
              <>
                <XCircle className="inline h-4 w-4 text-red-600 mr-1" />
                Serviço de email desabilitado. Emails não serão enviados.
              </>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações do Servidor SMTP
          </CardTitle>
          <CardDescription>
            Configure as credenciais do seu provedor de email (Gmail, Outlook, SendGrid, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="host"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Host SMTP</FormLabel>
                      <FormControl>
                        <Input placeholder="smtp.gmail.com" {...field} />
                      </FormControl>
                      <FormDescription>
                        Servidor SMTP do seu provedor de email
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="port"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Porta</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="587" 
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Porta do servidor SMTP (587 para TLS, 465 para SSL)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="user"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email de Usuário</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="seu-email@gmail.com" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Email usado para autenticação no servidor SMTP
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type={showPassword ? "text" : "password"}
                            placeholder="Sua senha ou senha de app" 
                            {...field} 
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Senha do email ou senha de aplicativo (para Gmail)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="fromAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Endereço de Origem</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="SISPAT <noreply@seudominio.com>" 
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Email que aparecerá como remetente nos emails enviados
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center space-x-2">
                <FormField
                  control={form.control}
                  name="secure"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Conexão Segura (SSL)</FormLabel>
                        <FormDescription>
                          Ativar para usar SSL/TLS seguro (porta 465)
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <Separator />

              <div className="flex items-center space-x-2">
                <FormField
                  control={form.control}
                  name="enabled"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Habilitar Serviço de Email</FormLabel>
                        <FormDescription>
                          Ativar para permitir envio de emails pelo sistema
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-between">
                <div className="flex gap-2">
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Configuração
                  </Button>

                  {emailConfig?.configured && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Desabilitar
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Teste de Email */}
      {emailConfig?.configured && emailConfig.enabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Teste de Configuração
            </CardTitle>
            <CardDescription>
              Envie um email de teste para verificar se a configuração está funcionando
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Digite um email para teste"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
              <Button
                onClick={handleTestEmail}
                disabled={isTesting || !testEmail}
              >
                {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <TestTube className="mr-2 h-4 w-4" />
                Enviar Teste
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Guia de Configuração */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Guia de Configuração
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Gmail</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Host: smtp.gmail.com</li>
              <li>• Porta: 587 (TLS) ou 465 (SSL)</li>
              <li>• Usar senha de aplicativo em vez da senha normal</li>
              <li>• Ativar "Acesso de aplicativo menos seguro" se necessário</li>
            </ul>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold mb-2">Outlook/Hotmail</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Host: smtp-mail.outlook.com</li>
              <li>• Porta: 587</li>
              <li>• Secure: false</li>
            </ul>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold mb-2">SendGrid</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Host: smtp.sendgrid.net</li>
              <li>• Porta: 587</li>
              <li>• User: apikey</li>
              <li>• Password: sua chave API do SendGrid</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desabilitar Configuração de Email</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja desabilitar o serviço de email? 
              Isso impedirá o envio de emails de recuperação de senha e notificações.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfig}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Desabilitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
