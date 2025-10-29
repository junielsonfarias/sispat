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
      <SidebarContent className="bg-white border-r border-gray-200">
        <div className="flex-1 overflow-auto p-4">
          <NavContent />
        </div>
        <div className="p-4 border-t bg-muted/30">
          <div className="text-xs text-muted-foreground text-center">
            SISPAT v2.0.0
          </div>
        </div>
      </SidebarContent>
    </SidebarPrimitive>
  )
}
