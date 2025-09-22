#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// Verificar dependências críticas
const criticalDependencies = ['denque', 'mysql2'];

async function checkDependencies() {
  for (const dep of criticalDependencies) {
    try {
      await import(dep);
    } catch (error) {
      console.error(`Critical dependency '${dep}' is missing:`, error.message);
      console.error('This usually happens when using npx with cached packages.');
      console.error('');
      console.error('Solutions:');
      console.error('1. Install globally: npm install -g mysql-mcp-server-v1');
      console.error('2. Clear npx cache: npm cache clean --force');
      console.error('3. Use direct path configuration (see documentation)');
      process.exit(1);
    }
  }
}

async function startServer() {
  await checkDependencies();
  
  // Importar e executar o servidor principal
  const { default: server } = await import('../src/index.js');
  return server;
}

// Executar o servidor
startServer().catch(error => {
  console.error('Failed to start MySQL MCP Server:', error);
  process.exit(1);
});
