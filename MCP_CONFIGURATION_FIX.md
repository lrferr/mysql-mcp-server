# 🔧 Correção da Configuração MCP

## Problema Identificado
O erro de JSON parsing estava ocorrendo porque o comando `npx mysql-mcp-server-v1@latest` estava executando o CLI em vez do servidor MCP, causando saída formatada que interferia com o protocolo JSON.

## Solução Aplicada

### 1. Correções no Código
- ✅ Adicionado binário `mysql-mcp-server-v1` que executa o servidor MCP diretamente
- ✅ Modificado CLI para detectar quando está sendo executado como servidor MCP
- ✅ Corrigido problema de saída formatada interferindo com protocolo JSON
- ✅ Atualizado para versão 1.0.1

### 2. Configuração MCP Corrigida

Substitua a configuração `mysql-monitor-npm` no seu arquivo `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "mysql-monitor-npm": {
      "command": "npx",
      "args": ["mysql-mcp-server-v1@latest"],
      "env": {
        "MCP_SERVER_NAME": "mysql-monitor",
        "MCP_SERVER_VERSION": "1.0.1",
        "LOG_LEVEL": "info",
        "MYSQL_CONNECTIONS": "{\"connections\":{\"sigareplica\":{\"host\":\"10.200.110.10\",\"port\":3306,\"user\":\"sigareplica\",\"password\":\"SMJHmFhJgAf4q81EoDPb\",\"database\":\"mysql\"}},\"defaultConnection\":\"sigareplica\"}"
      }
    }
  }
}
```

### 3. Alternativa (se ainda houver problemas)

Se ainda houver problemas, use esta configuração alternativa:

```json
{
  "mcpServers": {
    "mysql-monitor-npm": {
      "command": "node",
      "args": ["C:\\Users\\ufpr\\AppData\\Roaming\\npm\\node_modules\\mysql-mcp-server-v1\\src\\index.js"],
      "env": {
        "MCP_SERVER_NAME": "mysql-monitor",
        "MCP_SERVER_VERSION": "1.0.1",
        "LOG_LEVEL": "info",
        "MYSQL_CONNECTIONS": "{\"connections\":{\"sigareplica\":{\"host\":\"10.200.110.10\",\"port\":3306,\"user\":\"sigareplica\",\"password\":\"SMJHmFhJgAf4q81EoDPb\",\"database\":\"mysql\"}},\"defaultConnection\":\"sigareplica\"}"
      }
    }
  }
}
```

## Passos para Aplicar a Correção

1. **Pare o Cursor** completamente
2. **Atualize o arquivo** `~/.cursor/mcp.json` com a configuração acima
3. **Reinicie o Cursor**
4. **Teste a conexão** MCP

## Verificação

Após aplicar a correção, você deve ver logs similares a:
```
[info] Server started and connected successfully
[info] Message from client: {"method":"initialize",...}
```

Sem os erros de JSON parsing que estavam ocorrendo antes.

## Links Úteis

- **NPM Package**: https://www.npmjs.com/package/mysql-mcp-server-v1
- **GitHub Repository**: https://github.com/lrferr/mysql-mcp-server
- **Versão Corrigida**: 1.0.1
