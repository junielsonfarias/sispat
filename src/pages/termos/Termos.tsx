import { useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollText, Printer, RefreshCw, Info, Search } from 'lucide-react'
import { useAllPatrimonios } from '@/hooks/queries/use-all-patrimonios'
import { api } from '@/services/api-adapter'
import { toast } from '@/hooks/use-toast'
import { useConfirm } from '@/hooks/useConfirm'
import { formatDate } from '@/lib/utils'
import { logger } from '@/lib/logger'

// ---- Tipos ----

type TipoTermo = 'carga' | 'incorporacao' | 'baixa'

interface MunicipioInfo {
  nome: string
  estado: string
}

interface BemInfo {
  numero_patrimonio: string
  descricao_bem: string
  tipo?: string | null
  marca?: string | null
  modelo?: string | null
  numero_serie?: string | null
  estado_conservacao?: string | null
  valor_aquisicao?: number | null
  data_aquisicao?: string | null
  forma_aquisicao?: string | null
  status: string
  destinacao?: string | null
  setor?: string | null
  setor_codigo?: string | null
  local?: string | null
  responsavel?: string | null
}

interface BaixaInfo {
  data_baixa?: string | null
  motivo_baixa?: string | null
}

interface TermoData {
  tipo: TipoTermo
  titulo: string
  referenciaLegal: string
  corpo: string
  numero?: string | null
  emitidoEm?: string | null
  geradoEm: string
  municipio: MunicipioInfo
  bem: BemInfo
  baixa?: BaixaInfo | null
}

// ---- Labels ----

const TIPO_LABEL: Record<TipoTermo, string> = {
  carga: 'Termo de Carga',
  incorporacao: 'Termo de Incorporação',
  baixa: 'Termo de Baixa',
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
function formatBRL(value: number | null | undefined): string {
  if (value == null) return '—'
  return brl.format(value)
}

// ---- Documento imprimível ----

interface TermoDocumentoProps {
  termo: TermoData
}

function TermoDocumento({ termo }: TermoDocumentoProps) {
  const { bem, municipio, baixa } = termo

  return (
    <div className="termo-documento bg-white text-gray-900 p-8 max-w-[800px] mx-auto print:p-4 print:max-w-full print:shadow-none shadow-md border rounded-lg">
      {/* Cabeçalho */}
      <div className="text-center mb-8 border-b pb-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-gray-600 mb-1">
          Prefeitura Municipal de {municipio.nome} — {municipio.estado}
        </p>
        <h1 className="text-2xl font-bold uppercase tracking-wide mt-2">
          {termo.titulo}
        </h1>
        {termo.referenciaLegal && (
          <p className="text-xs text-gray-500 mt-1">{termo.referenciaLegal}</p>
        )}
        {termo.numero && (
          <p className="text-sm font-semibold mt-2">
            Termo nº {termo.numero}
            {termo.emitidoEm ? ` — emitido em ${formatDate(termo.emitidoEm)}` : ''}
          </p>
        )}
      </div>

      {/* Corpo do texto */}
      {termo.corpo && (
        <div className="mb-6 text-sm leading-relaxed text-justify whitespace-pre-line">
          {termo.corpo}
        </div>
      )}

      {/* Dados do bem */}
      <div className="mb-8">
        <h2 className="text-sm font-bold uppercase tracking-wide border-b mb-3 pb-1">
          Dados do Bem Patrimonial
        </h2>
        <table className="w-full text-sm border-collapse">
          <tbody>
            {[
              ['Número de Patrimônio', bem.numero_patrimonio],
              ['Descrição', bem.descricao_bem],
              ['Tipo / Categoria', bem.tipo],
              ['Marca', bem.marca],
              ['Modelo', bem.modelo],
              ['Número de Série', bem.numero_serie],
              ['Estado de Conservação', bem.estado_conservacao],
              ['Valor de Aquisição', formatBRL(bem.valor_aquisicao)],
              [
                'Data de Aquisição',
                bem.data_aquisicao ? formatDate(bem.data_aquisicao) : null,
              ],
              ['Forma de Aquisição', bem.forma_aquisicao],
              ['Status', bem.status],
              ['Destinação', bem.destinacao],
              ['Setor Responsável', bem.setor],
              ['Código do Setor', bem.setor_codigo],
              ['Local', bem.local],
              ['Responsável', bem.responsavel],
            ]
              .filter(([, val]) => val != null && val !== '')
              .map(([label, value]) => (
                <tr
                  key={label}
                  className="border-b border-gray-100 even:bg-gray-50"
                >
                  <td className="py-1.5 pr-4 font-medium text-gray-600 w-48 text-xs">
                    {label}
                  </td>
                  <td className="py-1.5 text-gray-900">{value}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Dados de baixa (apenas para termo de baixa) */}
      {termo.tipo === 'baixa' && baixa && (
        <div className="mb-8">
          <h2 className="text-sm font-bold uppercase tracking-wide border-b mb-3 pb-1">
            Dados da Baixa
          </h2>
          <table className="w-full text-sm border-collapse">
            <tbody>
              {baixa.data_baixa && (
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 pr-4 font-medium text-gray-600 w-48 text-xs">
                    Data da Baixa
                  </td>
                  <td className="py-1.5 text-gray-900">
                    {formatDate(baixa.data_baixa)}
                  </td>
                </tr>
              )}
              {baixa.motivo_baixa && (
                <tr className="border-b border-gray-100">
                  <td className="py-1.5 pr-4 font-medium text-gray-600 w-48 text-xs">
                    Motivo da Baixa
                  </td>
                  <td className="py-1.5 text-gray-900">{baixa.motivo_baixa}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Campos de assinatura */}
      <div className="mt-12 grid grid-cols-2 gap-12 print:mt-8">
        <div className="text-center">
          <div className="border-t border-gray-400 pt-2 mt-12">
            <p className="text-sm font-medium">Responsável pelo Bem</p>
            {bem.responsavel && (
              <p className="text-xs text-gray-500 mt-0.5">{bem.responsavel}</p>
            )}
            {bem.setor && (
              <p className="text-xs text-gray-500">{bem.setor}</p>
            )}
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-gray-400 pt-2 mt-12">
            <p className="text-sm font-medium">Setor de Patrimônio</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Prefeitura de {municipio.nome}
            </p>
          </div>
        </div>
      </div>

      {/* Rodapé do documento */}
      <div className="mt-8 pt-4 border-t text-xs text-gray-400 text-center">
        Gerado em: {formatDate(termo.geradoEm)} — SISPAT 2.0
      </div>
    </div>
  )
}

// ---- Página principal ----

export default function Termos() {
  const [searchParams] = useSearchParams()
  const { data: patrimonios = [], isLoading: loadingPatrimonios } = useAllPatrimonios()
  const confirm = useConfirm()

  // Pré-selecionar via query string (usado pelo DesfazimentoList)
  const [selectedPatrimonioId, setSelectedPatrimonioId] = useState<string>(
    searchParams.get('patrimonioId') ?? '',
  )
  const [selectedTipo, setSelectedTipo] = useState<TipoTermo>(
    (searchParams.get('tipo') as TipoTermo) ?? 'carga',
  )

  const [search, setSearch] = useState('')
  const [termoData, setTermoData] = useState<TermoData | null>(null)
  const [loading, setLoading] = useState(false)
  const fetchingRef = useRef(false)

  // Filtro de busca no select de patrimônio
  const patrimoniosFiltrados = patrimonios.filter((p) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.numero_patrimonio.toLowerCase().includes(q) ||
      p.descricao_bem.toLowerCase().includes(q)
    )
  })

  const handleGerar = useCallback(async () => {
    if (!selectedPatrimonioId) {
      toast({
        variant: 'destructive',
        title: 'Selecione um bem patrimonial',
        description: 'É necessário selecionar um bem para gerar o termo.',
      })
      return
    }
    if (fetchingRef.current) return
    fetchingRef.current = true
    setLoading(true)
    setTermoData(null)
    try {
      const data = await api.get<TermoData>(
        `/termos/${selectedTipo}/${selectedPatrimonioId}`,
      )
      setTermoData(data)
    } catch (err) {
      logger.error('[Termos] Erro ao gerar termo', err)
      const message = (err as Error)?.message ?? 'Erro desconhecido'
      toast({
        variant: 'destructive',
        title: 'Não foi possível gerar o termo',
        description: message.includes('400') || message.toLowerCase().includes('baixado')
          ? 'O termo de baixa só pode ser gerado para bens com status "baixado".'
          : message,
      })
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [selectedPatrimonioId, selectedTipo])

  // Art. 14/34: formaliza a emissão do termo de carga (número + data registrados
  // no histórico do bem). A responsabilidade do agente consolida-se com a emissão.
  const handleEmitirCarga = useCallback(async () => {
    if (!selectedPatrimonioId || fetchingRef.current) return
    const ok = await confirm({
      title: 'Emitir termo de carga?',
      description:
        'Será gerado um número de termo e registrada a emissão no histórico do bem (Art. 14/34). A responsabilidade do agente consolida-se com a emissão.',
      confirmText: 'Emitir',
    })
    if (!ok) return
    fetchingRef.current = true
    setLoading(true)
    try {
      const data = await api.post<TermoData>(
        `/termos/${selectedPatrimonioId}/carga/emitir`,
        {},
      )
      setTermoData(data)
      toast({
        title: 'Termo de carga emitido',
        description: `Termo ${data.numero} registrado no histórico do bem.`,
      })
    } catch (err) {
      logger.error('[Termos] Erro ao emitir termo de carga', err)
      toast({
        variant: 'destructive',
        title: 'Não foi possível emitir o termo de carga',
        description: (err as Error)?.message ?? 'Erro desconhecido',
      })
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [selectedPatrimonioId, confirm])

  const handleImprimir = useCallback(() => {
    window.print()
  }, [])

  const patrimonioSelecionado = patrimonios.find((p) => p.id === selectedPatrimonioId)

  return (
    <>
      {/* CSS de impressão — esconde tudo exceto o documento */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          .termo-print-area { display: block !important; }
          .termo-print-area .termo-documento {
            border: none !important;
            box-shadow: none !important;
          }
          @page { margin: 15mm; size: A4; }
        }
      `}</style>

      <div className="flex flex-col gap-6 print:hidden">
        {/* Cabeçalho */}
        <div className="flex items-center gap-2">
          <ScrollText className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Termos Patrimoniais</h1>
        </div>

        {/* Nota informativa */}
        <div className="flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/20 p-3 text-sm text-blue-800 dark:text-blue-300">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            Selecione um bem e o tipo de termo desejado, depois clique em{' '}
            <strong>Gerar Termo</strong>. O documento gerado poderá ser impresso.
            O termo de baixa só funciona para bens com status <em>baixado</em>.
          </span>
        </div>

        {/* Painel de seleção */}
        <Card>
          <CardHeader>
            <CardTitle>Configurar Termo</CardTitle>
            <CardDescription>
              Escolha o bem patrimonial e o tipo de termo a ser gerado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Tipo de termo */}
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="tipo-termo">
                  Tipo de Termo
                </label>
                <Select
                  value={selectedTipo}
                  onValueChange={(v) => {
                    setSelectedTipo(v as TipoTermo)
                    setTermoData(null)
                  }}
                >
                  <SelectTrigger id="tipo-termo" aria-label="Tipo de termo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TIPO_LABEL) as TipoTermo[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {TIPO_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Busca de patrimônio */}
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="busca-patrimonio">
                  Buscar Bem
                </label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="busca-patrimonio"
                    className="pl-8"
                    placeholder="Número ou descrição..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    aria-label="Buscar bem patrimonial"
                  />
                </div>
              </div>

              {/* Select de patrimônio */}
              <div className="space-y-1">
                <label className="text-sm font-medium" htmlFor="select-patrimonio">
                  Bem Patrimonial
                </label>
                <Select
                  value={selectedPatrimonioId}
                  onValueChange={(v) => {
                    setSelectedPatrimonioId(v)
                    setTermoData(null)
                  }}
                  disabled={loadingPatrimonios}
                >
                  <SelectTrigger id="select-patrimonio" aria-label="Selecionar bem patrimonial">
                    <SelectValue
                      placeholder={
                        loadingPatrimonios ? 'Carregando bens...' : 'Selecione o bem'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {patrimoniosFiltrados.length === 0 ? (
                      <SelectItem value="__nenhum__" disabled>
                        {search ? 'Nenhum resultado' : 'Nenhum bem disponível'}
                      </SelectItem>
                    ) : (
                      patrimoniosFiltrados.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.numero_patrimonio} — {p.descricao_bem}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Info do bem selecionado */}
            {patrimonioSelecionado && (
              <div className="mt-4 rounded-md bg-muted p-3 text-sm flex flex-wrap gap-x-6 gap-y-1">
                <span>
                  <span className="font-medium">Nº: </span>
                  {patrimonioSelecionado.numero_patrimonio}
                </span>
                <span>
                  <span className="font-medium">Bem: </span>
                  {patrimonioSelecionado.descricao_bem}
                </span>
                <span>
                  <span className="font-medium">Status: </span>
                  <Badge variant="outline" className="text-xs ml-1">
                    {patrimonioSelecionado.status}
                  </Badge>
                </span>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => void handleGerar()}
                disabled={!selectedPatrimonioId || loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <ScrollText className="mr-2 h-4 w-4" />
                    Gerar Termo
                  </>
                )}
              </Button>

              {selectedTipo === 'carga' && (
                <Button
                  variant="secondary"
                  onClick={() => void handleEmitirCarga()}
                  disabled={!selectedPatrimonioId || loading}
                  title="Registra número e data do termo de carga no histórico do bem (Art. 14/34)"
                >
                  <ScrollText className="mr-2 h-4 w-4" />
                  Emitir termo de carga
                </Button>
              )}

              {termoData && (
                <Button variant="outline" onClick={handleImprimir}>
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Documento gerado */}
        {termoData && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold">
                {TIPO_LABEL[termoData.tipo]}
              </h2>
              <Button variant="outline" size="sm" onClick={handleImprimir}>
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
            </div>
            <TermoDocumento termo={termoData} />
          </div>
        )}
      </div>

      {/* Área de impressão — visível apenas ao imprimir */}
      {termoData && (
        <div className="termo-print-area hidden">
          <TermoDocumento termo={termoData} />
        </div>
      )}
    </>
  )
}
