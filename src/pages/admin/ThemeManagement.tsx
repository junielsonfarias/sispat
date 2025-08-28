import { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTheme } from '@/contexts/ThemeContext'
import { Theme } from '@/types'
import { generateId } from '@/lib/utils'
import { PlusCircle, Edit, Trash2, CheckCircle } from 'lucide-react'
import { ThemePreview } from '@/components/admin/ThemePreview'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuth } from '@/hooks/useAuth'

const ThemeEditor = ({
  theme,
  onSave,
  onClose,
}: {
  theme: Theme
  onSave: (theme: Theme) => void
  onClose: () => void
}) => {
  const [localTheme, setLocalTheme] = useState(theme)

  const handleColorChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    key: keyof Theme['colors'],
  ) => {
    setLocalTheme((prev) => ({
      ...prev,
      colors: { ...prev.colors, [key]: e.target.value },
    }))
  }

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>
          {theme.id.startsWith('default-') ? 'Visualizar Tema' : 'Editar Tema'}
        </DialogTitle>
        <DialogDescription>
          Personalize as cores e estilos do tema.
        </DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ScrollArea className="h-96 pr-4">
          <div className="space-y-4">
            <div>
              <Label>Nome do Tema</Label>
              <Input
                value={localTheme.name}
                onChange={(e) =>
                  setLocalTheme((prev) => ({ ...prev, name: e.target.value }))
                }
                disabled={theme.id.startsWith('default-')}
              />
            </div>
            {Object.entries(localTheme.colors).map(([key, value]) => (
              <div key={key}>
                <Label className="capitalize">
                  {key.replace(/([A-Z])/g, ' $1')}
                </Label>
                <Input
                  type="color"
                  value={value}
                  onChange={(e) =>
                    handleColorChange(e, key as keyof Theme['colors'])
                  }
                  disabled={theme.id.startsWith('default-')}
                />
              </div>
            ))}
          </div>
        </ScrollArea>
        <div>
          <ThemePreview theme={localTheme} />
        </div>
      </div>
      {!theme.id.startsWith('default-') && (
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => onSave(localTheme)}>Salvar</Button>
        </div>
      )}
    </DialogContent>
  )
}

const ThemeManagement = () => {
  const { user } = useAuth()
  const { themes, activeTheme, applyTheme, saveTheme, deleteTheme } = useTheme()
  const [isEditorOpen, setEditorOpen] = useState(false)
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null)

  const handleEdit = (theme: Theme) => {
    setEditingTheme(JSON.parse(JSON.stringify(theme)))
    setEditorOpen(true)
  }

  const handleCreate = () => {
    if (!user?.municipalityId) return
    const newTheme: Theme = {
      id: generateId(),
      name: 'Novo Tema',
      colors: activeTheme?.colors || themes[0].colors,
      borderRadius: '0.5rem',
      fontFamily: "'Inter var', sans-serif",
      municipalityId: user.municipalityId,
    }
    setEditingTheme(newTheme)
    setEditorOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={handleCreate}>
          <PlusCircle className="mr-2 h-4 w-4" /> Criar Novo Tema
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {themes.map((theme) => (
          <Card key={theme.id}>
            <CardHeader>
              <CardTitle>{theme.name}</CardTitle>
              {theme.id.startsWith('default-') && (
                <CardDescription>Tema Padrão</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <ThemePreview theme={theme} />
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              {activeTheme?.id === theme.id ? (
                <Button variant="outline" disabled>
                  <CheckCircle className="mr-2 h-4 w-4" /> Ativo
                </Button>
              ) : (
                <Button variant="outline" onClick={() => applyTheme(theme.id)}>
                  Aplicar
                </Button>
              )}
              <Button variant="secondary" onClick={() => handleEdit(theme)}>
                <Edit className="h-4 w-4" />
              </Button>
              {!theme.id.startsWith('default-') && (
                <Button
                  variant="destructive"
                  onClick={() => deleteTheme(theme.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
      <Dialog open={isEditorOpen} onOpenChange={setEditorOpen}>
        {editingTheme && (
          <ThemeEditor
            theme={editingTheme}
            onSave={saveTheme}
            onClose={() => setEditorOpen(false)}
          />
        )}
      </Dialog>
    </div>
  )
}

export default ThemeManagement
