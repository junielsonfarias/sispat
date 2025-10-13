import { lazy, Suspense } from 'react'
import { SkeletonList } from '@/components/ui/skeleton-list'

/**
 * Lazy loading para páginas pesadas
 * Reduz bundle inicial e melhora performance
 */

// Loading fallback
const PageLoading = () => (
  <div className="p-6">
    <SkeletonList type="card" count={5} />
  </div>
)

// Wrapper para Suspense
const withSuspense = (Component: React.LazyExoticComponent<any>) => {
  return (
    <Suspense fallback={<PageLoading />}>
      <Component />
    </Suspense>
  )
}

// ============================================
// PÁGINAS LAZY LOADED
// ============================================

// Dashboards
export const LazyUnifiedDashboard = lazy(() => import('@/pages/dashboards/UnifiedDashboard'))
export const LazyAdminDashboard = lazy(() => import('@/pages/dashboards/AdminDashboard'))
export const LazyUserDashboard = lazy(() => import('@/pages/dashboards/UserDashboard'))
export const LazyViewerDashboard = lazy(() => import('@/pages/dashboards/ViewerDashboard'))
export const LazyDepreciationDashboard = lazy(() => import('@/pages/dashboards/DepreciationDashboard'))

// Bens (Patrimônios)
export const LazyBensView = lazy(() => import('@/pages/bens/BensView'))
export const LazyPatrimonioCreatePage = lazy(() => import('@/pages/bens/PatrimonioCreatePage'))
export const LazyPatrimonioEditPage = lazy(() => import('@/pages/bens/PatrimonioEditPage'))
export const LazyPatrimonioDetalhesPage = lazy(() => import('@/pages/bens/PatrimonioDetalhesPage'))
export const LazyBaixaBemPage = lazy(() => import('@/pages/bens/BaixaBemPage'))
export const LazySubPatrimonios = lazy(() => import('@/pages/bens/SubPatrimonios'))

// Imóveis
export const LazyImoveisView = lazy(() => import('@/pages/imoveis/ImoveisView'))
export const LazyImovelCreatePage = lazy(() => import('@/pages/imoveis/ImovelCreatePage'))
export const LazyImovelEditPage = lazy(() => import('@/pages/imoveis/ImovelEditPage'))
export const LazyImovelDetalhesPage = lazy(() => import('@/pages/imoveis/ImovelDetalhesPage'))

// Ferramentas
export const LazyRelatoriosPage = lazy(() => import('@/pages/ferramentas/RelatoriosPage'))
export const LazyEtiquetasPage = lazy(() => import('@/pages/ferramentas/EtiquetasPage'))
export const LazyImportacaoPage = lazy(() => import('@/pages/ferramentas/ImportacaoPage'))
export const LazyExportacaoPage = lazy(() => import('@/pages/ferramentas/ExportacaoPage'))

// Admin
export const LazyAdminUserPage = lazy(() => import('@/pages/admin/UserPage'))
export const LazyAdminSetoresPage = lazy(() => import('@/pages/admin/SetoresPage'))
export const LazyAdminLocaisPage = lazy(() => import('@/pages/admin/LocaisPage'))
export const LazyAdminTiposBensPage = lazy(() => import('@/pages/admin/TiposBensPage'))
export const LazyAdminFormasAquisicaoPage = lazy(() => import('@/pages/admin/FormasAquisicaoPage'))
export const LazyAdminCustomizationPage = lazy(() => import('@/pages/admin/LogoManagementPage'))

// Inventários
export const LazyInventariosPage = lazy(() => import('@/pages/inventarios/InventariosPage'))

// Análise
export const LazyDepreciacaoPage = lazy(() => import('@/pages/analise/DepreciacaoPage'))

/**
 * Exemplo de uso em rotas:
 * 
 * <Route path="/bens" element={
 *   <Suspense fallback={<PageLoading />}>
 *     <LazyBensView />
 *   </Suspense>
 * } />
 * 
 * Ou com helper:
 * 
 * <Route path="/bens" element={withSuspense(LazyBensView)} />
 */

export { withSuspense, PageLoading }

