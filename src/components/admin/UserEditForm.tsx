import { useState, useEffect, ChangeEvent, useMemo } from 'react'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  SearchableSelect,
  SearchableSelectOption,
} from '@/components/ui/searchable-select'
import { MultiSelect } from '@/components/ui/multi-select'
import { useSectors } from '@/contexts/SectorContext'
import { MUNICIPALITY_ID } from '@/config/municipality'

const userEditSchema = z.object({
  name: z.string().min(1, { message: 'Nome completo é obrigatório.' }),
  email: z.string().email({ message: 'Formato de e-mail inválido.' }),
  role: z.enum(['supervisor', 'usuario', 'visualizador']),
  sector: z.string().optional(),
  avatarUrl: z.string().optional(),
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
  const { user: currentUser, updateUser } = useAuth()
  const { sectors } = useSectors()
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const form = useForm<UserEditFormValues>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      role: user.role,
      sector: user.sector,
      avatarUrl: user.avatarUrl,
      responsibleSectors: user.responsibleSectors || [],
    },
  })

  const role = form.watch('role')

  const allSectors = useMemo(
    () =>
      sectors
        .filter((s) => s.municipalityId === MUNICIPALITY_ID)
        .map((s) => ({ value: s.name, label: s.name })),
    [sectors],
  )

  useEffect(() => {
      form.reset({
        name: user.name,
        email: user.email,
        role: user.role,
        sector: user.sector,
        avatarUrl: user.avatarUrl,
        responsibleSectors: user.responsibleSectors || [],
      })
    setAvatarPreview(user.avatarUrl)
  }, [user, form])

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setAvatarPreview(result)
        form.setValue('avatarUrl', result)
      }
      reader.readAsDataURL(file)
    }
  }

  const onSubmit = async (data: UserEditFormValues) => {
    setIsLoading(true)
    try {
      // Manter o municipalityId original do usuário
      const userData = { ...data, municipalityId: user.municipalityId }
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
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {avatarPreview && avatarPreview.trim() !== '' && !avatarPreview.includes('placeholder') && <AvatarImage src={avatarPreview} />}
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <FormItem className="flex-grow">
            <FormLabel>Foto de Perfil</FormLabel>
            <FormControl>
              <Input type="file" accept="image/*" onChange={handleFileChange} />
            </FormControl>
            <FormMessage />
          </FormItem>
        </div>
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
          name="sector"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Setor Principal</FormLabel>
              <FormControl>
                <SearchableSelect
                  options={allSectors}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Selecione o setor principal (opcional)"
                  isClearable
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
                  O usuário terá acesso aos bens destes setores e seus
                  subsetores.
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
