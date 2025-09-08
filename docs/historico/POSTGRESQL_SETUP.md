# Guia de Instalação e Configuração do PostgreSQL

## 1. Instalação do PostgreSQL

### Opção 1: Instalação via Instalador Oficial

1. Acesse: https://www.postgresql.org/download/windows/
2. Baixe o instalador para Windows
3. Execute o instalador como administrador
4. Durante a instalação:
   - Defina a senha do usuário `postgres` como `postgres`
   - Mantenha a porta padrão `5432`
   - Instale todas as ferramentas (pgAdmin, etc.)

### Opção 2: Instalação via Chocolatey (recomendado)

```powershell
# Instalar Chocolatey primeiro (se não tiver)
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Instalar PostgreSQL
choco install postgresql
```

### Opção 3: Instalação via Docker

```powershell
# Instalar Docker Desktop primeiro
# Depois executar:
docker run --name postgres-sispat -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=sispat_db -p 5432:5432 -d postgres:15
```

## 2. Configuração do PostgreSQL

### Verificar se o PostgreSQL está rodando

```powershell
# Verificar se o serviço está ativo
Get-Service postgresql*

# Ou verificar se a porta 5432 está em uso
netstat -an | findstr :5432
```

### Conectar ao PostgreSQL

```powershell
# Conectar como usuário postgres
psql -U postgres -h localhost

# Dentro do psql, criar o banco de dados
CREATE DATABASE sispat_db;
\q
```

## 3. Configuração do Projeto

### 1. Verificar o arquivo .env

Certifique-se de que o arquivo `.env` tenha as configurações corretas:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sispat_db
DB_USER=postgres
DB_PASSWORD=6273
```

### 2. Executar as migrações

```powershell
pnpm run db:migrate
```

### 3. Executar o seed inicial

```powershell
pnpm run db:seed
```

### 4. Iniciar o projeto

```powershell
pnpm run dev
```

## 4. Solução de Problemas

### Problema: "psql não é reconhecido"

**Solução**: Adicione o PostgreSQL ao PATH do sistema

1. Vá em "Este PC" → "Propriedades" → "Configurações avançadas do sistema"
2. Clique em "Variáveis de ambiente"
3. Em "Variáveis do sistema", encontre "Path" e clique em "Editar"
4. Adicione: `C:\Program Files\PostgreSQL\15\bin` (ajuste a versão conforme necessário)
5. Reinicie o PowerShell

### Problema: "Connection refused"

**Solução**: Verificar se o PostgreSQL está rodando

```powershell
# Iniciar o serviço
Start-Service postgresql*

# Ou reiniciar
Restart-Service postgresql*
```

### Problema: "Authentication failed"

**Solução**: Verificar senha do usuário postgres

```powershell
# Conectar e alterar senha
psql -U postgres -h localhost
ALTER USER postgres PASSWORD 'postgres';
\q
```

## 5. Comandos Úteis

### Verificar status do banco

```powershell
psql -U postgres -h localhost -d sispat_db -c "\dt"
```

### Fazer backup

```powershell
pg_dump -U postgres -h localhost sispat_db > backup.sql
```

### Restaurar backup

```powershell
psql -U postgres -h localhost sispat_db < backup.sql
```

## 6. Acesso ao Sistema

Após a configuração, o sistema estará disponível em:

- **Frontend**: http://localhost:8080
- **Backend**: http://localhost:3001/api

**Login inicial**:

- Email: junielsonfarias@gmail.com
- Senha: Tiko6273@
