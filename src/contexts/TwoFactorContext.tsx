import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  TwoFactorSetup,
  generateTwoFactorSetup,
  verifyTwoFactorToken,
  verifyBackupCode,
  disableTwoFactor,
} from '@/services/twoFactorAuthApi';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface TwoFactorContextData {
  // Estados
  isEnabled: boolean;
  isSetupMode: boolean;
  isVerifying: boolean;
  setupData: TwoFactorSetup | null;

  // Ações
  startSetup: () => Promise<void>;
  completeSetup: (verificationToken: string) => Promise<boolean>;
  cancelSetup: () => void;
  verifyToken: (token: string) => Promise<boolean>;
  verifyBackup: (code: string) => Promise<boolean>;
  disable2FA: (password: string) => Promise<boolean>;
  regenerateBackupCodes: () => Promise<string[]>;
}

const TwoFactorContext = createContext<TwoFactorContextData>(
  {} as TwoFactorContextData
);

export const useTwoFactor = () => {
  const context = useContext(TwoFactorContext);
  if (!context) {
    throw new Error('useTwoFactor must be used within a TwoFactorProvider');
  }
  return context;
};

interface TwoFactorProviderProps {
  children: React.ReactNode;
}

export const TwoFactorProvider: React.FC<TwoFactorProviderProps> = ({
  children,
}) => {
  const { user } = useAuth();
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [setupData, setSetupData] = useState<TwoFactorSetup | null>(null);

  // Inicia o processo de configuração do 2FA
  const startSetup = useCallback(async () => {
    if (!user?.email) {
      toast({
        title: 'Erro',
        description: 'Usuário não encontrado',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsVerifying(true);
      const setup = await generateTwoFactorSetup();
      setSetupData(setup);
      setIsSetupMode(true);

      toast({
        title: 'Configuração 2FA',
        description: 'Escaneie o QR Code com seu aplicativo autenticador',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao gerar configuração 2FA',
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  }, [user?.email]);

  // Completa a configuração do 2FA
  const completeSetup = useCallback(
    async (verificationToken: string): Promise<boolean> => {
      if (!setupData || !user?.id) {
        return false;
      }

      try {
        setIsVerifying(true);

        // Verifica o token fornecido pelo usuário via API
        const isValid = await verifyTwoFactorToken(verificationToken);

        if (!isValid) {
          toast({
            title: 'Código inválido',
            description: 'Verifique o código e tente novamente',
            variant: 'destructive',
          });
          return false;
        }

        setIsEnabled(true);
        setIsSetupMode(false);
        setSetupData(null);

        toast({
          title: 'Sucesso!',
          description:
            '2FA ativado com sucesso. Guarde seus códigos de backup em local seguro.',
        });

        return true;
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Falha ao ativar 2FA',
          variant: 'destructive',
        });
        return false;
      } finally {
        setIsVerifying(false);
      }
    },
    [setupData, user?.id]
  );

  // Cancela a configuração
  const cancelSetup = useCallback(() => {
    setIsSetupMode(false);
    setSetupData(null);
    setIsVerifying(false);
  }, []);

  // Verifica um token 2FA durante o login
  const verifyToken = useCallback(
    async (token: string): Promise<boolean> => {
      if (!user?.id) {
        return false;
      }

      try {
        setIsVerifying(true);

        const isValid = await verifyTwoFactorToken(token);

        if (!isValid) {
          toast({
            title: 'Código inválido',
            description: 'Verifique o código e tente novamente',
            variant: 'destructive',
          });
          return false;
        }

        return true;
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Falha na verificação 2FA',
          variant: 'destructive',
        });
        return false;
      } finally {
        setIsVerifying(false);
      }
    },
    [user?.id]
  );

  // Verifica um código de backup
  const verifyBackup = useCallback(
    async (code: string): Promise<boolean> => {
      if (!user?.id) {
        return false;
      }

      try {
        setIsVerifying(true);

        const result = await verifyBackupCode(code);

        if (!result.isValid) {
          toast({
            title: 'Código inválido',
            description: 'Código de backup inválido ou já utilizado',
            variant: 'destructive',
          });
          return false;
        }

        if (result.remainingCodes <= 2) {
          toast({
            title: 'Atenção',
            description: `Restam apenas ${result.remainingCodes} códigos de backup. Considere gerar novos códigos.`,
            variant: 'destructive',
          });
        }

        return true;
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Falha na verificação do código de backup',
          variant: 'destructive',
        });
        return false;
      } finally {
        setIsVerifying(false);
      }
    },
    [user?.id]
  );

  // Desativa o 2FA
  const disable2FA = useCallback(
    async (password: string): Promise<boolean> => {
      if (!user?.id) {
        return false;
      }

      try {
        setIsVerifying(true);

        const success = await disableTwoFactor(password);

        if (!success) {
          toast({
            title: 'Erro',
            description: 'Senha incorreta ou falha ao desativar 2FA',
            variant: 'destructive',
          });
          return false;
        }

        setIsEnabled(false);

        toast({
          title: 'Sucesso',
          description: '2FA desativado com sucesso',
        });

        return true;
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Falha ao desativar 2FA',
          variant: 'destructive',
        });
        return false;
      } finally {
        setIsVerifying(false);
      }
    },
    [user?.id]
  );

  // Regenera códigos de backup
  const regenerateBackupCodes = useCallback(async (): Promise<string[]> => {
    if (!user?.id) {
      return [];
    }

    try {
      setIsVerifying(true);

      // Para regenerar códigos, precisamos gerar uma nova configuração 2FA
      const setup = await generateTwoFactorSetup();

      toast({
        title: 'Sucesso',
        description:
          'Novos códigos de backup gerados. Guarde-os em local seguro.',
      });

      return setup.backupCodes;
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao regenerar códigos de backup',
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsVerifying(false);
    }
  }, [user?.id]);

  const value: TwoFactorContextData = {
    isEnabled,
    isSetupMode,
    isVerifying,
    setupData,
    startSetup,
    completeSetup,
    cancelSetup,
    verifyToken,
    verifyBackup,
    disable2FA,
    regenerateBackupCodes,
  };

  return (
    <TwoFactorContext.Provider value={value}>
      {children}
    </TwoFactorContext.Provider>
  );
};

export default TwoFactorProvider;
