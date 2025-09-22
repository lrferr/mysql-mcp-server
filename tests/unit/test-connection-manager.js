import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConnectionManager } from '../../src/connection-manager.js';

describe('ConnectionManager', () => {
  let connectionManager;

  beforeEach(() => {
    // Mock das configurações para teste
    process.env.MYSQL_CONNECTIONS = JSON.stringify({
      connections: {
        test: {
          host: 'localhost',
          port: 3306,
          user: 'test_user',
          password: 'test_password',
          database: 'test_db'
        }
      },
      defaultConnection: 'test'
    });
    
    connectionManager = new ConnectionManager();
  });

  afterEach(() => {
    // Limpar mocks
    delete process.env.MYSQL_CONNECTIONS;
  });

  describe('loadConfig', () => {
    it('deve carregar configuração das variáveis de ambiente', () => {
      expect(connectionManager.config).toBeDefined();
      expect(connectionManager.config.connections).toBeDefined();
      expect(connectionManager.config.connections.test).toBeDefined();
      expect(connectionManager.config.defaultConnection).toBe('test');
    });

    it('deve usar configuração padrão quando não há configuração', () => {
      delete process.env.MYSQL_CONNECTIONS;
      const manager = new ConnectionManager();
      
      expect(manager.config).toBeDefined();
      expect(manager.config.connections.default).toBeDefined();
      expect(manager.config.defaultConnection).toBe('default');
    });
  });

  describe('getPool', () => {
    it('deve retornar pool existente se já criado', async () => {
      // Mock do pool
      const mockPool = { test: true };
      connectionManager.pools.set('test', mockPool);
      
      const pool = await connectionManager.getPool('test');
      expect(pool).toBe(mockPool);
    });

    it('deve criar novo pool se não existir', async () => {
      // Mock do mysql.createPool
      const mockPool = { created: true };
      const mockCreatePool = vi.fn().mockReturnValue(mockPool);
      
      // Mock do módulo mysql2
      vi.mock('mysql2/promise', () => ({
        default: {
          createPool: mockCreatePool
        }
      }));

      const pool = await connectionManager.getPool('test');
      expect(pool).toBe(mockPool);
      expect(mockCreatePool).toHaveBeenCalledWith({
        host: 'localhost',
        port: 3306,
        user: 'test_user',
        password: 'test_password',
        database: 'test_db',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
    });

    it('deve lançar erro para conexão inexistente', async () => {
      await expect(connectionManager.getPool('inexistente')).rejects.toThrow(
        "Conexão 'inexistente' não encontrada na configuração"
      );
    });
  });

  describe('getConnection', () => {
    it('deve retornar conexão do pool', async () => {
      const mockConnection = { test: true };
      const mockPool = {
        getConnection: vi.fn().mockResolvedValue(mockConnection)
      };
      
      connectionManager.pools.set('test', mockPool);
      
      const connection = await connectionManager.getConnection('test');
      expect(connection).toBe(mockConnection);
      expect(mockPool.getConnection).toHaveBeenCalled();
    });
  });

  describe('closePool', () => {
    it('deve fechar pool existente', async () => {
      const mockPool = {
        end: vi.fn().mockResolvedValue()
      };
      
      connectionManager.pools.set('test', mockPool);
      
      await connectionManager.closePool('test');
      expect(mockPool.end).toHaveBeenCalled();
      expect(connectionManager.pools.has('test')).toBe(false);
    });

    it('deve ignorar pool inexistente', async () => {
      await expect(connectionManager.closePool('inexistente')).resolves.not.toThrow();
    });
  });

  describe('closeAllPools', () => {
    it('deve fechar todos os pools', async () => {
      const mockPool1 = { end: vi.fn().mockResolvedValue() };
      const mockPool2 = { end: vi.fn().mockResolvedValue() };
      
      connectionManager.pools.set('test1', mockPool1);
      connectionManager.pools.set('test2', mockPool2);
      
      await connectionManager.closeAllPools();
      
      expect(mockPool1.end).toHaveBeenCalled();
      expect(mockPool2.end).toHaveBeenCalled();
      expect(connectionManager.pools.size).toBe(0);
    });
  });

  describe('getAvailableConnections', () => {
    it('deve retornar lista de conexões disponíveis', () => {
      const connections = connectionManager.getAvailableConnections();
      
      expect(connections).toHaveLength(1);
      expect(connections[0]).toEqual({
        name: 'test',
        description: undefined,
        environment: undefined
      });
    });
  });

  describe('getDefaultConnection', () => {
    it('deve retornar conexão padrão', () => {
      const defaultConnection = connectionManager.getDefaultConnection();
      expect(defaultConnection).toBe('test');
    });
  });

  describe('testConnection', () => {
    it('deve testar conexão com sucesso', async () => {
      const mockConnection = {
        query: vi.fn().mockResolvedValue([[{ solution: 2 }]]),
        release: vi.fn()
      };
      
      const mockPool = {
        getConnection: vi.fn().mockResolvedValue(mockConnection)
      };
      
      connectionManager.pools.set('test', mockPool);
      
      const result = await connectionManager.testConnection('test');
      
      expect(result.success).toBe(true);
      expect(result.message).toBe("Conexão 'test' testada com sucesso");
      expect(mockConnection.query).toHaveBeenCalledWith('SELECT 1 + 1 AS solution');
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('deve falhar no teste de conexão', async () => {
      const mockConnection = {
        query: vi.fn().mockRejectedValue(new Error('Connection failed')),
        release: vi.fn()
      };
      
      const mockPool = {
        getConnection: vi.fn().mockResolvedValue(mockConnection)
      };
      
      connectionManager.pools.set('test', mockPool);
      
      const result = await connectionManager.testConnection('test');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain("Falha no teste da conexão 'test'");
      expect(mockConnection.release).toHaveBeenCalled();
    });
  });

  describe('testAllConnections', () => {
    it('deve testar todas as conexões', async () => {
      const mockConnection = {
        query: vi.fn().mockResolvedValue([[{ solution: 2 }]]),
        release: vi.fn()
      };
      
      const mockPool = {
        getConnection: vi.fn().mockResolvedValue(mockConnection)
      };
      
      connectionManager.pools.set('test', mockPool);
      
      const results = await connectionManager.testAllConnections();
      
      expect(results).toHaveProperty('test');
      expect(results.test.success).toBe(true);
    });
  });

  describe('getConnectionsStatus', () => {
    it('deve retornar status das conexões', async () => {
      const mockConnection = {
        query: vi.fn().mockResolvedValue([[
          {
            connection_name: 'test',
            current_database: 'test_db',
            current_user: 'test_user@localhost',
            mysql_version: '8.0.35',
            current_time: '2024-12-19 10:30:00'
          }
        ]]),
        release: vi.fn()
      };
      
      const mockPool = {
        getConnection: vi.fn().mockResolvedValue(mockConnection)
      };
      
      connectionManager.pools.set('test', mockPool);
      
      const status = await connectionManager.getConnectionsStatus();
      
      expect(status).toHaveProperty('test');
      expect(status.test.active).toBe(true);
      expect(status.test.info).toBeDefined();
    });
  });
});





