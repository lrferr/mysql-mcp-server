import { Logger } from './logger.js';
import mysql from 'mysql2/promise';
import { ConnectionManager } from './connection-manager.js';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class DLMOperations {
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

  // ===== GESTÃO DE BACKUPS =====

  async createBackup(options = {}) {
    const {
      database,
      backupPath = './backups/',
      includeData = true,
      includeStructure = true,
      compress = true,
      connectionName = null
    } = options;

    if (!database) {
      throw new Error('Nome do database é obrigatório');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);
      
      // Obter configuração de conexão para mysqldump
      const connectionConfig = await this.connectionManager.getConnectionConfig(connectionName);
      
      // Criar diretório de backup se não existir
      await fs.mkdir(backupPath, { recursive: true });

      // Gerar nome do arquivo de backup
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const extension = compress ? '.sql.gz' : '.sql';
      const backupFile = path.join(backupPath, `${database}_${timestamp}${extension}`);

      // Construir comando mysqldump
      let command = 'mysqldump';
      
      // Adicionar parâmetros de conexão
      if (connectionConfig.host) command += ` -h ${connectionConfig.host}`;
      if (connectionConfig.port) command += ` -P ${connectionConfig.port}`;
      if (connectionConfig.user) command += ` -u ${connectionConfig.user}`;
      if (connectionConfig.password) command += ` -p${connectionConfig.password}`;

      // Adicionar opções
      if (includeStructure && includeData) {
        command += ' --complete-insert --routines --triggers';
      } else if (includeStructure && !includeData) {
        command += ' --no-data --routines --triggers';
      } else if (!includeStructure && includeData) {
        command += ' --no-create-info';
      }

      command += ` ${database}`;

      if (compress) {
        command += ` | gzip > ${backupFile}`;
      } else {
        command += ` > ${backupFile}`;
      }

      // Executar backup
      await execAsync(command);

      // Verificar se o arquivo foi criado
      const stats = await fs.stat(backupFile);
      const fileSize = (stats.size / 1024 / 1024).toFixed(2);

      this.logger.info(`Backup do database ${database} criado com sucesso: ${backupFile}`);
      return `✅ Backup do database ${database} criado com sucesso!\n📁 Arquivo: ${backupFile}\n📊 Tamanho: ${fileSize}MB`;

    } catch (error) {
      this.logger.error('Erro ao criar backup:', error);
      throw new Error(`Erro ao criar backup: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async restoreBackup(options = {}) {
    const {
      database,
      backupFile,
      connectionName = null
    } = options;

    if (!database || !backupFile) {
      throw new Error('Nome do database e arquivo de backup são obrigatórios');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);
      
      // Verificar se o arquivo de backup existe
      try {
        await fs.access(backupFile);
      } catch (error) {
        throw new Error(`Arquivo de backup não encontrado: ${backupFile}`);
      }

      // Obter configuração de conexão
      const connectionConfig = await this.connectionManager.getConnectionConfig(connectionName);

      // Construir comando de restauração
      let command = 'mysql';
      
      // Adicionar parâmetros de conexão
      if (connectionConfig.host) command += ` -h ${connectionConfig.host}`;
      if (connectionConfig.port) command += ` -P ${connectionConfig.port}`;
      if (connectionConfig.user) command += ` -u ${connectionConfig.user}`;
      if (connectionConfig.password) command += ` -p${connectionConfig.password}`;

      command += ` ${database}`;

      // Verificar se é arquivo comprimido
      if (backupFile.endsWith('.gz')) {
        command = `gunzip -c ${backupFile} | ${command}`;
      } else {
        command = `${command} < ${backupFile}`;
      }

      // Executar restauração
      await execAsync(command);

      this.logger.info(`Database ${database} restaurado com sucesso do backup: ${backupFile}`);
      return `✅ Database ${database} restaurado com sucesso do backup: ${backupFile}`;

    } catch (error) {
      this.logger.error('Erro ao restaurar backup:', error);
      throw new Error(`Erro ao restaurar backup: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async listBackups(options = {}) {
    const {
      backupPath = './backups/',
      database = null,
      days = 30
    } = options;

    try {
      // Verificar se o diretório existe
      try {
        await fs.access(backupPath);
      } catch (error) {
        return 'Diretório de backup não encontrado.';
      }

      // Listar arquivos de backup
      const files = await fs.readdir(backupPath);
      const backupFiles = files.filter(file => 
        file.endsWith('.sql') || file.endsWith('.sql.gz')
      );

      if (backupFiles.length === 0) {
        return 'Nenhum backup encontrado.';
      }

      // Filtrar por database se especificado
      let filteredFiles = backupFiles;
      if (database) {
        filteredFiles = backupFiles.filter(file => file.includes(database));
      }

      // Filtrar por data
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const recentFiles = [];
      for (const file of filteredFiles) {
        try {
          const filePath = path.join(backupPath, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime >= cutoffDate) {
            recentFiles.push({
              name: file,
              size: (stats.size / 1024 / 1024).toFixed(2),
              modified: stats.mtime,
              path: filePath
            });
          }
        } catch (error) {
          // Ignorar arquivos com erro
          continue;
        }
      }

      // Ordenar por data de modificação (mais recente primeiro)
      recentFiles.sort((a, b) => b.modified - a.modified);

      let output = `## Backups Disponíveis (últimos ${days} dias)\n\n`;
      
      if (recentFiles.length === 0) {
        output += 'Nenhum backup encontrado no período especificado.';
      } else {
        output += '| Arquivo | Tamanho | Data de Modificação |\n';
        output += '|---------|---------|---------------------|\n';
        
        for (const file of recentFiles) {
          const modifiedDate = file.modified.toLocaleString();
          output += `| ${file.name} | ${file.size}MB | ${modifiedDate} |\n`;
        }
        
        output += `\n**Total de backups:** ${recentFiles.length}`;
      }

      return output;

    } catch (error) {
      this.logger.error('Erro ao listar backups:', error);
      throw new Error(`Erro ao listar backups: ${error.message}`);
    }
  }

  // ===== ARQUIVAMENTO E RETENÇÃO =====

  async archiveOldData(options = {}) {
    const {
      tableName,
      schemaName,
      archiveTableName = null,
      archiveSchemaName = 'archive',
      condition,
      batchSize = 1000,
      connectionName = null
    } = options;

    if (!tableName || !schemaName || !condition) {
      throw new Error('Nome da tabela, schema e condição são obrigatórios');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      // Usar nome padrão para tabela de arquivo se não especificado
      const finalArchiveTableName = archiveTableName || `${tableName}_archive`;
      
      // Criar schema de arquivo se não existir
      const createArchiveSchemaQuery = `
        CREATE SCHEMA IF NOT EXISTS \`${archiveSchemaName}\`
        DEFAULT CHARACTER SET utf8mb4 
        DEFAULT COLLATE utf8mb4_unicode_ci
      `;
      await connection.execute(createArchiveSchemaQuery);

      // Criar tabela de arquivo baseada na tabela original
      const createArchiveTableQuery = `
        CREATE TABLE IF NOT EXISTS \`${archiveSchemaName}\`.\`${finalArchiveTableName}\`
        LIKE \`${schemaName}\`.\`${tableName}\`
      `;
      await connection.execute(createArchiveTableQuery);

      // Adicionar coluna de data de arquivamento
      const addArchiveDateQuery = `
        ALTER TABLE \`${archiveSchemaName}\`.\`${finalArchiveTableName}\`
        ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `;
      await connection.execute(addArchiveDateQuery);

      // Mover dados em lotes
      let totalArchived = 0;
      let hasMoreData = true;

      while (hasMoreData) {
        // Inserir dados na tabela de arquivo
        const insertQuery = `
          INSERT INTO \`${archiveSchemaName}\`.\`${finalArchiveTableName}\`
          SELECT *, NOW() as archived_at
          FROM \`${schemaName}\`.\`${tableName}\`
          WHERE ${condition}
          LIMIT ${batchSize}
        `;

        const [insertResult] = await connection.execute(insertQuery);
        const rowsInserted = insertResult.affectedRows;

        if (rowsInserted === 0) {
          hasMoreData = false;
        } else {
          // Remover dados da tabela original
          const deleteQuery = `
            DELETE FROM \`${schemaName}\`.\`${tableName}\`
            WHERE ${condition}
            LIMIT ${batchSize}
          `;

          await connection.execute(deleteQuery);
          totalArchived += rowsInserted;
        }
      }

      this.logger.info(`${totalArchived} registros arquivados de ${schemaName}.${tableName}`);
      return `✅ ${totalArchived} registros arquivados de ${schemaName}.${tableName} para ${archiveSchemaName}.${finalArchiveTableName}`;

    } catch (error) {
      this.logger.error('Erro ao arquivar dados antigos:', error);
      throw new Error(`Erro ao arquivar dados antigos: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async applyRetentionPolicy(options = {}) {
    const {
      policies,
      dryRun = false,
      connectionName = null
    } = options;

    if (!policies || !Array.isArray(policies) || policies.length === 0) {
      throw new Error('Lista de políticas de retenção é obrigatória');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      let output = '## Aplicação de Políticas de Retenção\n\n';
      output += `**Modo:** ${dryRun ? 'Simulação (DRY RUN)' : 'Execução Real'}\n\n`;

      let totalAffected = 0;

      for (const policy of policies) {
        const {
          tableName,
          schemaName,
          columnName,
          retentionDays,
          action
        } = policy;

        if (!tableName || !schemaName || !columnName || !retentionDays || !action) {
          output += `⚠️ Política inválida: ${JSON.stringify(policy)}\n`;
          continue;
        }

        // Construir condição de retenção
        const condition = `${columnName} < DATE_SUB(NOW(), INTERVAL ${retentionDays} DAY)`;

        // Contar registros que serão afetados
        const countQuery = `
          SELECT COUNT(*) as count
          FROM \`${schemaName}\`.\`${tableName}\`
          WHERE ${condition}
        `;

        const [countRows] = await connection.execute(countQuery);
        const recordCount = countRows[0].count;

        output += `### ${schemaName}.${tableName}\n`;
        output += `- **Condição:** ${condition}\n`;
        output += `- **Ação:** ${action}\n`;
        output += `- **Registros afetados:** ${recordCount}\n`;

        if (recordCount > 0) {
          if (dryRun) {
            output += `- **Status:** Simulação - ${recordCount} registros seriam ${action === 'DELETE' ? 'removidos' : 'arquivados'}\n`;
          } else {
            if (action === 'DELETE') {
              const deleteQuery = `
                DELETE FROM \`${schemaName}\`.\`${tableName}\`
                WHERE ${condition}
              `;
              await connection.execute(deleteQuery);
              output += `- **Status:** ✅ ${recordCount} registros removidos\n`;
            } else if (action === 'ARCHIVE') {
              // Usar função de arquivamento
              await this.archiveOldData({
                tableName,
                schemaName,
                condition,
                connectionName
              });
              output += `- **Status:** ✅ ${recordCount} registros arquivados\n`;
            }
            totalAffected += recordCount;
          }
        } else {
          output += '- **Status:** Nenhum registro afetado\n';
        }
        output += '\n';
      }

      output += `**Total de registros afetados:** ${totalAffected}`;

      return output;

    } catch (error) {
      this.logger.error('Erro ao aplicar políticas de retenção:', error);
      throw new Error(`Erro ao aplicar políticas de retenção: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  // ===== OTIMIZAÇÃO =====

  async compressTable(options = {}) {
    const {
      tableName,
      schemaName,
      connectionName = null
    } = options;

    if (!tableName || !schemaName) {
      throw new Error('Nome da tabela e schema são obrigatórios');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      // Verificar se a tabela suporta compressão
      const checkQuery = `
        SELECT engine, row_format
        FROM information_schema.tables
        WHERE table_schema = ? AND table_name = ?
      `;
      const [tableInfo] = await connection.execute(checkQuery, [schemaName, tableName]);

      if (tableInfo.length === 0) {
        throw new Error(`Tabela ${schemaName}.${tableName} não encontrada`);
      }

      const engine = tableInfo[0].engine;
      if (engine !== 'InnoDB') {
        throw new Error(`Compressão só é suportada para tabelas InnoDB. Tabela atual: ${engine}`);
      }

      // Obter tamanho antes da compressão
      const sizeBeforeQuery = `
        SELECT 
          data_length,
          index_length,
          data_free
        FROM information_schema.tables
        WHERE table_schema = ? AND table_name = ?
      `;
      const [sizeBefore] = await connection.execute(sizeBeforeQuery, [schemaName, tableName]);
      const sizeBeforeMB = ((sizeBefore[0].data_length + sizeBefore[0].index_length) / 1024 / 1024).toFixed(2);

      // Aplicar compressão
      const compressQuery = `
        ALTER TABLE \`${schemaName}\`.\`${tableName}\`
        ROW_FORMAT=COMPRESSED
        KEY_BLOCK_SIZE=8
      `;
      await connection.execute(compressQuery);

      // Obter tamanho após compressão
      const [sizeAfter] = await connection.execute(sizeBeforeQuery, [schemaName, tableName]);
      const sizeAfterMB = ((sizeAfter[0].data_length + sizeAfter[0].index_length) / 1024 / 1024).toFixed(2);
      const savings = (sizeBefore[0].data_length + sizeBefore[0].index_length - sizeAfter[0].data_length - sizeAfter[0].index_length) / 1024 / 1024;

      this.logger.info(`Tabela ${schemaName}.${tableName} comprimida com sucesso`);
      return `✅ Tabela ${schemaName}.${tableName} comprimida com sucesso!\n📊 Tamanho antes: ${sizeBeforeMB}MB\n📊 Tamanho depois: ${sizeAfterMB}MB\n💾 Economia: ${savings.toFixed(2)}MB`;

    } catch (error) {
      this.logger.error('Erro ao comprimir tabela:', error);
      throw new Error(`Erro ao comprimir tabela: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async createPartition(options = {}) {
    const {
      tableName,
      schemaName,
      partitionType = 'RANGE',
      partitionColumn,
      partitions,
      connectionName = null
    } = options;

    if (!tableName || !schemaName || !partitionColumn || !partitions || !Array.isArray(partitions)) {
      throw new Error('Nome da tabela, schema, coluna de partição e lista de partições são obrigatórios');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      // Construir definições de partições
      let partitionDefinitions = '';
      
      if (partitionType === 'RANGE') {
        partitionDefinitions = partitions.map(partition => {
          return `PARTITION ${partition.name} VALUES LESS THAN (${partition.value})`;
        }).join(',\n  ');
      } else if (partitionType === 'LIST') {
        partitionDefinitions = partitions.map(partition => {
          return `PARTITION ${partition.name} VALUES IN (${partition.value})`;
        }).join(',\n  ');
      } else if (partitionType === 'HASH') {
        partitionDefinitions = `PARTITIONS ${partitions.length}`;
      } else if (partitionType === 'KEY') {
        partitionDefinitions = `PARTITIONS ${partitions.length}`;
      }

      // Aplicar particionamento
      const partitionQuery = `
        ALTER TABLE \`${schemaName}\`.\`${tableName}\`
        PARTITION BY ${partitionType}(${partitionColumn})
        (
          ${partitionDefinitions}
        )
      `;

      await connection.execute(partitionQuery);

      this.logger.info(`Tabela ${schemaName}.${tableName} particionada com sucesso`);
      return `✅ Tabela ${schemaName}.${tableName} particionada com sucesso!\n📊 Tipo: ${partitionType}\n📊 Coluna: ${partitionColumn}\n📊 Partições: ${partitions.length}`;

    } catch (error) {
      this.logger.error('Erro ao criar partições:', error);
      throw new Error(`Erro ao criar partições: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async dropPartition(options = {}) {
    const {
      tableName,
      schemaName,
      partitionName,
      connectionName = null
    } = options;

    if (!tableName || !schemaName || !partitionName) {
      throw new Error('Nome da tabela, schema e nome da partição são obrigatórios');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      // Verificar se a partição existe
      const checkQuery = `
        SELECT partition_name
        FROM information_schema.partitions
        WHERE table_schema = ? AND table_name = ? AND partition_name = ?
      `;
      const [partitionExists] = await connection.execute(checkQuery, [schemaName, tableName, partitionName]);

      if (partitionExists.length === 0) {
        throw new Error(`Partição ${partitionName} não encontrada na tabela ${schemaName}.${tableName}`);
      }

      // Remover partição
      const dropQuery = `
        ALTER TABLE \`${schemaName}\`.\`${tableName}\`
        DROP PARTITION \`${partitionName}\`
      `;

      await connection.execute(dropQuery);

      this.logger.info(`Partição ${partitionName} removida da tabela ${schemaName}.${tableName}`);
      return `✅ Partição ${partitionName} removida da tabela ${schemaName}.${tableName}`;

    } catch (error) {
      this.logger.error('Erro ao remover partição:', error);
      throw new Error(`Erro ao remover partição: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }
}
