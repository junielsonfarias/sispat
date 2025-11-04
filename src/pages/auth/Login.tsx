import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  AlertCircle,
  Search,
  ExternalLink,
  Shield,
  Building2,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  useCustomization,
  CustomizationSettings,
} from '@/contexts/CustomizationContext'
import { Toaster } from '@/components/ui/toaster'
import { useVersion } from '@/contexts/VersionContext'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Container } from '@/components/ui/responsive-container'

const loginSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um e-mail válido.' }),
  password: z.string().min(1, { message: 'Senha é obrigatória.' }),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function Login() {
  const { login, isAuthenticated, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [successMessage] = useState<string | null>(
    location.state?.successMessage,
  )
  const [sessionExpired] = useState<boolean>(location.state?.sessionExpired)
  const { settings } = useCustomization()
  const { currentVersion } = useVersion()
  
  // ✅ CORREÇÃO: useRef para rastrear se componente está montado
  const isMountedRef = useRef(true)
  // ✅ CORREÇÃO: Estado para controlar renderização do Toaster (evita conflitos de DOM)
  const [shouldRenderToaster, setShouldRenderToaster] = useState(true)

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  useEffect(() => {
    isMountedRef.current = true
    setShouldRenderToaster(true)
    
    return () => {
      // ✅ CORREÇÃO: Desativar Toaster antes de desmontar para evitar conflitos de DOM
      setShouldRenderToaster(false)
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    // ✅ CORREÇÃO: Verificar se está autenticado e componente ainda montado
    if (isAuthenticated && isMountedRef.current) {
      // ✅ CORREÇÃO: Desativar Toaster antes de navegar para evitar conflitos de DOM
      setShouldRenderToaster(false)
      const destination = user?.role === 'superuser' ? '/superuser' : '/'
      // ✅ CORREÇÃO: Usar setTimeout com delay mínimo para evitar conflitos de DOM
      const timeoutId = setTimeout(() => {
        if (isMountedRef.current) {
          try {
            navigate(destination, { replace: true })
          } catch (err) {
            // Ignorar erros de navegação se componente foi desmontado
            console.warn('Navigation error (component unmounted):', err)
          }
        }
      }, 50)
      
      return () => {
        clearTimeout(timeoutId)
      }
    }
  }, [isAuthenticated, user, navigate])

  const onSubmit = async (data: LoginFormValues) => {
    if (!isMountedRef.current) return
    
    setIsLoading(true)
    setError(null)
    try {
      await login(data.email, data.password)
      // ✅ CORREÇÃO: Verificar se ainda está montado após login
      if (!isMountedRef.current) return
    } catch (e) {
      if (!isMountedRef.current) return
      
      const errorMessage =
        e instanceof Error
          ? e.message
          : 'Ocorreu um erro ao tentar fazer login. Tente novamente.'
      setError(errorMessage)
      // ✅ CORREÇÃO: Verificar antes de resetar campo
      if (isMountedRef.current) {
        try {
          form.resetField('password')
        } catch (err) {
          // Ignorar erros se formulário foi desmontado
          console.warn('Form reset error (component unmounted):', err)
        }
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }

  const backgroundStyle =
    settings.backgroundType === 'image' && settings.backgroundImageUrl
      ? {
          backgroundImage: `url(${settings.backgroundImageUrl})`,
        }
      : {}


  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={backgroundStyle}
    >
      {/* Modern Gradient Overlay - Better contrast */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-blue-900/90 to-indigo-900/95" />
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400/15 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>
      
      <Container size="lg" padding="lg" className="relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left Side - Branding */}
          <div className="text-center lg:text-left space-y-6 lg:space-y-8">
            {/* Logo and Title - Centered */}
            <div className="space-y-4 lg:space-y-6 text-center lg:text-left">
              <div className="flex flex-col items-center lg:items-start space-y-3 lg:space-y-4">
                <div className="relative">
                  <img
                    src={settings.activeLogoUrl}
                    alt="Logo"
                    className="h-28 sm:h-32 lg:h-48 w-auto mx-auto img-responsive drop-shadow-2xl"
                  />
                  <div className="absolute inset-0 bg-white/10 rounded-full blur-xl" />
                </div>
                
                <div className="space-y-3 lg:space-y-4">
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight drop-shadow-lg">
                    {settings.welcomeTitle || 'SISPAT'}
                  </h1>
                  <p className="text-lg sm:text-xl text-blue-50 leading-relaxed max-w-md mx-auto lg:mx-0 drop-shadow-md">
                    {settings.welcomeSubtitle || 'Sistema Integrado de Patrimônio Municipal'}
                  </p>
                </div>
              </div>
            </div>

            {/* Features - Hidden on mobile, shown on desktop */}
            <div className="hidden lg:block">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4 max-w-lg mx-auto lg:mx-0">
                <div className="flex items-center justify-center lg:justify-start gap-3 text-blue-50">
                  <div className="p-2 bg-white/15 rounded-lg backdrop-blur-sm">
                    <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium drop-shadow-sm">Seguro e Confiável</span>
                </div>
                <div className="flex items-center justify-center lg:justify-start gap-3 text-blue-50">
                  <div className="p-2 bg-white/15 rounded-lg backdrop-blur-sm">
                    <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium drop-shadow-sm">Gestão Municipal</span>
                </div>
              </div>

              {/* Public Consultation Link - Desktop */}
              <div className="pt-6 lg:pt-8">
                <Link
                  to="/consulta-publica"
                  className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-white/15 hover:bg-white/25 text-white rounded-lg border border-white/30 transition-all duration-300 hover:scale-105 hover:shadow-lg backdrop-blur-sm drop-shadow-md text-sm sm:text-base"
                >
                  <Search className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="font-medium">Consulta Pública</span>
                  <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                </Link>
                <p className="text-blue-50 text-xs sm:text-sm mt-2 drop-shadow-sm">
                  Acesse informações públicas sobre o patrimônio municipal
                </p>
              </div>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full max-w-md mx-auto lg:mx-0 px-4 sm:px-0">
            <Card className="backdrop-blur-xl bg-white/95 border-white/20 shadow-2xl">
              <CardHeader className="space-y-2 text-center pb-4 sm:pb-6 px-4 sm:px-6">
                <CardTitle className="text-xl sm:text-2xl font-bold text-gray-900">
                  Acesso ao Sistema
                </CardTitle>
                <CardDescription className="text-sm sm:text-base text-gray-600">
                  Digite suas credenciais para continuar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
                {/* Success Message */}
                {successMessage && (
                  <Alert className="border-green-200 bg-green-50 text-green-800">
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Sucesso!</AlertTitle>
                    <AlertDescription>{successMessage}</AlertDescription>
                  </Alert>
                )}

                {/* Session Expired Message */}
                {sessionExpired && (
                  <Alert className="border-yellow-200 bg-yellow-50 text-yellow-800">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Sessão Expirada</AlertTitle>
                    <AlertDescription>
                      Sua sessão expirou. Por favor, faça login novamente.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Error Message */}
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erro</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Login Form */}
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                    {/* Email Field */}
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 font-medium flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-500" />
                            E-mail
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="seu@email.com"
                              className="h-10 sm:h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 text-sm sm:text-base"
                              type="email"
                              autoComplete="email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Password Field */}
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 font-medium flex items-center gap-2">
                            <Lock className="h-4 w-4 text-gray-500" />
                            Senha
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                placeholder="Digite sua senha"
                                className="pr-12 h-10 sm:h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500 text-sm sm:text-base"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="current-password"
                                {...field}
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-gray-100"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <Eye className="h-4 w-4 text-gray-400" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Submit Button */}
                    <Button
                      type="submit"
                      className="w-full h-10 sm:h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium transition-all duration-300 hover:shadow-lg text-sm sm:text-base"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Entrando...
                        </>
                      ) : (
                        'Entrar no Sistema'
                      )}
                    </Button>
                  </form>
                </Form>

                {/* Links */}
                <div className="text-center space-y-3 sm:space-y-4 pt-3 sm:pt-4">
                  <Link
                    to="/forgot-password"
                    className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                  >
                    Esqueceu sua senha?
                  </Link>
                  
                  <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                    <Shield className="h-3 w-3" />
                    <span>SISPAT v{currentVersion}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mobile Features and Consultation Link - Below form */}
            <div className="lg:hidden mt-6 space-y-6">
              {/* Features */}
              <div className="grid grid-cols-1 gap-3 max-w-lg mx-auto">
                <div className="flex items-center justify-center gap-3 text-blue-50">
                  <div className="p-2 bg-white/15 rounded-lg backdrop-blur-sm">
                    <Shield className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-medium drop-shadow-sm">Seguro e Confiável</span>
                </div>
                <div className="flex items-center justify-center gap-3 text-blue-50">
                  <div className="p-2 bg-white/15 rounded-lg backdrop-blur-sm">
                    <Building2 className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-medium drop-shadow-sm">Gestão Municipal</span>
                </div>
              </div>

              {/* Public Consultation Link - Mobile */}
              <div className="text-center">
                <Link
                  to="/consulta-publica"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white/15 hover:bg-white/25 text-white rounded-lg border border-white/30 transition-all duration-300 hover:scale-105 hover:shadow-lg backdrop-blur-sm drop-shadow-md"
                >
                  <Search className="h-5 w-5" />
                  <span className="font-medium">Consulta Pública</span>
                  <ExternalLink className="h-4 w-4" />
                </Link>
                <p className="text-blue-50 text-sm mt-2 drop-shadow-sm">
                  Acesse informações públicas sobre o patrimônio municipal
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 sm:mt-12 text-blue-50 text-xs sm:text-sm drop-shadow-sm px-4">
          <p>{settings.loginFooterText || 'Sistema de Gestão de Patrimônio Municipal'}</p>
        </div>
              </Container>
        
      {/* ✅ CORREÇÃO: Renderizar Toaster apenas quando componente estiver montado */}
      {shouldRenderToaster && <Toaster />}
      </div>
    )
  }
