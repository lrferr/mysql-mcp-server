#!/usr/bin/env node

console.error('Starting debug server...');

try {
  console.error('Importing @modelcontextprotocol/sdk...');
  const { Server } = await import('@modelcontextprotocol/sdk/server/index.js');
  console.error('SDK imported successfully');

  console.error('Importing transport...');
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
  console.error('Transport imported successfully');

  console.error('Importing types...');
  const { CallToolRequestSchema, ListToolsRequestSchema } = await import('@modelcontextprotocol/sdk/types.js');
  console.error('Types imported successfully');

  console.error('Creating server...');
  const server = new Server(
    {
      name: 'mysql-mcp-server-debug',
      version: '1.0.4'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );
  console.error('Server created successfully');

  console.error('Creating transport...');
  const transport = new StdioServerTransport();
  console.error('Transport created successfully');

  console.error('Setting up handlers...');
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'test',
          description: 'Test tool',
          inputSchema: {
            type: 'object',
            properties: {},
            required: []
          }
        }
      ]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    return {
      content: [
        {
          type: 'text',
          text: 'Test tool executed successfully'
        }
      ]
    };
  });
  console.error('Handlers set successfully');

  console.error('Connecting server...');
  await server.connect(transport);
  console.error('MySQL MCP Server iniciado com sucesso!');

} catch (error) {
  console.error('Error starting server:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
}
