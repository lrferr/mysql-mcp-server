import { Logger } from './logger.js';
import mysql from 'mysql2/promise';
import { ConnectionManager } from './connection-manager.js';

export class DDMOperations {
  constructor(connectionManager = null) {
    this.logger = new Logger();
    this.connectionManager = connectionManager || new ConnectionManager();
  }

  async getConnection(connectionName = null) {
    try {
      if (this.connectionManager) {
        return await this.connectionManager.getConnection(connectionName);
      }
      throw new Error('Nenhuma configuração de conexão disponível');
    } catch (error) {
      this.logger.error('Erro ao conectar com MySQL:', error);
      throw new Error(`Falha na conexão: ${error.message}`);
    }
  }

  // ===== GESTÃO DE SCHEMAS =====

  async createSchema(options = {}) {
    const {
      schemaName,
      charset = 'utf8mb4',
      collate = 'utf8mb4_unicode_ci',
      ifNotExists = true,
      connectionName = null
    } = options;

    if (!schemaName) {
      throw new Error('Nome do schema é obrigatório');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      const createQuery = `
        CREATE SCHEMA ${ifNotExists ? 'IF NOT EXISTS ' : ''}\`${schemaName}\` 
        DEFAULT CHARACTER SET ${charset} 
        DEFAULT COLLATE ${collate}
      `;

      await connection.execute(createQuery);

      this.logger.info(`Schema ${schemaName} criado com sucesso`);
      return `✅ Schema ${schemaName} criado com sucesso!`;

    } catch (error) {
      this.logger.error('Erro ao criar schema:', error);
      throw new Error(`Erro ao criar schema: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async dropSchema(options = {}) {
    const {
      schemaName,
      ifExists = true,
      cascade = false,
      connectionName = null
    } = options;

    if (!schemaName) {
      throw new Error('Nome do schema é obrigatório');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      let dropQuery = `DROP SCHEMA ${ifExists ? 'IF EXISTS ' : ''}\`${schemaName}\``;
      if (cascade) {
        dropQuery += ' CASCADE';
      }

      await connection.execute(dropQuery);

      this.logger.info(`Schema ${schemaName} removido com sucesso`);
      return `✅ Schema ${schemaName} removido com sucesso!`;

    } catch (error) {
      this.logger.error('Erro ao remover schema:', error);
      throw new Error(`Erro ao remover schema: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async listSchemas(options = {}) {
    const {
      includeSystem = false,
      connectionName = null
    } = options;

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      let query = `
        SELECT 
          schema_name,
          default_character_set_name,
          default_collation_name,
          schema_comment
        FROM information_schema.schemata
      `;

      if (!includeSystem) {
        query += ' WHERE schema_name NOT IN (\'information_schema\', \'performance_schema\', \'mysql\', \'sys\')';
      }

      query += ' ORDER BY schema_name';

      const [rows] = await connection.execute(query);

      let output = '';
      
      if (rows.length === 0) {
        output = 'Nenhum schema encontrado.';
      } else {
        output += '| Schema | Charset | Collation | Comentário |\n';
        output += '|--------|---------|-----------|------------|\n';
        
        for (const row of rows) {
          output += `| ${row.schema_name} | ${row.default_character_set_name} | ${row.default_collation_name} | ${row.schema_comment || 'N/A'} |\n`;
        }
        
        output += `\n**Total de schemas:** ${rows.length}`;
      }

      return output;

    } catch (error) {
      this.logger.error('Erro ao listar schemas:', error);
      throw new Error(`Erro ao listar schemas: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  // ===== GESTÃO DE TABELAS =====

  async listTables(options = {}) {
    const {
      schemaName = null,
      includeViews = true,
      connectionName = null
    } = options;

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      let query = `
        SELECT 
          table_schema,
          table_name,
          table_type,
          engine,
          table_rows,
          data_length,
          index_length,
          table_comment
        FROM information_schema.tables
        WHERE table_schema NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
      `;

      if (schemaName) {
        query += ` AND table_schema = '${schemaName}'`;
      }

      if (!includeViews) {
        query += ' AND table_type = \'BASE TABLE\'';
      }

      query += ' ORDER BY table_schema, table_name';

      const [rows] = await connection.execute(query);

      let output = '';
      
      if (rows.length === 0) {
        output = 'Nenhuma tabela encontrada.';
      } else {
        output += '| Schema | Tabela | Tipo | Engine | Linhas | Tamanho Dados | Tamanho Índices | Comentário |\n';
        output += '|--------|--------|------|--------|--------|---------------|-----------------|------------|\n';
        
        for (const row of rows) {
          const dataSize = row.data_length ? `${(row.data_length / 1024 / 1024).toFixed(2)}MB` : 'N/A';
          const indexSize = row.index_length ? `${(row.index_length / 1024 / 1024).toFixed(2)}MB` : 'N/A';
          
          output += `| ${row.table_schema} | ${row.table_name} | ${row.table_type} | ${row.engine || 'N/A'} | ${row.table_rows || 'N/A'} | ${dataSize} | ${indexSize} | ${row.table_comment || 'N/A'} |\n`;
        }
        
        output += `\n**Total de tabelas:** ${rows.length}`;
      }

      return output;

    } catch (error) {
      this.logger.error('Erro ao listar tabelas:', error);
      throw new Error(`Erro ao listar tabelas: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async getTableStructure(options = {}) {
    const {
      tableName,
      schemaName,
      includeIndexes = true,
      includeConstraints = true,
      connectionName = null
    } = options;

    if (!tableName || !schemaName) {
      throw new Error('Nome da tabela e schema são obrigatórios');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      // Informações básicas da tabela
      const tableQuery = `
        SELECT 
          table_name,
          table_type,
          engine,
          table_rows,
          data_length,
          index_length,
          table_comment,
          create_time,
          update_time
        FROM information_schema.tables
        WHERE table_schema = ? AND table_name = ?
      `;

      const [tableRows] = await connection.execute(tableQuery, [schemaName, tableName]);

      if (tableRows.length === 0) {
        return `❌ Tabela ${schemaName}.${tableName} não encontrada.`;
      }

      const table = tableRows[0];
      let output = `## Estrutura da Tabela: ${table.table_name}\n\n`;

      // Informações básicas
      output += '### Informações Básicas\n';
      output += `- **Schema:** ${schemaName}\n`;
      output += `- **Tipo:** ${table.table_type}\n`;
      output += `- **Engine:** ${table.engine || 'N/A'}\n`;
      output += `- **Linhas:** ${table.table_rows || 'N/A'}\n`;
      output += `- **Tamanho dos Dados:** ${table.data_length ? `${(table.data_length / 1024 / 1024).toFixed(2)}MB` : 'N/A'}\n`;
      output += `- **Tamanho dos Índices:** ${table.index_length ? `${(table.index_length / 1024 / 1024).toFixed(2)}MB` : 'N/A'}\n`;
      output += `- **Comentário:** ${table.table_comment || 'N/A'}\n`;
      output += `- **Criada em:** ${table.create_time || 'N/A'}\n`;
      output += `- **Atualizada em:** ${table.update_time || 'N/A'}\n\n`;

      // Colunas
      const columnsQuery = `
        SELECT 
          column_name,
          ordinal_position,
          column_default,
          is_nullable,
          data_type,
          character_maximum_length,
          numeric_precision,
          numeric_scale,
          column_type,
          column_key,
          extra,
          column_comment
        FROM information_schema.columns
        WHERE table_schema = ? AND table_name = ?
        ORDER BY ordinal_position
      `;

      const [columnRows] = await connection.execute(columnsQuery, [schemaName, tableName]);

      if (columnRows.length > 0) {
        output += '### Colunas\n';
        output += '| Pos | Nome | Tipo | Null | Padrão | Chave | Extra | Comentário |\n';
        output += '|-----|------|------|------|--------|-------|-------|------------|\n';
        
        for (const col of columnRows) {
          const key = col.column_key ? col.column_key : '';
          const extra = col.extra ? col.extra : '';
          const comment = col.column_comment ? col.column_comment : '';
          
          output += `| ${col.ordinal_position} | ${col.column_name} | ${col.column_type} | ${col.is_nullable} | ${col.column_default || 'N/A'} | ${key} | ${extra} | ${comment} |\n`;
        }
        output += '\n';
      }

      // Índices
      if (includeIndexes) {
        const indexesQuery = `
          SELECT 
            index_name,
            column_name,
            seq_in_index,
            non_unique,
            index_type,
            cardinality
          FROM information_schema.statistics
          WHERE table_schema = ? AND table_name = ?
          ORDER BY index_name, seq_in_index
        `;

        const [indexRows] = await connection.execute(indexesQuery, [schemaName, tableName]);

        if (indexRows.length > 0) {
          output += '### Índices\n';
          
          const indexGroups = {};
          for (const idx of indexRows) {
            if (!indexGroups[idx.index_name]) {
              indexGroups[idx.index_name] = {
                columns: [],
                unique: !idx.non_unique,
                type: idx.index_type,
                cardinality: idx.cardinality
              };
            }
            indexGroups[idx.index_name].columns.push(idx.column_name);
          }

          for (const [indexName, indexInfo] of Object.entries(indexGroups)) {
            const uniqueText = indexInfo.unique ? 'UNIQUE' : '';
            output += `- **${indexName}** (${uniqueText}, ${indexInfo.type})\n`;
            output += `  - **Colunas:** ${indexInfo.columns.join(', ')}\n`;
            if (indexInfo.cardinality) {
              output += `  - **Cardinalidade:** ${indexInfo.cardinality}\n`;
            }
            output += '\n';
          }
        }
      }

      // Constraints
      if (includeConstraints) {
        const constraintsQuery = `
          SELECT 
            constraint_name,
            constraint_type,
            column_name,
            referenced_table_name,
            referenced_column_name
          FROM information_schema.key_column_usage kcu
          LEFT JOIN information_schema.table_constraints tc 
            ON kcu.constraint_name = tc.constraint_name 
            AND kcu.table_schema = tc.table_schema
          WHERE kcu.table_schema = ? AND kcu.table_name = ?
          ORDER BY constraint_name, ordinal_position
        `;

        const [constraintRows] = await connection.execute(constraintsQuery, [schemaName, tableName]);

        if (constraintRows.length > 0) {
          output += '### Constraints\n';
          
          const constraintGroups = {};
          for (const constraint of constraintRows) {
            if (!constraintGroups[constraint.constraint_name]) {
              constraintGroups[constraint.constraint_name] = {
                type: constraint.constraint_type,
                columns: [],
                referencedTable: constraint.referenced_table_name,
                referencedColumn: constraint.referenced_column_name
              };
            }
            constraintGroups[constraint.constraint_name].columns.push(constraint.column_name);
          }

          for (const [constraintName, constraintInfo] of Object.entries(constraintGroups)) {
            output += `- **${constraintName}** (${constraintInfo.type})\n`;
            output += `  - **Colunas:** ${constraintInfo.columns.join(', ')}\n`;
            if (constraintInfo.referencedTable) {
              output += `  - **Referência:** ${constraintInfo.referencedTable}.${constraintInfo.referencedColumn}\n`;
            }
            output += '\n';
          }
        }
      }

      return output;

    } catch (error) {
      this.logger.error('Erro ao obter estrutura da tabela:', error);
      throw new Error(`Erro ao obter estrutura da tabela: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  // ===== ANÁLISE DE ÍNDICES =====

  async analyzeIndexes(options = {}) {
    const {
      schemaName = null,
      tableName = null,
      connectionName = null
    } = options;

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      let query = `
        SELECT 
          s.table_schema,
          s.table_name,
          s.index_name,
          s.column_name,
          s.seq_in_index,
          s.non_unique,
          s.index_type,
          s.cardinality,
          s.nullable,
          s.sub_part,
          s.packed,
          s.column_type
        FROM information_schema.statistics s
        WHERE s.table_schema NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
      `;

      const params = [];
      if (schemaName) {
        query += ' AND s.table_schema = ?';
        params.push(schemaName);
      }
      if (tableName) {
        query += ' AND s.table_name = ?';
        params.push(tableName);
      }

      query += ' ORDER BY s.table_schema, s.table_name, s.index_name, s.seq_in_index';

      const [rows] = await connection.execute(query, params);

      let output = '';
      
      if (rows.length === 0) {
        output = 'Nenhum índice encontrado.';
      } else {
        output += '## Análise de Índices\n\n';
        
        const indexGroups = {};
        for (const row of rows) {
          const key = `${row.table_schema}.${row.table_name}.${row.index_name}`;
          if (!indexGroups[key]) {
            indexGroups[key] = {
              schema: row.table_schema,
              table: row.table_name,
              name: row.index_name,
              unique: !row.non_unique,
              type: row.index_type,
              cardinality: row.cardinality,
              columns: []
            };
          }
          indexGroups[key].columns.push({
            name: row.column_name,
            position: row.seq_in_index,
            nullable: row.nullable,
            subPart: row.sub_part,
            packed: row.packed,
            columnType: row.column_type
          });
        }

        for (const [key, index] of Object.entries(indexGroups)) {
          output += `### ${index.schema}.${index.table}.${index.name}\n`;
          output += `- **Tipo:** ${index.type}\n`;
          output += `- **Único:** ${index.unique ? 'Sim' : 'Não'}\n`;
          output += `- **Cardinalidade:** ${index.cardinality || 'N/A'}\n`;
          output += '- **Colunas:**\n';
          
          for (const col of index.columns) {
            output += `  - ${col.position}. ${col.name} (${col.columnType})`;
            if (col.nullable === 'YES') output += ' [NULL]';
            if (col.subPart) output += ` [SubPart: ${col.subPart}]`;
            if (col.packed) output += ` [Packed: ${col.packed}]`;
            output += '\n';
          }
          output += '\n';
        }
        
        output += `**Total de índices analisados:** ${Object.keys(indexGroups).length}`;
      }

      return output;

    } catch (error) {
      this.logger.error('Erro ao analisar índices:', error);
      throw new Error(`Erro ao analisar índices: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  // ===== GESTÃO DE VIEWS =====

  async listViews(options = {}) {
    const {
      schemaName = null,
      connectionName = null
    } = options;

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      let query = `
        SELECT 
          table_schema,
          table_name,
          view_definition,
          check_option,
          is_updatable,
          definer,
          security_type
        FROM information_schema.views
        WHERE table_schema NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
      `;

      const params = [];
      if (schemaName) {
        query += ' AND table_schema = ?';
        params.push(schemaName);
      }

      query += ' ORDER BY table_schema, table_name';

      const [rows] = await connection.execute(query, params);

      let output = '';
      
      if (rows.length === 0) {
        output = 'Nenhuma view encontrada.';
      } else {
        output += '| Schema | View | Check Option | Atualizável | Definidor | Segurança |\n';
        output += '|--------|------|--------------|-------------|-----------|----------|\n';
        
        for (const row of rows) {
          output += `| ${row.table_schema} | ${row.table_name} | ${row.check_option || 'N/A'} | ${row.is_updatable} | ${row.definer || 'N/A'} | ${row.security_type || 'N/A'} |\n`;
        }
        
        output += `\n**Total de views:** ${rows.length}`;
      }

      return output;

    } catch (error) {
      this.logger.error('Erro ao listar views:', error);
      throw new Error(`Erro ao listar views: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  // ===== GESTÃO DE ROTINAS =====

  async listRoutines(options = {}) {
    const {
      schemaName = null,
      routineType = null,
      connectionName = null
    } = options;

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      let query = `
        SELECT 
          routine_schema,
          routine_name,
          routine_type,
          data_type,
          routine_definition,
          definer,
          security_type,
          is_deterministic,
          sql_data_access,
          created,
          modified
        FROM information_schema.routines
        WHERE routine_schema NOT IN ('information_schema', 'performance_schema', 'mysql', 'sys')
      `;

      const params = [];
      if (schemaName) {
        query += ' AND routine_schema = ?';
        params.push(schemaName);
      }
      if (routineType) {
        query += ' AND routine_type = ?';
        params.push(routineType.toUpperCase());
      }

      query += ' ORDER BY routine_schema, routine_type, routine_name';

      const [rows] = await connection.execute(query, params);

      let output = '';
      
      if (rows.length === 0) {
        output = 'Nenhuma rotina encontrada.';
      } else {
        output += '| Schema | Nome | Tipo | Retorno | Definidor | Segurança | Determinística | Acesso SQL |\n';
        output += '|--------|------|------|---------|-----------|----------|----------------|------------|\n';
        
        for (const row of rows) {
          output += `| ${row.routine_schema} | ${row.routine_name} | ${row.routine_type} | ${row.data_type || 'N/A'} | ${row.definer || 'N/A'} | ${row.security_type || 'N/A'} | ${row.is_deterministic} | ${row.sql_data_access || 'N/A'} |\n`;
        }
        
        output += `\n**Total de rotinas:** ${rows.length}`;
      }

      return output;

    } catch (error) {
      this.logger.error('Erro ao listar rotinas:', error);
      throw new Error(`Erro ao listar rotinas: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }
}
