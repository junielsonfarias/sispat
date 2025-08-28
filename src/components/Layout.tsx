import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Toaster as ShadcnToaster } from '@/components/ui/toaster';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { SidebarProvider } from '@/components/ui/sidebar';
import { GlobalSearch } from '@/components/GlobalSearch';
import { VersionChecker } from '@/components/VersionChecker';

export const Layout = () => {
  return (
    <SidebarProvider>
      <div className='grid min-h-screen w-full grid-cols-1 md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr]'>
        <Sidebar />
        <div className='flex flex-col min-h-screen'>
          <Header />
          <main className='flex flex-1 flex-col gap-3 p-3 sm:gap-4 sm:p-4 lg:gap-6 lg:p-6 xl:gap-8 xl:p-8 animate-fade-in'>
            <Outlet />
          </main>
          <Footer />
        </div>
        <ShadcnToaster />
        <SonnerToaster richColors closeButton />
        <GlobalSearch />
        <VersionChecker />
      </div>
    </SidebarProvider>
  );
};
