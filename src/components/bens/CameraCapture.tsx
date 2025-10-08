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
import { Camera, SwitchCamera, Loader2, VideoOff } from 'lucide-react'

interface CameraCaptureProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCapture: (dataUrl: string) => void
}

export const CameraCapture = ({
  open,
  onOpenChange,
  onCapture,
}: CameraCaptureProps) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [currentDeviceId, setCurrentDeviceId] = useState<string | undefined>()
  const [isLoading, setIsLoading] = useState(true)

  const startStream = useCallback(
    async (deviceId?: string) => {
      setIsLoading(true)
      setError(null)
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: deviceId ? { exact: deviceId } : undefined },
        })
        setStream(newStream)
        if (videoRef.current) {
          videoRef.current.srcObject = newStream
        }
      } catch (err) {
        setError(
          'Não foi possível acessar a câmera. Verifique as permissões do seu navegador.',
        )
      } finally {
        setIsLoading(false)
      }
    },
    [stream],
  )

  useEffect(() => {
    if (open) {
      navigator.mediaDevices
        .enumerateDevices()
        .then((allDevices) => {
          const videoDevices = allDevices.filter(
            (device) => device.kind === 'videoinput',
          )
          setDevices(videoDevices)
          const initialDeviceId = videoDevices[0]?.deviceId
          setCurrentDeviceId(initialDeviceId)
          startStream(initialDeviceId)
        })
        .catch(() => {
          setError('Não foi possível listar os dispositivos de câmera.')
        })
    } else if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [open])

  const handleCapture = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (video && canvas) {
      const context = canvas.getContext('2d')
      if (context) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight)
        const dataUrl = canvas.toDataURL('image/jpeg')
        onCapture(dataUrl)
        onOpenChange(false)
      }
    }
  }

  const handleSwitchCamera = () => {
    const currentIndex = devices.findIndex(
      (d) => d.deviceId === currentDeviceId,
    )
    const nextIndex = (currentIndex + 1) % devices.length
    const nextDeviceId = devices[nextIndex]?.deviceId
    setCurrentDeviceId(nextDeviceId)
    startStream(nextDeviceId)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Capturar Foto</DialogTitle>
          <DialogDescription>
            Posicione o bem na frente da câmera e capture a foto.
          </DialogDescription>
        </DialogHeader>
        <div className="relative aspect-video bg-muted rounded-md flex items-center justify-center">
          {isLoading && <Loader2 className="h-8 w-8 animate-spin" />}
          {error && (
            <div className="text-center text-destructive p-4">
              <VideoOff className="h-8 w-8 mx-auto mb-2" />
              <p>{error}</p>
            </div>
          )}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover rounded-md ${
              isLoading || error ? 'hidden' : ''
            }`}
            onLoadedData={() => setIsLoading(false)}
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>
        <DialogFooter>
          {devices.length > 1 && (
            <Button
              variant="outline"
              onClick={handleSwitchCamera}
              disabled={isLoading}
            >
              <SwitchCamera className="mr-2 h-4 w-4" /> Trocar Câmera
            </Button>
          )}
          <Button onClick={handleCapture} disabled={isLoading || !!error}>
            <Camera className="mr-2 h-4 w-4" /> Capturar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
