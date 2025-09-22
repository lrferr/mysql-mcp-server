# 📚 Documentação da API

Este documento descreve todas as ferramentas e funcionalidades disponíveis no MySQL MCP Server.

## 🔗 Múltiplas Conexões

### `list_connections`
Lista todas as conexões MySQL configuradas.

**Parâmetros**: Nenhum

**Retorno**: Lista de conexões disponíveis com descrições e ambientes.

**Exemplo**:
```javascript
// Retorna:
{
  "connections": [
    {
      "name": "dev",
      "description": "Development Database",
      "environment": "development"
    },
    {
      "name": "prod",
      "description": "Production Database", 
      "environment": "production"
    }
  ]
}
```

### `test_connection`
Testa uma conexão específica.

**Parâmetros**:
- `connectionName` (string, opcional): Nome da conexão para testar

**Retorno**: Status da conexão e informações básicas.

**Exemplo**:
```javascript
// Parâmetros
{
  "connectionName": "dev"
}

// Retorno
{
  "success": true,
  "message": "Conexão 'dev' testada com sucesso",
  "connection": {
    "host": "localhost",
    "port": 3306,
    "user": "dev_user",
    "database": "dev_db"
  }
}
```

### `test_all_connections`
Testa todas as conexões configuradas.

**Parâmetros**: Nenhum

**Retorno**: Status de todas as conexões.

**Exemplo**:
```javascript
// Retorno
{
  "dev": {
    "success": true,
    "message": "Conexão 'dev' testada com sucesso"
  },
  "prod": {
    "success": false,
    "message": "Falha no teste da conexão 'prod': Connection refused"
  }
}
```

### `get_connections_status`
Obtém o status de todas as conexões ativas.

**Parâmetros**: Nenhum

**Retorno**: Status detalhado das conexões ativas.

**Exemplo**:
```javascript
// Retorno
{
  "dev": {
    "active": true,
    "info": {
      "connection_name": "dev",
      "current_database": "dev_db",
      "current_user": "dev_user@localhost",
      "mysql_version": "8.0.35",
      "current_time": "2024-12-19 10:30:00"
    }
  }
}
```

## 📊 Monitoramento

### `check_database_health`
Verifica a saúde geral do banco de dados MySQL.

**Parâmetros**:
- `checkConnections` (boolean, padrão: true): Verificar conexões ativas
- `checkStorage` (boolean, padrão: true): Verificar espaço em disco
- `checkPerformance` (boolean, padrão: true): Verificar métricas de performance
- `connectionName` (string, opcional): Nome da conexão para usar

**Retorno**: Relatório de saúde do banco.

**Exemplo**:
```javascript
// Parâmetros
{
  "checkConnections": true,
  "checkStorage": true,
  "checkPerformance": true,
  "connectionName": "dev"
}

// Retorno
"### Conexões Ativas
- Total de Conexões: 5
- Conexões Ativas: 2
- Conexões Dormindo: 3

### Status do Armazenamento
📊 **dev_db**: 25.50MB (Livre: 1024.00MB)
📊 **test_db**: 10.25MB (Livre: 1024.00MB)

### Métricas de Performance
- Uptime (seconds): 86400
- Questions (total queries): 1500
- Slow Queries: 5
- Aborted Clients: 0
- Connections (total): 25"
```

### `monitor_schema_changes`
Monitora mudanças em esquemas/bancos de dados críticos.

**Parâmetros**:
- `databases` (array, padrão: ['information_schema', 'mysql', 'performance_schema']): Lista de bancos para monitorar
- `checkInterval` (number, padrão: 5): Intervalo de verificação em minutos

**Retorno**: Relatório de mudanças detectadas.

**Exemplo**:
```javascript
// Parâmetros
{
  "databases": ["information_schema", "mysql"],
  "checkInterval": 5
}

// Retorno
"### Mudanças no Banco de Dados information_schema
📄 TABLE tables - Criado: 2024-12-19 10:00:00, Última Atualização: 2024-12-19 10:30:00
📄 TABLE columns - Criado: 2024-12-19 10:00:00, Última Atualização: 2024-12-19 10:25:00"
```

### `check_sensitive_tables`
Verifica alterações em tabelas sensíveis.

**Parâmetros**:
- `tables` (array): Lista de tabelas sensíveis para verificar
- `database` (string, opcional): Banco de dados onde as tabelas estão
- `checkDataChanges` (boolean, padrão: true): Verificar mudanças nos dados

**Retorno**: Relatório de mudanças em tabelas sensíveis.

**Exemplo**:
```javascript
// Parâmetros
{
  "tables": ["users", "payments"],
  "database": "app_db",
  "checkDataChanges": true
}

// Retorno
"### Tabela app_db.users
**Estrutura:**
- **id** int(11) NOT NULL AUTO_INCREMENT
- **name** varchar(100) NULL
- **email** varchar(100) NULL
- **created_at** timestamp NULL DEFAULT CURRENT_TIMESTAMP
**Contagem de Linhas:** 150

### Tabela app_db.payments
**Estrutura:**
- **id** int(11) NOT NULL AUTO_INCREMENT
- **user_id** int(11) NOT NULL
- **amount** decimal(10,2) NOT NULL
- **status** varchar(20) NOT NULL
**Contagem de Linhas:** 75"
```

### `detect_suspicious_activity`
Detecta atividades suspeitas no banco de dados.

**Parâmetros**:
- `connectionName` (string, opcional): Nome da conexão para usar

**Retorno**: Relatório de atividades suspeitas detectadas.

**Exemplo**:
```javascript
// Parâmetros
{
  "connectionName": "dev"
}

// Retorno
"🔍 **Análise de Atividades Suspeitas**

### Conexões Anômalas
- Múltiplas conexões do mesmo IP em curto período
- Conexões fora do horário comercial

### Queries Suspeitas
- Tentativas de acesso a tabelas sensíveis
- Queries com padrões suspeitos

### Recomendações
- Revisar logs de acesso
- Verificar permissões de usuários
- Implementar rate limiting"
```

## 🔍 Análise e Informações

### `execute_safe_query`
Executa uma query de forma segura (apenas SELECT).

**Parâmetros**:
- `query` (string): Query SQL para executar (apenas SELECT permitido)
- `database` (string, opcional): Banco de dados para executar a query

**Retorno**: Resultados da query em formato de tabela.

**Exemplo**:
```javascript
// Parâmetros
{
  "query": "SELECT id, name, email FROM users LIMIT 10",
  "database": "app_db"
}

// Retorno
"| id | name | email |
| --- | --- | --- |
| 1 | João Silva | joao@example.com |
| 2 | Maria Santos | maria@example.com |
| 3 | Pedro Oliveira | pedro@example.com |"
```

### `get_database_info`
Obtém informações gerais sobre o banco de dados MySQL.

**Parâmetros**:
- `includeUsers` (boolean, padrão: false): Incluir informações de usuários
- `includeDatabases` (boolean, padrão: true): Incluir informações de bancos de dados
- `connectionName` (string, opcional): Nome da conexão para usar

**Retorno**: Informações detalhadas do banco.

**Exemplo**:
```javascript
// Parâmetros
{
  "includeUsers": true,
  "includeDatabases": true,
  "connectionName": "dev"
}

// Retorno
"### Informações Básicas
- **Versão MySQL:** 8.0.35
- **Uptime:** 86400 segundos
- **Conexões Ativas:** 5

### Bancos de Dados
📁 **app_db** - Charset: utf8mb4, Collation: utf8mb4_0900_ai_ci
📁 **test_db** - Charset: utf8mb4, Collation: utf8mb4_0900_ai_ci

### Usuários
👤 **app_user**@'localhost'
👤 **test_user**@'localhost'"
```

### `get_table_info`
Obtém informações detalhadas sobre uma tabela específica.

**Parâmetros**:
- `tableName` (string): Nome da tabela
- `database` (string, opcional): Banco de dados da tabela
- `includeConstraints` (boolean, padrão: true): Incluir informações de constraints
- `includeIndexes` (boolean, padrão: true): Incluir informações de índices

**Retorno**: Informações detalhadas da tabela.

**Exemplo**:
```javascript
// Parâmetros
{
  "tableName": "users",
  "database": "app_db",
  "includeConstraints": true,
  "includeIndexes": true
}

// Retorno
"### Informações Básicas
- **Nome:** users
- **Banco de Dados:** app_db
- **Linhas:** 150
- **Tamanho Dados:** 2.50 MB
- **Tamanho Índices:** 0.25 MB
- **Criada em:** 2024-12-19 10:00:00
- **Última Atualização:** 2024-12-19 10:30:00

### Colunas
- **id** int(11) NOT NULL AUTO_INCREMENT
- **name** varchar(100) NULL
- **email** varchar(100) NULL
- **created_at** timestamp NULL DEFAULT CURRENT_TIMESTAMP

### Constraints
- **PRIMARY** (PRIMARY KEY)

### Índices
- **PRIMARY** (id) - Tipo: BTREE, UNIQUE"
```

### `get_constraints`
Lista constraints de uma tabela ou banco de dados.

**Parâmetros**:
- `tableName` (string, opcional): Nome da tabela
- `database` (string, opcional): Banco de dados para buscar constraints
- `constraintType` (string, padrão: 'ALL'): Tipo de constraint para filtrar

**Retorno**: Lista de constraints encontradas.

**Exemplo**:
```javascript
// Parâmetros
{
  "tableName": "users",
  "database": "app_db",
  "constraintType": "ALL"
}

// Retorno
"### Tabela app_db.users
- **PRIMARY** (PRIMARY KEY)
- **email_unique** (UNIQUE)"
```

### `get_foreign_keys`
Lista chaves estrangeiras e suas referências.

**Parâmetros**:
- `tableName` (string, opcional): Nome da tabela
- `database` (string, opcional): Banco de dados para buscar foreign keys
- `showReferenced` (boolean, padrão: true): Mostrar tabelas referenciadas

**Retorno**: Lista de chaves estrangeiras.

**Exemplo**:
```javascript
// Parâmetros
{
  "tableName": "orders",
  "database": "app_db",
  "showReferenced": true
}

// Retorno
"**FK: fk_orders_user_id** na tabela app_db.orders → app_db.users:
  - Coluna: user_id referencia id"
```

### `get_indexes`
Lista índices de uma tabela ou banco de dados.

**Parâmetros**:
- `tableName` (string, opcional): Nome da tabela
- `database` (string, opcional): Banco de dados para buscar índices
- `includeStats` (boolean, padrão: false): Incluir estatísticas dos índices

**Retorno**: Lista de índices encontrados.

**Exemplo**:
```javascript
// Parâmetros
{
  "tableName": "users",
  "database": "app_db",
  "includeStats": false
}

// Retorno
"### Tabela app_db.users
- **PRIMARY** (id) - Tipo: BTREE, UNIQUE
- **email_unique** (email) - Tipo: BTREE, UNIQUE
- **name_index** (name) - Tipo: BTREE, NON-UNIQUE"
```

### `get_triggers`
Lista triggers de uma tabela ou banco de dados.

**Parâmetros**:
- `tableName` (string, opcional): Nome da tabela
- `database` (string, opcional): Banco de dados para buscar triggers
- `includeCode` (boolean, padrão: false): Incluir código dos triggers

**Retorno**: Lista de triggers encontrados.

**Exemplo**:
```javascript
// Parâmetros
{
  "tableName": "users",
  "database": "app_db",
  "includeCode": true
}

// Retorno
"### Tabela app_db.users
- **trg_users_updated_at** (BEFORE UPDATE)
  - Código:
```sql
BEGIN
  SET NEW.updated_at = NOW();
END
```"
```

### `get_users_privileges`
Lista usuários e seus privilégios.

**Parâmetros**:
- `user` (string, opcional): Usuário específico
- `includeRoles` (boolean, padrão: true): Incluir roles do usuário
- `includeSystemPrivs` (boolean, padrão: false): Incluir privilégios de sistema

**Retorno**: Lista de usuários e privilégios.

**Exemplo**:
```javascript
// Parâmetros
{
  "user": "app_user",
  "includeRoles": true,
  "includeSystemPrivs": false
}

// Retorno
"👤 **app_user**@'localhost'
- Privilégios: SELECT, INSERT, UPDATE, DELETE
- Roles: app_role"
```

### `get_table_dependencies`
Mostra dependências de uma tabela.

**Parâmetros**:
- `tableName` (string): Nome da tabela
- `database` (string, opcional): Banco de dados da tabela
- `dependencyType` (string, padrão: 'ALL'): Tipo de dependência

**Retorno**: Dependências da tabela.

**Exemplo**:
```javascript
// Parâmetros
{
  "tableName": "users",
  "database": "app_db",
  "dependencyType": "ALL"
}

// Retorno
"### Dependências da Tabela app_db.users

#### Tabelas que dependem de users:
- orders (via fk_orders_user_id)
- profiles (via fk_profiles_user_id)

#### Tabelas que users depende:
- Nenhuma dependência encontrada"
```

### `analyze_table`
Analisa uma tabela e gera estatísticas.

**Parâmetros**:
- `tableName` (string): Nome da tabela
- `database` (string, opcional): Banco de dados da tabela

**Retorno**: Resultado da análise da tabela.

**Exemplo**:
```javascript
// Parâmetros
{
  "tableName": "users",
  "database": "app_db"
}

// Retorno
"✅ Análise da tabela app_db.users concluída com sucesso.
Estatísticas atualizadas para otimização de queries."
```

## 🔧 Operações DDL

### `create_table`
Cria uma nova tabela no banco de dados.

**Parâmetros**:
- `tableName` (string): Nome da tabela
- `database` (string, opcional): Banco de dados da tabela
- `columns` (array): Lista de colunas da tabela
- `constraints` (array, opcional): Lista de constraints da tabela
- `ifNotExists` (boolean, padrão: true): Criar apenas se não existir

**Retorno**: Confirmação da criação da tabela.

**Exemplo**:
```javascript
// Parâmetros
{
  "tableName": "products",
  "database": "app_db",
  "columns": [
    {
      "name": "id",
      "type": "INT",
      "notNull": true,
      "primaryKey": true,
      "autoIncrement": true
    },
    {
      "name": "name",
      "type": "VARCHAR",
      "length": 100,
      "notNull": true
    },
    {
      "name": "price",
      "type": "DECIMAL",
      "precision": 10,
      "scale": 2,
      "notNull": true
    }
  ],
  "constraints": [
    {
      "name": "uk_products_name",
      "type": "UNIQUE",
      "columns": ["name"]
    }
  ],
  "ifNotExists": true
}

// Retorno
"✅ Tabela app_db.products criada com sucesso.
Colunas: id (INT, PRIMARY KEY, AUTO_INCREMENT), name (VARCHAR(100), NOT NULL), price (DECIMAL(10,2), NOT NULL)
Constraints: uk_products_name (UNIQUE)"
```

### `alter_table`
Altera uma tabela existente.

**Parâmetros**:
- `tableName` (string): Nome da tabela
- `database` (string, opcional): Banco de dados da tabela
- `operation` (string): Tipo de operação
- Outros parâmetros dependem da operação

**Retorno**: Confirmação da alteração da tabela.

**Exemplo**:
```javascript
// Parâmetros para adicionar coluna
{
  "tableName": "users",
  "database": "app_db",
  "operation": "ADD_COLUMN",
  "columnName": "phone",
  "columnType": "VARCHAR",
  "columnLength": 20,
  "notNull": false
}

// Retorno
"✅ Coluna 'phone' adicionada à tabela app_db.users com sucesso."
```

### `drop_table`
Remove uma tabela do banco de dados.

**Parâmetros**:
- `tableName` (string): Nome da tabela
- `database` (string, opcional): Banco de dados da tabela
- `ifExists` (boolean, padrão: true): Remover apenas se existir

**Retorno**: Confirmação da remoção da tabela.

**Exemplo**:
```javascript
// Parâmetros
{
  "tableName": "old_table",
  "database": "app_db",
  "ifExists": true
}

// Retorno
"✅ Tabela app_db.old_table removida com sucesso."
```

## 📊 Operações DML

### `select_data`
Executa uma consulta SELECT no banco de dados.

**Parâmetros**:
- `tableName` (string): Nome da tabela
- `database` (string, opcional): Banco de dados da tabela
- `columns` (array, padrão: ['*']): Lista de colunas para selecionar
- `whereClause` (string, opcional): Condição WHERE
- `orderBy` (string, opcional): Ordenação dos resultados
- `limit` (number, opcional): Limite de linhas
- `offset` (number, padrão: 0): Offset para paginação

**Retorno**: Resultados da consulta.

**Exemplo**:
```javascript
// Parâmetros
{
  "tableName": "users",
  "database": "app_db",
  "columns": ["id", "name", "email"],
  "whereClause": "created_at > '2024-01-01'",
  "orderBy": "name ASC",
  "limit": 10,
  "offset": 0
}

// Retorno
"| id | name | email |
| --- | --- | --- |
| 1 | João Silva | joao@example.com |
| 2 | Maria Santos | maria@example.com |"
```

### `insert_data`
Insere dados em uma tabela.

**Parâmetros**:
- `tableName` (string): Nome da tabela
- `database` (string, opcional): Banco de dados da tabela
- `data` (object): Dados para inserir (objeto chave-valor)
- `columns` (array, opcional): Lista de colunas
- `values` (array, opcional): Lista de valores

**Retorno**: Confirmação da inserção.

**Exemplo**:
```javascript
// Parâmetros
{
  "tableName": "users",
  "database": "app_db",
  "data": {
    "name": "Pedro Oliveira",
    "email": "pedro@example.com"
  }
}

// Retorno
"✅ Dados inseridos na tabela app_db.users com sucesso.
ID gerado: 151"
```

### `update_data`
Atualiza dados em uma tabela.

**Parâmetros**:
- `tableName` (string): Nome da tabela
- `database` (string, opcional): Banco de dados da tabela
- `data` (object): Dados para atualizar (objeto chave-valor)
- `whereClause` (string): Condição WHERE

**Retorno**: Confirmação da atualização.

**Exemplo**:
```javascript
// Parâmetros
{
  "tableName": "users",
  "database": "app_db",
  "data": {
    "name": "Pedro Santos"
  },
  "whereClause": "id = 151"
}

// Retorno
"✅ Dados atualizados na tabela app_db.users com sucesso.
Linhas afetadas: 1"
```

### `delete_data`
Remove dados de uma tabela.

**Parâmetros**:
- `tableName` (string): Nome da tabela
- `database` (string, opcional): Banco de dados da tabela
- `whereClause` (string): Condição WHERE (obrigatória)

**Retorno**: Confirmação da remoção.

**Exemplo**:
```javascript
// Parâmetros
{
  "tableName": "users",
  "database": "app_db",
  "whereClause": "id = 151"
}

// Retorno
"✅ Dados removidos da tabela app_db.users com sucesso.
Linhas afetadas: 1"
```

## 🔐 Operações DCL

### `create_user`
Cria um novo usuário no banco de dados MySQL.

**Parâmetros**:
- `username` (string): Nome do usuário
- `password` (string): Senha do usuário
- `host` (string, padrão: '%'): Host para o usuário
- `ifNotExists` (boolean, padrão: true): Criar apenas se não existir

**Retorno**: Confirmação da criação do usuário.

**Exemplo**:
```javascript
// Parâmetros
{
  "username": "new_user",
  "password": "secure_password",
  "host": "localhost",
  "ifNotExists": true
}

// Retorno
"✅ Usuário 'new_user'@'localhost' criado com sucesso."
```

### `grant_privileges`
Concede privilégios a um usuário.

**Parâmetros**:
- `privileges` (array): Lista de privilégios
- `onObject` (string): Objeto para conceder privilégios
- `toUser` (string): Usuário de destino
- `toHost` (string, padrão: '%'): Host do usuário de destino
- `withGrantOption` (boolean, padrão: false): Com opção de conceder

**Retorno**: Confirmação da concessão de privilégios.

**Exemplo**:
```javascript
// Parâmetros
{
  "privileges": ["SELECT", "INSERT", "UPDATE"],
  "onObject": "app_db.*",
  "toUser": "new_user",
  "toHost": "localhost",
  "withGrantOption": false
}

// Retorno
"✅ Privilégios concedidos ao usuário 'new_user'@'localhost' com sucesso.
Privilégios: SELECT, INSERT, UPDATE
Objeto: app_db.*"
```

### `revoke_privileges`
Revoga privilégios de um usuário.

**Parâmetros**:
- `privileges` (array): Lista de privilégios
- `onObject` (string): Objeto para revogar privilégios
- `fromUser` (string): Usuário de origem
- `fromHost` (string, padrão: '%'): Host do usuário de origem

**Retorno**: Confirmação da revogação de privilégios.

**Exemplo**:
```javascript
// Parâmetros
{
  "privileges": ["UPDATE"],
  "onObject": "app_db.*",
  "fromUser": "new_user",
  "fromHost": "localhost"
}

// Retorno
"✅ Privilégios revogados do usuário 'new_user'@'localhost' com sucesso.
Privilégios revogados: UPDATE
Objeto: app_db.*"
```

## 🔍 Auditoria

### `generate_audit_report`
Gera relatório de auditoria das operações.

**Parâmetros**:
- `startDate` (string, opcional): Data de início (ISO string)
- `endDate` (string, opcional): Data de fim (ISO string)
- `user` (string, opcional): Filtrar por usuário
- `operation` (string, opcional): Filtrar por operação
- `success` (boolean, opcional): Filtrar por sucesso/falha

**Retorno**: Relatório de auditoria.

**Exemplo**:
```javascript
// Parâmetros
{
  "startDate": "2024-12-01T00:00:00Z",
  "endDate": "2024-12-19T23:59:59Z",
  "user": "app_user",
  "operation": "SELECT"
}

// Retorno
"📊 **Relatório de Auditoria**

### Período: 2024-12-01 a 2024-12-19
### Usuário: app_user
### Operação: SELECT

### Resumo
- Total de operações: 150
- Operações bem-sucedidas: 148
- Operações falhadas: 2
- Taxa de sucesso: 98.67%

### Detalhes
- 2024-12-19 10:30:00 - SELECT users - Sucesso
- 2024-12-19 10:25:00 - SELECT orders - Sucesso
- 2024-12-19 10:20:00 - SELECT products - Falha"
```

## 🚨 Tratamento de Erros

### Códigos de Erro Comuns

- **CONNECTION_ERROR**: Erro de conexão com o banco
- **AUTHENTICATION_ERROR**: Erro de autenticação
- **PERMISSION_ERROR**: Erro de permissão
- **VALIDATION_ERROR**: Erro de validação de entrada
- **QUERY_ERROR**: Erro na execução de query
- **TIMEOUT_ERROR**: Timeout na operação

### Formato de Erro
```javascript
{
  "error": true,
  "code": "CONNECTION_ERROR",
  "message": "Falha na conexão com o banco de dados",
  "details": "Connection refused: connect ECONNREFUSED 127.0.0.1:3306"
}
```

## 📝 Notas Importantes

### Segurança
- Apenas queries SELECT são permitidas em `execute_safe_query`
- Todas as entradas são validadas e sanitizadas
- Operações sensíveis são logadas
- Rate limiting é aplicado automaticamente

### Performance
- Pool de conexões é usado para melhor performance
- Queries são otimizadas automaticamente
- Cache é implementado para operações frequentes
- Timeouts são configuráveis

### Compatibilidade
- MySQL 5.7+ e MariaDB 10.3+
- Node.js 18.0.0+
- Suporte a múltiplas conexões simultâneas
- Compatível com Cursor IDE e Claude Desktop

---

**Documentação da API completa! 📚**





