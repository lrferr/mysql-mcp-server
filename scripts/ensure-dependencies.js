#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

// Verificar se as dependências críticas estão disponíveis
const criticalDependencies = [
  'denque',
  'mysql2',
  '@modelcontextprotocol/sdk'
];

let missingDependencies = [];

for (const dep of criticalDependencies) {
  try {
    await import(dep);
  } catch (error) {
    missingDependencies.push(dep);
  }
}

if (missingDependencies.length > 0) {
  console.error('Missing critical dependencies:', missingDependencies);
  console.error('Please run: npm install');
  process.exit(1);
}

// Se chegou até aqui, as dependências estão OK
console.log('All critical dependencies are available');
