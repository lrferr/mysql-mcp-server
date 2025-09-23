import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MySQLMonitor } from '../../src/mysql-monitor.js';

describe('MySQLMonitor', () => {
  let monitor;
  let mockConnectionManager;
  let mockConnection;

  beforeEach(() => {
    mockConnection = {
      query: vi.fn(),
      release: vi.fn()
    };

    mockConnectionManager = {
      getConnection: vi.fn().mockResolvedValue(mockConnection)
    };

    monitor = new MySQLMonitor(mockConnectionManager);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('checkDatabaseHealth', () => {
    it('deve verificar saúde do banco com sucesso', async () => {
      // Mock das queries de health check
      mockConnection.query
        .mockResolvedValueOnce([[{ total_connections: 5, active_connections: 2, sleeping_connections: 3 }]]) // checkConnections
        .mockResolvedValueOnce([[{ database_name: 'test_db', total_size_mb: 25.5, free_space_mb: 1024 }]]) // checkStorage
        .mockResolvedValueOnce([[{ Variable_name: 'Uptime', Value: '86400' }]]) // checkPerformance
        .mockResolvedValueOnce([[{ Variable_name: 'Questions', Value: '1500' }]])
        .mockResolvedValueOnce([[{ Variable_name: 'Slow_queries', Value: '5' }]])
        .mockResolvedValueOnce([[{ Variable_name: 'Aborted_clients', Value: '0' }]])
        .mockResolvedValueOnce([[{ Variable_name: 'Connections', Value: '25' }]]);

      const result = await monitor.checkDatabaseHealth({
        checkConnections: true,
        checkStorage: true,
        checkPerformance: true
      });

      expect(result).toContain('Conexões Ativas');
      expect(result).toContain('Status do Armazenamento');
      expect(result).toContain('Métricas de Performance');
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('deve lidar com erro na verificação de saúde', async () => {
      mockConnection.query.mockRejectedValue(new Error('Database error'));

      const result = await monitor.checkDatabaseHealth();

      expect(result).toContain('❌ Erro ao verificar saúde do banco');
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('executeSafeQuery', () => {
    it('deve executar query SELECT com sucesso', async () => {
      const mockRows = [
        { id: 1, name: 'João' },
        { id: 2, name: 'Maria' }
      ];
      const mockFields = [
        { name: 'id' },
        { name: 'name' }
      ];

      mockConnection.query.mockResolvedValue([mockRows, mockFields]);

      const result = await monitor.executeSafeQuery('SELECT id, name FROM users LIMIT 2');

      expect(result).toContain('| id | name |');
      expect(result).toContain('| 1 | João |');
      expect(result).toContain('| 2 | Maria |');
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('deve rejeitar queries não-SELECT', async () => {
      await expect(monitor.executeSafeQuery('DROP TABLE users')).rejects.toThrow(
        'Apenas queries SELECT são permitidas por segurança'
      );
    });

    it('deve rejeitar queries com palavras-chave perigosas', async () => {
      await expect(monitor.executeSafeQuery('SELECT * FROM users WHERE id = 1; DROP TABLE users')).rejects.toThrow(
        'Palavra-chave perigosa detectada: DROP'
      );
    });

    it('deve lidar com resultado vazio', async () => {
      mockConnection.query.mockResolvedValue([[], []]);

      const result = await monitor.executeSafeQuery('SELECT * FROM empty_table');

      expect(result).toBe('Nenhum resultado encontrado');
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('getDatabaseInfo', () => {
    it('deve obter informações do banco com sucesso', async () => {
      mockConnection.query
        .mockResolvedValueOnce([[{ Variable_name: 'Version', Value: '8.0.35' }]])
        .mockResolvedValueOnce([[{ Variable_name: 'Uptime', Value: '86400' }]])
        .mockResolvedValueOnce([[{ Variable_name: 'Threads_connected', Value: '5' }]])
        .mockResolvedValueOnce([[{ schema_name: 'app_db', DEFAULT_CHARACTER_SET_NAME: 'utf8mb4', DEFAULT_COLLATION_NAME: 'utf8mb4_0900_ai_ci' }]]);

      const result = await monitor.getDatabaseInfo({
        includeUsers: false,
        includeDatabases: true
      });

      expect(result).toContain('Versão MySQL: 8.0.35');
      expect(result).toContain('Uptime: 86400 segundos');
      expect(result).toContain('Conexões Ativas: 5');
      expect(result).toContain('app_db');
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('deve incluir informações de usuários quando solicitado', async () => {
      mockConnection.query
        .mockResolvedValueOnce([[{ Variable_name: 'Version', Value: '8.0.35' }]])
        .mockResolvedValueOnce([[{ Variable_name: 'Uptime', Value: '86400' }]])
        .mockResolvedValueOnce([[{ Variable_name: 'Threads_connected', Value: '5' }]])
        .mockResolvedValueOnce([[{ schema_name: 'app_db', DEFAULT_CHARACTER_SET_NAME: 'utf8mb4', DEFAULT_COLLATION_NAME: 'utf8mb4_0900_ai_ci' }]])
        .mockResolvedValueOnce([[{ user: 'app_user', host: 'localhost' }]]);

      const result = await monitor.getDatabaseInfo({
        includeUsers: true,
        includeDatabases: true
      });

      expect(result).toContain('app_user');
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('getTableInfo', () => {
    it('deve obter informações da tabela com sucesso', async () => {
      mockConnection.query
        .mockResolvedValueOnce([[
          {
            table_name: 'users',
            table_schema: 'app_db',
            table_rows: 150,
            data_length: 2621440,
            index_length: 262144,
            create_time: '2024-12-19 10:00:00',
            update_time: '2024-12-19 10:30:00'
          }
        ]])
        .mockResolvedValueOnce([[
          { column_name: 'id', column_type: 'int(11)', is_nullable: 'NO', column_default: null, extra: 'auto_increment' },
          { column_name: 'name', column_type: 'varchar(100)', is_nullable: 'YES', column_default: null, extra: '' }
        ]])
        .mockResolvedValueOnce([[
          { constraint_name: 'PRIMARY', constraint_type: 'PRIMARY KEY' }
        ]])
        .mockResolvedValueOnce([[
          { index_name: 'PRIMARY', columns: 'id', non_unique: 0, index_type: 'BTREE' }
        ]]);

      const result = await monitor.getTableInfo({
        tableName: 'users',
        database: 'app_db',
        includeConstraints: true,
        includeIndexes: true
      });

      expect(result).toContain('Nome: users');
      expect(result).toContain('Banco de Dados: app_db');
      expect(result).toContain('Linhas: 150');
      expect(result).toContain('id int(11) NOT NULL AUTO_INCREMENT');
      expect(result).toContain('PRIMARY (PRIMARY KEY)');
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('getConstraints', () => {
    it('deve obter constraints com sucesso', async () => {
      mockConnection.query.mockResolvedValue([[
        { table_schema: 'app_db', table_name: 'users', constraint_name: 'PRIMARY', constraint_type: 'PRIMARY KEY' },
        { table_schema: 'app_db', table_name: 'users', constraint_name: 'email_unique', constraint_type: 'UNIQUE' }
      ]]);

      const result = await monitor.getConstraints({
        tableName: 'users',
        database: 'app_db'
      });

      expect(result).toContain('Tabela app_db.users');
      expect(result).toContain('PRIMARY (PRIMARY KEY)');
      expect(result).toContain('email_unique (UNIQUE)');
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('deve filtrar por tipo de constraint', async () => {
      mockConnection.query.mockResolvedValue([[
        { table_schema: 'app_db', table_name: 'users', constraint_name: 'PRIMARY', constraint_type: 'PRIMARY KEY' }
      ]]);

      const result = await monitor.getConstraints({
        tableName: 'users',
        database: 'app_db',
        constraintType: 'PRIMARY KEY'
      });

      expect(result).toContain('PRIMARY (PRIMARY KEY)');
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('getForeignKeys', () => {
    it('deve obter chaves estrangeiras com sucesso', async () => {
      mockConnection.query
        .mockResolvedValueOnce([['app_db']]) // getCurrentDatabase
        .mockResolvedValueOnce([[
          {
            table_schema: 'app_db',
            table_name: 'orders',
            column_name: 'user_id',
            constraint_name: 'fk_orders_user_id',
            referenced_table_schema: 'app_db',
            referenced_table_name: 'users',
            referenced_column_name: 'id'
          }
        ]]);

      const result = await monitor.getForeignKeys({
        tableName: 'orders',
        database: 'app_db'
      });

      expect(result).toContain('FK: fk_orders_user_id');
      expect(result).toContain('orders → app_db.users');
      expect(result).toContain('user_id referencia id');
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('getIndexes', () => {
    it('deve obter índices com sucesso', async () => {
      mockConnection.query.mockResolvedValue([[
        {
          table_schema: 'app_db',
          table_name: 'users',
          index_name: 'PRIMARY',
          columns: 'id',
          non_unique: 0,
          index_type: 'BTREE'
        },
        {
          table_schema: 'app_db',
          table_name: 'users',
          index_name: 'email_unique',
          columns: 'email',
          non_unique: 0,
          index_type: 'BTREE'
        }
      ]]);

      const result = await monitor.getIndexes({
        tableName: 'users',
        database: 'app_db'
      });

      expect(result).toContain('Tabela app_db.users');
      expect(result).toContain('PRIMARY (id) - Tipo: BTREE, UNIQUE');
      expect(result).toContain('email_unique (email) - Tipo: BTREE, UNIQUE');
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('getTriggers', () => {
    it('deve obter triggers com sucesso', async () => {
      mockConnection.query
        .mockResolvedValueOnce([['app_db']]) // getCurrentDatabase
        .mockResolvedValueOnce([[
          {
            trigger_schema: 'app_db',
            trigger_name: 'trg_users_updated_at',
            event_manipulation: 'UPDATE',
            event_object_table: 'users',
            action_timing: 'BEFORE',
            action_statement: 'BEGIN\n  SET NEW.updated_at = NOW();\nEND'
          }
        ]]);

      const result = await monitor.getTriggers({
        tableName: 'users',
        database: 'app_db',
        includeCode: true
      });

      expect(result).toContain('Tabela app_db.users');
      expect(result).toContain('trg_users_updated_at (BEFORE UPDATE)');
      expect(result).toContain('SET NEW.updated_at = NOW()');
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('analyzeTable', () => {
    it('deve analisar tabela com sucesso', async () => {
      mockConnection.query.mockResolvedValue([[]]);

      const result = await monitor.analyzeTable({
        tableName: 'users',
        database: 'app_db'
      });

      expect(result).toContain('✅ Análise da tabela app_db.users concluída com sucesso');
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('monitorSchemaChanges', () => {
    it('deve monitorar mudanças de schema com sucesso', async () => {
      mockConnection.query.mockResolvedValue([[
        {
          table_name: 'users',
          table_type: 'BASE TABLE',
          create_time: '2024-12-19 10:00:00',
          update_time: '2024-12-19 10:30:00'
        }
      ]]);

      const result = await monitor.monitorSchemaChanges({
        databases: ['app_db']
      });

      expect(result).toContain('Mudanças no Banco de Dados app_db');
      expect(result).toContain('users - Criado: 2024-12-19 10:00:00');
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('deve retornar mensagem quando não há mudanças', async () => {
      mockConnection.query.mockResolvedValue([[]]);

      const result = await monitor.monitorSchemaChanges({
        databases: ['app_db']
      });

      expect(result).toContain('✅ Nenhuma mudança detectada nos bancos de dados monitorados');
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('checkSensitiveTables', () => {
    it('deve verificar tabelas sensíveis com sucesso', async () => {
      mockConnection.query
        .mockResolvedValueOnce([[
          { column_name: 'id', data_type: 'int', is_nullable: 'NO', column_default: null },
          { column_name: 'name', data_type: 'varchar', is_nullable: 'YES', column_default: null }
        ]])
        .mockResolvedValueOnce([[{ total_rows: 150 }]]);

      const result = await monitor.checkSensitiveTables({
        tables: ['users'],
        database: 'app_db',
        checkDataChanges: true
      });

      expect(result).toContain('Tabela app_db.users');
      expect(result).toContain('id (int) NOT NULL');
      expect(result).toContain('name (varchar) NULL');
      expect(result).toContain('Contagem de Linhas: 150');
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });
});






