import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useServiceWorker } from '@/hooks/useServiceWorker';
import {
    AlertTriangle,
    CheckCircle,
    Clock,
    Download,
    HardDrive,
    RefreshCw,
    Trash2,
    Wifi,
    WifiOff,
    Zap
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface OfflineData {
  patrimonios: any[];
  users: any[];
  reports: any[];
  lastSync: number;
}

export function OfflineCacheManager() {
  const {
    isSupported,
    isRegistered,
    isActive,
    hasUpdate,
    error,
    skipWaiting,
    cacheUrls,
    clearCache,
    getCacheStats,
    registration: _registration
  } = useServiceWorker();

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [offlineData, setOfflineData] = useState<OfflineData>({
    patrimonios: [],
    users: [],
    reports: [],
    lastSync: 0
  });
  const [syncProgress, setSyncProgress] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Monitorar status da conexão
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Carregar estatísticas do cache
  useEffect(() => {
    if (isActive) {
      loadCacheStats();
    }
  }, [isActive, loadCacheStats]);

  const loadCacheStats = async () => {
    try {
      const stats = await getCacheStats();
      setCacheStats(stats);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const syncOfflineData = async () => {
    if (!isOnline) {
      alert('Não é possível sincronizar offline');
      return;
    }

    setIsSyncing(true);
    setSyncProgress(0);

    try {
      // URLs importantes para cache offline
      const urlsToCache = [
        '/api/patrimonio',
        '/api/users/me',
        '/api/dashboard/summary',
        '/',
        '/patrimonio',
        '/dashboard'
      ];

      let completed = 0;
      for (const url of urlsToCache) {
        try {
          // Fazer requisição para garantir que está no cache
          await fetch(url);
          completed++;
          setSyncProgress((completed / urlsToCache.length) * 100);
        } catch (error) {
          console.warn(`Erro ao sincronizar ${url}:`, error);
        }
      }

      // Cache das URLs no Service Worker
      cacheUrls(urlsToCache);

      // Salvar timestamp da sincronização
      const newOfflineData = {
        ...offlineData,
        lastSync: Date.now()
      };
      setOfflineData(newOfflineData);
      localStorage.setItem('offline-data', JSON.stringify(newOfflineData));

      // Recarregar estatísticas
      await loadCacheStats();

    } catch (error) {
      console.error('Erro na sincronização:', error);
      alert('Erro durante a sincronização');
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
    }
  };

  const handleClearCache = async () => {
    if (confirm('Tem certeza que deseja limpar todo o cache offline?')) {
      clearCache();
      setCacheStats(null);
      setOfflineData({
        patrimonios: [],
        users: [],
        reports: [],
        lastSync: 0
      });
      localStorage.removeItem('offline-data');
      
      setTimeout(() => {
        loadCacheStats();
      }, 1000);
    }
  };

  const handleUpdate = () => {
    if (hasUpdate) {
      skipWaiting();
      window.location.reload();
    }
  };

  const _formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Nunca';
    return new Date(timestamp).toLocaleString('pt-BR');
  };

  const calculateCacheSize = () => {
    if (!cacheStats) return 0;
    return Object.values(cacheStats).reduce((total: number, cache: any) => {
      return total + (cache.size || 0);
    }, 0);
  };

  if (!isSupported) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium">Cache Offline Não Suportado</h3>
            <p className="text-muted-foreground">
              Seu navegador não suporta Service Workers
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com Status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gerenciador de Cache Offline</h2>
          <p className="text-muted-foreground">
            Gerencie dados offline e sincronização
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge variant={isOnline ? "default" : "destructive"} className="flex items-center space-x-1">
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </Badge>
          
          <Badge variant={isActive ? "default" : "secondary"} className="flex items-center space-x-1">
            <Zap className="h-3 w-3" />
            <span>{isActive ? 'SW Ativo' : 'SW Inativo'}</span>
          </Badge>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {hasUpdate && (
        <Alert>
          <Download className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Nova versão disponível do cache offline</span>
            <Button onClick={handleUpdate} size="sm">
              Atualizar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!isOnline && (
        <Alert>
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            Você está offline. Algumas funcionalidades podem estar limitadas.
          </AlertDescription>
        </Alert>
      )}

      {/* Estatísticas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status da Conexão</CardTitle>
            {isOnline ? <Wifi className="h-4 w-4 text-green-600" /> : <WifiOff className="h-4 w-4 text-red-600" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isOnline ? 'Online' : 'Offline'}
            </div>
            <p className="text-xs text-muted-foreground">
              {isOnline ? 'Conectado à internet' : 'Sem conexão'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Offline</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {calculateCacheSize()}
            </div>
            <p className="text-xs text-muted-foreground">
              itens em cache
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Última Sincronização</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {offlineData.lastSync ? 'Sincronizado' : 'Nunca'}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDate(offlineData.lastSync)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Service Worker</CardTitle>
            {isActive ? <CheckCircle className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-yellow-600" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isActive ? 'Ativo' : 'Inativo'}
            </div>
            <p className="text-xs text-muted-foreground">
              {isRegistered ? 'Registrado' : 'Não registrado'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Controles de Sincronização */}
      <Card>
        <CardHeader>
          <CardTitle>Sincronização de Dados</CardTitle>
          <CardDescription>
            Baixe dados importantes para uso offline
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSyncing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Sincronizando...</span>
                <span>{Math.round(syncProgress)}%</span>
              </div>
              <Progress value={syncProgress} />
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              onClick={syncOfflineData} 
              disabled={!isOnline || isSyncing}
              className="flex-1"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Sincronizar Dados
                </>
              )}
            </Button>

            <Button 
              onClick={handleClearCache} 
              variant="outline"
              disabled={isSyncing}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Cache
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            {isOnline 
              ? 'A sincronização baixará dados importantes para uso offline'
              : 'Conecte-se à internet para sincronizar dados'
            }
          </div>
        </CardContent>
      </Card>

      {/* Detalhes do Cache */}
      <Tabs defaultValue="caches" className="space-y-4">
        <TabsList>
          <TabsTrigger value="caches">Caches</TabsTrigger>
          <TabsTrigger value="offline-data">Dados Offline</TabsTrigger>
        </TabsList>

        <TabsContent value="caches" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Caches do Service Worker</CardTitle>
              <CardDescription>Dados armazenados localmente</CardDescription>
            </CardHeader>
            <CardContent>
              {cacheStats ? (
                <div className="space-y-4">
                  {Object.entries(cacheStats).map(([cacheName, cache]: [string, any]) => (
                    <div key={cacheName} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">{cacheName}</h4>
                        <Badge variant="outline">{cache.size} itens</Badge>
                      </div>
                      
                      <div className="space-y-1">
                        {cache.urls.slice(0, 5).map((url: string, index: number) => (
                          <div key={index} className="text-xs text-muted-foreground font-mono">
                            {url}
                          </div>
                        ))}
                        {cache.urls.length > 5 && (
                          <div className="text-xs text-muted-foreground">
                            ... e mais {cache.urls.length - 5} URLs
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  {isActive ? 'Carregando estatísticas...' : 'Service Worker não está ativo'}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offline-data" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Dados Offline Disponíveis</CardTitle>
              <CardDescription>Informações acessíveis sem conexão</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{offlineData.patrimonios.length}</div>
                    <div className="text-sm text-muted-foreground">Patrimônios</div>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{offlineData.users.length}</div>
                    <div className="text-sm text-muted-foreground">Usuários</div>
                  </div>
                  
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{offlineData.reports.length}</div>
                    <div className="text-sm text-muted-foreground">Relatórios</div>
                  </div>
                </div>

                {offlineData.lastSync > 0 && (
                  <div className="text-center text-sm text-muted-foreground">
                    Última sincronização: {formatDate(offlineData.lastSync)}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
