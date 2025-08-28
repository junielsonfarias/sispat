import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  Lock,
  Key,
  Eye,
  EyeOff,
  Smartphone,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Activity,
} from 'lucide-react';
import { TwoFactorSetup } from '@/components/TwoFactorSetup';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface SecuritySettingsProps {}

interface SecurityStats {
  totalLogins: number;
  failedAttempts: number;
  lastLogin: string;
  activeSessions: number;
  securityScore: number;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Estatísticas simuladas
  const [securityStats] = useState<SecurityStats>({
    totalLogins: 156,
    failedAttempts: 3,
    lastLogin: new Date().toISOString(),
    activeSessions: 2,
    securityScore: 85,
  });

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 8) {
      setError('A nova senha deve ter pelo menos 8 caracteres');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/change-password`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        }
      );

      if (response.ok) {
        toast({
          title: 'Senha Alterada',
          description: 'Sua senha foi alterada com sucesso',
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erro ao alterar senha');
      }
    } catch (error) {
      setError('Erro de conexão');
    } finally {
      setIsLoading(false);
    }
  };

  const terminateAllSessions = async () => {
    if (!confirm('Tem certeza que deseja encerrar todas as sessões ativas?')) {
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/auth/terminate-sessions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        toast({
          title: 'Sessões Encerradas',
          description: 'Todas as sessões foram encerradas com sucesso',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível encerrar as sessões',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSecurityScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSecurityScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className='h-5 w-5 text-green-600' />;
    if (score >= 60)
      return <AlertTriangle className='h-5 w-5 text-yellow-600' />;
    return <AlertTriangle className='h-5 w-5 text-red-600' />;
  };

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>
          Configurações de Segurança
        </h1>
        <p className='text-muted-foreground'>
          Gerencie a segurança da sua conta e configure autenticação de dois
          fatores
        </p>
      </div>

      {/* Estatísticas de Segurança */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center space-x-2'>
              <Activity className='h-4 w-4 text-muted-foreground' />
              <div>
                <p className='text-sm font-medium'>Pontuação de Segurança</p>
                <div className='flex items-center gap-2'>
                  {getSecurityScoreIcon(securityStats.securityScore)}
                  <p
                    className={`text-2xl font-bold ${getSecurityScoreColor(securityStats.securityScore)}`}
                  >
                    {securityStats.securityScore}/100
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center space-x-2'>
              <Users className='h-4 w-4 text-muted-foreground' />
              <div>
                <p className='text-sm font-medium'>Logins Totais</p>
                <p className='text-2xl font-bold'>
                  {securityStats.totalLogins}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center space-x-2'>
              <AlertTriangle className='h-4 w-4 text-muted-foreground' />
              <div>
                <p className='text-sm font-medium'>Tentativas Falhadas</p>
                <p className='text-2xl font-bold'>
                  {securityStats.failedAttempts}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className='p-4'>
            <div className='flex items-center space-x-2'>
              <Clock className='h-4 w-4 text-muted-foreground' />
              <div>
                <p className='text-sm font-medium'>Sessões Ativas</p>
                <p className='text-2xl font-bold'>
                  {securityStats.activeSessions}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configurações */}
      <Tabs defaultValue='2fa' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='2fa' className='flex items-center gap-2'>
            <Shield className='h-4 w-4' />
            2FA
          </TabsTrigger>
          <TabsTrigger value='password' className='flex items-center gap-2'>
            <Lock className='h-4 w-4' />
            Senha
          </TabsTrigger>
          <TabsTrigger value='sessions' className='flex items-center gap-2'>
            <Users className='h-4 w-4' />
            Sessões
          </TabsTrigger>
        </TabsList>

        {/* Autenticação de Dois Fatores */}
        <TabsContent value='2fa' className='space-y-4'>
          <TwoFactorSetup
            onSetupComplete={() => {
              toast({
                title: '2FA Configurado',
                description:
                  'Autenticação de dois fatores configurada com sucesso!',
              });
            }}
          />
        </TabsContent>

        {/* Alteração de Senha */}
        <TabsContent value='password' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Lock className='h-5 w-5' />
                Alterar Senha
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='current-password'>Senha Atual</Label>
                  <div className='relative'>
                    <Input
                      id='current-password'
                      type={showPasswords ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder='Digite sua senha atual'
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent'
                      onClick={() => setShowPasswords(!showPasswords)}
                    >
                      {showPasswords ? (
                        <EyeOff className='h-4 w-4' />
                      ) : (
                        <Eye className='h-4 w-4' />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='space-y-2'>
                  <Label htmlFor='new-password'>Nova Senha</Label>
                  <Input
                    id='new-password'
                    type={showPasswords ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder='Digite a nova senha'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='confirm-password'>Confirmar Nova Senha</Label>
                  <Input
                    id='confirm-password'
                    type={showPasswords ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder='Confirme a nova senha'
                  />
                </div>
              </div>

              {error && (
                <Alert variant='destructive'>
                  <AlertTriangle className='h-4 w-4' />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className='flex gap-2'>
                <Button
                  onClick={changePassword}
                  disabled={
                    isLoading ||
                    !currentPassword ||
                    !newPassword ||
                    !confirmPassword
                  }
                >
                  {isLoading ? 'Alterando...' : 'Alterar Senha'}
                </Button>
                <Button
                  variant='outline'
                  onClick={() => setShowPasswords(!showPasswords)}
                >
                  {showPasswords ? 'Ocultar' : 'Mostrar'} Senhas
                </Button>
              </div>

              <Separator />

              <div className='space-y-2'>
                <h4 className='font-semibold'>Requisitos de Senha</h4>
                <ul className='text-sm text-muted-foreground space-y-1'>
                  <li>• Mínimo de 8 caracteres</li>
                  <li>• Pelo menos uma letra maiúscula</li>
                  <li>• Pelo menos uma letra minúscula</li>
                  <li>• Pelo menos um número</li>
                  <li>• Pelo menos um caractere especial</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gerenciamento de Sessões */}
        <TabsContent value='sessions' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Users className='h-5 w-5' />
                Sessões Ativas
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex items-center justify-between'>
                <div>
                  <p className='text-sm text-muted-foreground'>
                    Você tem {securityStats.activeSessions} sessão(ões) ativa(s)
                  </p>
                  <p className='text-xs text-muted-foreground mt-1'>
                    Último login:{' '}
                    {new Date(securityStats.lastLogin).toLocaleString('pt-BR')}
                  </p>
                </div>
                <Button
                  variant='outline'
                  onClick={terminateAllSessions}
                  disabled={isLoading}
                >
                  {isLoading ? 'Encerrando...' : 'Encerrar Todas as Sessões'}
                </Button>
              </div>

              <Alert>
                <Shield className='h-4 w-4' />
                <AlertDescription>
                  Encerrar todas as sessões irá desconectar você de todos os
                  dispositivos. Você precisará fazer login novamente.
                </AlertDescription>
              </Alert>

              <Separator />

              <div className='space-y-2'>
                <h4 className='font-semibold'>Dicas de Segurança</h4>
                <ul className='text-sm text-muted-foreground space-y-1'>
                  <li>• Sempre faça logout ao usar computadores públicos</li>
                  <li>• Use senhas fortes e únicas</li>
                  <li>• Ative a autenticação de dois fatores</li>
                  <li>• Monitore suas sessões regularmente</li>
                  <li>• Não compartilhe suas credenciais</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Informações Adicionais */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Settings className='h-5 w-5' />
            Informações de Segurança
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div>
              <h4 className='font-semibold mb-2'>
                Autenticação de Dois Fatores (2FA)
              </h4>
              <p className='text-sm text-muted-foreground mb-2'>
                A autenticação de dois fatores adiciona uma camada extra de
                segurança à sua conta.
              </p>
              <ul className='text-sm text-muted-foreground space-y-1'>
                <li>• Códigos temporários de 6 dígitos</li>
                <li>• Compatível com Google Authenticator</li>
                <li>• Códigos de backup para emergências</li>
                <li>• Configuração simples e rápida</li>
              </ul>
            </div>
            <div>
              <h4 className='font-semibold mb-2'>Monitoramento de Segurança</h4>
              <p className='text-sm text-muted-foreground mb-2'>
                O sistema monitora automaticamente a segurança da sua conta.
              </p>
              <ul className='text-sm text-muted-foreground space-y-1'>
                <li>• Detecção de login suspeito</li>
                <li>• Alertas de tentativas falhadas</li>
                <li>• Histórico de sessões</li>
                <li>• Pontuação de segurança em tempo real</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
