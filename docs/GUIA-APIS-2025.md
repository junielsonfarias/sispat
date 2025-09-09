# 🔌 Guia de APIs - SISPAT 2025

## 📋 Visão Geral

O SISPAT oferece uma API REST completa para integração com sistemas externos e desenvolvimento de
aplicações customizadas.

**Base URL:** `https://seudominio.com/api`  
**Versão:** v1  
**Formato:** JSON  
**Autenticação:** JWT Bearer Token

---

## 🔐 Autenticação

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "usuario@exemplo.com",
  "password": "senha123",
  "municipalityId": "uuid-do-municipio"
}
```

**Resposta:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "Nome do Usuário",
    "email": "usuario@exemplo.com",
    "role": "admin",
    "municipalityId": "uuid-do-municipio"
  }
}
```

### Headers de Autenticação

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

---

## 👥 Usuários

### Listar Usuários

```http
GET /api/users
Authorization: Bearer {token}
```

**Parâmetros de Query:**

- `page` - Página (padrão: 1)
- `limit` - Itens por página (padrão: 20)
- `search` - Busca por nome/email
- `role` - Filtrar por role
- `municipalityId` - Filtrar por município

### Criar Usuário

```http
POST /api/users
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Novo Usuário",
  "email": "novo@exemplo.com",
  "password": "senha123",
  "role": "usuario",
  "municipalityId": "uuid-do-municipio",
  "sector": "setor-responsavel"
}
```

### Atualizar Usuário

```http
PUT /api/users/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Nome Atualizado",
  "role": "admin",
  "isActive": true
}
```

### Deletar Usuário

```http
DELETE /api/users/{id}
Authorization: Bearer {token}
```

---

## 🏛️ Patrimônios

### Listar Patrimônios

```http
GET /api/patrimonios
Authorization: Bearer {token}
```

**Parâmetros de Query:**

- `page` - Página
- `limit` - Itens por página
- `search` - Busca por número/descrição
- `status` - Filtrar por status
- `tipo` - Filtrar por tipo
- `setor` - Filtrar por setor
- `municipalityId` - Filtrar por município

### Criar Patrimônio

```http
POST /api/patrimonios
Authorization: Bearer {token}
Content-Type: application/json

{
  "numero_patrimonio": "PAT-001",
  "descricao": "Computador Desktop",
  "tipo": "INFORMATICA",
  "marca": "Dell",
  "modelo": "OptiPlex 7090",
  "valor_aquisicao": 2500.00,
  "data_aquisicao": "2025-01-15",
  "setor_responsavel": "TI",
  "local_objeto": "Sala 101",
  "municipalityId": "uuid-do-municipio"
}
```

### Atualizar Patrimônio

```http
PUT /api/patrimonios/{id}
Authorization: Bearer {token}
Content-Type: application/json

{
  "descricao": "Descrição Atualizada",
  "status": "ATIVO",
  "local_objeto": "Sala 102"
}
```

### Buscar Patrimônio por Número

```http
GET /api/patrimonios/search/{numero_patrimonio}
Authorization: Bearer {token}
```

### Gerar Etiqueta

```http
POST /api/patrimonios/{id}/etiqueta
Authorization: Bearer {token}
Content-Type: application/json

{
  "templateId": "uuid-do-template"
}
```

---

## 🏠 Imóveis

### Listar Imóveis

```http
GET /api/imoveis
Authorization: Bearer {token}
```

### Criar Imóvel

```http
POST /api/imoveis
Authorization: Bearer {token}
Content-Type: application/json

{
  "numero_imovel": "IMV-001",
  "descricao": "Prédio Administrativo",
  "tipo": "ADMINISTRATIVO",
  "endereco": "Rua Principal, 123",
  "area_construida": 500.00,
  "area_terreno": 1000.00,
  "valor_venal": 500000.00,
  "municipalityId": "uuid-do-municipio"
}
```

---

## 📊 Relatórios

### Gerar Relatório

```http
POST /api/relatorios/generate
Authorization: Bearer {token}
Content-Type: application/json

{
  "tipo": "patrimonios_por_setor",
  "filtros": {
    "municipalityId": "uuid-do-municipio",
    "dataInicio": "2025-01-01",
    "dataFim": "2025-12-31"
  },
  "formato": "pdf"
}
```

### Listar Relatórios Disponíveis

```http
GET /api/relatorios/templates
Authorization: Bearer {token}
```

---

## 🏘️ Municípios

### Listar Municípios

```http
GET /api/municipalities
Authorization: Bearer {token}
```

### Criar Município

```http
POST /api/municipalities
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "São Paulo",
  "state": "SP",
  "cnpj": "12.345.678/0001-90",
  "endereco": "Praça da Sé, 1"
}
```

---

## 🏢 Setores

### Listar Setores

```http
GET /api/sectors
Authorization: Bearer {token}
```

### Criar Setor

```http
POST /api/sectors
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Tecnologia da Informação",
  "description": "Setor responsável pela TI",
  "municipalityId": "uuid-do-municipio"
}
```

---

## 📋 Inventários

### Listar Inventários

```http
GET /api/inventarios
Authorization: Bearer {token}
```

### Criar Inventário

```http
POST /api/inventarios
Authorization: Bearer {token}
Content-Type: application/json

{
  "nome": "Inventário 2025",
  "descricao": "Inventário anual",
  "data_inicio": "2025-01-01",
  "data_fim": "2025-12-31",
  "municipalityId": "uuid-do-municipio"
}
```

---

## 🔄 Transferências

### Listar Transferências

```http
GET /api/transfers
Authorization: Bearer {token}
```

### Criar Transferência

```http
POST /api/transfers
Authorization: Bearer {token}
Content-Type: application/json

{
  "patrimonioId": "uuid-do-patrimonio",
  "setorOrigem": "TI",
  "setorDestino": "Administração",
  "dataTransferencia": "2025-01-15",
  "observacoes": "Transferência temporária"
}
```

---

## 🏷️ Templates de Etiquetas

### Listar Templates

```http
GET /api/label-templates
Authorization: Bearer {token}
```

### Criar Template

```http
POST /api/label-templates
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Template 60x40mm",
  "description": "Template padrão",
  "width": 60,
  "height": 40,
  "elements": [
    {
      "type": "LOGO",
      "x": 5,
      "y": 5,
      "width": 20,
      "height": 15
    },
    {
      "type": "PATRIMONIO_FIELD",
      "content": "numero_patrimonio",
      "x": 5,
      "y": 25,
      "width": 50,
      "height": 12,
      "fontSize": 14,
      "fontWeight": "bold"
    }
  ]
}
```

---

## 🔍 Busca Pública

### Buscar Patrimônio Público

```http
GET /api/patrimonios/public/search
```

**Parâmetros de Query:**

- `q` - Termo de busca
- `municipalityId` - ID do município

### Buscar Imóvel Público

```http
GET /api/imoveis/public/search
```

---

## 📈 Dashboards

### Dashboard do Usuário

```http
GET /api/dashboard/user
Authorization: Bearer {token}
```

### Dashboard do Supervisor

```http
GET /api/dashboard/supervisor
Authorization: Bearer {token}
```

### Dashboard do Superuser

```http
GET /api/dashboard/superuser
Authorization: Bearer {token}
```

---

## 🔧 Sistema

### Health Check

```http
GET /api/health
```

**Resposta:**

```json
{
  "status": "ok",
  "timestamp": "2025-09-09T14:30:00.000Z",
  "service": "SISPAT Backend",
  "version": "1.0.0",
  "environment": "production",
  "uptime": 86400,
  "memory": {
    "rss": 45678912,
    "heapTotal": 20971520,
    "heapUsed": 15728640,
    "external": 1234567
  },
  "database": "connected"
}
```

### Estatísticas do Sistema

```http
GET /api/system/stats
Authorization: Bearer {token}
```

---

## 📤 Exportação

### Exportar Dados

```http
POST /api/export
Authorization: Bearer {token}
Content-Type: application/json

{
  "tipo": "patrimonios",
  "formato": "excel",
  "filtros": {
    "municipalityId": "uuid-do-municipio"
  }
}
```

---

## 🚨 Códigos de Erro

### Códigos HTTP

- `200` - Sucesso
- `201` - Criado com sucesso
- `400` - Dados inválidos
- `401` - Não autenticado
- `403` - Acesso negado
- `404` - Recurso não encontrado
- `409` - Conflito (ex: email já existe)
- `422` - Erro de validação
- `423` - Conta bloqueada
- `429` - Rate limit excedido
- `500` - Erro interno do servidor

### Formato de Erro

```json
{
  "error": "Mensagem de erro",
  "code": "ERROR_CODE",
  "details": {
    "field": "Campo com erro",
    "message": "Descrição específica"
  },
  "timestamp": "2025-09-09T14:30:00.000Z"
}
```

---

## 🔒 Rate Limiting

### Limites por Endpoint

- **Geral:** 100 requests/minuto
- **Autenticação:** 5 tentativas/minuto
- **APIs Críticas:** 30 requests/minuto
- **Upload:** 10 uploads/5 minutos
- **Relatórios:** 5 relatórios/5 minutos
- **Público:** 200 requests/minuto

### Headers de Rate Limit

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

---

## 📝 Exemplos de Uso

### JavaScript/Node.js

```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'https://seudominio.com/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Login
async function login(email, password, municipalityId) {
  const response = await api.post('/auth/login', {
    email,
    password,
    municipalityId,
  });

  api.defaults.headers.Authorization = `Bearer ${response.data.token}`;
  return response.data;
}

// Listar patrimônios
async function getPatrimonios(page = 1, limit = 20) {
  const response = await api.get('/patrimonios', {
    params: { page, limit },
  });
  return response.data;
}

// Criar patrimônio
async function createPatrimonio(patrimonio) {
  const response = await api.post('/patrimonios', patrimonio);
  return response.data;
}
```

### Python

```python
import requests

class SISPATClient:
    def __init__(self, base_url, token=None):
        self.base_url = base_url
        self.session = requests.Session()
        if token:
            self.session.headers.update({
                'Authorization': f'Bearer {token}'
            })

    def login(self, email, password, municipality_id):
        response = self.session.post(f'{self.base_url}/auth/login', json={
            'email': email,
            'password': password,
            'municipalityId': municipality_id
        })
        data = response.json()
        self.session.headers.update({
            'Authorization': f'Bearer {data["token"]}'
        })
        return data

    def get_patrimonios(self, page=1, limit=20):
        response = self.session.get(f'{self.base_url}/patrimonios', params={
            'page': page,
            'limit': limit
        })
        return response.json()
```

### PHP

```php
<?php
class SISPATClient {
    private $baseUrl;
    private $token;

    public function __construct($baseUrl) {
        $this->baseUrl = $baseUrl;
    }

    public function login($email, $password, $municipalityId) {
        $response = $this->post('/auth/login', [
            'email' => $email,
            'password' => $password,
            'municipalityId' => $municipalityId
        ]);

        $this->token = $response['token'];
        return $response;
    }

    public function getPatrimonios($page = 1, $limit = 20) {
        return $this->get('/patrimonios', [
            'page' => $page,
            'limit' => $limit
        ]);
    }

    private function get($endpoint, $params = []) {
        $url = $this->baseUrl . $endpoint;
        if (!empty($params)) {
            $url .= '?' . http_build_query($params);
        }

        $headers = ['Content-Type: application/json'];
        if ($this->token) {
            $headers[] = 'Authorization: Bearer ' . $this->token;
        }

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        $response = curl_exec($ch);
        curl_close($ch);

        return json_decode($response, true);
    }

    private function post($endpoint, $data) {
        $url = $this->baseUrl . $endpoint;

        $headers = ['Content-Type: application/json'];
        if ($this->token) {
            $headers[] = 'Authorization: Bearer ' . $this->token;
        }

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        $response = curl_exec($ch);
        curl_close($ch);

        return json_decode($response, true);
    }
}
?>
```

---

## 📚 Recursos Adicionais

### Documentação

- 📖 [Guia de Instalação](GUIA-INSTALACAO-2025.md)
- 🔒 [Guia de Segurança](AUDITORIA-SEGURANCA-2025.md)
- ⚡ [Relatório de Performance](RELATORIO-PERFORMANCE-2025.md)

### Ferramentas

- 🧪 [Postman Collection](postman/SISPAT-API.postman_collection.json)
- 📊 [OpenAPI Spec](openapi/sispat-api.yaml)
- 🔧 [SDK JavaScript](sdk/sispat-js/)

---

**Versão da API:** v1  
**Última Atualização:** 09/09/2025  
**Status:** ✅ Estável e Documentada
