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

class MySQLMCPCLI {
  constructor() {
    this.connectionManager = null;
    this.monitor = null;
  }

  async run() {
    const args = process.argv.slice(2);
    const command = args[0];

    // Verificar se está sendo executado como servidor MCP
    const isMCPServer = process.env.MCP_SERVER_NAME || process.env.NODE_ENV === 'mcp';
    
    if (!isMCPServer) {
      console.log(chalk.blue.bold('🔧 MySQL MCP CLI\n'));
    }

    // Se está sendo executado como servidor MCP, não executar comandos CLI
    if (isMCPServer) {
      return;
    }

    try {
      switch (command) {
        case 'setup':
          await this.setup();
          break;
        case 'test':
          await this.test();
          break;
        case 'health':
          await this.health();
          break;
        case 'info':
          await this.info();
          break;
        case 'query':
          await this.query(args.slice(1));
          break;
        case 'monitor':
          await this.monitor();
          break;
        case 'backup':
          await this.backup();
          break;
        case 'restore':
          await this.restore(args.slice(1));
          break;
        case 'help':
        case '--help':
        case '-h':
          this.help();
          break;
        default:
          console.log(chalk.red('❌ Comando não reconhecido. Use "help" para ver os comandos disponíveis.'));
          this.help();
          break;
      }
    } catch (error) {
      console.error(chalk.red.bold('❌ Erro:'), error.message);
      process.exit(1);
    }
  }

  async initialize() {
    if (!this.connectionManager) {
      const { ConnectionManager } = await import('../src/connection-manager.js');
      const { MySQLMonitor } = await import('../src/mysql-monitor.js');
      
      this.connectionManager = new ConnectionManager();
      this.monitor = new MySQLMonitor(this.connectionManager);
    }
  }

  async setup() {
    console.log(chalk.yellow('⚙️  Executando configuração...'));
    
    try {
      const { execSync } = await import('child_process');
      execSync('npm run setup', { stdio: 'inherit', cwd: projectRoot });
      console.log(chalk.green('✅ Configuração concluída!'));
    } catch (error) {
      throw new Error(`Falha na configuração: ${error.message}`);
    }
  }

  async test() {
    console.log(chalk.yellow('🔌 Testando conexões...'));
    
    try {
      const { execSync } = await import('child_process');
      execSync('npm run test-connection', { stdio: 'inherit', cwd: projectRoot });
      console.log(chalk.green('✅ Teste de conexão concluído!'));
    } catch (error) {
      throw new Error(`Falha no teste de conexão: ${error.message}`);
    }
  }

  async health() {
    console.log(chalk.yellow('📊 Verificando saúde do banco...'));
    
    await this.initialize();
    
    try {
      const result = await this.monitor.checkDatabaseHealth({
        checkConnections: true,
        checkStorage: true,
        checkPerformance: true
      });
      
      console.log(chalk.green('✅ Health check concluído!'));
      console.log('\n' + result);
    } catch (error) {
      throw new Error(`Falha no health check: ${error.message}`);
    }
  }

  async info() {
    console.log(chalk.yellow('📋 Obtendo informações do banco...'));
    
    await this.initialize();
    
    try {
      const result = await this.monitor.getDatabaseInfo({
        includeUsers: false,
        includeDatabases: true
      });
      
      console.log(chalk.green('✅ Informações obtidas!'));
      console.log('\n' + result);
    } catch (error) {
      throw new Error(`Falha ao obter informações: ${error.message}`);
    }
  }

  async query(args) {
    if (args.length === 0) {
      throw new Error('Query SQL é obrigatória. Use: mysql-mcp query "SELECT * FROM users"');
    }

    const query = args.join(' ');
    console.log(chalk.yellow(`🔍 Executando query: ${query}`));
    
    await this.initialize();
    
    try {
      const result = await this.monitor.executeSafeQuery(query);
      
      console.log(chalk.green('✅ Query executada com sucesso!'));
      console.log('\n' + result);
    } catch (error) {
      throw new Error(`Falha na execução da query: ${error.message}`);
    }
  }

  async monitor() {
    console.log(chalk.yellow('👁️  Iniciando monitoramento...'));
    
    await this.initialize();
    
    try {
      const result = await this.monitor.monitorSchemaChanges({
        databases: ['information_schema', 'mysql', 'performance_schema']
      });
      
      console.log(chalk.green('✅ Monitoramento concluído!'));
      console.log('\n' + result);
    } catch (error) {
      throw new Error(`Falha no monitoramento: ${error.message}`);
    }
  }

  async backup() {
    console.log(chalk.yellow('💾 Criando backup...'));
    
    try {
      const { execSync } = await import('child_process');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(projectRoot, 'backups', `backup-${timestamp}.sql`);
      
      // Criar diretório de backup se não existir
      const backupDir = path.dirname(backupFile);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      // Executar mysqldump
      const host = process.env.MYSQL_HOST || 'localhost';
      const port = process.env.MYSQL_PORT || '3306';
      const user = process.env.MYSQL_USER || 'root';
      const password = process.env.MYSQL_PASSWORD || 'password';
      const database = process.env.MYSQL_DATABASE || 'testdb';
      
      const mysqldumpCmd = `mysqldump -h ${host} -P ${port} -u ${user} -p${password} ${database} > "${backupFile}"`;
      
      execSync(mysqldumpCmd, { stdio: 'inherit' });
      
      console.log(chalk.green(`✅ Backup criado: ${backupFile}`));
    } catch (error) {
      throw new Error(`Falha na criação do backup: ${error.message}`);
    }
  }

  async restore(args) {
    if (args.length === 0) {
      throw new Error('Arquivo de backup é obrigatório. Use: mysql-mcp restore backup.sql');
    }

    const backupFile = args[0];
    console.log(chalk.yellow(`🔄 Restaurando backup: ${backupFile}`));
    
    if (!fs.existsSync(backupFile)) {
      throw new Error(`Arquivo de backup não encontrado: ${backupFile}`);
    }
    
    try {
      const { execSync } = await import('child_process');
      
      const host = process.env.MYSQL_HOST || 'localhost';
      const port = process.env.MYSQL_PORT || '3306';
      const user = process.env.MYSQL_USER || 'root';
      const password = process.env.MYSQL_PASSWORD || 'password';
      const database = process.env.MYSQL_DATABASE || 'testdb';
      
      const mysqlCmd = `mysql -h ${host} -P ${port} -u ${user} -p${password} ${database} < "${backupFile}"`;
      
      execSync(mysqlCmd, { stdio: 'inherit' });
      
      console.log(chalk.green(`✅ Backup restaurado: ${backupFile}`));
    } catch (error) {
      throw new Error(`Falha na restauração do backup: ${error.message}`);
    }
  }

  help() {
    console.log(chalk.blue.bold('📚 Comandos Disponíveis:\n'));
    
    console.log(chalk.blue('  setup'));
    console.log(chalk.gray('    Configura o projeto e cria arquivos necessários\n'));
    
    console.log(chalk.blue('  test'));
    console.log(chalk.gray('    Testa as conexões configuradas\n'));
    
    console.log(chalk.blue('  health'));
    console.log(chalk.gray('    Verifica a saúde do banco de dados\n'));
    
    console.log(chalk.blue('  info'));
    console.log(chalk.gray('    Obtém informações gerais do banco de dados\n'));
    
    console.log(chalk.blue('  query "SQL"'));
    console.log(chalk.gray('    Executa uma query SELECT segura\n'));
    
    console.log(chalk.blue('  monitor'));
    console.log(chalk.gray('    Monitora mudanças no schema do banco\n'));
    
    console.log(chalk.blue('  backup'));
    console.log(chalk.gray('    Cria um backup do banco de dados\n'));
    
    console.log(chalk.blue('  restore backup.sql'));
    console.log(chalk.gray('    Restaura um backup do banco de dados\n'));
    
    console.log(chalk.blue('  help'));
    console.log(chalk.gray('    Mostra esta ajuda\n'));
    
    console.log(chalk.yellow.bold('📝 Exemplos:\n'));
    
    console.log(chalk.gray('  mysql-mcp setup'));
    console.log(chalk.gray('  mysql-mcp test'));
    console.log(chalk.gray('  mysql-mcp health'));
    console.log(chalk.gray('  mysql-mcp query "SELECT * FROM users LIMIT 10"'));
    console.log(chalk.gray('  mysql-mcp backup'));
    console.log(chalk.gray('  mysql-mcp restore backups/backup-2024-12-19.sql'));
    
    console.log(chalk.green.bold('\n✨ Para mais informações, consulte a documentação!'));
  }
}

// Executar CLI
const cli = new MySQLMCPCLI();
cli.run().catch(console.error);