# 📋 Fontes de Configuração MySQL MCP Server

Este documento explica como o MySQL MCP Server carrega e prioriza as configurações de conexão.

## 🔧 Fontes de Configuração

O servidor carrega as configurações na seguinte ordem de prioridade:

### 1. 📁 Arquivo de Configuração JSON
**Arquivo**: `config/mysql-connections.json`

```json
{
  "connections": {
    "sigareplica": {
      "host": "10.200.110.10",
      "port": 3306,
      "user": "sigareplica",
      "password": "SMJHmFhJgAf4q81EoDPb",
      "database": "mysql"
    },
    "dev": {
      "host": "localhost",
      "port": 3306,
      "user": "root",
      "password": "password",
      "database": "testdb"
    }
  },
  "defaultConnection": "sigareplica"
}
```

### 2. 🌍 Variável de Ambiente JSON
**Variável**: `MYSQL_CONNECTIONS`

```bash
MYSQL_CONNECTIONS={"connections":{"prod":{"host":"10.200.110.10","port":3306,"user":"sigareplica","password":"SMJHmFhJgAf4q81EoDPb","database":"mysql"}},"defaultConnection":"prod"}
```

### 3. 🔧 Variáveis de Ambiente Individuais
```bash
MYSQL_HOST=10.200.110.10
MYSQL_PORT=3306
MYSQL_USER=sigareplica
MYSQL_PASSWORD=SMJHmFhJgAf4q81EoDPb
MYSQL_DATABASE=mysql
```

### 4. ⚙️ Valores Padrão
```javascript
{
  host: 'localhost',
  port: 3306,
  user: 'root',
  password: '',
  database: 'mysql'
}
```

## 📊 Teste de Configurações

### Verificar Fonte da Configuração
```bash
npm run test-connection
```

**Saída esperada:**
```
📋 Fonte da configuração:
✅ Arquivo: C:\Users\ufpr\Projetos MCPs\mysql_mcp_server\config\mysql-connections.json
   Conexões configuradas: sigareplica, dev
   Conexão padrão: sigareplica
✅ Arquivo: C:\Users\ufpr\Projetos MCPs\mysql_mcp_server\.env
✅ Configuração via variável de ambiente MYSQL_CONNECTIONS
```

### Testar Configurações Disponíveis
```bash
npm run test-config
```

## 🎯 Configuração para Cursor IDE

### Arquivo mcp.json
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
        "MYSQL_CONNECTIONS": "{\"connections\":{\"sigareplica\":{\"host\":\"10.200.110.10\",\"port\":3306,\"user\":\"sigareplica\",\"password\":\"SMJHmFhJgAf4q81EoDPb\",\"database\":\"mysql\"}},\"defaultConnection\":\"sigareplica\"}"
      }
    }
  }
}
```

## 🔄 Mudando Configurações

### Para usar conexão sigareplica:
```bash
# 1. Copiar arquivo de exemplo
cp config/mysql-connections-example.json config/mysql-connections.json

# 2. Testar conexão
npm run test-connection
```

### Para usar configuração via variáveis de ambiente:
```bash
# 1. Editar arquivo .env
nano .env

# 2. Adicionar configuração
MYSQL_CONNECTIONS={"connections":{"sigareplica":{"host":"10.200.110.10","port":3306,"user":"sigareplica","password":"SMJHmFhJgAf4q81EoDPb","database":"mysql"}},"defaultConnection":"sigareplica"}

# 3. Testar conexão
npm run test-connection
```

## 📝 Logs de Configuração

O servidor registra informações detalhadas sobre a configuração carregada:

```
info: Configuração carregada do arquivo: ./config/mysql-connections.json
info: Conexões disponíveis: sigareplica, dev
info: Conexão padrão: sigareplica
```

## 🚨 Resolução de Problemas

### Problema: Configuração não carregada
```bash
# Verificar arquivo de configuração
npm run test-config

# Verificar logs
npm run test-connection
```

### Problema: Conexão falha
```bash
# Testar conexão específica
npm run test-connection

# Verificar configuração
cat config/mysql-connections.json
```

### Problema: Múltiplas configurações
O servidor sempre usa a primeira configuração válida encontrada na ordem de prioridade.

## 💡 Boas Práticas

1. **Desenvolvimento**: Use arquivo `config/mysql-connections.json`
2. **Produção**: Use variável `MYSQL_CONNECTIONS`
3. **Cursor IDE**: Configure no arquivo `mcp.json`
4. **Teste**: Use `npm run test-config` para verificar configurações
5. **Segurança**: Nunca commite credenciais no Git

## 📚 Exemplos

### Configuração Múltipla
```json
{
  "connections": {
    "dev": {
      "host": "localhost",
      "port": 3306,
      "user": "dev_user",
      "password": "dev_password",
      "database": "dev_db"
    },
    "staging": {
      "host": "staging.host.com",
      "port": 3306,
      "user": "staging_user",
      "password": "staging_password",
      "database": "staging_db"
    },
    "prod": {
      "host": "10.200.110.10",
      "port": 3306,
      "user": "sigareplica",
      "password": "SMJHmFhJgAf4q81EoDPb",
      "database": "mysql"
    }
  },
  "defaultConnection": "prod"
}
```

### Configuração via Environment
```bash
# .env
MYSQL_CONNECTIONS={"connections":{"prod":{"host":"10.200.110.10","port":3306,"user":"sigareplica","password":"SMJHmFhJgAf4q81EoDPb","database":"mysql"}},"defaultConnection":"prod"}
```

---

**Configuração concluída! 🎉**





