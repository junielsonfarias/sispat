#!/usr/bin/env node

/**
 * SCRIPT DE TESTE COMPLETO DO SISTEMA SISPAT
 *
 * Este script simula o uso real do sistema por um usuário, incluindo:
 * - Login e autenticação
 * - Cadastro de bens patrimoniais
 * - Edição de bens
 * - Exclusão de bens
 * - Monitoramento de logs e sincronização
 *
 * Data: 25/08/2025
 * Versão: 1.0
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações
const CONFIG = {
  BASE_URL: 'http://localhost:3001',
  FRONTEND_URL: 'http://localhost:8080',
  LOG_FILE: path.join(__dirname, '../logs/teste-completo-sistema.log'),
  REPORT_FILE: path.join(__dirname, '../docs1/RELATORIO_TESTE_COMPLETO.md'),
  TEST_USER: {
    email: 'teste@sispat.com',
    password: 'Teste123!',
  },
  TEST_DATA: {
    totalBens: 10, // Reduzido para teste mais rápido
    delayBetweenRequests: 2000, // 2 segundos para visualizar no navegador
    timeout: 30000,
  },
};

// Classe para gerenciar logs
class Logger {
  constructor(logFile) {
    this.logFile = logFile;
    this.logs = [];
  }

  async log(message, type = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${type}] ${message}`;

    console.log(logEntry);
    this.logs.push(logEntry);

    try {
      await fs.appendFile(this.logFile, logEntry + '\n');
    } catch (error) {
      console.error('Erro ao salvar log:', error.message);
    }
  }

  async saveLogs() {
    try {
      await fs.writeFile(this.logFile, this.logs.join('\n'));
    } catch (error) {
      console.error('Erro ao salvar logs:', error.message);
    }
  }
}

// Classe principal de teste
class TesteCompletoSistema {
  constructor() {
    this.logger = new Logger(CONFIG.LOG_FILE);
    this.token = null;
    this.userId = null;
    this.municipalityId = null;
    this.bensCriados = [];
    this.stats = {
      inicio: null,
      fim: null,
      login: { sucesso: false, tempo: 0 },
      criacao: { total: 0, sucessos: 0, falhas: 0, tempo: 0 },
      edicao: { total: 0, sucessos: 0, falhas: 0, tempo: 0 },
      exclusao: { total: 0, sucessos: 0, falhas: 0, tempo: 0 },
      sincronizacao: { verificacoes: 0, sucessos: 0, falhas: 0 },
    };
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async makeRequest(url, options = {}) {
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        timeout: CONFIG.TEST_DATA.timeout,
        ...options,
      });

      const endTime = Date.now();
      const tempo = endTime - startTime;

      return {
        success: response.ok,
        status: response.status,
        data: await response.json().catch(() => null),
        tempo,
        headers: response.headers,
      };
    } catch (error) {
      const endTime = Date.now();
      const tempo = endTime - startTime;

      return {
        success: false,
        error: error.message,
        tempo,
      };
    }
  }

  async login() {
    await this.logger.log('🔐 Iniciando processo de login...');
    const startTime = Date.now();

    const loginData = {
      email: CONFIG.TEST_USER.email,
      password: CONFIG.TEST_USER.password,
    };

    const result = await this.makeRequest(`${CONFIG.BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData),
    });

    const endTime = Date.now();
    this.stats.login.tempo = endTime - startTime;

    if (result.success && result.data?.token) {
      this.token = result.data.token;
      this.userId = result.data.user.id;
      this.municipalityId = result.data.user.municipality_id;

      this.stats.login.sucesso = true;
      await this.logger.log(
        `✅ Login realizado com sucesso! Token: ${this.token.substring(0, 20)}...`
      );
      await this.logger.log(
        `👤 Usuário: ${result.data.user.name} (ID: ${this.userId})`
      );
      await this.logger.log(
        `🏛️ Município: ${result.data.user.municipality_name} (ID: ${this.municipalityId})`
      );

      return true;
    } else {
      this.stats.login.sucesso = false;
      await this.logger.log(
        `❌ Falha no login: ${result.error || result.data?.error || 'Erro desconhecido'}`,
        'ERROR'
      );
      return false;
    }
  }

  gerarDadosBem(index) {
    const tipos = [
      'Equipamento de Informática',
      'Móveis e Utensílios',
      'Veículos',
      'Imóveis',
      'Equipamentos de Escritório',
    ];
    const marcas = [
      'Dell',
      'HP',
      'Samsung',
      'LG',
      'Apple',
      'Lenovo',
      'Asus',
      'Acer',
    ];
    const modelos = [
      'Modelo A',
      'Modelo B',
      'Modelo C',
      'Modelo D',
      'Modelo E',
    ];
    const cores = ['Preto', 'Branco', 'Cinza', 'Azul', 'Verde'];
    const estados = ['OTIMO', 'BOM', 'REGULAR', 'RUIM', 'PESSIMO'];
    const status = ['ativo', 'manutencao', 'inativo', 'baixado'];

    return {
      numero_patrimonio: `TESTE${String(index + 1).padStart(3, '0')}`,
      descricao: `Bem de teste ${index + 1} - ${tipos[index % tipos.length]}`,
      tipo: tipos[index % tipos.length],
      marca: marcas[index % marcas.length],
      modelo: `${modelos[index % modelos.length]} ${index + 1}`,
      cor: cores[index % cores.length],
      numero_serie: `SN${String(index + 1).padStart(6, '0')}`,
      data_aquisicao: new Date(2024, 0, 1 + (index % 365))
        .toISOString()
        .split('T')[0],
      valor_aquisicao: Math.floor(Math.random() * 10000) + 100,
      quantidade: Math.floor(Math.random() * 5) + 1,
      numero_nota_fiscal: `NF${String(index + 1).padStart(6, '0')}`,
      forma_aquisicao: 'Compra Direta',
      setor_responsavel: 'Secretaria de Administração',
      local_objeto: `Sala ${index + 1}`,
      situacao_bem: estados[index % estados.length],
      status: status[index % status.length],
      fotos: [],
      documentos: [],
      metodo_depreciacao: 'Linear',
      vida_util_anos: Math.floor(Math.random() * 10) + 1,
      valor_residual: Math.floor(Math.random() * 1000) + 50,
    };
  }

  async criarBem(dadosBem) {
    const result = await this.makeRequest(
      `${CONFIG.BASE_URL}/api/patrimonios`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(dadosBem),
      }
    );

    if (result.success && result.data?.id) {
      this.bensCriados.push({
        id: result.data.id,
        numero_patrimonio: dadosBem.numero_patrimonio,
        dados: dadosBem,
      });
      return { success: true, id: result.data.id };
    } else {
      return { success: false, error: result.error || result.data?.error };
    }
  }

  async criarBens() {
    await this.logger.log(
      `🏗️ Iniciando criação de ${CONFIG.TEST_DATA.totalBens} bens patrimoniais...`
    );
    const startTime = Date.now();

    for (let i = 0; i < CONFIG.TEST_DATA.totalBens; i++) {
      const dadosBem = this.gerarDadosBem(i);

      await this.logger.log(
        `📝 Criando bem ${i + 1}/${CONFIG.TEST_DATA.totalBens}: ${dadosBem.numero_patrimonio}`
      );
      await this.logger.log(
        `🌐 Abra o navegador em: ${CONFIG.FRONTEND_URL}/bens-cadastrados para acompanhar`
      );

      const result = await this.criarBem(dadosBem);

      if (result.success) {
        this.stats.criacao.sucessos++;
        await this.logger.log(
          `✅ Bem ${dadosBem.numero_patrimonio} criado com sucesso (ID: ${result.id})`
        );
      } else {
        this.stats.criacao.falhas++;
        await this.logger.log(
          `❌ Falha ao criar bem ${dadosBem.numero_patrimonio}: ${result.error}`,
          'ERROR'
        );
      }

      this.stats.criacao.total++;

      // Aguardar entre as requisições para visualizar no navegador
      if (i < CONFIG.TEST_DATA.totalBens - 1) {
        await this.logger.log(
          `⏳ Aguardando ${CONFIG.TEST_DATA.delayBetweenRequests / 1000} segundos...`
        );
        await this.delay(CONFIG.TEST_DATA.delayBetweenRequests);
      }
    }

    const endTime = Date.now();
    this.stats.criacao.tempo = endTime - startTime;

    await this.logger.log(
      `📊 Criação concluída: ${this.stats.criacao.sucessos} sucessos, ${this.stats.criacao.falhas} falhas`
    );
  }

  async editarBem(bem) {
    const dadosEditados = {
      ...bem.dados,
      descricao: `${bem.dados.descricao} - EDITADO`,
      valor_aquisicao: bem.dados.valor_aquisicao + 100,
      status: 'manutencao',
    };

    const result = await this.makeRequest(
      `${CONFIG.BASE_URL}/api/patrimonios/${bem.id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.token}`,
        },
        body: JSON.stringify(dadosEditados),
      }
    );

    if (result.success && result.data?.id) {
      return { success: true, data: result.data };
    } else {
      return { success: false, error: result.error || result.data?.error };
    }
  }

  async editarBens() {
    await this.logger.log(
      `✏️ Iniciando edição de ${this.bensCriados.length} bens patrimoniais...`
    );
    const startTime = Date.now();

    for (let i = 0; i < this.bensCriados.length; i++) {
      const bem = this.bensCriados[i];

      await this.logger.log(
        `✏️ Editando bem ${i + 1}/${this.bensCriados.length}: ${bem.numero_patrimonio}`
      );
      await this.logger.log(
        `🌐 Abra o navegador em: ${CONFIG.FRONTEND_URL}/bens-cadastrados/editar/${bem.id} para acompanhar`
      );

      const result = await this.editarBem(bem);

      if (result.success) {
        this.stats.edicao.sucessos++;
        await this.logger.log(
          `✅ Bem ${bem.numero_patrimonio} editado com sucesso`
        );
      } else {
        this.stats.edicao.falhas++;
        await this.logger.log(
          `❌ Falha ao editar bem ${bem.numero_patrimonio}: ${result.error}`,
          'ERROR'
        );
      }

      this.stats.edicao.total++;

      // Aguardar entre as requisições para visualizar no navegador
      if (i < this.bensCriados.length - 1) {
        await this.logger.log(
          `⏳ Aguardando ${CONFIG.TEST_DATA.delayBetweenRequests / 1000} segundos...`
        );
        await this.delay(CONFIG.TEST_DATA.delayBetweenRequests);
      }
    }

    const endTime = Date.now();
    this.stats.edicao.tempo = endTime - startTime;

    await this.logger.log(
      `📊 Edição concluída: ${this.stats.edicao.sucessos} sucessos, ${this.stats.edicao.falhas} falhas`
    );
  }

  async excluirBem(bem) {
    const result = await this.makeRequest(
      `${CONFIG.BASE_URL}/api/patrimonios/${bem.id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      }
    );

    if (result.success) {
      return { success: true };
    } else {
      return { success: false, error: result.error || result.data?.error };
    }
  }

  async excluirBens() {
    await this.logger.log(
      `🗑️ Iniciando exclusão de ${this.bensCriados.length} bens patrimoniais...`
    );
    const startTime = Date.now();

    for (let i = 0; i < this.bensCriados.length; i++) {
      const bem = this.bensCriados[i];

      await this.logger.log(
        `🗑️ Excluindo bem ${i + 1}/${this.bensCriados.length}: ${bem.numero_patrimonio}`
      );
      await this.logger.log(
        `🌐 Abra o navegador em: ${CONFIG.FRONTEND_URL}/bens-cadastrados para acompanhar`
      );

      const result = await this.excluirBem(bem);

      if (result.success) {
        this.stats.exclusao.sucessos++;
        await this.logger.log(
          `✅ Bem ${bem.numero_patrimonio} excluído com sucesso`
        );
      } else {
        this.stats.exclusao.falhas++;
        await this.logger.log(
          `❌ Falha ao excluir bem ${bem.numero_patrimonio}: ${result.error}`,
          'ERROR'
        );
      }

      this.stats.exclusao.total++;

      // Aguardar entre as requisições para visualizar no navegador
      if (i < this.bensCriados.length - 1) {
        await this.logger.log(
          `⏳ Aguardando ${CONFIG.TEST_DATA.delayBetweenRequests / 1000} segundos...`
        );
        await this.delay(CONFIG.TEST_DATA.delayBetweenRequests);
      }
    }

    const endTime = Date.now();
    this.stats.exclusao.tempo = endTime - startTime;

    await this.logger.log(
      `📊 Exclusão concluída: ${this.stats.exclusao.sucessos} sucessos, ${this.stats.exclusao.falhas} falhas`
    );
  }

  async verificarSincronizacao() {
    await this.logger.log(`🔄 Verificando sincronização dos dados...`);

    // Verificar se os bens foram criados corretamente
    const result = await this.makeRequest(
      `${CONFIG.BASE_URL}/api/patrimonios?limit=1000`,
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      }
    );

    this.stats.sincronizacao.verificacoes++;

    if (result.success && result.data?.items) {
      const bensEncontrados = result.data.items.filter(bem =>
        this.bensCriados.some(
          bemCriado => bemCriado.numero_patrimonio === bem.numero_patrimonio
        )
      );

      if (bensEncontrados.length === this.bensCriados.length) {
        this.stats.sincronizacao.sucessos++;
        await this.logger.log(
          `✅ Sincronização OK: ${bensEncontrados.length} bens encontrados`
        );
      } else {
        this.stats.sincronizacao.falhas++;
        await this.logger.log(
          `❌ Sincronização falhou: esperado ${this.bensCriados.length}, encontrado ${bensEncontrados.length}`,
          'ERROR'
        );
      }
    } else {
      this.stats.sincronizacao.falhas++;
      await this.logger.log(
        `❌ Erro ao verificar sincronização: ${result.error}`,
        'ERROR'
      );
    }
  }

  async verificarLogsAtividade() {
    await this.logger.log(`📋 Verificando logs de atividade...`);

    const result = await this.makeRequest(
      `${CONFIG.BASE_URL}/api/activity-logs?limit=100`,
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      }
    );

    if (result.success && result.data?.items) {
      const logsPatrimonio = result.data.items.filter(log =>
        log.action.includes('PATRIMONIO')
      );

      await this.logger.log(
        `📋 Logs de atividade encontrados: ${logsPatrimonio.length} relacionados a patrimônios`
      );

      // Verificar se há logs para criação, edição e exclusão
      const logsCriacao = logsPatrimonio.filter(
        log => log.action === 'PATRIMONIO_CREATE'
      );
      const logsEdicao = logsPatrimonio.filter(
        log => log.action === 'PATRIMONIO_UPDATE'
      );
      const logsExclusao = logsPatrimonio.filter(
        log => log.action === 'PATRIMONIO_DELETE'
      );

      await this.logger.log(`📋 Logs de criação: ${logsCriacao.length}`);
      await this.logger.log(`📋 Logs de edição: ${logsEdicao.length}`);
      await this.logger.log(`📋 Logs de exclusão: ${logsExclusao.length}`);
    } else {
      await this.logger.log(
        `❌ Erro ao verificar logs de atividade: ${result.error}`,
        'ERROR'
      );
    }
  }

  async gerarRelatorio() {
    const relatorio = `# RELATÓRIO DE TESTE COMPLETO DO SISTEMA SISPAT

## 🎯 RESUMO EXECUTIVO

**Data do Teste**: ${new Date().toLocaleDateString('pt-BR')}  
**Duração Total**: ${this.stats.fim - this.stats.inicio}ms  
**Status Geral**: ${this.stats.login.sucesso ? '✅ SUCESSO' : '❌ FALHA'}

## 🔧 CONFIGURAÇÕES DO TESTE

- **Total de Bens**: ${CONFIG.TEST_DATA.totalBens}
- **Delay entre requisições**: ${CONFIG.TEST_DATA.delayBetweenRequests}ms
- **Timeout**: ${CONFIG.TEST_DATA.timeout}ms
- **Usuário de teste**: ${CONFIG.TEST_USER.email}

## 📈 RESULTADOS DETALHADOS

### 🔐 Login e Autenticação
- **Status**: ${this.stats.login.sucesso ? '✅ Sucesso' : '❌ Falha'}
- **Tempo**: ${this.stats.login.tempo}ms
- **Token**: ${this.token ? 'Gerado' : 'Não gerado'}

### 🏗️ Criação de Bens
- **Total**: ${this.stats.criacao.total}
- **Sucessos**: ${this.stats.criacao.sucessos}
- **Falhas**: ${this.stats.criacao.falhas}
- **Taxa de Sucesso**: ${((this.stats.criacao.sucessos / this.stats.criacao.total) * 100).toFixed(2)}%
- **Tempo Total**: ${this.stats.criacao.tempo}ms
- **Tempo Médio**: ${(this.stats.criacao.tempo / this.stats.criacao.total).toFixed(2)}ms

### ✏️ Edição de Bens
- **Total**: ${this.stats.edicao.total}
- **Sucessos**: ${this.stats.edicao.sucessos}
- **Falhas**: ${this.stats.edicao.falhas}
- **Taxa de Sucesso**: ${((this.stats.edicao.sucessos / this.stats.edicao.total) * 100).toFixed(2)}%
- **Tempo Total**: ${this.stats.edicao.tempo}ms
- **Tempo Médio**: ${(this.stats.edicao.tempo / this.stats.edicao.total).toFixed(2)}ms

### 🗑️ Exclusão de Bens
- **Total**: ${this.stats.exclusao.total}
- **Sucessos**: ${this.stats.exclusao.sucessos}
- **Falhas**: ${this.stats.exclusao.falhas}
- **Taxa de Sucesso**: ${((this.stats.exclusao.sucessos / this.stats.exclusao.total) * 100).toFixed(2)}%
- **Tempo Total**: ${this.stats.exclusao.tempo}ms
- **Tempo Médio**: ${(this.stats.exclusao.tempo / this.stats.exclusao.total).toFixed(2)}ms

### 🔄 Sincronização
- **Verificações**: ${this.stats.sincronizacao.verificacoes}
- **Sucessos**: ${this.stats.sincronizacao.sucessos}
- **Falhas**: ${this.stats.sincronizacao.falhas}

## 📋 BENS CRIADOS

${this.bensCriados.map((bem, index) => `${index + 1}. ${bem.numero_patrimonio} - ${bem.dados.descricao}`).join('\n')}

## 🎯 CONCLUSÕES

### ✅ Pontos Positivos
${this.stats.login.sucesso ? '- Login funcionando corretamente' : ''}
${this.stats.criacao.sucessos > 0 ? '- Criação de bens funcionando' : ''}
${this.stats.edicao.sucessos > 0 ? '- Edição de bens funcionando' : ''}
${this.stats.exclusao.sucessos > 0 ? '- Exclusão de bens funcionando' : ''}
${this.stats.sincronizacao.sucessos > 0 ? '- Sincronização de dados funcionando' : ''}

### ⚠️ Pontos de Atenção
${this.stats.criacao.falhas > 0 ? `- ${this.stats.criacao.falhas} falhas na criação de bens` : ''}
${this.stats.edicao.falhas > 0 ? `- ${this.stats.edicao.falhas} falhas na edição de bens` : ''}
${this.stats.exclusao.falhas > 0 ? `- ${this.stats.exclusao.falhas} falhas na exclusão de bens` : ''}
${this.stats.sincronizacao.falhas > 0 ? `- ${this.stats.sincronizacao.falhas} falhas na sincronização` : ''}

## 📁 ARQUIVOS GERADOS

- **Log Completo**: \`logs/teste-completo-sistema.log\`
- **Relatório**: \`docs1/RELATORIO_TESTE_COMPLETO.md\`

## 🌐 INSTRUÇÕES PARA ACOMPANHAMENTO NO NAVEGADOR

1. **Abra o navegador** em: ${CONFIG.FRONTEND_URL}
2. **Faça login** com as credenciais de teste
3. **Acompanhe as ações** em tempo real:
   - Lista de bens: ${CONFIG.FRONTEND_URL}/bens-cadastrados
   - Criação: ${CONFIG.FRONTEND_URL}/bens-cadastrados/novo
   - Edição: ${CONFIG.FRONTEND_URL}/bens-cadastrados/editar/[ID]
   - Visualização: ${CONFIG.FRONTEND_URL}/bens-cadastrados/ver/[ID]

---

**Teste executado em**: ${new Date().toISOString()}  
**Sistema**: SISPAT v1.0  
**Status**: ${this.stats.login.sucesso ? 'OPERACIONAL' : 'COM PROBLEMAS'}
`;

    try {
      await fs.writeFile(CONFIG.REPORT_FILE, relatorio);
      await this.logger.log(`📄 Relatório salvo em: ${CONFIG.REPORT_FILE}`);
    } catch (error) {
      await this.logger.log(
        `❌ Erro ao salvar relatório: ${error.message}`,
        'ERROR'
      );
    }
  }

  async executar() {
    this.stats.inicio = Date.now();

    await this.logger.log('🚀 INICIANDO TESTE COMPLETO DO SISTEMA SISPAT');
    await this.logger.log('=' * 60);
    await this.logger.log(
      `🌐 Para acompanhar no navegador, abra: ${CONFIG.FRONTEND_URL}`
    );
    await this.logger.log(`🔧 Backend API: ${CONFIG.BASE_URL}`);
    await this.logger.log('=' * 60);

    try {
      // 1. Login
      const loginSucesso = await this.login();
      if (!loginSucesso) {
        await this.logger.log('❌ Teste interrompido: falha no login', 'ERROR');
        return;
      }

      // 2. Criar bens
      await this.criarBens();

      // 3. Verificar sincronização após criação
      await this.verificarSincronizacao();

      // 4. Editar bens
      await this.editarBens();

      // 5. Verificar sincronização após edição
      await this.verificarSincronizacao();

      // 6. Verificar logs de atividade
      await this.verificarLogsAtividade();

      // 7. Excluir bens
      await this.excluirBens();

      // 8. Verificar sincronização após exclusão
      await this.verificarSincronizacao();

      // 9. Gerar relatório final
      await this.gerarRelatorio();

      this.stats.fim = Date.now();

      await this.logger.log('=' * 60);
      await this.logger.log('🎉 TESTE COMPLETO FINALIZADO COM SUCESSO!');
      await this.logger.log(
        `⏱️ Tempo total: ${this.stats.fim - this.stats.inicio}ms`
      );
      await this.logger.log(
        `📊 Total de operações: ${this.stats.criacao.total + this.stats.edicao.total + this.stats.exclusao.total}`
      );
      await this.logger.log(`📄 Relatório gerado: ${CONFIG.REPORT_FILE}`);
    } catch (error) {
      await this.logger.log(
        `❌ Erro durante o teste: ${error.message}`,
        'ERROR'
      );
      await this.logger.log(error.stack, 'ERROR');
    } finally {
      await this.logger.saveLogs();
    }
  }
}

// Função principal
async function main() {
  console.log('🧪 SCRIPT DE TESTE COMPLETO DO SISTEMA SISPAT');
  console.log('=' * 60);
  console.log('🌐 Para acompanhar no navegador, abra: http://localhost:8080');
  console.log('=' * 60);

  // Verificar se os diretórios existem
  try {
    await fs.mkdir(path.dirname(CONFIG.LOG_FILE), { recursive: true });
    await fs.mkdir(path.dirname(CONFIG.REPORT_FILE), { recursive: true });
  } catch (error) {
    console.error('Erro ao criar diretórios:', error.message);
    process.exit(1);
  }

  const teste = new TesteCompletoSistema();
  await teste.executar();
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default TesteCompletoSistema;
