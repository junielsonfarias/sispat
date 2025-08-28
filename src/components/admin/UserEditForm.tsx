import { Button } from '@/components/ui/button'
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { MultiSelect } from '@/components/ui/multi-select'
import {
    SearchableSelect,
    SearchableSelectOption,
} from '@/components/ui/searchable-select'
import { useMunicipalities } from '@/contexts/MunicipalityContext'
import { useSectors } from '@/contexts/SectorContext'
import { toast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { User } from '@/types'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { ChangeEvent, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

const userEditSchema = z.object({
  name: z.string().min(1, { message: 'Nome completo é obrigatório.' }),
  email: z.string().email({ message: 'Formato de e-mail inválido.' }),
  role: z.enum(['supervisor', 'usuario', 'visualizador'], {
    required_error: 'Perfil é obrigatório.',
  }),
  sector: z.string().optional(),
  responsibleSectors: z.array(z.string()).optional(),
  municipalityId: z.string().min(1, { message: 'Município é obrigatório.' }),
  avatarUrl: z.string().optional(),
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
  const { user: currentUser, updateUser } = useAuth()
  const { sectors, fetchSectorsByMunicipality, isLoading: sectorsLoading } = useSectors()
  const { municipalities } = useMunicipalities()
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const municipalityOptions = useMemo(
    () => municipalities.map((m) => ({
      value: m.id,
      label: m.name,
    })),
    [municipalities],
  )

  const form = useForm<UserEditFormValues>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      name: user.name || '',
      email: user.email || '',
      role: user.role,
      sector: user.sector || undefined,
      avatarUrl: user.avatarUrl || undefined,
      responsibleSectors: user.responsibleSectors || [],
      municipalityId: currentUser?.role === 'superuser' ? user.municipalityId : currentUser?.municipalityId,
    },
  })

  const role = form.watch('role')
  const municipalityId = form.watch('municipalityId')

  // Carregar setores quando o município for selecionado
  useEffect(() => {
    if (municipalityId) {
      console.log('🔄 Carregando setores para município:', municipalityId)
      fetchSectorsByMunicipality(municipalityId)
    } else {
      console.log('🔄 Limpando setores - nenhum município selecionado')
    }
  }, [municipalityId, fetchSectorsByMunicipality])

  const allSectors = useMemo(
    () => {
      const filteredSectors = sectors
        .filter((s) => s.municipalityId === municipalityId)
        .map((s) => ({ value: s.name, label: s.name }))
      
      console.log('✅ Setores filtrados:', filteredSectors)
      return filteredSectors
    },
    [sectors, municipalityId],
  )

  const handleAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const result = event.target?.result as string
        setAvatarPreview(result)
        form.setValue('avatarUrl', result)
      }
      reader.readAsDataURL(file)
    }
  }

  const onSubmit = async (data: UserEditFormValues) => {
    setIsLoading(true)
    try {
      const updatedUser = await updateUser(user.id, data)
      toast({
        title: 'Sucesso!',
        description: `Usuário ${updatedUser.name} atualizado.`,
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
        {currentUser?.role === 'superuser' && (
          <FormField
            control={form.control}
            name="municipalityId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Município</FormLabel>
                <FormControl>
                  <SearchableSelect
                    options={municipalityOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Selecione o município"
                  />
                </FormControl>
                <FormDescription>
                  O usuário terá acesso a todos os setores criados para este município.
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
        {currentUser?.role === 'supervisor' && (role === 'usuario' || role === 'visualizador') && (
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
                    placeholder={sectorsLoading ? "Carregando setores..." : "Selecione os setores de acesso"}
                    disabled={!municipalityId || sectorsLoading}
                  />
                </FormControl>
                <FormDescription>
                  O usuário terá acesso aos bens dos setores selecionados e seus locais. Pode selecionar múltiplos setores.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="avatarUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Avatar</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="cursor-pointer"
                />
              </FormControl>
              {avatarPreview && (
                <div className="mt-2">
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="w-16 h-16 rounded-full object-cover"
                  />
                </div>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
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
