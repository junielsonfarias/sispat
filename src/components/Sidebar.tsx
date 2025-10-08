import {
  Sidebar as SidebarPrimitive,
  SidebarContent,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar'
import { NavContent } from '@/components/NavContent'
import { useCustomization } from '@/contexts/CustomizationContext'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

interface SidebarProps {
  className?: string
}

export const Sidebar = ({ className }: SidebarProps) => {
  // Fallback para quando o contexto não estiver disponível
  let settings
  try {
    const customization = useCustomization()
    settings = customization.settings
  } catch (error) {
    // Se o contexto não estiver disponível, usar valores padrão
    settings = {
      activeLogoUrl: '/logo-government.svg'
    }
  }
  
  // Check if we're inside SidebarProvider before using useSidebar
  let isCollapsed = false
  try {
    const sidebarContext = useSidebar()
    isCollapsed = sidebarContext?.isCollapsed || false
  } catch (error) {
    // If not inside SidebarProvider, default to collapsed
    isCollapsed = false
  }

  return (
    <SidebarPrimitive className={cn(className, 'no-print')}>
      <SidebarHeader className="hidden md:block border-b bg-gradient-to-r from-primary/5 to-primary/10">
        <div
          className={cn(
            'flex items-center justify-center transition-all duration-300',
            isCollapsed ? 'p-fluid-sm' : 'p-fluid-md',
            'min-height: clamp(3rem, 2.5rem + 2.5vw, 4rem)'
          )}
        >
          <img
            src={settings.activeLogoUrl}
            alt="Logo"
            className={cn(
              'transition-all duration-300 object-contain img-responsive',
              isCollapsed ? 'h-8 w-auto' : 'h-12 w-auto',
            )}
          />
          {!isCollapsed && (
            <div className="ml-3 text-fluid-sm">
              <div className="font-semibold text-foreground">SISPAT</div>
              <div className="text-fluid-xs text-muted-foreground">Sistema de Patrimônio</div>
            </div>
          )}
        </div>
        <Separator className="mx-4" />
      </SidebarHeader>
      <SidebarContent className="bg-gradient-to-b from-background to-background/95">
        <div className="flex-1 overflow-auto">
          <NavContent />
        </div>
        <div className="p-fluid-md border-t bg-muted/30">
          <div className="text-fluid-xs text-muted-foreground text-center">
            SISPAT v2.0.0
          </div>
        </div>
      </SidebarContent>
    </SidebarPrimitive>
  )
}