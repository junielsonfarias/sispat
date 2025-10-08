# 🚀 GUIA COMPLETO DE IMPLEMENTAÇÃO - PARTE 2

## CONTINUAÇÃO: CONTROLLERS E ROTAS COMPLETOS

---

## 5.5 Controller de Patrimônios

Criar `backend/src/controllers/patrimonioController.ts`:
```typescript
import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { AuthRequest } from '../middlewares/auth'

const prisma = new PrismaClient()

export const getPatrimonios = async (req: AuthRequest, res: Response) => {
  try {
    const { role, municipalityId, responsibleSectors } = req.user!
    
    let where: any = { municipalityId }

    // Filtrar por setores se não for admin/supervisor
    if (role === 'usuario' || role === 'visualizador') {
      where.setor_responsavel = { in: responsibleSectors || [] }
    }

    const patrimonios = await prisma.patrimonio.findMany({
      where,
      include: {
        sector: true,
        local: true,
        tipoBem: true,
        acquisitionForm: true,
        historico: {
          orderBy: { date: 'desc' },
          take: 5,
        },
        notes: {
          orderBy: { date: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json(patrimonios)
  } catch (error) {
    console.error('Erro ao buscar patrimônios:', error)
    res.status(500).json({ error: 'Erro ao buscar patrimônios' })
  }
}

export const getPatrimonioById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const patrimonio = await prisma.patrimonio.findUnique({
      where: { id },
      include: {
        sector: true,
        local: true,
        tipoBem: true,
        acquisitionForm: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        historico: {
          orderBy: { date: 'desc' },
        },
        notes: {
          orderBy: { date: 'desc' },
        },
        subPatrimonios: true,
        transferenciasOrigem: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        emprestimos: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        manutencoes: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!patrimonio) {
      return res.status(404).json({ error: 'Patrimônio não encontrado' })
    }

    res.json(patrimonio)
  } catch (error) {
    console.error('Erro ao buscar patrimônio:', error)
    res.status(500).json({ error: 'Erro ao buscar patrimônio' })
  }
}

export const createPatrimonio = async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body
    const userId = req.user!.id

    // Validações básicas
    if (!data.numero_patrimonio || !data.descricao_bem) {
      return res.status(400).json({ error: 'Campos obrigatórios não preenchidos' })
    }

    // Verificar se número já existe
    const existing = await prisma.patrimonio.findUnique({
      where: { numero_patrimonio: data.numero_patrimonio },
    })

    if (existing) {
      return res.status(400).json({ error: 'Número de patrimônio já existe' })
    }

    // Buscar sector e local
    const sector = await prisma.sector.findFirst({
      where: { name: data.setor_responsavel },
    })

    const local = await prisma.local.findFirst({
      where: { name: data.local_objeto },
    })

    // Buscar tipo e forma de aquisição
    const tipoBem = data.tipo ? await prisma.tipoBem.findFirst({
      where: { nome: data.tipo },
    }) : null

    const acquisitionForm = data.forma_aquisicao ? await prisma.acquisitionForm.findFirst({
      where: { nome: data.forma_aquisicao },
    }) : null

    // Criar patrimônio
    const patrimonio = await prisma.patrimonio.create({
      data: {
        numero_patrimonio: data.numero_patrimonio,
        descricao_bem: data.descricao_bem,
        tipo: data.tipo || '',
        marca: data.marca,
        modelo: data.modelo,
        cor: data.cor,
        numero_serie: data.numero_serie,
        data_aquisicao: new Date(data.data_aquisicao),
        valor_aquisicao: parseFloat(data.valor_aquisicao),
        quantidade: parseInt(data.quantidade) || 1,
        numero_nota_fiscal: data.numero_nota_fiscal,
        forma_aquisicao: data.forma_aquisicao || '',
        setor_responsavel: data.setor_responsavel,
        local_objeto: data.local_objeto,
        status: data.status || 'ativo',
        situacao_bem: data.situacao_bem,
        observacoes: data.observacoes,
        fotos: data.fotos || [],
        documentos: data.documentos || [],
        metodo_depreciacao: data.metodo_depreciacao,
        vida_util_anos: data.vida_util_anos ? parseInt(data.vida_util_anos) : null,
        valor_residual: data.valor_residual ? parseFloat(data.valor_residual) : null,
        municipalityId: req.user!.municipalityId,
        sectorId: sector?.id || '',
        localId: local?.id,
        tipoId: tipoBem?.id,
        acquisitionFormId: acquisitionForm?.id,
        createdBy: userId,
      },
      include: {
        sector: true,
        local: true,
        tipoBem: true,
        acquisitionForm: true,
      },
    })

    // Criar entrada no histórico
    await prisma.historicoEntry.create({
      data: {
        patrimonioId: patrimonio.id,
        date: new Date(),
        action: 'Cadastro',
        details: `Patrimônio cadastrado no sistema por ${req.user!.email}`,
        user: req.user!.email,
        origem: 'Sistema',
        destino: data.setor_responsavel,
      },
    })

    // Log de atividade
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'PATRIMONIO_CREATE',
        entityType: 'Patrimonio',
        entityId: patrimonio.id,
        details: `Patrimônio ${patrimonio.numero_patrimonio} criado`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    })

    res.status(201).json(patrimonio)
  } catch (error) {
    console.error('Erro ao criar patrimônio:', error)
    res.status(500).json({ error: 'Erro ao criar patrimônio' })
  }
}

export const updatePatrimonio = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const data = req.body
    const userId = req.user!.id

    // Verificar se patrimônio existe
    const existing = await prisma.patrimonio.findUnique({
      where: { id },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Patrimônio não encontrado' })
    }

    // Buscar relacionamentos se mudaram
    let updateData: any = {
      ...data,
      updatedBy: userId,
    }

    if (data.setor_responsavel) {
      const sector = await prisma.sector.findFirst({
        where: { name: data.setor_responsavel },
      })
      updateData.sectorId = sector?.id
    }

    if (data.local_objeto) {
      const local = await prisma.local.findFirst({
        where: { name: data.local_objeto },
      })
      updateData.localId = local?.id
    }

    if (data.tipo) {
      const tipoBem = await prisma.tipoBem.findFirst({
        where: { nome: data.tipo },
      })
      updateData.tipoId = tipoBem?.id
    }

    if (data.forma_aquisicao) {
      const acquisitionForm = await prisma.acquisitionForm.findFirst({
        where: { nome: data.forma_aquisicao },
      })
      updateData.acquisitionFormId = acquisitionForm?.id
    }

    // Atualizar patrimônio
    const patrimonio = await prisma.patrimonio.update({
      where: { id },
      data: updateData,
      include: {
        sector: true,
        local: true,
        tipoBem: true,
        acquisitionForm: true,
      },
    })

    // Criar entrada no histórico
    await prisma.historicoEntry.create({
      data: {
        patrimonioId: id,
        date: new Date(),
        action: 'Atualização',
        details: `Patrimônio atualizado por ${req.user!.email}`,
        user: req.user!.email,
      },
    })

    // Log de atividade
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'PATRIMONIO_UPDATE',
        entityType: 'Patrimonio',
        entityId: id,
        details: `Patrimônio ${patrimonio.numero_patrimonio} atualizado`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    })

    res.json(patrimonio)
  } catch (error) {
    console.error('Erro ao atualizar patrimônio:', error)
    res.status(500).json({ error: 'Erro ao atualizar patrimônio' })
  }
}

export const deletePatrimonio = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    // Verificar se patrimônio existe
    const existing = await prisma.patrimonio.findUnique({
      where: { id },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Patrimônio não encontrado' })
    }

    // Deletar patrimônio (cascade deletará histórico e notas)
    await prisma.patrimonio.delete({
      where: { id },
    })

    // Log de atividade
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'PATRIMONIO_DELETE',
        entityType: 'Patrimonio',
        entityId: id,
        details: `Patrimônio ${existing.numero_patrimonio} deletado`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    })

    res.json({ message: 'Patrimônio deletado com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar patrimônio:', error)
    res.status(500).json({ error: 'Erro ao deletar patrimônio' })
  }
}

export const addNote = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { text } = req.body
    const userId = req.user!.id

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { id: userId },
    })

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' })
    }

    // Criar nota
    const note = await prisma.note.create({
      data: {
        text,
        patrimonioId: id,
        userId,
        userName: user.name,
      },
    })

    res.status(201).json(note)
  } catch (error) {
    console.error('Erro ao adicionar nota:', error)
    res.status(500).json({ error: 'Erro ao adicionar nota' })
  }
}
```

### 📋 **5.6 Rotas de Patrimônios**

Criar `backend/src/routes/patrimonioRoutes.ts`:
```typescript
import { Router } from 'express'
import {
  getPatrimonios,
  getPatrimonioById,
  createPatrimonio,
  updatePatrimonio,
  deletePatrimonio,
  addNote,
} from '../controllers/patrimonioController'
import { authenticateToken, authorizeRoles } from '../middlewares/auth'

const router = Router()

// Todas as rotas requerem autenticação
router.use(authenticateToken)

// Rotas públicas (para usuários autenticados)
router.get('/', getPatrimonios)
router.get('/sync', getPatrimonios) // Alias para compatibilidade
router.get('/:id', getPatrimonioById)

// Rotas que requerem permissão de criação
router.post(
  '/',
  authorizeRoles('admin', 'supervisor', 'usuario'),
  createPatrimonio
)

// Rotas que requerem permissão de edição
router.put(
  '/:id',
  authorizeRoles('admin', 'supervisor', 'usuario'),
  updatePatrimonio
)

// Rotas que requerem permissão de exclusão
router.delete(
  '/:id',
  authorizeRoles('admin', 'supervisor'),
  deletePatrimonio
)

// Adicionar nota
router.post(
  '/:id/notes',
  authorizeRoles('admin', 'supervisor', 'usuario'),
  addNote
)

export default router
```

---

## 5.7 Controller de Imóveis

Criar `backend/src/controllers/imovelController.ts`:
```typescript
import { Response } from 'express'
import { PrismaClient } from '@prisma/client'
import { AuthRequest } from '../middlewares/auth'

const prisma = new PrismaClient()

export const getImoveis = async (req: AuthRequest, res: Response) => {
  try {
    const { municipalityId } = req.user!

    const imoveis = await prisma.imovel.findMany({
      where: { municipalityId },
      include: {
        sector: true,
        historico: {
          orderBy: { date: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json(imoveis)
  } catch (error) {
    console.error('Erro ao buscar imóveis:', error)
    res.status(500).json({ error: 'Erro ao buscar imóveis' })
  }
}

export const getImovelById = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const imovel = await prisma.imovel.findUnique({
      where: { id },
      include: {
        sector: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        historico: {
          orderBy: { date: 'desc' },
        },
        manutencoes: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!imovel) {
      return res.status(404).json({ error: 'Imóvel não encontrado' })
    }

    res.json(imovel)
  } catch (error) {
    console.error('Erro ao buscar imóvel:', error)
    res.status(500).json({ error: 'Erro ao buscar imóvel' })
  }
}

export const createImovel = async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body
    const userId = req.user!.id

    // Validações básicas
    if (!data.numero_patrimonio || !data.denominacao) {
      return res.status(400).json({ error: 'Campos obrigatórios não preenchidos' })
    }

    // Verificar se número já existe
    const existing = await prisma.imovel.findUnique({
      where: { numero_patrimonio: data.numero_patrimonio },
    })

    if (existing) {
      return res.status(400).json({ error: 'Número de patrimônio já existe' })
    }

    // Buscar sector
    const sector = await prisma.sector.findFirst({
      where: { name: data.setor },
    })

    // Criar imóvel
    const imovel = await prisma.imovel.create({
      data: {
        numero_patrimonio: data.numero_patrimonio,
        denominacao: data.denominacao,
        endereco: data.endereco,
        setor: data.setor,
        data_aquisicao: new Date(data.data_aquisicao),
        valor_aquisicao: parseFloat(data.valor_aquisicao),
        area_terreno: parseFloat(data.area_terreno) || 0,
        area_construida: parseFloat(data.area_construida) || 0,
        latitude: data.latitude ? parseFloat(data.latitude) : null,
        longitude: data.longitude ? parseFloat(data.longitude) : null,
        descricao: data.descricao,
        observacoes: data.observacoes,
        tipo_imovel: data.tipo_imovel,
        situacao: data.situacao,
        fotos: data.fotos || [],
        documentos: data.documentos || [],
        url_documentos: data.url_documentos,
        municipalityId: req.user!.municipalityId,
        sectorId: sector?.id || '',
        createdBy: userId,
      },
      include: {
        sector: true,
      },
    })

    // Criar entrada no histórico
    await prisma.historicoEntry.create({
      data: {
        imovelId: imovel.id,
        date: new Date(),
        action: 'Cadastro',
        details: `Imóvel cadastrado no sistema por ${req.user!.email}`,
        user: req.user!.email,
        origem: 'Sistema',
        destino: data.setor,
      },
    })

    // Log de atividade
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'IMOVEL_CREATE',
        entityType: 'Imovel',
        entityId: imovel.id,
        details: `Imóvel ${imovel.numero_patrimonio} criado`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    })

    res.status(201).json(imovel)
  } catch (error) {
    console.error('Erro ao criar imóvel:', error)
    res.status(500).json({ error: 'Erro ao criar imóvel' })
  }
}

export const updateImovel = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const data = req.body
    const userId = req.user!.id

    // Verificar se imóvel existe
    const existing = await prisma.imovel.findUnique({
      where: { id },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Imóvel não encontrado' })
    }

    // Buscar sector se mudou
    let updateData: any = {
      ...data,
      updatedBy: userId,
    }

    if (data.setor) {
      const sector = await prisma.sector.findFirst({
        where: { name: data.setor },
      })
      updateData.sectorId = sector?.id
    }

    // Atualizar imóvel
    const imovel = await prisma.imovel.update({
      where: { id },
      data: updateData,
      include: {
        sector: true,
      },
    })

    // Criar entrada no histórico
    await prisma.historicoEntry.create({
      data: {
        imovelId: id,
        date: new Date(),
        action: 'Atualização',
        details: `Imóvel atualizado por ${req.user!.email}`,
        user: req.user!.email,
      },
    })

    // Log de atividade
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'IMOVEL_UPDATE',
        entityType: 'Imovel',
        entityId: id,
        details: `Imóvel ${imovel.numero_patrimonio} atualizado`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    })

    res.json(imovel)
  } catch (error) {
    console.error('Erro ao atualizar imóvel:', error)
    res.status(500).json({ error: 'Erro ao atualizar imóvel' })
  }
}

export const deleteImovel = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    // Verificar se imóvel existe
    const existing = await prisma.imovel.findUnique({
      where: { id },
    })

    if (!existing) {
      return res.status(404).json({ error: 'Imóvel não encontrado' })
    }

    // Deletar imóvel
    await prisma.imovel.delete({
      where: { id },
    })

    // Log de atividade
    await prisma.activityLog.create({
      data: {
        userId,
        action: 'IMOVEL_DELETE',
        entityType: 'Imovel',
        entityId: id,
        details: `Imóvel ${existing.numero_patrimonio} deletado`,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    })

    res.json({ message: 'Imóvel deletado com sucesso' })
  } catch (error) {
    console.error('Erro ao deletar imóvel:', error)
    res.status(500).json({ error: 'Erro ao deletar imóvel' })
  }
}
```

### 📋 **5.8 Rotas de Imóveis**

Criar `backend/src/routes/imovelRoutes.ts`:
```typescript
import { Router } from 'express'
import {
  getImoveis,
  getImovelById,
  createImovel,
  updateImovel,
  deleteImovel,
} from '../controllers/imovelController'
import { authenticateToken, authorizeRoles } from '../middlewares/auth'

const router = Router()

// Todas as rotas requerem autenticação
router.use(authenticateToken)

router.get('/', getImoveis)
router.get('/:id', getImovelById)

router.post(
  '/',
  authorizeRoles('admin', 'supervisor', 'usuario'),
  createImovel
)

router.put(
  '/:id',
  authorizeRoles('admin', 'supervisor', 'usuario'),
  updateImovel
)

router.delete(
  '/:id',
  authorizeRoles('admin', 'supervisor'),
  deleteImovel
)

export default router
```

---

## 5.9 Middlewares Adicionais

### **Error Handler**

Criar `backend/src/middlewares/errorHandler.ts`:
```typescript
import { Request, Response, NextFunction } from 'express'

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err)

  // Erro de validação do Prisma
  if (err.name === 'PrismaClientValidationError') {
    return res.status(400).json({
      error: 'Erro de validação',
      details: err.message,
    })
  }

  // Erro de constraint do Prisma
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Registro duplicado',
      field: err.meta?.target,
    })
  }

  // Erro de registro não encontrado
  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'Registro não encontrado',
    })
  }

  // Erro JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Token inválido',
    })
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expirado',
    })
  }

  // Erro genérico
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor',
  })
}
```

### **Request Logger**

Criar `backend/src/middlewares/requestLogger.ts`:
```typescript
import { Request, Response, NextFunction } from 'express'

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    const logMessage = `${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`
    
    if (res.statusCode >= 400) {
      console.error(`❌ ${logMessage}`)
    } else {
      console.log(`✅ ${logMessage}`)
    }
  })

  next()
}
```

---

**✅ PARTE 2 COMPLETA!**

**Próxima Parte 3 incluirá:**
- Seed de dados (migração do mock-data)
- Controllers de Dashboard, Usuários, Setores, Locais
- Rotas públicas
- Upload de arquivos

**Continue para receber a Parte 3? Digite "continuar" ou "parte 3".**

