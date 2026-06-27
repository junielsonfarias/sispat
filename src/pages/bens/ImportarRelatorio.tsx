import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import {
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { useSectors } from '@/hooks/queries/use-sectors'
import { useAuth } from '@/hooks/useAuth'

// ── Tipos locais (espelham o contrato do backend) ──────────────────────────

interface FonteRecurso {
  codigo: string
  descricao: string
  valor: number
}

interface UgImportada {
  nome: string
  fontes: FonteRecurso[]
  origemRecursoSugerida: string | null
  fundoSugerido: string | null
}

interface ItemImportado {
  ug: string
  unidadeOrcamentaria: string
  dotacaoCodigo: string
  dotacao: string
  projetoAtividade: string
  subelementoCodigo: string
  subelementoNome: string
  descricao: string
  quantidade: number
  valorUnitario: number
  valorTotal: number
  dataAquisicao: string
  numeroNotaFiscal: string
  fornecedor: string
  empenhoProcesso: string
  numeroEmpenho: string
  numeroLiquidacao: string
  tipoSugerido: string
  formaAquisicaoSugerida: string
  numeroLicitacao: string
  anoLicitacao: number | null
  observacoes: string
}

interface RelatorioParseado {
  exercicio: string | null
  municipio: string | null
  ugs: UgImportada[]
  itens: ItemImportado[]
  avisos: string[]
}

// payload do confirmar (1 por item parseado; o backend explode a quantidade)
interface ItemConfirmado {
  descricao: string
  quantidade: number
  valorUnitario: number
  dataAquisicao: string
  numeroNotaFiscal?: string | null
  fornecedor?: string | null
  numeroEmpenho?: string | null
  numeroLiquidacao?: string | null
  tipo: string
  formaAquisicao: string
  origemRecurso?: string | null
  fundoRecurso?: string | null
  numeroLicitacao?: string | null
  anoLicitacao?: number | null
  observacoes?: string | null
  sectorId: string
  setorNome: string
  localObjeto?: string | null
}

interface ConfirmarResponse {
  total: number
  linhas: number
  patrimonios: unknown[]
}

// Edições sobre cada item da tabela
interface ItemEditado {
  descricao: string
  quantidade: number
  valorUnitario: number
  tipo: string
  formaAquisicao: string
  origemRecurso: string
  // Nome do fundo/fonte específica (FUNDEB, VAAT, SUS...) — só relevante quando a
  // origem é transferência entre entes.
  fundoRecurso: string
  // true quando a UG não permitiu inferir a origem com segurança (fontes mistas
  // ou não reconhecidas) e caiu no padrão "proprio" — operador deve revisar.
  origemRevisar: boolean
}

// ── Helpers ────────────────────────────────────────────────────────────────

const BACKEND_URL =
  import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000'

const getAuthToken = (): string | null => {
  const raw = localStorage.getItem('sispat_token')
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

const readCsrfCookie = (): string => {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

// Formata a data ISO da NF para dd/mm/aaaa (sem deslocar pelo fuso).
const formatarData = (iso: string): string => {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('pt-BR', { timeZone: 'UTC' })
}

const ORIGENS_RECURSO: { value: string; label: string }[] = [
  { value: 'proprio', label: 'Recursos Próprios' },
  { value: 'convenio', label: 'Convênio' },
  { value: 'emenda', label: 'Emenda Parlamentar' },
  { value: 'transferencia_ente', label: 'Transferência entre Entes' },
  { value: 'outro', label: 'Outro' },
]

// Fundos comuns sugeridos no datalist quando o setor não tem fundos cadastrados.
const FUNDOS_SUGERIDOS = [
  'FUNDEB',
  'VAAT',
  'VAAF',
  'Salário-Educação',
  'SUS',
  'PNAE',
  'PNATE',
]

const formatCurrency = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// Tenta encontrar um setor pelo nome da UG (match parcial, case-insensitive)
const tentarPreSelecionar = (
  ugNome: string,
  sectors: { id: string; name: string }[],
): string => {
  const ug = ugNome.toLowerCase()
  const encontrado = sectors.find(
    (s) =>
      ug.includes(s.name.toLowerCase()) ||
      s.name.toLowerCase().includes(ug),
  )
  return encontrado?.id ?? ''
}

// ── Componente principal ───────────────────────────────────────────────────

type Etapa = 'upload' | 'mapeamento' | 'sucesso'

const ImportarRelatorio = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: sectors = [], isLoading: loadingSetores } = useSectors()

  const [etapa, setEtapa] = useState<Etapa>('upload')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [analisando, setAnalisando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  const [relatorio, setRelatorio] = useState<RelatorioParseado | null>(null)
  const [mapaSetor, setMapaSetor] = useState<Record<string, string>>({})
  const [edicoes, setEdicoes] = useState<ItemEditado[]>([])
  const [resultado, setResultado] = useState<ConfirmarResponse | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const isAdminOuSuperuser =
    user?.role === 'admin' || user?.role === 'superuser'

  // ── Etapa 2 helpers ───────────────────────────────────────────────────────

  const ugsSemSetor = relatorio
    ? relatorio.ugs
        .map((ug) => ug.nome)
        .filter((nome) => !mapaSetor[nome])
    : []

  const totalUnidades = edicoes.reduce(
    (acc, e) => acc + (Number(e.quantidade) || 0),
    0,
  )
  const totalValor = edicoes.reduce(
    (acc, e) =>
      acc + (Number(e.quantidade) || 0) * (Number(e.valorUnitario) || 0),
    0,
  )

  const atualizarEdicao = useCallback(
    (idx: number, campo: keyof ItemEditado, valor: string | number) => {
      setEdicoes((prev) => {
        const copia = [...prev]
        copia[idx] = { ...copia[idx], [campo]: valor }
        return copia
      })
    },
    [],
  )

  // ── Etapa 1: Upload e análise ─────────────────────────────────────────────

  const handleAnalisar = useCallback(async () => {
    if (!arquivo) return

    setAnalisando(true)
    try {
      const formData = new FormData()
      formData.append('arquivo', arquivo)

      const token = getAuthToken()
      const csrf = readCsrfCookie()
      const response = await axios.post<RelatorioParseado>(
        `${BACKEND_URL}/api/importacao/material-permanente/preview`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            // Sessão por cookie exige o double-submit do CSRF (igual ao confirmar).
            ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
          },
          timeout: 60000,
          withCredentials: true,
        },
      )

      const parsed = response.data

      // Inicializa edições com valores sugeridos
      const eds: ItemEditado[] = parsed.itens.map((item) => {
        const ugInfo = parsed.ugs.find((u) => u.nome === item.ug)
        const sugerida = ugInfo?.origemRecursoSugerida ?? null
        return {
          descricao: item.descricao,
          quantidade: item.quantidade,
          valorUnitario: item.valorUnitario,
          tipo: item.tipoSugerido,
          formaAquisicao: item.formaAquisicaoSugerida,
          origemRecurso: sugerida ?? 'proprio',
          fundoRecurso: ugInfo?.fundoSugerido ?? '',
          origemRevisar: sugerida === null,
        }
      })

      // Inicializa mapa UG → setor com tentativa de pré-seleção
      const mapa: Record<string, string> = {}
      parsed.ugs.forEach((ug) => {
        mapa[ug.nome] = tentarPreSelecionar(ug.nome, sectors)
      })

      setRelatorio(parsed)
      setEdicoes(eds)
      setMapaSetor(mapa)
      setEtapa('mapeamento')
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { message?: string } }
        message?: string
      }
      toast({
        variant: 'destructive',
        title: 'Erro ao analisar relatório',
        description:
          axiosErr.response?.data?.message ??
          axiosErr.message ??
          'Falha ao processar o PDF. Verifique se é um relatório SIAFIC válido.',
      })
    } finally {
      setAnalisando(false)
    }
  }, [arquivo, sectors])

  // ── Etapa 3: Confirmar ────────────────────────────────────────────────────

  const handleConfirmar = useCallback(async () => {
    if (!relatorio || ugsSemSetor.length > 0) return

    const itens: ItemConfirmado[] = relatorio.itens.map((item, idx) => {
      const ed = edicoes[idx]
      const sectorId = mapaSetor[item.ug] ?? ''
      const setor = sectors.find((s) => s.id === sectorId)
      return {
        descricao: ed.descricao,
        quantidade: Number(ed.quantidade),
        valorUnitario: Number(ed.valorUnitario),
        dataAquisicao: item.dataAquisicao,
        numeroNotaFiscal: item.numeroNotaFiscal || null,
        fornecedor: item.fornecedor || null,
        numeroEmpenho: item.numeroEmpenho || null,
        numeroLiquidacao: item.numeroLiquidacao || null,
        tipo: ed.tipo,
        formaAquisicao: ed.formaAquisicao,
        origemRecurso: ed.origemRecurso || null,
        // O fundo só faz sentido para transferência entre entes.
        fundoRecurso:
          ed.origemRecurso === 'transferencia_ente'
            ? ed.fundoRecurso.trim() || null
            : null,
        numeroLicitacao: item.numeroLicitacao || null,
        anoLicitacao: item.anoLicitacao ?? null,
        observacoes: item.observacoes || null,
        sectorId,
        setorNome: setor?.name ?? item.ug,
        localObjeto: null,
      }
    })

    setConfirmando(true)
    try {
      const token = getAuthToken()
      const csrf = readCsrfCookie()

      const response = await axios.post<ConfirmarResponse>(
        `${BACKEND_URL}/api/importacao/material-permanente/confirmar`,
        { itens },
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
          },
          withCredentials: true,
          timeout: 120000,
        },
      )

      setResultado(response.data)
      setEtapa('sucesso')
      toast({
        title: 'Importação concluída',
        description: `${response.data.total} bens importados com sucesso.`,
      })
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { message?: string } }
        message?: string
      }
      toast({
        variant: 'destructive',
        title: 'Erro ao importar',
        description:
          axiosErr.response?.data?.message ??
          axiosErr.message ??
          'Falha ao gravar os bens. Tente novamente.',
      })
    } finally {
      setConfirmando(false)
    }
  }, [relatorio, edicoes, mapaSetor, sectors, ugsSemSetor.length])

  // ── RBAC guard (após todos os hooks) ─────────────────────────────────────
  if (!isAdminOuSuperuser) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
            <p className="font-medium text-foreground">Acesso negado</p>
            <p className="text-sm text-muted-foreground mt-1">
              Apenas administradores podem importar relatórios.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-6">
      <div
        className={`${
          etapa === 'mapeamento' ? 'max-w-[1600px]' : 'max-w-5xl'
        } mx-auto space-y-6`}
      >
        {/* Cabeçalho */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Importar Relatório SIAFIC
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Importe bens móveis (material permanente) a partir do relatório de
            liquidação em PDF exportado pelo SIAFIC.
          </p>
        </div>

        {/* Indicador de etapas */}
        <ol className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {(['upload', 'mapeamento', 'sucesso'] as Etapa[]).map((e, idx) => {
            const labels: Record<Etapa, string> = {
              upload: '1. Upload',
              mapeamento: '2. Revisão',
              sucesso: '3. Concluído',
            }
            const ativa = etapa === e
            const concluida =
              (e === 'upload' && (etapa === 'mapeamento' || etapa === 'sucesso')) ||
              (e === 'mapeamento' && etapa === 'sucesso')
            return (
              <li key={e} className="flex items-center gap-2">
                {idx > 0 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                )}
                <span
                  className={
                    ativa
                      ? 'text-blue-600 font-semibold'
                      : concluida
                        ? 'text-green-600'
                        : 'text-muted-foreground'
                  }
                >
                  {labels[e]}
                </span>
              </li>
            )
          })}
        </ol>

        {/* ── ETAPA 1: Upload ─────────────────────────────────────────────── */}
        {etapa === 'upload' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Selecione o arquivo PDF
              </CardTitle>
              <CardDescription>
                Relatório de liquidação de material permanente exportado do
                SIAFIC (extensão .pdf).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div
                className="border-2 border-dashed border-input rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
                }}
                role="button"
                tabIndex={0}
                aria-label="Clique para selecionar um arquivo PDF"
              >
                {arquivo ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-10 w-10 text-blue-500" />
                    <p className="font-medium text-foreground">{arquivo.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(arquivo.size / 1024).toFixed(1)} KB
                    </p>
                    <p className="text-xs text-blue-500 hover:underline mt-1">
                      Clique para trocar
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <p className="text-muted-foreground font-medium">
                      Arraste ou clique para selecionar
                    </p>
                    <p className="text-sm text-muted-foreground">Apenas arquivos .pdf</p>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="sr-only"
                aria-label="Selecionar arquivo PDF"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) setArquivo(f)
                }}
              />

              <div className="flex justify-end">
                <Button
                  onClick={handleAnalisar}
                  disabled={!arquivo || analisando}
                  className="min-w-[160px]"
                >
                  {analisando ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Analisando...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Analisar relatório
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── ETAPA 2: Mapeamento e revisão ──────────────────────────────── */}
        {etapa === 'mapeamento' && relatorio && (
          <>
            {/* Aviso: a tabela de revisão é larga e foi pensada para desktop */}
            <div className="lg:hidden rounded-md border border-amber-200 bg-amber-50 text-amber-900 px-4 py-3 text-sm">
              Esta etapa de revisão tem muitas colunas editáveis e foi pensada
              para telas maiores. Em celular os campos ficam apertados —
              recomendamos concluir a importação em um computador.
            </div>
            {/* Metadados do relatório */}
            <div className="flex flex-wrap gap-3">
              {relatorio.exercicio && (
                <Badge variant="outline" className="text-sm px-3 py-1">
                  Exercício: {relatorio.exercicio}
                </Badge>
              )}
              {relatorio.municipio && (
                <Badge variant="outline" className="text-sm px-3 py-1">
                  Município: {relatorio.municipio}
                </Badge>
              )}
              <Badge variant="outline" className="text-sm px-3 py-1">
                {relatorio.itens.length} linha(s) / {totalUnidades} unidade(s)
              </Badge>
            </div>

            {/* Aviso do fluxo de almoxarifado */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-4">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    Todos os bens serão tombados automaticamente no{' '}
                    <strong>Almoxarifado</strong> do setor de destino. Depois, o
                    usuário da secretaria complementa as informações e distribui
                    cada bem para o local correto (escola, prédio, etc.).
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Avisos do parser */}
            {relatorio.avisos.length > 0 && (
              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="pt-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800 mb-1">
                        Avisos do parser:
                      </p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {relatorio.avisos.map((aviso, i) => (
                          <li key={i} className="text-sm text-yellow-700">
                            {aviso}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Aviso de UGs sem setor */}
            {ugsSemSetor.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-800 mb-1">
                        Mapeie o setor de destino para todas as UGs antes de
                        importar:
                      </p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {ugsSemSetor.map((ug) => (
                          <li key={ug} className="text-sm text-red-700">
                            {ug}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mapeamento UG → Setor */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Mapear Unidades Gestoras para Setores
                </CardTitle>
                <CardDescription>
                  Cada UG deve ser mapeada para um setor cadastrado no sistema.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {relatorio.ugs.map((ug) => (
                    <div
                      key={ug.nome}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-md border bg-muted"
                    >
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          Unidade Gestora
                        </Label>
                        <p className="text-sm font-medium text-foreground">
                          {ug.nome}
                        </p>
                        {ug.fontes.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Fontes:{' '}
                            {ug.fontes.map((f) => f.descricao).join(', ')}
                          </p>
                        )}
                      </div>
                      <div>
                        <Label
                          htmlFor={`setor-${ug.nome}`}
                          className="text-xs text-muted-foreground mb-1 block"
                        >
                          Setor de destino{' '}
                          <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={mapaSetor[ug.nome] ?? ''}
                          onValueChange={(val) =>
                            setMapaSetor((prev) => ({
                              ...prev,
                              [ug.nome]: val,
                            }))
                          }
                          disabled={loadingSetores}
                        >
                          <SelectTrigger
                            id={`setor-${ug.nome}`}
                            className="w-full"
                            aria-label={`Setor para ${ug.nome}`}
                          >
                            <SelectValue placeholder="Selecione o setor..." />
                          </SelectTrigger>
                          <SelectContent>
                            {sectors.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Tabela editável de itens */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  Itens do relatório
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>
                          Edite descrição, quantidade, valor unitário, tipo e
                          forma de aquisição antes de importar. NF/Fornecedor/
                          Empenho/Liquidação vêm do PDF e não são editáveis.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div>
                  <Table
                    className="w-full table-fixed"
                    containerClassName="max-h-[65vh]"
                  >
                    <TableHeader className="sticky top-0 z-20 [&_th]:bg-muted [&_th]:shadow-[inset_0_-1px_0_rgb(229,231,235)]">
                      <TableRow>
                        <TableHead className="w-[26%]">Descrição</TableHead>
                        <TableHead className="w-[7%] text-center">Qtd</TableHead>
                        <TableHead className="w-[11%] text-right">
                          Vl. Unitário
                        </TableHead>
                        <TableHead className="w-[14%]">Tipo</TableHead>
                        <TableHead className="w-[13%]">Forma Aquisição</TableHead>
                        <TableHead className="w-[14%]">Origem Recurso</TableHead>
                        <TableHead className="w-[9%] text-center">
                          UG / Setor
                        </TableHead>
                        <TableHead className="w-[6%] text-center">Info</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {relatorio.itens.map((item, idx) => {
                        const ed = edicoes[idx]
                        if (!ed) return null
                        return (
                          <TableRow key={idx}>
                            {/* Descrição (até 2 linhas, com quebra automática) */}
                            <TableCell className="align-top">
                              <Textarea
                                value={ed.descricao}
                                onChange={(e) =>
                                  atualizarEdicao(
                                    idx,
                                    'descricao',
                                    e.target.value,
                                  )
                                }
                                rows={2}
                                className="min-h-[3.5rem] text-xs leading-snug resize-none py-1.5 break-words"
                                aria-label={`Descrição do item ${idx + 1}`}
                              />
                            </TableCell>
                            {/* Quantidade */}
                            <TableCell className="align-top">
                              <Input
                                type="number"
                                min={1}
                                value={ed.quantidade}
                                onChange={(e) =>
                                  atualizarEdicao(
                                    idx,
                                    'quantidade',
                                    parseInt(e.target.value, 10) || 1,
                                  )
                                }
                                className="h-8 text-xs text-center px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                aria-label={`Quantidade do item ${idx + 1}`}
                              />
                            </TableCell>
                            {/* Valor unitário (formatado em R$) */}
                            <TableCell className="align-top">
                              <CurrencyInput
                                value={ed.valorUnitario}
                                onChange={(v) =>
                                  atualizarEdicao(idx, 'valorUnitario', v)
                                }
                                className="h-8 text-xs text-right px-2"
                                aria-label={`Valor unitário do item ${idx + 1}`}
                              />
                            </TableCell>
                            {/* Tipo (com quebra de linha) */}
                            <TableCell className="align-top">
                              <Textarea
                                value={ed.tipo}
                                onChange={(e) =>
                                  atualizarEdicao(idx, 'tipo', e.target.value)
                                }
                                rows={2}
                                className="min-h-[3.5rem] text-xs leading-snug resize-none py-1.5 break-words"
                                aria-label={`Tipo do item ${idx + 1}`}
                              />
                            </TableCell>
                            {/* Forma de aquisição (com quebra de linha) */}
                            <TableCell className="align-top">
                              <Textarea
                                value={ed.formaAquisicao}
                                onChange={(e) =>
                                  atualizarEdicao(
                                    idx,
                                    'formaAquisicao',
                                    e.target.value,
                                  )
                                }
                                rows={2}
                                className="min-h-[3.5rem] text-xs leading-snug resize-none py-1.5 break-words"
                                aria-label={`Forma de aquisição do item ${idx + 1}`}
                              />
                            </TableCell>
                            {/* Origem do recurso */}
                            <TableCell className="align-top">
                              <Select
                                value={ed.origemRecurso}
                                onValueChange={(val) => {
                                  // Editar a origem conta como revisão: limpa o alerta.
                                  setEdicoes((prev) => {
                                    const copia = [...prev]
                                    copia[idx] = {
                                      ...copia[idx],
                                      origemRecurso: val,
                                      origemRevisar: false,
                                    }
                                    return copia
                                  })
                                }}
                              >
                                <SelectTrigger
                                  className={`h-auto min-h-[3.5rem] text-xs text-left items-start py-1.5 [&>span]:line-clamp-2 [&>span]:whitespace-normal ${
                                    ed.origemRevisar
                                      ? 'border-amber-400 bg-amber-50 text-amber-900 focus:ring-amber-400'
                                      : ''
                                  }`}
                                  aria-label={`Origem recurso do item ${idx + 1}`}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ORIGENS_RECURSO.map((o) => (
                                    <SelectItem key={o.value} value={o.value}>
                                      {o.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {ed.origemRevisar && (
                                <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-amber-600">
                                  <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                                  Origem presumida — revise
                                </p>
                              )}
                              {/* Fundo: só p/ transferência entre entes */}
                              {ed.origemRecurso === 'transferencia_ente' && (
                                <>
                                  <Input
                                    list={`fundos-${idx}`}
                                    value={ed.fundoRecurso}
                                    onChange={(e) =>
                                      atualizarEdicao(
                                        idx,
                                        'fundoRecurso',
                                        e.target.value,
                                      )
                                    }
                                    placeholder="Fundo (ex.: FUNDEB)"
                                    className="mt-1 h-7 text-xs"
                                    aria-label={`Fundo do recurso do item ${idx + 1}`}
                                  />
                                  <datalist id={`fundos-${idx}`}>
                                    {Array.from(
                                      new Set([
                                        ...(sectors.find(
                                          (s) => s.id === mapaSetor[item.ug],
                                        )?.fundos ?? []),
                                        ...FUNDOS_SUGERIDOS,
                                      ]),
                                    ).map((f) => (
                                      <option key={f} value={f} />
                                    ))}
                                  </datalist>
                                </>
                              )}
                            </TableCell>
                            {/* UG (read-only) */}
                            <TableCell className="text-center">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      variant={
                                        mapaSetor[item.ug]
                                          ? 'secondary'
                                          : 'destructive'
                                      }
                                      className="text-xs cursor-default truncate max-w-[80px]"
                                    >
                                      {mapaSetor[item.ug]
                                        ? (sectors.find(
                                            (s) => s.id === mapaSetor[item.ug],
                                          )?.name ?? item.ug)
                                        : 'Sem setor'}
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>UG: {item.ug}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            {/* Tooltip com info NF/Fornecedor/Empenho */}
                            <TableCell className="text-center">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      aria-label={`Informações adicionais do item ${idx + 1}`}
                                      className="inline-flex items-center justify-center rounded-full h-6 w-6 text-muted-foreground hover:text-muted-foreground hover:bg-muted"
                                    >
                                      <Info className="h-3.5 w-3.5" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-sm text-left">
                                    <div className="space-y-1 text-xs">
                                      {item.numeroNotaFiscal && (
                                        <p>NF: {item.numeroNotaFiscal}</p>
                                      )}
                                      {item.dataAquisicao && (
                                        <p>Data: {formatarData(item.dataAquisicao)}</p>
                                      )}
                                      {item.fornecedor && (
                                        <p>Fornecedor: {item.fornecedor}</p>
                                      )}
                                      {(item.empenhoProcesso || item.numeroEmpenho) && (
                                        <p>
                                          Empenho:{' '}
                                          {[item.empenhoProcesso, item.numeroEmpenho]
                                            .filter(Boolean)
                                            .join(' / ')}
                                        </p>
                                      )}
                                      {item.numeroLiquidacao && (
                                        <p>Liquidação: {item.numeroLiquidacao}</p>
                                      )}
                                      {item.numeroLicitacao && (
                                        <p>
                                          Licitação/Processo: {item.numeroLicitacao}
                                          {item.anoLicitacao
                                            ? ` (${item.anoLicitacao})`
                                            : ''}
                                        </p>
                                      )}
                                      {item.unidadeOrcamentaria && (
                                        <p>Unidade orç.: {item.unidadeOrcamentaria}</p>
                                      )}
                                      {(item.dotacaoCodigo || item.projetoAtividade) && (
                                        <p>
                                          Dotação:{' '}
                                          {[item.dotacaoCodigo, item.projetoAtividade]
                                            .filter(Boolean)
                                            .join(' ')}
                                          {item.dotacao ? ` — ${item.dotacao}` : ''}
                                        </p>
                                      )}
                                      {item.subelementoCodigo && (
                                        <p>
                                          Classificação: 4.4.90.52.
                                          {item.subelementoCodigo} {item.subelementoNome}
                                        </p>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Rodapé com totais */}
                <div className="border-t bg-muted px-4 py-3 flex flex-wrap gap-4 items-center justify-between">
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span>
                      <strong>{relatorio.itens.length}</strong> linhas
                    </span>
                    <span>
                      <strong>{totalUnidades}</strong> unidades a criar
                    </span>
                    <span>
                      Valor total:{' '}
                      <strong className="text-foreground">
                        {formatCurrency(totalValor)}
                      </strong>
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Ações */}
            <div className="flex items-center justify-between gap-3 pb-6">
              <Button
                variant="outline"
                onClick={() => {
                  setEtapa('upload')
                  setRelatorio(null)
                  setEdicoes([])
                  setMapaSetor({})
                  setArquivo(null)
                }}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>

              <Button
                onClick={handleConfirmar}
                disabled={confirmando || ugsSemSetor.length > 0}
                className="min-w-[200px]"
              >
                {confirmando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Importar {totalUnidades} bem(ns)
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* ── ETAPA 3: Sucesso ────────────────────────────────────────────── */}
        {etapa === 'sucesso' && resultado && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-8 pb-8 flex flex-col items-center gap-6 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
              <div>
                <h2 className="text-2xl font-bold text-green-800 mb-2">
                  Importação concluída!
                </h2>
                <p className="text-green-700">
                  <strong>{resultado.total}</strong> bens criados a partir de{' '}
                  <strong>{resultado.linhas}</strong> linha(s) do relatório.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEtapa('upload')
                    setRelatorio(null)
                    setEdicoes([])
                    setMapaSetor({})
                    setArquivo(null)
                    setResultado(null)
                  }}
                >
                  Importar outro relatório
                </Button>
                <Button onClick={() => navigate('/bens-cadastrados')}>
                  Ver bens cadastrados
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default ImportarRelatorio
