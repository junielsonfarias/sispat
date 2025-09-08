// Informações de build e versão do SISPAT
export const BUILD_INFO = {
  // Informações da aplicação
  appName: 'SISPAT',
  appVersion: '1.0.0',
  buildDate: new Date().toISOString(),
  buildEnvironment: import.meta.env.MODE,

  // Informações técnicas
  framework: 'React 19.1.1',
  buildTool: 'Vite 7.1.0',
  typescript: '5.9.2',
  nodeVersion: 'Unknown', // Node version not available in browser

  // Informações de desenvolvimento
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,

  // Configurações de ambiente
  environment: {
    apiUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001',
    enableDebug: import.meta.env.DEV,
    enableAnalytics: false, // Removido analytics da Skip
  },

  // Informações de licença
  license: 'MIT',
  copyright: '© 2024 SISPAT Development Team',

  // Informações de contato
  support: {
    email: 'suporte@sispat.com.br',
    website: 'https://sispat.com.br',
    documentation: 'https://docs.sispat.com.br',
  },
} as const;

// Função para obter informações de build em formato de string
export function getBuildInfoString(): string {
  return `${BUILD_INFO.appName} v${BUILD_INFO.appVersion} - ${BUILD_INFO.buildEnvironment} - ${BUILD_INFO.buildDate}`;
}

// Função para log de inicialização
export function logBuildInfo(): void {
  if (BUILD_INFO.isDevelopment) {
    console.group('🏗️ SISPAT Build Information');
    console.log('App:', `${BUILD_INFO.appName} v${BUILD_INFO.appVersion}`);
    console.log('Environment:', BUILD_INFO.buildEnvironment);
    console.log('Build Date:', BUILD_INFO.buildDate);
    console.log('Framework:', BUILD_INFO.framework);
    console.log('Build Tool:', BUILD_INFO.buildTool);
    console.log('TypeScript:', BUILD_INFO.typescript);
    console.groupEnd();
  }
}
