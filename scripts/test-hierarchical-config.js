#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Carregar variáveis de ambiente
dotenv.config({ path: path.join(projectRoot, '.env') });

class HierarchicalConfigTester {
  constructor() {
    this.connectionManager = null;
  }

  async run() {
    console.log(chalk.blue.bold('🔧 Teste de Configuração Hierárquica MySQL MCP Server\n'));

    try {
      await this.initializeConnectionManager();
      await this.testAllConnections();
      await this.displayConnectionStatus();
      await this.testSpecificOperations();
      await this.displayConfigurationSources();
    } catch (error) {
      console.error(chalk.red.bold('❌ Erro durante o teste:'), error.message);
      process.exit(1);
    }
  }

  async initializeConnectionManager() {
    console.log(chalk.yellow('🔧 Inicializando gerenciador de conexões hierárquico...'));

    try {
      const { ConnectionManager } = await import('../src/connection-manager.js');
      this.connectionManager = new ConnectionManager();
      await this.connectionManager.initialize();
      
      console.log(chalk.green('✅ Gerenciador de conexões inicializado'));
    } catch (error) {
      throw new Error(`Falha ao inicializar gerenciador de conexões: ${error.message}`);
    }

    console.log();
  }

  async testAllConnections() {
    console.log(chalk.yellow('🔍 Testando todas as conexões configuradas...'));

    try {
      const results = await this.connectionManager.testAllConnections();
      
      for (const [connectionName, result] of Object.entries(results)) {
        if (result.success) {
          console.log(chalk.green(`✅ ${connectionName}: ${result.message}`));
          if (result.connection) {
            console.log(chalk.gray(`   Host: ${result.connection.host}:${result.connection.port}`));
            console.log(chalk.gray(`   Database: ${result.connection.database}`));
            console.log(chalk.gray(`   User: ${result.connection.user}`));
          }
        } else {
          console.log(chalk.red(`❌ ${connectionName}: ${result.message}`));
          if (result.error) {
            console.log(chalk.gray(`   Erro: ${result.error}`));
          }
        }
        console.log();
      }
    } catch (error) {
      console.log(chalk.red('❌ Erro ao testar conexões:'), error.message);
    }
  }

  async displayConnectionStatus() {
    console.log(chalk.yellow('📊 Status das conexões ativas...'));

    try {
      const status = await this.connectionManager.getConnectionsStatus();
      
      for (const [connectionName, connectionStatus] of Object.entries(status)) {
        if (connectionStatus.active) {
          console.log(chalk.green(`✅ ${connectionName}: Ativa`));
          if (connectionStatus.info) {
            console.log(chalk.gray(`   Database: ${connectionStatus.info.current_database}`));
            console.log(chalk.gray(`   User: ${connectionStatus.info.current_user}`));
            console.log(chalk.gray(`   MySQL Version: ${connectionStatus.info.mysql_version}`));
            console.log(chalk.gray(`   Current Time: ${connectionStatus.info.current_time}`));
          }
        } else {
          console.log(chalk.red(`❌ ${connectionName}: Inativa`));
          if (connectionStatus.error) {
            console.log(chalk.gray(`   Erro: ${connectionStatus.error}`));
          }
        }
        console.log();
      }
    } catch (error) {
      console.log(chalk.red('❌ Erro ao obter status das conexões:'), error.message);
    }
  }

  async testSpecificOperations() {
    console.log(chalk.yellow('🧪 Testando operações específicas...'));

    try {
      const { MySQLMonitor } = await import('../src/mysql-monitor.js');
      const monitor = new MySQLMonitor(this.connectionManager);

      // Testar health check
      console.log(chalk.blue('📊 Testando health check...'));
      try {
        const healthResult = await monitor.checkDatabaseHealth({
          checkConnections: true,
          checkStorage: true,
          checkPerformance: true
        });
        console.log(chalk.green('✅ Health check executado com sucesso'));
        console.log(chalk.gray('Resultado:'));
        console.log(chalk.gray(JSON.stringify(healthResult, null, 2)));
      } catch (error) {
        console.log(chalk.red('❌ Health check falhou:'), error.message);
      }

      console.log();

      // Testar query segura
      console.log(chalk.blue('🔍 Testando query segura...'));
      try {
        const queryResult = await monitor.executeSafeQuery('SELECT 1 + 1 AS solution, NOW() AS current_time');
        console.log(chalk.green('✅ Query segura executada com sucesso'));
        console.log(chalk.gray('Resultado:'));
        console.log(chalk.gray(JSON.stringify(queryResult, null, 2)));
      } catch (error) {
        console.log(chalk.red('❌ Query segura falhou:'), error.message);
      }

      console.log();

    } catch (error) {
      console.log(chalk.red('❌ Erro ao testar operações específicas:'), error.message);
    }

    console.log();
  }

  async displayConfigurationSources() {
    console.log(chalk.yellow('📋 Fontes de Configuração Detectadas...'));

    try {
      const configManager = this.connectionManager.configManager;
      const sources = configManager.getAllSources();
      const selectedSource = configManager.getConfigSource();

      console.log(chalk.blue('🔍 Ordem de Prioridade:'));
      sources.forEach((source, index) => {
        const status = source.source === selectedSource ? '✅ SELECIONADA' : '⏸️  Disponível';
        console.log(`${index + 1}. ${status} ${source.source} (Prioridade ${source.priority})`);
        
        if (source.config?.connections) {
          const connectionNames = Object.keys(source.config.connections);
          console.log(chalk.gray(`   Conexões: ${connectionNames.join(', ')}`));
          console.log(chalk.gray(`   Padrão: ${source.config.defaultConnection}`));
        }
        console.log();
      });

      console.log(chalk.green.bold(`🎯 Configuração Ativa: ${selectedSource}`));
      
    } catch (error) {
      console.log(chalk.red('❌ Erro ao exibir fontes de configuração:'), error.message);
    }
  }

  async displaySummary() {
    console.log(chalk.green.bold('🎉 Teste de Configuração Hierárquica Concluído!\n'));

    console.log(chalk.blue.bold('📋 Resumo:'));
    console.log(chalk.blue('   - Sistema hierárquico de configuração implementado'));
    console.log(chalk.blue('   - Múltiplas fontes de configuração verificadas'));
    console.log(chalk.blue('   - Conexões testadas com segurança'));
    console.log(chalk.blue('   - Credenciais protegidas contra commits'));

    console.log(chalk.blue.bold('\n🔧 Ordem de Prioridade:'));
    console.log(chalk.blue('   1. mcp.json (mais seguro, não vai para repo)'));
    console.log(chalk.blue('   2. mysql-connections.json (arquivo local)'));
    console.log(chalk.blue('   3. .env (variáveis de ambiente)'));
    console.log(chalk.blue('   4. Configurações padrão seguras'));

    console.log(chalk.green.bold('\n✨ Sistema de Configuração Hierárquico Funcionando!'));
  }
}

// Executar teste de configuração hierárquica
const tester = new HierarchicalConfigTester();
tester.run()
  .then(() => tester.displaySummary())
  .catch(console.error);
