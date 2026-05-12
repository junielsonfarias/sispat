import swaggerJsdoc from 'swagger-jsdoc'
import { Express } from 'express'
import swaggerUi from 'swagger-ui-express'
import { logInfo } from './logger'

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SISPAT 2.0 API',
      version: '2.0.0',
      description: `
# Sistema Integrado de Patrimônio - API Documentation

API RESTful para gestão de patrimônio público municipal.

## Funcionalidades

- 🏢 Gestão de Bens Móveis e Imóveis
- 👥 Gestão de Usuários e Setores
- 📊 Relatórios e Dashboards
- 🔐 Autenticação JWT
- 📝 Auditoria Completa
- 📋 Templates de Fichas Personalizáveis

## Autenticação

A maioria dos endpoints requer autenticação via JWT Bearer Token.

\`\`\`
Authorization: Bearer {seu_token_jwt}
\`\`\`

Para obter um token, use o endpoint \`POST /api/auth/login\`.

## Permissões

O sistema possui 5 níveis de acesso:
- **superuser**: Acesso total ao sistema
- **admin**: Gestão municipal completa
- **supervisor**: Setores específicos
- **usuario**: CRUD limitado aos seus setores
- **visualizador**: Apenas leitura

## Rate Limiting

A API possui rate limiting para proteger contra abuso:
- 100 requisições por minuto por IP
- 429 (Too Many Requests) quando excedido
      `,
      contact: {
        name: 'Suporte SISPAT',
        email: 'suporte@sispat.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de Desenvolvimento',
      },
      {
        url: 'https://api.sispat.com',
        description: 'Servidor de Produção',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Token JWT obtido via /api/auth/login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Mensagem de erro',
            },
            details: {
              type: 'object',
              description: 'Detalhes adicionais do erro',
            },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              description: 'Página atual',
            },
            limit: {
              type: 'integer',
              description: 'Itens por página',
            },
            total: {
              type: 'integer',
              description: 'Total de itens',
            },
            pages: {
              type: 'integer',
              description: 'Total de páginas',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            name: {
              type: 'string',
            },
            role: {
              type: 'string',
              enum: ['superuser', 'admin', 'supervisor', 'usuario', 'visualizador'],
            },
            municipalityId: {
              type: 'string',
              format: 'uuid',
            },
            responsibleSectors: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            isActive: {
              type: 'boolean',
            },
          },
        },
        Patrimonio: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            numero_patrimonio: {
              type: 'string',
              description: 'Número único do patrimônio',
            },
            descricao_bem: {
              type: 'string',
            },
            tipo: {
              type: 'string',
            },
            valor_aquisicao: {
              type: 'number',
              format: 'double',
            },
            data_aquisicao: {
              type: 'string',
              format: 'date-time',
            },
            status: {
              type: 'string',
              enum: ['ativo', 'inativo', 'baixado', 'manutencao'],
            },
            setor_responsavel: {
              type: 'string',
            },
          },
        },
        Imovel: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            numero_patrimonio: {
              type: 'string',
              description: 'Número único do imóvel (formato: IML + ano + setor + sequencial)',
            },
            denominacao: {
              type: 'string',
            },
            endereco: {
              type: 'string',
            },
            valor_aquisicao: {
              type: 'number',
              format: 'double',
            },
            area_terreno: {
              type: 'number',
              format: 'double',
            },
            area_construida: {
              type: 'number',
              format: 'double',
            },
            latitude: {
              type: 'number',
              format: 'double',
            },
            longitude: {
              type: 'number',
              format: 'double',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    tags: [
      {
        name: 'Autenticação',
        description: 'Endpoints de autenticação e autorização',
      },
      {
        name: 'Patrimônios',
        description: 'Gestão de bens móveis',
      },
      {
        name: 'Imóveis',
        description: 'Gestão de imóveis',
      },
      {
        name: 'Usuários',
        description: 'Gestão de usuários',
      },
      {
        name: 'Setores',
        description: 'Gestão de setores',
      },
      {
        name: 'Fichas',
        description: 'Templates de fichas patrimoniais',
      },
      {
        name: 'Relatórios',
        description: 'Geração de relatórios',
      },
      {
        name: 'Saúde',
        description: 'Health checks e monitoramento',
      },
    ],
  },
  apis: [
    './src/routes/*.ts',
    './src/controllers/*.ts',
  ],
}

const specs = swaggerJsdoc(options)

export const setupSwagger = (app: Express) => {
  // Servir documentação Swagger
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'SISPAT 2.0 API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
    },
  }))

  // Servir specs JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json')
    res.send(specs)
  })

  logInfo('📚 Swagger Documentation disponível em: /api-docs')
}

export default specs

