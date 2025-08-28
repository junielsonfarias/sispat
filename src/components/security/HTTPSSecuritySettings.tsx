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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Globe,
  Lock,
  Eye,
  RefreshCw,
  Download,
  Copy,
} from 'lucide-react';
import {
  httpSecurityService,
  DEFAULT_HTTPS_CONFIG,
  DEFAULT_CSP_DIRECTIVES,
} from '@/services/httpSecurity';
import { useSecurity, useCSPMonitoring } from '@/hooks/useSecurity';
import { toast } from '@/hooks/use-toast';

export const HTTPSSecuritySettings: React.FC = () => {
  const { securityStatus, violations, recheckSecurity } = useSecurity();
  const { violations: cspViolations, clearViolations } = useCSPMonitoring();

  const [httpsConfig, setHttpsConfig] = useState(DEFAULT_HTTPS_CONFIG);
  const [cspDirectives, setCspDirectives] = useState(DEFAULT_CSP_DIRECTIVES);
  const [loading, setLoading] = useState(false);
  const [testingHeaders, setTestingHeaders] = useState(false);

  useEffect(() => {
    loadCurrentConfiguration();
  }, []);

  const loadCurrentConfiguration = async () => {
    setLoading(true);
    try {
      // Simular carregamento da configuração atual
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Em produção, carregar do backend
      const report = httpSecurityService.generateSecurityReport();
      setHttpsConfig(report.httpsConfig);
      setCspDirectives(report.cspDirectives);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar configurações de segurança',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfiguration = async () => {
    setLoading(true);
    try {
      // Atualizar serviço
      httpSecurityService.updateHTTPSConfig(httpsConfig);
      httpSecurityService.updateCSPDirectives(cspDirectives);

      // Simular salvamento no backend
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast({
        title: 'Configuração salva',
        description: 'Headers de segurança foram atualizados com sucesso',
      });

      // Recarregar página para aplicar novos headers
      setTimeout(() => {
        window.location.reload();
      }, 1000);
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

  const testSecurityHeaders = async () => {
    setTestingHeaders(true);
    try {
      // Simular teste dos headers
      await new Promise(resolve => setTimeout(resolve, 2000));

      const report = httpSecurityService.generateSecurityReport();
      const { valid, warnings } = report.validation;

      if (valid) {
        toast({
          title: 'Teste bem-sucedido',
          description:
            'Todos os headers de segurança estão configurados corretamente',
        });
      } else {
        toast({
          title: 'Avisos encontrados',
          description: `${warnings.length} problema(s) de configuração detectado(s)`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro no teste',
        description: 'Falha ao testar headers de segurança',
        variant: 'destructive',
      });
    } finally {
      setTestingHeaders(false);
    }
  };

  const copyHeadersToClipboard = () => {
    const headers = httpSecurityService.generateSecurityHeaders();
    const headersText = Object.entries(headers)
      .map(([name, value]) => `${name}: ${value}`)
      .join('\n');

    navigator.clipboard.writeText(headersText);
    toast({
      title: 'Copiado!',
      description: 'Headers de segurança copiados para a área de transferência',
    });
  };

  const exportConfiguration = () => {
    const config = {
      httpsConfig,
      cspDirectives,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'https-security-config.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const addCSPSource = (
    directive: keyof typeof cspDirectives,
    source: string
  ) => {
    if (!source.trim()) return;

    setCspDirectives(prev => ({
      ...prev,
      [directive]: Array.isArray(prev[directive])
        ? [...(prev[directive] as string[]), source.trim()]
        : prev[directive],
    }));
  };

  const removeCSPSource = (
    directive: keyof typeof cspDirectives,
    index: number
  ) => {
    setCspDirectives(prev => ({
      ...prev,
      [directive]: Array.isArray(prev[directive])
        ? (prev[directive] as string[]).filter((_, i) => i !== index)
        : prev[directive],
    }));
  };

  const getSecurityScore = () => {
    const report = httpSecurityService.generateSecurityReport();
    const { warnings } = report.validation;
    const baseScore = 100;
    const penaltyPerWarning = 10;
    return Math.max(0, baseScore - warnings.length * penaltyPerWarning);
  };

  if (loading && !httpsConfig) {
    return (
      <div className='flex items-center justify-center p-8'>
        <RefreshCw className='w-6 h-6 animate-spin mr-2' />
        Carregando configurações de segurança...
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex justify-between items-center'>
        <div>
          <h1 className='text-2xl font-bold flex items-center gap-2'>
            <Globe className='w-6 h-6' />
            Segurança HTTPS e Headers
          </h1>
          <p className='text-muted-foreground'>
            Configure headers de segurança HTTP e políticas HTTPS
          </p>
        </div>

        <div className='flex gap-2'>
          <Button variant='outline' onClick={copyHeadersToClipboard}>
            <Copy className='w-4 h-4 mr-2' />
            Copiar Headers
          </Button>
          <Button variant='outline' onClick={exportConfiguration}>
            <Download className='w-4 h-4 mr-2' />
            Exportar
          </Button>
          <Button
            variant='outline'
            onClick={testSecurityHeaders}
            disabled={testingHeaders}
          >
            {testingHeaders ? (
              <RefreshCw className='w-4 h-4 mr-2 animate-spin' />
            ) : (
              <Eye className='w-4 h-4 mr-2' />
            )}
            Testar
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Contexto Seguro
            </CardTitle>
            <Shield className='w-4 h-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='flex items-center gap-2'>
              <Badge
                variant={
                  securityStatus.isSecureContext ? 'default' : 'destructive'
                }
              >
                {securityStatus.isSecureContext ? 'HTTPS' : 'HTTP'}
              </Badge>
              {securityStatus.isSecureContext ? (
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
              Headers Aplicados
            </CardTitle>
            <Lock className='w-4 h-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='flex items-center gap-2'>
              <Badge
                variant={
                  securityStatus.headersApplied ? 'default' : 'destructive'
                }
              >
                {securityStatus.headersApplied ? 'Ativo' : 'Inativo'}
              </Badge>
              {securityStatus.headersApplied ? (
                <CheckCircle className='w-4 h-4 text-green-500' />
              ) : (
                <AlertTriangle className='w-4 h-4 text-red-500' />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Violações CSP</CardTitle>
            <AlertTriangle className='w-4 h-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-red-600'>
              {cspViolations.length}
            </div>
            <p className='text-xs text-muted-foreground'>Últimas 24 horas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Score de Segurança
            </CardTitle>
            <Shield className='w-4 h-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                getSecurityScore() >= 90
                  ? 'text-green-600'
                  : getSecurityScore() >= 70
                    ? 'text-yellow-600'
                    : 'text-red-600'
              }`}
            >
              {getSecurityScore()}/100
            </div>
            <p className='text-xs text-muted-foreground'>
              Baseado na configuração atual
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {!securityStatus.isSecureContext && (
        <Alert variant='destructive'>
          <AlertTriangle className='w-4 h-4' />
          <AlertDescription>
            <strong>Atenção:</strong> O site não está sendo servido via HTTPS.
            Isso pode comprometer a segurança dos dados dos usuários.
          </AlertDescription>
        </Alert>
      )}

      {cspViolations.length > 0 && (
        <Alert>
          <AlertTriangle className='w-4 h-4' />
          <AlertDescription>
            <strong>Violações CSP detectadas:</strong> {cspViolations.length}{' '}
            violação(ões) da Política de Segurança de Conteúdo foram
            registradas.
            <Button
              variant='link'
              size='sm'
              onClick={clearViolations}
              className='ml-2'
            >
              Limpar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue='https' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='https'>Configuração HTTPS</TabsTrigger>
          <TabsTrigger value='csp'>Content Security Policy</TabsTrigger>
          <TabsTrigger value='headers'>Headers de Segurança</TabsTrigger>
          <TabsTrigger value='violations'>Violações</TabsTrigger>
        </TabsList>

        <TabsContent value='https' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Configurações HTTPS</CardTitle>
              <CardDescription>
                Configure a imposição de HTTPS e HSTS (HTTP Strict Transport
                Security)
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='flex items-center justify-between'>
                <div className='space-y-0.5'>
                  <Label>Impor HTTPS</Label>
                  <p className='text-sm text-muted-foreground'>
                    Redireciona automaticamente HTTP para HTTPS
                  </p>
                </div>
                <Switch
                  checked={httpsConfig.enforceHTTPS}
                  onCheckedChange={checked =>
                    setHttpsConfig(prev => ({ ...prev, enforceHTTPS: checked }))
                  }
                />
              </div>

              <div className='space-y-3'>
                <Label>HSTS Max-Age (segundos)</Label>
                <Input
                  type='number'
                  value={httpsConfig.hstsMaxAge}
                  onChange={e =>
                    setHttpsConfig(prev => ({
                      ...prev,
                      hstsMaxAge: parseInt(e.target.value) || 0,
                    }))
                  }
                  placeholder='31536000'
                />
                <p className='text-xs text-muted-foreground'>
                  Recomendado: 31536000 (1 ano) ou 63072000 (2 anos)
                </p>
              </div>

              <div className='flex items-center justify-between'>
                <div className='space-y-0.5'>
                  <Label>Incluir Subdomínios</Label>
                  <p className='text-sm text-muted-foreground'>
                    Aplica HSTS a todos os subdomínios
                  </p>
                </div>
                <Switch
                  checked={httpsConfig.hstsIncludeSubdomains}
                  onCheckedChange={checked =>
                    setHttpsConfig(prev => ({
                      ...prev,
                      hstsIncludeSubdomains: checked,
                    }))
                  }
                />
              </div>

              <div className='flex items-center justify-between'>
                <div className='space-y-0.5'>
                  <Label>HSTS Preload</Label>
                  <p className='text-sm text-muted-foreground'>
                    Inclui o domínio na lista de preload dos navegadores
                  </p>
                </div>
                <Switch
                  checked={httpsConfig.hstsPreload}
                  onCheckedChange={checked =>
                    setHttpsConfig(prev => ({ ...prev, hstsPreload: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='csp' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Content Security Policy</CardTitle>
              <CardDescription>
                Configure as políticas de segurança de conteúdo para prevenir
                XSS e injeção de código
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              {Object.entries(cspDirectives).map(([directive, value]) => {
                if (typeof value === 'boolean') {
                  return (
                    <div
                      key={directive}
                      className='flex items-center justify-between'
                    >
                      <div className='space-y-0.5'>
                        <Label>
                          {directive.replace(/([A-Z])/g, '-$1').toLowerCase()}
                        </Label>
                      </div>
                      <Switch
                        checked={value}
                        onCheckedChange={checked =>
                          setCspDirectives(prev => ({
                            ...prev,
                            [directive]: checked,
                          }))
                        }
                      />
                    </div>
                  );
                }

                if (Array.isArray(value)) {
                  return (
                    <div key={directive} className='space-y-3'>
                      <Label>
                        {directive.replace(/([A-Z])/g, '-$1').toLowerCase()}
                      </Label>
                      <div className='flex flex-wrap gap-2'>
                        {value.map((source, index) => (
                          <Badge
                            key={index}
                            variant='outline'
                            className='cursor-pointer'
                            onClick={() =>
                              removeCSPSource(
                                directive as keyof typeof cspDirectives,
                                index
                              )
                            }
                          >
                            {source} ×
                          </Badge>
                        ))}
                      </div>
                      <div className='flex gap-2'>
                        <Input
                          placeholder='Adicionar fonte (ex: https://exemplo.com)'
                          onKeyPress={e => {
                            if (e.key === 'Enter') {
                              const input = e.target as HTMLInputElement;
                              addCSPSource(
                                directive as keyof typeof cspDirectives,
                                input.value
                              );
                              input.value = '';
                            }
                          }}
                        />
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={e => {
                            const input = (e.target as HTMLElement)
                              .previousElementSibling as HTMLInputElement;
                            addCSPSource(
                              directive as keyof typeof cspDirectives,
                              input.value
                            );
                            input.value = '';
                          }}
                        >
                          Adicionar
                        </Button>
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='headers' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Headers de Segurança Gerados</CardTitle>
              <CardDescription>
                Visualize os headers de segurança que serão aplicados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                {Object.entries(
                  httpSecurityService.generateSecurityHeaders()
                ).map(([name, value]) => (
                  <div key={name} className='space-y-1'>
                    <Label className='font-mono text-sm'>{name}</Label>
                    <Textarea
                      value={value}
                      readOnly
                      className='font-mono text-xs resize-none'
                      rows={Math.min(Math.ceil(value.length / 80), 4)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='violations' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Violações de Segurança</CardTitle>
              <CardDescription>
                Monitore violações CSP e outros problemas de segurança em tempo
                real
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cspViolations.length === 0 ? (
                <div className='text-center py-8 text-muted-foreground'>
                  <CheckCircle className='w-12 h-12 mx-auto mb-4 text-green-500' />
                  <p>Nenhuma violação detectada</p>
                </div>
              ) : (
                <div className='space-y-3'>
                  {cspViolations.slice(-10).map((violation, index) => (
                    <Alert key={index}>
                      <AlertTriangle className='w-4 h-4' />
                      <AlertDescription>
                        <div className='space-y-1'>
                          <p>
                            <strong>{violation.type.toUpperCase()}:</strong>{' '}
                            {violation.message}
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            Fonte: {violation.source} •{' '}
                            {violation.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}

                  {cspViolations.length > 10 && (
                    <p className='text-sm text-muted-foreground text-center'>
                      Mostrando últimas 10 violações de {cspViolations.length}{' '}
                      total
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className='flex justify-end gap-2'>
        <Button variant='outline' onClick={recheckSecurity}>
          <RefreshCw className='w-4 h-4 mr-2' />
          Verificar Status
        </Button>
        <Button onClick={handleSaveConfiguration} disabled={loading}>
          {loading ? (
            <RefreshCw className='w-4 h-4 mr-2 animate-spin' />
          ) : (
            <Shield className='w-4 h-4 mr-2' />
          )}
          Salvar Configuração
        </Button>
      </div>
    </div>
  );
};

export default HTTPSSecuritySettings;
