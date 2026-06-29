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
import { useQuery } from '@tanstack/react-query'
import { api } from '@/services/api-adapter'

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
  // Só usado quando o criador é superuser (provisiona em qualquer município).
  municipalityId: z.string().optional(),
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
  const isSuperuser = user?.role === 'superuser'

  const form = useForm<UserCreateFormValues>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      responsibleSectors: [],
      municipalityId: '',
    },
  })

  const role = form.watch('role')
  const selectedMunicipalityId = form.watch('municipalityId')

  // Superuser provisiona em qualquer município → lista de municípios p/ o seletor.
  const { data: municipalities = [] } = useQuery({
    queryKey: ['municipalities', 'for-user-create'],
    queryFn: () => api.get<{ id: string; name: string }[]>('/municipalities'),
    enabled: isSuperuser,
  })
  const municipalityOptions: SearchableSelectOption[] = municipalities.map((m) => ({
    value: m.id,
    label: m.name,
  }))

  // Setores para o seletor de usuario/visualizador:
  //  - superuser: do município selecionado (busca dedicada);
  //  - admin/supervisor: do próprio município (SectorContext).
  const { data: municipalitySectors = [] } = useQuery({
    queryKey: ['sectors', 'by-municipality', selectedMunicipalityId],
    queryFn: () =>
      api.get<{ name: string }[]>(`/sectors?municipalityId=${selectedMunicipalityId}`),
    enabled: isSuperuser && !!selectedMunicipalityId,
  })

  const allSectors = useMemo(() => {
    const source = isSuperuser ? municipalitySectors : sectors
    return source.map((s) => ({ value: s.name, label: s.name }))
  }, [isSuperuser, municipalitySectors, sectors])

  const onSubmit = async (data: UserCreateFormValues) => {
    // superuser provisiona em qualquer município (escolhe no form); os demais
    // ficam travados no próprio município.
    const targetMunicipalityId = isSuperuser ? data.municipalityId : user?.municipalityId
    if (!targetMunicipalityId) {
      toast({
        variant: 'destructive',
        title: 'Município não identificado',
        description: isSuperuser
          ? 'Selecione o município do novo usuário.'
          : 'Sua conta não está associada a um município. Faça login novamente.',
      })
      return
    }
    setIsLoading(true)
    try {
      const userData = { ...data, municipalityId: targetMunicipalityId }
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
        {isSuperuser && (
          <FormField
            control={form.control}
            name="municipalityId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Município</FormLabel>
                <FormControl>
                  <SearchableSelect
                    options={municipalityOptions}
                    value={field.value || ''}
                    onChange={(v) => {
                      field.onChange(v)
                      // Troca de município → zera setores (são de outro município).
                      form.setValue('responsibleSectors', [])
                    }}
                    placeholder="Selecione o município"
                  />
                </FormControl>
                <FormDescription>
                  O usuário será criado neste município. Supervisores gerenciam apenas o
                  município vinculado a eles.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
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
