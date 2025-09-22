#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

class ConfigTester {
  constructor() {
    this.connectionManager = null;
  }

  async run() {
    console.log(chalk.blue.bold('🔧 Teste de Configurações MySQL MCP Server\n'));

    try {
      await this.testConfigFile();
      await this.testEnvironmentVariables();
      await this.showConfigurationPriority();
    } catch (error) {
      console.error(chalk.red.bold('❌ Erro durante o teste:'), error.message);
      process.exit(1);
    }
  }

  async testConfigFile() {
    console.log(chalk.yellow('📁 Testando arquivo de configuração...'));

    const configPath = path.join(projectRoot, 'config', 'mysql-connections.json');
    const examplePath = path.join(projectRoot, 'config', 'mysql-connections-example.json');

    if (fs.existsSync(configPath)) {
      console.log(chalk.green(`✅ Arquivo encontrado: ${configPath}`));
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log(chalk.gray(`   Conexões: ${Object.keys(config.connections).join(', ')}`));
        console.log(chalk.gray(`   Padrão: ${config.defaultConnection}`));
      } catch (error) {
        console.log(chalk.red(`❌ Erro ao ler: ${error.message}`));
      }
    } else {
      console.log(chalk.yellow(`⚠️  Arquivo não encontrado: ${configPath}`));
    }

    if (fs.existsSync(examplePath)) {
      console.log(chalk.green(`✅ Arquivo exemplo encontrado: ${examplePath}`));
      try {
        const config = JSON.parse(fs.readFileSync(examplePath, 'utf8'));
        console.log(chalk.gray(`   Conexões: ${Object.keys(config.connections).join(', ')}`));
        console.log(chalk.gray(`   Padrão: ${config.defaultConnection}`));
      } catch (error) {
        console.log(chalk.red(`❌ Erro ao ler exemplo: ${error.message}`));
      }
    } else {
      console.log(chalk.yellow(`⚠️  Arquivo exemplo não encontrado: ${examplePath}`));
    }

    console.log();
  }

  async testEnvironmentVariables() {
    console.log(chalk.yellow('🌍 Testando variáveis de ambiente...'));

    const envVars = [
      'MYSQL_HOST',
      'MYSQL_PORT',
      'MYSQL_USER',
      'MYSQL_PASSWORD',
      'MYSQL_DATABASE',
      'MYSQL_CONNECTIONS'
    ];

    for (const envVar of envVars) {
      const value = process.env[envVar];
      if (value) {
        if (envVar === 'MYSQL_CONNECTIONS') {
          console.log(chalk.green(`✅ ${envVar}: Configurada (JSON)`));
          try {
            const config = JSON.parse(value);
            console.log(chalk.gray(`   Conexões: ${Object.keys(config.connections).join(', ')}`));
            console.log(chalk.gray(`   Padrão: ${config.defaultConnection}`));
          } catch (error) {
            console.log(chalk.red(`   ❌ JSON inválido: ${error.message}`));
          }
        } else {
          console.log(chalk.green(`✅ ${envVar}: ${value}`));
        }
      } else {
        console.log(chalk.gray(`⚪ ${envVar}: Não configurada`));
      }
    }

    console.log();
  }

  async showConfigurationPriority() {
    console.log(chalk.yellow('📋 Prioridade de configuração:'));
    console.log(chalk.blue('   1. Arquivo config/mysql-connections.json'));
    console.log(chalk.blue('   2. Variável de ambiente MYSQL_CONNECTIONS'));
    console.log(chalk.blue('   3. Variáveis individuais (MYSQL_HOST, etc.)'));
    console.log(chalk.blue('   4. Valores padrão'));

    console.log(chalk.yellow('\n💡 Dicas:'));
    console.log(chalk.gray('   - Use o arquivo JSON para configurações permanentes'));
    console.log(chalk.gray('   - Use MYSQL_CONNECTIONS para configurações via Cursor/Claude'));
    console.log(chalk.gray('   - Use variáveis individuais para configurações simples'));
    console.log(chalk.gray('   - Copie mysql-connections-example.json para mysql-connections.json'));

    console.log(chalk.yellow('\n🔧 Para usar a conexão sigareplica:'));
    console.log(chalk.gray('   1. cp config/mysql-connections-example.json config/mysql-connections.json'));
    console.log(chalk.gray('   2. npm run test-connection'));

    console.log();
  }
}

// Executar teste de configuração
const tester = new ConfigTester();
tester.run().catch(console.error);



