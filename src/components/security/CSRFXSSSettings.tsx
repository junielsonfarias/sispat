import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import {
  useCSRFProtection,
  useSecurityProtection,
  useXSSProtection,
} from '@/hooks/useCSRFProtection';
import {
  DEFAULT_CSRF_CONFIG,
  csrfProtectionService,
} from '@/services/csrfProtection';
import {
  DEFAULT_XSS_CONFIG,
  xssProtectionService,
} from '@/services/xssProtection';
import {
  AlertTriangle,
  Bug,
  CheckCircle,
  Copy,
  Download,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

export const CSRFXSSSettings: React.FC = () => {
  const csrf = useCSRFProtection();
  const xss = useXSSProtection();
  const { validateInput } = useSecurityProtection();

  const [csrfConfig, setCsrfConfig] = useState(DEFAULT_CSRF_CONFIG);
  const [xssConfig, setXssConfig] = useState(DEFAULT_XSS_CONFIG);
  const [allowedOrigins, setAllowedOrigins] = useState<string[]>([]);
  const [newOrigin, setNewOrigin] = useState('');
  const [testInput, setTestInput] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCurrentSettings();
  }, []);

  const loadCurrentSettings = async () => {
    setLoading(true);
    try {
      // Simular carregamento das configurações
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Carregar origens permitidas
      const origins = csrfProtectionService.getAllowedOrigins();
      setAllowedOrigins(origins);

      // Carregar estatísticas de tokens
      const stats = csrfProtectionService.getTokenStats();
      console.log('Token stats:', stats);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar configurações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // Atualizar configurações
      csrfProtectionService.updateConfig(csrfConfig);
      xssProtectionService.updateConfig(xssConfig);

      // Simular salvamento
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast({
        title: 'Configurações salvas',
        description: 'Proteções CSRF e XSS foram atualizadas',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao salvar configurações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrigin = () => {
    if (!newOrigin.trim()) return;

    try {
      new URL(newOrigin); // Valida URL
      csrfProtectionService.addAllowedOrigin(newOrigin);
      setAllowedOrigins([...allowedOrigins, newOrigin]);
      setNewOrigin('');

      toast({
        title: 'Origem adicionada',
        description: `${newOrigin} foi adicionado às origens permitidas`,
      });
    } catch (error) {
      toast({
        title: 'URL inválida',
        description: 'Digite uma URL válida (ex: https://exemplo.com)',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveOrigin = (origin: string) => {
    csrfProtectionService.removeAllowedOrigin(origin);
    setAllowedOrigins(allowedOrigins.filter(o => o !== origin));

    toast({
      title: 'Origem removida',
      description: `${origin} foi removido das origens permitidas`,
    });
  };

  const handleTestInput = () => {
    if (!testInput.trim()) return;

    try {
      // Testa XSS
      const xssDetection = xss.detectXSS(testInput);

      // Testa sanitização
      const sanitized = validateInput(testInput, 'html');

      setTestResult({
        xssDetection,
        sanitized,
        original: testInput,
      });
    } catch (error) {
      setTestResult({
        error: error instanceof Error ? error.message : 'Erro no teste',
      });
    }
  };

  const copyToken = () => {
    if (csrf.token) {
      navigator.clipboard.writeText(csrf.token);
      toast({
        title: 'Token copiado',
        description: 'Token CSRF copiado para a área de transferência',
      });
    }
  };

  const regenerateToken = () => {
    csrf.generateToken();
    toast({
      title: 'Token regenerado',
      description: 'Novo token CSRF foi gerado',
    });
  };

  const exportSettings = () => {
    const settings = {
      csrfConfig,
      xssConfig,
      allowedOrigins,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'csrf-xss-settings.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'text-green-600 bg-green-100';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100';
      case 'high':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex justify-between items-center'>
        <div>
          <h1 className='text-2xl font-bold flex items-center gap-2'>
            <Shield className='w-6 h-6' />
            Proteção CSRF & XSS
          </h1>
          <p className='text-muted-foreground'>
            Configure proteções contra ataques CSRF e XSS
          </p>
        </div>

        <div className='flex gap-2'>
          <Button variant='outline' onClick={exportSettings}>
            <Download className='w-4 h-4 mr-2' />
            Exportar
          </Button>
          <Button onClick={handleSaveSettings} disabled={loading}>
            {loading ? (
              <RefreshCw className='w-4 h-4 mr-2 animate-spin' />
            ) : (
              <Shield className='w-4 h-4 mr-2' />
            )}
            Salvar
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Token CSRF</CardTitle>
            <Shield className='w-4 h-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='flex items-center gap-2'>
              <Badge variant={csrf.isValid ? 'default' : 'destructive'}>
                {csrf.isValid ? 'Válido' : 'Inválido'}
              </Badge>
              {csrf.isValid ? (
                <CheckCircle className='w-4 h-4 text-green-500' />
              ) : (
                <AlertTriangle className='w-4 h-4 text-red-500' />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Origens Permitidas
            </CardTitle>
            <CheckCircle className='w-4 h-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{allowedOrigins.length}</div>
            <p className='text-xs text-muted-foreground'>
              Domínios autorizados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Tags Permitidas
            </CardTitle>
            <Bug className='w-4 h-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {xssConfig.allowedTags.length}
            </div>
            <p className='text-xs text-muted-foreground'>Tags HTML seguras</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Último Refresh
            </CardTitle>
            <RefreshCw className='w-4 h-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-sm'>
              {csrf.lastRefresh
                ? csrf.lastRefresh.toLocaleTimeString()
                : 'Nunca'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {csrf.error && (
        <Alert variant='destructive'>
          <AlertTriangle className='w-4 h-4' />
          <AlertDescription>
            <strong>Erro CSRF:</strong> {csrf.error}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue='csrf' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='csrf'>Proteção CSRF</TabsTrigger>
          <TabsTrigger value='xss'>Proteção XSS</TabsTrigger>
          <TabsTrigger value='origins'>Origens Permitidas</TabsTrigger>
          <TabsTrigger value='test'>Teste de Segurança</TabsTrigger>
        </TabsList>

        <TabsContent value='csrf' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Configurações CSRF</CardTitle>
              <CardDescription>
                Configure a proteção contra ataques Cross-Site Request Forgery
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              {/* Token atual */}
              <div className='space-y-3'>
                <Label>Token CSRF Atual</Label>
                <div className='flex gap-2'>
                  <Input
                    value={csrf.token || 'Carregando...'}
                    readOnly
                    className='font-mono text-sm'
                  />
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={copyToken}
                    disabled={!csrf.token}
                  >
                    <Copy className='w-4 h-4' />
                  </Button>
                  <Button variant='outline' size='sm' onClick={regenerateToken}>
                    <RefreshCw className='w-4 h-4' />
                  </Button>
                </div>
              </div>

              {/* Configurações */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div className='space-y-3'>
                  <Label>Nome do Token</Label>
                  <Input
                    value={csrfConfig.tokenName}
                    onChange={e =>
                      setCsrfConfig(prev => ({
                        ...prev,
                        tokenName: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className='space-y-3'>
                  <Label>Nome do Header</Label>
                  <Input
                    value={csrfConfig.headerName}
                    onChange={e =>
                      setCsrfConfig(prev => ({
                        ...prev,
                        headerName: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className='space-y-3'>
                  <Label>Expiração (minutos)</Label>
                  <Input
                    type='number'
                    value={csrfConfig.expiration / 60000}
                    onChange={e =>
                      setCsrfConfig(prev => ({
                        ...prev,
                        expiration: parseInt(e.target.value) * 60000 || 3600000,
                      }))
                    }
                  />
                </div>

                <div className='space-y-3'>
                  <Label>SameSite</Label>
                  <Select
                    value={csrfConfig.sameSite}
                    onValueChange={(value: 'strict' | 'lax' | 'none') =>
                      setCsrfConfig(prev => ({ ...prev, sameSite: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='strict'>Strict</SelectItem>
                      <SelectItem value='lax'>Lax</SelectItem>
                      <SelectItem value='none'>None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Switches */}
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <Label>Double Submit Cookie</Label>
                    <p className='text-sm text-muted-foreground'>
                      Valida token tanto no header quanto no cookie
                    </p>
                  </div>
                  <Switch
                    checked={csrfConfig.doubleSubmitCookie}
                    onCheckedChange={checked =>
                      setCsrfConfig(prev => ({
                        ...prev,
                        doubleSubmitCookie: checked,
                      }))
                    }
                  />
                </div>

                <div className='flex items-center justify-between'>
                  <div>
                    <Label>Validação de Origem</Label>
                    <p className='text-sm text-muted-foreground'>
                      Verifica se a requisição vem de origem permitida
                    </p>
                  </div>
                  <Switch
                    checked={csrfConfig.originValidation}
                    onCheckedChange={checked =>
                      setCsrfConfig(prev => ({
                        ...prev,
                        originValidation: checked,
                      }))
                    }
                  />
                </div>

                <div className='flex items-center justify-between'>
                  <div>
                    <Label>Validação de Referer</Label>
                    <p className='text-sm text-muted-foreground'>
                      Verifica se o referer é de domínio confiável
                    </p>
                  </div>
                  <Switch
                    checked={csrfConfig.refererValidation}
                    onCheckedChange={checked =>
                      setCsrfConfig(prev => ({
                        ...prev,
                        refererValidation: checked,
                      }))
                    }
                  />
                </div>

                <div className='flex items-center justify-between'>
                  <div>
                    <Label>Cookie Seguro</Label>
                    <p className='text-sm text-muted-foreground'>
                      Envia cookie apenas via HTTPS
                    </p>
                  </div>
                  <Switch
                    checked={csrfConfig.secure}
                    onCheckedChange={checked =>
                      setCsrfConfig(prev => ({ ...prev, secure: checked }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='xss' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Configurações XSS</CardTitle>
              <CardDescription>
                Configure a proteção contra ataques Cross-Site Scripting
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <Label>Sanitização na Entrada</Label>
                    <p className='text-sm text-muted-foreground'>
                      Sanitiza dados quando recebidos
                    </p>
                  </div>
                  <Switch
                    checked={xssConfig.sanitizeOnInput}
                    onCheckedChange={checked =>
                      setXssConfig(prev => ({
                        ...prev,
                        sanitizeOnInput: checked,
                      }))
                    }
                  />
                </div>

                <div className='flex items-center justify-between'>
                  <div>
                    <Label>Sanitização na Saída</Label>
                    <p className='text-sm text-muted-foreground'>
                      Sanitiza dados antes de exibir
                    </p>
                  </div>
                  <Switch
                    checked={xssConfig.sanitizeOnOutput}
                    onCheckedChange={checked =>
                      setXssConfig(prev => ({
                        ...prev,
                        sanitizeOnOutput: checked,
                      }))
                    }
                  />
                </div>

                <div className='flex items-center justify-between'>
                  <div>
                    <Label>Manter Conteúdo</Label>
                    <p className='text-sm text-muted-foreground'>
                      Mantém conteúdo de tags removidas
                    </p>
                  </div>
                  <Switch
                    checked={xssConfig.keepContent}
                    onCheckedChange={checked =>
                      setXssConfig(prev => ({ ...prev, keepContent: checked }))
                    }
                  />
                </div>
              </div>

              <div className='space-y-3'>
                <Label>Tags HTML Permitidas</Label>
                <div className='flex flex-wrap gap-2 p-3 border rounded-lg min-h-[100px]'>
                  {xssConfig.allowedTags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant='outline'
                      className='cursor-pointer'
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className='space-y-3'>
                <Label>Atributos Permitidos</Label>
                <div className='flex flex-wrap gap-2 p-3 border rounded-lg min-h-[100px]'>
                  {xssConfig.allowedAttributes.map((attr, index) => (
                    <Badge
                      key={index}
                      variant='secondary'
                      className='cursor-pointer'
                    >
                      {attr}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className='space-y-3'>
                <Label>Protocolos Permitidos</Label>
                <div className='flex flex-wrap gap-2'>
                  {xssConfig.allowedSchemes.map((scheme, index) => (
                    <Badge key={index} variant='default'>
                      {scheme}://
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='origins' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Origens Permitidas</CardTitle>
              <CardDescription>
                Gerencie domínios autorizados para requisições CSRF
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='flex gap-2'>
                <Input
                  placeholder='https://exemplo.com'
                  value={newOrigin}
                  onChange={e => setNewOrigin(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleAddOrigin()}
                />
                <Button onClick={handleAddOrigin}>
                  <Plus className='w-4 h-4 mr-2' />
                  Adicionar
                </Button>
              </div>

              <div className='space-y-2'>
                {allowedOrigins.map((origin, index) => (
                  <div
                    key={index}
                    className='flex items-center justify-between p-3 border rounded-lg'
                  >
                    <span className='font-mono text-sm'>{origin}</span>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleRemoveOrigin(origin)}
                    >
                      <Trash2 className='w-4 h-4' />
                    </Button>
                  </div>
                ))}
              </div>

              {allowedOrigins.length === 0 && (
                <div className='text-center py-8 text-muted-foreground'>
                  <Shield className='w-12 h-12 mx-auto mb-4 opacity-50' />
                  <p>Nenhuma origem configurada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='test' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Teste de Segurança</CardTitle>
              <CardDescription>
                Teste a detecção e sanitização de conteúdo malicioso
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='space-y-3'>
                <Label>Conteúdo de Teste</Label>
                <Textarea
                  placeholder="Digite conteúdo para testar (ex: <script>alert('xss')</script>)"
                  value={testInput}
                  onChange={e => setTestInput(e.target.value)}
                  rows={4}
                />
              </div>

              <Button onClick={handleTestInput} disabled={!testInput.trim()}>
                <Bug className='w-4 h-4 mr-2' />
                Testar Conteúdo
              </Button>

              {testResult && (
                <div className='space-y-4'>
                  {testResult.error ? (
                    <Alert variant='destructive'>
                      <AlertTriangle className='w-4 h-4' />
                      <AlertDescription>{testResult.error}</AlertDescription>
                    </Alert>
                  ) : (
                    <>
                      {/* Detecção XSS */}
                      <div className='space-y-2'>
                        <Label>Detecção XSS</Label>
                        <Alert
                          variant={
                            testResult.xssDetection.detected
                              ? 'destructive'
                              : 'default'
                          }
                        >
                          <AlertDescription>
                            <div className='space-y-2'>
                              <div className='flex items-center gap-2'>
                                <Badge
                                  className={getRiskLevelColor(
                                    testResult.xssDetection.riskLevel
                                  )}
                                >
                                  {testResult.xssDetection.riskLevel.toUpperCase()}
                                </Badge>
                                {testResult.xssDetection.detected ? (
                                  <span className='text-red-600'>
                                    Ameaças detectadas
                                  </span>
                                ) : (
                                  <span className='text-green-600'>
                                    Nenhuma ameaça detectada
                                  </span>
                                )}
                              </div>
                              {testResult.xssDetection.threats.length > 0 && (
                                <div>
                                  <strong>Ameaças:</strong>{' '}
                                  {testResult.xssDetection.threats.join(', ')}
                                </div>
                              )}
                            </div>
                          </AlertDescription>
                        </Alert>
                      </div>

                      {/* Conteúdo Sanitizado */}
                      <div className='space-y-2'>
                        <Label>Conteúdo Sanitizado</Label>
                        <Textarea
                          value={
                            testResult.sanitized.sanitized ||
                            testResult.sanitized
                          }
                          readOnly
                          rows={4}
                          className='font-mono text-sm'
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CSRFXSSSettings;
