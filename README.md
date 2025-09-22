# 🚀 MySQL Node MCP Server

[![npm version](https://badge.fury.io/js/mysql-mcp-server.svg)](https://badge.fury.io/js/mysql-mcp-server)
[![Downloads](https://img.shields.io/npm/dm/mysql-mcp-server.svg)](https://www.npmjs.com/package/mysql-mcp-server)
[![GitHub stars](https://img.shields.io/github/stars/lrferr/mysql-mcp-server.svg)](https://github.com/lrferr/mysql-mcp-server/stargazers)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Um servidor MCP (Model Context Protocol) para monitoramento e interação com MySQL Database, desenvolvido em Node.js com suporte a **múltiplas conexões simultâneas**.

## ✨ Funcionalidades Principais

- **🔗 Múltiplas Conexões** - Conecte-se a vários bancos MySQL simultaneamente
- **📊 Monitoramento** - Saúde do banco, performance e métricas em tempo real
- **🛡️ Segurança** - Validação de scripts de migração e operações seguras
- **⚡ Performance** - Pool de conexões otimizado para cada ambiente
- **🔧 Administração** - DDL, DML e DCL operations completas
- **📱 Integração** - Compatível com Cursor IDE e Claude Desktop

## 🚀 Início Rápido

### 1. Instalação
```bash
npm install -g mysql-mcp-server
```

### 2. Configuração MCP (Cursor/Claude Desktop)

Adicione a seguinte configuração ao seu arquivo `mcp.json`:

```json
{
  "mcpServers": {
    "mysql-monitor": {
      "command": "npx",
      "args": ["mysql-mcp-server@latest"],
      "env": {
        "MCP_SERVER_NAME": "mysql-monitor",
        "MCP_SERVER_VERSION": "1.0.0",
        "LOG_LEVEL": "info",
        "MYSQL_CONNECTIONS": "{\"connections\":{\"prod\":{\"host\":\"localhost\",\"port\":3306,\"user\":\"seu_usuario\",\"password\":\"sua_senha\",\"database\":\"seu_banco\",\"description\":\"Production Database\"}},\"defaultConnection\":\"prod\"}"
      }
    }
  }
}
```

**Para múltiplas conexões:**
```json
{
  "mcpServers": {
    "mysql-monitor": {
      "command": "npx",
      "args": ["mysql-mcp-server@latest"],
      "env": {
        "MCP_SERVER_NAME": "mysql-monitor",
        "MCP_SERVER_VERSION": "1.0.0",
        "LOG_LEVEL": "info",
        "MYSQL_CONNECTIONS": "{\"connections\":{\"hml\":{\"host\":\"servidor_hml\",\"port\":3306,\"user\":\"usuario_hml\",\"password\":\"senha_hml\",\"database\":\"hml_db\",\"description\":\"Homologação Database\"},\"prod\":{\"host\":\"servidor_prod\",\"port\":3306,\"user\":\"usuario_prod\",\"password\":\"senha_prod\",\"database\":\"prod_db\",\"description\":\"Production Database\"}},\"defaultConnection\":\"prod\"}"
      }
    }
  }
}
```

### 3. Configuração Automática (Opcional)
```bash
# Configurar Cursor IDE automaticamente
npx mysql-mcp-server setup-cursor

# Diagnosticar problemas de conectividade
npx mysql-mcp-server diagnose

# Testar conexão MySQL
npx mysql-mcp-server test-connection
```

## 🛠️ Ferramentas Disponíveis

### 🔗 Múltiplas Conexões
- `list_connections` - Lista todas as conexões
- `test_connection` - Testa conexão específica
- `test_all_connections` - Testa todas as conexões
- `get_connections_status` - Status das conexões ativas

### 📊 Monitoramento
- `check_database_health` - Verifica saúde do banco
- `monitor_schema_changes` - Monitora mudanças em esquemas
- `check_sensitive_tables` - Verifica tabelas sensíveis
- `detect_suspicious_activity` - Detecta atividades suspeitas

### 🔧 Administração
- **DDL**: `create_table`, `alter_table`, `drop_table`
- **DML**: `select_data`, `insert_data`, `update_data`, `delete_data`
- **DCL**: `create_user`, `grant_privileges`, `revoke_privileges`

### 🔍 Análise
- `get_table_info` - Informações detalhadas da tabela
- `get_constraints` - Lista constraints
- `get_foreign_keys` - Lista chaves estrangeiras
- `get_indexes` - Lista índices
- `analyze_table` - Analisa tabela e gera estatísticas

## 📋 Pré-requisitos

- Node.js 18.0.0 ou superior
- MySQL 5.7 ou superior / MariaDB 10.3 ou superior
- Acesso ao banco com privilégios adequados

## 🤝 Contribuição

Contribuições são bem-vindas! Consulte o arquivo [CONTRIBUTING.md](CONTRIBUTING.md) para mais detalhes.

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

Para suporte e dúvidas:

1. Consulte a documentação completa
2. Abra uma issue no GitHub
3. Verifique os logs para erros específicos

---

**Desenvolvido com ❤️ por Leandro Ferreira**

