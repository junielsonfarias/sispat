import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight, LucideIcon } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useState } from 'react'

interface NavGroupProps {
  label: string
  icon: LucideIcon
  children: ReactNode
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  groupColor?: string
  defaultOpen?: boolean
}

export const NavGroup = ({
  label,
  icon: Icon,
  children,
  groupColor = 'bg-gray-50 border-gray-200 text-gray-700',
  defaultOpen = false,
  isOpen,
  onOpenChange,
}: NavGroupProps) => {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen)
  
  // Usar prop externa se fornecida, senão usar estado interno
  const currentIsOpen = isOpen !== undefined ? isOpen : internalIsOpen
  const handleOpenChange = onOpenChange || setInternalIsOpen

  return (
    <Collapsible open={currentIsOpen} onOpenChange={handleOpenChange}>
      <CollapsibleTrigger asChild>
        <button
          className={cn(
            'w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 hover:shadow-sm border border-l-4 mb-2 mt-2',
            groupColor,
            'hover:shadow-md active:scale-[0.98]'
          )}
        >
          <div className="flex items-center gap-2.5">
            <Icon className="h-4 w-4" />
            <span className="truncate">{label}</span>
          </div>
          <div className="flex items-center gap-1">
            {currentIsOpen ? (
              <ChevronDown className="h-4 w-4 transition-transform duration-200" />
            ) : (
              <ChevronRight className="h-4 w-4 transition-transform duration-200" />
            )}
          </div>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-1 ml-3 border-l-2 border-primary/20 pl-4 animate-in slide-in-from-top-2 duration-200">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
}

interface NavGroupItemProps {
  children: ReactNode
  isActive?: boolean
  className?: string
}

export const NavGroupItem = ({ 
  children, 
  isActive = false, 
  className 
}: NavGroupItemProps) => {
  return (
    <div
      className={cn(
        'transition-all duration-200',
        isActive && 'bg-primary/10 rounded-md',
        className
      )}
    >
      {children}
    </div>
  )
}
