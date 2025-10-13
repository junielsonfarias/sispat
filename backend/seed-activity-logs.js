const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function seedActivityLogs() {
  try {
    console.log('🌱 Inserindo logs de atividade de exemplo...')

    // Buscar um usuário existente para associar aos logs
    const user = await prisma.user.findFirst({
      where: { role: 'supervisor' }
    })

    if (!user) {
      console.log('❌ Nenhum usuário supervisor encontrado')
      return
    }

    // Dados de exemplo para logs de atividade
    const sampleLogs = [
      {
        userId: user.id,
        action: 'LOGIN',
        entityType: 'User',
        entityId: user.id,
        details: 'Login realizado com sucesso',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        userId: user.id,
        action: 'CREATE',
        entityType: 'Patrimonio',
        entityId: null,
        details: 'Novo patrimônio criado: Computador Desktop',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        userId: user.id,
        action: 'UPDATE',
        entityType: 'Patrimonio',
        entityId: null,
        details: 'Patrimônio atualizado: Mesa de escritório',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        userId: user.id,
        action: 'DELETE',
        entityType: 'Patrimonio',
        entityId: null,
        details: 'Patrimônio removido: Equipamento obsoleto',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      {
        userId: user.id,
        action: 'VIEW',
        entityType: 'Dashboard',
        entityId: null,
        details: 'Visualização do dashboard principal',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    ]

    // Inserir logs com datas diferentes (últimos 7 dias)
    for (let i = 0; i < sampleLogs.length; i++) {
      const log = sampleLogs[i]
      const createdAt = new Date()
      createdAt.setDate(createdAt.getDate() - i) // Cada log com data diferente

      await prisma.activityLog.create({
        data: {
          ...log,
          createdAt
        }
      })

      console.log(`✅ Log inserido: ${log.action} - ${log.details}`)
    }

    console.log('🎉 Logs de atividade inseridos com sucesso!')
  } catch (error) {
    console.error('❌ Erro ao inserir logs:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedActivityLogs()
