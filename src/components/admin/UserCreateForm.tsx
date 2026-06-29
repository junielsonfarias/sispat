import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { toast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import { User } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import {
  SearchableSelect,
  SearchableSelectOption,
} from '@/components/ui/searchable-select'
import { MultiSelect } from '@/components/ui/multi-select'
import { useSectors } from '@/contexts/SectorContext'
import { STRONG_PASSWORD_REGEX, STRONG_PASSWORD_MESSAGE } from '@sispat/shared'

const userCreateSchema = z.object({
  name: z.string().min(1, { message: 'Nome completo é obrigatório.' }),
  email: z.string().email({ message: 'Formato de e-mail inválido.' }),
  // Mesma regra forte do backend (createUserSchema) — antes o form aceitava 8
  // chars e o backend rejeitava com 400 confuso.
  password: z.string().regex(STRONG_PASSWORD_REGEX, STRONG_PASSWORD_MESSAGE),
  role: z.enum(['supervisor', 'usuario', 'visualizador'], {
    required_error: 'Perfil é obrigatório.',
  }),
  responsibleSectors: z.array(z.string()).optional(),
})
  // usuario/visualizador são restritos aos setores vinculados — sem setor =
  // sem acesso. Exige ao menos um para não criar um usuário "cego".
  .superRefine((data, ctx) => {
    if (
      (data.role === 'usuario' || data.role === 'visualizador') &&
      (!data.responsibleSectors || data.responsibleSectors.length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['responsibleSectors'],
        message: 'Selecione ao menos um setor para este perfil.',
      })
    }
  })

type UserCreateFormValues = z.infer<typeof userCreateSchema>

interface UserCreateFormProps {
  onSuccess: (newUser: User) => void
}

const roleOptions: SearchableSelectOption[] = [
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'usuario', label: 'Usuário' },
  { value: 'visualizador', label: 'Visualizador' },
]

export const UserCreateForm = ({ onSuccess }: UserCreateFormProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const { addUser, user } = useAuth()
  const { sectors } = useSectors()

  const form = useForm<UserCreateFormValues>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      responsibleSectors: [],
    },
  })

  const role = form.watch('role')

  const allSectors = useMemo(
    () =>
      sectors.map((s) => ({ value: s.name, label: s.name })),
    [sectors],
  )

  const onSubmit = async (data: UserCreateFormValues) => {
    if (!user?.municipalityId) {
      toast({
        variant: 'destructive',
        title: 'Município não identificado',
        description: 'Sua conta não está associada a um município. Faça login novamente.',
      })
      return
    }
    setIsLoading(true)
    try {
      // municipalityId do usuário autenticado (multi-tenant) — não usar constante fixa.
      const userData = { ...data, municipalityId: user.municipalityId }
      const newUser = await addUser(userData)
      toast({
        title: 'Sucesso!',
        description: `Usuário ${newUser.name} criado. Um e-mail foi enviado com instruções.`,
      })
      onSuccess(newUser)
      form.reset()
    } catch (error) {
      toast({
        title: 'Erro',
        description:
          error instanceof Error ? error.message : 'Falha ao criar usuário',
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo</FormLabel>
              <FormControl>
                <Input placeholder="Nome do usuário" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Senha Provisória</FormLabel>
              <FormControl>
                <Input type="password" placeholder="********" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Perfil</FormLabel>
              <FormControl>
                <SearchableSelect
                  options={roleOptions}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Selecione um perfil"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {role === 'supervisor' && (
          <p className="text-sm text-muted-foreground">
            O supervisor tem acesso total: visualiza e edita os bens de todos os setores do
            município.
          </p>
        )}
        {(role === 'usuario' || role === 'visualizador') && (
          <FormField
            control={form.control}
            name="responsibleSectors"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Setores de Acesso</FormLabel>
                <FormControl>
                  <MultiSelect
                    options={allSectors}
                    selected={field.value || []}
                    onChange={field.onChange}
                    placeholder="Selecione os setores..."
                  />
                </FormControl>
                <FormDescription>
                  {role === 'visualizador'
                    ? 'O visualizador poderá apenas consultar os bens destes setores.'
                    : 'O usuário só verá e editará os bens destes setores. Sem setor, não terá acesso.'}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar Usuário
          </Button>
        </div>
      </form>
    </Form>
  )
}
