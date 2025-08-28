#!/usr/bin/env node

import { query } from './connection.js'

async function createMissingTables() {
  try {
    console.log('🔧 Criando tabelas e colunas faltantes...')
    
    // 1. Adicionar colunas faltantes na tabela imoveis
    console.log('📋 Adicionando colunas na tabela imoveis...')
    await query(`
      ALTER TABLE imoveis 
      ADD COLUMN IF NOT EXISTS numero_imovel VARCHAR(50),
      ADD COLUMN IF NOT EXISTS descricao TEXT,
      ADD COLUMN IF NOT EXISTS tipo VARCHAR(100),
      ADD COLUMN IF NOT EXISTS endereco TEXT,
      ADD COLUMN IF NOT EXISTS area DECIMAL(10,2),
      ADD COLUMN IF NOT EXISTS valor_venal DECIMAL(12,2),
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ativo'
    `)
    console.log('✅ Colunas adicionadas na tabela imoveis')
    
    // 2. Adicionar colunas faltantes na tabela manutencao_tasks
    console.log('📋 Adicionando colunas na tabela manutencao_tasks...')
    await query(`
      ALTER TABLE manutencao_tasks 
      ADD COLUMN IF NOT EXISTS tipo VARCHAR(100),
      ADD COLUMN IF NOT EXISTS descricao TEXT,
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pendente',
      ADD COLUMN IF NOT EXISTS data_inicio DATE,
      ADD COLUMN IF NOT EXISTS data_fim DATE,
      ADD COLUMN IF NOT EXISTS patrimonio_id UUID REFERENCES patrimonios(id),
      ADD COLUMN IF NOT EXISTS responsavel_id UUID REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS prioridade VARCHAR(20) DEFAULT 'media',
      ADD COLUMN IF NOT EXISTS custo_estimado DECIMAL(10,2)
    `)
    console.log('✅ Colunas adicionadas na tabela manutencao_tasks')
    
    // 3. Criar tabela transfers
    console.log('📋 Criando tabela transfers...')
    await query(`
      CREATE TABLE IF NOT EXISTS transfers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patrimonio_id UUID NOT NULL REFERENCES patrimonios(id),
        origem_id UUID REFERENCES locals(id),
        destino_id UUID REFERENCES locals(id),
        data_transferencia TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        motivo TEXT,
        autorizado_por UUID REFERENCES users(id),
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ Tabela transfers criada')
    
    // 4. Adicionar colunas faltantes na tabela inventories
    console.log('📋 Adicionando colunas na tabela inventories...')
    await query(`
      ALTER TABLE inventories 
      ADD COLUMN IF NOT EXISTS nome VARCHAR(255),
      ADD COLUMN IF NOT EXISTS descricao TEXT,
      ADD COLUMN IF NOT EXISTS data_inicio DATE,
      ADD COLUMN IF NOT EXISTS data_fim DATE,
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ativo',
      ADD COLUMN IF NOT EXISTS responsavel_id UUID REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS municipality_id UUID REFERENCES municipalities(id)
    `)
    console.log('✅ Colunas adicionadas na tabela inventories')
    
    // 5. Adicionar colunas faltantes na tabela report_templates
    console.log('📋 Adicionando colunas na tabela report_templates...')
    await query(`
      ALTER TABLE report_templates 
      ADD COLUMN IF NOT EXISTS nome VARCHAR(255),
      ADD COLUMN IF NOT EXISTS tipo VARCHAR(100),
      ADD COLUMN IF NOT EXISTS descricao TEXT,
      ADD COLUMN IF NOT EXISTS template_data JSONB,
      ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `)
    console.log('✅ Colunas adicionadas na tabela report_templates')
    
    // 6. Adicionar colunas faltantes na tabela label_templates
    console.log('📋 Adicionando colunas na tabela label_templates...')
    await query(`
      ALTER TABLE label_templates 
      ADD COLUMN IF NOT EXISTS nome VARCHAR(255),
      ADD COLUMN IF NOT EXISTS tipo VARCHAR(100),
      ADD COLUMN IF NOT EXISTS descricao TEXT,
      ADD COLUMN IF NOT EXISTS template_data JSONB,
      ADD COLUMN IF NOT EXISTS tamanho VARCHAR(50) DEFAULT 'padrao',
      ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `)
    console.log('✅ Colunas adicionadas na tabela label_templates')
    
    // 7. Adicionar colunas faltantes na tabela sectors
    console.log('📋 Adicionando colunas na tabela sectors...')
    await query(`
      ALTER TABLE sectors 
      ADD COLUMN IF NOT EXISTS codigo VARCHAR(50),
      ADD COLUMN IF NOT EXISTS sigla VARCHAR(20),
      ADD COLUMN IF NOT EXISTS endereco TEXT,
      ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18),
      ADD COLUMN IF NOT EXISTS responsavel VARCHAR(255)
    `)
    console.log('✅ Colunas adicionadas na tabela sectors')
    
    // 8. Criar tabela form_fields
    console.log('📋 Criando tabela form_fields...')
    await query(`
      CREATE TABLE IF NOT EXISTS form_fields (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome VARCHAR(255) NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        label VARCHAR(255),
        placeholder TEXT,
        obrigatorio BOOLEAN DEFAULT false,
        opcoes JSONB,
        ordem INTEGER DEFAULT 0,
        tabela_alvo VARCHAR(100),
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ Tabela form_fields criada')
    
    // 8. Criar tabela excel_csv_templates
    console.log('📋 Criando tabela excel_csv_templates...')
    await query(`
      CREATE TABLE IF NOT EXISTS excel_csv_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        nome VARCHAR(255) NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        descricao TEXT,
        colunas JSONB NOT NULL,
        filtros JSONB,
        formato VARCHAR(10) DEFAULT 'xlsx',
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ Tabela excel_csv_templates criada')
    
    // 9. Criar tabela customization_settings
    console.log('📋 Criando tabela customization_settings...')
    await query(`
      CREATE TABLE IF NOT EXISTS customization_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chave VARCHAR(255) UNIQUE NOT NULL,
        valor JSONB,
        descricao TEXT,
        categoria VARCHAR(100),
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('✅ Tabela customization_settings criada')
    
    // 10. Criar índices para melhor performance
    console.log('📋 Criando índices...')
    await query(`
      CREATE INDEX IF NOT EXISTS idx_transfers_patrimonio_id ON transfers(patrimonio_id);
      CREATE INDEX IF NOT EXISTS idx_transfers_data_transferencia ON transfers(data_transferencia);
      CREATE INDEX IF NOT EXISTS idx_manutencao_patrimonio_id ON manutencao_tasks(patrimonio_id);
      CREATE INDEX IF NOT EXISTS idx_manutencao_status ON manutencao_tasks(status);
      CREATE INDEX IF NOT EXISTS idx_inventories_municipality_id ON inventories(municipality_id);
      CREATE INDEX IF NOT EXISTS idx_form_fields_tabela_alvo ON form_fields(tabela_alvo);
      CREATE INDEX IF NOT EXISTS idx_customization_settings_chave ON customization_settings(chave);
    `)
    console.log('✅ Índices criados')
    
    console.log('🎉 Todas as tabelas e colunas foram criadas com sucesso!')
    
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error)
    throw error
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  createMissingTables()
    .then(() => {
      console.log('✅ Script concluído com sucesso!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Erro no script:', error)
      process.exit(1)
    })
}

export default createMissingTables
