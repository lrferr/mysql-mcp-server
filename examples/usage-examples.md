# 📚 Exemplos de Uso

Este documento fornece exemplos práticos de como usar o MySQL MCP Server.

## 🔗 Múltiplas Conexões

### Listar Conexões Disponíveis
```javascript
// Use a ferramenta list_connections
// Retorna todas as conexões configuradas

// Exemplo de retorno:
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

### Testar Conexão Específica
```javascript
// Use a ferramenta test_connection
// Parâmetros:
{
  "connectionName": "dev"
}

// Exemplo de retorno:
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

### Verificar Status de Todas as Conexões
```javascript
// Use a ferramenta get_connections_status
// Retorna status detalhado de todas as conexões ativas

// Exemplo de retorno:
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
  },
  "prod": {
    "active": false,
    "error": "Connection refused"
  }
}
```

## 📊 Monitoramento

### Verificar Saúde do Banco
```javascript
// Use a ferramenta check_database_health
// Parâmetros:
{
  "checkConnections": true,
  "checkStorage": true,
  "checkPerformance": true,
  "connectionName": "dev"
}

// Exemplo de retorno:
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

### Monitorar Mudanças de Schema
```javascript
// Use a ferramenta monitor_schema_changes
// Parâmetros:
{
  "databases": ["information_schema", "mysql"],
  "checkInterval": 5
}

// Exemplo de retorno:
"### Mudanças no Banco de Dados information_schema
📄 TABLE tables - Criado: 2024-12-19 10:00:00, Última Atualização: 2024-12-19 10:30:00
📄 TABLE columns - Criado: 2024-12-19 10:00:00, Última Atualização: 2024-12-19 10:25:00"
```

### Verificar Tabelas Sensíveis
```javascript
// Use a ferramenta check_sensitive_tables
// Parâmetros:
{
  "tables": ["users", "payments"],
  "database": "app_db",
  "checkDataChanges": true
}

// Exemplo de retorno:
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

### Detectar Atividades Suspeitas
```javascript
// Use a ferramenta detect_suspicious_activity
// Parâmetros:
{
  "connectionName": "dev"
}

// Exemplo de retorno:
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

### Executar Query Segura
```javascript
// Use a ferramenta execute_safe_query
// Parâmetros:
{
  "query": "SELECT id, name, email FROM users LIMIT 10",
  "database": "app_db"
}

// Exemplo de retorno:
"| id | name | email |
| --- | --- | --- |
| 1 | João Silva | joao@example.com |
| 2 | Maria Santos | maria@example.com |
| 3 | Pedro Oliveira | pedro@example.com |"
```

### Obter Informações do Banco
```javascript
// Use a ferramenta get_database_info
// Parâmetros:
{
  "includeUsers": true,
  "includeDatabases": true,
  "connectionName": "dev"
}

// Exemplo de retorno:
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

### Obter Informações da Tabela
```javascript
// Use a ferramenta get_table_info
// Parâmetros:
{
  "tableName": "users",
  "database": "app_db",
  "includeConstraints": true,
  "includeIndexes": true
}

// Exemplo de retorno:
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

### Listar Constraints
```javascript
// Use a ferramenta get_constraints
// Parâmetros:
{
  "tableName": "users",
  "database": "app_db",
  "constraintType": "ALL"
}

// Exemplo de retorno:
"### Tabela app_db.users
- **PRIMARY** (PRIMARY KEY)
- **email_unique** (UNIQUE)"
```

### Listar Chaves Estrangeiras
```javascript
// Use a ferramenta get_foreign_keys
// Parâmetros:
{
  "tableName": "orders",
  "database": "app_db",
  "showReferenced": true
}

// Exemplo de retorno:
"**FK: fk_orders_user_id** na tabela app_db.orders → app_db.users:
  - Coluna: user_id referencia id"
```

### Listar Índices
```javascript
// Use a ferramenta get_indexes
// Parâmetros:
{
  "tableName": "users",
  "database": "app_db",
  "includeStats": false
}

// Exemplo de retorno:
"### Tabela app_db.users
- **PRIMARY** (id) - Tipo: BTREE, UNIQUE
- **email_unique** (email) - Tipo: BTREE, UNIQUE
- **name_index** (name) - Tipo: BTREE, NON-UNIQUE"
```

### Listar Triggers
```javascript
// Use a ferramenta get_triggers
// Parâmetros:
{
  "tableName": "users",
  "database": "app_db",
  "includeCode": true
}

// Exemplo de retorno:
"### Tabela app_db.users
- **trg_users_updated_at** (BEFORE UPDATE)
  - Código:
```sql
BEGIN
  SET NEW.updated_at = NOW();
END
```"
```

### Analisar Tabela
```javascript
// Use a ferramenta analyze_table
// Parâmetros:
{
  "tableName": "users",
  "database": "app_db"
}

// Exemplo de retorno:
"✅ Análise da tabela app_db.users concluída com sucesso.
Estatísticas atualizadas para otimização de queries."
```

## 🔧 Operações DDL

### Criar Tabela
```javascript
// Use a ferramenta create_table
// Parâmetros:
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

// Exemplo de retorno:
"✅ Tabela app_db.products criada com sucesso.
Colunas: id (INT, PRIMARY KEY, AUTO_INCREMENT), name (VARCHAR(100), NOT NULL), price (DECIMAL(10,2), NOT NULL)
Constraints: uk_products_name (UNIQUE)"
```

### Alterar Tabela
```javascript
// Use a ferramenta alter_table para adicionar coluna
// Parâmetros:
{
  "tableName": "users",
  "database": "app_db",
  "operation": "ADD_COLUMN",
  "columnName": "phone",
  "columnType": "VARCHAR",
  "columnLength": 20,
  "notNull": false
}

// Exemplo de retorno:
"✅ Coluna 'phone' adicionada à tabela app_db.users com sucesso."
```

### Remover Tabela
```javascript
// Use a ferramenta drop_table
// Parâmetros:
{
  "tableName": "old_table",
  "database": "app_db",
  "ifExists": true
}

// Exemplo de retorno:
"✅ Tabela app_db.old_table removida com sucesso."
```

## 📊 Operações DML

### Consultar Dados
```javascript
// Use a ferramenta select_data
// Parâmetros:
{
  "tableName": "users",
  "database": "app_db",
  "columns": ["id", "name", "email"],
  "whereClause": "created_at > '2024-01-01'",
  "orderBy": "name ASC",
  "limit": 10,
  "offset": 0
}

// Exemplo de retorno:
"| id | name | email |
| --- | --- | --- |
| 1 | João Silva | joao@example.com |
| 2 | Maria Santos | maria@example.com |"
```

### Inserir Dados
```javascript
// Use a ferramenta insert_data
// Parâmetros:
{
  "tableName": "users",
  "database": "app_db",
  "data": {
    "name": "Pedro Oliveira",
    "email": "pedro@example.com"
  }
}

// Exemplo de retorno:
"✅ Dados inseridos na tabela app_db.users com sucesso.
ID gerado: 151"
```

### Atualizar Dados
```javascript
// Use a ferramenta update_data
// Parâmetros:
{
  "tableName": "users",
  "database": "app_db",
  "data": {
    "name": "Pedro Santos"
  },
  "whereClause": "id = 151"
}

// Exemplo de retorno:
"✅ Dados atualizados na tabela app_db.users com sucesso.
Linhas afetadas: 1"
```

### Remover Dados
```javascript
// Use a ferramenta delete_data
// Parâmetros:
{
  "tableName": "users",
  "database": "app_db",
  "whereClause": "id = 151"
}

// Exemplo de retorno:
"✅ Dados removidos da tabela app_db.users com sucesso.
Linhas afetadas: 1"
```

## 🔐 Operações DCL

### Criar Usuário
```javascript
// Use a ferramenta create_user
// Parâmetros:
{
  "username": "new_user",
  "password": "secure_password",
  "host": "localhost",
  "ifNotExists": true
}

// Exemplo de retorno:
"✅ Usuário 'new_user'@'localhost' criado com sucesso."
```

### Conceder Privilégios
```javascript
// Use a ferramenta grant_privileges
// Parâmetros:
{
  "privileges": ["SELECT", "INSERT", "UPDATE"],
  "onObject": "app_db.*",
  "toUser": "new_user",
  "toHost": "localhost",
  "withGrantOption": false
}

// Exemplo de retorno:
"✅ Privilégios concedidos ao usuário 'new_user'@'localhost' com sucesso.
Privilégios: SELECT, INSERT, UPDATE
Objeto: app_db.*"
```

### Revogar Privilégios
```javascript
// Use a ferramenta revoke_privileges
// Parâmetros:
{
  "privileges": ["UPDATE"],
  "onObject": "app_db.*",
  "fromUser": "new_user",
  "fromHost": "localhost"
}

// Exemplo de retorno:
"✅ Privilégios revogados do usuário 'new_user'@'localhost' com sucesso.
Privilégios revogados: UPDATE
Objeto: app_db.*"
```

## 🔍 Auditoria

### Gerar Relatório de Auditoria
```javascript
// Use a ferramenta generate_audit_report
// Parâmetros:
{
  "startDate": "2024-12-01T00:00:00Z",
  "endDate": "2024-12-19T23:59:59Z",
  "user": "app_user",
  "operation": "SELECT"
}

// Exemplo de retorno:
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

### Exemplo de Erro de Conexão
```javascript
// Exemplo de retorno quando há erro:
{
  "error": true,
  "code": "CONNECTION_ERROR",
  "message": "Falha na conexão com o banco de dados",
  "details": "Connection refused: connect ECONNREFUSED 127.0.0.1:3306"
}
```

### Exemplo de Erro de Validação
```javascript
// Exemplo de retorno quando há erro de validação:
{
  "error": true,
  "code": "VALIDATION_ERROR",
  "message": "Parâmetros inválidos",
  "details": "tableName é obrigatório"
}
```

### Exemplo de Erro de Permissão
```javascript
// Exemplo de retorno quando há erro de permissão:
{
  "error": true,
  "code": "PERMISSION_ERROR",
  "message": "Permissão insuficiente",
  "details": "Usuário não tem permissão para executar esta operação"
}
```

## 📝 Casos de Uso Comuns

### 1. Verificação Diária de Saúde
```javascript
// Execute todas as manhãs para verificar a saúde do banco
// 1. Verificar conexões
await test_all_connections()

// 2. Verificar saúde geral
await check_database_health({
  "checkConnections": true,
  "checkStorage": true,
  "checkPerformance": true
})

// 3. Verificar tabelas sensíveis
await check_sensitive_tables({
  "tables": ["users", "payments", "transactions"],
  "database": "app_db"
})
```

### 2. Monitoramento de Schema
```javascript
// Execute periodicamente para monitorar mudanças
await monitor_schema_changes({
  "databases": ["app_db", "analytics_db"],
  "checkInterval": 5
})
```

### 3. Análise de Performance
```javascript
// Execute para análise de performance
// 1. Obter informações do banco
await get_database_info({
  "includeUsers": false,
  "includeDatabases": true
})

// 2. Analisar tabelas específicas
await analyze_table({
  "tableName": "orders",
  "database": "app_db"
})

// 3. Verificar índices
await get_indexes({
  "tableName": "orders",
  "database": "app_db",
  "includeStats": true
})
```

### 4. Auditoria de Segurança
```javascript
// Execute para auditoria de segurança
// 1. Detectar atividades suspeitas
await detect_suspicious_activity()

// 2. Gerar relatório de auditoria
await generate_audit_report({
  "startDate": "2024-12-01T00:00:00Z",
  "endDate": "2024-12-19T23:59:59Z"
})

// 3. Verificar usuários e privilégios
await get_users_privileges({
  "includeRoles": true,
  "includeSystemPrivs": false
})
```

### 5. Operações de Manutenção
```javascript
// Execute para manutenção do banco
// 1. Criar backup
await backup_database({
  "backupPath": "backups/daily_backup.sql"
})

// 2. Otimizar tabelas
await optimize_table({
  "tableName": "users",
  "database": "app_db"
})

// 3. Verificar integridade
await check_database_integrity()
```

## 🎯 Dicas e Boas Práticas

### 1. Uso de Múltiplas Conexões
- Configure conexões para diferentes ambientes (dev, staging, prod)
- Use conexões específicas para operações sensíveis
- Teste conexões regularmente

### 2. Monitoramento
- Configure alertas para métricas críticas
- Monitore tabelas sensíveis regularmente
- Implemente logging de auditoria

### 3. Segurança
- Use apenas queries SELECT em execute_safe_query
- Valide todas as entradas
- Implemente rate limiting
- Monitore atividades suspeitas

### 4. Performance
- Use pool de conexões
- Otimize queries regularmente
- Monitore índices
- Implemente cache quando apropriado

### 5. Manutenção
- Execute backups regulares
- Monitore espaço em disco
- Verifique integridade do banco
- Atualize estatísticas

---

**Exemplos de uso completos! 🎉**