# ⚙️ Guia de Configuração

Este guia detalha todas as opções de configuração disponíveis no MySQL MCP Server.

## 📁 Estrutura de Configuração

### Arquivos de Configuração
```
mysql_mcp_server/
├── .env                    # Variáveis de ambiente
├── config/
│   ├── mysql-connections.json  # Múltiplas conexões
│   └── mysql.json             # Configurações do MySQL
├── logs/                   # Diretório de logs
└── backups/               # Diretório de backups
```

## 🔧 Configuração Básica

### Variáveis de Ambiente (.env)
```bash
# ===== CONFIGURAÇÕES DO SERVIDOR MCP =====
MCP_SERVER_NAME=mysql-monitor
MCP_SERVER_VERSION=1.0.0
LOG_LEVEL=info
PORT=3000

# ===== CONFIGURAÇÕES DE CONEXÃO MYSQL =====
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DATABASE=testdb

# ===== CONFIGURAÇÕES DE POOL DE CONEXÕES =====
MYSQL_CONNECTION_LIMIT=10
MYSQL_QUEUE_LIMIT=0
MYSQL_WAIT_FOR_CONNECTIONS=true

# ===== CONFIGURAÇÕES DE TIMEOUT =====
MYSQL_CONNECT_TIMEOUT=60000
MYSQL_ACQUIRE_TIMEOUT=60000
MYSQL_TIMEOUT=60000

# ===== CONFIGURAÇÕES DE LOGGING =====
LOG_FILE=true
LOG_FILE_PATH=logs/mysql-mcp.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5

# ===== CONFIGURAÇÕES DE SEGURANÇA =====
SECURITY_LOG_LEVEL=warn
ENABLE_AUDIT=true
AUDIT_LOG_PATH=logs/audit.log

# ===== CONFIGURAÇÕES DE NOTIFICAÇÃO =====
NOTIFICATION_ENABLED=true
NOTIFICATION_EMAIL=admin@example.com
NOTIFICATION_SLACK_WEBHOOK=https://hooks.slack.com/...

# ===== CONFIGURAÇÕES DE MONITORAMENTO =====
MONITORING_ENABLED=true
MONITORING_INTERVAL=300000
HEALTH_CHECK_INTERVAL=60000

# ===== CONFIGURAÇÕES DE BACKUP =====
BACKUP_ENABLED=true
BACKUP_INTERVAL=86400000
BACKUP_RETENTION_DAYS=30
BACKUP_PATH=backups/
```

## 🔗 Configuração de Conexões

### Conexão Única
```bash
# Configuração básica para uma única conexão
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DATABASE=testdb
```

### Múltiplas Conexões
```bash
# Configuração JSON para múltiplas conexões
MYSQL_CONNECTIONS={"connections":{"dev":{"host":"localhost","port":3306,"user":"dev_user","password":"dev_password","database":"dev_db","description":"Development Database","environment":"development"},"prod":{"host":"prod_host","port":3306,"user":"prod_user","password":"prod_password","database":"prod_db","description":"Production Database","environment":"production"}},"defaultConnection":"dev"}
```

### Arquivo de Configuração (config/mysql-connections.json)
```json
{
  "connections": {
    "dev": {
      "host": "localhost",
      "port": 3306,
      "user": "dev_user",
      "password": "dev_password",
      "database": "dev_db",
      "description": "Development Database",
      "environment": "development",
      "ssl": false,
      "timeout": 60000
    },
    "prod": {
      "host": "prod_host",
      "port": 3306,
      "user": "prod_user",
      "password": "prod_password",
      "database": "prod_db",
      "description": "Production Database",
      "environment": "production",
      "ssl": true,
      "ssl_ca": "/path/to/ca-cert.pem",
      "ssl_cert": "/path/to/client-cert.pem",
      "ssl_key": "/path/to/client-key.pem",
      "timeout": 30000
    }
  },
  "defaultConnection": "dev",
  "pool": {
    "connectionLimit": 10,
    "queueLimit": 0,
    "waitForConnections": true,
    "acquireTimeout": 60000,
    "timeout": 60000
  }
}
```

## 🔒 Configuração de Segurança

### SSL/TLS
```bash
# Configurações SSL
MYSQL_SSL=true
MYSQL_SSL_CA=/path/to/ca-cert.pem
MYSQL_SSL_CERT=/path/to/client-cert.pem
MYSQL_SSL_KEY=/path/to/client-key.pem
MYSQL_SSL_REJECT_UNAUTHORIZED=true
```

### Autenticação
```bash
# Configurações de autenticação
MYSQL_AUTH_PLUGIN=mysql_native_password
MYSQL_AUTH_SWITCH_ENABLED=true
```

### Auditoria
```bash
# Configurações de auditoria
ENABLE_AUDIT=true
AUDIT_LOG_PATH=logs/audit.log
AUDIT_LOG_LEVEL=info
AUDIT_RETENTION_DAYS=90
AUDIT_SENSITIVE_OPERATIONS=true
```

## 📊 Configuração de Logging

### Níveis de Log
```bash
# Níveis disponíveis: error, warn, info, debug
LOG_LEVEL=info
SECURITY_LOG_LEVEL=warn
AUDIT_LOG_LEVEL=info
```

### Configuração de Arquivos
```bash
# Logs de arquivo
LOG_FILE=true
LOG_FILE_PATH=logs/mysql-mcp.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5
LOG_DATE_PATTERN=YYYY-MM-DD
```

### Configuração de Console
```bash
# Logs de console
LOG_CONSOLE=true
LOG_CONSOLE_COLORS=true
LOG_CONSOLE_TIMESTAMP=true
```

## 🔔 Configuração de Notificações

### Email
```bash
# Configurações de email
NOTIFICATION_EMAIL_ENABLED=true
NOTIFICATION_EMAIL_HOST=smtp.gmail.com
NOTIFICATION_EMAIL_PORT=587
NOTIFICATION_EMAIL_USER=your-email@gmail.com
NOTIFICATION_EMAIL_PASSWORD=your-password
NOTIFICATION_EMAIL_FROM=noreply@example.com
NOTIFICATION_EMAIL_TO=admin@example.com
```

### Slack
```bash
# Configurações do Slack
NOTIFICATION_SLACK_ENABLED=true
NOTIFICATION_SLACK_WEBHOOK=https://hooks.slack.com/services/...
NOTIFICATION_SLACK_CHANNEL=#alerts
NOTIFICATION_SLACK_USERNAME=MySQL MCP
```

### Webhook
```bash
# Configurações de webhook
NOTIFICATION_WEBHOOK_ENABLED=true
NOTIFICATION_WEBHOOK_URL=https://your-webhook-url.com
NOTIFICATION_WEBHOOK_SECRET=your-secret
```

## 📈 Configuração de Monitoramento

### Health Checks
```bash
# Configurações de health check
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_INTERVAL=60000
HEALTH_CHECK_TIMEOUT=30000
HEALTH_CHECK_RETRIES=3
```

### Performance Monitoring
```bash
# Configurações de monitoramento de performance
PERFORMANCE_MONITORING_ENABLED=true
PERFORMANCE_MONITORING_INTERVAL=300000
PERFORMANCE_MONITORING_METRICS=true
PERFORMANCE_MONITORING_ALERTS=true
```

### Schema Monitoring
```bash
# Configurações de monitoramento de schema
SCHEMA_MONITORING_ENABLED=true
SCHEMA_MONITORING_INTERVAL=300000
SCHEMA_MONITORING_DATABASES=information_schema,mysql,performance_schema
SCHEMA_MONITORING_SENSITIVE_TABLES=users,payments,transactions
```

## 💾 Configuração de Backup

### Backup Automático
```bash
# Configurações de backup
BACKUP_ENABLED=true
BACKUP_INTERVAL=86400000
BACKUP_RETENTION_DAYS=30
BACKUP_PATH=backups/
BACKUP_COMPRESS=true
BACKUP_ENCRYPT=true
```

### Backup Manual
```bash
# Configurações de backup manual
BACKUP_MANUAL_ENABLED=true
BACKUP_MANUAL_PATH=backups/manual/
BACKUP_MANUAL_FORMAT=sql
BACKUP_MANUAL_INCLUDE_DATA=true
```

## 🔧 Configuração Avançada

### Pool de Conexões
```bash
# Configurações avançadas de pool
MYSQL_CONNECTION_LIMIT=10
MYSQL_QUEUE_LIMIT=0
MYSQL_WAIT_FOR_CONNECTIONS=true
MYSQL_ACQUIRE_TIMEOUT=60000
MYSQL_TIMEOUT=60000
MYSQL_IDLE_TIMEOUT=300000
MYSQL_RELEASE_TIMEOUT=60000
```

### Cache
```bash
# Configurações de cache
CACHE_ENABLED=true
CACHE_TTL=300000
CACHE_MAX_SIZE=1000
CACHE_TYPE=memory
```

### Rate Limiting
```bash
# Configurações de rate limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_SKIP_SUCCESSFUL=true
```

## 📱 Configuração do Cursor IDE

### Configuração Automática
```bash
npm run setup
```

### Configuração Manual (mcp.json)
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
        "MYSQL_CONNECTIONS": "{\"connections\":{\"dev\":{\"host\":\"localhost\",\"port\":3306,\"user\":\"dev_user\",\"password\":\"dev_password\",\"database\":\"dev_db\",\"description\":\"Development Database\"}},\"defaultConnection\":\"dev\"}",
        "ENABLE_AUDIT": "true",
        "NOTIFICATION_ENABLED": "true",
        "MONITORING_ENABLED": "true"
      }
    }
  }
}
```

## 🧪 Configuração de Testes

### Ambiente de Teste
```bash
# Configurações para testes
NODE_ENV=test
LOG_LEVEL=error
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=test_user
MYSQL_PASSWORD=test_password
MYSQL_DATABASE=test_db
```

### Configuração de CI/CD
```bash
# Configurações para CI/CD
CI=true
LOG_LEVEL=error
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=ci_user
MYSQL_PASSWORD=ci_password
MYSQL_DATABASE=ci_db
```

## 🔍 Validação de Configuração

### Verificar Configuração
```bash
# Verificar configuração
npm run config:validate

# Verificar conexões
npm run test-connection

# Verificar todas as configurações
npm run config:check
```

### Teste de Configuração
```bash
# Testar configuração específica
npm run test:config -- --connection=dev

# Testar todas as configurações
npm run test:config:all
```

## 📋 Exemplos de Configuração

### Desenvolvimento
```bash
# Configuração para desenvolvimento
NODE_ENV=development
LOG_LEVEL=debug
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=dev_user
MYSQL_PASSWORD=dev_password
MYSQL_DATABASE=dev_db
ENABLE_AUDIT=false
NOTIFICATION_ENABLED=false
```

### Produção
```bash
# Configuração para produção
NODE_ENV=production
LOG_LEVEL=info
MYSQL_HOST=prod_host
MYSQL_PORT=3306
MYSQL_USER=prod_user
MYSQL_PASSWORD=prod_password
MYSQL_DATABASE=prod_db
ENABLE_AUDIT=true
NOTIFICATION_ENABLED=true
SECURITY_LOG_LEVEL=warn
```

### Homologação
```bash
# Configuração para homologação
NODE_ENV=staging
LOG_LEVEL=info
MYSQL_HOST=staging_host
MYSQL_PORT=3306
MYSQL_USER=staging_user
MYSQL_PASSWORD=staging_password
MYSQL_DATABASE=staging_db
ENABLE_AUDIT=true
NOTIFICATION_ENABLED=true
```

## 🚨 Solução de Problemas

### Problema: Configuração Inválida
```bash
# Verificar sintaxe do JSON
npm run config:validate

# Verificar variáveis de ambiente
npm run config:check
```

### Problema: Conexão Falha
```bash
# Verificar configurações de conexão
npm run test-connection

# Verificar logs
tail -f logs/error.log
```

### Problema: Permissões
```bash
# Verificar permissões de arquivo
ls -la .env
ls -la config/

# Verificar permissões de diretório
ls -la logs/
ls -la backups/
```

## 📚 Referências

- [Documentação MySQL](https://dev.mysql.com/doc/)
- [Documentação mysql2](https://github.com/sidorares/node-mysql2)
- [Documentação Winston](https://github.com/winstonjs/winston)
- [Documentação Joi](https://joi.dev/)

---

**Configuração concluída! 🎉**



