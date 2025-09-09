#!/usr/bin/env node

import { pool } from './connection.js';
import dotenv from 'dotenv';

dotenv.config();

const createTables = async () => {
  const client = await pool.connect();

  try {
    console.log('🔄 Iniciando migração do banco de dados...');

    // Create municipalities table
    await client.query(`
      CREATE TABLE IF NOT EXISTS municipalities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        state VARCHAR(2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela municipalities criada');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        municipality_id UUID REFERENCES municipalities(id),
        is_active BOOLEAN DEFAULT true,
        login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela users criada');

    // Create sectors table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sectors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        parent_id UUID REFERENCES sectors(id),
        municipality_id UUID NOT NULL REFERENCES municipalities(id),
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela sectors criada');

    // Create user_sectors table for user-sector relationships
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_sectors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        sector_id UUID NOT NULL REFERENCES sectors(id) ON DELETE CASCADE,
        is_primary BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, sector_id)
      )
    `);
    console.log('✅ Tabela user_sectors criada');

    // Create locals table
    await client.query(`
      CREATE TABLE IF NOT EXISTS locals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        sector_id UUID NOT NULL REFERENCES sectors(id),
        municipality_id UUID NOT NULL REFERENCES municipalities(id),
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela locals criada');

    // Create patrimonios table
    await client.query(`
      CREATE TABLE IF NOT EXISTS patrimonios (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        numero_patrimonio VARCHAR(100) NOT NULL,
        descricao TEXT NOT NULL,
        tipo VARCHAR(100),
        marca VARCHAR(100),
        modelo VARCHAR(100),
        numero_serie VARCHAR(100),
        estado VARCHAR(50),
        valor_aquisicao DECIMAL(10,2),
        data_aquisicao DATE,
        fornecedor VARCHAR(255),
        nota_fiscal VARCHAR(100),
        local_id UUID REFERENCES locals(id),
        sector_id UUID REFERENCES sectors(id),
        municipality_id UUID NOT NULL REFERENCES municipalities(id),
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(municipality_id, numero_patrimonio)
      )
    `);
    console.log('✅ Tabela patrimonios criada');

    // Create historico_movimentacao table
    await client.query(`
      CREATE TABLE IF NOT EXISTS historico_movimentacao (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patrimonio_id UUID NOT NULL REFERENCES patrimonios(id),
        tipo_movimentacao VARCHAR(50) NOT NULL,
        data_movimentacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        local_anterior_id UUID REFERENCES locals(id),
        local_novo_id UUID REFERENCES locals(id),
        sector_anterior_id UUID REFERENCES sectors(id),
        sector_novo_id UUID REFERENCES sectors(id),
        observacoes TEXT,
        created_by UUID NOT NULL REFERENCES users(id)
      )
    `);
    console.log('✅ Tabela historico_movimentacao criada');

    // Create notes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patrimonio_id UUID NOT NULL REFERENCES patrimonios(id),
        content TEXT NOT NULL,
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela notes criada');

    // Create emprestimos table
    await client.query(`
      CREATE TABLE IF NOT EXISTS emprestimos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patrimonio_id UUID NOT NULL REFERENCES patrimonios(id),
        responsavel VARCHAR(255) NOT NULL,
        data_emprestimo DATE NOT NULL,
        data_devolucao_prevista DATE,
        data_devolucao_efetiva DATE,
        status VARCHAR(50) DEFAULT 'ativo',
        observacoes TEXT,
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela emprestimos criada');

    // Create transferencias table
    await client.query(`
      CREATE TABLE IF NOT EXISTS transferencias (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patrimonio_id UUID NOT NULL REFERENCES patrimonios(id),
        local_origem_id UUID REFERENCES locals(id),
        local_destino_id UUID REFERENCES locals(id),
        sector_origem_id UUID REFERENCES sectors(id),
        sector_destino_id UUID REFERENCES sectors(id),
        data_transferencia DATE NOT NULL,
        motivo TEXT,
        status VARCHAR(50) DEFAULT 'pendente',
        aprovado_por UUID REFERENCES users(id),
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela transferencias criada');

    // Create imoveis table
    await client.query(`
      CREATE TABLE IF NOT EXISTS imoveis (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        numero_patrimonio VARCHAR(100) NOT NULL,
        descricao TEXT NOT NULL,
        endereco TEXT,
        area DECIMAL(10,2),
        tipo_imovel VARCHAR(100),
        valor_aquisicao DECIMAL(10,2),
        data_aquisicao DATE,
        latitude DECIMAL(10,8),
        longitude DECIMAL(11,8),
        municipality_id UUID NOT NULL REFERENCES municipalities(id),
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(municipality_id, numero_patrimonio)
      )
    `);
    console.log('✅ Tabela imoveis criada');

    // Create imoveis_historico table
    await client.query(`
      CREATE TABLE IF NOT EXISTS imoveis_historico (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        imovel_id UUID NOT NULL REFERENCES imoveis(id),
        tipo_alteracao VARCHAR(50) NOT NULL,
        dados_anteriores TEXT,
        dados_novos TEXT,
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela imoveis_historico criada');

    // Create inventories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        start_date DATE NOT NULL,
        end_date DATE,
        status VARCHAR(50) DEFAULT 'ativo',
        municipality_id UUID NOT NULL REFERENCES municipalities(id),
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela inventories criada');

    // Create inventory_items table
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventory_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        inventory_id UUID NOT NULL REFERENCES inventories(id),
        patrimonio_id UUID NOT NULL REFERENCES patrimonios(id),
        status VARCHAR(50) NOT NULL,
        observacoes TEXT,
        verified_by UUID REFERENCES users(id),
        verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela inventory_items criada');

    // Create activity_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        table_name VARCHAR(100),
        record_id UUID,
        old_values TEXT,
        new_values TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        municipality_id UUID REFERENCES municipalities(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela activity_logs criada');

    // Create manutencao_tasks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS manutencao_tasks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patrimonio_id UUID REFERENCES patrimonios(id),
        imovel_id UUID REFERENCES imoveis(id),
        tipo_manutencao VARCHAR(100) NOT NULL,
        descricao TEXT NOT NULL,
        data_agendada DATE,
        data_conclusao DATE,
        status VARCHAR(50) DEFAULT 'pendente',
        prioridade VARCHAR(20) DEFAULT 'media',
        custo_estimado DECIMAL(10,2),
        custo_real DECIMAL(10,2),
        responsavel_id UUID REFERENCES users(id),
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela manutencao_tasks criada');

    // Create report_templates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS report_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL,
        config JSONB NOT NULL,
        municipality_id UUID REFERENCES municipalities(id),
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela report_templates criada');

    // Create label_templates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS label_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        config JSONB NOT NULL,
        municipality_id UUID REFERENCES municipalities(id),
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela label_templates criada');

    // Create themes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS themes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        config JSONB NOT NULL,
        is_default BOOLEAN DEFAULT false,
        municipality_id UUID REFERENCES municipalities(id),
        created_by UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela themes criada');

    // Create notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabela notifications criada');

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_patrimonios_municipality_id ON patrimonios(municipality_id);
      CREATE INDEX IF NOT EXISTS idx_patrimonios_numero_patrimonio ON patrimonios(numero_patrimonio);
      CREATE INDEX IF NOT EXISTS idx_users_municipality_id ON users(municipality_id);
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_sectors_municipality_id ON sectors(municipality_id);
      CREATE INDEX IF NOT EXISTS idx_locals_municipality_id ON locals(municipality_id);
      CREATE INDEX IF NOT EXISTS idx_imoveis_municipality_id ON imoveis(municipality_id);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_municipality_id ON activity_logs(municipality_id);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
    `);
    console.log('✅ Índices criados');

    console.log('🎉 Migração concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run migration
createTables()
  .then(() => {
    console.log('✅ Banco de dados configurado com sucesso!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Falha na configuração do banco de dados:', error);
    process.exit(1);
  });
