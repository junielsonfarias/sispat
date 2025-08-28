import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { Loader2, Eye, EyeOff } from 'lucide-react'

const passwordChangeSchema = z
  .object({
    password: z
      .string()
      .min(8, { message: 'A senha deve ter no mínimo 8 caracteres.' })
      .regex(/[a-z]/, {
        message: 'A senha deve conter pelo menos uma letra minúscula.',
      })
      .regex(/[A-Z]/, {
        message: 'A senha deve conter pelo menos uma letra maiúscula.',
      })
      .regex(/[0-9]/, { message: 'A senha deve conter pelo menos um número.' })
      .regex(/[^a-zA-Z0-9]/, {
        message: 'A senha deve conter pelo menos um caractere especial.',
      }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  })

type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>

interface SuperuserPasswordChangeFormProps {
  onSuccess: () => void
}

export const SuperuserPasswordChangeForm = ({
  onSuccess,
}: SuperuserPasswordChangeFormProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { user, updateUserPassword } = useAuth()

  const form = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = async (data: PasswordChangeFormValues) => {
    if (!user) return
    setIsLoading(true)
    try {
      await updateUserPassword(user.id, data.password)
      toast({
        title: 'Sucesso!',
        description: `Sua senha foi alterada com sucesso.`,
      })
      onSuccess()
    } catch (error) {
      toast({
        title: 'Erro',
        description:
          error instanceof Error ? error.message : 'Falha ao alterar a senha.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nova Senha</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="********"
                    {...field}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
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
                <Input type="password" placeholder="********" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Nova Senha
          </Button>
        </div>
      </form>
    </Form>
  )
}
