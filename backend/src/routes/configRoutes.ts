import { Router } from 'express';
import { authenticateToken, authorize } from '../middlewares/auth';
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
router.post('/user-report-configs', createUserReportConfig);
router.delete('/user-report-configs/:id', deleteUserReportConfig);

// ============================================
// EXCEL CSV TEMPLATES
// ============================================
router.get('/excel-csv-templates', getExcelCsvTemplates);
router.post('/excel-csv-templates', authorize('admin', 'supervisor'), createExcelCsvTemplate);
router.put('/excel-csv-templates/:id', authorize('admin', 'supervisor'), updateExcelCsvTemplate);
router.delete('/excel-csv-templates/:id', authorize('admin', 'supervisor'), deleteExcelCsvTemplate);

// ============================================
// FORM FIELD CONFIGS
// ============================================
router.get('/form-field-configs', getFormFieldConfigs);
router.post('/form-field-configs', authorize('admin'), createFormFieldConfig);
router.put('/form-field-configs/:id', authorize('admin'), updateFormFieldConfig);
router.delete('/form-field-configs/:id', authorize('admin'), deleteFormFieldConfig);

// ============================================
// ROLE PERMISSIONS
// ============================================
router.get('/role-permissions', getRolePermissions);
router.put('/role-permissions/:roleId', authorize('superuser'), updateRolePermissions);

// ============================================
// CLOUD STORAGE
// ============================================
router.get('/cloud-storage', getCloudStorage);
router.put('/cloud-storage', authorize('admin', 'superuser'), updateCloudStorage);

// ============================================
// REPORT TEMPLATES
// ============================================
router.get('/report-templates', getReportTemplates);
router.post('/report-templates', authorize('admin', 'supervisor'), createReportTemplate);
router.put('/report-templates/:id', authorize('admin', 'supervisor'), updateReportTemplate);
router.delete('/report-templates/:id', authorize('admin', 'supervisor'), deleteReportTemplate);

// ============================================
// IMOVEL REPORT TEMPLATES
// ============================================
router.get('/imovel-report-templates', getImovelReportTemplates);
router.post('/imovel-report-templates', authorize('admin', 'supervisor'), createImovelReportTemplate);
router.put('/imovel-report-templates/:id', authorize('admin', 'supervisor'), updateImovelReportTemplate);
router.delete('/imovel-report-templates/:id', authorize('admin', 'supervisor'), deleteImovelReportTemplate);

// ============================================
// NUMBERING PATTERNS
// ============================================
router.get('/numbering-pattern', getNumberingPattern);
router.put('/numbering-pattern', authorize('admin', 'superuser'), updateNumberingPattern);

// ============================================
// USER DASHBOARDS
// ============================================
router.get('/user-dashboard', getUserDashboard);
router.put('/user-dashboard', updateUserDashboard);

export default router;

