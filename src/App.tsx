import { DynamicHead } from '@/components/DynamicHead';
import { ErrorBoundaryWrapper } from '@/components/ErrorBoundary';
import { Layout } from '@/components/Layout';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { PublicDataInitializer } from '@/components/PublicDataInitializer';
import { RouteFallback } from '@/components/RouteFallback';
import { SuperuserLayout } from '@/components/SuperuserLayout';
import { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

// Context Providers
import { TooltipProvider } from '@/components/ui/tooltip';
import { ActivityLogProvider } from '@/contexts/ActivityLogContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { CustomizationProvider } from '@/contexts/CustomizationContext';
import { DashboardProvider } from '@/contexts/DashboardContext';
import { DocumentProvider } from '@/contexts/DocumentContext';
import { ExcelCsvTemplateProvider } from '@/contexts/ExcelCsvTemplateContext';
import { FormFieldManagerProvider } from '@/contexts/FormFieldManagerContext';
import { GlobalLogoProvider } from '@/contexts/GlobalLogoContext';
import { ImovelProvider } from '@/contexts/ImovelContext';
import { ImovelFieldProvider } from '@/contexts/ImovelFieldContext';
import { ImovelReportTemplateProvider } from '@/contexts/ImovelReportTemplateContext';
import { InventoryProvider } from '@/contexts/InventoryContext';
import { LabelTemplateProvider } from '@/contexts/LabelTemplateContext';
import { LoadingProvider } from '@/contexts/LoadingContext';
import { LocalProvider } from '@/contexts/LocalContext';
import { ManutencaoProvider } from '@/contexts/ManutencaoContext';
import { MunicipalityProvider } from '@/contexts/MunicipalityContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { NumberingPatternProvider } from '@/contexts/NumberingPatternContext';
import { PatrimonioProvider } from '@/contexts/PatrimonioContext';
import { PermissionProvider } from '@/contexts/PermissionContext';
import { PublicSearchProvider } from '@/contexts/PublicSearchContext';
import { ReportTemplateProvider } from '@/contexts/ReportTemplateContext';
import { SearchProvider } from '@/contexts/SearchContext';
import { SectorProvider } from '@/contexts/SectorContext';
import { SyncProvider } from '@/contexts/SyncContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { TransferProvider } from '@/contexts/TransferContext';
import { UserReportConfigProvider } from '@/contexts/UserReportConfigContext';
import { VersionProvider } from '@/contexts/VersionContext';
import PersonalizationDirect from '@/pages/admin/Personalization';
import BensCreateDirect from '@/pages/bens/BensCreate';

// Page Imports (Lazy)
const Login = lazy(() => import('@/pages/auth/Login'));
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'));
const PublicAssets = lazy(() => import('@/pages/PublicAssets'));
const PublicConsultation = lazy(() => import('@/pages/PublicConsultation'));
const PublicImovelDetalhe = lazy(() => import('@/pages/PublicImovelDetalhe'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const DashboardRedirect = lazy(() => import('@/pages/DashboardRedirect'));
const NotificationsPage = lazy(() => import('@/pages/Notifications'));

// Main App Pages
const SummaryDashboard = lazy(
  () => import('@/pages/dashboards/SummaryDashboard')
);
const SupervisorDashboard = lazy(
  () => import('@/pages/dashboards/SupervisorDashboard')
);
const AdminDashboard = lazy(() => import('@/pages/dashboards/AdminDashboard'));
const UserDashboard = lazy(() => import('@/pages/dashboards/UserDashboard'));
const ViewerDashboard = lazy(
  () => import('@/pages/dashboards/ViewerDashboard')
);
const BensCadastrados = lazy(() => import('@/pages/bens/BensCadastrados'));
const BensCreate = BensCreateDirect;
const BensEdit = lazy(() => import('@/pages/bens/BensEdit'));
const BensView = lazy(() => import('@/pages/bens/BensView'));
const Emprestimos = lazy(() => import('@/pages/bens/Emprestimos'));
const Transferencias = lazy(() => import('@/pages/bens/Transferencias'));
const InventariosList = lazy(
  () => import('@/pages/inventarios/InventariosList')
);
const InventarioCreate = lazy(
  () => import('@/pages/inventarios/InventarioCreate')
);
const InventarioDetail = lazy(
  () => import('@/pages/inventarios/InventarioDetail')
);
const InventarioSummary = lazy(
  () => import('@/pages/inventarios/InventarioSummary')
);
const Locais = lazy(() => import('@/pages/locais/Locais'));
const ImoveisList = lazy(() => import('@/pages/imoveis/ImoveisList'));
const ImoveisCreate = lazy(() => import('@/pages/imoveis/ImoveisCreate'));
const ImoveisEdit = lazy(() => import('@/pages/imoveis/ImoveisEdit'));
const ImoveisView = lazy(() => import('@/pages/imoveis/ImoveisView'));
const ImoveisMapa = lazy(() => import('@/pages/imoveis/ImoveisMapa'));
const ImoveisManutencao = lazy(
  () => import('@/pages/imoveis/ImoveisManutencao')
);
const ImoveisCustomFields = lazy(
  () => import('@/pages/imoveis/ImovelCustomFields')
);
const ImoveisReportTemplates = lazy(
  () => import('@/pages/imoveis/ImoveisReportTemplates')
);
const ImoveisReportEditor = lazy(
  () => import('@/pages/imoveis/ImoveisReportEditor')
);
const AnaliseSetor = lazy(() => import('@/pages/analise/AnaliseSetor'));
const AnaliseTipo = lazy(() => import('@/pages/analise/AnaliseTipo'));
const AnaliseTemporal = lazy(() => import('@/pages/analise/AnaliseTemporal'));
const Depreciacao = lazy(() => import('@/pages/analise/Depreciacao'));
const RelatoriosDepreciacao = lazy(
  () => import('@/pages/analise/RelatoriosDepreciacao')
);
const DepreciationDashboard = lazy(
  () => import('@/pages/dashboards/DepreciationDashboard')
);
const Relatorios = lazy(() => import('@/pages/ferramentas/Relatorios'));
const ReportView = lazy(() => import('@/pages/ferramentas/ReportView'));
const ReportTemplates = lazy(
  () => import('@/pages/ferramentas/ReportTemplates')
);
const ReportLayoutEditor = lazy(
  () => import('@/pages/ferramentas/ReportLayoutEditor')
);
const TransferenciaReports = lazy(
  () => import('@/pages/ferramentas/TransferenciaReports')
);
const Exportacao = lazy(() => import('@/pages/ferramentas/Exportacao'));
const GerarEtiquetas = lazy(() => import('@/pages/ferramentas/GerarEtiquetas'));
const LabelTemplates = lazy(() => import('@/pages/ferramentas/LabelTemplates'));
const LabelTemplateEditor = lazy(
  () => import('@/pages/ferramentas/LabelTemplateEditor')
);
const GeneralDocuments = lazy(
  () => import('@/pages/ferramentas/GeneralDocuments')
);
const SyncClient = lazy(() => import('@/pages/ferramentas/SyncClient'));
const Downloads = lazy(() => import('@/pages/ferramentas/Downloads'));
const Settings = lazy(() => import('@/pages/admin/Settings'));
const UserManagement = lazy(() => import('@/pages/admin/UserManagement'));
const SectorManagement = lazy(() => import('@/pages/admin/SectorManagement'));
const SecuritySettings = lazy(() => import('@/pages/admin/SecuritySettings'));
const BackupSettings = lazy(() => import('@/pages/admin/BackupSettings'));
const Personalization = PersonalizationDirect;
const NumberingSettings = lazy(() => import('@/pages/admin/NumberingSettings'));
const GlobalLogoSettings = lazy(
  () => import('@/pages/admin/GlobalLogoSettings')
);
const ActivityLog = lazy(() => import('@/pages/admin/ActivityLog'));
const SystemAudit = lazy(() => import('@/pages/admin/SystemAudit'));
const Profile = lazy(() => import('@/pages/Profile'));

// Superuser Pages
const SuperuserDashboard = lazy(
  () => import('@/pages/superuser/SuperuserDashboard')
);
const MunicipalityManagement = lazy(
  () => import('@/pages/superuser/MunicipalityManagement')
);
const SuperuserUserManagement = lazy(
  () => import('@/pages/superuser/UserManagement')
);
const SystemCustomization = lazy(
  () => import('@/pages/superuser/SystemCustomization')
);
const SystemMonitoring = lazy(
  () => import('@/pages/superuser/SystemMonitoring')
);
const FormFieldManagement = lazy(
  () => import('@/pages/superuser/FormFieldManagement')
);
const ExcelCsvTemplateManagement = lazy(
  () => import('@/pages/superuser/ExcelCsvTemplateManagement')
);
const PublicSearchSettings = lazy(
  () => import('@/pages/superuser/PublicSearchSettings')
);
const Documentation = lazy(() => import('@/pages/superuser/Documentation'));
const SystemInformation = lazy(
  () => import('@/pages/superuser/SystemInformation')
);
const SuperuserFooterCustomization = lazy(
  () => import('@/pages/superuser/SuperuserFooterCustomization')
);
const VersionUpdate = lazy(() => import('@/pages/superuser/VersionUpdate'));
const AssetsByUser = lazy(() => import('@/pages/superuser/AssetsByUser'));
const PermissionManagement = lazy(
  () => import('@/pages/superuser/PermissionManagement')
);

const AppProviders = ({ children }: { children: React.ReactNode }) => (
  <TooltipProvider>
    <LoadingProvider>
      <ActivityLogProvider>
        <MunicipalityProvider>
          <AuthProvider>
            <NotificationProvider>
              <PermissionProvider>
                <VersionProvider>
                  <CustomizationProvider>
                    <GlobalLogoProvider>
                      <ThemeProvider>
                        <SectorProvider>
                          <LocalProvider>
                            <PatrimonioProvider>
                              <ImovelProvider>
                                <ImovelFieldProvider>
                                  <InventoryProvider>
                                    <ReportTemplateProvider>
                                      <ImovelReportTemplateProvider>
                                        <LabelTemplateProvider>
                                          <ExcelCsvTemplateProvider>
                                            <PublicSearchProvider>
                                              <FormFieldManagerProvider>
                                                <NumberingPatternProvider>
                                                  <ManutencaoProvider>
                                                    <SyncProvider>
                                                      <SearchProvider>
                                                        <DashboardProvider>
                                                          <DocumentProvider>
                                                            <TransferProvider>
                                                              <UserReportConfigProvider>
                                                                <DynamicHead />
                                                                {children}
                                                              </UserReportConfigProvider>
                                                            </TransferProvider>
                                                          </DocumentProvider>
                                                        </DashboardProvider>
                                                      </SearchProvider>
                                                    </SyncProvider>
                                                  </ManutencaoProvider>
                                                </NumberingPatternProvider>
                                              </FormFieldManagerProvider>
                                            </PublicSearchProvider>
                                          </ExcelCsvTemplateProvider>
                                        </LabelTemplateProvider>
                                      </ImovelReportTemplateProvider>
                                    </ReportTemplateProvider>
                                  </InventoryProvider>
                                </ImovelFieldProvider>
                              </ImovelProvider>
                            </PatrimonioProvider>
                          </LocalProvider>
                        </SectorProvider>
                      </ThemeProvider>
                    </GlobalLogoProvider>
                  </CustomizationProvider>
                </VersionProvider>
              </PermissionProvider>
            </NotificationProvider>
          </AuthProvider>
        </MunicipalityProvider>
      </ActivityLogProvider>
    </LoadingProvider>
  </TooltipProvider>
);

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundaryWrapper>
        <AppProviders>
          <PublicDataInitializer />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              {/* Public Routes */}
              <Route path='/login' element={<Login />} />
              <Route path='/esqueci-minha-senha' element={<ForgotPassword />} />
              <Route
                path='/redefinir-senha/:token'
                element={<ResetPassword />}
              />
              <Route path='/consulta-publica' element={<PublicAssets />} />
              <Route
                path='/consulta-publica/:id'
                element={<PublicConsultation />}
              />
              <Route
                path='/consulta-publica/imovel/:id'
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
                <Route path='/superuser' element={<SuperuserDashboard />} />
                <Route
                  path='/superuser/municipalities'
                  element={<MunicipalityManagement />}
                />
                <Route
                  path='/superuser/users'
                  element={<SuperuserUserManagement />}
                />
                <Route
                  path='/superuser/assets-by-user'
                  element={<AssetsByUser />}
                />
                <Route
                  path='/superuser/customization'
                  element={<SystemCustomization />}
                />
                <Route
                  path='/superuser/monitoring'
                  element={<SystemMonitoring />}
                />
                <Route
                  path='/superuser/form-fields'
                  element={<FormFieldManagement />}
                />
                <Route
                  path='/superuser/export-templates'
                  element={<ExcelCsvTemplateManagement />}
                />
                <Route
                  path='/superuser/public-search'
                  element={<PublicSearchSettings />}
                />
                <Route
                  path='/superuser/documentation'
                  element={<Documentation />}
                />
                <Route
                  path='/superuser/system-information'
                  element={<SystemInformation />}
                />
                <Route
                  path='/superuser/footer-customization'
                  element={<SuperuserFooterCustomization />}
                />
                <Route
                  path='/superuser/version-update'
                  element={<VersionUpdate />}
                />
                <Route
                  path='/superuser/permissions'
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
                <Route path='/' element={<DashboardRedirect />} />
                <Route
                  path='/dashboard/summary'
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <SummaryDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/dashboard/admin'
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/dashboard/supervisor'
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                      <SupervisorDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/dashboard/usuario'
                  element={
                    <ProtectedRoute allowedRoles={['usuario']}>
                      <UserDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/dashboard/visualizador'
                  element={
                    <ProtectedRoute allowedRoles={['visualizador']}>
                      <ViewerDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/dashboard/depreciacao'
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                      <DepreciationDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route path='/bens-cadastrados' element={<BensCadastrados />} />
                <Route
                  path='/bens-cadastrados/novo'
                  element={
                    <ProtectedRoute
                      allowedRoles={['admin', 'supervisor', 'usuario']}
                    >
                      <BensCreate />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/bens-cadastrados/editar/:id'
                  element={
                    <ProtectedRoute
                      allowedRoles={['admin', 'supervisor', 'usuario']}
                    >
                      <BensEdit />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/bens-cadastrados/ver/:id'
                  element={<BensView />}
                />
                <Route path='/bens/emprestimos' element={<Emprestimos />} />
                <Route
                  path='/bens/transferencias'
                  element={<Transferencias />}
                />

                <Route path='/inventarios' element={<InventariosList />} />
                <Route
                  path='/inventarios/novo'
                  element={
                    <ProtectedRoute
                      allowedRoles={['admin', 'supervisor', 'usuario']}
                    >
                      <InventarioCreate />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/inventarios/:id'
                  element={
                    <ProtectedRoute
                      allowedRoles={['admin', 'supervisor', 'usuario']}
                    >
                      <InventarioDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/inventarios/resumo/:id'
                  element={<InventarioSummary />}
                />

                <Route path='/locais' element={<Locais />} />

                <Route path='/imoveis' element={<ImoveisList />} />
                <Route
                  path='/imoveis/novo'
                  element={
                    <ProtectedRoute
                      allowedRoles={['admin', 'supervisor', 'usuario']}
                    >
                      <ImoveisCreate />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/imoveis/editar/:id'
                  element={
                    <ProtectedRoute
                      allowedRoles={['admin', 'supervisor', 'usuario']}
                    >
                      <ImoveisEdit />
                    </ProtectedRoute>
                  }
                />
                <Route path='/imoveis/ver/:id' element={<ImoveisView />} />
                <Route path='/imoveis/mapa' element={<ImoveisMapa />} />
                <Route
                  path='/imoveis/manutencao'
                  element={<ImoveisManutencao />}
                />
                <Route
                  path='/imoveis/campos'
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                      <ImoveisCustomFields />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/imoveis/relatorios/templates'
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                      <ImoveisReportTemplates />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/imoveis/relatorios/templates/editar/:templateId'
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                      <ImoveisReportEditor />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/imoveis/relatorios/templates/novo'
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                      <ImoveisReportEditor />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path='/analise/setor'
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                      <AnaliseSetor />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/analise/tipo'
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                      <AnaliseTipo />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/analise/temporal'
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                      <AnaliseTemporal />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/depreciacao'
                  element={
                    <ProtectedRoute
                      allowedRoles={['admin', 'supervisor', 'usuario']}
                    >
                      <Depreciacao />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/relatorios/depreciacao'
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                      <RelatoriosDepreciacao />
                    </ProtectedRoute>
                  }
                />

                <Route path='/relatorios' element={<Relatorios />} />
                <Route
                  path='/relatorios/ver/:templateId'
                  element={<ReportView />}
                />
                <Route
                  path='/relatorios/templates'
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                      <ReportTemplates />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/relatorios/templates/editor/:templateId'
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                      <ReportLayoutEditor />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/relatorios/transferencias'
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                      <TransferenciaReports />
                    </ProtectedRoute>
                  }
                />

                <Route path='/exportacao' element={<Exportacao />} />
                <Route path='/gerar-etiquetas' element={<GerarEtiquetas />} />
                <Route
                  path='/etiquetas/templates'
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                      <LabelTemplates />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/etiquetas/templates/editor/:templateId'
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                      <LabelTemplateEditor />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path='/ferramentas/documentos'
                  element={<GeneralDocuments />}
                />
                <Route
                  path='/ferramentas/sync-client'
                  element={<SyncClient />}
                />
                <Route path='/downloads' element={<Downloads />} />

                <Route
                  path='/configuracoes'
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/configuracoes/usuarios'
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                      <UserManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/configuracoes/setores'
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                      <SectorManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/configuracoes/personalizacao'
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                      <Personalization />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/configuracoes/seguranca'
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                      <SecuritySettings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/configuracoes/backup'
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                      <BackupSettings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/configuracoes/numeracao-bens'
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                      <NumberingSettings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/configuracoes/logo-global'
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                      <GlobalLogoSettings />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path='/registros-de-atividade'
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                      <ActivityLog />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/admin/auditoria'
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'supervisor']}>
                      <SystemAudit />
                    </ProtectedRoute>
                  }
                />
                <Route path='/perfil' element={<Profile />} />
                <Route path='/notificacoes' element={<NotificationsPage />} />

                <Route path='*' element={<NotFound />} />
              </Route>
            </Routes>
          </Suspense>
        </AppProviders>
      </ErrorBoundaryWrapper>
    </BrowserRouter>
  );
}

export default App;
