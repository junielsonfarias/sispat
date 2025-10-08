import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useIsMobile } from '@/hooks/use-mobile'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

interface SidebarContextProps {
  isCollapsed: boolean
  isMobile: boolean
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  toggle: () => void
}

const SidebarContext = React.createContext<SidebarContextProps | undefined>(
  undefined,
)

export const useSidebar = () => {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}

export const SidebarProvider = ({
  children,
  defaultCollapsed = false,
  onCollapseChange,
}: {
  children: React.ReactNode
  defaultCollapsed?: boolean
  onCollapseChange?: (isCollapsed: boolean) => void
}) => {
  const isMobile = useIsMobile()
  const [isCollapsed, setIsCollapsed] = React.useState(
    isMobile ? true : defaultCollapsed,
  )
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    if (isMobile) {
      setIsCollapsed(true)
      setIsOpen(false)
    } else {
      setIsCollapsed(defaultCollapsed)
    }
  }, [isMobile, defaultCollapsed])

  const toggle = React.useCallback(() => {
    if (isMobile) {
      setIsOpen((prev) => !prev)
    } else {
      setIsCollapsed((prev) => {
        const newState = !prev
        onCollapseChange?.(newState)
        return newState
      })
    }
  }, [isMobile, onCollapseChange])

  return (
    <SidebarContext.Provider
      value={{ isCollapsed, isMobile, isOpen, setIsOpen, toggle }}
    >
      <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
    </SidebarContext.Provider>
  )
}

const sidebarVariants = cva(
  'flex h-full flex-col transition-all duration-300 ease-in-out',
  {
    variants: {
      isCollapsed: {
        true: 'w-[52px]',
        false: 'w-[280px]',
      },
    },
    defaultVariants: {
      isCollapsed: false,
    },
  },
)

export const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { isCollapsed, isMobile, isOpen, setIsOpen } = useSidebar()

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="p-0 w-[280px]">
          <div ref={ref} className={cn('flex h-full flex-col', className)}>
            {children}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <aside
      ref={ref}
      className={cn(
        'hidden md:flex',
        sidebarVariants({ isCollapsed }),
        className,
      )}
      {...props}
    >
      {children}
    </aside>
  )
})
Sidebar.displayName = 'Sidebar'

export const SidebarTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const { isMobile } = useSidebar()

  if (isMobile) {
    return (
      <SheetTrigger asChild>
        <button ref={ref} className={cn(className)} {...props}>
          {children}
        </button>
      </SheetTrigger>
    )
  }

  return null
})
SidebarTrigger.displayName = 'SidebarTrigger'

export const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { isCollapsed } = useSidebar()
  return (
    <div
      ref={ref}
      className={cn(
        'flex h-16 items-center justify-center overflow-hidden px-4 lg:px-6',
        isCollapsed ? 'px-2' : 'px-4 lg:px-6',
        className,
      )}
      {...props}
    />
  )
})
SidebarHeader.displayName = 'SidebarHeader'

export const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex-1 overflow-y-auto overflow-x-hidden', className)}
    {...props}
  />
))
SidebarContent.displayName = 'SidebarContent'

export const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('mt-auto border-t p-4', className)} {...props} />
))
SidebarFooter.displayName = 'SidebarFooter'

export const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => {
  const { isCollapsed } = useSidebar()
  return (
    <ul
      ref={ref}
      className={cn(
        'grid items-start text-sm font-medium',
        isCollapsed ? 'px-1' : 'px-2 lg:px-4',
        className,
      )}
      {...props}
    />
  )
})
SidebarMenu.displayName = 'SidebarMenu'

export const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.HTMLAttributes<HTMLLIElement>
>((props, ref) => <li ref={ref} {...props} />)
SidebarMenuItem.displayName = 'SidebarMenuItem'

export const SidebarMenuButton = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    isActive?: boolean
    tooltip?: string
  }
>(({ className, isActive, tooltip, children, ...props }, ref) => {
  const { isCollapsed } = useSidebar()

  const content = (
    <a
      ref={ref}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
        isActive && 'bg-muted text-primary',
        isCollapsed && 'justify-center',
        className,
      )}
      {...props}
    >
      {children}
    </a>
  )

  if (isCollapsed && tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
})
SidebarMenuButton.displayName = 'SidebarMenuButton'

// Dummy implementations for other declared components to prevent build errors
export const SidebarRail = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>((props, ref) => <button ref={ref} {...props} />)
SidebarRail.displayName = 'SidebarRail'

export const SidebarInset = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLElement>
>((props, ref) => <div ref={ref} {...props} />)
SidebarInset.displayName = 'SidebarInset'

export const SidebarInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>((props, ref) => <input ref={ref} {...props} />)
SidebarInput.displayName = 'SidebarInput'

export const SidebarSeparator = React.forwardRef<
  HTMLHRElement,
  React.HTMLAttributes<HTMLHRElement>
>((props, ref) => <hr ref={ref} {...props} />)
SidebarSeparator.displayName = 'SidebarSeparator'

export const SidebarGroup = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>((props, ref) => <div ref={ref} {...props} />)
SidebarGroup.displayName = 'SidebarGroup'

export const SidebarGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>((props, ref) => <div ref={ref} {...props} />)
SidebarGroupLabel.displayName = 'SidebarGroupLabel'

export const SidebarGroupAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>((props, ref) => <button ref={ref} {...props} />)
SidebarGroupAction.displayName = 'SidebarGroupAction'

export const SidebarGroupContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>((props, ref) => <div ref={ref} {...props} />)
SidebarGroupContent.displayName = 'SidebarGroupContent'

export const SidebarMenuAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>((props, ref) => <button ref={ref} {...props} />)
SidebarMenuAction.displayName = 'SidebarMenuAction'

export const SidebarMenuBadge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>((props, ref) => <div ref={ref} {...props} />)
SidebarMenuBadge.displayName = 'SidebarMenuBadge'

export const SidebarMenuSkeleton = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>((props, ref) => <div ref={ref} {...props} />)
SidebarMenuSkeleton.displayName = 'SidebarMenuSkeleton'

export const SidebarMenuSub = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>((props, ref) => <ul ref={ref} {...props} />)
SidebarMenuSub.displayName = 'SidebarMenuSub'

export const SidebarMenuSubItem = React.forwardRef<
  HTMLLIElement,
  React.HTMLAttributes<HTMLLIElement>
>((props, ref) => <li ref={ref} {...props} />)
SidebarMenuSubItem.displayName = 'SidebarMenuSubItem'

export const SidebarMenuSubButton = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement>
>((props, ref) => <a ref={ref} {...props} />)
SidebarMenuSubButton.displayName = 'SidebarMenuSubButton'
