const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const router = express.Router();

// Configuração do Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SISPAT API',
      version: '1.0.0',
      description: 'API do Sistema de Gestão Patrimonial',
      contact: {
        name: 'Equipe SISPAT',
        email: 'suporte@sispat.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
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
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            role: {
              type: 'string',
              enum: [
                'superuser',
                'supervisor',
                'usuario',
                'admin',
                'visualizador',
              ],
            },
            municipalityId: { type: 'string', format: 'uuid' },
            sector: { type: 'string' },
            responsibleSectors: { type: 'array', items: { type: 'string' } },
            avatarUrl: { type: 'string', format: 'uri' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Patrimonio: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            numeroPatrimonio: { type: 'string' },
            descricao: { type: 'string' },
            tipo: { type: 'string' },
            marca: { type: 'string' },
            modelo: { type: 'string' },
            numeroSerie: { type: 'string' },
            estado: { type: 'string' },
            valorAquisicao: { type: 'number' },
            dataAquisicao: { type: 'string', format: 'date' },
            fornecedor: { type: 'string' },
            notaFiscal: { type: 'string' },
            localId: { type: 'string', format: 'uuid' },
            sectorId: { type: 'string', format: 'uuid' },
            municipalityId: { type: 'string', format: 'uuid' },
            setorResponsavel: { type: 'string' },
            localObjeto: { type: 'string' },
            status: { type: 'string' },
            situacaoBem: { type: 'string' },
            fotos: { type: 'array', items: { type: 'string' } },
            documentos: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Municipality: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            state: { type: 'string' },
            logoUrl: { type: 'string', format: 'uri' },
            supervisorId: { type: 'string', format: 'uuid' },
            fullAddress: { type: 'string' },
            contactEmail: { type: 'string', format: 'email' },
            mayorName: { type: 'string' },
            mayorCpf: { type: 'string' },
            accessStartDate: { type: 'string', format: 'date' },
            accessEndDate: { type: 'string', format: 'date' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Sector: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            codigo: { type: 'string' },
            sigla: { type: 'string' },
            endereco: { type: 'string' },
            cnpj: { type: 'string' },
            responsavel: { type: 'string' },
            municipalityId: { type: 'string', format: 'uuid' },
            parentId: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Local: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string' },
            address: { type: 'string' },
            sectorId: { type: 'string', format: 'uuid' },
            municipalityId: { type: 'string', format: 'uuid' },
            capacity: { type: 'number' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            message: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
        Success: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            message: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './server/routes/*.js',
    './server/routes/auth.js',
    './server/routes/users.js',
    './server/routes/patrimonios.js',
    './server/routes/municipalities.js',
    './server/routes/sectors.js',
    './server/routes/locals.js',
  ],
};

const specs = swaggerJsdoc(swaggerOptions);

// Rota para a documentação Swagger
router.use('/', swaggerUi.serve);
router.get(
  '/',
  swaggerUi.setup(specs, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'SISPAT API Documentation',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
    },
  })
);

// Rota para obter especificação JSON
router.get('/json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(specs);
});

// Rota para obter especificação YAML
router.get('/yaml', (req, res) => {
  const yaml = require('js-yaml');
  res.setHeader('Content-Type', 'text/yaml');
  res.send(yaml.dump(specs));
});

module.exports = router;
