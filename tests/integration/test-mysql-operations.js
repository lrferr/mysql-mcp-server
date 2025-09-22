import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { ConnectionManager } from '../../src/connection-manager.js';
import { MySQLMonitor } from '../../src/mysql-monitor.js';
import { DDLOperations } from '../../src/ddl-operations.js';
import { DMLOperations } from '../../src/dml-operations.js';
import { DCLOperations } from '../../src/dcl-operations.js';

describe('MySQL Operations Integration Tests', () => {
  let connectionManager;
  let monitor;
  let ddlOps;
  let dmlOps;
  let dclOps;
  let testTableName = 'test_users_integration';

  beforeAll(async () => {
    // Configurar conexão para testes de integração
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
    dclOps = new DCLOperations(connectionManager);
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
    // Limpar tabela de teste antes de cada teste
    try {
      await ddlOps.dropTable(testTableName);
    } catch (error) {
      // Ignorar erro se tabela não existir
    }
  });

  describe('DDL Operations', () => {
    it('deve criar tabela com sucesso', async () => {
      const result = await ddlOps.createTable({
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
          }
        ],
        constraints: [
          {
            name: 'uk_test_users_email',
            type: 'UNIQUE',
            columns: ['email']
          }
        ]
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Tabela criada com sucesso');

      // Verificar se tabela foi criada
      const tableInfo = await monitor.getTableInfo({
        tableName: testTableName
      });
      expect(tableInfo).toContain('Nome: ' + testTableName);
    });

    it('deve alterar tabela adicionando coluna', async () => {
      // Criar tabela primeiro
      await ddlOps.createTable({
        tableName: testTableName,
        columns: [
          { name: 'id', type: 'INT', notNull: true, primaryKey: true },
          { name: 'name', type: 'VARCHAR', length: 100, notNull: true }
        ]
      });

      // Adicionar coluna
      const result = await ddlOps.alterTable({
        tableName: testTableName,
        operation: 'ADD_COLUMN',
        columnName: 'email',
        columnType: 'VARCHAR',
        columnLength: 100,
        notNull: false
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Coluna adicionada com sucesso');

      // Verificar se coluna foi adicionada
      const tableInfo = await monitor.getTableInfo({
        tableName: testTableName
      });
      expect(tableInfo).toContain('email');
    });

    it('deve remover tabela com sucesso', async () => {
      // Criar tabela primeiro
      await ddlOps.createTable({
        tableName: testTableName,
        columns: [
          { name: 'id', type: 'INT', notNull: true, primaryKey: true }
        ]
      });

      // Remover tabela
      const result = await ddlOps.dropTable(testTableName);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Tabela removida com sucesso');
    });
  });

  describe('DML Operations', () => {
    beforeEach(async () => {
      // Criar tabela para testes DML
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
          }
        ]
      });
    });

    it('deve inserir dados com sucesso', async () => {
      const result = await dmlOps.insertData({
        tableName: testTableName,
        data: {
          name: 'João Silva',
          email: 'joao@example.com'
        }
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Dados inseridos com sucesso');
      expect(result.insertId).toBeDefined();
    });

    it('deve selecionar dados com sucesso', async () => {
      // Inserir dados primeiro
      await dmlOps.insertData({
        tableName: testTableName,
        data: {
          name: 'Maria Santos',
          email: 'maria@example.com'
        }
      });

      // Selecionar dados
      const result = await dmlOps.selectData({
        tableName: testTableName,
        columns: ['id', 'name', 'email']
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data[0]).toHaveProperty('name', 'Maria Santos');
    });

    it('deve atualizar dados com sucesso', async () => {
      // Inserir dados primeiro
      const insertResult = await dmlOps.insertData({
        tableName: testTableName,
        data: {
          name: 'Pedro Oliveira',
          email: 'pedro@example.com'
        }
      });

      // Atualizar dados
      const result = await dmlOps.updateData({
        tableName: testTableName,
        data: {
          name: 'Pedro Santos'
        },
        whereClause: `id = ${insertResult.insertId}`
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Dados atualizados com sucesso');
      expect(result.affectedRows).toBe(1);
    });

    it('deve remover dados com sucesso', async () => {
      // Inserir dados primeiro
      const insertResult = await dmlOps.insertData({
        tableName: testTableName,
        data: {
          name: 'Ana Costa',
          email: 'ana@example.com'
        }
      });

      // Remover dados
      const result = await dmlOps.deleteData({
        tableName: testTableName,
        whereClause: `id = ${insertResult.insertId}`
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Dados removidos com sucesso');
      expect(result.affectedRows).toBe(1);
    });
  });

  describe('DCL Operations', () => {
    const testUser = 'test_user_integration';

    afterAll(async () => {
      // Limpar usuário de teste
      try {
        await dclOps.revokePrivileges({
          privileges: ['ALL PRIVILEGES'],
          onObject: '*.*',
          fromUser: testUser
        });
        // Nota: MySQL não tem DROP USER direto via DCL, seria necessário via SQL direto
      } catch (error) {
        // Ignorar erro se usuário não existir
      }
    });

    it('deve criar usuário com sucesso', async () => {
      const result = await dclOps.createUser({
        username: testUser,
        password: 'test_password_123',
        host: 'localhost'
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Usuário criado com sucesso');
    });

    it('deve conceder privilégios com sucesso', async () => {
      // Criar usuário primeiro
      await dclOps.createUser({
        username: testUser,
        password: 'test_password_123',
        host: 'localhost'
      });

      // Conceder privilégios
      const result = await dclOps.grantPrivileges({
        privileges: ['SELECT', 'INSERT'],
        onObject: 'testdb.*',
        toUser: testUser,
        toHost: 'localhost'
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Privilégios concedidos com sucesso');
    });

    it('deve revogar privilégios com sucesso', async () => {
      // Criar usuário e conceder privilégios primeiro
      await dclOps.createUser({
        username: testUser,
        password: 'test_password_123',
        host: 'localhost'
      });

      await dclOps.grantPrivileges({
        privileges: ['SELECT', 'INSERT'],
        onObject: 'testdb.*',
        toUser: testUser,
        toHost: 'localhost'
      });

      // Revogar privilégios
      const result = await dclOps.revokePrivileges({
        privileges: ['INSERT'],
        onObject: 'testdb.*',
        fromUser: testUser,
        fromHost: 'localhost'
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('Privilégios revogados com sucesso');
    });
  });

  describe('Monitor Operations', () => {
    beforeEach(async () => {
      // Criar tabela para testes de monitoramento
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
          }
        ]
      });
    });

    it('deve verificar saúde do banco', async () => {
      const result = await monitor.checkDatabaseHealth({
        checkConnections: true,
        checkStorage: true,
        checkPerformance: true
      });

      expect(result).toContain('Conexões Ativas');
      expect(result).toContain('Status do Armazenamento');
      expect(result).toContain('Métricas de Performance');
    });

    it('deve obter informações do banco', async () => {
      const result = await monitor.getDatabaseInfo({
        includeUsers: false,
        includeDatabases: true
      });

      expect(result).toContain('Versão MySQL');
      expect(result).toContain('Uptime');
      expect(result).toContain('Conexões Ativas');
    });

    it('deve obter informações da tabela', async () => {
      const result = await monitor.getTableInfo({
        tableName: testTableName,
        includeConstraints: true,
        includeIndexes: true
      });

      expect(result).toContain('Nome: ' + testTableName);
      expect(result).toContain('Colunas');
      expect(result).toContain('Constraints');
      expect(result).toContain('Índices');
    });

    it('deve executar query segura', async () => {
      // Inserir dados primeiro
      await dmlOps.insertData({
        tableName: testTableName,
        data: { name: 'Test User' }
      });

      const result = await monitor.executeSafeQuery(
        `SELECT * FROM ${testTableName} LIMIT 1`
      );

      expect(result).toContain('|');
      expect(result).toContain('Test User');
    });

    it('deve analisar tabela', async () => {
      const result = await monitor.analyzeTable({
        tableName: testTableName
      });

      expect(result).toContain('✅ Análise da tabela');
      expect(result).toContain('concluída com sucesso');
    });
  });

  describe('Error Handling', () => {
    it('deve lidar com erro de tabela inexistente', async () => {
      const result = await monitor.getTableInfo({
        tableName: 'tabela_inexistente'
      });

      expect(result).toContain('não encontrada');
    });

    it('deve lidar com erro de query inválida', async () => {
      await expect(
        monitor.executeSafeQuery('DROP TABLE users')
      ).rejects.toThrow('Apenas queries SELECT são permitidas');
    });

    it('deve lidar com erro de conexão', async () => {
      // Fechar todas as conexões para simular erro
      await connectionManager.closeAllPools();

      const result = await monitor.checkDatabaseHealth();
      expect(result).toContain('❌ Erro ao verificar saúde do banco');
    });
  });
});




