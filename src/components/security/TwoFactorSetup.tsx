import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useTwoFactor } from '@/contexts/TwoFactorContext'
import { Copy, Download, Eye, EyeOff, Key, Shield, ShieldCheck, Smartphone } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

export const TwoFactorSetup: React.FC = () => {
  const {
    isEnabled,
    isSetupMode,
    isVerifying,
    setupData,
    startSetup,
    completeSetup,
    cancelSetup,
    disable2FA,
    regenerateBackupCodes
  } = useTwoFactor()

  const [verificationToken, setVerificationToken] = useState('')
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')
  const [showDisableDialog, setShowDisableDialog] = useState(false)
  const [newBackupCodes, setNewBackupCodes] = useState<string[]>([])
  const [showBackupDialog, setShowBackupDialog] = useState(false)

  const handleCompleteSetup = async () => {
    if (!verificationToken.trim()) {
      toast({
        title: 'Código necessário',
        description: 'Digite o código de 6 dígitos do seu aplicativo',
        variant: 'destructive'
      })
      return
    }

    const success = await completeSetup(verificationToken)
    if (success) {
      setVerificationToken('')
      setShowBackupCodes(true)
    }
  }

  const handleDisable2FA = async () => {
    if (!disablePassword.trim()) {
      toast({
        title: 'Senha necessária',
        description: 'Digite sua senha para desativar o 2FA',
        variant: 'destructive'
      })
      return
    }

    const success = await disable2FA(disablePassword)
    if (success) {
      setDisablePassword('')
      setShowDisableDialog(false)
    }
  }

  const handleRegenerateBackup = async () => {
    const codes = await regenerateBackupCodes()
    if (codes.length > 0) {
      setNewBackupCodes(codes)
      setShowBackupDialog(true)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: 'Copiado!',
      description: 'Conteúdo copiado para a área de transferência',
    })
  }

  const downloadBackupCodes = (codes: string[]) => {
    const content = `SISPAT - Códigos de Backup 2FA\n\nGuarde estes códigos em local seguro:\n\n${codes.join('\n')}\n\nCada código pode ser usado apenas uma vez.`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sispat-backup-codes.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isSetupMode && setupData) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Configurar Autenticação de Dois Fatores
          </CardTitle>
          <CardDescription>
            Configure o 2FA para aumentar a segurança da sua conta
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* QR Code */}
          <div className="text-center space-y-4">
            <h3 className="font-medium">1. Escaneie o QR Code</h3>
            <div className="flex justify-center">
              <img 
                src={setupData.qrCodeUrl} 
                alt="QR Code para 2FA" 
                className="border rounded-lg p-4 bg-white"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Use um aplicativo como Google Authenticator, Authy ou Microsoft Authenticator
            </p>
          </div>

          {/* Manual Entry */}
          <div className="space-y-2">
            <h3 className="font-medium">2. Ou digite manualmente:</h3>
            <div className="flex items-center gap-2">
              <Input 
                value={setupData.manualEntryKey} 
                readOnly 
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(setupData.manualEntryKey)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Verification */}
          <div className="space-y-2">
            <Label htmlFor="verification">3. Digite o código de 6 dígitos:</Label>
            <Input
              id="verification"
              placeholder="000000"
              value={verificationToken}
              onChange={(e) => setVerificationToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="text-center text-lg tracking-widest"
            />
          </div>

          {/* Backup Codes Preview */}
          {!showBackupCodes && (
            <Alert>
              <Key className="w-4 h-4" />
              <AlertDescription>
                Após ativar o 2FA, você receberá códigos de backup para usar caso perca acesso ao seu dispositivo.
              </AlertDescription>
            </Alert>
          )}

          {/* Show Backup Codes */}
          {showBackupCodes && setupData.backupCodes && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-green-600">✅ 2FA Ativado com Sucesso!</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadBackupCodes(setupData.backupCodes)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar
                </Button>
              </div>
              
              <Alert>
                <Shield className="w-4 h-4" />
                <AlertDescription>
                  <strong>Códigos de Backup:</strong> Guarde estes códigos em local seguro. 
                  Cada um pode ser usado apenas uma vez caso você perca acesso ao seu dispositivo.
                </AlertDescription>
              </Alert>
              
              <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg">
                {setupData.backupCodes.map((code, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono">
                      {code}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(code)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex gap-2">
          {!showBackupCodes ? (
            <>
              <Button
                onClick={handleCompleteSetup}
                disabled={isVerifying || verificationToken.length !== 6}
                className="flex-1"
              >
                {isVerifying ? 'Verificando...' : 'Ativar 2FA'}
              </Button>
              <Button variant="outline" onClick={cancelSetup}>
                Cancelar
              </Button>
            </>
          ) : (
            <Button onClick={cancelSetup} className="flex-1">
              Concluir
            </Button>
          )}
        </CardFooter>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isEnabled ? (
              <ShieldCheck className="w-5 h-5 text-green-500" />
            ) : (
              <Shield className="w-5 h-5 text-muted-foreground" />
            )}
            Autenticação de Dois Fatores (2FA)
          </CardTitle>
          <CardDescription>
            {isEnabled 
              ? 'Sua conta está protegida com 2FA' 
              : 'Adicione uma camada extra de segurança à sua conta'
            }
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Badge variant={isEnabled ? 'default' : 'secondary'}>
                {isEnabled ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
            
            <div className="flex gap-2">
              {isEnabled ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleRegenerateBackup}
                    disabled={isVerifying}
                  >
                    Gerar Novos Códigos
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => setShowDisableDialog(true)}
                    disabled={isVerifying}
                  >
                    Desativar
                  </Button>
                </>
              ) : (
                <Button onClick={startSetup} disabled={isVerifying}>
                  {isVerifying ? 'Preparando...' : 'Configurar 2FA'}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disable 2FA Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar 2FA</DialogTitle>
            <DialogDescription>
              Digite sua senha para confirmar a desativação do 2FA
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="disable-password">Senha atual:</Label>
              <Input
                id="disable-password"
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                placeholder="Digite sua senha"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDisableDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisable2FA}
              disabled={isVerifying || !disablePassword.trim()}
            >
              {isVerifying ? 'Desativando...' : 'Desativar 2FA'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Backup Codes Dialog */}
      <Dialog open={showBackupDialog} onOpenChange={setShowBackupDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novos Códigos de Backup</DialogTitle>
            <DialogDescription>
              Guarde estes novos códigos em local seguro. Os códigos anteriores foram invalidados.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-2 p-4 bg-muted rounded-lg max-h-60 overflow-y-auto">
              {newBackupCodes.map((code, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Badge variant="secondary" className="font-mono">
                    {code}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(code)}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => downloadBackupCodes(newBackupCodes)}
            >
              <Download className="w-4 h-4 mr-2" />
              Baixar
            </Button>
            <Button onClick={() => setShowBackupDialog(false)}>
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TwoFactorSetup
