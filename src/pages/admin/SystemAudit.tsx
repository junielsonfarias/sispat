import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Database,
  Globe,
  Settings,
  Users,
  Building2,
  MapPin,
  Package,
  Navigation,
  Zap,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/services/api';

interface AuditResult {
  timestamp: string;
  user: {
    id: string;
    name: string;
    role: string;
    municipality_id: string;
  };
  database: {
    tables: Record<string, any>;
    relationships: Record<string, any>;
    data_integrity: Record<string, any>;
  };
  api_endpoints: Record<string, any>;
  frontend_integration: Record<string, any>;
  errors: string[];
  warnings: string[];
  recommendations: string[];
  summary: {
    total_errors: number;
    total_warnings: number;
    total_recommendations: number;
    system_status: 'HEALTHY' | 'NEEDS_ATTENTION';
  };
}

interface TestResult {
  timestamp: string;
  tests: Record<string, any>;
  summary?: {
    total_tests: number;
    passed: number;
    failed: number;
    errors: string[];
  };
}

export default function SystemAudit() {
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [navigationResult, setNavigationResult] = useState<any>(null);
  const [completeTestResult, setCompleteTestResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const { toast } = useToast();

  const testConnection = async () => {
    try {
      console.log('🧪 Testando conexão com a API...');
      const response = await api.get('/debug/test');
      console.log('✅ Teste de conexão:', response);
      toast({
        title: 'Conexão OK',
        description: 'API está funcionando corretamente',
        variant: 'default',
      });
    } catch (error: any) {
      console.error('❌ Erro no teste de conexão:', error);
      toast({
        title: 'Erro de Conexão',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const runAudit = async () => {
    setIsLoading(true);
    try {
      console.log('🔍 Iniciando auditoria...');
      const response = await api.get('/debug/audit');
      console.log('📊 Resultado da auditoria:', response);
      setAuditResult(response);

      const status = response.summary.system_status;
      const errorCount = response.summary.total_errors;
      const warningCount = response.summary.total_warnings;

      toast({
        title: status === 'HEALTHY' ? 'Sistema Saudável' : 'Atenção Necessária',
        description: `${errorCount} erros, ${warningCount} avisos encontrados`,
        variant: status === 'HEALTHY' ? 'default' : 'destructive',
      });
    } catch (error: any) {
      console.error('Erro na auditoria:', error);
      toast({
        title: 'Erro na Auditoria',
        description: error.response?.data?.error || 'Erro interno do servidor',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const runTests = async () => {
    setIsTesting(true);
    try {
      const response = await api.post('/debug/test-create', {});
      setTestResult(response);

      const hasErrors = Object.values(response.tests).some(
        (test: any) => test.status === 'ERROR'
      );

      toast({
        title: hasErrors ? 'Testes com Erros' : 'Testes Concluídos',
        description: hasErrors
          ? 'Alguns testes falharam'
          : 'Todos os testes passaram',
        variant: hasErrors ? 'destructive' : 'default',
      });
    } catch (error: any) {
      console.error('Erro nos testes:', error);
      toast({
        title: 'Erro nos Testes',
        description: error.response?.data?.error || 'Erro interno do servidor',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const runCRUDTests = async () => {
    setIsTesting(true);
    try {
      const response = await api.post('/debug/test-crud-operations', {});
      setTestResult(response.results);

      const { summary } = response.results;
      const hasErrors = summary.failed > 0 || summary.errors.length > 0;

      toast({
        title: hasErrors ? 'Testes CRUD com Falhas' : 'Testes CRUD Concluídos',
        description: `${summary.passed}/${summary.total_tests} operações bem-sucedidas`,
        variant: hasErrors ? 'destructive' : 'default',
      });
    } catch (error: any) {
      console.error('Erro nos testes CRUD:', error);
      toast({
        title: 'Erro nos Testes CRUD',
        description: error.response?.data?.error || 'Erro interno do servidor',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const runNavigationTests = async () => {
    setIsTesting(true);
    try {
      const response = await api.post('/debug/test-menu-navigation', {});
      setTestResult(response.results);

      const { summary } = response.results;
      const hasErrors = summary.failed > 0 || summary.errors.length > 0;

      toast({
        title: hasErrors
          ? 'Testes de Navegação com Falhas'
          : 'Testes de Navegação Concluídos',
        description: `${summary.passed}/${summary.total_tests} funcionalidades testadas com sucesso`,
        variant: hasErrors ? 'destructive' : 'default',
      });
    } catch (error: any) {
      console.error('Erro nos testes de navegação:', error);
      toast({
        title: 'Erro nos Testes de Navegação',
        description: error.response?.data?.error || 'Erro interno do servidor',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const runCompleteSystemTest = async () => {
    setIsTesting(true);
    try {
      const response = await api.post('/debug/test-complete-system', {});
      setCompleteTestResult(response.results);

      const { summary } = response.results;
      const hasErrors = summary.failed > 0 || summary.critical_errors > 0;

      toast({
        title: hasErrors
          ? 'Teste Completo com Falhas'
          : 'Teste Completo Concluído',
        description: `Duração: ${Math.round(summary.duration / 1000)}s | ${summary.passed}/${summary.total_operations} operações bem-sucedidas`,
        variant: hasErrors ? 'destructive' : 'default',
      });
    } catch (error: any) {
      console.error('Erro no teste completo do sistema:', error);
      toast({
        title: 'Erro no Teste Completo',
        description: error.response?.data?.error || 'Erro interno do servidor',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OK':
      case 'SUCCESS':
      case 'HEALTHY':
        return <CheckCircle className='h-4 w-4 text-green-500' />;
      case 'ERROR':
      case 'NEEDS_ATTENTION':
        return <XCircle className='h-4 w-4 text-red-500' />;
      case 'WARNING':
        return <AlertTriangle className='h-4 w-4 text-yellow-500' />;
      default:
        return <Info className='h-4 w-4 text-blue-500' />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OK':
      case 'SUCCESS':
      case 'HEALTHY':
        return (
          <Badge variant='default' className='bg-green-500'>
            Saudável
          </Badge>
        );
      case 'ERROR':
      case 'NEEDS_ATTENTION':
        return <Badge variant='destructive'>Erro</Badge>;
      case 'WARNING':
        return (
          <Badge variant='secondary' className='bg-yellow-500'>
            Aviso
          </Badge>
        );
      default:
        return <Badge variant='outline'>Desconhecido</Badge>;
    }
  };

  return (
    <div className='container mx-auto p-6 space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Auditoria do Sistema</h1>
          <p className='text-muted-foreground'>
            Verificação completa de todas as funcionalidades e integridade dos
            dados
          </p>
        </div>
        <div className='flex gap-2'>
          <Button onClick={testConnection} variant='outline'>
            <Globe className='mr-2 h-4 w-4' />
            Testar Conexão
          </Button>
          <Button onClick={runAudit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Executando Auditoria...
              </>
            ) : (
              <>
                <Database className='mr-2 h-4 w-4' />
                Executar Auditoria
              </>
            )}
          </Button>
          <Button onClick={runTests} disabled={isTesting} variant='outline'>
            {isTesting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Executando Testes...
              </>
            ) : (
              <>
                <Settings className='mr-2 h-4 w-4' />
                Testes de Criação
              </>
            )}
          </Button>
          <Button
            onClick={runCRUDTests}
            disabled={isTesting}
            variant='secondary'
          >
            {isTesting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Testando CRUD...
              </>
            ) : (
              <>
                <CheckCircle className='mr-2 h-4 w-4' />
                Testes CRUD Completos
              </>
            )}
          </Button>
          <Button
            onClick={runNavigationTests}
            disabled={isTesting}
            variant='outline'
          >
            {isTesting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Testando Navegação...
              </>
            ) : (
              <>
                <Globe className='mr-2 h-4 w-4' />
                Testes de Navegação
              </>
            )}
          </Button>
          <Button
            onClick={runCompleteSystemTest}
            disabled={isTesting}
            variant='secondary'
          >
            {isTesting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Testando Sistema Completo...
              </>
            ) : (
              <>
                <Zap className='mr-2 h-4 w-4' />
                Teste Completo do Sistema
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue='audit' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='audit'>Auditoria Completa</TabsTrigger>
          <TabsTrigger value='tests'>Testes de Criação</TabsTrigger>
          <TabsTrigger value='crud-tests'>Testes CRUD</TabsTrigger>
          <TabsTrigger value='navigation-tests'>
            Testes de Navegação
          </TabsTrigger>
          <TabsTrigger value='complete-test'>
            Teste Completo do Sistema
          </TabsTrigger>
        </TabsList>

        <TabsContent value='audit' className='space-y-4'>
          {auditResult && (
            <>
              {/* Resumo */}
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <Database className='h-5 w-5' />
                    Resumo da Auditoria
                  </CardTitle>
                  <CardDescription>
                    Executada em{' '}
                    {new Date(auditResult.timestamp).toLocaleString('pt-BR')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                    <div className='flex items-center gap-2'>
                      {getStatusIcon(auditResult.summary.system_status)}
                      <span>
                        Status:{' '}
                        {getStatusBadge(auditResult.summary.system_status)}
                      </span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <XCircle className='h-4 w-4 text-red-500' />
                      <span>Erros: {auditResult.summary.total_errors}</span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <AlertTriangle className='h-4 w-4 text-yellow-500' />
                      <span>Avisos: {auditResult.summary.total_warnings}</span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Info className='h-4 w-4 text-blue-500' />
                      <span>
                        Recomendações:{' '}
                        {auditResult.summary.total_recommendations}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tabelas do Banco */}
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <Database className='h-5 w-5' />
                    Estrutura do Banco de Dados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                    {Object.entries(auditResult.database.tables).map(
                      ([tableName, tableInfo]: [string, any]) => (
                        <div key={tableName} className='border rounded-lg p-4'>
                          <div className='flex items-center justify-between mb-2'>
                            <h4 className='font-semibold capitalize'>
                              {tableName}
                            </h4>
                            {tableInfo.exists ? (
                              <CheckCircle className='h-4 w-4 text-green-500' />
                            ) : (
                              <XCircle className='h-4 w-4 text-red-500' />
                            )}
                          </div>
                          {tableInfo.exists && (
                            <div className='text-sm text-muted-foreground'>
                              <p>Colunas: {tableInfo.columns?.length || 0}</p>
                              <p>Registros: {tableInfo.record_count || 0}</p>
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Endpoints da API */}
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <Globe className='h-5 w-5' />
                    Endpoints da API
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    {Object.entries(auditResult.api_endpoints).map(
                      ([endpoint, info]: [string, any]) => (
                        <div key={endpoint} className='border rounded-lg p-4'>
                          <div className='flex items-center justify-between mb-2'>
                            <h4 className='font-semibold capitalize'>
                              {endpoint}
                            </h4>
                            {getStatusIcon(info.status)}
                          </div>
                          <div className='text-sm text-muted-foreground'>
                            <p>Status: {info.status}</p>
                            {info.sample_data && (
                              <p>
                                Dados de exemplo: {info.sample_data.length}{' '}
                                registros
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Erros e Avisos */}
              {(auditResult.errors.length > 0 ||
                auditResult.warnings.length > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle className='flex items-center gap-2'>
                      <AlertTriangle className='h-5 w-5' />
                      Problemas Encontrados
                    </CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    {auditResult.errors.length > 0 && (
                      <div>
                        <h4 className='font-semibold text-red-600 mb-2'>
                          Erros ({auditResult.errors.length})
                        </h4>
                        <div className='space-y-2'>
                          {auditResult.errors.map((error, index) => (
                            <Alert key={index} variant='destructive'>
                              <XCircle className='h-4 w-4' />
                              <AlertDescription>{error}</AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      </div>
                    )}

                    {auditResult.warnings.length > 0 && (
                      <div>
                        <h4 className='font-semibold text-yellow-600 mb-2'>
                          Avisos ({auditResult.warnings.length})
                        </h4>
                        <div className='space-y-2'>
                          {auditResult.warnings.map((warning, index) => (
                            <Alert
                              key={index}
                              variant='default'
                              className='border-yellow-200 bg-yellow-50'
                            >
                              <AlertTriangle className='h-4 w-4 text-yellow-600' />
                              <AlertDescription className='text-yellow-800'>
                                {warning}
                              </AlertDescription>
                            </Alert>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Recomendações */}
              {auditResult.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className='flex items-center gap-2'>
                      <Info className='h-5 w-5' />
                      Recomendações ({auditResult.recommendations.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-2'>
                      {auditResult.recommendations.map(
                        (recommendation, index) => (
                          <div
                            key={index}
                            className='flex items-start gap-2 p-3 bg-blue-50 rounded-lg'
                          >
                            <Info className='h-4 w-4 text-blue-600 mt-0.5' />
                            <span className='text-blue-800'>
                              {recommendation}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Dados de Integridade */}
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center gap-2'>
                    <CheckCircle className='h-5 w-5' />
                    Integridade dos Dados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                    <div className='border rounded-lg p-4'>
                      <div className='flex items-center gap-2 mb-2'>
                        <Users className='h-4 w-4' />
                        <h4 className='font-semibold'>Usuários</h4>
                      </div>
                      <p className='text-sm text-muted-foreground'>
                        {auditResult.database.data_integrity.users?.length || 0}{' '}
                        usuários
                      </p>
                    </div>

                    <div className='border rounded-lg p-4'>
                      <div className='flex items-center gap-2 mb-2'>
                        <Building2 className='h-4 w-4' />
                        <h4 className='font-semibold'>Setores</h4>
                      </div>
                      <p className='text-sm text-muted-foreground'>
                        {auditResult.database.data_integrity.sectors?.length ||
                          0}{' '}
                        setores
                      </p>
                    </div>

                    <div className='border rounded-lg p-4'>
                      <div className='flex items-center gap-2 mb-2'>
                        <MapPin className='h-4 w-4' />
                        <h4 className='font-semibold'>Locais</h4>
                      </div>
                      <p className='text-sm text-muted-foreground'>
                        {auditResult.database.data_integrity.locals?.length ||
                          0}{' '}
                        locais
                      </p>
                    </div>

                    <div className='border rounded-lg p-4'>
                      <div className='flex items-center gap-2 mb-2'>
                        <Package className='h-4 w-4' />
                        <h4 className='font-semibold'>Patrimônios</h4>
                      </div>
                      <p className='text-sm text-muted-foreground'>
                        {auditResult.database.data_integrity.patrimonios
                          ?.length || 0}{' '}
                        patrimônios
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value='tests' className='space-y-4'>
          {testResult && (
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Settings className='h-5 w-5' />
                  Resultados dos Testes de Criação
                </CardTitle>
                <CardDescription>
                  Executados em{' '}
                  {new Date(testResult.timestamp).toLocaleString('pt-BR')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  {Object.entries(testResult.tests).map(
                    ([testName, testInfo]: [string, any]) => (
                      <div key={testName} className='border rounded-lg p-4'>
                        <div className='flex items-center justify-between mb-2'>
                          <h4 className='font-semibold capitalize'>
                            {testName.replace(/_/g, ' ')}
                          </h4>
                          {getStatusIcon(testInfo.status)}
                        </div>
                        <div className='text-sm text-muted-foreground'>
                          {testInfo.status === 'SUCCESS' ? (
                            <div>
                              {testInfo.data && (
                                <pre className='bg-gray-100 p-2 rounded text-xs overflow-x-auto'>
                                  {JSON.stringify(testInfo.data, null, 2)}
                                </pre>
                              )}
                              {testInfo.message && <p>{testInfo.message}</p>}
                            </div>
                          ) : (
                            <div>
                              <p className='text-red-600'>{testInfo.message}</p>
                              {testInfo.stack && (
                                <pre className='bg-red-50 p-2 rounded text-xs overflow-x-auto text-red-800'>
                                  {testInfo.stack}
                                </pre>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value='crud-tests' className='space-y-4'>
          {testResult && testResult.tests && (
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <CheckCircle className='h-5 w-5' />
                  Resultados dos Testes CRUD
                </CardTitle>
                <CardDescription>
                  Testes completos de operações Criar, Ler, Atualizar e Deletar
                </CardDescription>
              </CardHeader>
              <CardContent>
                {testResult.summary && (
                  <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-6'>
                    <div className='flex items-center gap-2'>
                      <Info className='h-4 w-4 text-blue-500' />
                      <span>Total: {testResult.summary.total_tests}</span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <CheckCircle className='h-4 w-4 text-green-500' />
                      <span>Sucesso: {testResult.summary.passed}</span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <XCircle className='h-4 w-4 text-red-500' />
                      <span>Falha: {testResult.summary.failed}</span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <AlertTriangle className='h-4 w-4 text-yellow-500' />
                      <span>
                        Erros: {testResult.summary.errors?.length || 0}
                      </span>
                    </div>
                  </div>
                )}

                <div className='space-y-4'>
                  {Object.entries(testResult.tests).map(
                    ([moduleName, moduleTests]: [string, any]) => (
                      <div key={moduleName} className='border rounded-lg p-4'>
                        <div className='flex items-center justify-between mb-4'>
                          <h4 className='font-semibold text-lg capitalize'>
                            {moduleName.replace(/_/g, ' ')}
                          </h4>
                          <div className='flex items-center gap-2'>
                            <Badge
                              variant={
                                moduleTests.failed === 0
                                  ? 'default'
                                  : 'destructive'
                              }
                            >
                              {moduleTests.passed}/
                              {moduleTests.total_operations}
                            </Badge>
                          </div>
                        </div>

                        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3'>
                          {Object.entries(moduleTests.operations || {}).map(
                            ([operation, result]: [string, any]) => (
                              <div
                                key={operation}
                                className='border rounded p-3'
                              >
                                <div className='flex items-center justify-between mb-2'>
                                  <span className='font-medium capitalize'>
                                    {operation}
                                  </span>
                                  {getStatusIcon(result.status)}
                                </div>
                                {result.status === 'SUCCESS' ? (
                                  <div className='text-sm text-green-600'>
                                    ✅ Operação bem-sucedida
                                  </div>
                                ) : (
                                  <div className='text-sm text-red-600'>
                                    ❌ {result.error}
                                  </div>
                                )}
                              </div>
                            )
                          )}
                        </div>

                        {moduleTests.errors &&
                          moduleTests.errors.length > 0 && (
                            <div className='mt-4 p-3 bg-red-50 rounded-lg'>
                              <h5 className='font-medium text-red-800 mb-2'>
                                Erros:
                              </h5>
                              <div className='space-y-1'>
                                {moduleTests.errors.map(
                                  (error: string, index: number) => (
                                    <div
                                      key={index}
                                      className='text-sm text-red-700'
                                    >
                                      • {error}
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    )
                  )}
                </div>

                {testResult.summary?.errors &&
                  testResult.summary.errors.length > 0 && (
                    <div className='mt-6 p-4 bg-red-50 rounded-lg'>
                      <h4 className='font-semibold text-red-800 mb-3'>
                        Erros Gerais:
                      </h4>
                      <div className='space-y-2'>
                        {testResult.summary.errors.map(
                          (error: string, index: number) => (
                            <Alert key={index} variant='destructive'>
                              <XCircle className='h-4 w-4' />
                              <AlertDescription>{error}</AlertDescription>
                            </Alert>
                          )
                        )}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value='navigation-tests' className='space-y-4'>
          {testResult && testResult.tests && (
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Globe className='h-5 w-5' />
                  Resultados dos Testes de Navegação
                </CardTitle>
                <CardDescription>
                  Testes de funcionalidades do menu lateral e navegação entre
                  páginas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {testResult.summary && (
                  <div className='grid grid-cols-1 md:grid-cols-4 gap-4 mb-6'>
                    <div className='flex items-center gap-2'>
                      <Info className='h-4 w-4 text-blue-500' />
                      <span>Total: {testResult.summary.total_tests}</span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <CheckCircle className='h-4 w-4 text-green-500' />
                      <span>Sucesso: {testResult.summary.passed}</span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <XCircle className='h-4 w-4 text-red-500' />
                      <span>Falha: {testResult.summary.failed}</span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <AlertTriangle className='h-4 w-4 text-yellow-500' />
                      <span>
                        Erros: {testResult.summary.errors?.length || 0}
                      </span>
                    </div>
                  </div>
                )}

                <div className='space-y-4'>
                  {Object.entries(testResult.tests).map(
                    ([moduleName, moduleTests]: [string, any]) => (
                      <div key={moduleName} className='border rounded-lg p-4'>
                        <div className='flex items-center justify-between mb-4'>
                          <h4 className='font-semibold text-lg capitalize'>
                            {moduleName.replace(/_/g, ' ')}
                          </h4>
                          <div className='flex items-center gap-2'>
                            <Badge
                              variant={
                                moduleTests.failed === 0
                                  ? 'default'
                                  : 'destructive'
                              }
                            >
                              {moduleTests.passed}/
                              {moduleTests.total_operations}
                            </Badge>
                          </div>
                        </div>

                        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
                          {Object.entries(moduleTests.operations || {}).map(
                            ([operation, result]: [string, any]) => (
                              <div
                                key={operation}
                                className='border rounded p-3'
                              >
                                <div className='flex items-center justify-between mb-2'>
                                  <span className='font-medium capitalize'>
                                    {operation.replace(/_/g, ' ')}
                                  </span>
                                  {getStatusIcon(result.status)}
                                </div>
                                {result.status === 'SUCCESS' ? (
                                  <div className='text-sm text-green-600'>
                                    ✅ Funcionalidade testada com sucesso
                                  </div>
                                ) : (
                                  <div className='text-sm text-red-600'>
                                    ❌ {result.error}
                                  </div>
                                )}
                              </div>
                            )
                          )}
                        </div>

                        {moduleTests.errors &&
                          moduleTests.errors.length > 0 && (
                            <div className='mt-4 p-3 bg-red-50 rounded-lg'>
                              <h5 className='font-medium text-red-800 mb-2'>
                                Erros:
                              </h5>
                              <div className='space-y-1'>
                                {moduleTests.errors.map(
                                  (error: string, index: number) => (
                                    <div
                                      key={index}
                                      className='text-sm text-red-700'
                                    >
                                      • {error}
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    )
                  )}
                </div>

                {testResult.summary?.errors &&
                  testResult.summary.errors.length > 0 && (
                    <div className='mt-6 p-4 bg-red-50 rounded-lg'>
                      <h4 className='font-semibold text-red-800 mb-3'>
                        Erros Gerais:
                      </h4>
                      <div className='space-y-2'>
                        {testResult.summary.errors.map(
                          (error: string, index: number) => (
                            <Alert key={index} variant='destructive'>
                              <XCircle className='h-4 w-4' />
                              <AlertDescription>{error}</AlertDescription>
                            </Alert>
                          )
                        )}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value='complete-test' className='space-y-4'>
          {completeTestResult && (
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Zap className='h-5 w-5' />
                  Teste Completo do Sistema
                </CardTitle>
                <CardDescription>
                  Simulação completa de uso do sistema - Duração:{' '}
                  {Math.round(completeTestResult.duration / 1000)}s
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='grid grid-cols-1 md:grid-cols-5 gap-4 mb-6'>
                  <div className='flex items-center gap-2'>
                    <Info className='h-4 w-4 text-blue-500' />
                    <span>
                      Total: {completeTestResult.summary.total_operations}
                    </span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <CheckCircle className='h-4 w-4 text-green-500' />
                    <span>Sucesso: {completeTestResult.summary.passed}</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <XCircle className='h-4 w-4 text-red-500' />
                    <span>Falha: {completeTestResult.summary.failed}</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <AlertTriangle className='h-4 w-4 text-yellow-500' />
                    <span>
                      Erros Críticos:{' '}
                      {completeTestResult.summary.critical_errors}
                    </span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <Database className='h-4 w-4 text-purple-500' />
                    <span>
                      Status:{' '}
                      {getStatusBadge(completeTestResult.summary.system_status)}
                    </span>
                  </div>
                </div>

                <div className='space-y-4'>
                  {Object.entries(completeTestResult.tests).map(
                    ([testName, testResult]: [string, any]) => (
                      <div key={testName} className='border rounded-lg p-4'>
                        <div className='flex items-center justify-between mb-4'>
                          <h4 className='font-semibold text-lg capitalize'>
                            {testName.replace(/_/g, ' ')}
                          </h4>
                          <div className='flex items-center gap-2'>
                            <Badge
                              variant={
                                testResult.failed === 0
                                  ? 'default'
                                  : 'destructive'
                              }
                            >
                              {testResult.passed}/{testResult.total_operations}
                            </Badge>
                          </div>
                        </div>

                        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
                          {Object.entries(testResult.operations || {}).map(
                            ([operation, result]: [string, any]) => (
                              <div
                                key={operation}
                                className='border rounded p-3'
                              >
                                <div className='flex items-center justify-between mb-2'>
                                  <span className='font-medium capitalize'>
                                    {operation.replace(/_/g, ' ')}
                                  </span>
                                  {getStatusIcon(result.status)}
                                </div>
                                {result.status === 'SUCCESS' ? (
                                  <div className='text-sm text-green-600'>
                                    ✅ Operação executada com sucesso
                                  </div>
                                ) : (
                                  <div className='text-sm text-red-600'>
                                    ❌ {result.error}
                                  </div>
                                )}
                              </div>
                            )
                          )}
                        </div>

                        {testResult.errors && testResult.errors.length > 0 && (
                          <div className='mt-4 p-3 bg-red-50 rounded-lg'>
                            <h5 className='font-medium text-red-800 mb-2'>
                              Erros:
                            </h5>
                            <div className='space-y-1'>
                              {testResult.errors.map(
                                (error: string, index: number) => (
                                  <div
                                    key={index}
                                    className='text-sm text-red-700'
                                  >
                                    • {error}
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>

                {completeTestResult.errors &&
                  completeTestResult.errors.length > 0 && (
                    <div className='mt-6 p-4 bg-red-50 rounded-lg'>
                      <h4 className='font-semibold text-red-800 mb-3'>
                        Erros Críticos:
                      </h4>
                      <div className='space-y-2'>
                        {completeTestResult.errors.map(
                          (error: string, index: number) => (
                            <Alert key={index} variant='destructive'>
                              <XCircle className='h-4 w-4' />
                              <AlertDescription>{error}</AlertDescription>
                            </Alert>
                          )
                        )}
                      </div>
                    </div>
                  )}

                {completeTestResult.warnings &&
                  completeTestResult.warnings.length > 0 && (
                    <div className='mt-6 p-4 bg-yellow-50 rounded-lg'>
                      <h4 className='font-semibold text-yellow-800 mb-3'>
                        Avisos:
                      </h4>
                      <div className='space-y-2'>
                        {completeTestResult.warnings.map(
                          (warning: string, index: number) => (
                            <Alert key={index} variant='default'>
                              <AlertTriangle className='h-4 w-4' />
                              <AlertDescription>{warning}</AlertDescription>
                            </Alert>
                          )
                        )}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
