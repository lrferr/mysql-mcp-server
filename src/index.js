#!/usr/bin/env node

// Corrigir aviso de MaxListenersExceededWarning
process.setMaxListeners(15);

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { MySQLMonitor } from './mysql-monitor.js';
import { MigrationValidator } from './migration-validator.js';
import { NotificationService } from './notification-service.js';
import { Logger } from './logger.js';
import { DDLOperations } from './ddl-operations.js';
import { DMLOperations } from './dml-operations.js';
import { DCLOperations } from './dcl-operations.js';
import { SecurityAudit } from './security-audit.js';
import { ConnectionManager } from './connection-manager.js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente do .env (fallback)
dotenv.config();

class MySQLMCPServer {
  constructor() {
    // Priorizar variáveis de ambiente passadas pelo Cursor/Claude (mcp.json)
    // sobre as do arquivo .env
    const getEnvVar = (key, defaultValue = null) => {
      // Primeiro tenta a variável de ambiente (passada pelo Cursor/Claude)
      // process.env já contém as variáveis do mcp.json se passadas pelo Cursor
      return process.env[key] || defaultValue;
    };

    this.server = new Server(
      {
        name: getEnvVar('MCP_SERVER_NAME', 'mysql-mcp-server-v1'),
        version: getEnvVar('MCP_SERVER_VERSION', '1.1.7')
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    // Inicializar componentes
    this.connectionManager = new ConnectionManager();
    this.monitor = new MySQLMonitor(this.connectionManager);
    this.migrationValidator = new MigrationValidator();
    this.notificationService = new NotificationService();
    this.logger = new Logger();
    this.ddlOperations = new DDLOperations(this.connectionManager);
    this.dmlOperations = new DMLOperations(this.connectionManager);
    this.dclOperations = new DCLOperations(this.connectionManager);
    this.securityAudit = new SecurityAudit(this.connectionManager);
    
    // Inicializar o connectionManager imediatamente
    this.connectionManager.initialize().catch(error => {
      this.logger.error('Erro ao inicializar ConnectionManager:', error);
    });

    this.setupHandlers();
  }

  setupHandlers() {
    // Listar ferramentas disponíveis
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Ferramentas de conexão
          {
            name: 'list_connections',
            description: 'Lista todas as conexões configuradas',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          },
          {
            name: 'test_connection',
            description: 'Testa uma conexão específica com o banco MySQL',
            inputSchema: {
              type: 'object',
              properties: {
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão a ser testada'
                }
              },
              required: ['connectionName']
            }
          },
          {
            name: 'test_all_connections',
            description: 'Testa todas as conexões configuradas',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          },
          {
            name: 'get_connections_status',
            description: 'Obtém o status de todas as conexões ativas',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          },
          // Ferramentas de monitoramento
          {
            name: 'check_database_health',
            description: 'Verifica a saúde geral do banco de dados',
            inputSchema: {
              type: 'object',
              properties: {
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão (opcional)'
                },
                includePerformance: {
                  type: 'boolean',
                  description: 'Incluir verificações de performance'
                }
              },
              required: []
            }
          },
          {
            name: 'monitor_schema_changes',
            description: 'Monitora mudanças no esquema do banco de dados',
            inputSchema: {
              type: 'object',
              properties: {
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão'
                },
                databases: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Lista de bancos para monitorar'
                }
              },
              required: ['connectionName']
            }
          },
          {
            name: 'check_sensitive_tables',
            description: 'Verifica tabelas sensíveis no banco de dados',
            inputSchema: {
              type: 'object',
              properties: {
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão'
                }
              },
              required: ['connectionName']
            }
          },
          {
            name: 'detect_suspicious_activity',
            description: 'Detecta atividades suspeitas no banco de dados',
            inputSchema: {
              type: 'object',
              properties: {
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão'
                }
              },
              required: ['connectionName']
            }
          },
          // Ferramentas de análise
          {
            name: 'get_table_info',
            description: 'Obtém informações detalhadas sobre uma tabela',
            inputSchema: {
              type: 'object',
              properties: {
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão'
                },
                tableName: {
                  type: 'string',
                  description: 'Nome da tabela'
                },
                databaseName: {
                  type: 'string',
                  description: 'Nome do banco de dados'
                }
              },
              required: ['connectionName', 'tableName']
            }
          },
          {
            name: 'get_constraints',
            description: 'Lista todas as constraints de uma tabela',
            inputSchema: {
              type: 'object',
              properties: {
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão'
                },
                tableName: {
                  type: 'string',
                  description: 'Nome da tabela'
                },
                databaseName: {
                  type: 'string',
                  description: 'Nome do banco de dados'
                }
              },
              required: ['connectionName', 'tableName']
            }
          },
          {
            name: 'get_foreign_keys',
            description: 'Lista todas as chaves estrangeiras de uma tabela',
            inputSchema: {
              type: 'object',
              properties: {
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão'
                },
                tableName: {
                  type: 'string',
                  description: 'Nome da tabela'
                },
                databaseName: {
                  type: 'string',
                  description: 'Nome do banco de dados'
                }
              },
              required: ['connectionName', 'tableName']
            }
          },
          {
            name: 'get_indexes',
            description: 'Lista todos os índices de uma tabela',
            inputSchema: {
              type: 'object',
              properties: {
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão'
                },
                tableName: {
                  type: 'string',
                  description: 'Nome da tabela'
                },
                databaseName: {
                  type: 'string',
                  description: 'Nome do banco de dados'
                }
              },
              required: ['connectionName', 'tableName']
            }
          },
          {
            name: 'analyze_table',
            description: 'Analisa uma tabela e gera estatísticas',
            inputSchema: {
              type: 'object',
              properties: {
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão'
                },
                tableName: {
                  type: 'string',
                  description: 'Nome da tabela'
                },
                databaseName: {
                  type: 'string',
                  description: 'Nome do banco de dados'
                }
              },
              required: ['connectionName', 'tableName']
            }
          }
        ]
      };
    });

    // Executar ferramentas
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        // Ferramentas de conexão
        if (name === 'list_connections') {
          // Garantir que o connectionManager esteja inicializado
          await this.connectionManager.initialize();
          const connections = this.connectionManager.getAvailableConnections();
          return {
            content: [
              {
                type: 'text',
                text: `Conexões disponíveis: ${JSON.stringify(connections, null, 2)}`
              }
            ]
          };
        }
        if (name === 'test_connection') {
          await this.connectionManager.initialize();
          const result = await this.connectionManager.testConnection(args.connectionName);
          return {
            content: [
              {
                type: 'text',
                text: result.success ? 
                  `✅ ${result.message}` : 
                  `❌ ${result.message}`
              }
            ]
          };
        }
        if (name === 'test_all_connections') {
          await this.connectionManager.initialize();
          const results = await this.connectionManager.testAllConnections();
          return {
            content: [
              {
                type: 'text',
                text: `Resultados dos testes de conexão:\n${JSON.stringify(results, null, 2)}`
              }
            ]
          };
        }
        if (name === 'get_connections_status') {
          await this.connectionManager.initialize();
          const status = await this.connectionManager.getConnectionsStatus();
          return {
            content: [
              {
                type: 'text',
                text: `Status das conexões:\n${JSON.stringify(status, null, 2)}`
              }
            ]
          };
        }

        // Ferramentas de monitoramento
        if (name === 'check_database_health') {
          const result = await this.monitor.checkDatabaseHealth(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }
        if (name === 'monitor_schema_changes') {
          const result = await this.monitor.monitorSchemaChanges(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }
        if (name === 'check_sensitive_tables') {
          const result = await this.monitor.checkSensitiveTables(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }
        if (name === 'detect_suspicious_activity') {
          const result = await this.monitor.detectSuspiciousActivity(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }

        // Ferramentas de análise
        if (name === 'get_table_info') {
          const result = await this.monitor.getTableInfo(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }
        if (name === 'get_constraints') {
          const result = await this.monitor.getConstraints(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }
        if (name === 'get_foreign_keys') {
          const result = await this.monitor.getForeignKeys(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }
        if (name === 'get_indexes') {
          const result = await this.monitor.getIndexes(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }
        if (name === 'analyze_table') {
          const result = await this.monitor.analyzeTable(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Ferramenta '${name}' não implementada ainda.`
            }
          ]
        };
      } catch (error) {
        this.logger.error(`Erro ao executar ferramenta '${name}':`, error);
        return {
          content: [
            {
              type: 'text',
              text: `❌ Erro ao executar '${name}': ${error.message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    // Não logar para stdout quando usando stdio transport
    // this.logger.info('Servidor MCP MySQL iniciado com sucesso!');
  }
}

// Iniciar o servidor
async function startServer() {
  try {
    const server = new MySQLMCPServer();
    await server.start();
    return server;
  } catch (error) {
    // console.error('Erro ao iniciar servidor MCP:', error);
    process.exit(1);
  }
}

// Executar se for o módulo principal
startServer();
