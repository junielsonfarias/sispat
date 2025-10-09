import { useState, useEffect } from 'react'
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

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  useEffect(() => {
    if (isAuthenticated) {
      const destination = user?.role === 'superuser' ? '/superuser' : '/'
      navigate(destination, { replace: true })
    }
  }, [isAuthenticated, user, navigate])

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true)
    setError(null)
    try {
      await login(data.email, data.password)
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
        }
      : {}

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={backgroundStyle}
    >
      {/* Modern Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/90 via-blue-800/80 to-indigo-900/90" />
      
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>
      
      <Container size="lg" padding="lg" className="relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - Branding */}
          <div className="text-center lg:text-left space-y-8">
            {/* Logo and Title */}
            <div className="space-y-6">
              <div className="flex justify-center lg:justify-start">
                <div className="relative">
                  <img
                    src={settings.activeLogoUrl}
                    alt="Logo"
                    className="h-20 w-auto mx-auto lg:mx-0 img-responsive drop-shadow-2xl"
                  />
                  <div className="absolute inset-0 bg-white/10 rounded-full blur-xl" />
                </div>
              </div>
              
              <div className="space-y-4">
                <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
                  {settings.welcomeTitle || 'SISPAT'}
                </h1>
                <p className="text-xl text-blue-100 leading-relaxed max-w-md mx-auto lg:mx-0">
                  {settings.welcomeSubtitle || 'Sistema Integrado de Patrimônio Municipal'}
                </p>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto lg:mx-0">
              <div className="flex items-center gap-3 text-blue-100">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-medium">Seguro e Confiável</span>
              </div>
              <div className="flex items-center gap-3 text-blue-100">
                <div className="p-2 bg-white/10 rounded-lg">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-medium">Gestão Municipal</span>
              </div>
            </div>

            {/* Public Consultation Link */}
            <div className="pt-8">
              <Link
                to="/consulta-publica"
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition-all duration-300 hover:scale-105 hover:shadow-lg backdrop-blur-sm"
              >
                <Search className="h-5 w-5" />
                <span className="font-medium">Consulta Pública</span>
                <ExternalLink className="h-4 w-4" />
              </Link>
              <p className="text-blue-200 text-sm mt-2">
                Acesse informações públicas sobre o patrimônio municipal
              </p>
            </div>
          </div>

          {/* Right Side - Login Form */}
          <div className="w-full max-w-md mx-auto lg:mx-0">
            <Card className="backdrop-blur-xl bg-white/95 border-white/20 shadow-2xl">
              <CardHeader className="space-y-2 text-center pb-6">
                <CardTitle className="text-2xl font-bold text-gray-900">
                  Acesso ao Sistema
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Digite suas credenciais para continuar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Email Field */}
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 font-medium">
                            E-mail
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input
                                placeholder="seu@email.com"
                                className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                                type="email"
                                autoComplete="email"
                                {...field}
                              />
                            </div>
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
                          <FormLabel className="text-gray-700 font-medium">
                            Senha
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input
                                placeholder="Digite sua senha"
                                className="pl-10 pr-12 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
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
                      className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium transition-all duration-300 hover:shadow-lg"
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
                <div className="text-center space-y-4 pt-4">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline transition-colors"
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
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-blue-200 text-sm">
          <p>{settings.loginFooterText || 'Sistema de Gestão de Patrimônio Municipal'}</p>
        </div>
      </Container>
      
      <Toaster />
    </div>
  )
}