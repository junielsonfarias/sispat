import { useState, ChangeEvent, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from '@/hooks/use-toast'
import { Edit } from 'lucide-react'
import { ImageEditor } from '@/components/profile/ImageEditor'
import { MUNICIPALITY_NAME } from '@/config/municipality'
import { Badge } from '@/components/ui/badge'

const Profile = () => {
  const { user, updateUser } = useAuth()
  const [isEditorOpen, setEditorOpen] = useState(false)
  const [imageToEdit, setImageToEdit] = useState<string | null>(null)

  const municipalityName = MUNICIPALITY_NAME

  if (!user) {
    return null
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: 'Erro',
          description: 'O arquivo de imagem deve ser menor que 2MB.',
          variant: 'destructive',
        })
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setImageToEdit(reader.result as string)
        setEditorOpen(true)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async (editedImage: string) => {
    try {
      await updateUser(user.id, { avatarUrl: editedImage })
      toast({
        title: 'Sucesso!',
        description: 'Sua foto de perfil foi atualizada.',
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar sua foto de perfil.',
        variant: 'destructive',
      })
    } finally {
      setImageToEdit(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Meu Perfil</h1>
      <Card>
        <CardHeader>
          <CardTitle>Informações do Perfil</CardTitle>
          <CardDescription>
            Veja e atualize suas informações pessoais.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Avatar className="h-24 w-24">
                {user.avatarUrl && user.avatarUrl.trim() !== '' && !user.avatarUrl.includes('placeholder') && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                <AvatarFallback className="text-3xl">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <Label
                htmlFor="picture"
                className="absolute inset-0 bg-black/50 flex items-center justify-center text-white rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Edit className="h-6 w-6" />
                <Input
                  id="picture"
                  type="file"
                  className="hidden"
                  accept="image/png, image/jpeg"
                  onChange={handleFileChange}
                />
              </Label>
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user.name}</h2>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Município</Label>
              <p className="text-lg">{municipalityName}</p>
            </div>
            <div className="space-y-1">
              <Label>Perfil</Label>
              <p className="text-lg capitalize">{user.role}</p>
            </div>
            <div className="space-y-1">
              <Label>Setor Principal</Label>
              <p className="text-lg">{user.sector || 'Não especificado'}</p>
            </div>
            {user.responsibleSectors && user.responsibleSectors.length > 0 && (
              <div className="space-y-2">
                <Label>Setores de Acesso</Label>
                <div className="flex flex-wrap gap-2">
                  {user.responsibleSectors.map((sector) => (
                    <Badge key={sector} variant="secondary">
                      {sector}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <ImageEditor
        imageSrc={imageToEdit}
        open={isEditorOpen}
        onOpenChange={setEditorOpen}
        onSave={handleSave}
      />
    </div>
  )
}

export default Profile
