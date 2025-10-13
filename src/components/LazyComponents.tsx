import { lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-6 w-6 animate-spin" />
    <span className="ml-2">Carregando...</span>
  </div>
)

// Wrapper para lazy loading com Suspense
export const withSuspense = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) => {
  const WrappedComponent = (props: P) => (
    <Suspense fallback={fallback || <LoadingSpinner />}>
      <Component {...props} />
    </Suspense>
  )
  
  WrappedComponent.displayName = `withSuspense(${Component.displayName || Component.name})`
  return WrappedComponent
}

// Lazy components para páginas principais
export const LazyPatrimonios = withSuspense(
  lazy(() => import('@/pages/patrimonios/Patrimonios').then(module => ({ default: module.Patrimonios })))
)

export const LazyImoveis = withSuspense(
  lazy(() => import('@/pages/imoveis/Imoveis').then(module => ({ default: module.Imoveis })))
)

export const LazyRelatorios = withSuspense(
  lazy(() => import('@/pages/relatorios/Relatorios').then(module => ({ default: module.Relatorios })))
)

export const LazyUsuarios = withSuspense(
  lazy(() => import('@/pages/admin/Usuarios').then(module => ({ default: module.Usuarios })))
)

export const LazyPersonalizacao = withSuspense(
  lazy(() => import('@/pages/admin/Personalization').then(module => ({ default: module.default })))
)

export const LazyDashboard = withSuspense(
  lazy(() => import('@/pages/dashboards/UnifiedDashboard'))
)

// Lazy components para formulários
export const LazyPatrimonioForm = withSuspense(
  lazy(() => import('@/pages/patrimonios/PatrimonioForm').then(module => ({ default: module.PatrimonioForm })))
)

export const LazyImovelForm = withSuspense(
  lazy(() => import('@/pages/imoveis/ImovelForm').then(module => ({ default: module.ImovelForm })))
)

// Lazy components para relatórios
export const LazyRelatorioPatrimonios = withSuspense(
  lazy(() => import('@/pages/relatorios/RelatorioPatrimonios').then(module => ({ default: module.RelatorioPatrimonios })))
)

export const LazyRelatorioImoveis = withSuspense(
  lazy(() => import('@/pages/relatorios/RelatorioImoveis').then(module => ({ default: module.RelatorioImoveis })))
)

// Lazy components para admin
export const LazySetores = withSuspense(
  lazy(() => import('@/pages/admin/Setores').then(module => ({ default: module.Setores })))
)

export const LazyLocais = withSuspense(
  lazy(() => import('@/pages/admin/Locais').then(module => ({ default: module.Locais })))
)

export const LazyTiposBens = withSuspense(
  lazy(() => import('@/pages/admin/TiposBens').then(module => ({ default: module.TiposBens })))
)
