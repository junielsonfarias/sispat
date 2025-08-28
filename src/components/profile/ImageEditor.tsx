import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { RotateCcw, RotateCw, ZoomIn, ZoomOut } from 'lucide-react'

interface ImageEditorProps {
  imageSrc: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (editedImage: string) => void
}

export const ImageEditor = ({
  imageSrc,
  open,
  onOpenChange,
  onSave,
}: ImageEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rotation, setRotation] = useState(0)
  const [zoom, setZoom] = useState(1)

  const drawImage = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !imageSrc) return

    const img = new Image()
    img.src = imageSrc
    img.onload = () => {
      const canvasSize = 300
      canvas.width = canvasSize
      canvas.height = canvasSize

      ctx.clearRect(0, 0, canvasSize, canvasSize)
      ctx.save()
      ctx.translate(canvasSize / 2, canvasSize / 2)
      ctx.rotate((rotation * Math.PI) / 180)
      ctx.scale(zoom, zoom)

      const hRatio = canvasSize / img.width
      const vRatio = canvasSize / img.height
      const ratio = Math.max(hRatio, vRatio)
      const newWidth = img.width * ratio
      const newHeight = img.height * ratio
      const x = (canvasSize - newWidth) / 2
      const y = (canvasSize - newHeight) / 2

      ctx.drawImage(img, -newWidth / 2, -newHeight / 2, newWidth, newHeight)
      ctx.restore()
    }
  }, [imageSrc, rotation, zoom])

  useEffect(() => {
    if (open && imageSrc) {
      drawImage()
    }
  }, [open, imageSrc, drawImage])

  const handleSave = () => {
    const canvas = canvasRef.current
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
      onSave(dataUrl)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Foto de Perfil</DialogTitle>
          <DialogDescription>
            Ajuste sua foto de perfil. A imagem será cortada em um formato
            quadrado.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center items-center my-4">
          <canvas
            ref={canvasRef}
            className="rounded-full border-2 border-dashed"
            width={300}
            height={300}
          />
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ZoomOut className="h-5 w-5" />
            <Slider
              value={[zoom]}
              onValueChange={(val) => setZoom(val[0])}
              min={1}
              max={3}
              step={0.1}
            />
            <ZoomIn className="h-5 w-5" />
          </div>
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              onClick={() => setRotation((r) => (r - 90) % 360)}
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Girar à Esquerda
            </Button>
            <Button
              variant="outline"
              onClick={() => setRotation((r) => (r + 90) % 360)}
            >
              <RotateCw className="mr-2 h-4 w-4" /> Girar à Direita
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Salvar Alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
