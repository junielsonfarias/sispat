import {
  Sidebar as SidebarPrimitive,
  SidebarContent,
} from '@/components/ui/sidebar'
import { NavContent } from '@/components/NavContent'
import { cn } from '@/lib/utils'

interface SidebarProps {
  className?: string
}

export const Sidebar = ({ className }: SidebarProps) => {
  return (
    <SidebarPrimitive className={cn(className, 'no-print')}>
      <SidebarContent className="bg-card border-r border-border">
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
