import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { ConnectionManager } from '../../src/connection-manager.js';
import { MySQLMonitor } from '../../src/mysql-monitor.js';
import { DDLOperations } from '../../src/ddl-operations.js';
import { DMLOperations } from '../../src/dml-operations.js';

describe('Performance Tests', () => {
  let connectionManager;
  let monitor;
  let ddlOps;
  let dmlOps;
  let testTableName = 'performance_test_table';

  beforeAll(async () => {
    // Configurar conexão para testes de performance
    process.env.MYSQL_CONNECTIONS = JSON.stringify({
      connections: {
        test: {
          host: process.env.MYSQL_HOST || 'localhost',
          port: parseInt(process.env.MYSQL_PORT || '3306'),
          user: process.env.MYSQL_USER || 'root',
          password: process.env.MYSQL_PASSWORD || 'password',
          database: process.env.MYSQL_DATABASE || 'testdb'
        }
      },
      defaultConnection: 'test'
    });

    connectionManager = new ConnectionManager();
    monitor = new MySQLMonitor(connectionManager);
    ddlOps = new DDLOperations(connectionManager);
    dmlOps = new DMLOperations(connectionManager);
  });

  afterAll(async () => {
    // Limpar tabela de teste
    try {
      await ddlOps.dropTable(testTableName);
    } catch (error) {
      // Ignorar erro se tabela não existir
    }
    
    await connectionManager.closeAllPools();
  });

  beforeEach(async () => {
    // Limpar e recriar tabela para cada teste
    try {
      await ddlOps.dropTable(testTableName);
    } catch (error) {
      // Ignorar erro se tabela não existir
    }

    // Criar tabela para testes
    await ddlOps.createTable({
      tableName: testTableName,
      columns: [
        {
          name: 'id',
          type: 'INT',
          notNull: true,
          primaryKey: true,
          autoIncrement: true
        },
        {
          name: 'name',
          type: 'VARCHAR',
          length: 100,
          notNull: true
        },
        {
          name: 'email',
          type: 'VARCHAR',
          length: 100,
          notNull: false
        },
        {
          name: 'created_at',
          type: 'TIMESTAMP',
          notNull: false,
          defaultValue: 'CURRENT_TIMESTAMP'
        }
      ],
      constraints: [
        {
          name: 'idx_performance_test_name',
          type: 'INDEX',
          columns: ['name']
        },
        {
          name: 'idx_performance_test_email',
          type: 'INDEX',
          columns: ['email']
        }
      ]
    });
  });

  describe('Connection Pool Performance', () => {
    it('deve gerenciar múltiplas conexões simultâneas eficientemente', async () => {
      const startTime = Date.now();
      const concurrentOperations = 50;
      
      // Criar múltiplas operações simultâneas
      const operations = Array(concurrentOperations).fill().map(async (_, index) => {
        return await monitor.executeSafeQuery(
          `SELECT ${index} as operation_id, NOW() as timestamp`
        );
      });

      const results = await Promise.all(operations);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verificar se todas as operações foram executadas
      expect(results).toHaveLength(concurrentOperations);
      
      // Verificar se a duração é aceitável (menos de 5 segundos para 50 operações)
      expect(duration).toBeLessThan(5000);
      
      console.log(`✅ ${concurrentOperations} operações simultâneas executadas em ${duration}ms`);
    });

    it('deve reutilizar conexões do pool eficientemente', async () => {
      const startTime = Date.now();
      const operations = 100;
      
      // Executar muitas operações sequenciais
      for (let i = 0; i < operations; i++) {
        await monitor.executeSafeQuery(`SELECT ${i} as operation_id`);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Verificar se a duração é aceitável
      expect(duration).toBeLessThan(10000); // 10 segundos para 100 operações
      
      console.log(`✅ ${operations} operações sequenciais executadas em ${duration}ms`);
    });
  });

  describe('Query Performance', () => {
    beforeEach(async () => {
      // Inserir dados de teste para queries
      const testData = Array(1000).fill().map((_, index) => ({
        name: `User ${index}`,
        email: `user${index}@example.com`
      }));

      // Inserir dados em lotes para melhor performance
      const batchSize = 100;
      for (let i = 0; i < testData.length; i += batchSize) {
        const batch = testData.slice(i, i + batchSize);
        for (const data of batch) {
          await dmlOps.insertData({
            tableName: testTableName,
            data
          });
        }
      }
    });

    it('deve executar queries SELECT com boa performance', async () => {
      const startTime = Date.now();
      
      const result = await monitor.executeSafeQuery(
        `SELECT * FROM ${testTableName} WHERE name LIKE 'User 1%' LIMIT 100`
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Verificar se a query foi executada rapidamente
      expect(duration).toBeLessThan(1000); // 1 segundo
      expect(result).toContain('|');
      
      console.log(`✅ Query SELECT executada em ${duration}ms`);
    });

    it('deve executar queries com JOIN eficientemente', async () => {
      // Criar segunda tabela para JOIN
      const joinTableName = 'performance_test_join_table';
      await ddlOps.createTable({
        tableName: joinTableName,
        columns: [
          { name: 'id', type: 'INT', notNull: true, primaryKey: true, autoIncrement: true },
          { name: 'user_id', type: 'INT', notNull: true },
          { name: 'description', type: 'TEXT', notNull: false }
        ],
        constraints: [
          { name: 'fk_join_user_id', type: 'FOREIGN KEY', columns: ['user_id'], referencedTable: testTableName, referencedColumns: ['id'] }
        ]
      });

      // Inserir dados na tabela de JOIN
      for (let i = 1; i <= 100; i++) {
        await dmlOps.insertData({
          tableName: joinTableName,
          data: {
            user_id: i,
            description: `Description for user ${i}`
          }
        });
      }

      const startTime = Date.now();
      
      const result = await monitor.executeSafeQuery(
        `SELECT t1.id, t1.name, t2.description FROM ${testTableName} t1 JOIN ${joinTableName} t2 ON t1.id = t2.user_id LIMIT 50`
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Verificar se a query foi executada rapidamente
      expect(duration).toBeLessThan(2000); // 2 segundos
      expect(result).toContain('|');
      
      console.log(`✅ Query JOIN executada em ${duration}ms`);
      
      // Limpar tabela de JOIN
      await ddlOps.dropTable(joinTableName);
    });

    it('deve executar queries com ORDER BY eficientemente', async () => {
      const startTime = Date.now();
      
      const result = await monitor.executeSafeQuery(
        `SELECT * FROM ${testTableName} ORDER BY name DESC LIMIT 100`
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Verificar se a query foi executada rapidamente
      expect(duration).toBeLessThan(1000); // 1 segundo
      expect(result).toContain('|');
      
      console.log(`✅ Query ORDER BY executada em ${duration}ms`);
    });

    it('deve executar queries com GROUP BY eficientemente', async () => {
      const startTime = Date.now();
      
      const result = await monitor.executeSafeQuery(
        `SELECT name, COUNT(*) as count FROM ${testTableName} GROUP BY name LIMIT 50`
      );
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Verificar se a query foi executada rapidamente
      expect(duration).toBeLessThan(1000); // 1 segundo
      expect(result).toContain('|');
      
      console.log(`✅ Query GROUP BY executada em ${duration}ms`);
    });
  });

  describe('DML Operations Performance', () => {
    it('deve inserir dados em lote com boa performance', async () => {
      const startTime = Date.now();
      const batchSize = 100;
      const totalRecords = 1000;
      
      // Inserir dados em lotes
      for (let i = 0; i < totalRecords; i += batchSize) {
        const batch = Array(batchSize).fill().map((_, index) => ({
          name: `Batch User ${i + index}`,
          email: `batch${i + index}@example.com`
        }));
        
        for (const data of batch) {
          await dmlOps.insertData({
            tableName: testTableName,
            data
          });
        }
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Verificar se a inserção foi rápida
      expect(duration).toBeLessThan(10000); // 10 segundos para 1000 registros
      
      console.log(`✅ ${totalRecords} registros inseridos em ${duration}ms`);
    });

    it('deve atualizar dados com boa performance', async () => {
      // Inserir dados primeiro
      for (let i = 1; i <= 100; i++) {
        await dmlOps.insertData({
          tableName: testTableName,
          data: {
            name: `User ${i}`,
            email: `user${i}@example.com`
          }
        });
      }

      const startTime = Date.now();
      
      // Atualizar dados
      const result = await dmlOps.updateData({
        tableName: testTableName,
        data: { name: 'Updated User' },
        whereClause: 'id <= 50'
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Verificar se a atualização foi rápida
      expect(duration).toBeLessThan(2000); // 2 segundos
      expect(result.success).toBe(true);
      expect(result.affectedRows).toBe(50);
      
      console.log(`✅ ${result.affectedRows} registros atualizados em ${duration}ms`);
    });

    it('deve deletar dados com boa performance', async () => {
      // Inserir dados primeiro
      for (let i = 1; i <= 100; i++) {
        await dmlOps.insertData({
          tableName: testTableName,
          data: {
            name: `User ${i}`,
            email: `user${i}@example.com`
          }
        });
      }

      const startTime = Date.now();
      
      // Deletar dados
      const result = await dmlOps.deleteData({
        tableName: testTableName,
        whereClause: 'id > 50'
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Verificar se a deleção foi rápida
      expect(duration).toBeLessThan(2000); // 2 segundos
      expect(result.success).toBe(true);
      expect(result.affectedRows).toBe(50);
      
      console.log(`✅ ${result.affectedRows} registros deletados em ${duration}ms`);
    });
  });

  describe('DDL Operations Performance', () => {
    it('deve criar tabela com boa performance', async () => {
      const startTime = Date.now();
      
      const result = await ddlOps.createTable({
        tableName: 'performance_ddl_test',
        columns: [
          { name: 'id', type: 'INT', notNull: true, primaryKey: true, autoIncrement: true },
          { name: 'name', type: 'VARCHAR', length: 100, notNull: true },
          { name: 'email', type: 'VARCHAR', length: 100, notNull: false },
          { name: 'description', type: 'TEXT', notNull: false },
          { name: 'created_at', type: 'TIMESTAMP', notNull: false, defaultValue: 'CURRENT_TIMESTAMP' }
        ],
        constraints: [
          { name: 'idx_ddl_name', type: 'INDEX', columns: ['name'] },
          { name: 'idx_ddl_email', type: 'INDEX', columns: ['email'] }
        ]
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Verificar se a criação foi rápida
      expect(duration).toBeLessThan(2000); // 2 segundos
      expect(result.success).toBe(true);
      
      console.log(`✅ Tabela criada em ${duration}ms`);
      
      // Limpar tabela
      await ddlOps.dropTable('performance_ddl_test');
    });

    it('deve alterar tabela com boa performance', async () => {
      // Criar tabela primeiro
      await ddlOps.createTable({
        tableName: 'performance_alter_test',
        columns: [
          { name: 'id', type: 'INT', notNull: true, primaryKey: true }
        ]
      });

      const startTime = Date.now();
      
      // Alterar tabela
      const result = await ddlOps.alterTable({
        tableName: 'performance_alter_test',
        operation: 'ADD_COLUMN',
        columnName: 'name',
        columnType: 'VARCHAR',
        columnLength: 100,
        notNull: true
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Verificar se a alteração foi rápida
      expect(duration).toBeLessThan(1000); // 1 segundo
      expect(result.success).toBe(true);
      
      console.log(`✅ Tabela alterada em ${duration}ms`);
      
      // Limpar tabela
      await ddlOps.dropTable('performance_alter_test');
    });
  });

  describe('Monitor Operations Performance', () => {
    beforeEach(async () => {
      // Inserir dados para testes de monitoramento
      for (let i = 1; i <= 100; i++) {
        await dmlOps.insertData({
          tableName: testTableName,
          data: {
            name: `Monitor User ${i}`,
            email: `monitor${i}@example.com`
          }
        });
      }
    });

    it('deve executar health check com boa performance', async () => {
      const startTime = Date.now();
      
      const result = await monitor.checkDatabaseHealth({
        checkConnections: true,
        checkStorage: true,
        checkPerformance: true
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Verificar se o health check foi rápido
      expect(duration).toBeLessThan(3000); // 3 segundos
      expect(result).toContain('Conexões Ativas');
      
      console.log(`✅ Health check executado em ${duration}ms`);
    });

    it('deve obter informações da tabela com boa performance', async () => {
      const startTime = Date.now();
      
      const result = await monitor.getTableInfo({
        tableName: testTableName,
        includeConstraints: true,
        includeIndexes: true
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Verificar se a obtenção de informações foi rápida
      expect(duration).toBeLessThan(2000); // 2 segundos
      expect(result).toContain('Nome: ' + testTableName);
      
      console.log(`✅ Informações da tabela obtidas em ${duration}ms`);
    });

    it('deve analisar tabela com boa performance', async () => {
      const startTime = Date.now();
      
      const result = await monitor.analyzeTable({
        tableName: testTableName
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Verificar se a análise foi rápida
      expect(duration).toBeLessThan(2000); // 2 segundos
      expect(result).toContain('✅ Análise da tabela');
      
      console.log(`✅ Tabela analisada em ${duration}ms`);
    });
  });

  describe('Memory Usage', () => {
    it('deve gerenciar memória eficientemente durante operações', async () => {
      const initialMemory = process.memoryUsage();
      
      // Executar muitas operações
      for (let i = 0; i < 100; i++) {
        await monitor.executeSafeQuery(`SELECT ${i} as operation_id`);
      }
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      
      // Verificar se o aumento de memória é aceitável (menos de 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
      
      console.log(`✅ Aumento de memória: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Concurrent Operations', () => {
    it('deve lidar com operações concorrentes eficientemente', async () => {
      const startTime = Date.now();
      const concurrentOperations = 20;
      
      // Criar operações concorrentes de diferentes tipos
      const operations = Array(concurrentOperations).fill().map(async (_, index) => {
        switch (index % 4) {
          case 0:
            return await monitor.executeSafeQuery(`SELECT ${index} as query_id`);
          case 1:
            return await monitor.getTableInfo({ tableName: testTableName });
          case 2:
            return await monitor.checkDatabaseHealth({ checkConnections: true });
          case 3:
            return await monitor.analyzeTable({ tableName: testTableName });
        }
      });
      
      const results = await Promise.all(operations);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Verificar se todas as operações foram executadas
      expect(results).toHaveLength(concurrentOperations);
      
      // Verificar se a duração é aceitável
      expect(duration).toBeLessThan(10000); // 10 segundos
      
      console.log(`✅ ${concurrentOperations} operações concorrentes executadas em ${duration}ms`);
    });
  });
});






