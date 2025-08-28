import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  Key,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Download,
  Upload,
} from 'lucide-react';
import {
  SENSITIVE_FIELDS_CONFIG,
  encryptionService,
  encryptionUtils,
} from '@/services/encryption';
import { toast } from '@/hooks/use-toast';

interface EncryptionStatus {
  totalFields: number;
  encryptedFields: number;
  lastRotation: Date;
  nextRotation: Date;
  keyStrength: number;
}

export const EncryptionSettings: React.FC = () => {
  const [encryptionStatus, setEncryptionStatus] =
    useState<EncryptionStatus | null>(null);
  const [fieldConfigs, setFieldConfigs] = useState(SENSITIVE_FIELDS_CONFIG);
  const [loading, setLoading] = useState(false);
  const [showMasterKey, setShowMasterKey] = useState(false);
  const [rotatingKey, setRotatingKey] = useState(false);

  useEffect(() => {
    loadEncryptionStatus();
  }, []);

  const loadEncryptionStatus = async () => {
    setLoading(true);
    try {
      // Simular carregamento do status
      await new Promise(resolve => setTimeout(resolve, 1000));

      const totalFields = Object.values(SENSITIVE_FIELDS_CONFIG).reduce(
        (sum, config) => sum + config.fields.length,
        0
      );

      const encryptedFields = Object.values(SENSITIVE_FIELDS_CONFIG)
        .filter(config => config.enabled)
        .reduce((sum, config) => sum + config.fields.length, 0);

      setEncryptionStatus({
        totalFields,
        encryptedFields,
        lastRotation: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 dias atrás
        nextRotation: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 dias à frente
        keyStrength: 95,
      });
    } catch (error) {
      console.error('Erro ao carregar status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldConfigChange = (entityType: string, enabled: boolean) => {
    setFieldConfigs(prev => ({
      ...prev,
      [entityType]: {
        ...prev[entityType],
        enabled,
      },
    }));

    toast({
      title: enabled ? 'Criptografia ativada' : 'Criptografia desativada',
      description: `Campos de ${entityType} ${enabled ? 'serão' : 'não serão'} criptografados`,
    });
  };

  const handleRotateKey = async () => {
    setRotatingKey(true);
    try {
      // Simular rotação de chave
      await new Promise(resolve => setTimeout(resolve, 3000));

      const newKey = encryptionUtils.generateMasterKey();
      encryptionService.rotateKey(newKey);

      // Atualizar status
      if (encryptionStatus) {
        setEncryptionStatus({
          ...encryptionStatus,
          lastRotation: new Date(),
          nextRotation: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          keyStrength: 100,
        });
      }

      toast({
        title: 'Chave rotacionada com sucesso',
        description: 'Nova chave de criptografia foi gerada e aplicada',
      });
    } catch (error) {
      toast({
        title: 'Erro na rotação',
        description: 'Falha ao rotacionar chave de criptografia',
        variant: 'destructive',
      });
    } finally {
      setRotatingKey(false);
    }
  };

  const exportConfiguration = () => {
    const config = {
      fieldConfigs,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'encryption-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getEncryptionPercentage = () => {
    if (!encryptionStatus) return 0;
    return (
      (encryptionStatus.encryptedFields / encryptionStatus.totalFields) * 100
    );
  };

  const getKeyStrengthColor = (strength: number) => {
    if (strength >= 90) return 'text-green-600';
    if (strength >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDaysUntilRotation = () => {
    if (!encryptionStatus) return 0;
    return Math.ceil(
      (encryptionStatus.nextRotation.getTime() - Date.now()) /
        (24 * 60 * 60 * 1000)
    );
  };

  if (loading) {
    return (
      <div className='flex items-center justify-center p-8'>
        <RefreshCw className='w-6 h-6 animate-spin mr-2' />
        Carregando configurações de criptografia...
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex justify-between items-center'>
        <div>
          <h1 className='text-2xl font-bold flex items-center gap-2'>
            <Lock className='w-6 h-6' />
            Configurações de Criptografia
          </h1>
          <p className='text-muted-foreground'>
            Gerencie a proteção de dados sensíveis do sistema
          </p>
        </div>

        <div className='flex gap-2'>
          <Button variant='outline' onClick={exportConfiguration}>
            <Download className='w-4 h-4 mr-2' />
            Exportar
          </Button>
          <Button variant='outline' onClick={loadEncryptionStatus}>
            <RefreshCw className='w-4 h-4 mr-2' />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      {encryptionStatus && (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Campos Protegidos
              </CardTitle>
              <Shield className='w-4 h-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {encryptionStatus.encryptedFields}/
                {encryptionStatus.totalFields}
              </div>
              <div className='flex items-center gap-2 mt-2'>
                <Progress
                  value={getEncryptionPercentage()}
                  className='flex-1'
                />
                <span className='text-xs text-muted-foreground'>
                  {getEncryptionPercentage().toFixed(0)}%
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Força da Chave
              </CardTitle>
              <Key className='w-4 h-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${getKeyStrengthColor(encryptionStatus.keyStrength)}`}
              >
                {encryptionStatus.keyStrength}%
              </div>
              <p className='text-xs text-muted-foreground'>
                {encryptionStatus.keyStrength >= 90
                  ? 'Excelente'
                  : encryptionStatus.keyStrength >= 70
                    ? 'Boa'
                    : 'Necessita rotação'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Última Rotação
              </CardTitle>
              <RefreshCw className='w-4 h-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>
                {Math.ceil(
                  (Date.now() - encryptionStatus.lastRotation.getTime()) /
                    (24 * 60 * 60 * 1000)
                )}
                d
              </div>
              <p className='text-xs text-muted-foreground'>
                {encryptionStatus.lastRotation.toLocaleDateString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                Próxima Rotação
              </CardTitle>
              <AlertTriangle className='w-4 h-4 text-muted-foreground' />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${getDaysUntilRotation() < 30 ? 'text-orange-600' : ''}`}
              >
                {getDaysUntilRotation()}d
              </div>
              <p className='text-xs text-muted-foreground'>
                {encryptionStatus.nextRotation.toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts */}
      {encryptionStatus && getDaysUntilRotation() < 30 && (
        <Alert>
          <AlertTriangle className='w-4 h-4' />
          <AlertDescription>
            <strong>Atenção:</strong> A rotação da chave de criptografia está
            próxima. Recomendamos fazer a rotação em breve para manter a
            segurança dos dados.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue='fields' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='fields'>Campos Sensíveis</TabsTrigger>
          <TabsTrigger value='keys'>Gerenciamento de Chaves</TabsTrigger>
          <TabsTrigger value='settings'>Configurações Avançadas</TabsTrigger>
        </TabsList>

        <TabsContent value='fields' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Configuração de Campos Sensíveis</CardTitle>
              <CardDescription>
                Defina quais campos devem ser criptografados para cada tipo de
                entidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-6'>
                {Object.entries(fieldConfigs).map(([entityType, config]) => (
                  <div key={entityType} className='space-y-3'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <h3 className='font-medium capitalize'>{entityType}</h3>
                        <p className='text-sm text-muted-foreground'>
                          {config.fields.length} campo(s) • Rotação a cada{' '}
                          {config.rotationInterval} dias
                        </p>
                      </div>
                      <div className='flex items-center gap-3'>
                        <Badge
                          variant={config.enabled ? 'default' : 'secondary'}
                        >
                          {config.enabled ? 'Ativo' : 'Inativo'}
                        </Badge>
                        <Switch
                          checked={config.enabled}
                          onCheckedChange={enabled =>
                            handleFieldConfigChange(entityType, enabled)
                          }
                        />
                      </div>
                    </div>

                    <div className='flex flex-wrap gap-2'>
                      {config.fields.map(field => (
                        <Badge
                          key={field}
                          variant='outline'
                          className='text-xs'
                        >
                          {config.enabled ? (
                            <Lock className='w-3 h-3 mr-1' />
                          ) : (
                            <Unlock className='w-3 h-3 mr-1' />
                          )}
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='keys' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Gerenciamento de Chaves</CardTitle>
              <CardDescription>
                Controle as chaves de criptografia e realize rotações de
                segurança
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              {/* Master Key Status */}
              <div className='space-y-3'>
                <Label>Chave Mestre Atual</Label>
                <div className='flex items-center gap-2'>
                  <div className='flex-1 font-mono text-sm bg-muted p-2 rounded'>
                    {showMasterKey
                      ? '***MASTER_KEY_HIDDEN_FOR_SECURITY***'
                      : '••••••••••••••••••••••••••••••••'}
                  </div>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setShowMasterKey(!showMasterKey)}
                  >
                    {showMasterKey ? (
                      <EyeOff className='w-4 h-4' />
                    ) : (
                      <Eye className='w-4 h-4' />
                    )}
                  </Button>
                </div>
              </div>

              {/* Key Rotation */}
              <div className='space-y-3'>
                <Label>Rotação de Chave</Label>
                <div className='flex items-center gap-4'>
                  <Button
                    onClick={handleRotateKey}
                    disabled={rotatingKey}
                    variant={
                      getDaysUntilRotation() < 30 ? 'default' : 'outline'
                    }
                  >
                    {rotatingKey ? (
                      <RefreshCw className='w-4 h-4 mr-2 animate-spin' />
                    ) : (
                      <Key className='w-4 h-4 mr-2' />
                    )}
                    {rotatingKey ? 'Rotacionando...' : 'Rotacionar Chave'}
                  </Button>

                  {getDaysUntilRotation() < 30 && (
                    <Alert className='flex-1'>
                      <AlertTriangle className='w-4 h-4' />
                      <AlertDescription className='text-sm'>
                        Rotação recomendada em {getDaysUntilRotation()} dias
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <p className='text-xs text-muted-foreground'>
                  A rotação de chave irá re-criptografar todos os dados
                  sensíveis com uma nova chave. Este processo pode levar alguns
                  minutos dependendo do volume de dados.
                </p>
              </div>

              {/* Key Backup */}
              <div className='space-y-3'>
                <Label>Backup de Chaves</Label>
                <div className='flex gap-2'>
                  <Button variant='outline'>
                    <Download className='w-4 h-4 mr-2' />
                    Exportar Chaves
                  </Button>
                  <Button variant='outline'>
                    <Upload className='w-4 h-4 mr-2' />
                    Importar Chaves
                  </Button>
                </div>
                <Alert>
                  <Shield className='w-4 h-4' />
                  <AlertDescription className='text-sm'>
                    <strong>Importante:</strong> Mantenha backups seguros das
                    chaves em local separado e criptografado. Sem as chaves, os
                    dados não podem ser recuperados.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='settings' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Configurações Avançadas</CardTitle>
              <CardDescription>
                Ajustes técnicos para otimização de performance e segurança
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div className='space-y-3'>
                  <Label>Algoritmo de Criptografia</Label>
                  <Select defaultValue='AES-256'>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='AES-256'>
                        AES-256-CBC (Recomendado)
                      </SelectItem>
                      <SelectItem value='AES-192'>AES-192-CBC</SelectItem>
                      <SelectItem value='AES-128'>AES-128-CBC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-3'>
                  <Label>Iterações PBKDF2</Label>
                  <Select defaultValue='10000'>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='5000'>5,000 (Rápido)</SelectItem>
                      <SelectItem value='10000'>10,000 (Padrão)</SelectItem>
                      <SelectItem value='50000'>50,000 (Seguro)</SelectItem>
                      <SelectItem value='100000'>
                        100,000 (Máxima Segurança)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-3'>
                  <Label>Rotação Automática</Label>
                  <div className='flex items-center space-x-2'>
                    <Switch defaultChecked />
                    <span className='text-sm'>
                      Ativar rotação automática de chaves
                    </span>
                  </div>
                </div>

                <div className='space-y-3'>
                  <Label>Cache de Chaves</Label>
                  <div className='flex items-center space-x-2'>
                    <Switch defaultChecked />
                    <span className='text-sm'>
                      Cache para melhor performance
                    </span>
                  </div>
                </div>
              </div>

              <Alert>
                <CheckCircle className='w-4 h-4' />
                <AlertDescription>
                  <strong>Status:</strong> Todas as configurações estão
                  otimizadas para máxima segurança e performance adequada.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EncryptionSettings;
