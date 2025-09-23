#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// Verificar dependências críticas
const criticalDependencies = ['denque', 'mysql2'];

async function checkDependencies() {
  // Verificar se estamos executando via npx
  const isNpx = process.env.npm_config_user_agent && process.env.npm_config_user_agent.includes('npx');
  
  for (const dep of criticalDependencies) {
    try {
      await import(dep);
    } catch (error) {
      if (isNpx) {
        console.warn(`Warning: Dependency '${dep}' not found in npx context. This is expected behavior.`);
        console.warn('Continuing with server startup...');
        continue;
      }
      
      console.error(`Critical dependency '${dep}' is missing:`, error.message);
      console.error('This usually happens when using npx with cached packages.');
      console.error('');
      console.error('Solutions:');
      console.error('1. Install globally: npm install -g mysql-mcp-server-v1');
      console.error('2. Clear npx cache: npm cache clean --force');
      console.error('3. Use direct path configuration (see documentation)');
      console.error('4. Try: npx --yes mysql-mcp-server-v1@latest start');
      process.exit(1);
    }
  }
}

async function startServer() {
  await checkDependencies();
  
  // Importar e executar o servidor principal
  // O index.js agora executa diretamente, então apenas importamos
  await import('../src/index.js');
}

// Executar o servidor
startServer().catch(error => {
  console.error('Failed to start MySQL MCP Server:', error);
  process.exit(1);
});
