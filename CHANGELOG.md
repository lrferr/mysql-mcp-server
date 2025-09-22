# 📝 Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Unreleased]

## [1.2.0] - 2025-01-22

### Adicionado
- 📋 **DDM (Data Definition Management)**: Gestão completa de schemas, tabelas, índices, views e rotinas
  - `create_schema` - Cria novos schemas com charset e collation personalizados
  - `drop_schema` - Remove schemas com opção de cascata
  - `list_schemas` - Lista todos os schemas com filtros de sistema
  - `list_tables` - Lista tabelas e views com informações detalhadas
  - `get_table_structure` - Estrutura completa de tabelas com índices e constraints
  - `analyze_indexes` - Análise detalhada de índices e performance
  - `list_views` - Lista todas as views com metadados
  - `list_routines` - Lista procedures e functions do banco

- 👥 **DCM (Data Control Management)**: Gestão avançada de usuários, privilégios e segurança
  - `create_user` - Cria usuários com validação de segurança
  - `drop_user` - Remove usuários com verificação de existência
  - `list_users` - Lista usuários com informações de segurança
  - `change_password` - Altera senhas com validação de política
  - `grant_privileges` - Concede privilégios granulares
  - `revoke_privileges` - Revoga privilégios específicos
  - `show_grants` - Mostra privilégios detalhados de usuários
  - `list_privileges` - Lista todos os privilégios do sistema
  - `audit_user_access` - Auditoria completa de acesso de usuários
  - `check_password_policy` - Verifica políticas de senha e segurança

- 🔄 **DLM (Data Lifecycle Management)**: Gestão de ciclo de vida e otimização de dados
  - `create_backup` - Cria backups completos com compressão
  - `restore_backup` - Restaura backups com validação
  - `list_backups` - Lista backups com filtros de data e database
  - `archive_old_data` - Arquivamento inteligente de dados antigos
  - `apply_retention_policy` - Aplicação de políticas de retenção
  - `compress_table` - Compressão de tabelas para economia de espaço
  - `create_partition` - Criação de partições para performance
  - `drop_partition` - Remoção de partições específicas

### Melhorado
- Sistema de validação de entrada mais robusto
- Tratamento de erros aprimorado com mensagens mais claras
- Logging detalhado para todas as operações de administração
- Documentação de API atualizada com novas funcionalidades
- Performance otimizada para operações em lote

### Segurança
- Validação rigorosa de nomes de usuários e senhas
- Verificação de privilégios antes de operações sensíveis
- Auditoria completa de todas as operações administrativas
- Políticas de retenção de dados configuráveis
- Backup seguro com verificação de integridade

## [1.1.2] - 2025-01-22

### Corrigido
- Corrigido problema de logs sendo enviados para stdout interferindo com JSON-RPC
- Corrigido método `listConnections()` no ConnectionManager
- Corrigido tratamento de configuração nula em todos os métodos do ConnectionManager
- Removido listeners duplicados que causavam warnings de memory leak
- Corrigido todos os console.log que interferiam com comunicação MCP

### Melhorado
- Comunicação JSON-RPC agora funciona corretamente sem interferência de logs
- Servidor MCP mais estável e confiável
- Melhor tratamento de erros quando configuração não está carregada

## [1.1.1] - 2025-01-22

### Corrigido
- Corrigido método `listConnections()` que estava chamando método inexistente
- Corrigido retorno das ferramentas MCP para formato correto com `content`
- Melhorado tratamento de erros nas ferramentas de conexão
- Corrigido método `getAvailableConnections()` para listar conexões corretamente

### Melhorado
- Formatação de retorno das ferramentas de teste de conexão
- Mensagens de erro mais claras e informativas
- Estrutura de resposta padronizada para todas as ferramentas MCP

## [1.1.0] - 2025-01-22

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



