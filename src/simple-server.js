#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// Criar servidor MCP simples
const server = new Server(
  {
    name: 'mysql-mcp-server-v1',
    version: '1.0.3'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Transporte stdio
const transport = new StdioServerTransport();

// Listar ferramentas disponíveis
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'test_connection',
        description: 'Testa conexão com MySQL',
        inputSchema: {
          type: 'object',
          properties: {
            host: { type: 'string', description: 'Host do MySQL' },
            port: { type: 'number', description: 'Porta do MySQL' },
            user: { type: 'string', description: 'Usuário do MySQL' },
            password: { type: 'string', description: 'Senha do MySQL' },
            database: { type: 'string', description: 'Nome do banco de dados' }
          },
          required: ['host', 'user', 'password', 'database']
        }
      }
    ]
  };
});

// Executar ferramentas
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === 'test_connection') {
      // Teste simples de conexão
      const mysql = await import('mysql2/promise');
      const connection = await mysql.createConnection({
        host: args.host,
        port: args.port || 3306,
        user: args.user,
        password: args.password,
        database: args.database
      });

      await connection.execute('SELECT 1 as test');
      await connection.end();

      return {
        content: [
          {
            type: 'text',
            text: '✅ Conexão com MySQL estabelecida com sucesso!'
          }
        ]
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `Ferramenta '${name}' não implementada ainda.`
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Erro: ${error.message}`
        }
      ],
      isError: true
    };
  }
});

// Iniciar servidor
async function startServer() {
  try {
    await server.connect(transport);
    console.error('MySQL MCP Server iniciado com sucesso!');
  } catch (error) {
    console.error('Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

startServer();
