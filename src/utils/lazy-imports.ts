/**
 * Lazy Imports Organizados por Chunks
 */

import { lazy } from 'react';

// Chunk: Authentication
export const AuthPages = {
  Login: lazy(() => import('@/pages/auth/Login')),
  ForgotPassword: lazy(() => import('@/pages/auth/ForgotPassword')),
  ResetPassword: lazy(() => import('@/pages/auth/ResetPassword')),
};

// Chunk: Public Pages
export const PublicPages = {
  PublicAssets: lazy(() => import('@/pages/PublicAssets')),
  PublicConsultation: lazy(() => import('@/pages/PublicConsultation')),
  PublicImovelDetalhe: lazy(() => import('@/pages/PublicImovelDetalhe')),
};

// Chunk: Dashboards
export const DashboardPages = {
  DashboardRedirect: lazy(() => import('@/pages/DashboardRedirect')),
  SummaryDashboard: lazy(
    () =>
      import(
        /* webpackChunkName: "dashboard-summary" */ '@/pages/dashboards/SummaryDashboard'
      )
  ),
  SupervisorDashboard: lazy(
    () =>
      import(
        /* webpackChunkName: "dashboard-supervisor" */ '@/pages/dashboards/SupervisorDashboard'
      )
  ),
  AdminDashboard: lazy(
    () =>
      import(
        /* webpackChunkName: "dashboard-admin" */ '@/pages/dashboards/AdminDashboard'
      )
  ),
  UserDashboard: lazy(
    () =>
      import(
        /* webpackChunkName: "dashboard-user" */ '@/pages/dashboards/UserDashboard'
      )
  ),
  ViewerDashboard: lazy(
    () =>
      import(
        /* webpackChunkName: "dashboard-viewer" */ '@/pages/dashboards/ViewerDashboard'
      )
  ),
  DepreciationDashboard: lazy(
    () =>
      import(
        /* webpackChunkName: "dashboard-depreciation" */ '@/pages/dashboards/DepreciationDashboard'
      )
  ),
};

// Chunk: Patrimônios (Bens)
export const PatrimonioPages = {
  BensCadastrados: lazy(
    () =>
      import(
        /* webpackChunkName: "patrimonios-list" */ '@/pages/bens/BensCadastrados'
      )
  ),
  BensCreate: lazy(
    () =>
      import(
        /* webpackChunkName: "patrimonios-create" */ '@/pages/bens/BensCreate'
      )
  ),
  BensEdit: lazy(
    () =>
      import(/* webpackChunkName: "patrimonios-edit" */ '@/pages/bens/BensEdit')
  ),
  BensView: lazy(
    () =>
      import(/* webpackChunkName: "patrimonios-view" */ '@/pages/bens/BensView')
  ),
  Emprestimos: lazy(
    () =>
      import(
        /* webpackChunkName: "patrimonios-loans" */ '@/pages/bens/Emprestimos'
      )
  ),
  Transferencias: lazy(
    () =>
      import(
        /* webpackChunkName: "patrimonios-transfers" */ '@/pages/bens/Transferencias'
      )
  ),
};

// Chunk: Inventários
export const InventoryPages = {
  InventariosList: lazy(
    () =>
      import(
        /* webpackChunkName: "inventory-list" */ '@/pages/inventarios/InventariosList'
      )
  ),
  InventarioCreate: lazy(
    () =>
      import(
        /* webpackChunkName: "inventory-create" */ '@/pages/inventarios/InventarioCreate'
      )
  ),
  InventarioDetail: lazy(
    () =>
      import(
        /* webpackChunkName: "inventory-detail" */ '@/pages/inventarios/InventarioDetail'
      )
  ),
  InventarioSummary: lazy(
    () =>
      import(
        /* webpackChunkName: "inventory-summary" */ '@/pages/inventarios/InventarioSummary'
      )
  ),
};

// Chunk: Imóveis
export const ImovelPages = {
  ImoveisList: lazy(
    () =>
      import(
        /* webpackChunkName: "imoveis-list" */ '@/pages/imoveis/ImoveisList'
      )
  ),
  ImoveisCreate: lazy(
    () =>
      import(
        /* webpackChunkName: "imoveis-create" */ '@/pages/imoveis/ImoveisCreate'
      )
  ),
  ImoveisEdit: lazy(
    () =>
      import(
        /* webpackChunkName: "imoveis-edit" */ '@/pages/imoveis/ImoveisEdit'
      )
  ),
  ImoveisView: lazy(
    () =>
      import(
        /* webpackChunkName: "imoveis-view" */ '@/pages/imoveis/ImoveisView'
      )
  ),
  ImoveisMapa: lazy(
    () =>
      import(
        /* webpackChunkName: "imoveis-map" */ '@/pages/imoveis/ImoveisMapa'
      )
  ),
  ImoveisManutencao: lazy(
    () =>
      import(
        /* webpackChunkName: "imoveis-maintenance" */ '@/pages/imoveis/ImoveisManutencao'
      )
  ),
  ImoveisCustomFields: lazy(
    () =>
      import(
        /* webpackChunkName: "imoveis-fields" */ '@/pages/imoveis/ImovelCustomFields'
      )
  ),
  ImoveisReportTemplates: lazy(
    () =>
      import(
        /* webpackChunkName: "imoveis-reports" */ '@/pages/imoveis/ImoveisReportTemplates'
      )
  ),
  ImoveisReportEditor: lazy(
    () =>
      import(
        /* webpackChunkName: "imoveis-report-editor" */ '@/pages/imoveis/ImoveisReportEditor'
      )
  ),
};

// Chunk: Análise e Relatórios
export const AnalysisPages = {
  AnaliseSetor: lazy(
    () =>
      import(
        /* webpackChunkName: "analysis-sector" */ '@/pages/analise/AnaliseSetor'
      )
  ),
  AnaliseTipo: lazy(
    () =>
      import(
        /* webpackChunkName: "analysis-type" */ '@/pages/analise/AnaliseTipo'
      )
  ),
  AnaliseTemporal: lazy(
    () =>
      import(
        /* webpackChunkName: "analysis-temporal" */ '@/pages/analise/AnaliseTemporal'
      )
  ),
  Depreciacao: lazy(
    () =>
      import(
        /* webpackChunkName: "depreciation" */ '@/pages/analise/Depreciacao'
      )
  ),
  RelatoriosDepreciacao: lazy(
    () =>
      import(
        /* webpackChunkName: "depreciation-reports" */ '@/pages/analise/RelatoriosDepreciacao'
      )
  ),
};

// Chunk: Ferramentas e Relatórios
export const ToolPages = {
  Relatorios: lazy(
    () =>
      import(/* webpackChunkName: "reports" */ '@/pages/ferramentas/Relatorios')
  ),
  ReportView: lazy(
    () =>
      import(
        /* webpackChunkName: "report-view" */ '@/pages/ferramentas/ReportView'
      )
  ),
  ReportTemplates: lazy(
    () =>
      import(
        /* webpackChunkName: "report-templates" */ '@/pages/ferramentas/ReportTemplates'
      )
  ),
  ReportLayoutEditor: lazy(
    () =>
      import(
        /* webpackChunkName: "report-editor" */ '@/pages/ferramentas/ReportLayoutEditor'
      )
  ),
  TransferenciaReports: lazy(
    () =>
      import(
        /* webpackChunkName: "transfer-reports" */ '@/pages/ferramentas/TransferenciaReports'
      )
  ),
  Exportacao: lazy(
    () =>
      import(/* webpackChunkName: "export" */ '@/pages/ferramentas/Exportacao')
  ),
  GerarEtiquetas: lazy(
    () =>
      import(
        /* webpackChunkName: "labels" */ '@/pages/ferramentas/GerarEtiquetas'
      )
  ),
  LabelTemplates: lazy(
    () =>
      import(
        /* webpackChunkName: "label-templates" */ '@/pages/ferramentas/LabelTemplates'
      )
  ),
  LabelTemplateEditor: lazy(
    () =>
      import(
        /* webpackChunkName: "label-editor" */ '@/pages/ferramentas/LabelTemplateEditor'
      )
  ),
  GeneralDocuments: lazy(
    () =>
      import(
        /* webpackChunkName: "documents" */ '@/pages/ferramentas/GeneralDocuments'
      )
  ),
  SyncClient: lazy(
    () =>
      import(/* webpackChunkName: "sync" */ '@/pages/ferramentas/SyncClient')
  ),
  Downloads: lazy(
    () =>
      import(
        /* webpackChunkName: "downloads" */ '@/pages/ferramentas/Downloads'
      )
  ),
};

// Chunk: Administração
export const AdminPages = {
  Settings: lazy(
    () =>
      import(/* webpackChunkName: "admin-settings" */ '@/pages/admin/Settings')
  ),
  UserManagement: lazy(
    () =>
      import(
        /* webpackChunkName: "admin-users" */ '@/pages/admin/UserManagement'
      )
  ),
  SectorManagement: lazy(
    () =>
      import(
        /* webpackChunkName: "admin-sectors" */ '@/pages/admin/SectorManagement'
      )
  ),
  SecuritySettings: lazy(() =>
    import(
      /* webpackChunkName: "admin-security" */ '@/pages/admin/SecuritySettings'
    ).then(module => ({ default: module.default || module }))
  ),
  BackupSettings: lazy(
    () =>
      import(
        /* webpackChunkName: "admin-backup" */ '@/pages/admin/BackupSettings'
      )
  ),
  Personalization: lazy(
    () =>
      import(
        /* webpackChunkName: "admin-personalization" */ '@/pages/admin/Personalization'
      )
  ),
  NumberingSettings: lazy(
    () =>
      import(
        /* webpackChunkName: "admin-numbering" */ '@/pages/admin/NumberingSettings'
      )
  ),
  ActivityLog: lazy(
    () =>
      import(
        /* webpackChunkName: "admin-activity" */ '@/pages/admin/ActivityLog'
      )
  ),
  SystemAudit: lazy(
    () =>
      import(/* webpackChunkName: "admin-audit" */ '@/pages/admin/SystemAudit')
  ),
};

// Chunk: Superuser
export const SuperuserPages = {
  SuperuserDashboard: lazy(
    () =>
      import(
        /* webpackChunkName: "superuser-dashboard" */ '@/pages/superuser/SuperuserDashboard'
      )
  ),
  MunicipalityManagement: lazy(
    () =>
      import(
        /* webpackChunkName: "superuser-municipalities" */ '@/pages/superuser/MunicipalityManagement'
      )
  ),
  SuperuserUserManagement: lazy(
    () =>
      import(
        /* webpackChunkName: "superuser-users" */ '@/pages/superuser/UserManagement'
      )
  ),
  SystemCustomization: lazy(
    () =>
      import(
        /* webpackChunkName: "superuser-customization" */ '@/pages/superuser/SystemCustomization'
      )
  ),
  SystemMonitoring: lazy(
    () =>
      import(
        /* webpackChunkName: "superuser-monitoring" */ '@/pages/superuser/SystemMonitoring'
      )
  ),
  FormFieldManagement: lazy(
    () =>
      import(
        /* webpackChunkName: "superuser-fields" */ '@/pages/superuser/FormFieldManagement'
      )
  ),
  ExcelCsvTemplateManagement: lazy(
    () =>
      import(
        /* webpackChunkName: "superuser-templates" */ '@/pages/superuser/ExcelCsvTemplateManagement'
      )
  ),
  PublicSearchSettings: lazy(
    () =>
      import(
        /* webpackChunkName: "superuser-search" */ '@/pages/superuser/PublicSearchSettings'
      )
  ),
  Documentation: lazy(
    () =>
      import(
        /* webpackChunkName: "superuser-docs" */ '@/pages/superuser/Documentation'
      )
  ),
  SystemInformation: lazy(
    () =>
      import(
        /* webpackChunkName: "superuser-info" */ '@/pages/superuser/SystemInformation'
      )
  ),
  SuperuserFooterCustomization: lazy(
    () =>
      import(
        /* webpackChunkName: "superuser-footer" */ '@/pages/superuser/SuperuserFooterCustomization'
      )
  ),
  VersionUpdate: lazy(
    () =>
      import(
        /* webpackChunkName: "superuser-version" */ '@/pages/superuser/VersionUpdate'
      )
  ),
  AssetsByUser: lazy(
    () =>
      import(
        /* webpackChunkName: "superuser-assets" */ '@/pages/superuser/AssetsByUser'
      )
  ),
  PermissionManagement: lazy(
    () =>
      import(
        /* webpackChunkName: "superuser-permissions" */ '@/pages/superuser/PermissionManagement'
      )
  ),
};

// Chunk: Outras páginas
export const CommonPages = {
  Locais: lazy(
    () =>
      import(/* webpackChunkName: "common-locations" */ '@/pages/locais/Locais')
  ),
  Profile: lazy(
    () => import(/* webpackChunkName: "common-profile" */ '@/pages/Profile')
  ),
  NotFound: lazy(
    () => import(/* webpackChunkName: "common-notfound" */ '@/pages/NotFound')
  ),
  NotificationsPage: lazy(
    () =>
      import(
        /* webpackChunkName: "common-notifications" */ '@/pages/Notifications'
      )
  ),
};

// Helper para preload de chunks por role
export const preloadChunksByRole = (role: string) => {
  switch (role) {
    case 'superuser':
      // Preload chunks mais comuns para superuser
      Object.values(SuperuserPages).forEach(component => {
        if (typeof component === 'function') {
          component({});
        }
      });
      break;
    case 'admin':
      // Preload chunks para admin
      Object.values(AdminPages).forEach(component => {
        if (typeof component === 'function') {
          component({});
        }
      });
      break;
    case 'supervisor':
      // Preload chunks para supervisor
      Object.values(DashboardPages).forEach(component => {
        if (typeof component === 'function') {
          component({});
        }
      });
      break;
    default:
      // Preload chunks básicos
      Object.values(CommonPages).forEach(component => {
        if (typeof component === 'function') {
          component({});
        }
      });
  }
};

// Helper para preload sob demanda
export const preloadChunk = (chunkName: string) => {
  const allPages = {
    ...AuthPages,
    ...PublicPages,
    ...DashboardPages,
    ...PatrimonioPages,
    ...InventoryPages,
    ...ImovelPages,
    ...AnalysisPages,
    ...ToolPages,
    ...AdminPages,
    ...SuperuserPages,
    ...CommonPages,
  };

  const component = allPages[chunkName as keyof typeof allPages];
  if (component && typeof component === 'function') {
    component({});
  }
};
