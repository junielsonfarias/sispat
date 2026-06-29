import { useState, useEffect, useMemo } from 'react'
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
import { useAuth } from '@/hooks/useAuth'
import { Loader2 } from 'lucide-react'
import { User } from '@/types'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { MultiSelect } from '@/components/ui/multi-select'
import { useSectors } from '@/contexts/SectorContext'
import { assignableRoleOptions } from '@/lib/roles'

const userEditSchema = z
  .object({
    name: z.string().min(1, { message: 'Nome completo é obrigatório.' }),
    email: z.string().email({ message: 'Formato de e-mail inválido.' }),
    role: z.enum(['admin', 'supervisor', 'usuario', 'visualizador']),
    responsibleSectors: z.array(z.string()).optional(),
  })
  // usuario/visualizador são restritos aos setores vinculados (sem setor = sem
  // acesso) — exige ao menos um.
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

type UserEditFormValues = z.infer<typeof userEditSchema>

interface UserEditFormProps {
  user: User
  onSuccess: (updatedUser: User) => void
}

export const UserEditForm = ({ user, onSuccess }: UserEditFormProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const { updateUser, user: currentUser } = useAuth()
  const { sectors } = useSectors()

  // Opções de perfil conforme o papel de quem edita (anti-escalada).
  const roleOptions = useMemo(
    () => assignableRoleOptions(currentUser?.role),
    [currentUser?.role],
  )

  const editableRole: UserEditFormValues['role'] =
    user.role === 'admin' ||
    user.role === 'supervisor' ||
    user.role === 'usuario' ||
    user.role === 'visualizador'
      ? user.role
      : 'supervisor'

  const form = useForm<UserEditFormValues>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      role: editableRole,
      responsibleSectors: user.responsibleSectors || [],
    },
  })

  const role = form.watch('role')

  const allSectors = useMemo(
    () =>
      sectors.map((s) => ({ value: s.name, label: s.name })),
    [sectors],
  )

  useEffect(() => {
    const resetRole: UserEditFormValues['role'] =
      user.role === 'supervisor' || user.role === 'usuario' || user.role === 'visualizador'
        ? user.role
        : 'supervisor'
    form.reset({
      name: user.name,
      email: user.email,
      role: resetRole,
      responsibleSectors: user.responsibleSectors || [],
    })
  }, [user, form])

  const onSubmit = async (data: UserEditFormValues) => {
    setIsLoading(true)
    try {
      // updateUserSchema do backend é .strict(): só aceita estes campos.
      // (Antes ia {...data, municipalityId} com sector/avatarUrl/municipalityId →
      // 400 "Unrecognized key", quebrando todo save de edição de usuário.)
      const userData = {
        name: data.name,
        email: data.email,
        role: data.role,
        responsibleSectors: data.responsibleSectors,
      }
      const updatedUser = await updateUser(user.id, userData)
      toast({
        title: 'Sucesso!',
        description: 'Usuário atualizado com sucesso.',
      })
      onSuccess(updatedUser)
    } catch (error) {
      toast({
        title: 'Erro',
        description:
          error instanceof Error ? error.message : 'Falha ao atualizar usuário',
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
            Salvar Alterações
          </Button>
        </div>
      </form>
    </Form>
  )
}
