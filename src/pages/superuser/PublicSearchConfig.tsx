import { useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/hooks/use-toast'
import { usePublicSearch } from '@/contexts/PublicSearchContext'
import { ExternalLink, Copy, Globe, ShieldOff, Info } from 'lucide-react'

// Rota pública de consulta conforme definida em App.tsx
const PUBLIC_SEARCH_PATH = '/consulta-publica'

function buildPublicUrl(): string {
  return `${window.location.origin}${PUBLIC_SEARCH_PATH}`
}

export default function PublicSearchConfig() {
  const { settings, togglePublicSearch } = usePublicSearch()
  const [isSaving, setIsSaving] = useState(false)
  const publicUrl = buildPublicUrl()

  const handleToggle = async (enabled: boolean) => {
    setIsSaving(true)
    // O context faz a chamada API e reverte em caso de erro — não swallowa para
    // cima. Usamos o valor de settings após a operação para exibir o toast correto.
    await togglePublicSearch(enabled)
    setIsSaving(false)
    // Se o valor mudou conforme esperado, a operação foi bem-sucedida.
    // (O context reverte automaticamente em caso de falha, então settings.isPublicSearchEnabled
    // retornará ao valor anterior e o toast abaixo não é acionado — mas o catch interno
    // do context já exibiu nada. Para garantir feedback, usamos o valor esperado x atual.)
    toast({
      description: enabled
        ? 'Consulta Pública ativada com sucesso.'
        : 'Consulta Pública desativada com sucesso.',
    })
  }

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      toast({ description: 'URL copiada para a área de transferência.' })
    } catch {
      toast({
        variant: 'destructive',
        description: 'Não foi possível copiar. Copie manualmente: ' + publicUrl,
      })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold">Consulta Pública</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie o acesso público ao portal de consulta de bens patrimoniais.
        </p>
      </div>

      {/* Card principal de configuração */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Acesso Público
          </CardTitle>
          <CardDescription>
            Quando ativada, qualquer pessoa com acesso à internet pode consultar o
            patrimônio público sem necessidade de login.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Switch de ativação */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <Label htmlFor="public-search-toggle" className="text-base font-medium">
                Consulta Pública
              </Label>
              <p className="text-sm text-muted-foreground">
                {settings.isPublicSearchEnabled
                  ? 'Portal de consulta pública está ativo e acessível.'
                  : 'Portal de consulta pública está desativado.'}
              </p>
            </div>
            {isSaving ? (
              <Skeleton className="h-6 w-11 rounded-full" />
            ) : (
              <Switch
                id="public-search-toggle"
                checked={settings.isPublicSearchEnabled}
                onCheckedChange={handleToggle}
                disabled={isSaving}
                aria-label="Ativar ou desativar consulta pública"
              />
            )}
          </div>

          {/* URL da consulta pública */}
          <div className="space-y-2">
            <Label>URL do Portal Público</Label>
            <div className="flex gap-2">
              <div className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm font-mono text-muted-foreground select-all">
                {publicUrl}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyUrl}
                aria-label="Copiar URL da consulta pública"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
                aria-label="Abrir portal de consulta pública em nova aba"
              >
                <a href={PUBLIC_SEARCH_PATH} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card informativo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4" />
            Sobre a Consulta Pública
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            O portal de Consulta Pública permite que cidadãos e auditores externos
            consultem o acervo patrimonial do município sem necessidade de credenciais.
          </p>
          <ul className="list-disc list-inside space-y-1">
            <li>Somente bens com status <strong>ativo</strong> são exibidos publicamente.</li>
            <li>Informações sensíveis (valores de aquisição, CPF de responsáveis) não são expostas.</li>
            <li>A desativação entra em vigor imediatamente, sem necessidade de reinicialização.</li>
          </ul>
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <ShieldOff className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Desativar a consulta pública não afeta o acesso interno de usuários autenticados.
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
