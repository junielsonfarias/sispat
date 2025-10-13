import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createDefaultTemplates() {
  try {
    console.log('🔄 Criando templates padrão...')

    // Buscar o primeiro usuário admin ou supervisor para ser o criador
    const adminUser = await prisma.user.findFirst({
      where: {
        OR: [
          { role: 'admin' },
          { role: 'supervisor' }
        ]
      }
    })

    if (!adminUser) {
      console.error('❌ Nenhum usuário admin ou supervisor encontrado')
      return
    }

    // Verificar se já existe template padrão para bens
    const existingBensTemplate = await prisma.fichaTemplate.findFirst({
      where: {
        type: 'bens',
        municipalityId: adminUser.municipalityId,
        isDefault: true
      }
    })

    if (existingBensTemplate) {
      console.log('✅ Template padrão de bens já existe:', existingBensTemplate.name)
    } else {
      // Criar template padrão de bens móveis (baseado no sistema atual)
      const bensTemplate = await prisma.fichaTemplate.create({
        data: {
          name: 'Ficha Padrão de Bens Móveis',
          description: 'Template padrão do sistema para fichas de bens móveis. Inclui todas as informações principais e layout oficial.',
          type: 'bens',
          isDefault: true,
          isActive: true,
          municipalityId: adminUser.municipalityId,
          createdBy: adminUser.id,
          config: {
            header: {
              showLogo: true,
              logoSize: 'medium',
              showDate: true,
              showSecretariat: true,
              customTexts: {
                secretariat: 'SECRETARIA MUNICIPAL DE ADMINISTRAÇÃO E FINANÇAS',
                department: 'DEPARTAMENTO DE GESTÃO E CONTROLE DE PATRIMÔNIO'
              }
            },
            sections: {
              patrimonioInfo: {
                enabled: true,
                layout: 'grid',
                fields: [
                  'descricao_bem',
                  'tipo',
                  'marca',
                  'modelo',
                  'cor',
                  'numero_serie'
                ],
                showPhoto: true,
                photoSize: 'medium'
              },
              acquisition: {
                enabled: true,
                fields: [
                  'data_aquisicao',
                  'valor_aquisicao',
                  'forma_aquisicao'
                ]
              },
              location: {
                enabled: true,
                fields: [
                  'setor_responsavel',
                  'local_objeto',
                  'status'
                ]
              },
              depreciation: {
                enabled: true,
                fields: [
                  'metodo_depreciacao',
                  'vida_util_anos',
                  'valor_residual'
                ]
              }
            },
            signatures: {
              enabled: true,
              count: 2,
              layout: 'horizontal',
              labels: [
                'Responsável pelo Setor',
                'Responsável pelo Patrimônio'
              ],
              showDates: true
            },
            styling: {
              margins: {
                top: 40,
                bottom: 20,
                left: 15,
                right: 15
              },
              fonts: {
                family: 'Arial',
                size: 12
              }
            }
          }
        }
      })
      console.log('✅ Template padrão de bens criado:', bensTemplate.name)
    }

    // Verificar se já existe template padrão para imóveis
    const existingImoveisTemplate = await prisma.fichaTemplate.findFirst({
      where: {
        type: 'imoveis',
        municipalityId: adminUser.municipalityId,
        isDefault: true
      }
    })

    if (existingImoveisTemplate) {
      console.log('✅ Template padrão de imóveis já existe:', existingImoveisTemplate.name)
    } else {
      // Criar template padrão de imóveis
      const imoveisTemplate = await prisma.fichaTemplate.create({
        data: {
          name: 'Ficha Padrão de Imóveis',
          description: 'Template padrão do sistema para fichas de imóveis. Inclui informações específicas de propriedades.',
          type: 'imoveis',
          isDefault: true,
          isActive: true,
          municipalityId: adminUser.municipalityId,
          createdBy: adminUser.id,
          config: {
            header: {
              showLogo: true,
              logoSize: 'medium',
              showDate: true,
              showSecretariat: true,
              customTexts: {
                secretariat: 'SECRETARIA MUNICIPAL DE ADMINISTRAÇÃO E FINANÇAS',
                department: 'DEPARTAMENTO DE PATRIMÔNIO IMOBILIÁRIO'
              }
            },
            sections: {
              patrimonioInfo: {
                enabled: true,
                layout: 'grid',
                fields: [
                  'denominacao',
                  'endereco',
                  'area_terreno',
                  'area_construida',
                  'tipo_imovel',
                  'situacao'
                ],
                showPhoto: true,
                photoSize: 'medium'
              },
              acquisition: {
                enabled: true,
                fields: [
                  'data_aquisicao',
                  'valor_aquisicao'
                ]
              },
              location: {
                enabled: true,
                fields: [
                  'setor',
                  'latitude',
                  'longitude'
                ]
              },
              depreciation: {
                enabled: false,
                fields: []
              }
            },
            signatures: {
              enabled: true,
              count: 2,
              layout: 'horizontal',
              labels: [
                'Responsável pelo Setor',
                'Diretor de Patrimônio'
              ],
              showDates: true
            },
            styling: {
              margins: {
                top: 40,
                bottom: 20,
                left: 15,
                right: 15
              },
              fonts: {
                family: 'Arial',
                size: 12
              }
            }
          }
        }
      })
      console.log('✅ Template padrão de imóveis criado:', imoveisTemplate.name)
    }

    console.log('🎉 Templates padrão criados/verificados com sucesso!')
  } catch (error) {
    console.error('❌ Erro ao criar templates padrão:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

createDefaultTemplates()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

