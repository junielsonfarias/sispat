import { 
  User, 
  Municipality, 
  Patrimonio, 
  Imovel, 
  Sector, 
  Local, 
  ActivityLog,
  Transferencia,
  Emprestimo,
  SubPatrimonio,
  Inventory,
  ManutencaoTask,
  Notification,
  SystemConfiguration,
  GeneralDocument,
  CustomizationSettings,
  Theme,
  ReportTemplate,
  LabelTemplate,
  ExcelCsvTemplate,
  NumberingPattern,
  FormFieldConfig,
  ImovelFieldConfig,
  ConditionalFormattingRule,
  UserReportConfig,
  Version,
  RollbackHistoryEntry,
  StorageHistoryPoint,
  AcquisitionForm,
  TipoBem
} from '@/types'

import {
  mockUsers,
  mockMunicipality,
  mockPatrimonios,
  mockImoveis,
  mockSectors,
  mockLocals,
  mockActivityLogs,
  mockTransferencias,
  mockEmprestimos,
  mockSubPatrimonios,
  mockInventarios,
  mockManutencaoTasks,
  mockNotifications,
  mockSystemConfiguration,
  mockGeneralDocuments,
  mockCustomizationSettings,
  mockThemes,
  mockReportTemplates,
  mockLabelTemplates,
  mockExcelCsvTemplates,
  mockNumberingPatterns,
  mockFormFields,
  mockImovelFields,
  mockConditionalFormattingRules,
  mockUserReportConfigs,
  mockVersions,
  mockRollbackHistory,
  mockStorageHistory,
  mockDashboardStats,
  mockAcquisitionForms,
  mockTiposBens,
  mockAuthData,
  mockPublicPatrimonio
} from '@/data/mock-data'

// Simular delay de rede
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Simular erro ocasional
const shouldSimulateError = () => false // Desabilitado para desenvolvimento

class MockApi {
  // Autenticação
  async login(email: string, password: string) {
    await delay(1000)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const user = mockUsers.find(u => u.email === email)
    if (!user || password !== '123456') {
      throw new Error('Credenciais inválidas')
    }
    
    return {
      user,
      token: mockAuthData.token,
      refreshToken: mockAuthData.refreshToken,
      expiresIn: mockAuthData.expiresIn
    }
  }

  async refreshToken(refreshToken: string) {
    await delay(500)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return {
      token: mockAuthData.token,
      refreshToken: mockAuthData.refreshToken,
      expiresIn: mockAuthData.expiresIn
    }
  }

  async getMe() {
    await delay(300)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return mockAuthData.user
  }

  // Município
  async getMunicipality() {
    await delay(300)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return mockMunicipality
  }

  async updateMunicipality(data: Partial<Municipality>) {
    await delay(500)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return { ...mockMunicipality, ...data }
  }

  // Usuários
  async getUsers() {
    await delay(300)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return mockUsers
  }

  async getUserById(id: string) {
    await delay(200)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const user = mockUsers.find(u => u.id === id)
    if (!user) {
      throw new Error('Usuário não encontrado')
    }
    
    return user
  }

  async createUser(userData: Omit<User, 'id'>) {
    await delay(800)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const newUser: User = {
      ...userData,
      id: `user-${Date.now()}`
    }
    
    mockUsers.push(newUser)
    return newUser
  }

  async updateUser(id: string, userData: Partial<User>) {
    await delay(600)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const userIndex = mockUsers.findIndex(u => u.id === id)
    if (userIndex === -1) {
      throw new Error('Usuário não encontrado')
    }
    
    mockUsers[userIndex] = { ...mockUsers[userIndex], ...userData }
    return mockUsers[userIndex]
  }

  async deleteUser(id: string) {
    await delay(500)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const userIndex = mockUsers.findIndex(u => u.id === id)
    if (userIndex === -1) {
      throw new Error('Usuário não encontrado')
    }
    
    mockUsers.splice(userIndex, 1)
    return { success: true }
  }

  // Patrimônios
  async getPatrimonios() {
    await delay(400)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return mockPatrimonios
  }

  async getPatrimonioById(id: string) {
    await delay(200)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const patrimonio = mockPatrimonios.find(p => p.id === id)
    if (!patrimonio) {
      throw new Error('Patrimônio não encontrado')
    }
    
    return patrimonio
  }

  async createPatrimonio(patrimonioData: Omit<Patrimonio, 'id'>) {
    await delay(1000)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const newPatrimonio: Patrimonio = {
      ...patrimonioData,
      id: `patrimonio-${Date.now()}`,
      createdAt: new Date(),
      createdBy: 'system', // Será substituído pelo usuário logado
      updatedAt: new Date(),
      updatedBy: 'system'
    }
    
    mockPatrimonios.push(newPatrimonio)
    return newPatrimonio
  }

  async updatePatrimonio(id: string, patrimonioData: Partial<Patrimonio>) {
    await delay(800)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const patrimonioIndex = mockPatrimonios.findIndex(p => p.id === id)
    if (patrimonioIndex === -1) {
      throw new Error('Patrimônio não encontrado')
    }
    
    mockPatrimonios[patrimonioIndex] = { ...mockPatrimonios[patrimonioIndex], ...patrimonioData }
    return mockPatrimonios[patrimonioIndex]
  }

  async deletePatrimonio(id: string) {
    await delay(600)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const patrimonioIndex = mockPatrimonios.findIndex(p => p.id === id)
    if (patrimonioIndex === -1) {
      throw new Error('Patrimônio não encontrado')
    }
    
    mockPatrimonios.splice(patrimonioIndex, 1)
    return { success: true }
  }

  // Imóveis
  async getImoveis() {
    await delay(400)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return mockImoveis
  }

  async getImovelById(id: string) {
    await delay(200)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const imovel = mockImoveis.find(i => i.id === id)
    if (!imovel) {
      throw new Error('Imóvel não encontrado')
    }
    
    return imovel
  }

  async createImovel(imovelData: Omit<Imovel, 'id'>) {
    await delay(1000)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const newImovel: Imovel = {
      ...imovelData,
      id: `imovel-${Date.now()}`
    }
    
    mockImoveis.push(newImovel)
    return newImovel
  }

  async updateImovel(id: string, imovelData: Partial<Imovel>) {
    await delay(800)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const imovelIndex = mockImoveis.findIndex(i => i.id === id)
    if (imovelIndex === -1) {
      throw new Error('Imóvel não encontrado')
    }
    
    mockImoveis[imovelIndex] = { ...mockImoveis[imovelIndex], ...imovelData }
    return mockImoveis[imovelIndex]
  }

  async deleteImovel(id: string) {
    await delay(600)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const imovelIndex = mockImoveis.findIndex(i => i.id === id)
    if (imovelIndex === -1) {
      throw new Error('Imóvel não encontrado')
    }
    
    mockImoveis.splice(imovelIndex, 1)
    return { success: true }
  }

  // Setores
  async getSectors() {
    await delay(300)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return mockSectors
  }

  async getSectorById(id: string) {
    await delay(200)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const sector = mockSectors.find(s => s.id === id)
    if (!sector) {
      throw new Error('Setor não encontrado')
    }
    
    return sector
  }

  async createSector(sectorData: Omit<Sector, 'id'>) {
    await delay(800)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const newSector: Sector = {
      ...sectorData,
      id: `sector-${Date.now()}`
    }
    
    mockSectors.push(newSector)
    return newSector
  }

  async updateSector(id: string, sectorData: Partial<Sector>) {
    await delay(600)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const sectorIndex = mockSectors.findIndex(s => s.id === id)
    if (sectorIndex === -1) {
      throw new Error('Setor não encontrado')
    }
    
    mockSectors[sectorIndex] = { ...mockSectors[sectorIndex], ...sectorData }
    return mockSectors[sectorIndex]
  }

  async deleteSector(id: string) {
    await delay(500)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const sectorIndex = mockSectors.findIndex(s => s.id === id)
    if (sectorIndex === -1) {
      throw new Error('Setor não encontrado')
    }
    
    mockSectors.splice(sectorIndex, 1)
    return { success: true }
  }

  // Locais
  async getLocals() {
    await delay(300)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return mockLocals
  }

  async getLocalById(id: string) {
    await delay(200)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const local = mockLocals.find(l => l.id === id)
    if (!local) {
      throw new Error('Local não encontrado')
    }
    
    return local
  }

  async createLocal(localData: Omit<Local, 'id'>) {
    await delay(600)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const newLocal: Local = {
      ...localData,
      id: `local-${Date.now()}`
    }
    
    mockLocals.push(newLocal)
    return newLocal
  }

  async updateLocal(id: string, localData: Partial<Local>) {
    await delay(500)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const localIndex = mockLocals.findIndex(l => l.id === id)
    if (localIndex === -1) {
      throw new Error('Local não encontrado')
    }
    
    mockLocals[localIndex] = { ...mockLocals[localIndex], ...localData }
    return mockLocals[localIndex]
  }

  async deleteLocal(id: string) {
    await delay(400)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const localIndex = mockLocals.findIndex(l => l.id === id)
    if (localIndex === -1) {
      throw new Error('Local não encontrado')
    }
    
    mockLocals.splice(localIndex, 1)
    return { success: true }
  }

  // Dashboard
  async getDashboardStats() {
    await delay(500)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return mockDashboardStats
  }

  // Atividades
  async getActivityLogs() {
    await delay(400)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return mockActivityLogs
  }

  // Transferências
  async getTransferencias() {
    await delay(400)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return mockTransferencias
  }

  async createTransferencia(transferenciaData: Omit<Transferencia, 'id'>) {
    await delay(800)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const newTransferencia: Transferencia = {
      ...transferenciaData,
      id: `transfer-${Date.now()}`
    }
    
    mockTransferencias.push(newTransferencia)
    return newTransferencia
  }

  async updateTransferencia(id: string, transferenciaData: Partial<Transferencia>) {
    await delay(600)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const transferenciaIndex = mockTransferencias.findIndex(t => t.id === id)
    if (transferenciaIndex === -1) {
      throw new Error('Transferência não encontrada')
    }
    
    mockTransferencias[transferenciaIndex] = { ...mockTransferencias[transferenciaIndex], ...transferenciaData }
    return mockTransferencias[transferenciaIndex]
  }

  // Empréstimos
  async getEmprestimos() {
    await delay(400)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return mockEmprestimos
  }

  async createEmprestimo(emprestimoData: Omit<Emprestimo, 'id'>) {
    await delay(800)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const newEmprestimo: Emprestimo = {
      ...emprestimoData,
      id: `emprestimo-${Date.now()}`
    }
    
    mockEmprestimos.push(newEmprestimo)
    return newEmprestimo
  }

  // Sub-patrimônios
  async getSubPatrimonios() {
    await delay(400)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return mockSubPatrimonios
  }

  async createSubPatrimonio(subPatrimonioData: Omit<SubPatrimonio, 'id'>) {
    await delay(600)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const newSubPatrimonio: SubPatrimonio = {
      ...subPatrimonioData,
      id: `sub-${Date.now()}`
    }
    
    mockSubPatrimonios.push(newSubPatrimonio)
    return newSubPatrimonio
  }

  // Inventários
  async getInventarios() {
    await delay(400)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return mockInventarios
  }

  async createInventario(inventarioData: Omit<Inventory, 'id'>) {
    await delay(1000)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const newInventario: Inventory = {
      ...inventarioData,
      id: `inventory-${Date.now()}`
    }
    
    mockInventarios.push(newInventario)
    return newInventario
  }

  async updateInventario(id: string, inventarioData: Partial<Inventory>) {
    await delay(1000)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const index = mockInventarios.findIndex(inv => inv.id === id)
    if (index === -1) {
      throw new Error('Inventário não encontrado')
    }
    
    mockInventarios[index] = { ...mockInventarios[index], ...inventarioData }
    return mockInventarios[index]
  }

  async deleteInventario(id: string) {
    await delay(1000)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const index = mockInventarios.findIndex(inv => inv.id === id)
    if (index === -1) {
      throw new Error('Inventário não encontrado')
    }
    
    mockInventarios.splice(index, 1)
    return true
  }

  // Tarefas de manutenção
  async getManutencaoTasks() {
    await delay(400)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return mockManutencaoTasks
  }

  async createManutencaoTask(taskData: Omit<ManutencaoTask, 'id'>) {
    await delay(800)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const newTask: ManutencaoTask = {
      ...taskData,
      id: `task-${Date.now()}`
    }
    
    mockManutencaoTasks.push(newTask)
    return newTask
  }

  // Notificações
  async getNotifications() {
    await delay(300)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return mockNotifications
  }

  async markNotificationAsRead(id: string) {
    await delay(200)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const notification = mockNotifications.find(n => n.id === id)
    if (notification) {
      notification.isRead = true
    }
    
    return { success: true }
  }

  // Configurações do sistema
  async getSystemConfiguration() {
    await delay(300)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return mockSystemConfiguration
  }

  async updateSystemConfiguration(data: Partial<SystemConfiguration>) {
    await delay(600)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return { ...mockSystemConfiguration, ...data }
  }

  // Documentos gerais
  async getGeneralDocuments() {
    await delay(400)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return mockGeneralDocuments
  }

  async uploadGeneralDocument(file: File) {
    await delay(2000)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const newDocument: GeneralDocument = {
      id: `doc-${Date.now()}`,
      fileName: file.name,
      fileUrl: `/docs/${file.name}`,
      fileSize: file.size,
      fileType: file.type,
      uploadedAt: new Date(),
      uploadedBy: {
        id: mockAuthData.user.id,
        name: mockAuthData.user.name
      },
      municipalityId: 'municipality-1'
    }
    
    mockGeneralDocuments.push(newDocument)
    return newDocument
  }

  // Configurações de personalização
  async getCustomizationSettings() {
    await delay(300)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return mockCustomizationSettings
  }

  async updateCustomizationSettings(data: Partial<CustomizationSettings>) {
    await delay(800)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return { ...mockCustomizationSettings, ...data }
  }

  // Temas
  async getThemes() {
    await delay(300)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return mockThemes
  }

  // Templates de relatório
  async getReportTemplates() {
    await delay(400)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return mockReportTemplates
  }

  // Templates de etiqueta
  async getLabelTemplates() {
    await delay(400)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return mockLabelTemplates
  }

  // Templates Excel/CSV
  async getExcelCsvTemplates() {
    await delay(400)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return mockExcelCsvTemplates
  }

  // Padrões de numeração
  async getNumberingPatterns() {
    await delay(300)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return mockNumberingPatterns
  }

  // Campos de formulário
  async getFormFields() {
    await delay(300)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return mockFormFields
  }

  // Campos de imóvel
  async getImovelFields() {
    await delay(300)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return mockImovelFields
  }

  // Regras de formatação condicional
  async getConditionalFormattingRules() {
    await delay(300)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return mockConditionalFormattingRules
  }

  // Configurações de relatório do usuário
  async getUserReportConfigs() {
    await delay(300)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return mockUserReportConfigs
  }

  // Versões
  async getVersions() {
    await delay(300)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return mockVersions
  }

  // Histórico de rollback
  async getRollbackHistory() {
    await delay(300)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return mockRollbackHistory
  }

  // Histórico de armazenamento
  async getStorageHistory() {
    await delay(300)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return mockStorageHistory
  }

  // Consulta pública
  async getPublicPatrimonioById(id: string) {
    await delay(500)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    if (id === 'patrimonio-1') {
      return mockPublicPatrimonio
    }
    
    throw new Error('Patrimônio não encontrado')
  }

  // Upload de arquivos
  async uploadFile(endpoint: string, file: File) {
    await delay(2000)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return {
      url: `/uploads/${file.name}`,
      filename: file.name,
      size: file.size,
      type: file.type
    }
  }

  // Métodos para Formas de Aquisição
  async getAcquisitionForms(municipalityId: string) {
    await delay(400)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return mockAcquisitionForms.filter(form => form.municipalityId === municipalityId)
  }

  async createAcquisitionForm(municipalityId: string, formData: Omit<AcquisitionForm, 'id' | 'createdAt' | 'updatedAt' | 'municipalityId'>) {
    await delay(500)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const newForm: AcquisitionForm = {
      id: `acquisition-form-${Date.now()}`,
      ...formData,
      municipalityId,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    // Simular adição ao array (em um sistema real seria salvo no banco)
    mockAcquisitionForms.push(newForm)
    
    return newForm
  }

  async updateAcquisitionForm(municipalityId: string, id: string, formData: Partial<Omit<AcquisitionForm, 'id' | 'createdAt' | 'updatedAt' | 'municipalityId'>>) {
    await delay(500)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const formIndex = mockAcquisitionForms.findIndex(form => form.id === id && form.municipalityId === municipalityId)
    
    if (formIndex === -1) {
      throw new Error('Forma de aquisição não encontrada')
    }
    
    const updatedForm: AcquisitionForm = {
      ...mockAcquisitionForms[formIndex],
      ...formData,
      updatedAt: new Date()
    }
    
    mockAcquisitionForms[formIndex] = updatedForm
    
    return updatedForm
  }

  async deleteAcquisitionForm(municipalityId: string, id: string) {
    await delay(400)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const formIndex = mockAcquisitionForms.findIndex(form => form.id === id && form.municipalityId === municipalityId)
    
    if (formIndex === -1) {
      throw new Error('Forma de aquisição não encontrada')
    }
    
    mockAcquisitionForms.splice(formIndex, 1)
    
    return { success: true }
  }

  async toggleAcquisitionFormStatus(municipalityId: string, id: string) {
    await delay(400)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const formIndex = mockAcquisitionForms.findIndex(form => form.id === id && form.municipalityId === municipalityId)
    
    if (formIndex === -1) {
      throw new Error('Forma de aquisição não encontrada')
    }
    
    const updatedForm: AcquisitionForm = {
      ...mockAcquisitionForms[formIndex],
      ativo: !mockAcquisitionForms[formIndex].ativo,
      updatedAt: new Date()
    }
    
    mockAcquisitionForms[formIndex] = updatedForm
    
    return updatedForm
  }

  // Métodos para Tipos de Bens
  async getTiposBens(municipalityId: string) {
    await delay(400)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    return mockTiposBens.filter(tipo => tipo.municipalityId === municipalityId)
  }

  async createTipoBem(municipalityId: string, tipoData: Omit<TipoBem, 'id' | 'createdAt' | 'updatedAt' | 'municipalityId'>) {
    await delay(500)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const newTipo: TipoBem = {
      id: `tipo-bem-${Date.now()}`,
      ...tipoData,
      municipalityId,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    // Simular adição ao array (em um sistema real seria salvo no banco)
    mockTiposBens.push(newTipo)
    
    return newTipo
  }

  async updateTipoBem(municipalityId: string, id: string, tipoData: Partial<Omit<TipoBem, 'id' | 'createdAt' | 'updatedAt' | 'municipalityId'>>) {
    await delay(500)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const tipoIndex = mockTiposBens.findIndex(tipo => tipo.id === id && tipo.municipalityId === municipalityId)
    
    if (tipoIndex === -1) {
      throw new Error('Tipo de bem não encontrado')
    }
    
    const updatedTipo: TipoBem = {
      ...mockTiposBens[tipoIndex],
      ...tipoData,
      updatedAt: new Date()
    }
    
    mockTiposBens[tipoIndex] = updatedTipo
    
    return updatedTipo
  }

  async deleteTipoBem(municipalityId: string, id: string) {
    await delay(400)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const tipoIndex = mockTiposBens.findIndex(tipo => tipo.id === id && tipo.municipalityId === municipalityId)
    
    if (tipoIndex === -1) {
      throw new Error('Tipo de bem não encontrado')
    }
    
    mockTiposBens.splice(tipoIndex, 1)
    
    return { success: true }
  }

  async toggleTipoBemStatus(municipalityId: string, id: string) {
    await delay(400)
    
    if (shouldSimulateError()) {
      throw new Error('Erro de conexão')
    }
    
    const tipoIndex = mockTiposBens.findIndex(tipo => tipo.id === id && tipo.municipalityId === municipalityId)
    
    if (tipoIndex === -1) {
      throw new Error('Tipo de bem não encontrado')
    }
    
    const updatedTipo: TipoBem = {
      ...mockTiposBens[tipoIndex],
      ativo: !mockTiposBens[tipoIndex].ativo,
      updatedAt: new Date()
    }
    
    mockTiposBens[tipoIndex] = updatedTipo
    
    return updatedTipo
  }
}

export const mockApi = new MockApi()
