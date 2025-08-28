import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { Copy, Download, Eye, Printer, QrCode, Settings } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

interface QRCodeGeneratorProps {
  patrimonio?: {
    id: string
    numero_patrimonio: string
    descricao: string
    setor?: string
    local?: string
  }
  onGenerate?: (qrData: string) => void
  className?: string
}

interface QRCodeData {
  id: string
  numero_patrimonio: string
  descricao: string
  setor?: string
  local?: string
  timestamp: string
  url?: string
}

export const QRCodeGenerator: React.FC<QRCodeGeneratorProps> = ({
  patrimonio,
  onGenerate,
  className
}) => {
  const [qrData, setQrData] = useState<string>('')
  const [qrSize, setQrSize] = useState<number>(256)
  const [qrColor, setQrColor] = useState<string>('#000000')
  const [qrBgColor, setQrBgColor] = useState<string>('#FFFFFF')
  const [qrErrorLevel, setQrErrorLevel] = useState<'L' | 'M' | 'Q' | 'H'>('M')
  const [customText, setCustomText] = useState<string>('')
  const [includeLogo, setIncludeLogo] = useState<boolean>(false)
  const [logoSize, setLogoSize] = useState<number>(50)
  const [showPreview, setShowPreview] = useState<boolean>(true)
  
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const qrCodeRef = useRef<HTMLDivElement>(null)

  // Gerar dados do QR Code
  const generateQRData = (): QRCodeData => {
    const baseUrl = window.location.origin
    const timestamp = new Date().toISOString()
    
    return {
      id: patrimonio?.id || '',
      numero_patrimonio: patrimonio?.numero_patrimonio || '',
      descricao: patrimonio?.descricao || '',
      setor: patrimonio?.setor || '',
      local: patrimonio?.local || '',
      timestamp,
      url: `${baseUrl}/consulta-publica/patrimonio/${patrimonio?.id || ''}`
    }
  }

  // Gerar QR Code
  const generateQRCode = async () => {
    try {
      const QRCode = await import('qrcode')
      
      const data = generateQRData()
      const jsonData = JSON.stringify(data, null, 2)
      const finalData = customText ? `${customText}\n\n${jsonData}` : jsonData
      
      setQrData(finalData)

      if (canvasRef.current) {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        
        if (ctx) {
          // Limpar canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          
          // Configurações do QR Code
          const options = {
            errorCorrectionLevel: qrErrorLevel,
            type: 'canvas',
            quality: 0.92,
            margin: 1,
            color: {
              dark: qrColor,
              light: qrBgColor
            },
            width: qrSize
          }

          // Gerar QR Code
          await QRCode.toCanvas(canvas, finalData, options)
          
          // Adicionar logo se habilitado
          if (includeLogo && patrimonio?.numero_patrimonio) {
            await addLogoToQR(canvas, ctx)
          }

          onGenerate?.(finalData)
          
          toast({
            title: 'QR Code Gerado',
            description: 'QR Code criado com sucesso!',
          })
        }
      }
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error)
      toast({
        variant: 'destructive',
        title: 'Erro ao Gerar QR Code',
        description: 'Falha ao gerar o QR Code.',
      })
    }
  }

  // Adicionar logo ao QR Code
  const addLogoToQR = async (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    try {
      const logo = new Image()
      logo.crossOrigin = 'anonymous'
      
      logo.onload = () => {
        const centerX = canvas.width / 2
        const centerY = canvas.height / 2
        const logoX = centerX - logoSize / 2
        const logoY = centerY - logoSize / 2
        
        // Desenhar fundo branco para o logo
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(logoX - 2, logoY - 2, logoSize + 4, logoSize + 4)
        
        // Desenhar logo
        ctx.drawImage(logo, logoX, logoY, logoSize, logoSize)
      }
      
      // Usar logo padrão do sistema ou criar um texto
      logo.src = '/logo.png' // Ajustar para o caminho correto do logo
    } catch (error) {
      console.warn('Erro ao carregar logo:', error)
      // Fallback: desenhar texto do número do patrimônio
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(centerX - 30, centerY - 10, 60, 20)
      
      ctx.fillStyle = '#000000'
      ctx.font = '12px Arial'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(patrimonio?.numero_patrimonio || 'SISPAT', centerX, centerY)
    }
  }

  // Download do QR Code
  const downloadQRCode = () => {
    if (canvasRef.current) {
      const link = document.createElement('a')
      link.download = `qr-code-${patrimonio?.numero_patrimonio || 'patrimonio'}.png`
      link.href = canvasRef.current.toDataURL()
      link.click()
    }
  }

  // Imprimir QR Code
  const printQRCode = () => {
    if (qrCodeRef.current) {
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>QR Code - ${patrimonio?.numero_patrimonio}</title>
              <style>
                body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                .qr-container { text-align: center; }
                .qr-info { margin-top: 20px; }
                .qr-info h3 { margin: 5px 0; }
                .qr-info p { margin: 2px 0; color: #666; }
                @media print { body { margin: 0; } }
              </style>
            </head>
            <body>
              <div class="qr-container">
                <img src="${canvasRef.current?.toDataURL()}" alt="QR Code" style="max-width: 300px;">
                <div class="qr-info">
                  <h3>Patrimônio: ${patrimonio?.numero_patrimonio}</h3>
                  <p>${patrimonio?.descricao}</p>
                  ${patrimonio?.setor ? `<p>Setor: ${patrimonio.setor}</p>` : ''}
                  ${patrimonio?.local ? `<p>Local: ${patrimonio.local}</p>` : ''}
                  <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

  // Copiar dados do QR Code
  const copyQRData = async () => {
    try {
      await navigator.clipboard.writeText(qrData)
      toast({
        title: 'Dados Copiados',
        description: 'Dados do QR Code copiados para a área de transferência.',
      })
    } catch (error) {
      console.error('Erro ao copiar:', error)
      toast({
        variant: 'destructive',
        title: 'Erro ao Copiar',
        description: 'Falha ao copiar dados.',
      })
    }
  }

  // Gerar QR Code automaticamente quando patrimonio mudar
  useEffect(() => {
    if (patrimonio?.id) {
      generateQRCode()
    }
  }, [patrimonio?.id, patrimonio?.numero_patrimonio, patrimonio?.descricao])

  return (
    <div className={cn('space-y-4', className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Gerador de QR Code
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Informações do Patrimônio */}
          {patrimonio && (
            <div className="space-y-2">
              <Label>Patrimônio</Label>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <Badge variant="outline">Número: {patrimonio.numero_patrimonio}</Badge>
                </div>
                <div>
                  <Badge variant="outline">ID: {patrimonio.id}</Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{patrimonio.descricao}</p>
            </div>
          )}

          <Separator />

          {/* Configurações do QR Code */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <Label>Configurações</Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="qrSize">Tamanho</Label>
                <Select value={qrSize.toString()} onValueChange={(value) => setQrSize(Number(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="128">128px</SelectItem>
                    <SelectItem value="256">256px</SelectItem>
                    <SelectItem value="512">512px</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="qrErrorLevel">Nível de Correção</Label>
                <Select value={qrErrorLevel} onValueChange={(value: 'L' | 'M' | 'Q' | 'H') => setQrErrorLevel(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="L">Baixo (7%)</SelectItem>
                    <SelectItem value="M">Médio (15%)</SelectItem>
                    <SelectItem value="Q">Alto (25%)</SelectItem>
                    <SelectItem value="H">Máximo (30%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="qrColor">Cor do QR Code</Label>
                <Input
                  id="qrColor"
                  type="color"
                  value={qrColor}
                  onChange={(e) => setQrColor(e.target.value)}
                  className="h-10"
                />
              </div>

              <div>
                <Label htmlFor="qrBgColor">Cor de Fundo</Label>
                <Input
                  id="qrBgColor"
                  type="color"
                  value={qrBgColor}
                  onChange={(e) => setQrBgColor(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="customText">Texto Adicional</Label>
              <Textarea
                id="customText"
                placeholder="Adicione texto personalizado ao QR Code..."
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="includeLogo"
                checked={includeLogo}
                onChange={(e) => setIncludeLogo(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="includeLogo">Incluir logo no centro</Label>
            </div>

            {includeLogo && (
              <div>
                <Label htmlFor="logoSize">Tamanho do Logo</Label>
                <Select value={logoSize.toString()} onValueChange={(value) => setLogoSize(Number(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30px</SelectItem>
                    <SelectItem value="50">50px</SelectItem>
                    <SelectItem value="80">80px</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-2">
            <Button onClick={generateQRCode} className="flex-1">
              <QrCode className="h-4 w-4 mr-2" />
              Gerar QR Code
            </Button>
            <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview do QR Code */}
      {showPreview && qrData && (
        <Card>
          <CardHeader>
            <CardTitle>Preview do QR Code</CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={qrCodeRef} className="flex flex-col items-center space-y-4">
              <canvas
                ref={canvasRef}
                width={qrSize}
                height={qrSize}
                className="border rounded-lg shadow-sm"
              />
              
              <div className="flex gap-2">
                <Button onClick={downloadQRCode} size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button onClick={printQRCode} size="sm" variant="outline">
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
                <Button onClick={copyQRData} size="sm" variant="outline">
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Dados
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
