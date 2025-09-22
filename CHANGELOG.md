# 📝 Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Unreleased]

### Adicionado
- Sistema de múltiplas conexões simultâneas
- Ferramentas de monitoramento de banco de dados
- Operações DDL, DML e DCL completas
- Sistema de auditoria e segurança
- Validação de scripts de migração
- Sistema de notificações
- Documentação completa
- Exemplos de uso
- Scripts de automação
- Testes unitários e de integração

### Mudado
- Nenhuma mudança ainda

### Removido
- Nenhuma remoção ainda

### Corrigido
- Nenhuma correção ainda

### Segurança
- Implementação de queries seguras (apenas SELECT)
- Validação de entrada para todas as operações
- Logging de operações sensíveis
- Detecção de atividades suspeitas

## [1.0.0] - 2024-12-19

### Adicionado
- 🚀 Lançamento inicial do MySQL MCP Server
- 🔗 Suporte a múltiplas conexões MySQL simultâneas
- 📊 Ferramentas de monitoramento de banco de dados
- 🛡️ Sistema de auditoria e segurança
- 🔧 Operações DDL, DML e DCL completas
- 📱 Integração com Cursor IDE e Claude Desktop
- 📚 Documentação completa e exemplos
- 🧪 Testes unitários e de integração
- 🔒 Validação de scripts de migração
- 📢 Sistema de notificações

### Funcionalidades Principais
- **Múltiplas Conexões**: Conecte-se a vários bancos MySQL simultaneamente
- **Monitoramento**: Saúde do banco, performance e métricas em tempo real
- **Segurança**: Validação de scripts e operações seguras
- **Administração**: DDL, DML e DCL operations completas
- **Integração**: Compatível com Cursor IDE e Claude Desktop

### Ferramentas Disponíveis
- `list_connections` - Lista todas as conexões
- `test_connection` - Testa conexão específica
- `test_all_connections` - Testa todas as conexões
- `get_connections_status` - Status das conexões ativas
- `check_database_health` - Verifica saúde do banco
- `monitor_schema_changes` - Monitora mudanças em esquemas
- `check_sensitive_tables` - Verifica tabelas sensíveis
- `detect_suspicious_activity` - Detecta atividades suspeitas
- `execute_safe_query` - Executa queries SELECT seguras
- `get_database_info` - Informações gerais do banco
- `get_table_info` - Informações detalhadas da tabela
- `get_constraints` - Lista constraints
- `get_foreign_keys` - Lista chaves estrangeiras
- `get_indexes` - Lista índices
- `get_triggers` - Lista triggers
- `get_users_privileges` - Lista usuários e privilégios
- `get_table_dependencies` - Dependências de tabelas
- `analyze_table` - Analisa tabela e gera estatísticas
- `create_table` - Cria nova tabela
- `alter_table` - Altera tabela existente
- `drop_table` - Remove tabela
- `select_data` - Consulta dados
- `insert_data` - Insere dados
- `update_data` - Atualiza dados
- `delete_data` - Remove dados
- `create_user` - Cria novo usuário
- `grant_privileges` - Concede privilégios
- `revoke_privileges` - Revoga privilégios
- `generate_audit_report` - Gera relatório de auditoria

### Dependências
- `@modelcontextprotocol/sdk`: ^1.17.5
- `chalk`: ^5.3.0
- `dotenv`: ^16.4.5
- `joi`: ^17.13.3
- `mysql2`: ^3.10.3
- `node-cron`: ^3.0.3
- `winston`: ^3.17.0

### DevDependencies
- `nodemon`: ^3.1.4

### Configuração
- Suporte a variáveis de ambiente
- Configuração via arquivo JSON
- Múltiplas conexões simultâneas
- Logging configurável
- Sistema de notificações

### Testes
- Testes unitários para todas as funcionalidades
- Testes de integração com MySQL
- Testes de segurança
- Testes de performance
- Cobertura de código

### Documentação
- README completo com guia de início rápido
- Documentação técnica detalhada
- Exemplos de uso práticos
- Guia de contribuição
- Changelog detalhado

### Scripts
- `npm start` - Inicia o servidor
- `npm run dev` - Modo desenvolvimento
- `npm test` - Executa testes
- `npm run setup` - Configuração inicial
- `npm run test-connection` - Testa conexão
- `npm run lint` - Verifica código
- `npm run format` - Formata código

### Compatibilidade
- Node.js 18.0.0+
- MySQL 5.7+
- MariaDB 10.3+
- Cursor IDE
- Claude Desktop

---

## Tipos de Mudanças

- **Adicionado** para novas funcionalidades
- **Mudado** para mudanças em funcionalidades existentes
- **Removido** para funcionalidades removidas
- **Corrigido** para correções de bugs
- **Segurança** para vulnerabilidades corrigidas

## Links

- [Unreleased]: https://github.com/lrferr/mysql-mcp-server/compare/v1.0.0...HEAD
- [1.0.0]: https://github.com/lrferr/mysql-mcp-server/releases/tag/v1.0.0

