import { NavContent } from '@/components/NavContent';
import {
  SidebarContent,
  SidebarHeader,
  Sidebar as SidebarPrimitive,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { useCustomization } from '@/contexts/CustomizationContext';
import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';

interface SidebarProps {
  className?: string;
}

export const Sidebar = ({ className }: SidebarProps) => {
  const { settings } = useCustomization();

  return (
    <>
      {/* Mobile Trigger */}
      <SidebarTrigger className='fixed top-4 left-4 z-50 md:hidden'>
        <Menu className='h-6 w-6' />
      </SidebarTrigger>

      <SidebarPrimitive
        className={cn(
          'border-r border-gray-200/50 bg-gradient-to-b from-white to-gray-50/50 backdrop-blur-sm',
          'fixed inset-y-0 left-0 z-40 w-full shadow-xl',
          'md:block md:w-72 md:h-full',
          className
        )}
      >
        <SidebarHeader>
          <div className='flex h-16 items-center justify-center p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200/50'>
            <div className='relative'>
              <img
                src={settings.activeLogoUrl}
                alt='Logo'
                className='h-8 w-auto sm:h-10 md:h-12 drop-shadow-sm'
              />
              <div className='absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse' />
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent className='overflow-y-auto'>
          <NavContent />
        </SidebarContent>
      </SidebarPrimitive>
    </>
  );
};
