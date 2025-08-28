import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/hooks/use-toast';
import {
  calculatePasswordStrength,
  DEFAULT_PASSWORD_POLICY,
  generateSecurePassword,
} from '@/services/passwordPolicy';
import { Copy, Eye, EyeOff, RefreshCw } from 'lucide-react';
import React, { useState } from 'react';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';

interface PasswordGeneratorProps {
  onPasswordGenerated?: (password: string) => void;
  className?: string;
}

export const PasswordGenerator: React.FC<PasswordGeneratorProps> = ({
  onPasswordGenerated,
  className = '',
}) => {
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [length, setLength] = useState([16]);
  const [options, setOptions] = useState({
    uppercase: true,
    lowercase: true,
    numbers: true,
    special: true,
  });

  const generatePassword = () => {
    const policy = {
      ...DEFAULT_PASSWORD_POLICY,
      requireUppercase: options.uppercase,
      requireLowercase: options.lowercase,
      requireNumbers: options.numbers,
      requireSpecialChars: options.special,
    };

    const password = generateSecurePassword(length[0], policy);
    setGeneratedPassword(password);

    if (onPasswordGenerated) {
      onPasswordGenerated(password);
    }
  };

  const copyToClipboard = () => {
    if (!generatedPassword) return;

    navigator.clipboard.writeText(generatedPassword);
    toast({
      title: 'Copiado!',
      description: 'Senha copiada para a área de transferência',
    });
  };

  const usePassword = () => {
    if (!generatedPassword || !onPasswordGenerated) return;

    onPasswordGenerated(generatedPassword);
    toast({
      title: 'Senha aplicada!',
      description: 'A senha gerada foi aplicada ao campo',
    });
  };

  const strength = generatedPassword
    ? calculatePasswordStrength(generatedPassword)
    : null;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <RefreshCw className='w-5 h-5' />
          Gerador de Senhas Seguras
        </CardTitle>
        <CardDescription>
          Crie senhas fortes e seguras automaticamente
        </CardDescription>
      </CardHeader>

      <CardContent className='space-y-6'>
        {/* Configurações */}
        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label>Comprimento: {length[0]} caracteres</Label>
            <Slider
              value={length}
              onValueChange={setLength}
              max={50}
              min={8}
              step={1}
              className='w-full'
            />
            <div className='flex justify-between text-xs text-muted-foreground'>
              <span>8</span>
              <span>50</span>
            </div>
          </div>

          <div className='space-y-3'>
            <Label>Incluir:</Label>
            <div className='grid grid-cols-2 gap-3'>
              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='uppercase'
                  checked={options.uppercase}
                  onCheckedChange={checked =>
                    setOptions(prev => ({ ...prev, uppercase: !!checked }))
                  }
                />
                <Label htmlFor='uppercase' className='text-sm'>
                  Maiúsculas (A-Z)
                </Label>
              </div>

              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='lowercase'
                  checked={options.lowercase}
                  onCheckedChange={checked =>
                    setOptions(prev => ({ ...prev, lowercase: !!checked }))
                  }
                />
                <Label htmlFor='lowercase' className='text-sm'>
                  Minúsculas (a-z)
                </Label>
              </div>

              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='numbers'
                  checked={options.numbers}
                  onCheckedChange={checked =>
                    setOptions(prev => ({ ...prev, numbers: !!checked }))
                  }
                />
                <Label htmlFor='numbers' className='text-sm'>
                  Números (0-9)
                </Label>
              </div>

              <div className='flex items-center space-x-2'>
                <Checkbox
                  id='special'
                  checked={options.special}
                  onCheckedChange={checked =>
                    setOptions(prev => ({ ...prev, special: !!checked }))
                  }
                />
                <Label htmlFor='special' className='text-sm'>
                  Especiais (!@#$...)
                </Label>
              </div>
            </div>
          </div>
        </div>

        {/* Botão Gerar */}
        <Button
          onClick={generatePassword}
          className='w-full'
          disabled={!Object.values(options).some(Boolean)}
        >
          <RefreshCw className='w-4 h-4 mr-2' />
          Gerar Senha
        </Button>

        {/* Senha Gerada */}
        {generatedPassword && (
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label>Senha Gerada:</Label>
              <div className='flex gap-2'>
                <div className='relative flex-1'>
                  <Input
                    value={generatedPassword}
                    type={showPassword ? 'text' : 'password'}
                    readOnly
                    className='font-mono pr-10'
                  />
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='absolute right-0 top-0 h-full px-3'
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className='w-4 h-4' />
                    ) : (
                      <Eye className='w-4 h-4' />
                    )}
                  </Button>
                </div>

                <Button variant='outline' size='icon' onClick={copyToClipboard}>
                  <Copy className='w-4 h-4' />
                </Button>
              </div>
            </div>

            {/* Indicador de Força */}
            {strength && (
              <PasswordStrengthIndicator
                password={generatedPassword}
                showRequirements={false}
              />
            )}

            {/* Ações */}
            {onPasswordGenerated && (
              <div className='flex gap-2'>
                <Button onClick={usePassword} className='flex-1'>
                  Usar Esta Senha
                </Button>
                <Button variant='outline' onClick={generatePassword}>
                  <RefreshCw className='w-4 h-4' />
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Dicas de Segurança */}
        <div className='text-xs text-muted-foreground space-y-1'>
          <p>
            <strong>Dica:</strong> Use um gerenciador de senhas para armazenar
            com segurança
          </p>
          <p>
            <strong>Recomendação:</strong> Ative a autenticação de dois fatores
            sempre que possível
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PasswordGenerator;
