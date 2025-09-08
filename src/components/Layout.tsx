import { Footer } from '@/components/Footer';
import { GlobalSearch } from '@/components/GlobalSearch';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { VersionChecker } from '@/components/VersionChecker';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Toaster as SonnerToaster } from '@/components/ui/sonner';
import { Toaster as ShadcnToaster } from '@/components/ui/toaster';
import { Outlet } from 'react-router-dom';

export const Layout = () => {
  return (
    <SidebarProvider>
      <div className='layout-container'>
        <div className='sidebar-container'>
          <Sidebar />
        </div>
        <div className='main-content'>
          <Header />
          <main className='animate-fade-in'>
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
