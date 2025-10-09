import { useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Keyboard, X } from 'lucide-react'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false)
  const { shortcuts } = useKeyboardShortcuts()

  useHotkeys('shift+/', () => setOpen(true), { preventDefault: true })

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg hover:shadow-xl transition-all z-40 bg-primary text-primary-foreground hover:scale-110"
        aria-label="Atalhos de teclado"
        title="Atalhos de teclado (Shift + /)"
      >
        <Keyboard className="h-5 w-5" />
      </Button>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Keyboard className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl">Atalhos de Teclado</DialogTitle>
                  <DialogDescription className="text-sm mt-1">
                    Use atalhos para navegar mais rápido
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {shortcuts.map((shortcut, i) => (
              <div 
                key={i} 
                className="flex justify-between items-center py-3 px-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm text-muted-foreground">
                  {shortcut.description}
                </span>
                <kbd className="px-3 py-1.5 text-xs font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-sm">
                  {shortcut.keys}
                </kbd>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              Pressione <kbd className="px-2 py-1 text-xs font-semibold bg-muted border rounded">Shift + /</kbd> para abrir
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4 mr-1" />
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

