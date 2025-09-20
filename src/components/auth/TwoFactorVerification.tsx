import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useTwoFactor } from '@/contexts/TwoFactorContext';
import { Shield, Clock, Key, ArrowLeft } from 'lucide-react';
import { getTimeRemaining } from '@/services/twoFactorAuthApi';

interface TwoFactorVerificationProps {
  onVerified: () => void;
  onBack: () => void;
  userEmail: string;
}

export const TwoFactorVerification: React.FC<TwoFactorVerificationProps> = ({
  onVerified,
  onBack,
  userEmail,
}) => {
  const { verifyToken, verifyBackup, isVerifying } = useTwoFactor();
  const [token, setToken] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [attempts, setAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);

  // Atualiza o timer do TOTP
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(getTimeRemaining());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Bloqueia após muitas tentativas
  useEffect(() => {
    if (attempts >= 5) {
      setIsBlocked(true);
      setTimeout(() => {
        setIsBlocked(false);
        setAttempts(0);
      }, 300000); // 5 minutos
    }
  }, [attempts]);

  const handleVerifyToken = async () => {
    if (!token.trim() || token.length !== 6) {
      return;
    }

    const success = await verifyToken(token);

    if (success) {
      onVerified();
    } else {
      setAttempts(prev => prev + 1);
      setToken('');
    }
  };

  const handleVerifyBackup = async () => {
    if (!backupCode.trim()) {
      return;
    }

    const success = await verifyBackup(backupCode);

    if (success) {
      onVerified();
    } else {
      setAttempts(prev => prev + 1);
      setBackupCode('');
    }
  };

  const handleTokenChange = (value: string) => {
    const cleanValue = value.replace(/\D/g, '').slice(0, 6);
    setToken(cleanValue);
  };

  const handleBackupCodeChange = (value: string) => {
    const cleanValue = value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8);
    setBackupCode(cleanValue);
  };

  if (isBlocked) {
    return (
      <Card className='max-w-md mx-auto'>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-red-600'>
            <Shield className='w-5 h-5' />
            Conta Temporariamente Bloqueada
          </CardTitle>
          <CardDescription>
            Muitas tentativas de verificação falharam
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Alert variant='destructive'>
            <AlertDescription>
              Sua conta foi temporariamente bloqueada por motivos de segurança.
              Tente novamente em 5 minutos ou entre em contato com o suporte.
            </AlertDescription>
          </Alert>
        </CardContent>

        <CardFooter>
          <Button variant='outline' onClick={onBack} className='w-full'>
            <ArrowLeft className='w-4 h-4 mr-2' />
            Voltar ao Login
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className='max-w-md mx-auto'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Shield className='w-5 h-5 text-blue-600' />
          Verificação de Dois Fatores
        </CardTitle>
        <CardDescription>
          Digite o código do seu aplicativo autenticador para {userEmail}
        </CardDescription>
      </CardHeader>

      <CardContent className='space-y-6'>
        {!useBackupCode ? (
          // Token TOTP
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='token'>Código de 6 dígitos:</Label>
              <Input
                id='token'
                placeholder='000000'
                value={token}
                onChange={e => handleTokenChange(e.target.value)}
                maxLength={6}
                className='text-center text-lg tracking-widest font-mono'
                autoComplete='one-time-code'
                disabled={isVerifying}
              />
            </div>

            {/* Timer */}
            <div className='flex items-center justify-center gap-2 text-sm text-muted-foreground'>
              <Clock className='w-4 h-4' />
              <span>Novo código em {timeRemaining}s</span>
            </div>

            <Button
              onClick={handleVerifyToken}
              disabled={isVerifying || token.length !== 6}
              className='w-full'
            >
              {isVerifying ? 'Verificando...' : 'Verificar Código'}
            </Button>
          </div>
        ) : (
          // Código de Backup
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='backup'>Código de Backup:</Label>
              <Input
                id='backup'
                placeholder='XXXXXXXX'
                value={backupCode}
                onChange={e => handleBackupCodeChange(e.target.value)}
                maxLength={8}
                className='text-center text-lg tracking-widest font-mono'
                disabled={isVerifying}
              />
            </div>

            <Alert>
              <Key className='w-4 h-4' />
              <AlertDescription>
                Digite um dos seus códigos de backup de 8 caracteres. Cada
                código pode ser usado apenas uma vez.
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleVerifyBackup}
              disabled={isVerifying || backupCode.length !== 8}
              className='w-full'
            >
              {isVerifying ? 'Verificando...' : 'Usar Código de Backup'}
            </Button>
          </div>
        )}

        {/* Separator */}
        <div className='relative'>
          <Separator />
          <div className='absolute inset-0 flex justify-center'>
            <span className='bg-background px-2 text-xs text-muted-foreground'>
              ou
            </span>
          </div>
        </div>

        {/* Switch Mode */}
        <div className='text-center'>
          <Button
            variant='link'
            onClick={() => {
              setUseBackupCode(!useBackupCode);
              setToken('');
              setBackupCode('');
            }}
            disabled={isVerifying}
            className='text-sm'
          >
            {useBackupCode
              ? 'Usar código do aplicativo'
              : 'Usar código de backup'}
          </Button>
        </div>

        {/* Attempts Warning */}
        {attempts > 0 && (
          <Alert variant={attempts >= 3 ? 'destructive' : 'default'}>
            <AlertDescription>
              {attempts >= 3
                ? `⚠️ ${5 - attempts} tentativa(s) restante(s) antes do bloqueio`
                : `Tentativa ${attempts} de 5. Verifique o código e tente novamente.`}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter>
        <Button variant='outline' onClick={onBack} className='w-full'>
          <ArrowLeft className='w-4 h-4 mr-2' />
          Voltar ao Login
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TwoFactorVerification;
