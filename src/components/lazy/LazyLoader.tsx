import { Suspense, lazy, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

interface LazyLoaderProps {
  fallback?: React.ReactNode;
}

const DefaultFallback = () => (
  <div className='flex items-center justify-center p-8'>
    <Loader2 className='h-8 w-8 animate-spin' />
    <span className='ml-2'>Carregando...</span>
  </div>
);

export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFunc);

  return function LazyWrapper(props: any) {
    return (
      <Suspense fallback={fallback || <DefaultFallback />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

// Componentes lazy para páginas grandes
export const LazyPatrimonioList = createLazyComponent(
  () => import('@/pages/bens/BensList')
);

export const LazyRelatorios = createLazyComponent(
  () => import('@/pages/relatorios/Relatorios')
);

export const LazyUserManagement = createLazyComponent(
  () => import('@/pages/admin/UserManagement')
);

export const LazyMunicipalityManagement = createLazyComponent(
  () => import('@/pages/admin/MunicipalityManagement')
);

export const LazySystemCustomization = createLazyComponent(
  () => import('@/pages/admin/SystemCustomization')
);

export const LazyLabelTemplates = createLazyComponent(
  () => import('@/pages/admin/LabelTemplates')
);

export const LazyReportTemplates = createLazyComponent(
  () => import('@/pages/admin/ReportTemplates')
);

export const LazyFormFieldManagement = createLazyComponent(
  () => import('@/pages/admin/FormFieldManagement')
);

export const LazySystemMonitoring = createLazyComponent(
  () => import('@/pages/admin/SystemMonitoring')
);

export const LazyDocumentation = createLazyComponent(
  () => import('@/pages/Documentation')
);

export const LazyExportacao = createLazyComponent(
  () => import('@/pages/Exportacao')
);

export const LazyGerarEtiquetas = createLazyComponent(
  () => import('@/pages/GerarEtiquetas')
);

export const LazyImoveisList = createLazyComponent(
  () => import('@/pages/imoveis/ImoveisList')
);

export const LazyImoveisCreate = createLazyComponent(
  () => import('@/pages/imoveis/ImoveisCreate')
);

export const LazyImoveisEdit = createLazyComponent(
  () => import('@/pages/imoveis/ImoveisEdit')
);

export const LazyImoveisView = createLazyComponent(
  () => import('@/pages/imoveis/ImoveisView')
);

export const LazyLocais = createLazyComponent(() => import('@/pages/Locais'));

export const LazyInventariosList = createLazyComponent(
  () => import('@/pages/inventarios/InventariosList')
);

export const LazyInventariosCreate = createLazyComponent(
  () => import('@/pages/inventarios/InventariosCreate')
);

export const LazyInventariosDetail = createLazyComponent(
  () => import('@/pages/inventarios/InventariosDetail')
);

export const LazyInventariosSummary = createLazyComponent(
  () => import('@/pages/inventarios/InventariosSummary')
);

export const LazyDepreciacao = createLazyComponent(
  () => import('@/pages/analise/Depreciacao')
);

export const LazyRelatoriosDepreciacao = createLazyComponent(
  () => import('@/pages/analise/RelatoriosDepreciacao')
);

export const LazyAnaliseTipo = createLazyComponent(
  () => import('@/pages/analise/AnaliseTipo')
);

export const LazyAnaliseSetor = createLazyComponent(
  () => import('@/pages/analise/AnaliseSetor')
);

export const LazyAnaliseTemporal = createLazyComponent(
  () => import('@/pages/analise/AnaliseTemporal')
);

export const LazyTransferenciaReports = createLazyComponent(
  () => import('@/pages/analise/TransferenciaReports')
);

export const LazyAssetsByUser = createLazyComponent(
  () => import('@/pages/analise/AssetsByUser')
);

export const LazyGeneralDocuments = createLazyComponent(
  () => import('@/pages/analise/GeneralDocuments')
);

export const LazyDownloads = createLazyComponent(
  () => import('@/pages/Downloads')
);

export const LazyPublicAssets = createLazyComponent(
  () => import('@/pages/public/PublicAssets')
);

export const LazyPublicImovelDetalhe = createLazyComponent(
  () => import('@/pages/public/PublicImovelDetalhe')
);

export const LazyPublicConsultation = createLazyComponent(
  () => import('@/pages/public/PublicConsultation')
);

export const LazySyncClient = createLazyComponent(
  () => import('@/pages/SyncClient')
);

export const LazyVersionUpdate = createLazyComponent(
  () => import('@/pages/VersionUpdate')
);

export const LazySuperuserDashboard = createLazyComponent(
  () => import('@/pages/dashboards/SuperuserDashboard')
);

export const LazySupervisorDashboard = createLazyComponent(
  () => import('@/pages/dashboards/SupervisorDashboard')
);

export const LazyUserDashboard = createLazyComponent(
  () => import('@/pages/dashboards/UserDashboard')
);

export const LazyDepreciationDashboard = createLazyComponent(
  () => import('@/pages/dashboards/DepreciationDashboard')
);

export const LazySystemInformation = createLazyComponent(
  () => import('@/pages/admin/SystemInformation')
);

export const LazyPublicSearchSettings = createLazyComponent(
  () => import('@/pages/admin/PublicSearchSettings')
);

export const LazyPermissionManagement = createLazyComponent(
  () => import('@/pages/admin/PermissionManagement')
);

export const LazyExcelCsvTemplateManagement = createLazyComponent(
  () => import('@/pages/admin/ExcelCsvTemplateManagement')
);

export const LazyLogoManagement = createLazyComponent(
  () => import('@/pages/admin/LogoManagement')
);

export const LazyReportLayoutEditor = createLazyComponent(
  () => import('@/pages/admin/ReportLayoutEditor')
);

export const LazyLabelPreview = createLazyComponent(
  () => import('@/pages/admin/LabelPreview')
);

export const LazyExportConfigDialog = createLazyComponent(
  () => import('@/pages/admin/ExportConfigDialog')
);

export const LazySuperuserFooterCustomization = createLazyComponent(
  () => import('@/pages/admin/SuperuserFooterCustomization')
);

export const LazyNotifications = createLazyComponent(
  () => import('@/pages/Notifications')
);

export const LazyForgotPassword = createLazyComponent(
  () => import('@/pages/ForgotPassword')
);

export const LazyResetPassword = createLazyComponent(
  () => import('@/pages/ResetPassword')
);

export const LazyProfile = createLazyComponent(() => import('@/pages/Profile'));

export const LazyLogin = createLazyComponent(() => import('@/pages/Login'));

export const LazyNotFound = createLazyComponent(
  () => import('@/pages/NotFound')
);

export const LazyDashboardRedirect = createLazyComponent(
  () => import('@/pages/DashboardRedirect')
);
