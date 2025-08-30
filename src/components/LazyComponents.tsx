import { lazy, Suspense } from 'react';

// Componentes pesados com lazy loading
export const LazyDashboard = lazy(() => import('./Dashboard/Dashboard'));
export const LazyReports = lazy(() => import('./Reports/Reports'));
export const LazyAnalytics = lazy(() => import('./Analytics/Analytics'));
export const LazySettings = lazy(() => import('./Settings/Settings'));

// Loading component
export const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    <span className="ml-2 text-gray-600">Carregando...</span>
  </div>
);

// Wrapper para componentes lazy
export const LazyComponent = ({ component: Component, ...props }: any) => (
  <Suspense fallback={<LoadingSpinner />}>
    <Component {...props} />
  </Suspense>
);
