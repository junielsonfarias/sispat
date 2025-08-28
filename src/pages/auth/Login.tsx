import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  CheckCircle,
  History,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  useCustomization,
  CustomizationSettings,
} from '@/contexts/CustomizationContext'
import { useMunicipalities } from '@/contexts/MunicipalityContext'
import {
  SearchableSelect,
  SearchableSelectOption,
} from '@/components/ui/searchable-select'
import { Toaster } from '@/components/ui/toaster'
import { useToast } from '@/hooks/use-toast'
import { useVersion } from '@/contexts/VersionContext'
import { toast as sonnerToast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Badge } from '@/components/ui/badge'

const loginSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
  password: z.string().min(1, { message: 'Senha é obrigatória.' }),
  rememberMe: z.boolean().default(false),
  isSuperUser: z.boolean().default(false),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function Login() {
  const { login, isAuthenticated, user } = useAuth()
  const { getSettingsForMunicipality } = useCustomization()
  const { municipalities, isLoading: isLoadingMunicipalities } =
    useMunicipalities()
  
  console.log('Login component - municipalities:', municipalities)
  console.log('Login component - isLoadingMunicipalities:', isLoadingMunicipalities)
  const { rollbackHistory, currentVersion } = useVersion()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(
    location.state?.successMessage,
  )
  const [sessionExpired, setSessionExpired] = useState<boolean>(
    location.state?.sessionExpired,
  )
  const [selectedMunicipalityId, setSelectedMunicipalityId] = useState<
    string | null
  >(null)
  const [settings, setSettings] = useState<CustomizationSettings>(
    getSettingsForMunicipality(null),
  )

  const municipalityOptions: SearchableSelectOption[] = useMemo(() => {
    console.log('Municipalities in login:', municipalities)
    if (!Array.isArray(municipalities)) {
      console.log('Municipalities is not an array:', municipalities)
      return []
    }
    const options = municipalities.map((m) => ({
      value: m.id,
      label: m.name,
    }))
    console.log('Municipality options:', options)
    return options
  }, [municipalities])

  console.log('Login component - municipalityOptions:', municipalityOptions)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: localStorage.getItem('sispat_remembered_email') || '',
      password: '',
      rememberMe: !!localStorage.getItem('sispat_remembered_email'),
      isSuperUser: false,
    },
  })

  const isSuperUser = form.watch('isSuperUser')

  useEffect(() => {
    const notification = sessionStorage.getItem('rollback_notification')
    if (notification) {
      const { type, message } = JSON.parse(notification)
      if (type === 'success') {
        sonnerToast.success('Reversão Concluída', { description: message })
      } else {
        sonnerToast.error('Falha na Reversão', { description: message })
      }
      sessionStorage.removeItem('rollback_notification')
    }
  }, [])

  useEffect(() => {
    setSettings(getSettingsForMunicipality(selectedMunicipalityId))
  }, [selectedMunicipalityId, getSettingsForMunicipality])

  useEffect(() => {
    if (isAuthenticated) {
      const destination = user?.role === 'superuser' ? '/superuser' : '/'
      navigate(destination, { replace: true })
    }
  }, [isAuthenticated, user, navigate])

  useEffect(() => {
    const clearMessages = () => {
      if (successMessage) {
        setSuccessMessage(null)
      }
      if (sessionExpired) {
        setSessionExpired(false)
      }
      if (successMessage || sessionExpired) {
        navigate(location.pathname, { replace: true, state: {} })
      }
    }
    const timer = setTimeout(clearMessages, 5000)
    return () => clearTimeout(timer)
  }, [successMessage, sessionExpired, location.pathname, navigate])

  const onSubmit = async (data: LoginFormValues) => {
    if (!data.isSuperUser && !selectedMunicipalityId) {
      setError('Por favor, selecione um município.')
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      if (data.rememberMe) {
        localStorage.setItem('sispat_remembered_email', data.email)
      } else {
        localStorage.removeItem('sispat_remembered_email')
      }

      const loggedInUser = await login(
        data.email,
        data.password,
        data.isSuperUser ? null : selectedMunicipalityId,
        data.rememberMe,
      )

      toast({
        title: `Bem-vindo(a) de volta, ${loggedInUser.name.split(' ')[0]}!`,
        description: 'Você será redirecionado em breve.',
      })

      setTimeout(() => {
        const destination =
          loggedInUser.role === 'superuser' ? '/superuser' : '/'
        navigate(destination, { replace: true })
      }, 1500)
    } catch (e) {
      const errorMessage =
        e instanceof Error
          ? e.message
          : 'Ocorreu um erro ao tentar fazer login. Tente novamente.'
      setError(errorMessage)
      form.resetField('password')
    } finally {
      setIsLoading(false)
    }
  }

  const backgroundStyle =
    settings.backgroundType === 'image' && settings.backgroundImageUrl
      ? {
          backgroundImage: `url(${settings.backgroundImageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : { backgroundColor: settings.backgroundColor }

  return (
    <>
      <Toaster />
      <div
        style={{ fontFamily: settings.fontFamily }}
        className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50"
      >
        <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
          {/* Lado esquerdo - Formulário */}
          <div className="flex items-center justify-center py-12 relative">
            <div className="mx-auto grid w-[400px] gap-8">
              {/* Header com logo */}
              <div className="grid gap-4 text-center">
                <div className="w-24 h-24 bg-white rounded-2xl p-4 shadow-xl mx-auto mb-6">
                  <img
                    src={settings.activeLogoUrl}
                    alt="Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <h1 className="text-4xl font-bold text-gray-800">{settings.welcomeTitle}</h1>
                <p className="text-lg text-gray-600">
                  {settings.welcomeSubtitle}
                </p>
              </div>

              {/* Card do formulário */}
              <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
                <CardContent className="p-8">
                  <Form {...form}>
                    <form
                      onSubmit={form.handleSubmit(onSubmit)}
                      className="grid gap-6"
                    >
                      {successMessage && (
                        <Alert
                          variant="default"
                          className="bg-green-50 border-green-200"
                        >
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <AlertTitle className="text-green-800">
                            Sucesso!
                          </AlertTitle>
                          <AlertDescription className="text-green-700">
                            {successMessage}
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      {sessionExpired && (
                        <Alert className="bg-orange-50 border-orange-200">
                          <AlertCircle className="h-4 w-4 text-orange-600" />
                          <AlertTitle className="text-orange-800">Sessão Expirada</AlertTitle>
                          <AlertDescription className="text-orange-700">
                            Sua sessão expirou por inatividade. Faça login novamente.
                          </AlertDescription>
                        </Alert>
                      )}

                      {!isSuperUser && (
                        <div className="grid gap-3">
                          <FormLabel className="text-sm font-semibold text-gray-700">Município</FormLabel>
                          {isLoadingMunicipalities ? (
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Carregando municípios...
                            </div>
                          ) : municipalityOptions.length === 0 ? (
                            <div className="text-sm text-gray-500">Nenhum município encontrado</div>
                          ) : (
                            <SearchableSelect
                              options={municipalityOptions}
                              value={selectedMunicipalityId}
                              onChange={setSelectedMunicipalityId}
                              placeholder="Selecione o município"
                              disabled={isLoadingMunicipalities}
                            />
                          )}
                        </div>
                      )}

                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-gray-700">Email</FormLabel>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                              <FormControl>
                                <Input
                                  placeholder="seu@email.com"
                                  {...field}
                                  className="pl-10 h-12 text-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                  disabled={!isSuperUser && !selectedMunicipalityId}
                                />
                              </FormControl>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex items-center justify-between">
                              <FormLabel className="text-sm font-semibold text-gray-700">Senha</FormLabel>
                              <Link
                                to="/esqueci-minha-senha"
                                className="text-sm text-blue-600 hover:text-blue-700 underline"
                              >
                                Esqueceu a senha?
                              </Link>
                            </div>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                              <FormControl>
                                <Input
                                  type={showPassword ? 'text' : 'password'}
                                  {...field}
                                  className="pl-10 pr-10 h-12 text-lg border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                  disabled={!isSuperUser && !selectedMunicipalityId}
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-gray-100"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {error && (
                        <Alert className="bg-red-50 border-red-200">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <AlertTitle className="text-red-800">Erro de Autenticação</AlertTitle>
                          <AlertDescription className="text-red-700">{error}</AlertDescription>
                        </Alert>
                      )}

                      <Button
                        type="submit"
                        className="w-full h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                        disabled={
                          isLoading || (!isSuperUser && !selectedMunicipalityId)
                        }
                      >
                        {isLoading && (
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        )}
                        Entrar no Sistema
                      </Button>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <FormField
                          control={form.control}
                          name="rememberMe"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={!isSuperUser && !selectedMunicipalityId}
                                  className="border-gray-300"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm text-gray-600">Lembrar-me</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="isSuperUser"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  className="border-gray-300"
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm text-gray-600">Superusuário</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>

              {/* Link para consulta pública */}
              <div className="text-center">
                <Link 
                  to="/consulta-publica" 
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
                >
                  <span>🔍</span>
                  Acessar Consulta Pública
                </Link>
              </div>
            </div>

            {/* Footer */}
            <footer className="absolute bottom-6 left-0 right-0 text-center">
              <p className="text-sm text-gray-500 mb-1">{settings.loginFooterText}</p>
              <p className="text-xs text-gray-400">Versão: {currentVersion}</p>
            </footer>
          </div>

          {/* Lado direito - Background */}
          <div
            className="hidden lg:flex items-center justify-center p-12 relative overflow-hidden"
            style={backgroundStyle}
          >
            {settings.backgroundType === 'video' &&
              settings.backgroundVideoUrl && (
                <video
                  key={settings.backgroundVideoUrl}
                  loop={settings.videoLoop}
                  muted={settings.videoMuted}
                  autoPlay
                  playsInline
                  className="absolute top-0 left-0 w-full h-full object-cover"
                >
                  <source src={settings.backgroundVideoUrl} />
                </video>
              )}

            {/* Overlay gradiente para melhor contraste */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-black/40"></div>

            {/* Card de histórico de rollbacks */}
            {rollbackHistory.length > 0 && (
              <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-2xl border-0 relative z-10">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                  <CardTitle className="flex items-center text-gray-800">
                    <History className="mr-2 h-5 w-5 text-blue-600" />
                    Histórico de Rollbacks
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Últimas reversões de versão do sistema.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <ScrollArea className="h-64">
                    <ul className="space-y-4">
                      {rollbackHistory.map((entry) => (
                        <li key={entry.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                          <div>
                            <Badge
                              variant={
                                entry.status === 'success'
                                  ? 'default'
                                  : 'destructive'
                              }
                              className="capitalize"
                            >
                              {entry.status === 'success' ? 'Sucesso' : 'Falha'}
                            </Badge>
                          </div>
                          <div className="flex-1 text-sm">
                            <p className="font-medium text-gray-800">
                              Reversão de <strong>v{entry.fromVersion}</strong>{' '}
                              para <strong>v{entry.toVersion}</strong>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {format(
                                new Date(entry.timestamp),
                                "dd/MM/yyyy 'às' HH:mm:ss",
                                { locale: ptBR },
                              )}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
