import { useState, useEffect, ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { User } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const userEditSchema = z.object({
  name: z.string().min(1, { message: 'Nome completo é obrigatório.' }),
  email: z.string().email({ message: 'Formato de e-mail inválido.' }),
  role: z.enum(['admin', 'usuario', 'visualizador']),
  sector: z.string().optional(),
  avatarUrl: z.string().optional(),
});

type UserEditFormValues = z.infer<typeof userEditSchema>;

interface UserEditFormProps {
  user: User;
  onSuccess: () => void;
}

export const UserEditForm = ({ user, onSuccess }: UserEditFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { updateUser } = useAuth();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const form = useForm<UserEditFormValues>({
    resolver: zodResolver(userEditSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      role: user.role,
      sector: user.sector,
      avatarUrl: user.avatarUrl,
    },
  });

  useEffect(() => {
    form.reset({
      name: user.name,
      email: user.email,
      role: user.role,
      sector: user.sector,
      avatarUrl: user.avatarUrl,
    });
    setAvatarPreview(user.avatarUrl);
  }, [user, form]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setAvatarPreview(result);
        form.setValue('avatarUrl', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: UserEditFormValues) => {
    setIsLoading(true);
    try {
      await updateUser(user.id, data);
      toast({
        title: 'Sucesso!',
        description: 'Usuário atualizado com sucesso.',
      });
      onSuccess();
    } catch (error) {
      toast({
        title: 'Erro',
        description:
          error instanceof Error ? error.message : 'Falha ao atualizar usuário',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
        <div className='flex items-center gap-4'>
          <Avatar className='h-16 w-16'>
            <AvatarImage src={avatarPreview || ''} />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <FormItem className='flex-grow'>
            <FormLabel>Foto de Perfil</FormLabel>
            <FormControl>
              <Input type='file' accept='image/*' onChange={handleFileChange} />
            </FormControl>
            <FormMessage />
          </FormItem>
        </div>
        <FormField
          control={form.control}
          name='name'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo</FormLabel>
              <FormControl>
                <Input placeholder='Nome do usuário' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input
                  type='email'
                  placeholder='email@exemplo.com'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='sector'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Setor</FormLabel>
              <FormControl>
                <Input placeholder='Setor do usuário (opcional)' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='role'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Perfil</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder='Selecione um perfil' />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value='admin'>Administrador</SelectItem>
                  <SelectItem value='usuario'>Usuário</SelectItem>
                  <SelectItem value='visualizador'>Visualizador</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className='flex justify-end'>
          <Button type='submit' disabled={isLoading}>
            {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            Salvar Alterações
          </Button>
        </div>
      </form>
    </Form>
  );
};
