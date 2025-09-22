# 🚀 Guia de Início Rápido

Este guia te ajudará a configurar e usar o MySQL MCP Server em poucos minutos.

## 📋 Pré-requisitos

- Node.js 18.0.0 ou superior
- MySQL 5.7+ ou MariaDB 10.3+
- Acesso ao banco com privilégios adequados

## ⚡ Instalação Rápida

### 1. Clone o Repositório
```bash
git clone https://github.com/lrferr/mysql-mcp-server.git
cd mysql-mcp-server
```

### 2. Instale Dependências
```bash
npm install
```

### 3. Configure Variáveis de Ambiente
```bash
cp env.example .env
# Edite o arquivo .env com suas configurações
```

### 4. Configure Cursor IDE
```bash
npm run setup
```

### 5. Teste a Conexão
```bash
npm run test-connection
```

## 🔧 Configuração Básica

### Configuração de Conexão Única

Crie um arquivo `.env`:
```bash
# Configurações do Servidor MCP
MCP_SERVER_NAME=mysql-monitor
MCP_SERVER_VERSION=1.0.0
LOG_LEVEL=info

# Configurações de Conexão MySQL
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DATABASE=testdb
```

### Configuração de Múltiplas Conexões

Para múltiplas conexões, use a variável `MYSQL_CONNECTIONS`:
```bash
MYSQL_CONNECTIONS={"connections":{"dev":{"host":"localhost","port":3306,"user":"dev_user","password":"dev_password","database":"dev_db","description":"Development Database"},"prod":{"host":"prod_host","port":3306,"user":"prod_user","password":"prod_password","database":"prod_db","description":"Production Database"}},"defaultConnection":"dev"}
```

## 🎯 Primeiros Passos

### 1. Inicie o Servidor
```bash
npm start
```

### 2. Teste Conexões
```bash
# Teste todas as conexões
npm run test-connection

# Ou teste uma conexão específica
npm run test-connection -- --connection=dev
```

### 3. Verifique Saúde do Banco
```bash
# Use a ferramenta check_database_health
# Isso verificará conexões, armazenamento e performance
```

## 🛠️ Ferramentas Essenciais

### 🔗 Gerenciamento de Conexões
- `list_connections` - Lista todas as conexões configuradas
- `test_connection` - Testa uma conexão específica
- `test_all_connections` - Testa todas as conexões
- `get_connections_status` - Status das conexões ativas

### 📊 Monitoramento
- `check_database_health` - Verifica saúde geral do banco
- `monitor_schema_changes` - Monitora mudanças em esquemas
- `check_sensitive_tables` - Verifica tabelas sensíveis
- `detect_suspicious_activity` - Detecta atividades suspeitas

### 🔍 Análise
- `get_database_info` - Informações gerais do banco
- `get_table_info` - Informações detalhadas da tabela
- `get_constraints` - Lista constraints
- `get_foreign_keys` - Lista chaves estrangeiras
- `get_indexes` - Lista índices

### 🔧 Operações SQL
- `execute_safe_query` - Executa queries SELECT seguras
- `select_data` - Consulta dados de tabelas
- `insert_data` - Insere dados
- `update_data` - Atualiza dados
- `delete_data` - Remove dados

## 📱 Integração com Cursor IDE

### Configuração Automática
```bash
npm run setup
```

### Configuração Manual
Adicione ao seu `mcp.json`:
```json
{
  "mcpServers": {
    "mysql-monitor": {
      "command": "npm",
      "args": ["start"],
      "env": {
        "MCP_SERVER_NAME": "mysql-monitor",
        "MCP_SERVER_VERSION": "1.0.0",
        "LOG_LEVEL": "info",
        "MYSQL_CONNECTIONS": "{\"connections\":{\"dev\":{\"host\":\"localhost\",\"port\":3306,\"user\":\"root\",\"password\":\"password\",\"database\":\"testdb\",\"description\":\"Development Database\"}},\"defaultConnection\":\"dev\"}"
      }
    }
  }
}
```

## 🧪 Testes

### Executar Todos os Testes
```bash
npm test
```

### Testes Específicos
```bash
# Testes unitários
npm run test:unit

# Testes de integração
npm run test:integration

# Testes de segurança
npm run test:security

# Testes de performance
npm run test:performance
```

## 🔍 Exemplos de Uso

### Verificar Saúde do Banco
```javascript
// Use a ferramenta check_database_health
// Parâmetros opcionais:
// - checkConnections: true (padrão)
// - checkStorage: true (padrão)
// - checkPerformance: true (padrão)
// - connectionName: null (usa conexão padrão)
```

### Monitorar Mudanças
```javascript
// Use a ferramenta monitor_schema_changes
// Parâmetros:
// - databases: ['information_schema', 'mysql', 'performance_schema']
// - checkInterval: 5 (minutos)
```

### Executar Query Segura
```javascript
// Use a ferramenta execute_safe_query
// Apenas queries SELECT são permitidas
// Exemplo: "SELECT * FROM users LIMIT 10"
```

## 🚨 Solução de Problemas

### Problema: Conexão Falha
```bash
# Verifique as credenciais
npm run test-connection

# Verifique se o MySQL está rodando
mysql -u root -p -e "SELECT 1"
```

### Problema: Permissões Insuficientes
```sql
-- Crie um usuário com privilégios adequados
CREATE USER 'mcp_user'@'localhost' IDENTIFIED BY 'password';
GRANT SELECT, INSERT, UPDATE, DELETE ON database.* TO 'mcp_user'@'localhost';
FLUSH PRIVILEGES;
```

### Problema: Porta em Uso
```bash
# Verifique se a porta está em uso
netstat -tulpn | grep :3000

# Mude a porta no arquivo .env
MCP_PORT=3001
```

## 📚 Próximos Passos

1. **Explore as Ferramentas**: Use as ferramentas de monitoramento e análise
2. **Configure Múltiplas Conexões**: Para ambientes de desenvolvimento e produção
3. **Implemente Auditoria**: Configure logging e monitoramento de segurança
4. **Personalize**: Adapte as configurações para suas necessidades
5. **Contribua**: Veja o [Guia de Contribuição](CONTRIBUTING.md)

## 🆘 Suporte

- **Documentação**: Consulte a [documentação completa](README.md)
- **Issues**: Abra uma [issue no GitHub](https://github.com/lrferr/mysql-mcp-server/issues)
- **Discussões**: Participe das [discussões](https://github.com/lrferr/mysql-mcp-server/discussions)
- **Email**: lrferr@gmail.com

---

**Pronto para começar! 🎉**