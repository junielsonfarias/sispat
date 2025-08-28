import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/hooks/use-toast'
import {
    CheckCircle,
    Copy,
    Download,
    Eye,
    EyeOff,
    Lock,
    RefreshCw,
    Shield,
    Unlock,
    XCircle
} from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

interface TwoFactorSetupProps {
  onSetupComplete?: () => void
  className?: string
}

interface TwoFactorStatus {
  enabled: boolean
  secret?: string
  backupCodes?: string[]
  qrCode?: string
  setupComplete: boolean
}

export const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({ 
  onSetupComplete, 
  className 
}) => {
  const [status, setStatus] = useState<TwoFactorStatus>({
    enabled: false,
    setupComplete: false
  })
  const [step, setStep] = useState<'status' | 'setup' | 'verify' | 'backup'>('status')
  const [verificationCode, setVerificationCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSecret, setShowSecret] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Carregar status do 2FA
  useEffect(() => {
    fetchTwoFactorStatus()
  }, [])

  const fetchTwoFactorStatus = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/2fa/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStatus(data)
        if (data.enabled) {
          setStep('status')
        }
      }
    } catch (error) {
      console.error('Erro ao carregar status 2FA:', error)
    }
  }

  const startSetup = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/2fa/setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStatus(prev => ({
          ...prev,
          secret: data.secret,
          qrCode: data.qrCode,
          backupCodes: data.backupCodes
        }))
        setStep('setup')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Erro ao iniciar configuração')
      }
    } catch (error) {
      setError('Erro de conexão')
    } finally {
      setIsLoading(false)
    }
  }

  const verifyCode = async () => {
    if (verificationCode.length !== 6) {
      setError('Código deve ter 6 dígitos')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/2fa/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: verificationCode })
      })

      if (response.ok) {
        setStep('backup')
        toast({
          title: 'Verificação Concluída',
          description: 'Código verificado com sucesso!'
        })
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Código inválido')
        setVerificationCode('')
      }
    } catch (error) {
      setError('Erro de conexão')
    } finally {
      setIsLoading(false)
    }
  }

  const completeSetup = async () => {
    try {
      setIsLoading(true)

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/2fa/enable`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        setStatus(prev => ({ ...prev, enabled: true, setupComplete: true }))
        setStep('status')
        onSetupComplete?.()
        toast({
          title: '2FA Ativado',
          description: 'Autenticação de dois fatores ativada com sucesso!'
        })
      }
    } catch (error) {
      setError('Erro ao ativar 2FA')
    } finally {
      setIsLoading(false)
    }
  }

  const disable2FA = async () => {
    if (!confirm('Tem certeza que deseja desativar a autenticação de dois fatores?')) {
      return
    }

    try {
      setIsLoading(true)

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/2fa/disable`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        setStatus({ enabled: false, setupComplete: false })
        setStep('status')
        toast({
          title: '2FA Desativado',
          description: 'Autenticação de dois fatores desativada'
        })
      }
    } catch (error) {
      setError('Erro ao desativar 2FA')
    } finally {
      setIsLoading(false)
    }
  }

  const copySecret = () => {
    if (status.secret) {
      navigator.clipboard.writeText(status.secret)
      toast({
        title: 'Chave Copiada',
        description: 'Chave secreta copiada para a área de transferência'
      })
    }
  }

  const downloadBackupCodes = () => {
    if (status.backupCodes) {
      const codes = status.backupCodes.join('\n')
      const blob = new Blob([codes], { type: 'text/plain' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'backup-codes-2fa.txt'
      a.click()
      window.URL.revokeObjectURL(url)
      
      toast({
        title: 'Códigos Baixados',
        description: 'Códigos de backup salvos com sucesso'
      })
    }
  }

  const handleCodeInput = (index: number, value: string) => {
    if (value.length > 1) return // Permitir apenas um caractere
    
    const newCode = verificationCode.split('')
    newCode[index] = value
    const code = newCode.join('')
    setVerificationCode(code)

    // Mover para o próximo input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const regenerateBackupCodes = async () => {
    try {
      setIsLoading(true)

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/2fa/regenerate-backup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStatus(prev => ({ ...prev, backupCodes: data.backupCodes }))
        toast({
          title: 'Códigos Regenerados',
          description: 'Novos códigos de backup gerados'
        })
      }
    } catch (error) {
      setError('Erro ao regenerar códigos')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Autenticação de Dois Fatores (2FA)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Atual */}
          {step === 'status' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {status.enabled ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span className="font-medium">2FA Ativado</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        Protegido
                      </Badge>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-500" />
                      <span className="font-medium">2FA Desativado</span>
                      <Badge variant="secondary" className="bg-red-100 text-red-800">
                        Vulnerável
                      </Badge>
                    </>
                  )}
                </div>
                {status.enabled ? (
                  <Button variant="outline" onClick={disable2FA} disabled={isLoading}>
                    <Unlock className="h-4 w-4 mr-2" />
                    Desativar 2FA
                  </Button>
                ) : (
                  <Button onClick={startSetup} disabled={isLoading}>
                    <Lock className="h-4 w-4 mr-2" />
                    Ativar 2FA
                  </Button>
                )}
              </div>

              {status.enabled && (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Sua conta está protegida com autenticação de dois fatores. 
                    Você precisará inserir um código adicional ao fazer login.
                  </AlertDescription>
                </Alert>
              )}

              {!status.enabled && (
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Ative a autenticação de dois fatores para adicionar uma camada extra de segurança à sua conta.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Configuração */}
          {step === 'setup' && status.secret && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Configurar 2FA</h3>
                <p className="text-muted-foreground">
                  Escaneie o QR code com seu aplicativo autenticador
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* QR Code */}
                <div className="text-center">
                  <div className="bg-white p-4 rounded-lg border inline-block">
                    <div className="text-center p-4">
                      <QrCode className="h-32 w-32 mx-auto text-gray-400" />
                      <p className="text-sm text-gray-500 mt-2">
                        QR Code temporariamente indisponível
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Use Google Authenticator, Authy ou similar
                  </p>
                </div>

                {/* Chave Secreta */}
                <div className="space-y-4">
                  <div>
                    <Label>Chave Secreta</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type={showSecret ? 'text' : 'password'}
                        value={status.secret}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSecret(!showSecret)}
                      >
                        {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={copySecret}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Use esta chave se não conseguir escanear o QR code
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm text-muted-foreground mb-4">
                      Após configurar o aplicativo, clique em "Continuar" para verificar
                    </p>
                    <Button 
                      onClick={() => setStep('verify')} 
                      className="w-full"
                    >
                      Continuar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Verificação */}
          {step === 'verify' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Verificar Código</h3>
                <p className="text-muted-foreground">
                  Digite o código de 6 dígitos do seu aplicativo autenticador
                </p>
              </div>

              <div className="flex justify-center">
                <div className="flex gap-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Input
                      key={index}
                      ref={el => inputRefs.current[index] = el}
                      type="text"
                      maxLength={1}
                      value={verificationCode[index] || ''}
                      onChange={e => handleCodeInput(index, e.target.value)}
                      onKeyDown={e => handleKeyDown(index, e)}
                      className="w-12 h-12 text-center text-lg font-mono"
                      autoFocus={index === 0}
                    />
                  ))}
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2 justify-center">
                <Button 
                  variant="outline" 
                  onClick={() => setStep('setup')}
                >
                  Voltar
                </Button>
                <Button 
                  onClick={verifyCode}
                  disabled={verificationCode.length !== 6 || isLoading}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    'Verificar'
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Códigos de Backup */}
          {step === 'backup' && status.backupCodes && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Códigos de Backup</h3>
                <p className="text-muted-foreground">
                  Salve estes códigos em um local seguro. Eles podem ser usados para acessar sua conta se você perder o dispositivo.
                </p>
              </div>

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  <strong>Importante:</strong> Estes códigos só serão mostrados uma vez. 
                  Salve-os imediatamente em um local seguro.
                </AlertDescription>
              </Alert>

              <div className="bg-muted p-4 rounded-lg">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {status.backupCodes.map((code, index) => (
                    <div
                      key={index}
                      className="bg-background p-2 rounded text-center font-mono text-sm"
                    >
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={downloadBackupCodes}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar Códigos
                </Button>
                <Button variant="outline" onClick={regenerateBackupCodes} disabled={isLoading}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerar
                </Button>
                <Button onClick={completeSetup} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Ativando...
                    </>
                  ) : (
                    'Ativar 2FA'
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
