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
import {
  SearchableSelect,
  SearchableSelectOption,
} from '@/components/ui/searchable-select'
import { MultiSelect } from '@/components/ui/multi-select'
import { useSectors } from '@/contexts/SectorContext'

const userEditSchema = z.object({
  name: z.string().min(1, { message: 'Nome completo é obrigatório.' }),
  email: z.string().email({ message: 'Formato de e-mail inválido.' }),
  role: z.enum(['supervisor', 'usuario', 'visualizador']),
  responsibleSectors: z.array(z.string()).optional(),
})

type UserEditFormValues = z.infer<typeof userEditSchema>

interface UserEditFormProps {
  user: User
  onSuccess: (updatedUser: User) => void
}

const roleOptions: SearchableSelectOption[] = [
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'usuario', label: 'Usuário' },
  { value: 'visualizador', label: 'Visualizador' },
]

export const UserEditForm = ({ user, onSuccess }: UserEditFormProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const { updateUser } = useAuth()
  const { sectors } = useSectors()

  const editableRole: UserEditFormValues['role'] =
    user.role === 'supervisor' || user.role === 'usuario' || user.role === 'visualizador'
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
        {(role === 'supervisor' || role === 'usuario' || role === 'visualizador') && (
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
                  {role === 'supervisor' 
                    ? 'O supervisor terá acesso para gerenciar os bens destes setores.'
                    : 'O usuário terá acesso aos bens destes setores e seus subsetores.'}
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
