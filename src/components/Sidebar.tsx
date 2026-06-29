import {
  Sidebar as SidebarPrimitive,
  useSidebar,
} from '@/components/ui/sidebar'
import { NavContent } from '@/components/NavContent'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SidebarProps {
  className?: string
}

export const Sidebar = ({ className }: SidebarProps) => {
  const { isCollapsed, isMobile, toggle } = useSidebar()
  const collapsed = isCollapsed && !isMobile

  return (
    <SidebarPrimitive className={cn(className, 'no-print')}>
      <div className="flex h-full flex-col bg-card border-r border-border">
        {/* Botão de recolher/expandir — somente desktop */}
        {!isMobile && (
          <div
            className={cn(
              'flex shrink-0 items-center p-2',
              collapsed ? 'justify-center' : 'justify-end',
            )}
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={toggle}
              aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
              title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {/* Área de navegação rolável — garante que todos os submenus apareçam */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <NavContent />
        </div>

        {/* Rodapé — oculto quando recolhido */}
        {!collapsed && (
          <div className="shrink-0 p-4 border-t bg-muted/30">
            <div className="text-xs text-muted-foreground text-center">
              SISPAT v2.0.0
            </div>
          </div>
        )}
      </div>
    </SidebarPrimitive>
  )
}
