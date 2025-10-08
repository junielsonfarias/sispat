import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { RouteFallback } from '@/components/RouteFallback'
import { Layout } from '@/components/Layout'
import { SuperuserLayout } from '@/components/SuperuserLayout'
import { DynamicHead } from '@/components/DynamicHead'

// Context Providers
import { AppProviders } from '@/components/AppProviders'

// Page Imports (Lazy)
const Login = lazy(() => import('@/pages/auth/Login'))
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'))
const PublicAssets = lazy(() => import('@/pages/PublicAssets'))
const PublicConsultation = lazy(() => import('@/pages/PublicConsultation'))
const PublicImovelDetalhe = lazy(() => import('@/pages/PublicImovelDetalhe'))
const NotFound = lazy(() => import('@/pages/NotFound'))
const DashboardRedirect = lazy(() => import('@/pages/DashboardRedirect'))
const NotificationsPage = lazy(() => import('@/pages/Notifications'))

// Main App Pages
const UnifiedDashboard = lazy(
  () => import('@/pages/dashboards/UnifiedDashboard'),
)
const TestDashboard = lazy(
  () => import('@/pages/dashboards/TestDashboard'),
)
const AdminDashboard = lazy(() => import('@/pages/dashboards/AdminDashboard'))
const UserDashboard = lazy(() => import('@/pages/dashboards/UserDashboard'))
const ViewerDashboard = lazy(() => import('@/pages/dashboards/ViewerDashboard'))
// const BensCadastrados = lazy(() => import('@/pages/bens/BensCadastrados'))
import BensCadastrados from '@/pages/bens/BensCadastrados'
const BensCreate = lazy(() => import('@/pages/bens/BensCreate'))
const BensBulkCreate = lazy(() => import('@/pages/bens/BensBulkCreate'))
const BensEdit = lazy(() => import('@/pages/bens/BensEdit'))
const BensView = lazy(() => import('@/pages/bens/BensView'))
const Emprestimos = lazy(() => import('@/pages/bens/Emprestimos'))
const Transferencias = lazy(() => import('@/pages/bens/Transferencias'))
const InventariosList = lazy(
  () => import('@/pages/inventarios/InventariosList'),
)
const InventarioCreate = lazy(
  () => import('@/pages/inventarios/InventarioCreate'),
)
const InventarioDetail = lazy(
  () => import('@/pages/inventarios/InventarioDetail'),
)
const InventarioSummary = lazy(
  () => import('@/pages/inventarios/InventarioSummary'),
)
const Locais = lazy(() => import('@/pages/locais/Locais'))
const ImoveisList = lazy(() => import('@/pages/imoveis/ImoveisList'))
const ImoveisCreate = lazy(() => import('@/pages/imoveis/ImoveisCreate'))
const ImoveisEdit = lazy(() => import('@/pages/imoveis/ImoveisEdit'))
const ImoveisView = lazy(() => import('@/pages/imoveis/ImoveisView'))
const ImoveisManutencao = lazy(
  () => import('@/pages/imoveis/ImoveisManutencao'),
)
const ImoveisCustomFields = lazy(
  () => import('@/pages/imoveis/ImovelCustomFields'),
)
const ImoveisReportTemplates = lazy(
  () => import('@/pages/imoveis/ImoveisReportTemplates'),
)
const ImoveisReportEditor = lazy(
  () => import('@/pages/imoveis/ImoveisReportEditor'),
)
const AnaliseSetor = lazy(() => import('@/pages/analise/AnaliseSetor'))
const AnaliseTipo = lazy(() => import('@/pages/analise/AnaliseTipo'))
const AnaliseTemporal = lazy(() => import('@/pages/analise/AnaliseTemporal'))
const Depreciacao = lazy(() => import('@/pages/analise/Depreciacao'))
const RelatoriosDepreciacao = lazy(
  () => import('@/pages/analise/RelatoriosDepreciacao'),
)
const DepreciationDashboard = lazy(
  () => import('@/pages/dashboards/DepreciationDashboard'),
)
const Relatorios = lazy(() => import('@/pages/ferramentas/Relatorios'))
const ReportView = lazy(() => import('@/pages/ferramentas/ReportView'))
const ReportTemplates = lazy(
  () => import('@/pages/ferramentas/ReportTemplates'),
)
const ReportLayoutEditor = lazy(
  () => import('@/pages/ferramentas/ReportLayoutEditor'),
)
const TransferenciaReports = lazy(
  () => import('@/pages/ferramentas/TransferenciaReports'),
)
const Exportacao = lazy(() => import('@/pages/ferramentas/Exportacao'))
const GerarEtiquetas = lazy(() => import('@/pages/ferramentas/GerarEtiquetas'))
const LabelTemplates = lazy(() => import('@/pages/ferramentas/LabelTemplates'))
const LabelTemplateEditor = lazy(
  () => import('@/pages/ferramentas/LabelTemplateEditor'),
)
const GeneralDocuments = lazy(
  () => import('@/pages/ferramentas/GeneralDocuments'),
)
const SyncClient = lazy(() => import('@/pages/ferramentas/SyncClient'))
const Downloads = lazy(() => import('@/pages/ferramentas/Downloads'))
const Settings = lazy(() => import('@/pages/admin/Settings'))
const UserManagement = lazy(() => import('@/pages/admin/UserManagement'))
const SectorManagement = lazy(() => import('@/pages/admin/SectorManagement'))
const TipoBemManagement = lazy(() => import('@/pages/admin/TipoBemManagement'))
const SecuritySettings = lazy(() => import('@/pages/admin/SecuritySettings'))
const BackupSettings = lazy(() => import('@/pages/admin/BackupSettings'))
const Personalization = lazy(() => import('@/pages/admin/Personalization'))
const NumberingSettings = lazy(() => import('@/pages/admin/NumberingSettings'))
const ActivityLog = lazy(() => import('@/pages/admin/ActivityLog'))
const AcquisitionFormManagement = lazy(() => import('@/pages/admin/AcquisitionFormManagement'))
const InventarioEdit = lazy(() => import('@/pages/inventarios/InventarioEdit'))
const InventarioPrint = lazy(() => import('@/pages/inventarios/InventarioPrint'))
const Profile = lazy(() => import('@/pages/Profile'))

// Superuser Pages
const SuperuserDashboard = lazy(
  () => import('@/pages/superuser/SuperuserDashboard'),
)
const SuperuserUserManagement = lazy(
  () => import('@/pages/superuser/UserManagement'),
)
const SystemCustomization = lazy(
  () => import('@/pages/superuser/SystemCustomization'),
)
const FormFieldManagement = lazy(
  () => import('@/pages/superuser/FormFieldManagement'),
)
const ExcelCsvTemplateManagement = lazy(
  () => import('@/pages/superuser/ExcelCsvTemplateManagement'),
)
const Documentation = lazy(() => import('@/pages/superuser/Documentation'))
const SystemInformation = lazy(
  () => import('@/pages/superuser/SystemInformation'),
)
const SuperuserFooterCustomization = lazy(
  () => import('@/pages/superuser/SuperuserFooterCustomization'),
)
const VersionUpdate = lazy(() => import('@/pages/superuser/VersionUpdate'))
const AssetsByUser = lazy(() => import('@/pages/superuser/AssetsByUser'))
const PermissionManagement = lazy(
  () => import('@/pages/superuser/PermissionManagement'),
)


function App() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AppProviders>
        <DynamicHead />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/esqueci-minha-senha" element={<ForgotPassword />} />
            <Route path="/redefinir-senha/:token" element={<ResetPassword />} />
            <Route path="/consulta-publica" element={<PublicAssets />} />
            <Route
              path="/consulta-publica/:id"
              element={<PublicConsultation />}
            />
            <Route
              path="/consulta-publica/imovel/:id"
              element={<PublicImovelDetalhe />}
            />

            {/* Superuser Routes */}
            <Route
              element={
                <ProtectedRoute allowedRoles={['superuser']}>
                  <SuperuserLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/superuser" element={<SuperuserDashboard />} />
              <Route
                path="/superuser/users"
                element={<SuperuserUserManagement />}
              />
              <Route
                path="/superuser/assets-by-user"
                element={<AssetsByUser />}
              />
              <Route
                path="/superuser/customization"
                element={<SystemCustomization />}
              />
              <Route
                path="/superuser/form-fields"
                element={<FormFieldManagement />}
              />
              <Route
                path="/superuser/export-templates"
                element={<ExcelCsvTemplateManagement />}
              />
              <Route
                path="/superuser/documentation"
                element={<Documentation />}
              />
              <Route
                path="/superuser/system-information"
                element={<SystemInformation />}
              />
              <Route
                path="/superuser/footer-customization"
                element={<SuperuserFooterCustomization />}
              />
              <Route
                path="/superuser/version-update"
                element={<VersionUpdate />}
              />
              <Route
                path="/superuser/permissions"
                element={<PermissionManagement />}
              />
            </Route>

            {/* Main App Routes */}
            <Route
              element={
                <ProtectedRoute
                  allowedRoles={[
                    'admin',
                    'supervisor',
                    'usuario',
                    'visualizador',
                  ]}
                >
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<UnifiedDashboard />} />
              <Route
                path="/dashboard/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/supervisor"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                    <UnifiedDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/usuario"
                element={
                  <ProtectedRoute allowedRoles={['usuario']}>
                    <UserDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/visualizador"
                element={
                  <ProtectedRoute allowedRoles={['visualizador']}>
                    <ViewerDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard/depreciacao"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                    <DepreciationDashboard />
                  </ProtectedRoute>
                }
              />

              <Route path="/bens-cadastrados" element={<BensCadastrados />} />
              <Route
                path="/bens-cadastrados/novo"
                element={
                  <ProtectedRoute
                    allowedRoles={['admin', 'supervisor', 'usuario']}
                  >
                    <BensCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bens-cadastrados/novo-lote"
                element={
                  <ProtectedRoute
                    allowedRoles={['admin', 'supervisor', 'usuario']}
                  >
                    <BensBulkCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bens-cadastrados/editar/:id"
                element={
                  <ProtectedRoute
                    allowedRoles={['admin', 'supervisor', 'usuario']}
                  >
                    <BensEdit />
                  </ProtectedRoute>
                }
              />
              <Route path="/bens-cadastrados/ver/:id" element={<BensView />} />
              <Route path="/bens/emprestimos" element={<Emprestimos />} />
              <Route path="/bens/transferencias" element={<Transferencias />} />

              <Route path="/inventarios" element={<InventariosList />} />
              <Route
                path="/inventarios/novo"
                element={
                  <ProtectedRoute
                    allowedRoles={['admin', 'supervisor', 'usuario']}
                  >
                    <InventarioCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventarios/:id"
                element={
                  <ProtectedRoute
                    allowedRoles={['admin', 'supervisor', 'usuario']}
                  >
                    <InventarioDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventarios/resumo/:id"
                element={<InventarioSummary />}
              />
              <Route
                path="/inventarios/editar/:id"
                element={
                  <ProtectedRoute
                    allowedRoles={['admin', 'supervisor']}
                  >
                    <InventarioEdit />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inventarios/imprimir/:id"
                element={
                  <ProtectedRoute
                    allowedRoles={['admin', 'supervisor', 'usuario']}
                  >
                    <InventarioPrint />
                  </ProtectedRoute>
                }
              />

              <Route path="/locais" element={<Locais />} />

              <Route path="/imoveis" element={<ImoveisList />} />
              <Route
                path="/imoveis/novo"
                element={
                  <ProtectedRoute
                    allowedRoles={['admin', 'supervisor', 'usuario']}
                  >
                    <ImoveisCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/imoveis/editar/:id"
                element={
                  <ProtectedRoute
                    allowedRoles={['admin', 'supervisor', 'usuario']}
                  >
                    <ImoveisEdit />
                  </ProtectedRoute>
                }
              />
              <Route path="/imoveis/ver/:id" element={<ImoveisView />} />
              <Route
                path="/imoveis/manutencao"
                element={<ImoveisManutencao />}
              />
              <Route
                path="/imoveis/campos"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                    <ImoveisCustomFields />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/imoveis/relatorios/templates"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                    <ImoveisReportTemplates />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/imoveis/relatorios/templates/editar/:templateId"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                    <ImoveisReportEditor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/imoveis/relatorios/templates/novo"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                    <ImoveisReportEditor />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/analise/setor"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                    <AnaliseSetor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analise/tipo"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                    <AnaliseTipo />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analise/temporal"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                    <AnaliseTemporal />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/depreciacao"
                element={
                  <ProtectedRoute
                    allowedRoles={['admin', 'supervisor', 'usuario']}
                  >
                    <Depreciacao />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/relatorios/depreciacao"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                    <RelatoriosDepreciacao />
                  </ProtectedRoute>
                }
              />

              <Route path="/relatorios" element={<Relatorios />} />
              <Route
                path="/relatorios/ver/:templateId"
                element={<ReportView />}
              />
              <Route
                path="/relatorios/templates"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                    <ReportTemplates />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/relatorios/templates/editor/:templateId"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                    <ReportLayoutEditor />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/relatorios/transferencias"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                    <TransferenciaReports />
                  </ProtectedRoute>
                }
              />

              <Route path="/exportacao" element={<Exportacao />} />
              <Route path="/gerar-etiquetas" element={<GerarEtiquetas />} />
              <Route
                path="/etiquetas/templates"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                    <LabelTemplates />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/etiquetas/templates/editor/:templateId"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                    <LabelTemplateEditor />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/ferramentas/documentos"
                element={<GeneralDocuments />}
              />
              <Route path="/ferramentas/sync-client" element={<SyncClient />} />
              <Route path="/downloads" element={<Downloads />} />

              <Route
                path="/configuracoes"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/configuracoes/usuarios"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                    <UserManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/configuracoes/setores"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                    <SectorManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/configuracoes/tipos"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                    <TipoBemManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/configuracoes/formas-aquisicao"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                    <AcquisitionFormManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/configuracoes/personalizacao"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                    <Personalization />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/configuracoes/seguranca"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                    <SecuritySettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/configuracoes/backup"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                    <BackupSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/configuracoes/numeracao-bens"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                    <NumberingSettings />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/registros-de-atividade"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                    <ActivityLog />
                  </ProtectedRoute>
                }
              />
              <Route path="/perfil" element={<Profile />} />
              <Route path="/notificacoes" element={<NotificationsPage />} />

              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </AppProviders>
    </BrowserRouter>
  )
}

export default App
