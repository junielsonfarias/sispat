import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Eye, Lock, Mail } from 'lucide-react'
import { CustomizationSettings } from '@/contexts/CustomizationContext'
import { cn } from '@/lib/utils'

interface LoginPreviewProps {
  settings: CustomizationSettings
}

export const LoginPreview = ({ settings }: LoginPreviewProps) => {
  const {
    activeLogoUrl,
    backgroundType,
    backgroundColor,
    backgroundImageUrl,
    backgroundVideoUrl,
    videoLoop,
    videoMuted,
    layout,
    welcomeTitle,
    welcomeSubtitle,
    primaryColor,
    buttonTextColor,
    fontFamily,
  } = settings

  const backgroundStyle =
    backgroundType === 'image' && backgroundImageUrl
      ? {
          backgroundImage: `url(${backgroundImageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : { backgroundColor }

  const layoutClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
  }

  return (
    <div
      className="relative flex items-center p-4 rounded-lg w-full h-[600px] transition-all duration-300 overflow-hidden"
      style={{ ...backgroundStyle, fontFamily }}
    >
      {backgroundType === 'video' && backgroundVideoUrl && (
        <video
          key={backgroundVideoUrl}
          loop={videoLoop}
          muted={videoMuted}
          autoPlay
          playsInline
          className="absolute top-0 left-0 w-full h-full object-cover"
        >
          <source src={backgroundVideoUrl} />
        </video>
      )}
      <div
        className={cn(
          'relative z-10 w-full h-full flex items-center',
          layoutClasses[layout],
        )}
      >
        <Card className="w-full max-w-md shadow-lg mx-4">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <img
                src={activeLogoUrl}
                alt="Logo"
                className="h-16 w-auto max-w-full"
              />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              {welcomeTitle}
            </CardTitle>
            <CardDescription>{welcomeSubtitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="seu@email.com" className="pl-10" readOnly />
              </div>
            </div>
            <div>
              <Label>Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Sua senha"
                  className="pl-10 pr-10"
                  value="fakepassword"
                  readOnly
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox id="remember-preview" />
                <Label htmlFor="remember-preview">Lembrar-me</Label>
              </div>
              <a href="#" className="text-sm" style={{ color: primaryColor }}>
                Esqueceu a senha?
              </a>
            </div>
            <Button
              className="w-full"
              style={{ backgroundColor: primaryColor, color: buttonTextColor }}
            >
              Entrar
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
