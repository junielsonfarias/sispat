import { ReactNode } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ActivityLogProvider } from '@/contexts/ActivityLogContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { PermissionProvider } from '@/contexts/PermissionContext'
import { VersionProvider } from '@/contexts/VersionContext'
import { CustomizationProvider } from '@/contexts/CustomizationContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { SectorProvider } from '@/contexts/SectorContext'
import { LocalProvider } from '@/contexts/LocalContext'
import { PatrimonioProvider } from '@/contexts/PatrimonioContext'
import { ImovelProvider } from '@/hooks/useImovel'
import { ImovelFieldProvider } from '@/contexts/ImovelFieldContext'
import { InventoryProvider } from '@/contexts/InventoryContext'
import { ReportTemplateProvider } from '@/contexts/ReportTemplateContext'
import { ImovelReportTemplateProvider } from '@/contexts/ImovelReportTemplateContext'
import { LabelTemplateProvider } from '@/contexts/LabelTemplateContext'
import { ExcelCsvTemplateProvider } from '@/contexts/ExcelCsvTemplateContext'
import { PublicSearchProvider } from '@/contexts/PublicSearchContext'
import { FormFieldManagerProvider } from '@/contexts/FormFieldManagerContext'
import { NumberingPatternProvider } from '@/contexts/NumberingPatternContext'
import { ManutencaoProvider } from '@/contexts/ManutencaoContext'
import { SyncProvider } from '@/contexts/SyncContext'
import { SearchProvider } from '@/contexts/SearchContext'
import { DashboardProvider } from '@/contexts/DashboardContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import { DocumentProvider } from '@/contexts/DocumentContext'
import { TransferProvider } from '@/contexts/TransferContext'
import { UserReportConfigProvider } from '@/contexts/UserReportConfigContext'
import { TiposBensProvider } from '@/contexts/TiposBensContext'
import { AcquisitionFormProvider } from '@/contexts/AcquisitionFormContext'
import { ReactQueryProviders } from '@/components/ReactQueryProviders'

// ✅ MELHORIA: Agrupamento de providers otimizado com React Query
const CoreProviders = ({ children }: { children: ReactNode }) => (
  <TooltipProvider>
    <AuthProvider>
      <PermissionProvider>
        <VersionProvider>
          <CustomizationProvider>
            <ActivityLogProvider>
              <ThemeProvider>
                {children}
              </ThemeProvider>
            </ActivityLogProvider>
          </CustomizationProvider>
        </VersionProvider>
      </PermissionProvider>
    </AuthProvider>
  </TooltipProvider>
)

// ✅ MELHORIA: DataProviders com React Query (mantém providers necessários temporariamente)
const DataProviders = ({ children }: { children: ReactNode }) => (
  <ReactQueryProviders>
    <SectorProvider>
      <LocalProvider>
        <AcquisitionFormProvider>
          <TiposBensProvider>
            <PatrimonioProvider>
              <ImovelProvider>
                <ImovelFieldProvider>
                  <InventoryProvider>
                    {children}
                  </InventoryProvider>
                </ImovelFieldProvider>
              </ImovelProvider>
            </PatrimonioProvider>
          </TiposBensProvider>
        </AcquisitionFormProvider>
      </LocalProvider>
    </SectorProvider>
  </ReactQueryProviders>
)

const TemplateProviders = ({ children }: { children: ReactNode }) => (
  <ReportTemplateProvider>
    <ImovelReportTemplateProvider>
      <LabelTemplateProvider>
        <ExcelCsvTemplateProvider>
          {children}
        </ExcelCsvTemplateProvider>
      </LabelTemplateProvider>
    </ImovelReportTemplateProvider>
  </ReportTemplateProvider>
)

const FeatureProviders = ({ children }: { children: ReactNode }) => (
  <PublicSearchProvider>
    <FormFieldManagerProvider>
      <NumberingPatternProvider>
        <ManutencaoProvider>
          <SearchProvider>
            <DashboardProvider>
              <NotificationProvider>
                <DocumentProvider>
                  <TransferProvider>
                    <UserReportConfigProvider>
                      <SyncProvider>
                        {children}
                      </SyncProvider>
                    </UserReportConfigProvider>
                  </TransferProvider>
                </DocumentProvider>
              </NotificationProvider>
            </DashboardProvider>
          </SearchProvider>
        </ManutencaoProvider>
      </NumberingPatternProvider>
    </FormFieldManagerProvider>
  </PublicSearchProvider>
)

export const AppProviders = ({ children }: { children: ReactNode }) => (
  <CoreProviders>
    <DataProviders>
      <TemplateProviders>
        <FeatureProviders>
          {children}
        </FeatureProviders>
      </TemplateProviders>
    </DataProviders>
  </CoreProviders>
)
