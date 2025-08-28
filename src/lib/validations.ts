import { z } from 'zod';

// Schema para Patrimônio
export const PatrimonioSchema = z.object({
  id: z.string().uuid().optional(),
  numero_patrimonio: z.string().min(1, 'Número do patrimônio é obrigatório'),
  descricao: z.string().min(3, 'Descrição deve ter pelo menos 3 caracteres'),
  tipo: z.string().optional(),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  numero_serie: z.string().optional(),
  estado: z.string().optional(),
  data_aquisicao: z
    .date()
    .max(new Date(), 'Data não pode ser futura')
    .optional(),
  valor_aquisicao: z.number().positive('Valor deve ser positivo').optional(),
  fornecedor: z.string().optional(),
  nota_fiscal: z.string().optional(),
  local_id: z.string().uuid().optional(),
  sector_id: z.string().uuid().optional(),
  municipality_id: z.string().uuid(),
  cor: z.string().optional(),
  quantidade: z
    .number()
    .int()
    .positive('Quantidade deve ser um número positivo')
    .default(1),
  fotos: z.array(z.string()).optional(),
  documentos: z.array(z.string()).optional(),
  metodo_depreciacao: z.string().optional(),
  vida_util_anos: z
    .number()
    .int()
    .positive('Vida útil deve ser um número positivo')
    .optional(),
  valor_residual: z
    .number()
    .positive('Valor residual deve ser positivo')
    .optional(),
  status: z
    .enum(['ativo', 'manutencao', 'inativo', 'baixado'])
    .default('ativo'),
});

// Schema para Usuário
export const UserSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email deve ser válido'),
  role: z.enum(['superuser', 'admin', 'supervisor', 'usuario', 'visualizador']),
  municipality_id: z.string().uuid().optional(),
  password: z
    .string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .optional(),
  avatarUrl: z.string().url().optional(),
});

// Schema para Login
export const LoginSchema = z.object({
  email: z.string().email('Email deve ser válido'),
  password: z.string().min(1, 'Senha é obrigatória'),
  municipalityId: z.string().uuid().optional(),
  isSuperuser: z.boolean().default(false),
  rememberMe: z.boolean().default(false),
});

// Schema para Município
export const MunicipalitySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  state: z.string().length(2, 'Estado deve ter 2 caracteres'),
  cnpj: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email deve ser válido').optional(),
});

// Schema para Setor
export const SectorSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  municipality_id: z.string().uuid(),
});

// Schema para Local
export const LocalSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  address: z.string().optional(),
  municipality_id: z.string().uuid(),
});

// Schema para Imóvel
export const ImovelSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  endereco: z.string().min(5, 'Endereço deve ter pelo menos 5 caracteres'),
  tipo: z.string().optional(),
  area: z.number().positive('Área deve ser positiva').optional(),
  valor: z.number().positive('Valor deve ser positivo').optional(),
  status: z.enum(['ativo', 'inativo', 'manutencao']).default('ativo'),
  municipality_id: z.string().uuid(),
});

// Schema para Paginação
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  filters: z.record(z.any()).optional(),
});

// Schema para Upload de Arquivo
export const FileUploadSchema = z.object({
  file: z.instanceof(File),
  maxSize: z.number().default(5 * 1024 * 1024), // 5MB
  allowedTypes: z
    .array(z.string())
    .default(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
});

// Schema para Notificação
export const NotificationSchema = z.object({
  id: z.string().optional(),
  type: z
    .enum(['info', 'success', 'warning', 'error', 'alert'])
    .default('info'),
  title: z.string().min(1, 'Título é obrigatório'),
  message: z.string().min(1, 'Mensagem é obrigatória'),
  userId: z.string().uuid().optional(),
  timestamp: z.date().optional(),
  isRead: z.boolean().default(false),
  data: z.any().optional(),
});

// Schema para Relatório
export const ReportSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  type: z.enum(['excel', 'pdf', 'csv']),
  filters: z.record(z.any()).optional(),
  municipality_id: z.string().uuid(),
  created_by: z.string().uuid().optional(),
});

// Schema para Backup
export const BackupSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  type: z.enum(['manual', 'automatic']),
  status: z
    .enum(['pending', 'running', 'completed', 'failed'])
    .default('pending'),
  size: z.number().optional(),
  created_at: z.date().optional(),
  completed_at: z.date().optional(),
});

// Função para validar dados com tratamento de erro
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(
        err => `${err.path.join('.')}: ${err.message}`
      );
      return { success: false, errors };
    }
    return { success: false, errors: ['Erro de validação desconhecido'] };
  }
}

// Função para validar dados de forma segura (retorna dados parciais)
export function safeValidate<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): Partial<T> {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Retorna apenas os campos válidos
      const partialData: Partial<T> = {};
      for (const field of Object.keys(data as object)) {
        try {
          const fieldSchema = schema.shape[field as keyof T];
          if (fieldSchema) {
            const fieldValue = (data as any)[field];
            partialData[field as keyof T] = fieldSchema.parse(fieldValue);
          }
        } catch {
          // Ignora campos inválidos
        }
      }
      return partialData;
    }
    return {};
  }
}

// Função para validar arquivo de imagem
export function validateImageFile(
  file: File,
  maxSizeMB = 5
): { valid: boolean; error?: string } {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `Arquivo muito grande. Máximo permitido: ${maxSizeMB}MB`,
    };
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Tipo de arquivo não permitido. Use JPEG, PNG, WebP ou GIF',
    };
  }

  return { valid: true };
}

// Função para validar base64 de imagem
export function validateBase64Image(
  base64String: string,
  maxSizeMB = 5
): { valid: boolean; error?: string } {
  try {
    // Verificar se é uma string base64 válida
    if (!base64String.startsWith('data:image/')) {
      return { valid: false, error: 'String não é uma imagem base64 válida' };
    }

    // Extrair dados base64
    const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '');

    // Calcular tamanho em bytes
    const sizeInBytes = Math.ceil((base64Data.length * 3) / 4);
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    if (sizeInBytes > maxSizeBytes) {
      return {
        valid: false,
        error: `Imagem muito grande. Máximo permitido: ${maxSizeMB}MB`,
      };
    }

    // Verificar tipo MIME
    const mimeType = base64String.match(/data:([^;]+);/)?.[1];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (!mimeType || !allowedTypes.includes(mimeType)) {
      return {
        valid: false,
        error: 'Tipo de imagem não permitido. Use JPEG, PNG, WebP ou GIF',
      };
    }

    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Erro ao validar imagem base64' };
  }
}

// Exportar todos os schemas
export const schemas = {
  Patrimonio: PatrimonioSchema,
  User: UserSchema,
  Login: LoginSchema,
  Municipality: MunicipalitySchema,
  Sector: SectorSchema,
  Local: LocalSchema,
  Imovel: ImovelSchema,
  Pagination: PaginationSchema,
  FileUpload: FileUploadSchema,
  Notification: NotificationSchema,
  Report: ReportSchema,
  Backup: BackupSchema,
};

// Tipos derivados dos schemas
export type Patrimonio = z.infer<typeof PatrimonioSchema>;
export type User = z.infer<typeof UserSchema>;
export type Login = z.infer<typeof LoginSchema>;
export type Municipality = z.infer<typeof MunicipalitySchema>;
export type Sector = z.infer<typeof SectorSchema>;
export type Local = z.infer<typeof LocalSchema>;
export type Imovel = z.infer<typeof ImovelSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type FileUpload = z.infer<typeof FileUploadSchema>;
export type Notification = z.infer<typeof NotificationSchema>;
export type Report = z.infer<typeof ReportSchema>;
export type Backup = z.infer<typeof BackupSchema>;
