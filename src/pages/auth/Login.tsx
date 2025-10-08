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
      className="min-h-screen flex items-center justify-center login-background relative"
      style={backgroundStyle}
    >
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-black/20" />
      
      <Container size="sm" padding="lg" className="relative z-10 w-full">
        <div className="w-full max-w-md mx-auto">
          {/* Logo */}
          <div className="text-center mb-8">
            <img
              src={settings.activeLogoUrl}
              alt="Logo"
              className="h-16 w-auto mx-auto mb-4 img-responsive"
            />
            <h1 className="text-2xl font-bold text-white mb-2 heading-responsive">
              {settings.welcomeTitle}
            </h1>
            <p className="text-white/80 text-responsive">
              {settings.welcomeSubtitle}
            </p>
          </div>

          {/* Login Form */}
          <Card className="backdrop-blur-sm bg-white/95 border-white/20 shadow-2xl">
            <CardHeader className="space-y-2 text-center">
              <CardTitle className="text-2xl font-bold text-center heading-responsive">
                Entrar
              </CardTitle>
              <CardDescription className="text-responsive">
                Digite suas credenciais para acessar o sistema
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
                        <FormLabel className="form-label-responsive">
                          <Mail className="h-4 w-4 inline mr-2" />
                          E-mail
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="seu@email.com"
                            className="form-input-responsive"
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
                        <FormLabel className="form-label-responsive">
                          <Lock className="h-4 w-4 inline mr-2" />
                          Senha
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              placeholder="Digite sua senha"
                              className="form-input-responsive pr-12"
                              type={showPassword ? 'text' : 'password'}
                              autoComplete="current-password"
                              {...field}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 touch-target"
                              onClick={() => setShowPassword(!showPassword)}
                              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
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
                    className="w-full"
                    loading={isLoading}
                    loadingText="Entrando..."
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      'Entrar'
                    )}
                  </Button>
                </form>
              </Form>

              {/* Links */}
              <div className="text-center space-y-4">
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline block"
                >
                  Esqueceu sua senha?
                </Link>
                
                <div className="text-xs text-muted-foreground">
                  SISPAT v{currentVersion}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center mt-8 text-white/80 text-sm">
            <p>{settings.loginFooterText}</p>
          </div>
        </div>
      </Container>
      
      <Toaster />
    </div>
  )
}