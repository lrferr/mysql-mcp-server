#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

async function ensureDependencies() {
  // Verificar se estamos em um contexto npx
  const isNpx = process.env.npm_config_user_agent && process.env.npm_config_user_agent.includes('npx');
  
  if (isNpx) {
    try {
      // Tentar importar dependências críticas
      await import('denque');
      await import('mysql2');
    } catch (error) {
      console.error('❌ Dependências não encontradas no contexto npx');
      console.error('🔧 Tentando instalar dependências automaticamente...');
      
      try {
        // Tentar instalar dependências críticas
        execSync('npm install denque@^2.1.0 mysql2@^3.11.5', { 
          stdio: 'pipe',
          cwd: projectRoot 
        });
        console.log('✅ Dependências instaladas com sucesso!');
      } catch (installError) {
        console.error('❌ Falha ao instalar dependências automaticamente');
        console.error('💡 Soluções:');
        console.error('   1. Instale globalmente: npm install -g mysql-mcp-server-v1');
        console.error('   2. Use: npx --yes mysql-mcp-server-v1@latest start');
        console.error('   3. Limpe o cache: npm cache clean --force');
        process.exit(1);
      }
    }
  }
}

async function startServer() {
  await ensureDependencies();
  
  // Importar e executar o servidor principal
  // O index.js agora executa diretamente, então apenas importamos
  await import('../src/index.js');
}

// Executar o servidor
startServer().catch(error => {
  console.error('Failed to start MySQL MCP Server:', error);
  process.exit(1);
});
