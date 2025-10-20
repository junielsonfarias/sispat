import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Note, Patrimonio } from '@/types'
import { formatRelativeDate, generateId } from '@/lib/utils'
import { Loader2, Send } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { usePatrimonio } from '@/contexts/PatrimonioContext'
import { api } from '@/services/api-adapter'

interface BensNotesDialogProps {
  patrimonio: Patrimonio
  onNoteAdded: (updatedPatrimonio: Patrimonio) => void
}

export const BensNotesDialog = ({
  patrimonio,
  onNoteAdded,
}: BensNotesDialogProps) => {
  const { user } = useAuth()
  const { updatePatrimonio } = usePatrimonio()
  const [newNote, setNewNote] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const handleAddNote = async () => {
    if (!newNote.trim() || !user) return
    
    console.log('🔍 [DEBUG] BensNotesDialog - Salvando nota:', {
      patrimonioId: patrimonio.id,
      texto: newNote.trim(),
      userId: user.id
    })
    
    setIsSaving(true)

    try {
      // ✅ CORREÇÃO: Usar API para salvar nota no backend
      const response = await api.post(`/patrimonios/${patrimonio.id}/notes`, {
        text: newNote.trim()
      })

      console.log('✅ [DEBUG] BensNotesDialog - Resposta da API:', response)

      const noteData = response.note || response

      // ✅ CORREÇÃO: Mapear campos corretamente do backend
      const newNoteEntry: Note = {
        id: noteData.id,
        text: noteData.text,
        date: new Date(noteData.date),
        userId: noteData.userId,
        userName: noteData.userName,
      }

      console.log('✅ [DEBUG] BensNotesDialog - Nota mapeada:', newNoteEntry)

      const updatedPatrimonio = {
        ...patrimonio,
        notes: [newNoteEntry, ...(patrimonio.notes || [])],
      }

      updatePatrimonio(updatedPatrimonio)
      onNoteAdded(updatedPatrimonio)
      setNewNote('')
      toast({ description: 'Nota adicionada com sucesso.' })
    } catch (error) {
      console.error('❌ [ERROR] BensNotesDialog - Erro ao salvar nota:', error)
      toast({ 
        variant: 'destructive',
        title: 'Erro',
        description: `Não foi possível salvar a nota. ${error instanceof Error ? error.message : 'Tente novamente.'}`
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Notas do Bem</DialogTitle>
        <DialogDescription>
          {patrimonio.numero_patrimonio} - {patrimonio.descricao_bem}
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col h-[500px]">
        <ScrollArea className="flex-grow pr-4 -mr-4 mb-4">
          <div className="space-y-4">
            {patrimonio.notes && patrimonio.notes.length > 0 ? (
              patrimonio.notes.map((note) => (
                <div key={note.id} className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage />
                    <AvatarFallback>{note.userName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold">{note.userName}</span>
                      <span className="text-muted-foreground">
                        {formatRelativeDate(new Date(note.date))}
                      </span>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-wrap">
                      {note.text}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma nota adicionada ainda.
              </p>
            )}
          </div>
        </ScrollArea>
        <div className="mt-auto pt-4 border-t">
          <div className="flex gap-2">
            <Textarea
              placeholder="Adicionar uma nota..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="flex-grow"
              rows={2}
            />
            <Button onClick={handleAddNote} disabled={isSaving || !newNote}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </DialogContent>
  )
}
