import { Logger } from './logger.js';
import mysql from 'mysql2/promise';
import { ConnectionManager } from './connection-manager.js';

export class DMLOperations {
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

  // ===== OPERAÇÕES SELECT =====

  async select(options = {}) {
    const {
      tableName,
      database = 'mysql',
      columns = ['*'],
      whereClause,
      orderBy,
      limit,
      offset = 0,
      connectionName = null
    } = options;

    if (!tableName) {
      throw new Error('Nome da tabela é obrigatório');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      // Usar database específico
      if (database !== 'mysql') {
        await connection.execute(`USE ${database}`);
      }

      // Construir query SELECT
      let query = `SELECT ${columns.join(', ')} FROM \`${tableName}\``;
      
      if (whereClause) {
        query += ` WHERE ${whereClause}`;
      }
      
      if (orderBy) {
        query += ` ORDER BY ${orderBy}`;
      }
      
      if (limit) {
        query += ` LIMIT ${offset}, ${limit}`;
      } else if (offset > 0) {
        query += ` LIMIT ${offset}, 18446744073709551615`; // MySQL max value
      }

      const [rows, fields] = await connection.execute(query);

      // Formatar resultado
      let output = '';
      
      if (rows.length === 0) {
        output = 'Nenhum resultado encontrado.';
      } else {
        // Cabeçalho da tabela
        output += '| ' + fields.map(field => field.name).join(' | ') + ' |\n';
        output += '| ' + fields.map(() => '---').join(' | ') + ' |\n';
        
        // Dados
        for (const row of rows) {
          output += '| ' + Object.values(row).map(cell => cell || '').join(' | ') + ' |\n';
        }
        
        output += `\n**Total de registros:** ${rows.length}`;
      }

      this.logger.logDatabaseOperation('SELECT', query, `Retornou ${rows.length} registros`, connectionName);
      return output;

    } catch (error) {
      this.logger.error('Erro ao executar SELECT:', error);
      throw new Error(`Erro ao executar SELECT: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  // ===== OPERAÇÕES INSERT =====

  async insert(options = {}) {
    const {
      tableName,
      database = 'mysql',
      data,
      columns,
      values,
      returning,
      connectionName = null
    } = options;

    if (!tableName) {
      throw new Error('Nome da tabela é obrigatório');
    }

    if (!data && (!columns || !values)) {
      throw new Error('Dados ou colunas/valores são obrigatórios');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      // Usar database específico
      if (database !== 'mysql') {
        await connection.execute(`USE ${database}`);
      }

      let insertQuery;
      let params = [];

      if (data) {
        // Inserir usando objeto de dados
        const dataColumns = Object.keys(data);
        const dataValues = Object.values(data);
        
        insertQuery = `
          INSERT INTO \`${tableName}\` (\`${dataColumns.join('`, `')}\`) 
          VALUES (${dataColumns.map(() => '?').join(', ')})
        `;
        params = dataValues;
      } else {
        // Inserir usando arrays de colunas e valores
        insertQuery = `
          INSERT INTO \`${tableName}\` (\`${columns.join('`, `')}\`) 
          VALUES (${columns.map(() => '?').join(', ')})
        `;
        params = values;
      }

      // Adicionar RETURNING se suportado (MySQL 8.0+)
      if (returning) {
        insertQuery += ` RETURNING \`${returning}\``;
      }

      const [result] = await connection.execute(insertQuery, params);

      let output = '✅ Dados inseridos com sucesso!';
      output += `\n- **ID inserido:** ${result.insertId || 'N/A'}`;
      output += `\n- **Linhas afetadas:** ${result.affectedRows}`;

      // Se foi especificado RETURNING e temos resultado
      if (returning && result.length > 0) {
        output += `\n- **Valor retornado:** ${result[0][returning]}`;
      }

      this.logger.logDatabaseOperation('INSERT', insertQuery, `Inseriu ${result.affectedRows} registro(s)`, connectionName);
      return output;

    } catch (error) {
      this.logger.error('Erro ao executar INSERT:', error);
      throw new Error(`Erro ao executar INSERT: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async insertMultiple(options = {}) {
    const {
      tableName,
      database = 'mysql',
      dataArray,
      columns,
      connectionName = null
    } = options;

    if (!tableName || !dataArray || dataArray.length === 0) {
      throw new Error('Nome da tabela e array de dados são obrigatórios');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      // Usar database específico
      if (database !== 'mysql') {
        await connection.execute(`USE ${database}`);
      }

      // Preparar dados para inserção em lote
      const dataColumns = columns || Object.keys(dataArray[0]);
      const placeholders = dataColumns.map(() => '?').join(', ');
      const valuesPlaceholder = `(${placeholders})`;
      
      const insertQuery = `
        INSERT INTO \`${tableName}\` (\`${dataColumns.join('`, `')}\`) 
        VALUES ${dataArray.map(() => valuesPlaceholder).join(', ')}
      `;

      // Flatten dos valores
      const params = dataArray.flatMap(row => 
        dataColumns.map(col => row[col])
      );

      const [result] = await connection.execute(insertQuery, params);

      let output = '✅ Múltiplos dados inseridos com sucesso!';
      output += `\n- **Primeiro ID inserido:** ${result.insertId || 'N/A'}`;
      output += `\n- **Linhas afetadas:** ${result.affectedRows}`;
      output += `\n- **Registros processados:** ${dataArray.length}`;

      this.logger.logDatabaseOperation('INSERT_MULTIPLE', insertQuery, `Inseriu ${result.affectedRows} registro(s)`, connectionName);
      return output;

    } catch (error) {
      this.logger.error('Erro ao executar INSERT múltiplo:', error);
      throw new Error(`Erro ao executar INSERT múltiplo: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  // ===== OPERAÇÕES UPDATE =====

  async update(options = {}) {
    const {
      tableName,
      database = 'mysql',
      data,
      whereClause,
      returning,
      connectionName = null
    } = options;

    if (!tableName || !data || !whereClause) {
      throw new Error('Nome da tabela, dados e cláusula WHERE são obrigatórios');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      // Usar database específico
      if (database !== 'mysql') {
        await connection.execute(`USE ${database}`);
      }

      // Construir query UPDATE
      const setClause = Object.keys(data)
        .map(key => `\`${key}\` = ?`)
        .join(', ');
      
      let updateQuery = `
        UPDATE \`${tableName}\` 
        SET ${setClause} 
        WHERE ${whereClause}
      `;

      const params = Object.values(data);

      // Adicionar RETURNING se suportado
      if (returning) {
        updateQuery += ` RETURNING \`${returning}\``;
      }

      const [result] = await connection.execute(updateQuery, params);

      let output = '✅ Dados atualizados com sucesso!';
      output += `\n- **Linhas afetadas:** ${result.affectedRows}`;
      output += `\n- **Linhas encontradas:** ${result.affectedRows}`;

      // Se foi especificado RETURNING e temos resultado
      if (returning && result.length > 0) {
        output += `\n- **Valores retornados:** ${result.map(row => row[returning]).join(', ')}`;
      }

      this.logger.logDatabaseOperation('UPDATE', updateQuery, `Atualizou ${result.affectedRows} registro(s)`, connectionName);
      return output;

    } catch (error) {
      this.logger.error('Erro ao executar UPDATE:', error);
      throw new Error(`Erro ao executar UPDATE: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  // ===== OPERAÇÕES DELETE =====

  async delete(options = {}) {
    const {
      tableName,
      database = 'mysql',
      whereClause,
      limit,
      returning,
      connectionName = null
    } = options;

    if (!tableName || !whereClause) {
      throw new Error('Nome da tabela e cláusula WHERE são obrigatórios');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      // Usar database específico
      if (database !== 'mysql') {
        await connection.execute(`USE ${database}`);
      }

      // Construir query DELETE
      let deleteQuery = `DELETE FROM \`${tableName}\` WHERE ${whereClause}`;
      
      if (limit) {
        deleteQuery += ` LIMIT ${limit}`;
      }

      // Adicionar RETURNING se suportado
      if (returning) {
        deleteQuery += ` RETURNING \`${returning}\``;
      }

      const [result] = await connection.execute(deleteQuery);

      let output = '✅ Dados removidos com sucesso!';
      output += `\n- **Linhas afetadas:** ${result.affectedRows}`;

      // Se foi especificado RETURNING e temos resultado
      if (returning && result.length > 0) {
        output += `\n- **Valores retornados:** ${result.map(row => row[returning]).join(', ')}`;
      }

      this.logger.logDatabaseOperation('DELETE', deleteQuery, `Removeu ${result.affectedRows} registro(s)`, connectionName);
      return output;

    } catch (error) {
      this.logger.error('Erro ao executar DELETE:', error);
      throw new Error(`Erro ao executar DELETE: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  // ===== OPERAÇÕES DE CONSULTA AVANÇADA =====

  async executeQuery(query, params = [], connectionName = null) {
    let connection;
    try {
      connection = await this.getConnection(connectionName);

      const [rows, fields] = await connection.execute(query, params);

      // Formatar resultado
      let output = '';
      
      if (rows.length === 0) {
        output = 'Nenhum resultado encontrado.';
      } else {
        // Cabeçalho da tabela
        output += '| ' + fields.map(field => field.name).join(' | ') + ' |\n';
        output += '| ' + fields.map(() => '---').join(' | ') + ' |\n';
        
        // Dados
        for (const row of rows) {
          output += '| ' + Object.values(row).map(cell => cell || '').join(' | ') + ' |\n';
        }
        
        output += `\n**Total de registros:** ${rows.length}`;
      }

      this.logger.logDatabaseOperation('CUSTOM_QUERY', query, `Retornou ${rows.length} registros`, connectionName);
      return output;

    } catch (error) {
      this.logger.error('Erro ao executar query:', error);
      throw new Error(`Erro ao executar query: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async count(options = {}) {
    const {
      tableName,
      database = 'mysql',
      whereClause,
      connectionName = null
    } = options;

    if (!tableName) {
      throw new Error('Nome da tabela é obrigatório');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      // Usar database específico
      if (database !== 'mysql') {
        await connection.execute(`USE ${database}`);
      }

      let countQuery = `SELECT COUNT(*) as total FROM \`${tableName}\``;
      
      if (whereClause) {
        countQuery += ` WHERE ${whereClause}`;
      }

      const [rows] = await connection.execute(countQuery);
      const total = rows[0].total;

      this.logger.logDatabaseOperation('COUNT', countQuery, `Retornou ${total} registros`, connectionName);
      return `Total de registros: **${total}**`;

    } catch (error) {
      this.logger.error('Erro ao executar COUNT:', error);
      throw new Error(`Erro ao executar COUNT: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  // ===== OPERAÇÕES DE TRANSACTION =====

  async executeTransaction(operations, connectionName = null) {
    let connection;
    try {
      connection = await this.getConnection(connectionName);

      await connection.beginTransaction();

      const results = [];
      
      for (const operation of operations) {
        const { type, query, params = [] } = operation;
        
        try {
          const [result] = await connection.execute(query, params);
          results.push({ success: true, result, operation: type });
        } catch (error) {
          await connection.rollback();
          throw new Error(`Erro na operação ${type}: ${error.message}`);
        }
      }

      await connection.commit();

      let output = '✅ Transação executada com sucesso!\n';
      output += `- **Operações executadas:** ${operations.length}\n`;
      output += '- **Status:** Todas as operações foram commitadas\n';

      results.forEach((result, index) => {
        output += `\n**Operação ${index + 1} (${result.operation}):**\n`;
        if (result.result.affectedRows !== undefined) {
          output += `  - Linhas afetadas: ${result.result.affectedRows}\n`;
        }
        if (result.result.insertId !== undefined) {
          output += `  - ID inserido: ${result.result.insertId}\n`;
        }
      });

      this.logger.logDatabaseOperation('TRANSACTION', 'Múltiplas operações', `Executou ${operations.length} operações`, connectionName);
      return output;

    } catch (error) {
      this.logger.error('Erro ao executar transação:', error);
      throw new Error(`Erro ao executar transação: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
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

  validateWhereClause(whereClause) {
    if (!whereClause || typeof whereClause !== 'string') {
      throw new Error('Cláusula WHERE deve ser uma string válida');
    }
    
    // Verificar se não contém palavras perigosas
    const dangerousKeywords = ['DROP', 'DELETE', 'ALTER', 'CREATE', 'TRUNCATE', 'EXECUTE', 'CALL'];
    const upperWhere = whereClause.toUpperCase();
    
    for (const keyword of dangerousKeywords) {
      if (upperWhere.includes(keyword)) {
        throw new Error(`Palavra-chave perigosa detectada na cláusula WHERE: ${keyword}`);
      }
    }
  }

  validateData(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Dados devem ser um objeto válido');
    }
    
    if (Object.keys(data).length === 0) {
      throw new Error('Dados não podem estar vazios');
    }
    
    // Verificar se os valores não contêm SQL injection
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string' && value.includes(';')) {
        throw new Error(`Valor suspeito detectado para a coluna ${key}: contém ';'`);
      }
    }
  }
}




