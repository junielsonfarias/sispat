import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, Shield } from 'lucide-react';
import {
  PasswordStrength,
  calculatePasswordStrength,
  UserInfo,
} from '@/services/passwordPolicy';

interface PasswordStrengthIndicatorProps {
  password: string;
  userInfo?: UserInfo;
  showRequirements?: boolean;
  className?: string;
}

const strengthColors = {
  'very-weak': 'bg-red-500',
  weak: 'bg-orange-500',
  fair: 'bg-yellow-500',
  good: 'bg-blue-500',
  strong: 'bg-green-500',
};

const strengthLabels = {
  'very-weak': 'Muito Fraca',
  weak: 'Fraca',
  fair: 'Regular',
  good: 'Boa',
  strong: 'Forte',
};

const strengthVariants = {
  'very-weak': 'destructive' as const,
  weak: 'destructive' as const,
  fair: 'secondary' as const,
  good: 'default' as const,
  strong: 'default' as const,
};

export const PasswordStrengthIndicator: React.FC<
  PasswordStrengthIndicatorProps
> = ({ password, userInfo, showRequirements = true, className = '' }) => {
  const strength = calculatePasswordStrength(password, userInfo);

  if (!password) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Barra de Progresso */}
      <div className='space-y-2'>
        <div className='flex items-center justify-between'>
          <span className='text-sm font-medium'>Força da Senha:</span>
          <Badge variant={strengthVariants[strength.level]} className='text-xs'>
            {strengthLabels[strength.level]}
          </Badge>
        </div>

        <div className='relative'>
          <Progress value={strength.score} className='h-2' />
          <div
            className={`absolute top-0 left-0 h-2 rounded-full transition-all duration-300 ${strengthColors[strength.level]}`}
            style={{ width: `${strength.score}%` }}
          />
        </div>

        <div className='text-xs text-muted-foreground text-center'>
          {strength.score}/100
        </div>
      </div>

      {/* Feedback */}
      {strength.feedback.length > 0 && (
        <Alert>
          <AlertCircle className='w-4 h-4' />
          <AlertDescription>
            <div className='space-y-1'>
              <span className='font-medium'>Sugestões para melhorar:</span>
              <ul className='text-sm space-y-1'>
                {strength.feedback.map((feedback, index) => (
                  <li key={index} className='flex items-center gap-2'>
                    <span className='w-1 h-1 bg-current rounded-full' />
                    {feedback}
                  </li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Requisitos */}
      {showRequirements && (
        <div className='space-y-2'>
          <span className='text-sm font-medium'>Requisitos:</span>
          <div className='grid grid-cols-1 gap-2 text-sm'>
            <RequirementItem
              met={strength.requirements.length}
              text='Pelo menos 12 caracteres'
            />
            <RequirementItem
              met={strength.requirements.uppercase}
              text='Pelo menos uma letra maiúscula'
            />
            <RequirementItem
              met={strength.requirements.lowercase}
              text='Pelo menos uma letra minúscula'
            />
            <RequirementItem
              met={strength.requirements.numbers}
              text='Pelo menos um número'
            />
            <RequirementItem
              met={strength.requirements.special}
              text='Pelo menos um caractere especial'
            />
            <RequirementItem
              met={strength.requirements.noCommon}
              text='Não é uma senha comum'
            />
            <RequirementItem
              met={strength.requirements.noConsecutive}
              text='Sem caracteres repetidos consecutivos'
            />
            {userInfo && (
              <RequirementItem
                met={strength.requirements.noUserInfo}
                text='Não contém informações pessoais'
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface RequirementItemProps {
  met: boolean;
  text: string;
}

const RequirementItem: React.FC<RequirementItemProps> = ({ met, text }) => {
  return (
    <div className='flex items-center gap-2'>
      {met ? (
        <CheckCircle className='w-4 h-4 text-green-500' />
      ) : (
        <XCircle className='w-4 h-4 text-red-500' />
      )}
      <span className={met ? 'text-green-700' : 'text-red-700'}>{text}</span>
    </div>
  );
};

export default PasswordStrengthIndicator;
