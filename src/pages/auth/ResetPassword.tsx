import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Eye, EyeOff, Loader2, Lock, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const resetPasswordSchema = z
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
  .refine(data => data.password === data.confirmPassword, {
    message: 'As senhas não coincidem.',
    path: ['confirmPassword'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPassword() {
  const { resetPassword } = useAuth();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token) {
      setError('Token de redefinição inválido ou ausente.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await resetPassword(token, data.password);
      navigate('/login', {
        state: {
          successMessage:
            'Sua senha foi redefinida com sucesso. Por favor, faça login com sua nova senha.',
        },
      });
    } catch (e) {
      const errorMessage =
        e instanceof Error ? e.message : 'Ocorreu um erro. Tente novamente.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className='flex min-h-screen items-center justify-center bg-gray-100 dark:bg-gray-900 p-4'>
      <Card className='w-full max-w-md animate-fade-in-up'>
        <CardHeader className='text-center'>
          <CardTitle className='text-2xl'>Redefinir Senha</CardTitle>
          <CardDescription>Crie uma nova senha para sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
              <FormField
                control={form.control}
                name='password'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova Senha</FormLabel>
                    <div className='relative'>
                      <Lock className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                      <FormControl>
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          placeholder='********'
                          {...field}
                          className='pl-10 pr-10'
                        />
                      </FormControl>
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        className='absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7'
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className='h-4 w-4' />
                        ) : (
                          <Eye className='h-4 w-4' />
                        )}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='confirmPassword'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Nova Senha</FormLabel>
                    <div className='relative'>
                      <Lock className='absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground' />
                      <FormControl>
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder='********'
                          {...field}
                          className='pl-10 pr-10'
                        />
                      </FormControl>
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        className='absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7'
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className='h-4 w-4' />
                        ) : (
                          <Eye className='h-4 w-4' />
                        )}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {error && (
                <Alert variant='destructive' className='animate-fade-in'>
                  <AlertTitle>Erro</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type='submit' className='w-full' disabled={isLoading}>
                {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                Redefinir Senha
              </Button>
            </form>
          </Form>
          <div className='mt-4 text-center text-sm'>
            <Link
              to='/login'
              className='inline-flex items-center text-primary hover:underline'
            >
              <ArrowLeft className='mr-1 h-4 w-4' />
              Voltar para o Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
