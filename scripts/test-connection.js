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

class ConnectionTester {
  constructor() {
    this.connectionManager = null;
  }

  async run() {
    console.log(chalk.blue.bold('🔌 Teste de Conexão MySQL MCP Server\n'));

    try {
      await this.initializeConnectionManager();
      await this.testAllConnections();
      await this.displayConnectionStatus();
      await this.testSpecificOperations();
    } catch (error) {
      console.error(chalk.red.bold('❌ Erro durante o teste:'), error.message);
      process.exit(1);
    }
  }

  async initializeConnectionManager() {
    console.log(chalk.yellow('🔧 Inicializando gerenciador de conexões...'));

    try {
      const { ConnectionManager } = await import('../src/connection-manager.js');
      this.connectionManager = new ConnectionManager();
      
      // Mostrar informações sobre a origem da configuração
      this.displayConfigurationSource();
      
      console.log(chalk.green('✅ Gerenciador de conexões inicializado'));
    } catch (error) {
      throw new Error(`Falha ao inicializar gerenciador de conexões: ${error.message}`);
    }

    console.log();
  }

  displayConfigurationSource() {
    console.log(chalk.blue('📋 Fonte da configuração:'));
    
    // Verificar se existe arquivo de configuração
    const configPath = path.join(projectRoot, 'config', 'mysql-connections.json');
    const envPath = path.join(projectRoot, '.env');
    
    if (fs.existsSync(configPath)) {
      console.log(chalk.green(`✅ Arquivo: ${configPath}`));
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        console.log(chalk.gray(`   Conexões configuradas: ${Object.keys(config.connections).join(', ')}`));
        console.log(chalk.gray(`   Conexão padrão: ${config.defaultConnection}`));
      } catch (error) {
        console.log(chalk.red(`❌ Erro ao ler arquivo de configuração: ${error.message}`));
      }
    } else {
      console.log(chalk.yellow(`⚠️  Arquivo não encontrado: ${configPath}`));
    }
    
    if (fs.existsSync(envPath)) {
      console.log(chalk.green(`✅ Arquivo: ${envPath}`));
    } else {
      console.log(chalk.yellow(`⚠️  Arquivo não encontrado: ${envPath}`));
    }
    
    // Verificar variável de ambiente
    if (process.env.MYSQL_CONNECTIONS) {
      console.log(chalk.green('✅ Configuração via variável de ambiente MYSQL_CONNECTIONS'));
    } else if (process.env.MYSQL_HOST) {
      console.log(chalk.green('✅ Configuração via variáveis de ambiente individuais'));
    } else {
      console.log(chalk.yellow('⚠️  Nenhuma configuração via variáveis de ambiente encontrada'));
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
        console.log(chalk.gray(healthResult));
      } catch (error) {
        console.log(chalk.red('❌ Health check falhou:'), error.message);
      }

      console.log();

      // Testar query segura
      console.log(chalk.blue('🔍 Testando query segura...'));
      try {
        const queryResult = await monitor.executeSafeQuery('SELECT 1 + 1 AS solution');
        console.log(chalk.green('✅ Query segura executada com sucesso'));
        console.log(chalk.gray('Resultado:'));
        console.log(chalk.gray(queryResult));
      } catch (error) {
        console.log(chalk.red('❌ Query segura falhou:'), error.message);
      }

      console.log();

      // Testar informações do banco
      console.log(chalk.blue('📋 Testando informações do banco...'));
      try {
        const dbInfo = await monitor.getDatabaseInfo({
          includeUsers: false,
          includeDatabases: true
        });
        console.log(chalk.green('✅ Informações do banco obtidas com sucesso'));
        console.log(chalk.gray('Resultado:'));
        console.log(chalk.gray(dbInfo));
      } catch (error) {
        console.log(chalk.red('❌ Informações do banco falharam:'), error.message);
      }

    } catch (error) {
      console.log(chalk.red('❌ Erro ao testar operações específicas:'), error.message);
    }

    console.log();
  }

  async displaySummary() {
    console.log(chalk.green.bold('🎉 Teste de conexão concluído!\n'));

    console.log(chalk.blue.bold('📋 Resumo:'));
    console.log(chalk.blue('   - Conexões testadas'));
    console.log(chalk.blue('   - Status verificado'));
    console.log(chalk.blue('   - Operações básicas testadas'));

    console.log(chalk.blue.bold('\n🔧 Próximos passos:'));
    console.log(chalk.blue('   - Execute "npm start" para iniciar o servidor'));
    console.log(chalk.blue('   - Configure o Cursor IDE usando mcp.json'));
    console.log(chalk.blue('   - Teste as ferramentas disponíveis'));

    console.log(chalk.green.bold('\n✨ Pronto para usar o MySQL MCP Server!'));
  }
}

// Executar teste de conexão
const tester = new ConnectionTester();
tester.run().catch(console.error);