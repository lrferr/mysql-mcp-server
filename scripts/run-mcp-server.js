#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// Função para executar o servidor MCP diretamente
function runMCPServer() {
  const serverPath = resolve(projectRoot, 'src', 'index.js');
  
  // Executar o servidor principal diretamente
  const serverProcess = spawn('node', [serverPath], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production'
    }
  });

  serverProcess.on('error', (error) => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  });

  serverProcess.on('exit', (code) => {
    process.exit(code);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    serverProcess.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    serverProcess.kill('SIGTERM');
  });
}

// Verificar se estamos sendo executados diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  runMCPServer();
}

export { runMCPServer };
