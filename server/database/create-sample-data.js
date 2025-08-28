#!/usr/bin/env node

import { query } from './connection.js'

async function createSampleData() {
  try {
    console.log('🎨 Criando dados de exemplo...')
    
    // 1. Criar templates de relatório de exemplo
    console.log('📋 Criando templates de relatório de exemplo...')
    
    const reportTemplates = [
      {
        nome: 'Relatório Geral de Patrimônios',
        tipo: 'patrimonios',
        descricao: 'Relatório completo com todos os patrimônios do sistema',
        template_data: {
          colunas: ['numero_patrimonio', 'descricao', 'tipo', 'valor_aquisicao', 'local_objeto', 'setor_responsavel'],
          filtros: ['municipality_id', 'tipo'],
          ordenacao: 'numero_patrimonio',
          agrupamento: 'setor_responsavel'
        }
      },
      {
        nome: 'Relatório de Imóveis',
        tipo: 'imoveis',
        descricao: 'Relatório detalhado de todos os imóveis',
        template_data: {
          colunas: ['numero_imovel', 'descricao', 'tipo', 'endereco', 'area', 'valor_venal'],
          filtros: ['municipality_id', 'status'],
          ordenacao: 'numero_imovel',
          agrupamento: 'tipo'
        }
      },
      {
        nome: 'Relatório de Manutenção',
        tipo: 'manutencao',
        descricao: 'Relatório de tarefas de manutenção',
        template_data: {
          colunas: ['descricao', 'tipo', 'status', 'data_inicio', 'data_fim', 'responsavel_id'],
          filtros: ['status', 'tipo'],
          ordenacao: 'data_inicio',
          agrupamento: 'status'
        }
      },
      {
        nome: 'Relatório de Transferências',
        tipo: 'transfers',
        descricao: 'Relatório de movimentação de patrimônios',
        template_data: {
          colunas: ['patrimonio_id', 'origem_id', 'destino_id', 'data_transferencia', 'motivo'],
          filtros: ['data_transferencia'],
          ordenacao: 'data_transferencia',
          agrupamento: 'origem_id'
        }
      }
    ]
    
    for (const template of reportTemplates) {
      await query(`
        INSERT INTO report_templates (name, type, descricao, config, created_by)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        template.nome,
        template.tipo,
        template.descricao,
        JSON.stringify(template.template_data),
        '00000000-0000-0000-0000-000000000001' // superuser
      ])
    }
    console.log('✅ Templates de relatório criados')
    
    // 2. Criar templates de etiqueta de exemplo
    console.log('🏷️ Criando templates de etiqueta de exemplo...')
    
    const labelTemplates = [
      {
        nome: 'Etiqueta Padrão de Patrimônio',
        tipo: 'patrimonio',
        descricao: 'Etiqueta padrão para patrimônios com QR Code',
        tamanho: 'padrao',
        template_data: {
          largura: 100,
          altura: 50,
          campos: [
            { nome: 'numero_patrimonio', posicao: { x: 5, y: 5 }, fonte: 'Arial', tamanho: 12, negrito: true },
            { nome: 'descricao', posicao: { x: 5, y: 20 }, fonte: 'Arial', tamanho: 8 },
            { nome: 'qr_code', posicao: { x: 70, y: 5 }, tamanho: 25 }
          ],
          borda: true,
          cor_fundo: '#FFFFFF',
          cor_texto: '#000000'
        }
      },
      {
        nome: 'Etiqueta Grande de Patrimônio',
        tipo: 'patrimonio',
        descricao: 'Etiqueta grande para patrimônios importantes',
        tamanho: 'grande',
        template_data: {
          largura: 150,
          altura: 80,
          campos: [
            { nome: 'numero_patrimonio', posicao: { x: 10, y: 10 }, fonte: 'Arial', tamanho: 16, negrito: true },
            { nome: 'descricao', posicao: { x: 10, y: 30 }, fonte: 'Arial', tamanho: 10 },
            { nome: 'tipo', posicao: { x: 10, y: 45 }, fonte: 'Arial', tamanho: 8 },
            { nome: 'local_objeto', posicao: { x: 10, y: 60 }, fonte: 'Arial', tamanho: 8 },
            { nome: 'qr_code', posicao: { x: 110, y: 10 }, tamanho: 35 }
          ],
          borda: true,
          cor_fundo: '#F0F0F0',
          cor_texto: '#000000'
        }
      },
      {
        nome: 'Etiqueta de Imóvel',
        tipo: 'imovel',
        descricao: 'Etiqueta específica para imóveis',
        tamanho: 'padrao',
        template_data: {
          largura: 120,
          altura: 60,
          campos: [
            { nome: 'numero_imovel', posicao: { x: 5, y: 5 }, fonte: 'Arial', tamanho: 14, negrito: true },
            { nome: 'descricao', posicao: { x: 5, y: 25 }, fonte: 'Arial', tamanho: 9 },
            { nome: 'endereco', posicao: { x: 5, y: 40 }, fonte: 'Arial', tamanho: 8 },
            { nome: 'qr_code', posicao: { x: 85, y: 5 }, tamanho: 30 }
          ],
          borda: true,
          cor_fundo: '#E8F4FD',
          cor_texto: '#000000'
        }
      },
      {
        nome: 'Etiqueta de Manutenção',
        tipo: 'manutencao',
        descricao: 'Etiqueta para tarefas de manutenção',
        tamanho: 'pequena',
        template_data: {
          largura: 80,
          altura: 40,
          campos: [
            { nome: 'id', posicao: { x: 5, y: 5 }, fonte: 'Arial', tamanho: 10, negrito: true },
            { nome: 'tipo', posicao: { x: 5, y: 20 }, fonte: 'Arial', tamanho: 8 },
            { nome: 'status', posicao: { x: 5, y: 30 }, fonte: 'Arial', tamanho: 8 },
            { nome: 'qr_code', posicao: { x: 50, y: 5 }, tamanho: 25 }
          ],
          borda: true,
          cor_fundo: '#FFF3CD',
          cor_texto: '#000000'
        }
      }
    ]
    
    for (const template of labelTemplates) {
      await query(`
        INSERT INTO label_templates (name, descricao, tamanho, config, created_by)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        template.nome,
        template.descricao,
        template.tamanho,
        JSON.stringify(template.template_data),
        '00000000-0000-0000-0000-000000000001' // superuser
      ])
    }
    console.log('✅ Templates de etiqueta criados')
    
    // 3. Criar alguns campos personalizáveis de exemplo
    console.log('🔧 Criando campos personalizáveis de exemplo...')
    
    const formFields = [
      {
        nome: 'observacoes',
        tipo: 'textarea',
        label: 'Observações',
        placeholder: 'Digite observações adicionais...',
        obrigatorio: false,
        tabela_alvo: 'patrimonios',
        ordem: 100
      },
      {
        nome: 'fabricante',
        tipo: 'text',
        label: 'Fabricante',
        placeholder: 'Nome do fabricante',
        obrigatorio: false,
        tabela_alvo: 'patrimonios',
        ordem: 15
      },
      {
        nome: 'ano_fabricacao',
        tipo: 'number',
        label: 'Ano de Fabricação',
        placeholder: '2024',
        obrigatorio: false,
        tabela_alvo: 'patrimonios',
        ordem: 16
      },
      {
        nome: 'garantia',
        tipo: 'date',
        label: 'Data de Garantia',
        placeholder: 'Data de expiração da garantia',
        obrigatorio: false,
        tabela_alvo: 'patrimonios',
        ordem: 17
      },
      {
        nome: 'prioridade',
        tipo: 'select',
        label: 'Prioridade',
        placeholder: 'Selecione a prioridade',
        obrigatorio: false,
        opcoes: ['Baixa', 'Média', 'Alta', 'Crítica'],
        tabela_alvo: 'manutencao_tasks',
        ordem: 5
      }
    ]
    
    for (const field of formFields) {
      await query(`
        INSERT INTO form_fields (nome, tipo, label, placeholder, obrigatorio, opcoes, ordem, tabela_alvo, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        field.nome,
        field.tipo,
        field.label,
        field.placeholder,
        field.obrigatorio,
        field.opcoes ? JSON.stringify(field.opcoes) : null,
        field.ordem,
        field.tabela_alvo,
        '00000000-0000-0000-0000-000000000001' // superuser
      ])
    }
    console.log('✅ Campos personalizáveis criados')
    
    // 4. Criar templates de exportação de exemplo
    console.log('📊 Criando templates de exportação de exemplo...')
    
    const exportTemplates = [
      {
        nome: 'Exportação Completa de Patrimônios',
        tipo: 'patrimonios',
        descricao: 'Exporta todos os dados de patrimônios para Excel',
        formato: 'xlsx',
        colunas: [
          'numero_patrimonio', 'descricao', 'tipo', 'valor_aquisicao', 
          'data_aquisicao', 'local_objeto', 'setor_responsavel', 'status'
        ],
        filtros: { municipality_id: 'current' }
      },
      {
        nome: 'Exportação de Imóveis',
        tipo: 'imoveis',
        descricao: 'Exporta dados de imóveis para CSV',
        formato: 'csv',
        colunas: [
          'numero_imovel', 'descricao', 'tipo', 'endereco', 'area', 'valor_venal'
        ],
        filtros: { municipality_id: 'current' }
      },
      {
        nome: 'Relatório de Manutenção',
        tipo: 'manutencao',
        descricao: 'Exporta tarefas de manutenção para Excel',
        formato: 'xlsx',
        colunas: [
          'descricao', 'tipo', 'status', 'data_inicio', 'data_fim', 'prioridade'
        ],
        filtros: { status: 'pendente' }
      }
    ]
    
    for (const template of exportTemplates) {
      await query(`
        INSERT INTO excel_csv_templates (nome, tipo, descricao, colunas, filtros, formato, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        template.nome,
        template.tipo,
        template.descricao,
        JSON.stringify(template.colunas),
        JSON.stringify(template.filtros),
        template.formato,
        '00000000-0000-0000-0000-000000000001' // superuser
      ])
    }
    console.log('✅ Templates de exportação criados')
    
    // 5. Criar configurações de personalização de exemplo
    console.log('⚙️ Criando configurações de personalização de exemplo...')
    
    const customizationSettings = [
      {
        chave: 'system_name',
        valor: 'SISPAT - Sistema de Patrimônio',
        descricao: 'Nome do sistema exibido no cabeçalho',
        categoria: 'interface'
      },
      {
        chave: 'logo_url',
        valor: '/uploads/logo.png',
        descricao: 'URL do logo do sistema',
        categoria: 'interface'
      },
      {
        chave: 'primary_color',
        valor: '#2563eb',
        descricao: 'Cor primária do tema',
        categoria: 'tema'
      },
      {
        chave: 'secondary_color',
        valor: '#64748b',
        descricao: 'Cor secundária do tema',
        categoria: 'tema'
      },
      {
        chave: 'max_file_size',
        valor: 10485760,
        descricao: 'Tamanho máximo de arquivo em bytes (10MB)',
        categoria: 'upload'
      },
      {
        chave: 'allowed_file_types',
        valor: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
        descricao: 'Tipos de arquivo permitidos',
        categoria: 'upload'
      },
      {
        chave: 'backup_frequency',
        valor: 'daily',
        descricao: 'Frequência de backup automático',
        categoria: 'sistema'
      },
      {
        chave: 'session_timeout',
        valor: 3600,
        descricao: 'Tempo de sessão em segundos',
        categoria: 'seguranca'
      }
    ]
    
    for (const setting of customizationSettings) {
      await query(`
        INSERT INTO customization_settings (chave, valor, descricao, categoria, created_by)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        setting.chave,
        JSON.stringify(setting.valor),
        setting.descricao,
        setting.categoria,
        '00000000-0000-0000-0000-000000000001' // superuser
      ])
    }
    console.log('✅ Configurações de personalização criadas')
    
    console.log('🎉 Todos os dados de exemplo foram criados com sucesso!')
    
  } catch (error) {
    console.error('❌ Erro ao criar dados de exemplo:', error)
    throw error
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  createSampleData()
    .then(() => {
      console.log('✅ Script de dados de exemplo concluído com sucesso!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Erro no script:', error)
      process.exit(1)
    })
}

export default createSampleData
