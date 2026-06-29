import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  resetPasswordFormSchema,
  type ResetPasswordFormValues,
} from '@sispat/shared'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { PasswordInput } from '@/components/ui/password-input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Loader2, Lock } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useToast } from '@/hooks/use-toast'


export default function ResetPassword() {
  const { resetPassword, validateResetToken } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [userInfo, setUserInfo] = useState<{name: string, email: string} | null>(null)
  const [error, setError] = useState<string | null>(null)
  const token = searchParams.get('token')

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  // Validar token quando o componente monta
  useEffect(() => {
    if (!token) {
      navigate('/esqueci-minha-senha')
      return
    }

    const validateToken = async () => {
      try {
        setIsValidating(true)
        const response = await validateResetToken(token)
        setIsValid(true)
        setUserInfo({ name: response.name, email: response.email })
      } catch (error) {
        setIsValid(false)
        toast({
          variant: 'destructive',
          title: 'Token inválido',
          description: 'Este link de redefinição é inválido ou expirou.',
        })
        // Redirecionar após 3 segundos
        setTimeout(() => navigate('/esqueci-minha-senha'), 3000)
      } finally {
        setIsValidating(false)
      }
    }

    validateToken()
  }, [token, navigate, validateResetToken, toast])

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) return
    
    setIsLoading(true)
    setError(null)

    try {
      await resetPassword(token, data.password)
      toast({
        title: 'Senha redefinida!',
        description: 'Sua senha foi alterada com sucesso.',
      })
      navigate('/login')
    } catch {
      setError('Não foi possível redefinir a senha. Tente novamente.')
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível redefinir a senha. Tente novamente.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Estados de carregamento e validação
  if (isValidating) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Validando link de redefinição...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!isValid) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertTitle>Link Inválido</AlertTitle>
              <AlertDescription>
                Este link de redefinição é inválido ou expirou. 
                Você será redirecionado para solicitar um novo link.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Redefinir Senha</CardTitle>
          <CardDescription>
            Olá <strong>{userInfo?.name}</strong>, defina sua nova senha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova Senha</FormLabel>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 z-10 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <FormControl>
                        <PasswordInput {...field} className="pl-10" />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Nova Senha</FormLabel>
                    <FormControl>
                      <PasswordInput {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Erro</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Redefinir Senha
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
