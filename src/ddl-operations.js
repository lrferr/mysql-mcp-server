import { Logger } from './logger.js';
import mysql from 'mysql2/promise';
import { ConnectionManager } from './connection-manager.js';

export class DDLOperations {
  constructor(connectionConfig = null, connectionManager = null) {
    this.logger = new Logger();
    this.connectionConfig = connectionConfig;
    this.connectionManager = connectionManager || new ConnectionManager();
  }

  async getConnection(connectionName = null) {
    try {
      // Se temos um ConnectionManager, usar ele
      if (this.connectionManager) {
        return await this.connectionManager.getConnection(connectionName);
      }
      
      // Fallback para configuração antiga
      if (this.connectionConfig) {
        const connection = await mysql.createConnection(this.connectionConfig);
        return connection;
      }
      
      throw new Error('Nenhuma configuração de conexão disponível');
    } catch (error) {
      this.logger.error('Erro ao conectar com MySQL:', error);
      throw new Error(`Falha na conexão: ${error.message}`);
    }
  }

  // ===== OPERAÇÕES DE TABELA =====

  async createTable(options = {}) {
    const {
      tableName,
      database = 'mysql',
      columns = [],
      constraints = [],
      engine = 'InnoDB',
      charset = 'utf8mb4',
      collate = 'utf8mb4_unicode_ci',
      ifNotExists = true,
      connectionName = null
    } = options;

    if (!tableName || columns.length === 0) {
      throw new Error('Nome da tabela e colunas são obrigatórios');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      // Verificar se a tabela já existe
      if (ifNotExists) {
        const exists = await this.tableExists(connection, tableName, database);
        if (exists) {
          return `⚠️ Tabela ${database}.${tableName} já existe. Operação ignorada.`;
        }
      }

      // Construir query CREATE TABLE
      const columnDefinitions = columns.map(col => {
        let def = `\`${col.name}\` ${col.type}`;
        if (col.length) def += `(${col.length}${col.precision ? ',' + col.precision : ''})`;
        if (col.notNull) def += ' NOT NULL';
        if (col.autoIncrement) def += ' AUTO_INCREMENT';
        if (col.defaultValue !== undefined) def += ` DEFAULT ${col.defaultValue}`;
        if (col.comment) def += ` COMMENT '${col.comment}'`;
        return def;
      }).join(',\n  ');

      const constraintDefinitions = constraints.map(constraint => {
        let def = '';
        switch (constraint.type) {
          case 'PRIMARY KEY':
            def += `PRIMARY KEY (${constraint.columns.map(col => `\`${col}\``).join(', ')})`;
            break;
          case 'UNIQUE':
            def += `UNIQUE KEY \`${constraint.name}\` (${constraint.columns.map(col => `\`${col}\``).join(', ')})`;
            break;
          case 'FOREIGN KEY':
            def += `CONSTRAINT \`${constraint.name}\` FOREIGN KEY (${constraint.columns.map(col => `\`${col}\``).join(', ')}) REFERENCES \`${constraint.referencedTable}\`(${constraint.referencedColumns.map(col => `\`${col}\``).join(', ')})`;
            if (constraint.onDelete) def += ` ON DELETE ${constraint.onDelete}`;
            if (constraint.onUpdate) def += ` ON UPDATE ${constraint.onUpdate}`;
            break;
          case 'INDEX':
            def += `KEY \`${constraint.name}\` (${constraint.columns.map(col => `\`${col}\``).join(', ')})`;
            break;
        }
        return def;
      }).filter(def => def).join(',\n  ');

      const createQuery = `
        CREATE TABLE ${ifNotExists ? 'IF NOT EXISTS ' : ''}\`${database}\`.\`${tableName}\` (
          ${columnDefinitions}${constraints.length > 0 ? ',\n  ' + constraintDefinitions : ''}
        ) ENGINE=${engine} DEFAULT CHARSET=${charset} COLLATE=${collate}
      `;

      await connection.execute(createQuery);

      this.logger.info(`Tabela ${database}.${tableName} criada com sucesso`);
      return `✅ Tabela ${database}.${tableName} criada com sucesso!`;

    } catch (error) {
      this.logger.error('Erro ao criar tabela:', error);
      throw new Error(`Erro ao criar tabela: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async alterTable(options = {}) {
    const {
      tableName,
      database = 'mysql',
      operation,
      columnName,
      columnType,
      columnLength,
      notNull,
      defaultValue,
      autoIncrement,
      comment,
      constraintName,
      constraintType,
      constraintColumns,
      referencedTable,
      referencedColumns,
      onDelete,
      onUpdate,
      newColumnName,
      newTableName,
      connectionName = null
    } = options;

    if (!tableName || !operation) {
      throw new Error('Nome da tabela e operação são obrigatórios');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      let alterQuery = `ALTER TABLE \`${database}\`.\`${tableName}\` `;

      switch (operation) {
        case 'ADD_COLUMN': {
          if (!columnName || !columnType) {
            throw new Error('Nome e tipo da coluna são obrigatórios para ADD_COLUMN');
          }
          let columnDef = `ADD COLUMN \`${columnName}\` ${columnType}`;
          if (columnLength) columnDef += `(${columnLength})`;
          if (notNull) columnDef += ' NOT NULL';
          if (autoIncrement) columnDef += ' AUTO_INCREMENT';
          if (defaultValue !== undefined) columnDef += ` DEFAULT ${defaultValue}`;
          if (comment) columnDef += ` COMMENT '${comment}'`;
          alterQuery += columnDef;
          break;
        }

        case 'MODIFY_COLUMN': {
          if (!columnName || !columnType) {
            throw new Error('Nome e tipo da coluna são obrigatórios para MODIFY_COLUMN');
          }
          let modifyDef = `MODIFY COLUMN \`${columnName}\` ${columnType}`;
          if (columnLength) modifyDef += `(${columnLength})`;
          if (notNull !== undefined) modifyDef += notNull ? ' NOT NULL' : ' NULL';
          if (autoIncrement) modifyDef += ' AUTO_INCREMENT';
          if (defaultValue !== undefined) modifyDef += ` DEFAULT ${defaultValue}`;
          if (comment) modifyDef += ` COMMENT '${comment}'`;
          alterQuery += modifyDef;
          break;
        }

        case 'DROP_COLUMN':
          if (!columnName) {
            throw new Error('Nome da coluna é obrigatório para DROP_COLUMN');
          }
          alterQuery += `DROP COLUMN \`${columnName}\``;
          break;

        case 'ADD_CONSTRAINT': {
          if (!constraintName || !constraintType) {
            throw new Error('Nome e tipo da constraint são obrigatórios para ADD_CONSTRAINT');
          }
          let constraintDef = '';
          switch (constraintType) {
            case 'PRIMARY KEY':
              constraintDef += `ADD PRIMARY KEY (${constraintColumns.map(col => `\`${col}\``).join(', ')})`;
              break;
            case 'UNIQUE':
              constraintDef += `ADD UNIQUE KEY \`${constraintName}\` (${constraintColumns.map(col => `\`${col}\``).join(', ')})`;
              break;
            case 'FOREIGN KEY':
              constraintDef += `ADD CONSTRAINT \`${constraintName}\` FOREIGN KEY (${constraintColumns.map(col => `\`${col}\``).join(', ')}) REFERENCES \`${referencedTable}\`(${referencedColumns.map(col => `\`${col}\``).join(', ')})`;
              if (onDelete) constraintDef += ` ON DELETE ${onDelete}`;
              if (onUpdate) constraintDef += ` ON UPDATE ${onUpdate}`;
              break;
            case 'INDEX':
              constraintDef += `ADD INDEX \`${constraintName}\` (${constraintColumns.map(col => `\`${col}\``).join(', ')})`;
              break;
          }
          alterQuery += constraintDef;
          break;
        }

        case 'DROP_CONSTRAINT':
          if (!constraintName) {
            throw new Error('Nome da constraint é obrigatório para DROP_CONSTRAINT');
          }
          alterQuery += `DROP INDEX \`${constraintName}\``;
          break;

        case 'RENAME_COLUMN':
          if (!columnName || !newColumnName) {
            throw new Error('Nome atual e novo nome da coluna são obrigatórios para RENAME_COLUMN');
          }
          alterQuery += `CHANGE COLUMN \`${columnName}\` \`${newColumnName}\` ${columnType}`;
          break;

        case 'RENAME_TABLE':
          if (!newTableName) {
            throw new Error('Novo nome da tabela é obrigatório para RENAME_TABLE');
          }
          alterQuery = `ALTER TABLE \`${database}\`.\`${tableName}\` RENAME TO \`${database}\`.\`${newTableName}\``;
          break;

        default:
          throw new Error(`Operação não suportada: ${operation}`);
      }

      await connection.execute(alterQuery);

      this.logger.info(`Tabela ${database}.${tableName} alterada com sucesso`);
      return `✅ Tabela ${database}.${tableName} alterada com sucesso!`;

    } catch (error) {
      this.logger.error('Erro ao alterar tabela:', error);
      throw new Error(`Erro ao alterar tabela: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async dropTable(options = {}) {
    const {
      tableName,
      database = 'mysql',
      ifExists = true,
      cascade = false,
      connectionName = null
    } = options;

    if (!tableName) {
      throw new Error('Nome da tabela é obrigatório');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      // Verificar se a tabela existe
      if (ifExists) {
        const exists = await this.tableExists(connection, tableName, database);
        if (!exists) {
          return `⚠️ Tabela ${database}.${tableName} não existe. Operação ignorada.`;
        }
      }

      let dropQuery = `DROP TABLE ${ifExists ? 'IF EXISTS ' : ''}\`${database}\`.\`${tableName}\``;
      if (cascade) {
        dropQuery += ' CASCADE';
      }

      await connection.execute(dropQuery);

      this.logger.info(`Tabela ${database}.${tableName} removida com sucesso`);
      return `✅ Tabela ${database}.${tableName} removida com sucesso!`;

    } catch (error) {
      this.logger.error('Erro ao remover tabela:', error);
      throw new Error(`Erro ao remover tabela: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  // ===== OPERAÇÕES DE ÍNDICE =====

  async createIndex(options = {}) {
    const {
      indexName,
      tableName,
      database = 'mysql',
      columns = [],
      unique = false,
      type = 'BTREE',
      ifNotExists = true
    } = options;

    if (!indexName || !tableName || columns.length === 0) {
      throw new Error('Nome do índice, tabela e colunas são obrigatórios');
    }

    let connection;
    try {
      connection = await this.getConnection();

      // Verificar se o índice já existe
      if (ifNotExists) {
        const exists = await this.indexExists(connection, indexName, tableName, database);
        if (exists) {
          return `⚠️ Índice ${database}.${tableName}.${indexName} já existe. Operação ignorada.`;
        }
      }

      const uniqueClause = unique ? 'UNIQUE ' : '';
      const createQuery = `
        CREATE ${uniqueClause}INDEX \`${indexName}\`
        ON \`${database}\`.\`${tableName}\` (${columns.map(col => `\`${col}\``).join(', ')}) USING ${type}
      `;

      await connection.execute(createQuery);

      this.logger.info(`Índice ${database}.${tableName}.${indexName} criado com sucesso`);
      return `✅ Índice ${database}.${tableName}.${indexName} criado com sucesso!`;

    } catch (error) {
      this.logger.error('Erro ao criar índice:', error);
      throw new Error(`Erro ao criar índice: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async dropIndex(options = {}) {
    const {
      indexName,
      tableName,
      database = 'mysql',
      ifExists = true
    } = options;

    if (!indexName || !tableName) {
      throw new Error('Nome do índice e tabela são obrigatórios');
    }

    let connection;
    try {
      connection = await this.getConnection();

      // Verificar se o índice existe
      if (ifExists) {
        const exists = await this.indexExists(connection, indexName, tableName, database);
        if (!exists) {
          return `⚠️ Índice ${database}.${tableName}.${indexName} não existe. Operação ignorada.`;
        }
      }

      const dropQuery = `DROP INDEX \`${indexName}\` ON \`${database}\`.\`${tableName}\``;
      await connection.execute(dropQuery);

      this.logger.info(`Índice ${database}.${tableName}.${indexName} removido com sucesso`);
      return `✅ Índice ${database}.${tableName}.${indexName} removido com sucesso!`;

    } catch (error) {
      this.logger.error('Erro ao remover índice:', error);
      throw new Error(`Erro ao remover índice: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  // ===== OPERAÇÕES DE VIEW =====

  async createView(options = {}) {
    const {
      viewName,
      database = 'mysql',
      query,
      ifNotExists = true,
      connectionName = null
    } = options;

    if (!viewName || !query) {
      throw new Error('Nome da view e query são obrigatórios');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      const createQuery = `
        CREATE ${ifNotExists ? 'OR REPLACE ' : ''}VIEW \`${database}\`.\`${viewName}\` AS ${query}
      `;

      await connection.execute(createQuery);

      this.logger.info(`View ${database}.${viewName} criada com sucesso`);
      return `✅ View ${database}.${viewName} criada com sucesso!`;

    } catch (error) {
      this.logger.error('Erro ao criar view:', error);
      throw new Error(`Erro ao criar view: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async dropView(options = {}) {
    const {
      viewName,
      database = 'mysql',
      ifExists = true,
      connectionName = null
    } = options;

    if (!viewName) {
      throw new Error('Nome da view é obrigatório');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      const dropQuery = `DROP VIEW ${ifExists ? 'IF EXISTS ' : ''}\`${database}\`.\`${viewName}\``;
      await connection.execute(dropQuery);

      this.logger.info(`View ${database}.${viewName} removida com sucesso`);
      return `✅ View ${database}.${viewName} removida com sucesso!`;

    } catch (error) {
      this.logger.error('Erro ao remover view:', error);
      throw new Error(`Erro ao remover view: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  // ===== OPERAÇÕES DE DATABASE =====

  async createDatabase(options = {}) {
    const {
      databaseName,
      charset = 'utf8mb4',
      collate = 'utf8mb4_unicode_ci',
      ifNotExists = true,
      connectionName = null
    } = options;

    if (!databaseName) {
      throw new Error('Nome do database é obrigatório');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      const createQuery = `
        CREATE DATABASE ${ifNotExists ? 'IF NOT EXISTS ' : ''}\`${databaseName}\` 
        DEFAULT CHARACTER SET ${charset} 
        DEFAULT COLLATE ${collate}
      `;

      await connection.execute(createQuery);

      this.logger.info(`Database ${databaseName} criado com sucesso`);
      return `✅ Database ${databaseName} criado com sucesso!`;

    } catch (error) {
      this.logger.error('Erro ao criar database:', error);
      throw new Error(`Erro ao criar database: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async dropDatabase(options = {}) {
    const {
      databaseName,
      ifExists = true,
      connectionName = null
    } = options;

    if (!databaseName) {
      throw new Error('Nome do database é obrigatório');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      const dropQuery = `DROP DATABASE ${ifExists ? 'IF EXISTS ' : ''}\`${databaseName}\``;
      await connection.execute(dropQuery);

      this.logger.info(`Database ${databaseName} removido com sucesso`);
      return `✅ Database ${databaseName} removido com sucesso!`;

    } catch (error) {
      this.logger.error('Erro ao remover database:', error);
      throw new Error(`Erro ao remover database: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  // ===== MÉTODOS AUXILIARES =====

  async tableExists(connection, tableName, database) {
    try {
      const query = `
        SELECT COUNT(*) 
        FROM information_schema.tables 
        WHERE table_name = ? 
          AND table_schema = ?
      `;
      const [rows] = await connection.execute(query, [tableName, database]);
      return rows[0]['COUNT(*)'] > 0;
    } catch (error) {
      return false;
    }
  }

  async indexExists(connection, indexName, tableName, database) {
    try {
      const query = `
        SELECT COUNT(*) 
        FROM information_schema.statistics 
        WHERE index_name = ? 
          AND table_name = ?
          AND table_schema = ?
      `;
      const [rows] = await connection.execute(query, [indexName, tableName, database]);
      return rows[0]['COUNT(*)'] > 0;
    } catch (error) {
      return false;
    }
  }

  async viewExists(connection, viewName, database) {
    try {
      const query = `
        SELECT COUNT(*) 
        FROM information_schema.views 
        WHERE table_name = ? 
          AND table_schema = ?
      `;
      const [rows] = await connection.execute(query, [viewName, database]);
      return rows[0]['COUNT(*)'] > 0;
    } catch (error) {
      return false;
    }
  }

  async databaseExists(connection, databaseName) {
    try {
      const query = `
        SELECT COUNT(*) 
        FROM information_schema.schemata 
        WHERE schema_name = ?
      `;
      const [rows] = await connection.execute(query, [databaseName]);
      return rows[0]['COUNT(*)'] > 0;
    } catch (error) {
      return false;
    }
  }

  // ===== VALIDAÇÕES DE SEGURANÇA =====

  validateTableName(tableName) {
    if (!tableName || typeof tableName !== 'string') {
      throw new Error('Nome da tabela deve ser uma string válida');
    }
    
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(tableName)) {
      throw new Error('Nome da tabela deve conter apenas letras, números e underscore, começando com letra');
    }
    
    if (tableName.length > 64) {
      throw new Error('Nome da tabela não pode exceder 64 caracteres');
    }
  }

  validateColumnDefinition(column) {
    if (!column.name || !column.type) {
      throw new Error('Nome e tipo da coluna são obrigatórios');
    }
    
    this.validateTableName(column.name);
    
    const validTypes = [
      'TINYINT', 'SMALLINT', 'MEDIUMINT', 'INT', 'INTEGER', 'BIGINT',
      'FLOAT', 'DOUBLE', 'DECIMAL', 'NUMERIC',
      'CHAR', 'VARCHAR', 'TINYTEXT', 'TEXT', 'MEDIUMTEXT', 'LONGTEXT',
      'TINYBLOB', 'BLOB', 'MEDIUMBLOB', 'LONGBLOB',
      'DATE', 'TIME', 'DATETIME', 'TIMESTAMP', 'YEAR',
      'ENUM', 'SET', 'JSON', 'GEOMETRY'
    ];
    
    if (!validTypes.includes(column.type.toUpperCase())) {
      throw new Error(`Tipo de coluna inválido: ${column.type}`);
    }
  }

  validateConstraintDefinition(constraint) {
    if (!constraint.name || !constraint.type) {
      throw new Error('Nome e tipo da constraint são obrigatórios');
    }
    
    this.validateTableName(constraint.name);
    
    const validTypes = ['PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY', 'INDEX'];
    if (!validTypes.includes(constraint.type)) {
      throw new Error(`Tipo de constraint inválido: ${constraint.type}`);
    }
  }
}

