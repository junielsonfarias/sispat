import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  CardContent,
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
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useInventory } from '@/contexts/InventoryContext'
import { useCustomization } from '@/contexts/CustomizationContext'
import { Inventory } from '@/types'
import { ArrowLeft, Printer, Download, CheckCircle, XCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { MUNICIPALITY_NAME } from '@/config/municipality'
import { generateInventoryPDF, generatePDFFromElement, type InventoryPDFData } from '@/lib/pdf-utils'
import { toast } from '@/hooks/use-toast'

export default function InventarioPrint() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getInventoryById } = useInventory()
  const { municipalityData } = useCustomization()
  const [inventory, setInventory] = useState<Inventory | null>(null)

  useEffect(() => {
    if (id) {
      const inv = getInventoryById(id)
      if (inv) {
        setInventory(inv)
      } else {
        navigate('/inventarios')
      }
    }
  }, [id, getInventoryById, navigate])

  const handlePrint = () => {
    window.print()
  }

  const handleExportPDF = async () => {
    if (!inventory) return

    try {
      const filename = `inventario-${inventory.name.replace(/[^a-zA-Z0-9]/g, '-')}-${formatDate(new Date()).replace(/[^a-zA-Z0-9]/g, '-')}.pdf`
      
      const pdfData: InventoryPDFData = {
        inventoryName: inventory.name,
        sectorName: inventory.sectorName,
        scope: inventory.scope,
        locationType: inventory.locationType,
        createdAt: inventory.createdAt,
        finalizedAt: inventory.finalizedAt,
        status: inventory.status,
        totalItems: inventory.items.length,
        foundCount: inventory.items.filter((i) => i.status === 'found').length,
        notFoundCount: inventory.items.filter((i) => i.status === 'not_found').length,
        items: inventory.items.map(item => ({
          numero_patrimonio: item.numero_patrimonio || item.numeroPatrimonio,
          descricao_bem: item.descricao_bem || item.descricaoBem,
          status: item.status
        }))
      }

      await generateInventoryPDF(pdfData, filename, {
        title: 'RELATÓRIO DE INVENTÁRIO PATRIMONIAL',
        subtitle: inventory.name,
        orientation: 'portrait',
        format: 'a4',
        includeDate: true,
        includeLogo: true,
        logoUrl: municipalityData?.logoUrl
      })

      toast({
        title: 'Sucesso!',
        description: 'PDF gerado e baixado com sucesso.',
      })
    } catch (error) {
      console.error('Erro ao gerar PDF:', error)
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Falha ao gerar PDF. Tente novamente.',
      })
    }
  }

  if (!inventory) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p>Carregando inventário...</p>
        </div>
      </div>
    )
  }

  const foundCount = inventory.items.filter((i) => i.status === 'found').length
  const notFoundCount = inventory.items.length - foundCount
  const totalValue = inventory.items.reduce((sum, item) => {
    // Assumindo que temos acesso ao valor do patrimônio
    // Por enquanto, vamos usar um valor simulado
    return sum + 1000 // Valor simulado
  }, 0)

  return (
    <div className="flex-1 p-4 lg:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Cabeçalho com botões de ação */}
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/inventarios')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold tracking-tight text-gray-900 mb-2">
                Imprimir Inventário
              </h1>
              <p className="text-base lg:text-lg text-gray-600">
                {inventory.name}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportPDF}>
              <Download className="mr-2 h-4 w-4" />
              Exportar PDF
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>

        {/* Conteúdo para impressão */}
        <div className="print:block print:p-0 print:m-0 print:max-w-none print:shadow-none">
          {/* Cabeçalho do documento */}
          <div className="text-center mb-8 print:mb-6">
            <div className="flex items-center justify-center mb-4 print:mb-2">
              <img
                src={municipalityData?.logoUrl || '/logo-government.svg'}
                alt="Logo"
                className="h-16 w-16 print:h-12 print:w-12"
              />
            </div>
            <h1 className="text-2xl font-bold print:text-xl">
              {MUNICIPALITY_NAME}
            </h1>
            <h2 className="text-xl font-semibold mt-2 print:text-lg">
              RELATÓRIO DE INVENTÁRIO PATRIMONIAL
            </h2>
          </div>

          {/* Informações do inventário */}
          <Card className="mb-6 print:mb-4 print:shadow-none print:border">
            <CardHeader className="print:pb-2">
              <CardTitle className="text-lg print:text-base">
                Informações do Inventário
              </CardTitle>
            </CardHeader>
            <CardContent className="print:pt-0">
              <div className="grid grid-cols-2 gap-4 print:gap-2">
                <div>
                  <strong>Nome:</strong> {inventory.name}
                </div>
                <div>
                  <strong>Setor:</strong> {inventory.sectorName}
                </div>
                <div>
                  <strong>Escopo:</strong>{' '}
                  {inventory.scope === 'sector'
                    ? 'Todo o Setor'
                    : `Local: ${inventory.locationType}`}
                </div>
                <div>
                  <strong>Data de Criação:</strong>{' '}
                  {formatDate(inventory.createdAt)}
                </div>
                <div>
                  <strong>Data de Finalização:</strong>{' '}
                  {inventory.finalizedAt
                    ? formatDate(inventory.finalizedAt)
                    : 'Não finalizado'}
                </div>
                <div>
                  <strong>Status:</strong>{' '}
                  <Badge
                    variant={
                      inventory.status === 'completed' ? 'default' : 'secondary'
                    }
                  >
                    {inventory.status === 'completed'
                      ? 'Concluído'
                      : 'Em Andamento'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resumo estatístico */}
          <Card className="mb-6 print:mb-4 print:shadow-none print:border">
            <CardHeader className="print:pb-2">
              <CardTitle className="text-lg print:text-base">
                Resumo Estatístico
              </CardTitle>
            </CardHeader>
            <CardContent className="print:pt-0">
              <div className="grid grid-cols-4 gap-4 print:gap-2">
                <div className="text-center">
                  <div className="text-2xl font-bold print:text-xl">
                    {inventory.items.length}
                  </div>
                  <div className="text-sm text-muted-foreground print:text-xs">
                    Total de Itens
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 print:text-xl">
                    {foundCount}
                  </div>
                  <div className="text-sm text-muted-foreground print:text-xs">
                    Encontrados
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600 print:text-xl">
                    {notFoundCount}
                  </div>
                  <div className="text-sm text-muted-foreground print:text-xs">
                    Não Encontrados
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold print:text-xl">
                    {((foundCount / inventory.items.length) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground print:text-xs">
                    Taxa de Encontro
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabela de itens */}
          <Card className="print:shadow-none print:border">
            <CardHeader className="print:pb-2">
              <CardTitle className="text-lg print:text-base">
                Detalhamento dos Itens
              </CardTitle>
            </CardHeader>
            <CardContent className="print:pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="print:text-xs">Nº Patrimônio</TableHead>
                    <TableHead className="print:text-xs">Descrição</TableHead>
                    <TableHead className="text-center print:text-xs">Status</TableHead>
                    <TableHead className="text-center print:text-xs">Observações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.items.map((item, index) => (
                    <TableRow key={`${item.patrimonioId}-${index}`}>
                      <TableCell className="font-medium print:text-xs">
                        {item.numero_patrimonio || item.numeroPatrimonio}
                      </TableCell>
                      <TableCell className="print:text-xs">
                        {item.descricao_bem || item.descricaoBem}
                      </TableCell>
                      <TableCell className="text-center print:text-xs">
                        <div className="flex items-center justify-center gap-1">
                          {item.status === 'found' ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-500 print:h-3 print:w-3" />
                              <span className="text-green-600 print:text-xs">
                                Encontrado
                              </span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 text-red-500 print:h-3 print:w-3" />
                              <span className="text-red-600 print:text-xs">
                                Não Encontrado
                              </span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center print:text-xs">
                        {item.status === 'not_found' ? 'Extraviado' : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Rodapé */}
          <div className="mt-8 print:mt-6 text-center text-sm text-muted-foreground print:text-xs">
            <p>
              Relatório gerado em {formatDate(new Date())} - Sistema SISPAT 2.0
            </p>
            <p className="mt-2">
              {MUNICIPALITY_NAME} - Gestão Patrimonial
            </p>
          </div>
        </div>
      </div>

      {/* Estilos para impressão */}
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
            font-size: 12px;
            line-height: 1.4;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:block {
            display: block !important;
          }
          
          .print\\:p-0 {
            padding: 0 !important;
          }
          
          .print\\:m-0 {
            margin: 0 !important;
          }
          
          .print\\:max-w-none {
            max-width: none !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:border {
            border: 1px solid #e5e7eb !important;
          }
          
          .print\\:mb-6 {
            margin-bottom: 1.5rem !important;
          }
          
          .print\\:mb-4 {
            margin-bottom: 1rem !important;
          }
          
          .print\\:mb-2 {
            margin-bottom: 0.5rem !important;
          }
          
          .print\\:pb-2 {
            padding-bottom: 0.5rem !important;
          }
          
          .print\\:pt-0 {
            padding-top: 0 !important;
          }
          
          .print\\:gap-2 {
            gap: 0.5rem !important;
          }
          
          .print\\:text-xl {
            font-size: 1.25rem !important;
          }
          
          .print\\:text-lg {
            font-size: 1.125rem !important;
          }
          
          .print\\:text-base {
            font-size: 1rem !important;
          }
          
          .print\\:text-xs {
            font-size: 0.75rem !important;
          }
          
          .print\\:h-12 {
            height: 3rem !important;
          }
          
          .print\\:w-12 {
            width: 3rem !important;
          }
          
          .print\\:h-3 {
            height: 0.75rem !important;
          }
          
          .print\\:w-3 {
            width: 0.75rem !important;
          }
          
          .print\\:mt-6 {
            margin-top: 1.5rem !important;
          }
        }
      `}</style>
    </div>
  )
}
