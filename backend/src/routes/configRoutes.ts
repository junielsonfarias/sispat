import { Router } from 'express';
import { authenticateToken, authorize } from '../middlewares/auth';
import { zodValidate } from '../middlewares/zodValidate';
import {
  uuidParamSchema,
  createUserReportConfigSchema,
  upsertExcelCsvTemplateSchema,
  createFormFieldConfigSchema,
  updateFormFieldConfigSchema,
  roleIdParamSchema,
  updateRolePermissionsSchema,
  updateCloudStorageSchema,
  upsertReportTemplateSchema,
  updateReportTemplateSchema,
  upsertImovelReportTemplateSchema,
  updateNumberingPatternSchema,
  updateUserDashboardSchema,
} from '@sispat/shared';
import {
  // User Report Configs
  getUserReportConfigs,
  createUserReportConfig,
  deleteUserReportConfig,
  // Excel CSV Templates
  getExcelCsvTemplates,
  createExcelCsvTemplate,
  updateExcelCsvTemplate,
  deleteExcelCsvTemplate,
  // Form Field Configs
  getFormFieldConfigs,
  createFormFieldConfig,
  updateFormFieldConfig,
  deleteFormFieldConfig,
  // Role Permissions
  getRolePermissions,
  updateRolePermissions,
  // Cloud Storage
  getCloudStorage,
  updateCloudStorage,
  // Report Templates
  getReportTemplates,
  createReportTemplate,
  updateReportTemplate,
  deleteReportTemplate,
  // Imovel Report Templates
  getImovelReportTemplates,
  createImovelReportTemplate,
  updateImovelReportTemplate,
  deleteImovelReportTemplate,
  // Numbering Patterns
  getNumberingPattern,
  updateNumberingPattern,
  // User Dashboards
  getUserDashboard,
  updateUserDashboard,
} from '../controllers/configController';

const router = Router();

// Todas as rotas precisam de autenticação
router.use(authenticateToken);

// ============================================
// USER REPORT CONFIGS
// ============================================
router.get('/user-report-configs', getUserReportConfigs);
router.post(
  '/user-report-configs',
  zodValidate({ body: createUserReportConfigSchema }),
  createUserReportConfig,
);
router.delete(
  '/user-report-configs/:id',
  zodValidate({ params: uuidParamSchema }),
  deleteUserReportConfig,
);

// ============================================
// EXCEL CSV TEMPLATES
// ============================================
router.get('/excel-csv-templates', getExcelCsvTemplates);
router.post(
  '/excel-csv-templates',
  authorize('admin', 'supervisor'),
  zodValidate({ body: upsertExcelCsvTemplateSchema }),
  createExcelCsvTemplate,
);
router.put(
  '/excel-csv-templates/:id',
  authorize('admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema, body: upsertExcelCsvTemplateSchema }),
  updateExcelCsvTemplate,
);
router.delete(
  '/excel-csv-templates/:id',
  authorize('admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema }),
  deleteExcelCsvTemplate,
);

// ============================================
// FORM FIELD CONFIGS
// ============================================
router.get('/form-field-configs', getFormFieldConfigs);
router.post(
  '/form-field-configs',
  authorize('admin'),
  zodValidate({ body: createFormFieldConfigSchema }),
  createFormFieldConfig,
);
router.put(
  '/form-field-configs/:id',
  authorize('admin'),
  zodValidate({ params: uuidParamSchema, body: updateFormFieldConfigSchema }),
  updateFormFieldConfig,
);
router.delete(
  '/form-field-configs/:id',
  authorize('admin'),
  zodValidate({ params: uuidParamSchema }),
  deleteFormFieldConfig,
);

// ============================================
// ROLE PERMISSIONS
// ============================================
router.get('/role-permissions', getRolePermissions);
router.put(
  '/role-permissions/:roleId',
  authorize('superuser'),
  zodValidate({ params: roleIdParamSchema, body: updateRolePermissionsSchema }),
  updateRolePermissions,
);

// ============================================
// CLOUD STORAGE
// ============================================
router.get('/cloud-storage', getCloudStorage);
router.put(
  '/cloud-storage',
  authorize('admin', 'superuser'),
  zodValidate({ body: updateCloudStorageSchema }),
  updateCloudStorage,
);

// ============================================
// REPORT TEMPLATES
// ============================================
router.get('/report-templates', getReportTemplates);
router.post(
  '/report-templates',
  authorize('admin', 'supervisor'),
  zodValidate({ body: upsertReportTemplateSchema }),
  createReportTemplate,
);
router.put(
  '/report-templates/:id',
  authorize('admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema, body: updateReportTemplateSchema }),
  updateReportTemplate,
);
router.delete(
  '/report-templates/:id',
  authorize('admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema }),
  deleteReportTemplate,
);

// ============================================
// IMOVEL REPORT TEMPLATES
// ============================================
router.get('/imovel-report-templates', getImovelReportTemplates);
router.post(
  '/imovel-report-templates',
  authorize('admin', 'supervisor'),
  zodValidate({ body: upsertImovelReportTemplateSchema }),
  createImovelReportTemplate,
);
router.put(
  '/imovel-report-templates/:id',
  authorize('admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema, body: upsertImovelReportTemplateSchema }),
  updateImovelReportTemplate,
);
router.delete(
  '/imovel-report-templates/:id',
  authorize('admin', 'supervisor'),
  zodValidate({ params: uuidParamSchema }),
  deleteImovelReportTemplate,
);

// ============================================
// NUMBERING PATTERNS
// ============================================
router.get('/numbering-pattern', getNumberingPattern);
router.put(
  '/numbering-pattern',
  authorize('admin', 'superuser'),
  zodValidate({ body: updateNumberingPatternSchema }),
  updateNumberingPattern,
);

// ============================================
// USER DASHBOARDS
// ============================================
router.get('/user-dashboard', getUserDashboard);
router.put(
  '/user-dashboard',
  zodValidate({ body: updateUserDashboardSchema }),
  updateUserDashboard,
);

export default router;

