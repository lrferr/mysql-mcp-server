import mysql from 'mysql2/promise';
import { Logger } from './logger.js';
import ConfigManager from './config-manager.js';

export class ConnectionManager {
  constructor() {
    this.logger = new Logger();
    this.connections = new Map();
    this.config = null;
    this.configManager = new ConfigManager();
    this.initialized = false;
  }

  async initialize() {
    if (!this.initialized) {
      await this.loadConfig();
      this.initialized = true;
    }
    return this;
  }

  async loadConfig() {
    try {
      // Usar o novo sistema hierárquico de configuração
      this.config = await this.configManager.loadConfigurations();
      this.config = this.configManager.getFinalConfig();
      const source = this.configManager.getConfigSource();
      
      this.logger.info(`Configuração carregada de: ${source}`);
      this.logger.info(`Conexões disponíveis: ${Object.keys(this.config.connections).join(', ')}`);
      this.logger.info(`Conexão padrão: ${this.config.defaultConnection}`);
    } catch (error) {
      this.logger.error('Erro ao carregar configuração de conexões:', error);
      throw new Error(`Falha ao carregar configuração: ${error.message}`);
    }
  }

  async getConnection(connectionName = null) {
    await this.initialize();
    
    if (!this.config || !this.config.connections) {
      throw new Error('Configuração de conexões não carregada');
    }
    
    const connName = connectionName || this.config.defaultConnection;
    
    if (!this.config.connections[connName]) {
      throw new Error(`Conexão '${connName}' não encontrada na configuração`);
    }

    // Verificar se já existe uma conexão ativa
    if (this.connections.has(connName)) {
      const existingConn = this.connections.get(connName);
      try {
        // Testar se a conexão ainda está ativa
        await existingConn.execute('SELECT 1');
        return existingConn;
      } catch (error) {
        // Conexão inativa, remover do cache
        this.connections.delete(connName);
        this.logger.warn(`Conexão '${connName}' estava inativa, removida do cache`);
      }
    }

    // Criar nova conexão
    try {
      const connConfig = this.config.connections[connName];
      
      // Filtrar apenas configurações válidas para o MySQL2
      const validConfig = {
        host: connConfig.host,
        port: connConfig.port,
        user: connConfig.user,
        password: connConfig.password,
        database: connConfig.database
      };

      const connection = await mysql.createConnection(validConfig);
      
      // Armazenar no cache
      this.connections.set(connName, connection);
      
      this.logger.info(`Conexão '${connName}' estabelecida com sucesso`);
      return connection;
    } catch (error) {
      this.logger.error(`Erro ao conectar com '${connName}':`, error);
      throw new Error(`Falha na conexão '${connName}': ${error.message}`);
    }
  }

  async getConnectionConfig(connectionName = null) {
    if (!this.config || !this.config.connections) {
      throw new Error('Configuração de conexões não carregada');
    }
    
    const connName = connectionName || this.config.defaultConnection;
    
    if (!this.config.connections[connName]) {
      throw new Error(`Conexão '${connName}' não encontrada na configuração`);
    }

    return this.config.connections[connName];
  }

  async closeConnection(connectionName) {
    if (this.connections.has(connectionName)) {
      try {
        const connection = this.connections.get(connectionName);
        await connection.end();
        this.connections.delete(connectionName);
        this.logger.info(`Conexão '${connectionName}' fechada com sucesso`);
      } catch (error) {
        this.logger.error(`Erro ao fechar conexão '${connectionName}':`, error);
      }
    }
  }

  async closeAllConnections() {
    const closePromises = [];
    
    for (const [connName, connection] of this.connections) {
      closePromises.push(
        connection.end().catch(error => {
          this.logger.error(`Erro ao fechar conexão '${connName}':`, error);
        })
      );
    }
    
    await Promise.all(closePromises);
    this.connections.clear();
    this.logger.info('Todas as conexões foram fechadas');
  }

  getAvailableConnections() {
    if (!this.config || !this.config.connections) {
      return [];
    }
    return Object.keys(this.config.connections).map(name => ({
      name,
      description: this.config.connections[name].description,
      environment: this.config.connections[name].environment || 'default'
    }));
  }

  // Método listConnections para compatibilidade com o servidor MCP
  listConnections() {
    return this.getAvailableConnections();
  }

  getDefaultConnection() {
    return this.config ? this.config.defaultConnection : null;
  }

  async testConnection(connectionName) {
    try {
      const connection = await this.getConnection(connectionName);
      await connection.execute('SELECT 1');
      
      const connectionConfig = this.config && this.config.connections ? this.config.connections[connectionName] : null;
      
      return {
        success: true,
        message: `Conexão '${connectionName}' testada com sucesso`,
        connection: connectionConfig
      };
    } catch (error) {
      return {
        success: false,
        message: `Falha no teste da conexão '${connectionName}': ${error.message}`,
        error: error.message
      };
    }
  }

  async testAllConnections() {
    if (!this.config || !this.config.connections) {
      return {};
    }
    
    const results = {};
    
    for (const connName of Object.keys(this.config.connections)) {
      results[connName] = await this.testConnection(connName);
    }
    
    return results;
  }

  // Método para obter informações de monitoramento de todas as conexões
  async getConnectionsStatus() {
    const status = {};
    
    for (const [connName, connection] of this.connections) {
      try {
        const result = await connection.execute('SELECT DATABASE() as `current_database`, USER() as `current_user`, @@hostname as `server_host`');
        
        status[connName] = {
          active: true,
          info: {
            current_database: result[0][0].current_database,
            current_user: result[0][0].current_user,
            server_host: result[0][0].server_host,
            database: result[0][0].current_database,
            user: result[0][0].current_user,
            host: result[0][0].server_host
          }
        };
      } catch (error) {
        status[connName] = {
          active: false,
          error: error.message
        };
      }
    }
    
    return status;
  }
}
