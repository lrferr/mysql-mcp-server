# 📦 Guia de Instalação

Este guia fornece instruções detalhadas para instalar e configurar o MySQL MCP Server.

## 📋 Pré-requisitos

### Sistema Operacional
- Windows 10/11
- macOS 10.15+
- Linux (Ubuntu 18.04+, CentOS 7+, etc.)

### Software Necessário
- **Node.js**: 18.0.0 ou superior
- **npm**: 8.0.0 ou superior
- **MySQL**: 5.7+ ou MariaDB 10.3+
- **Git**: Para clonar o repositório

### Verificar Pré-requisitos
```bash
# Verificar Node.js
node --version
# Deve retornar v18.0.0 ou superior

# Verificar npm
npm --version
# Deve retornar 8.0.0 ou superior

# Verificar MySQL
mysql --version
# Deve retornar a versão do MySQL/MariaDB
```

## 🔧 Instalação

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
# Copie o arquivo de exemplo
cp env.example .env

# Edite o arquivo .env com suas configurações
nano .env  # ou use seu editor preferido
```

### 4. Configure Banco de Dados

#### Criar Usuário MySQL
```sql
-- Conecte-se ao MySQL como root
mysql -u root -p

-- Crie um usuário específico para o MCP
CREATE USER 'mcp_user'@'localhost' IDENTIFIED BY 'strong_password';

-- Conceda privilégios necessários
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, DROP, INDEX, TRIGGER ON *.* TO 'mcp_user'@'localhost';

-- Aplique as mudanças
FLUSH PRIVILEGES;

-- Saia do MySQL
EXIT;
```

#### Criar Banco de Dados de Teste
```sql
-- Conecte-se como o usuário MCP
mysql -u mcp_user -p

-- Crie um banco de teste
CREATE DATABASE testdb;

-- Use o banco
USE testdb;

-- Crie uma tabela de exemplo
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insira dados de exemplo
INSERT INTO users (name, email) VALUES
('João Silva', 'joao@example.com'),
('Maria Santos', 'maria@example.com');

-- Saia do MySQL
EXIT;
```

## ⚙️ Configuração

### Configuração Básica (.env)
```bash
# Configurações do Servidor MCP
MCP_SERVER_NAME=mysql-monitor
MCP_SERVER_VERSION=1.0.0
LOG_LEVEL=info

# Configurações de Conexão MySQL
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=mcp_user
MYSQL_PASSWORD=strong_password
MYSQL_DATABASE=testdb
```

### Configuração Avançada (Múltiplas Conexões)
```bash
# Configuração para múltiplas conexões
MYSQL_CONNECTIONS={"connections":{"dev":{"host":"localhost","port":3306,"user":"dev_user","password":"dev_password","database":"dev_db","description":"Development Database"},"prod":{"host":"prod_host","port":3306,"user":"prod_user","password":"prod_password","database":"prod_db","description":"Production Database"}},"defaultConnection":"dev"}
```

### Configuração de Logging
```bash
# Níveis de log disponíveis: error, warn, info, debug
LOG_LEVEL=info

# Logs específicos de segurança
SECURITY_LOG_LEVEL=warn
```

## 🧪 Teste da Instalação

### 1. Teste de Conexão
```bash
npm run test-connection
```

### 2. Teste do Servidor
```bash
npm start
```

### 3. Teste de Funcionalidades
```bash
npm test
```

## 📱 Configuração do Cursor IDE

### Configuração Automática
```bash
npm run setup
```

### Configuração Manual
1. Abra o Cursor IDE
2. Vá para Configurações (Ctrl/Cmd + ,)
3. Procure por "MCP" ou "Model Context Protocol"
4. Adicione a configuração:

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
        "MYSQL_CONNECTIONS": "{\"connections\":{\"dev\":{\"host\":\"localhost\",\"port\":3306,\"user\":\"mcp_user\",\"password\":\"strong_password\",\"database\":\"testdb\",\"description\":\"Development Database\"}},\"defaultConnection\":\"dev\"}"
      }
    }
  }
}
```

## 🔒 Configuração de Segurança

### Configuração SSL/TLS
```bash
# Para conexões SSL
MYSQL_SSL=true
MYSQL_SSL_CA=/path/to/ca-cert.pem
MYSQL_SSL_CERT=/path/to/client-cert.pem
MYSQL_SSL_KEY=/path/to/client-key.pem
```

### Configuração de Firewall
```bash
# MySQL (porta 3306)
sudo ufw allow 3306

# Servidor MCP (porta padrão 3000)
sudo ufw allow 3000
```

### Configuração de Usuário Seguro
```sql
-- Crie um usuário com privilégios mínimos
CREATE USER 'mcp_readonly'@'localhost' IDENTIFIED BY 'readonly_password';
GRANT SELECT ON testdb.* TO 'mcp_readonly'@'localhost';

-- Para operações de escrita
CREATE USER 'mcp_write'@'localhost' IDENTIFIED BY 'write_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON testdb.* TO 'mcp_write'@'localhost';
```

## 🚀 Inicialização

### Modo Desenvolvimento
```bash
npm run dev
```

### Modo Produção
```bash
npm start
```

### Com PM2 (Process Manager)
```bash
# Instalar PM2
npm install -g pm2

# Iniciar com PM2
pm2 start src/index.js --name mysql-mcp

# Verificar status
pm2 status

# Ver logs
pm2 logs mysql-mcp
```

## 🔧 Configuração Avançada

### Pool de Conexões
```bash
# Configurações de pool
MYSQL_CONNECTION_LIMIT=10
MYSQL_QUEUE_LIMIT=0
MYSQL_WAIT_FOR_CONNECTIONS=true
```

### Timeouts
```bash
# Timeouts de conexão
MYSQL_CONNECT_TIMEOUT=60000
MYSQL_ACQUIRE_TIMEOUT=60000
MYSQL_TIMEOUT=60000
```

### Logging Avançado
```bash
# Logs de arquivo
LOG_FILE=true
LOG_FILE_PATH=logs/mysql-mcp.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5
```

## 🐛 Solução de Problemas

### Problema: Erro de Conexão
```bash
# Verificar se o MySQL está rodando
sudo systemctl status mysql

# Verificar portas
netstat -tulpn | grep :3306

# Testar conexão manual
mysql -u mcp_user -p -h localhost
```

### Problema: Permissões
```sql
-- Verificar privilégios do usuário
SHOW GRANTS FOR 'mcp_user'@'localhost';

-- Conceder privilégios adicionais se necessário
GRANT ALL PRIVILEGES ON testdb.* TO 'mcp_user'@'localhost';
FLUSH PRIVILEGES;
```

### Problema: Porta em Uso
```bash
# Verificar processos usando a porta
lsof -i :3000

# Matar processo se necessário
kill -9 <PID>
```

### Problema: Dependências
```bash
# Limpar cache do npm
npm cache clean --force

# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install
```

## 📊 Verificação da Instalação

### Checklist de Instalação
- [ ] Node.js 18.0.0+ instalado
- [ ] MySQL 5.7+ rodando
- [ ] Repositório clonado
- [ ] Dependências instaladas
- [ ] Arquivo .env configurado
- [ ] Usuário MySQL criado
- [ ] Banco de dados de teste criado
- [ ] Conexão testada
- [ ] Servidor iniciado
- [ ] Cursor IDE configurado

### Testes de Verificação
```bash
# Teste 1: Conexão
npm run test-connection

# Teste 2: Servidor
npm start

# Teste 3: Funcionalidades
npm test

# Teste 4: Segurança
npm run test:security
```

## 🎯 Próximos Passos

1. **Configure Múltiplas Conexões**: Para diferentes ambientes
2. **Implemente Logging**: Configure logs de segurança e auditoria
3. **Configure Backup**: Implemente backup automático
4. **Monitore Performance**: Configure monitoramento de performance
5. **Teste Funcionalidades**: Explore todas as ferramentas disponíveis

## 🆘 Suporte

- **Documentação**: [README.md](README.md)
- **Guia Rápido**: [QUICKSTART.md](QUICKSTART.md)
- **Issues**: [GitHub Issues](https://github.com/lrferr/mysql-mcp-server/issues)
- **Discussões**: [GitHub Discussions](https://github.com/lrferr/mysql-mcp-server/discussions)
- **Email**: lrferr@gmail.com

---

**Instalação concluída! 🎉**

