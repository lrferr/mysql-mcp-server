#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

async function startServer() {
  // Importar e executar o servidor principal
  // O index.js agora executa diretamente, então apenas importamos
  await import('../src/index.js');
}

// Executar o servidor
startServer().catch(error => {
  console.error('Failed to start MySQL MCP Server:', error);
  process.exit(1);
});
