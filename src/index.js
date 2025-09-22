#!/usr/bin/env node

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
        name: getEnvVar('MCP_SERVER_NAME', 'mysql-monitor'),
        version: getEnvVar('MCP_SERVER_VERSION', '1.0.0'),
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.logger = new Logger();
    
    // Inicializar ConnectionManager para múltiplas conexões
    this.connectionManager = new ConnectionManager();
    
    // Inicializar módulos com ConnectionManager
    this.mysqlMonitor = new MySQLMonitor(this.connectionManager);
    this.migrationValidator = new MigrationValidator();
    this.notificationService = new NotificationService();
    
    // Configuração de conexão priorizando variáveis do Cursor/Claude
    this.connectionConfig = {
      host: getEnvVar('MYSQL_HOST'),
      port: parseInt(getEnvVar('MYSQL_PORT', '3306')),
      user: getEnvVar('MYSQL_USER'),
      password: getEnvVar('MYSQL_PASSWORD'),
      database: getEnvVar('MYSQL_DATABASE')
    };
    
    this.ddlOperations = new DDLOperations(this.connectionConfig, this.connectionManager);
    this.dmlOperations = new DMLOperations(this.connectionConfig, this.connectionManager);
    this.dclOperations = new DCLOperations(this.connectionConfig, this.connectionManager);
    this.securityAudit = new SecurityAudit();

    this.setupHandlers();
  }

  setupHandlers() {
    // Listar ferramentas disponíveis
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'check_database_health',
            description: 'Verifica a saúde geral do banco de dados MySQL',
            inputSchema: {
              type: 'object',
              properties: {
                checkConnections: {
                  type: 'boolean',
                  description: 'Verificar conexões ativas',
                  default: true
                },
                checkStorage: {
                  type: 'boolean',
                  description: 'Verificar espaço em disco',
                  default: true
                },
                checkPerformance: {
                  type: 'boolean',
                  description: 'Verificar métricas de performance',
                  default: true
                },
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão para usar (opcional)',
                  default: null
                }
              }
            }
          },
          {
            name: 'monitor_schema_changes',
            description: 'Monitora mudanças em esquemas críticos',
            inputSchema: {
              type: 'object',
              properties: {
                schemas: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Lista de esquemas para monitorar',
                  default: ['mysql', 'information_schema', 'performance_schema']
                },
                checkInterval: {
                  type: 'number',
                  description: 'Intervalo de verificação em minutos',
                  default: 5
                }
              }
            }
          },
          {
            name: 'validate_migration_script',
            description: 'Valida se um script de migração está adequado',
            inputSchema: {
              type: 'object',
              properties: {
                script: {
                  type: 'string',
                  description: 'Conteúdo do script de migração SQL'
                },
                targetSchema: {
                  type: 'string',
                  description: 'Esquema de destino da migração'
                }
              },
              required: ['script', 'targetSchema']
            }
          },
          {
            name: 'check_sensitive_tables',
            description: 'Verifica alterações em tabelas sensíveis',
            inputSchema: {
              type: 'object',
              properties: {
                tables: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Lista de tabelas sensíveis para verificar'
                },
                checkDataChanges: {
                  type: 'boolean',
                  description: 'Verificar mudanças nos dados',
                  default: true
                }
              }
            }
          },
          {
            name: 'execute_safe_query',
            description: 'Executa uma query de forma segura (apenas SELECT)',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Query SQL para executar (apenas SELECT permitido)'
                },
                database: {
                  type: 'string',
                  description: 'Database para executar a query',
                  default: 'mysql'
                }
              },
              required: ['query']
            }
          },
          {
            name: 'get_database_info',
            description: 'Obtém informações gerais sobre o banco de dados',
            inputSchema: {
              type: 'object',
              properties: {
                includeUsers: {
                  type: 'boolean',
                  description: 'Incluir informações de usuários',
                  default: false
                },
                includeDatabases: {
                  type: 'boolean',
                  description: 'Incluir informações de databases',
                  default: true
                }
              }
            }
          },
          {
            name: 'get_table_info',
            description: 'Obtém informações detalhadas sobre uma tabela específica',
            inputSchema: {
              type: 'object',
              properties: {
                tableName: {
                  type: 'string',
                  description: 'Nome da tabela'
                },
                database: {
                  type: 'string',
                  description: 'Database da tabela',
                  default: 'mysql'
                },
                includeConstraints: {
                  type: 'boolean',
                  description: 'Incluir informações de constraints',
                  default: true
                },
                includeIndexes: {
                  type: 'boolean',
                  description: 'Incluir informações de índices',
                  default: true
                }
              },
              required: ['tableName']
            }
          },
          {
            name: 'list_connections',
            description: 'Lista todas as conexões MySQL configuradas',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'test_connection',
            description: 'Testa uma conexão específica',
            inputSchema: {
              type: 'object',
              properties: {
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão para testar',
                  default: null
                }
              }
            }
          },
          {
            name: 'test_all_connections',
            description: 'Testa todas as conexões configuradas',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          },
          {
            name: 'get_connections_status',
            description: 'Obtém o status de todas as conexões ativas',
            inputSchema: {
              type: 'object',
              properties: {}
            }
          }
        ]
      };
    });

    // Executar ferramentas
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
        case 'check_database_health':
          return await this.handleCheckDatabaseHealth(args);
          
        case 'monitor_schema_changes':
          return await this.handleMonitorSchemaChanges(args);
          
        case 'validate_migration_script':
          return await this.handleValidateMigrationScript(args);
          
        case 'check_sensitive_tables':
          return await this.handleCheckSensitiveTables(args);
          
        case 'execute_safe_query':
          return await this.handleExecuteSafeQuery(args);
          
        case 'get_database_info':
          return await this.handleGetDatabaseInfo(args);
          
        case 'get_table_info':
          return await this.handleGetTableInfo(args);
          
        case 'list_connections':
          return await this.handleListConnections();
          
        case 'test_connection':
          return await this.handleTestConnection(args);
          
        case 'test_all_connections':
          return await this.handleTestAllConnections();
          
        case 'get_connections_status':
          return await this.handleGetConnectionsStatus();
          
        default:
          throw new Error(`Ferramenta desconhecida: ${name}`);
        }
      } catch (error) {
        this.logger.error(`Erro ao executar ferramenta ${name}:`, error);
        return {
          content: [
            {
              type: 'text',
              text: `Erro: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  async handleCheckDatabaseHealth(args) {
    const result = await this.mysqlMonitor.checkDatabaseHealth(args);
    return {
      content: [
        {
          type: 'text',
          text: `## Status da Saúde do Banco de Dados MySQL\n\n${result}`
        }
      ]
    };
  }

  async handleMonitorSchemaChanges(args) {
    const result = await this.mysqlMonitor.monitorSchemaChanges(args);
    return {
      content: [
        {
          type: 'text',
          text: `## Monitoramento de Mudanças em Esquemas\n\n${result}`
        }
      ]
    };
  }

  async handleValidateMigrationScript(args) {
    const result = await this.migrationValidator.validateScript(args.script, args.targetSchema);
    return {
      content: [
        {
          type: 'text',
          text: `## Validação do Script de Migração\n\n${result}`
        }
      ]
    };
  }

  async handleCheckSensitiveTables(args) {
    const result = await this.mysqlMonitor.checkSensitiveTables(args);
    return {
      content: [
        {
          type: 'text',
          text: `## Verificação de Tabelas Sensíveis\n\n${result}`
        }
      ]
    };
  }

  async handleExecuteSafeQuery(args) {
    const result = await this.mysqlMonitor.executeSafeQuery(args.query, args.database);
    return {
      content: [
        {
          type: 'text',
          text: `## Resultado da Query\n\n${result}`
        }
      ]
    };
  }

  async handleGetDatabaseInfo(args) {
    const result = await this.mysqlMonitor.getDatabaseInfo(args);
    return {
      content: [
        {
          type: 'text',
          text: `## Informações do Banco de Dados\n\n${result}`
        }
      ]
    };
  }

  async handleGetTableInfo(args) {
    const result = await this.mysqlMonitor.getTableInfo(args);
    return {
      content: [
        {
          type: 'text',
          text: `## Informações da Tabela ${args.tableName}\n\n${result}`
        }
      ]
    };
  }

  async handleListConnections() {
    try {
      const connections = await this.mysqlMonitor.getAvailableConnections();
      
      let result = '## Conexões MySQL Configuradas\n\n';
      
      if (connections.length === 0) {
        result += '❌ Nenhuma conexão configurada.';
      } else {
        connections.forEach((conn, index) => {
          result += `${index + 1}. **${conn.name}**\n`;
          result += `   - Descrição: ${conn.description}\n`;
          result += `   - Ambiente: ${conn.environment}\n\n`;
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: result
          }
        ]
      };
    } catch (error) {
      throw new Error(`Erro ao listar conexões: ${error.message}`);
    }
  }

  async handleTestConnection(args) {
    try {
      const { connectionName = null } = args;
      const result = await this.mysqlMonitor.testConnection(connectionName);
      
      let message = '## Teste de Conexão\n\n';
      
      if (result.success) {
        message += `✅ **${result.message}**\n\n`;
        if (result.connection) {
          message += '**Detalhes da Conexão:**\n';
          message += `- Host: ${result.connection.host}:${result.connection.port}\n`;
          message += `- Usuário: ${result.connection.user}\n`;
          message += `- Database: ${result.connection.database}\n`;
        }
      } else {
        message += `❌ **${result.message}**\n\n`;
        if (result.error) {
          message += `**Erro:** ${result.error}\n`;
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: message
          }
        ]
      };
    } catch (error) {
      throw new Error(`Erro ao testar conexão: ${error.message}`);
    }
  }

  async handleTestAllConnections() {
    try {
      const results = await this.mysqlMonitor.testAllConnections();
      
      let message = '## Teste de Todas as Conexões\n\n';
      
      for (const [connName, result] of Object.entries(results)) {
        message += `### ${connName}\n`;
        
        if (result.success) {
          message += `✅ **${result.message}**\n\n`;
        } else {
          message += `❌ **${result.message}**\n`;
          if (result.error) {
            message += `**Erro:** ${result.error}\n`;
          }
          message += '\n';
        }
      }

      return {
        content: [
          {
            type: 'text',
            text: message
          }
        ]
      };
    } catch (error) {
      throw new Error(`Erro ao testar todas as conexões: ${error.message}`);
    }
  }

  async handleGetConnectionsStatus() {
    try {
      const status = await this.mysqlMonitor.getConnectionsStatus();
      
      let message = '## Status das Conexões Ativas\n\n';
      
      for (const [connName, connStatus] of Object.entries(status)) {
        message += `### ${connName}\n`;
        
        if (connStatus.active) {
          message += '✅ **Ativa**\n';
          if (connStatus.info) {
            message += `- Database: ${connStatus.info.database || 'N/A'}\n`;
            message += `- Host: ${connStatus.info.host || 'N/A'}\n`;
            message += `- Usuário: ${connStatus.info.user || 'N/A'}\n`;
            message += `- Hora Atual: ${new Date().toISOString()}\n`;
          }
        } else {
          message += '❌ **Inativa**\n';
          if (connStatus.error) {
            message += `**Erro:** ${connStatus.error}\n`;
          }
        }
        message += '\n';
      }

      return {
        content: [
          {
            type: 'text',
            text: message
          }
        ]
      };
    } catch (error) {
      throw new Error(`Erro ao obter status das conexões: ${error.message}`);
    }
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    this.logger.info('Servidor MCP MySQL iniciado com sucesso!');
  }
}

// Iniciar o servidor
const server = new MySQLMCPServer();
server.start().catch((error) => {
  const logger = new Logger();
  logger.error('Erro ao iniciar servidor MCP:', error);
  process.exit(1);
});

