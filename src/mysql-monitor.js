import mysql from 'mysql2/promise';
import { Logger } from './logger.js';
import { ConnectionManager } from './connection-manager.js';

export class MySQLMonitor {
  constructor(connectionManager = null) {
    this.logger = new Logger();
    this.connectionManager = connectionManager || new ConnectionManager();
    
    // Manter compatibilidade com configuração antiga
    this.connectionConfig = {
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER || 'root',
      password: process.env.MYSQL_PASSWORD || '',
      database: process.env.MYSQL_DATABASE || 'mysql'
    };
  }

  async getConnection(connectionName = null) {
    try {
      // Se temos um ConnectionManager, usar ele
      if (this.connectionManager) {
        return await this.connectionManager.getConnection(connectionName);
      }
      
      // Fallback para configuração antiga
      const connection = await mysql.createConnection(this.connectionConfig);
      return connection;
    } catch (error) {
      this.logger.error('Erro ao conectar com MySQL:', error);
      throw new Error(`Falha na conexão: ${error.message}`);
    }
  }

  async checkDatabaseHealth(options = {}) {
    const {
      checkConnections = true,
      checkStorage = true,
      checkPerformance = true,
      connectionName = null
    } = options;

    let connection;
    let results = [];

    try {
      connection = await this.getConnection(connectionName);
      
      if (checkConnections) {
        const connections = await this.checkConnections(connection);
        results.push(`### Conexões Ativas\n${connections}`);
      }

      if (checkStorage) {
        const storage = await this.checkStorage(connection);
        results.push(`### Status do Armazenamento\n${storage}`);
      }

      if (checkPerformance) {
        const performance = await this.checkPerformance(connection);
        results.push(`### Métricas de Performance\n${performance}`);
      }

      return results.join('\n\n');
    } catch (error) {
      this.logger.error('Erro ao verificar saúde do banco:', error);
      return `❌ Erro ao verificar saúde do banco: ${error.message}`;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async checkConnections(connection) {
    const query = `
      SELECT 
        COUNT(*) as total_connections,
        COUNT(CASE WHEN COMMAND != 'Sleep' THEN 1 END) as active_connections,
        COUNT(CASE WHEN COMMAND = 'Sleep' THEN 1 END) as idle_connections
      FROM information_schema.PROCESSLIST 
      WHERE USER != 'system user'
    `;

    const [rows] = await connection.execute(query);
    const row = rows[0];
    
    return `- Total de Conexões: ${row.total_connections}
- Conexões Ativas: ${row.active_connections}
- Conexões Idle: ${row.idle_connections}`;
  }

  async checkStorage(connection) {
    const query = `
      SELECT 
        table_schema,
        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS size_mb
      FROM information_schema.tables 
      WHERE table_schema NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
      GROUP BY table_schema
      ORDER BY size_mb DESC
      LIMIT 10
    `;

    const [rows] = await connection.execute(query);
    let output = '';
    
    for (const row of rows) {
      const status = row.size_mb > 1000 ? '⚠️' : row.size_mb > 100 ? '⚡' : '✅';
      output += `${status} ${row.table_schema}: ${row.size_mb}MB\n`;
    }

    return output || 'Nenhum database encontrado';
  }

  async checkPerformance(connection) {
    const queries = [
      {
        name: 'QPS (Queries per Second)',
        query: 'SHOW GLOBAL STATUS LIKE \'Queries\''
      },
      {
        name: 'Uptime',
        query: 'SHOW GLOBAL STATUS LIKE \'Uptime\''
      },
      {
        name: 'Threads Connected',
        query: 'SHOW GLOBAL STATUS LIKE \'Threads_connected\''
      },
      {
        name: 'Max Used Connections',
        query: 'SHOW GLOBAL STATUS LIKE \'Max_used_connections\''
      }
    ];

    let output = '';
    for (const q of queries) {
      try {
        const [rows] = await connection.execute(q.query);
        if (rows.length > 0) {
          output += `- ${q.name}: ${rows[0].Value}\n`;
        }
      } catch (error) {
        output += `- ${q.name}: Erro ao obter métrica\n`;
      }
    }

    return output;
  }

  async monitorSchemaChanges(options = {}) {
    const { schemas = ['mysql', 'information_schema', 'performance_schema'] } = options;
    let connection;

    try {
      connection = await this.getConnection();
      const results = [];

      for (const schema of schemas) {
        const changes = await this.getSchemaChanges(connection, schema);
        if (changes) {
          results.push(`### Mudanças no Schema ${schema}\n${changes}`);
        }
      }

      if (results.length === 0) {
        return '✅ Nenhuma mudança detectada nos schemas monitorados';
      }

      return results.join('\n\n');
    } catch (error) {
      this.logger.error('Erro ao monitorar mudanças:', error);
      return `❌ Erro ao monitorar mudanças: ${error.message}`;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async getSchemaChanges(connection, schema) {
    const query = `
      SELECT 
        table_name,
        table_type,
        create_time,
        update_time,
        table_rows,
        data_length,
        index_length
      FROM information_schema.tables 
      WHERE table_schema = ?
        AND update_time > DATE_SUB(NOW(), INTERVAL 1 DAY)
      ORDER BY update_time DESC
    `;

    try {
      const [rows] = await connection.execute(query, [schema]);
      
      if (rows.length === 0) {
        return null;
      }

      let output = '';
      for (const row of rows) {
        output += `📋 ${row.table_name} (${row.table_type}) - ${row.update_time}\n`;
        if (row.table_rows) {
          output += `   - Linhas: ${row.table_rows}\n`;
        }
      }

      return output;
    } catch (error) {
      return `Erro ao verificar schema ${schema}: ${error.message}`;
    }
  }

  async checkSensitiveTables(options = {}) {
    const { 
      tables = process.env.SENSITIVE_TABLES?.split(',') || ['users', 'accounts'],
      checkDataChanges = true 
    } = options;

    let connection;

    try {
      connection = await this.getConnection();
      const results = [];

      for (const table of tables) {
        const changes = await this.getTableChanges(connection, table, checkDataChanges);
        if (changes) {
          results.push(`### Tabela ${table}\n${changes}`);
        }
      }

      if (results.length === 0) {
        return '✅ Nenhuma mudança detectada nas tabelas sensíveis';
      }

      return results.join('\n\n');
    } catch (error) {
      this.logger.error('Erro ao verificar tabelas sensíveis:', error);
      return `❌ Erro ao verificar tabelas sensíveis: ${error.message}`;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async getTableChanges(connection, table, checkDataChanges) {
    const queries = [
      {
        name: 'Estrutura da Tabela',
        query: `
          SELECT 
            column_name, 
            data_type, 
            is_nullable,
            column_default
          FROM information_schema.columns 
          WHERE table_name = ? 
            AND table_schema = DATABASE()
          ORDER BY ordinal_position
        `,
        params: [table]
      }
    ];

    if (checkDataChanges) {
      queries.push({
        name: 'Informações da Tabela',
        query: `
          SELECT 
            table_rows,
            data_length,
            index_length,
            create_time,
            update_time
          FROM information_schema.tables 
          WHERE table_name = ? 
            AND table_schema = DATABASE()
        `,
        params: [table]
      });
    }

    let output = '';
    for (const q of queries) {
      try {
        const [rows] = await connection.execute(q.query, q.params);
        
        if (q.name === 'Estrutura da Tabela') {
          output += '**Estrutura:**\n';
          for (const row of rows) {
            const nullable = row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
            const defaultValue = row.column_default ? ` DEFAULT ${row.column_default}` : '';
            output += `- ${row.column_name} (${row.data_type}) ${nullable}${defaultValue}\n`;
          }
        } else if (rows.length > 0) {
          const row = rows[0];
          output += `**${q.name}:**\n`;
          output += `- Linhas: ${row.table_rows || 'N/A'}\n`;
          output += `- Tamanho dos Dados: ${row.data_length ? Math.round(row.data_length / 1024) + 'KB' : 'N/A'}\n`;
          output += `- Última Atualização: ${row.update_time || 'N/A'}\n`;
        }
      } catch (error) {
        output += `**${q.name}:** Erro - ${error.message}\n`;
      }
    }

    return output;
  }

  async executeSafeQuery(query, database = 'mysql') {
    // Validar se é uma query SELECT
    const trimmedQuery = query.trim().toUpperCase();
    if (!trimmedQuery.startsWith('SELECT')) {
      throw new Error('Apenas queries SELECT são permitidas por segurança');
    }

    // Verificar palavras perigosas
    const dangerousKeywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE', 'EXECUTE', 'CALL'];
    for (const keyword of dangerousKeywords) {
      if (trimmedQuery.includes(keyword)) {
        throw new Error(`Palavra-chave perigosa detectada: ${keyword}`);
      }
    }

    let connection;
    try {
      connection = await this.getConnection();
      
      // Usar database específico se fornecido
      if (database !== 'mysql') {
        await connection.execute(`USE ${database}`);
      }
      
      const [rows, fields] = await connection.execute(query);

      if (rows.length === 0) {
        return 'Nenhum resultado encontrado';
      }

      // Formatar resultado como tabela
      let output = '| ' + fields.map(field => field.name).join(' | ') + ' |\n';
      output += '| ' + fields.map(() => '---').join(' | ') + ' |\n';
      
      for (const row of rows) {
        output += '| ' + Object.values(row).map(cell => cell || '').join(' | ') + ' |\n';
      }

      return output;
    } catch (error) {
      this.logger.error('Erro ao executar query:', error);
      throw new Error(`Erro na execução: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async getDatabaseInfo(options = {}) {
    const { includeUsers = false, includeDatabases = true } = options;
    let connection;

    try {
      connection = await this.getConnection();
      const results = [];

      // Informações básicas do servidor
      const basicInfo = await this.getBasicInfo(connection);
      results.push(`### Informações Básicas\n${basicInfo}`);

      if (includeDatabases) {
        const databases = await this.getDatabasesInfo(connection);
        results.push(`### Databases\n${databases}`);
      }

      if (includeUsers) {
        const users = await this.getUsersInfo(connection);
        results.push(`### Usuários\n${users}`);
      }

      return results.join('\n\n');
    } catch (error) {
      this.logger.error('Erro ao obter informações do banco:', error);
      return `❌ Erro ao obter informações: ${error.message}`;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async getBasicInfo(connection) {
    const query = `
      SELECT 
        @@hostname as hostname,
        @@port as port,
        @@version as version,
        @@version_comment as version_comment,
        @@datadir as data_directory,
        @@socket as socket_file
    `;

    const [rows] = await connection.execute(query);
    const row = rows[0];

    return `- **Hostname:** ${row.hostname}
- **Porta:** ${row.port}
- **Versão:** ${row.version}
- **Comentário da Versão:** ${row.version_comment}
- **Diretório de Dados:** ${row.data_directory}
- **Socket:** ${row.socket_file || 'N/A'}`;
  }

  async getDatabasesInfo(connection) {
    const query = `
      SELECT 
        schema_name,
        default_character_set_name,
        default_collation_name
      FROM information_schema.schemata
      WHERE schema_name NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
      ORDER BY schema_name
    `;

    const [rows] = await connection.execute(query);
    let output = '';

    for (const row of rows) {
      output += `📁 **${row.schema_name}**\n`;
      output += `  - Charset: ${row.default_character_set_name}\n`;
      output += `  - Collation: ${row.default_collation_name}\n\n`;
    }

    return output || 'Nenhum database encontrado';
  }

  async getUsersInfo(connection) {
    const query = `
      SELECT 
        user,
        host,
        authentication_string,
        account_locked,
        password_expired
      FROM mysql.user 
      WHERE user NOT IN ('mysql.session', 'mysql.sys', 'mysql.infoschema', 'root')
      ORDER BY user, host
    `;

    try {
      const [rows] = await connection.execute(query);
      let output = '';

      for (const row of rows) {
        const status = row.account_locked === 'Y' ? '🔒' : row.password_expired === 'Y' ? '⏰' : '✅';
        output += `${status} **${row.user}@${row.host}**\n`;
        output += `  - Locked: ${row.account_locked}\n`;
        output += `  - Password Expired: ${row.password_expired}\n\n`;
      }

      return output || 'Nenhum usuário encontrado';
    } catch (error) {
      return `Erro ao obter usuários: ${error.message}`;
    }
  }

  async getTableInfo(options = {}) {
    const { tableName, database = 'mysql', includeConstraints = true, includeIndexes = true } = options;
    let connection;

    try {
      connection = await this.getConnection();
      const results = [];

      // Informações básicas da tabela
      const basicInfo = await this.getTableBasicInfo(connection, tableName, database);
      results.push(`### Informações Básicas\n${basicInfo}`);

      // Colunas da tabela
      const columns = await this.getTableColumns(connection, tableName, database);
      results.push(`### Colunas\n${columns}`);

      if (includeConstraints) {
        const constraints = await this.getTableConstraints(connection, tableName, database);
        results.push(`### Constraints\n${constraints}`);
      }

      if (includeIndexes) {
        const indexes = await this.getTableIndexes(connection, tableName, database);
        results.push(`### Índices\n${indexes}`);
      }

      return results.join('\n\n');
    } catch (error) {
      this.logger.error('Erro ao obter informações da tabela:', error);
      return `❌ Erro ao obter informações: ${error.message}`;
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async getTableBasicInfo(connection, tableName, database) {
    const query = `
      SELECT 
        table_name,
        table_type,
        engine,
        table_rows,
        data_length,
        index_length,
        create_time,
        update_time
      FROM information_schema.tables 
      WHERE table_name = ? 
        AND table_schema = ?
    `;

    try {
      const [rows] = await connection.execute(query, [tableName, database]);
      
      if (rows.length === 0) {
        return `Tabela ${tableName} não encontrada no database ${database}`;
      }

      const row = rows[0];
      const dataSize = row.data_length ? Math.round(row.data_length / 1024) + 'KB' : 'N/A';
      const indexSize = row.index_length ? Math.round(row.index_length / 1024) + 'KB' : 'N/A';
      
      return `- **Nome:** ${row.table_name}
- **Tipo:** ${row.table_type}
- **Engine:** ${row.engine}
- **Linhas:** ${row.table_rows || 'N/A'}
- **Tamanho dos Dados:** ${dataSize}
- **Tamanho dos Índices:** ${indexSize}
- **Criada em:** ${row.create_time || 'N/A'}
- **Atualizada em:** ${row.update_time || 'N/A'}`;
    } catch (error) {
      return `Erro ao obter informações básicas: ${error.message}`;
    }
  }

  async getTableColumns(connection, tableName, database) {
    const query = `
      SELECT 
        column_name,
        data_type,
        character_maximum_length,
        numeric_precision,
        numeric_scale,
        is_nullable,
        column_default,
        column_key,
        extra
      FROM information_schema.columns 
      WHERE table_name = ? 
        AND table_schema = ?
      ORDER BY ordinal_position
    `;

    try {
      const [rows] = await connection.execute(query, [tableName, database]);
      
      if (rows.length === 0) {
        return 'Nenhuma coluna encontrada';
      }

      let output = '';
      for (const row of rows) {
        const nullable = row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
        const precision = row.numeric_precision ? `(${row.numeric_precision}${row.numeric_scale ? ',' + row.numeric_scale : ''})` : '';
        const length = row.character_maximum_length ? `(${row.character_maximum_length})` : '';
        const defaultValue = row.column_default ? ` DEFAULT ${row.column_default}` : '';
        const key = row.column_key ? ` [${row.column_key}]` : '';
        const extra = row.extra ? ` ${row.extra}` : '';
        
        output += `- **${row.column_name}** ${row.data_type}${length || precision} ${nullable}${defaultValue}${key}${extra}\n`;
      }

      return output;
    } catch (error) {
      return `Erro ao obter colunas: ${error.message}`;
    }
  }

  async getTableConstraints(connection, tableName, database) {
    const query = `
      SELECT 
        constraint_name,
        constraint_type,
        column_name,
        referenced_table_name,
        referenced_column_name
      FROM information_schema.key_column_usage kcu
      JOIN information_schema.table_constraints tc 
        ON kcu.constraint_name = tc.constraint_name 
        AND kcu.table_schema = tc.table_schema
      WHERE kcu.table_name = ? 
        AND kcu.table_schema = ?
      ORDER BY constraint_type, constraint_name
    `;

    try {
      const [rows] = await connection.execute(query, [tableName, database]);
      
      if (rows.length === 0) {
        return 'Nenhuma constraint encontrada';
      }

      let output = '';
      let currentConstraint = '';
      
      for (const row of rows) {
        if (row.constraint_name !== currentConstraint) {
          currentConstraint = row.constraint_name;
          const type = this.getConstraintTypeDescription(row.constraint_type);
          output += `- **${row.constraint_name}** (${type})\n`;
        }
        
        let constraintInfo = `  - Coluna: ${row.column_name}`;
        
        if (row.referenced_table_name && row.referenced_column_name) {
          constraintInfo += ` → ${row.referenced_table_name}.${row.referenced_column_name}`;
        }
        
        output += constraintInfo + '\n';
      }

      return output;
    } catch (error) {
      return `Erro ao obter constraints: ${error.message}`;
    }
  }

  getConstraintTypeDescription(type) {
    const types = {
      'PRIMARY KEY': 'PRIMARY KEY',
      'FOREIGN KEY': 'FOREIGN KEY',
      'UNIQUE': 'UNIQUE',
      'CHECK': 'CHECK'
    };
    return types[type] || type;
  }

  async getTableIndexes(connection, tableName, database) {
    const query = `
      SELECT 
        index_name,
        column_name,
        seq_in_index,
        non_unique,
        index_type
      FROM information_schema.statistics 
      WHERE table_name = ? 
        AND table_schema = ?
      ORDER BY index_name, seq_in_index
    `;

    try {
      const [rows] = await connection.execute(query, [tableName, database]);
      
      if (rows.length === 0) {
        return 'Nenhum índice encontrado';
      }

      let output = '';
      let currentIndex = '';
      
      for (const row of rows) {
        if (row.index_name !== currentIndex) {
          currentIndex = row.index_name;
          const uniqueness = row.non_unique === 0 ? 'UNIQUE' : 'NON-UNIQUE';
          output += `\n**${row.index_name}** (${row.index_type}, ${uniqueness})\n`;
        }
        
        output += `  - ${row.column_name}\n`;
      }

      return output;
    } catch (error) {
      return `Erro ao obter índices: ${error.message}`;
    }
  }

  // Métodos para gerenciar múltiplas conexões
  async getAvailableConnections() {
    if (this.connectionManager) {
      return this.connectionManager.getAvailableConnections();
    }
    return [{ name: 'default', description: 'Conexão padrão', environment: 'default' }];
  }

  async testConnection(connectionName = null) {
    if (this.connectionManager) {
      return await this.connectionManager.testConnection(connectionName);
    }
    
    // Fallback para teste de conexão padrão
    try {
      const connection = await this.getConnection();
      await connection.execute('SELECT 1');
      await connection.end();
      return {
        success: true,
        message: 'Conexão padrão testada com sucesso'
      };
    } catch (error) {
      return {
        success: false,
        message: `Falha no teste da conexão: ${error.message}`
      };
    }
  }

  async testAllConnections() {
    if (this.connectionManager) {
      return await this.connectionManager.testAllConnections();
    }
    
    return { default: await this.testConnection() };
  }

  async getConnectionsStatus() {
    if (this.connectionManager) {
      return await this.connectionManager.getConnectionsStatus();
    }
    
    return { default: { active: false, error: 'ConnectionManager não disponível' } };
  }
}



