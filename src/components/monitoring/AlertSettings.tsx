import {
    AlertTriangle,
    Bell,
    CheckCircle,
    Mail,
    MessageSquare,
    RotateCcw,
    Save,
    Settings,
    Smartphone
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';

export interface AlertThreshold {
  id: string;
  name: string;
  metric: string;
  warning: number;
  critical: number;
  enabled: boolean;
  description: string;
  unit: string;
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'webhook' | 'push';
  enabled: boolean;
  config: Record<string, any>;
}

const DEFAULT_THRESHOLDS: AlertThreshold[] = [
  {
    id: 'cpu-usage',
    name: 'Uso de CPU',
    metric: 'system.cpuUsage',
    warning: 75,
    critical: 90,
    enabled: true,
    description: 'Porcentagem de uso do processador',
    unit: '%'
  },
  {
    id: 'memory-usage',
    name: 'Uso de Memória',
    metric: 'system.memoryUsage',
    warning: 80,
    critical: 95,
    enabled: true,
    description: 'Porcentagem de uso da memória RAM',
    unit: '%'
  },
  {
    id: 'response-time',
    name: 'Tempo de Resposta',
    metric: 'api.averageResponseTime',
    warning: 500,
    critical: 1000,
    enabled: true,
    description: 'Tempo médio de resposta das APIs',
    unit: 'ms'
  },
  {
    id: 'error-rate',
    name: 'Taxa de Erro',
    metric: 'api.errorRate',
    warning: 5,
    critical: 10,
    enabled: true,
    description: 'Porcentagem de requisições com erro',
    unit: '%'
  },
  {
    id: 'slow-queries',
    name: 'Queries Lentas',
    metric: 'database.slowQueries',
    warning: 5,
    critical: 10,
    enabled: true,
    description: 'Número de queries que excedem o tempo limite',
    unit: 'queries'
  }
];

const DEFAULT_CHANNELS: NotificationChannel[] = [
  {
    id: 'email',
    name: 'E-mail',
    type: 'email',
    enabled: true,
    config: {
      recipients: ['admin@sispat.com'],
      subject: 'SISPAT - Alerta de Performance'
    }
  },
  {
    id: 'webhook',
    name: 'Webhook',
    type: 'webhook',
    enabled: false,
    config: {
      url: '',
      method: 'POST',
      headers: {}
    }
  }
];

export function AlertSettings() {
  const [thresholds, setThresholds] = useState<AlertThreshold[]>(DEFAULT_THRESHOLDS);
  const [channels, setChannels] = useState<NotificationChannel[]>(DEFAULT_CHANNELS);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Carregar configurações salvas
  useEffect(() => {
    const savedThresholds = localStorage.getItem('alert-thresholds');
    const savedChannels = localStorage.getItem('notification-channels');

    if (savedThresholds) {
      try {
        setThresholds(JSON.parse(savedThresholds));
      } catch (error) {
        console.error('Erro ao carregar thresholds:', error);
      }
    }

    if (savedChannels) {
      try {
        setChannels(JSON.parse(savedChannels));
      } catch (error) {
        console.error('Erro ao carregar canais:', error);
      }
    }
  }, []);

  // Atualizar threshold
  const updateThreshold = (id: string, field: keyof AlertThreshold, value: any) => {
    setThresholds(prev => prev.map(threshold => 
      threshold.id === id ? { ...threshold, [field]: value } : threshold
    ));
    setHasChanges(true);
  };

  // Atualizar canal de notificação
  const updateChannel = (id: string, field: keyof NotificationChannel, value: any) => {
    setChannels(prev => prev.map(channel => 
      channel.id === id ? { ...channel, [field]: value } : channel
    ));
    setHasChanges(true);
  };

  // Atualizar configuração do canal
  const updateChannelConfig = (id: string, configKey: string, value: any) => {
    setChannels(prev => prev.map(channel => 
      channel.id === id 
        ? { ...channel, config: { ...channel.config, [configKey]: value } }
        : channel
    ));
    setHasChanges(true);
  };

  // Salvar configurações
  const saveSettings = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Validações
      const errors: string[] = [];
      
      thresholds.forEach(threshold => {
        if (threshold.enabled) {
          if (threshold.warning >= threshold.critical) {
            errors.push(`${threshold.name}: Limite de aviso deve ser menor que crítico`);
          }
          if (threshold.warning <= 0 || threshold.critical <= 0) {
            errors.push(`${threshold.name}: Limites devem ser maiores que zero`);
          }
        }
      });

      if (errors.length > 0) {
        setSaveMessage(`Erros de validação: ${errors.join(', ')}`);
        return;
      }

      // Salvar no localStorage (em produção, seria uma API)
      localStorage.setItem('alert-thresholds', JSON.stringify(thresholds));
      localStorage.setItem('notification-channels', JSON.stringify(channels));

      // Simular delay da API
      await new Promise(resolve => setTimeout(resolve, 1000));

      setHasChanges(false);
      setSaveMessage('Configurações salvas com sucesso!');
      
      // Limpar mensagem após 3 segundos
      setTimeout(() => setSaveMessage(null), 3000);

    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      setSaveMessage('Erro ao salvar configurações. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  // Resetar para padrões
  const resetToDefaults = () => {
    setThresholds(DEFAULT_THRESHOLDS);
    setChannels(DEFAULT_CHANNELS);
    setHasChanges(true);
  };

  // Testar alerta
  const testAlert = (thresholdId: string) => {
    const threshold = thresholds.find(t => t.id === thresholdId);
    if (threshold) {
      // Em produção, isso enviaria um alerta de teste
      console.log(`Testando alerta para: ${threshold.name}`);
      setSaveMessage(`Alerta de teste enviado para: ${threshold.name}`);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <Smartphone className="h-4 w-4" />;
      case 'webhook':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Configuração de Alertas</h2>
          <p className="text-muted-foreground">
            Configure limites e canais de notificação para alertas de performance
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={resetToDefaults}
            variant="outline"
            size="sm"
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Restaurar Padrões
          </Button>
          <Button
            onClick={saveSettings}
            disabled={!hasChanges || isSaving}
            size="sm"
          >
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>
      </div>

      {/* Mensagem de status */}
      {saveMessage && (
        <Alert variant={saveMessage.includes('Erro') ? 'destructive' : 'default'}>
          {saveMessage.includes('Erro') ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <CheckCircle className="h-4 w-4" />
          )}
          <AlertDescription>{saveMessage}</AlertDescription>
        </Alert>
      )}

      {/* Limites de Alerta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Limites de Alerta
          </CardTitle>
          <CardDescription>
            Configure os valores que disparam alertas de aviso e críticos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {thresholds.map(threshold => (
              <div key={threshold.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{threshold.name}</h4>
                    <p className="text-sm text-muted-foreground">{threshold.description}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={threshold.enabled}
                      onCheckedChange={(checked) => updateThreshold(threshold.id, 'enabled', checked)}
                    />
                    <Button
                      onClick={() => testAlert(threshold.id)}
                      variant="outline"
                      size="sm"
                      disabled={!threshold.enabled}
                    >
                      Testar
                    </Button>
                  </div>
                </div>

                {threshold.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor={`warning-${threshold.id}`}>
                        Limite de Aviso ({threshold.unit})
                      </Label>
                      <Input
                        id={`warning-${threshold.id}`}
                        type="number"
                        value={threshold.warning}
                        onChange={(e) => updateThreshold(threshold.id, 'warning', Number(e.target.value))}
                        min="0"
                        step={threshold.unit === '%' ? '1' : '10'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`critical-${threshold.id}`}>
                        Limite Crítico ({threshold.unit})
                      </Label>
                      <Input
                        id={`critical-${threshold.id}`}
                        type="number"
                        value={threshold.critical}
                        onChange={(e) => updateThreshold(threshold.id, 'critical', Number(e.target.value))}
                        min="0"
                        step={threshold.unit === '%' ? '1' : '10'}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Canais de Notificação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Canais de Notificação
          </CardTitle>
          <CardDescription>
            Configure como e onde receber os alertas de performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {channels.map(channel => (
              <div key={channel.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getChannelIcon(channel.type)}
                    <div>
                      <h4 className="font-medium">{channel.name}</h4>
                      <Badge variant={channel.enabled ? "default" : "secondary"}>
                        {channel.enabled ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </div>
                  <Switch
                    checked={channel.enabled}
                    onCheckedChange={(checked) => updateChannel(channel.id, 'enabled', checked)}
                  />
                </div>

                {channel.enabled && (
                  <div className="space-y-4">
                    {channel.type === 'email' && (
                      <div className="space-y-2">
                        <Label htmlFor={`email-recipients-${channel.id}`}>
                          E-mails para notificação (separados por vírgula)
                        </Label>
                        <Input
                          id={`email-recipients-${channel.id}`}
                          value={(channel.config.recipients || []).join(', ')}
                          onChange={(e) => updateChannelConfig(
                            channel.id, 
                            'recipients', 
                            e.target.value.split(',').map(email => email.trim())
                          )}
                          placeholder="admin@sispat.com, ops@sispat.com"
                        />
                      </div>
                    )}

                    {channel.type === 'webhook' && (
                      <div className="space-y-2">
                        <Label htmlFor={`webhook-url-${channel.id}`}>
                          URL do Webhook
                        </Label>
                        <Input
                          id={`webhook-url-${channel.id}`}
                          value={channel.config.url || ''}
                          onChange={(e) => updateChannelConfig(channel.id, 'url', e.target.value)}
                          placeholder="https://hooks.slack.com/services/..."
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resumo das Configurações */}
      <Card>
        <CardHeader>
          <CardTitle>Resumo das Configurações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Alertas Ativos</h4>
              <div className="space-y-1">
                {thresholds.filter(t => t.enabled).map(threshold => (
                  <div key={threshold.id} className="text-sm">
                    <span className="font-medium">{threshold.name}:</span>{' '}
                    <span className="text-yellow-600">{threshold.warning}{threshold.unit}</span>
                    {' / '}
                    <span className="text-red-600">{threshold.critical}{threshold.unit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Canais Ativos</h4>
              <div className="space-y-1">
                {channels.filter(c => c.enabled).map(channel => (
                  <div key={channel.id} className="text-sm flex items-center space-x-1">
                    {getChannelIcon(channel.type)}
                    <span>{channel.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
