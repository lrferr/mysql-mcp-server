#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

class SetupManager {
  constructor() {
    this.config = {
      mcpServerName: 'mysql-monitor',
      mcpServerVersion: '1.0.0',
      logLevel: 'info',
      mysqlHost: 'localhost',
      mysqlPort: 3306,
      mysqlUser: 'root',
      mysqlPassword: 'password',
      mysqlDatabase: 'testdb'
    };
  }

  async run() {
    console.log(chalk.blue.bold('🚀 Configuração do MySQL MCP Server\n'));

    try {
      await this.checkPrerequisites();
      await this.createDirectories();
      await this.createEnvFile();
      await this.createConfigFiles();
      await this.setupCursorIDE();
      await this.testConnection();
      await this.displaySummary();
    } catch (error) {
      console.error(chalk.red.bold('❌ Erro durante a configuração:'), error.message);
      process.exit(1);
    }
  }

  async checkPrerequisites() {
    console.log(chalk.yellow('📋 Verificando pré-requisitos...'));

    // Verificar Node.js
    const nodeVersion = process.version;
    const requiredVersion = '18.0.0';
    if (this.compareVersions(nodeVersion.slice(1), requiredVersion) < 0) {
      throw new Error(`Node.js ${requiredVersion}+ é necessário. Versão atual: ${nodeVersion}`);
    }
    console.log(chalk.green(`✅ Node.js ${nodeVersion}`));

    // Verificar npm
    const npmVersion = process.env.npm_version || 'N/A';
    console.log(chalk.green(`✅ npm ${npmVersion}`));

    // Verificar MySQL
    try {
      const { execSync } = await import('child_process');
      const mysqlVersion = execSync('mysql --version', { encoding: 'utf8' }).trim();
      console.log(chalk.green(`✅ ${mysqlVersion}`));
    } catch (error) {
      console.log(chalk.yellow('⚠️  MySQL não encontrado no PATH. Certifique-se de que está instalado.'));
    }

    console.log();
  }

  async createDirectories() {
    console.log(chalk.yellow('📁 Criando diretórios necessários...'));

    const directories = [
      'logs',
      'backups',
      'config',
      'tests/unit',
      'tests/integration',
      'tests/security',
      'tests/performance',
      'examples',
      'docs'
    ];

    for (const dir of directories) {
      const dirPath = path.join(projectRoot, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(chalk.green(`✅ Criado: ${dir}`));
      } else {
        console.log(chalk.gray(`📁 Já existe: ${dir}`));
      }
    }

    console.log();
  }

  async createEnvFile() {
    console.log(chalk.yellow('⚙️  Configurando arquivo .env...'));

    const envPath = path.join(projectRoot, '.env');
    const envExamplePath = path.join(projectRoot, 'env.example');

    if (fs.existsSync(envPath)) {
      console.log(chalk.gray('📁 Arquivo .env já existe'));
      return;
    }

    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      console.log(chalk.green('✅ Arquivo .env criado a partir do env.example'));
    } else {
      const envContent = this.generateEnvContent();
      fs.writeFileSync(envPath, envContent);
      console.log(chalk.green('✅ Arquivo .env criado'));
    }

    console.log(chalk.blue('💡 Edite o arquivo .env com suas configurações específicas'));
    console.log();
  }

  async createConfigFiles() {
    console.log(chalk.yellow('📝 Criando arquivos de configuração...'));

    // Criar mysql-connections.json
    const connectionsPath = path.join(projectRoot, 'config', 'mysql-connections.json');
    if (!fs.existsSync(connectionsPath)) {
      const connectionsConfig = {
        connections: {
          dev: {
            host: 'localhost',
            port: 3306,
            user: 'root',
            password: 'password',
            database: 'testdb',
            description: 'Development Database',
            environment: 'development'
          }
        },
        defaultConnection: 'dev',
        pool: {
          connectionLimit: 10,
          queueLimit: 0,
          waitForConnections: true,
          acquireTimeout: 60000,
          timeout: 60000
        }
      };

      fs.writeFileSync(connectionsPath, JSON.stringify(connectionsConfig, null, 2));
      console.log(chalk.green('✅ config/mysql-connections.json criado'));
    } else {
      console.log(chalk.gray('📁 config/mysql-connections.json já existe'));
    }

    // Criar mysql.json
    const mysqlConfigPath = path.join(projectRoot, 'config', 'mysql.json');
    if (!fs.existsSync(mysqlConfigPath)) {
      const mysqlConfig = {
        pool: {
          connectionLimit: 10,
          queueLimit: 0,
          waitForConnections: true,
          acquireTimeout: 60000,
          timeout: 60000
        },
        monitoring: {
          healthCheckInterval: 60000,
          schemaMonitoringInterval: 300000,
          performanceMonitoringInterval: 300000
        },
        thresholds: {
          maxConnections: 80,
          maxSlowQueries: 10,
          maxDiskUsage: 90
        }
      };

      fs.writeFileSync(mysqlConfigPath, JSON.stringify(mysqlConfig, null, 2));
      console.log(chalk.green('✅ config/mysql.json criado'));
    } else {
      console.log(chalk.gray('📁 config/mysql.json já existe'));
    }

    console.log();
  }

  async setupCursorIDE() {
    console.log(chalk.yellow('🎯 Configurando Cursor IDE...'));

    const mcpConfigPath = path.join(projectRoot, 'mcp.json');
    const mcpConfig = {
      mcpServers: {
        'mysql-monitor': {
          command: 'npm',
          args: ['start'],
          env: {
            MCP_SERVER_NAME: 'mysql-monitor',
            MCP_SERVER_VERSION: '1.0.0',
            LOG_LEVEL: 'info',
            MYSQL_CONNECTIONS: JSON.stringify({
              connections: {
                dev: {
                  host: 'localhost',
                  port: 3306,
                  user: 'root',
                  password: 'password',
                  database: 'testdb',
                  description: 'Development Database'
                }
              },
              defaultConnection: 'dev'
            })
          }
        }
      }
    };

    fs.writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2));
    console.log(chalk.green('✅ mcp.json criado para Cursor IDE'));

    console.log(chalk.blue('💡 Para usar no Cursor IDE:'));
    console.log(chalk.blue('   1. Copie o conteúdo de mcp.json'));
    console.log(chalk.blue('   2. Adicione ao seu arquivo de configuração do Cursor'));
    console.log(chalk.blue('   3. Reinicie o Cursor IDE'));
    console.log();
  }

  async testConnection() {
    console.log(chalk.yellow('🔌 Testando conexão MySQL...'));

    try {
      const { ConnectionManager } = await import('../src/connection-manager.js');
      const connectionManager = new ConnectionManager();

      const result = await connectionManager.testConnection('dev');
      if (result.success) {
        console.log(chalk.green('✅ Conexão MySQL testada com sucesso'));
      } else {
        console.log(chalk.yellow('⚠️  Conexão MySQL falhou:'), result.message);
        console.log(chalk.blue('💡 Verifique suas configurações no arquivo .env'));
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️  Não foi possível testar a conexão:'), error.message);
      console.log(chalk.blue('💡 Certifique-se de que o MySQL está rodando e as configurações estão corretas'));
    }

    console.log();
  }

  async displaySummary() {
    console.log(chalk.green.bold('🎉 Configuração concluída com sucesso!\n'));

    console.log(chalk.blue.bold('📋 Próximos passos:'));
    console.log(chalk.blue('   1. Edite o arquivo .env com suas configurações específicas'));
    console.log(chalk.blue('   2. Configure o Cursor IDE usando o arquivo mcp.json'));
    console.log(chalk.blue('   3. Execute "npm start" para iniciar o servidor'));
    console.log(chalk.blue('   4. Execute "npm run test-connection" para testar a conexão'));

    console.log(chalk.blue.bold('\n🔧 Comandos úteis:'));
    console.log(chalk.blue('   npm start              - Inicia o servidor'));
    console.log(chalk.blue('   npm run dev            - Modo desenvolvimento'));
    console.log(chalk.blue('   npm test               - Executa testes'));
    console.log(chalk.blue('   npm run test-connection - Testa conexão'));

    console.log(chalk.blue.bold('\n📚 Documentação:'));
    console.log(chalk.blue('   README.md              - Documentação principal'));
    console.log(chalk.blue('   docs/QUICKSTART.md     - Guia de início rápido'));
    console.log(chalk.blue('   docs/API.md            - Documentação da API'));
    console.log(chalk.blue('   examples/usage-examples.md - Exemplos de uso'));

    console.log(chalk.green.bold('\n✨ Pronto para usar o MySQL MCP Server!'));
  }

  generateEnvContent() {
    return `# Configurações do Servidor MCP
MCP_SERVER_NAME=mysql-monitor
MCP_SERVER_VERSION=1.0.0
LOG_LEVEL=info

# Configurações de Conexão MySQL Padrão
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DATABASE=testdb

# Configuração para Múltiplas Conexões (JSON string)
MYSQL_CONNECTIONS={"connections":{"dev":{"host":"localhost","port":3306,"user":"root","password":"password","database":"testdb","description":"Development Database"}},"defaultConnection":"dev"}

# Configurações de Pool de Conexões
MYSQL_CONNECTION_LIMIT=10
MYSQL_QUEUE_LIMIT=0
MYSQL_WAIT_FOR_CONNECTIONS=true

# Configurações de Timeout
MYSQL_CONNECT_TIMEOUT=60000
MYSQL_ACQUIRE_TIMEOUT=60000
MYSQL_TIMEOUT=60000

# Configurações de Logging
LOG_FILE=true
LOG_FILE_PATH=logs/mysql-mcp.log
LOG_MAX_SIZE=10m
LOG_MAX_FILES=5

# Configurações de Segurança
SECURITY_LOG_LEVEL=warn
ENABLE_AUDIT=true
AUDIT_LOG_PATH=logs/audit.log

# Configurações de Notificação
NOTIFICATION_ENABLED=true
NOTIFICATION_EMAIL=admin@example.com

# Configurações de Monitoramento
MONITORING_ENABLED=true
MONITORING_INTERVAL=300000
HEALTH_CHECK_INTERVAL=60000

# Configurações de Backup
BACKUP_ENABLED=true
BACKUP_INTERVAL=86400000
BACKUP_RETENTION_DAYS=30
BACKUP_PATH=backups/`;
  }

  compareVersions(version1, version2) {
    const v1parts = version1.split('.').map(Number);
    const v2parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
      const v1part = v1parts[i] || 0;
      const v2part = v2parts[i] || 0;
      
      if (v1part < v2part) return -1;
      if (v1part > v2part) return 1;
    }
    
    return 0;
  }
}

// Executar configuração
const setup = new SetupManager();
setup.run().catch(console.error);