import {
  Sidebar as SidebarPrimitive,
  SidebarContent,
  SidebarHeader,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { NavContent } from '@/components/NavContent'
import { useCustomization } from '@/contexts/CustomizationContext'
import { cn } from '@/lib/utils'
import { Menu } from 'lucide-react'

interface SidebarProps {
  className?: string
}

export const Sidebar = ({ className }: SidebarProps) => {
  const { settings } = useCustomization()

  return (
    <>
      {/* Mobile Trigger */}
      <SidebarTrigger className="fixed top-4 left-4 z-50 md:hidden">
        <Menu className="h-6 w-6" />
      </SidebarTrigger>
      
      <SidebarPrimitive
        className={cn(
          'border-r bg-muted/40',
          'fixed inset-y-0 left-0 z-40 w-full',
          'md:relative md:block',
          className
        )}
      >
        <SidebarHeader>
          <div className="flex h-16 items-center justify-center p-4">
            <img
              src={settings.activeLogoUrl}
              alt="Logo"
              className="h-8 w-auto sm:h-10 md:h-12"
            />
          </div>
        </SidebarHeader>
        <SidebarContent className="overflow-y-auto">
          <NavContent />
        </SidebarContent>
      </SidebarPrimitive>
    </>
  )
}
