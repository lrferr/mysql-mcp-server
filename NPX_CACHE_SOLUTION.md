# 🔧 Solução para Problema de Cache do NPX

## Problema Identificado
O `npx` está usando um cache antigo onde as dependências não estão instaladas corretamente, causando o erro:
```
Critical dependency 'denque' is missing: Cannot find package 'C:\Users\ufpr\AppData\Local\npm-cache\_npx\1fe4ec6f4f1ec138\node_modules\denque\index.js'
```

## 🚀 Soluções Disponíveis

### Solução 1: Instalar Globalmente (Recomendada)
```bash
npm install -g mysql-mcp-server-v1@latest
```

Depois use esta configuração no seu `~/.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "mysql-monitor-npm": {
      "command": "mysql-mcp-server-v1",
      "env": {
        "MCP_SERVER_NAME": "mysql-monitor",
        "MCP_SERVER_VERSION": "1.0.3",
        "LOG_LEVEL": "info",
        "MYSQL_CONNECTIONS": "{\"connections\":{\"sigareplica\":{\"host\":\"10.200.110.10\",\"port\":3306,\"user\":\"sigareplica\",\"password\":\"SMJHmFhJgAf4q81EoDPb\",\"database\":\"mysql\"}},\"defaultConnection\":\"sigareplica\"}"
      }
    }
  }
}
```

### Solução 2: Limpar Cache do NPX
```bash
npm cache clean --force
npx --yes mysql-mcp-server-v1@latest --help
```

Depois use a configuração original:
```json
{
  "mcpServers": {
    "mysql-monitor-npm": {
      "command": "npx",
      "args": ["mysql-mcp-server-v1@latest"],
      "env": {
        "MCP_SERVER_NAME": "mysql-monitor",
        "MCP_SERVER_VERSION": "1.0.3",
        "LOG_LEVEL": "info",
        "MYSQL_CONNECTIONS": "{\"connections\":{\"sigareplica\":{\"host\":\"10.200.110.10\",\"port\":3306,\"user\":\"sigareplica\",\"password\":\"SMJHmFhJgAf4q81EoDPb\",\"database\":\"mysql\"}},\"defaultConnection\":\"sigareplica\"}"
      }
    }
  }
}
```

### Solução 3: Usar Caminho Direto
Se você instalou globalmente, use o caminho direto:
```json
{
  "mcpServers": {
    "mysql-monitor-npm": {
      "command": "node",
      "args": ["C:\\Users\\ufpr\\AppData\\Roaming\\npm\\node_modules\\mysql-mcp-server-v1\\src\\index.js"],
      "env": {
        "MCP_SERVER_NAME": "mysql-monitor",
        "MCP_SERVER_VERSION": "1.0.3",
        "LOG_LEVEL": "info",
        "MYSQL_CONNECTIONS": "{\"connections\":{\"sigareplica\":{\"host\":\"10.200.110.10\",\"port\":3306,\"user\":\"sigareplica\",\"password\":\"SMJHmFhJgAf4q81EoDPb\",\"database\":\"mysql\"}},\"defaultConnection\":\"sigareplica\"}"
      }
    }
  }
}
```

### Solução 4: Usar Script Direto (Nova)
Use o novo script direto que não depende do npx:
```json
{
  "mcpServers": {
    "mysql-monitor-npm": {
      "command": "npx",
      "args": ["mysql-mcp-server-direct@latest"],
      "env": {
        "MCP_SERVER_NAME": "mysql-monitor",
        "MCP_SERVER_VERSION": "1.0.3",
        "LOG_LEVEL": "info",
        "MYSQL_CONNECTIONS": "{\"connections\":{\"sigareplica\":{\"host\":\"10.200.110.10\",\"port\":3306,\"user\":\"sigareplica\",\"password\":\"SMJHmFhJgAf4q81EoDPb\",\"database\":\"mysql\"}},\"defaultConnection\":\"sigareplica\"}"
      }
    }
  }
}
```

## 📋 Passos para Aplicar

1. **Escolha uma das soluções acima**
2. **Pare o Cursor completamente**
3. **Execute o comando da solução escolhida** (se necessário)
4. **Atualize o arquivo `~/.cursor/mcp.json`** com a configuração correspondente
5. **Reinicie o Cursor**
6. **Teste a conexão MCP**

## ✅ Verificação

Após aplicar uma das soluções, você deve ver:
- ✅ Servidor iniciando sem erros
- ✅ Mensagem "Server started and connected successfully"
- ✅ Sem erros de dependências faltantes
- ✅ Conexão MCP funcionando corretamente

## 🔗 Links Úteis

- **NPM Package**: https://www.npmjs.com/package/mysql-mcp-server-v1
- **GitHub Repository**: https://github.com/lrferr/mysql-mcp-server
- **Versão Atual**: 1.0.3
