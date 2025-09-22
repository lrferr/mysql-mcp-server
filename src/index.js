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
import { DDMOperations } from './ddm-operations.js';
import { DCMOperations } from './dcm-operations.js';
import { DLMOperations } from './dlm-operations.js';
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
    this.ddmOperations = new DDMOperations(this.connectionManager);
    this.dcmOperations = new DCMOperations(this.connectionManager);
    this.dlmOperations = new DLMOperations(this.connectionManager);
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
          },
          // ===== DDM (Data Definition Management) =====
          {
            name: 'create_schema',
            description: 'Cria um novo schema no banco de dados',
            inputSchema: {
              type: 'object',
              properties: {
                schemaName: {
                  type: 'string',
                  description: 'Nome do schema a ser criado'
                },
                charset: {
                  type: 'string',
                  description: 'Charset do schema',
                  default: 'utf8mb4'
                },
                collate: {
                  type: 'string',
                  description: 'Collation do schema',
                  default: 'utf8mb4_unicode_ci'
                },
                ifNotExists: {
                  type: 'boolean',
                  description: 'Criar apenas se não existir',
                  default: true
                },
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão para usar',
                  default: null
                }
              },
              required: ['schemaName']
            }
          },
          {
            name: 'drop_schema',
            description: 'Remove um schema do banco de dados',
            inputSchema: {
              type: 'object',
              properties: {
                schemaName: {
                  type: 'string',
                  description: 'Nome do schema a ser removido'
                },
                ifExists: {
                  type: 'boolean',
                  description: 'Remover apenas se existir',
                  default: true
                },
                cascade: {
                  type: 'boolean',
                  description: 'Remover em cascata',
                  default: false
                },
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão para usar',
                  default: null
                }
              },
              required: ['schemaName']
            }
          },
          {
            name: 'list_schemas',
            description: 'Lista todos os schemas disponíveis',
            inputSchema: {
              type: 'object',
              properties: {
                includeSystem: {
                  type: 'boolean',
                  description: 'Incluir schemas do sistema',
                  default: false
                },
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão para usar',
                  default: null
                }
              },
              required: []
            }
          },
          {
            name: 'list_tables',
            description: 'Lista todas as tabelas e views',
            inputSchema: {
              type: 'object',
              properties: {
                schemaName: {
                  type: 'string',
                  description: 'Nome do schema para filtrar',
                  default: null
                },
                includeViews: {
                  type: 'boolean',
                  description: 'Incluir views na listagem',
                  default: true
                },
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão para usar',
                  default: null
                }
              },
              required: []
            }
          },
          {
            name: 'get_table_structure',
            description: 'Obtém a estrutura completa de uma tabela',
            inputSchema: {
              type: 'object',
              properties: {
                tableName: {
                  type: 'string',
                  description: 'Nome da tabela'
                },
                schemaName: {
                  type: 'string',
                  description: 'Nome do schema'
                },
                includeIndexes: {
                  type: 'boolean',
                  description: 'Incluir informações de índices',
                  default: true
                },
                includeConstraints: {
                  type: 'boolean',
                  description: 'Incluir informações de constraints',
                  default: true
                },
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão para usar',
                  default: null
                }
              },
              required: ['tableName', 'schemaName']
            }
          },
          {
            name: 'analyze_indexes',
            description: 'Analisa todos os índices do banco de dados',
            inputSchema: {
              type: 'object',
              properties: {
                schemaName: {
                  type: 'string',
                  description: 'Nome do schema para filtrar',
                  default: null
                },
                tableName: {
                  type: 'string',
                  description: 'Nome da tabela para filtrar',
                  default: null
                },
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão para usar',
                  default: null
                }
              },
              required: []
            }
          },
          {
            name: 'list_views',
            description: 'Lista todas as views disponíveis',
            inputSchema: {
              type: 'object',
              properties: {
                schemaName: {
                  type: 'string',
                  description: 'Nome do schema para filtrar',
                  default: null
                },
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão para usar',
                  default: null
                }
              },
              required: []
            }
          },
          {
            name: 'list_routines',
            description: 'Lista procedures e functions',
            inputSchema: {
              type: 'object',
              properties: {
                schemaName: {
                  type: 'string',
                  description: 'Nome do schema para filtrar',
                  default: null
                },
                routineType: {
                  type: 'string',
                  description: 'Tipo de rotina (PROCEDURE ou FUNCTION)',
                  default: null
                },
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão para usar',
                  default: null
                }
              },
              required: []
            }
          },
          // ===== DCM (Data Control Management) =====
          {
            name: 'create_user',
            description: 'Cria um novo usuário no banco de dados',
            inputSchema: {
              type: 'object',
              properties: {
                username: {
                  type: 'string',
                  description: 'Nome do usuário'
                },
                password: {
                  type: 'string',
                  description: 'Senha do usuário'
                },
                host: {
                  type: 'string',
                  description: 'Host do usuário',
                  default: '%'
                },
                ifNotExists: {
                  type: 'boolean',
                  description: 'Criar apenas se não existir',
                  default: true
                },
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão para usar',
                  default: null
                }
              },
              required: ['username', 'password']
            }
          },
          {
            name: 'drop_user',
            description: 'Remove um usuário do banco de dados',
            inputSchema: {
              type: 'object',
              properties: {
                username: {
                  type: 'string',
                  description: 'Nome do usuário'
                },
                host: {
                  type: 'string',
                  description: 'Host do usuário',
                  default: '%'
                },
                ifExists: {
                  type: 'boolean',
                  description: 'Remover apenas se existir',
                  default: true
                },
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão para usar',
                  default: null
                }
              },
              required: ['username']
            }
          },
          {
            name: 'list_users',
            description: 'Lista todos os usuários do sistema',
            inputSchema: {
              type: 'object',
              properties: {
                includeSystem: {
                  type: 'boolean',
                  description: 'Incluir usuários do sistema',
                  default: false
                },
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão para usar',
                  default: null
                }
              },
              required: []
            }
          },
          {
            name: 'change_password',
            description: 'Altera a senha de um usuário',
            inputSchema: {
              type: 'object',
              properties: {
                username: {
                  type: 'string',
                  description: 'Nome do usuário'
                },
                newPassword: {
                  type: 'string',
                  description: 'Nova senha'
                },
                host: {
                  type: 'string',
                  description: 'Host do usuário',
                  default: '%'
                },
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão para usar',
                  default: null
                }
              },
              required: ['username', 'newPassword']
            }
          },
          {
            name: 'grant_privileges',
            description: 'Concede privilégios a um usuário',
            inputSchema: {
              type: 'object',
              properties: {
                privileges: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Lista de privilégios a conceder'
                },
                database: {
                  type: 'string',
                  description: 'Database para conceder privilégios',
                  default: '*'
                },
                table: {
                  type: 'string',
                  description: 'Tabela para conceder privilégios',
                  default: '*'
                },
                username: {
                  type: 'string',
                  description: 'Nome do usuário'
                },
                host: {
                  type: 'string',
                  description: 'Host do usuário',
                  default: '%'
                },
                withGrantOption: {
                  type: 'boolean',
                  description: 'Permitir que o usuário conceda privilégios',
                  default: false
                },
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão para usar',
                  default: null
                }
              },
              required: ['privileges', 'username']
            }
          },
          {
            name: 'revoke_privileges',
            description: 'Revoga privilégios de um usuário',
            inputSchema: {
              type: 'object',
              properties: {
                privileges: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Lista de privilégios a revogar'
                },
                database: {
                  type: 'string',
                  description: 'Database para revogar privilégios',
                  default: '*'
                },
                table: {
                  type: 'string',
                  description: 'Tabela para revogar privilégios',
                  default: '*'
                },
                username: {
                  type: 'string',
                  description: 'Nome do usuário'
                },
                host: {
                  type: 'string',
                  description: 'Host do usuário',
                  default: '%'
                },
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão para usar',
                  default: null
                }
              },
              required: ['privileges', 'username']
            }
          },
          {
            name: 'show_grants',
            description: 'Mostra os privilégios de um usuário',
            inputSchema: {
              type: 'object',
              properties: {
                username: {
                  type: 'string',
                  description: 'Nome do usuário'
                },
                host: {
                  type: 'string',
                  description: 'Host do usuário',
                  default: '%'
                },
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão para usar',
                  default: null
                }
              },
              required: ['username']
            }
          },
          {
            name: 'list_privileges',
            description: 'Lista todos os privilégios do sistema',
            inputSchema: {
              type: 'object',
              properties: {
                database: {
                  type: 'string',
                  description: 'Database para filtrar',
                  default: null
                },
                table: {
                  type: 'string',
                  description: 'Tabela para filtrar',
                  default: null
                },
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão para usar',
                  default: null
                }
              },
              required: []
            }
          },
          {
            name: 'audit_user_access',
            description: 'Audita o acesso de usuários ao banco',
            inputSchema: {
              type: 'object',
              properties: {
                username: {
                  type: 'string',
                  description: 'Nome do usuário para auditar',
                  default: null
                },
                host: {
                  type: 'string',
                  description: 'Host do usuário para auditar',
                  default: null
                },
                timeRange: {
                  type: 'string',
                  description: 'Período de tempo para auditar',
                  default: '7d'
                },
                includeFailedAttempts: {
                  type: 'boolean',
                  description: 'Incluir tentativas falhadas',
                  default: true
                },
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão para usar',
                  default: null
                }
              },
              required: []
            }
          },
          {
            name: 'check_password_policy',
            description: 'Verifica a política de senhas do sistema',
            inputSchema: {
              type: 'object',
              properties: {
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão para usar',
                  default: null
                }
              },
              required: []
            }
          },
          // ===== DLM (Data Lifecycle Management) =====
          {
            name: 'create_backup',
            description: 'Cria um backup do banco de dados',
            inputSchema: {
              type: 'object',
              properties: {
                database: {
                  type: 'string',
                  description: 'Nome do database para backup'
                },
                backupPath: {
                  type: 'string',
                  description: 'Caminho para salvar o backup',
                  default: './backups/'
                },
                includeData: {
                  type: 'boolean',
                  description: 'Incluir dados no backup',
                  default: true
                },
                includeStructure: {
                  type: 'boolean',
                  description: 'Incluir estrutura no backup',
                  default: true
                },
                compress: {
                  type: 'boolean',
                  description: 'Comprimir o backup',
                  default: true
                },
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão para usar',
                  default: null
                }
              },
              required: ['database']
            }
          },
          {
            name: 'restore_backup',
            description: 'Restaura um backup do banco de dados',
            inputSchema: {
              type: 'object',
              properties: {
                database: {
                  type: 'string',
                  description: 'Nome do database para restaurar'
                },
                backupFile: {
                  type: 'string',
                  description: 'Caminho do arquivo de backup'
                },
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão para usar',
                  default: null
                }
              },
              required: ['database', 'backupFile']
            }
          },
          {
            name: 'list_backups',
            description: 'Lista todos os backups disponíveis',
            inputSchema: {
              type: 'object',
              properties: {
                backupPath: {
                  type: 'string',
                  description: 'Caminho dos backups',
                  default: './backups/'
                },
                database: {
                  type: 'string',
                  description: 'Database para filtrar',
                  default: null
                },
                days: {
                  type: 'number',
                  description: 'Número de dias para filtrar',
                  default: 30
                }
              },
              required: []
            }
          },
          {
            name: 'archive_old_data',
            description: 'Arquiva dados antigos para schema de arquivo',
            inputSchema: {
              type: 'object',
              properties: {
                tableName: {
                  type: 'string',
                  description: 'Nome da tabela'
                },
                schemaName: {
                  type: 'string',
                  description: 'Nome do schema'
                },
                archiveTableName: {
                  type: 'string',
                  description: 'Nome da tabela de arquivo',
                  default: null
                },
                archiveSchemaName: {
                  type: 'string',
                  description: 'Nome do schema de arquivo',
                  default: 'archive'
                },
                condition: {
                  type: 'string',
                  description: 'Condição SQL para arquivar'
                },
                batchSize: {
                  type: 'number',
                  description: 'Tamanho do lote para processar',
                  default: 1000
                },
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão para usar',
                  default: null
                }
              },
              required: ['tableName', 'schemaName', 'condition']
            }
          },
          {
            name: 'apply_retention_policy',
            description: 'Aplica políticas de retenção de dados',
            inputSchema: {
              type: 'object',
              properties: {
                policies: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      tableName: { type: 'string' },
                      schemaName: { type: 'string' },
                      columnName: { type: 'string' },
                      retentionDays: { type: 'number' },
                      action: { type: 'string', enum: ['DELETE', 'ARCHIVE'] }
                    }
                  },
                  description: 'Lista de políticas de retenção'
                },
                dryRun: {
                  type: 'boolean',
                  description: 'Executar em modo de teste',
                  default: false
                },
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão para usar',
                  default: null
                }
              },
              required: ['policies']
            }
          },
          {
            name: 'compress_table',
            description: 'Comprime uma tabela para economizar espaço',
            inputSchema: {
              type: 'object',
              properties: {
                tableName: {
                  type: 'string',
                  description: 'Nome da tabela'
                },
                schemaName: {
                  type: 'string',
                  description: 'Nome do schema'
                },
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão para usar',
                  default: null
                }
              },
              required: ['tableName', 'schemaName']
            }
          },
          {
            name: 'create_partition',
            description: 'Cria partições em uma tabela',
            inputSchema: {
              type: 'object',
              properties: {
                tableName: {
                  type: 'string',
                  description: 'Nome da tabela'
                },
                schemaName: {
                  type: 'string',
                  description: 'Nome do schema'
                },
                partitionType: {
                  type: 'string',
                  description: 'Tipo de partição',
                  default: 'RANGE'
                },
                partitionColumn: {
                  type: 'string',
                  description: 'Coluna para particionar'
                },
                partitions: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      value: { type: 'string' }
                    }
                  },
                  description: 'Lista de partições'
                },
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão para usar',
                  default: null
                }
              },
              required: ['tableName', 'schemaName', 'partitionColumn', 'partitions']
            }
          },
          {
            name: 'drop_partition',
            description: 'Remove uma partição de uma tabela',
            inputSchema: {
              type: 'object',
              properties: {
                tableName: {
                  type: 'string',
                  description: 'Nome da tabela'
                },
                schemaName: {
                  type: 'string',
                  description: 'Nome do schema'
                },
                partitionName: {
                  type: 'string',
                  description: 'Nome da partição'
                },
                connectionName: {
                  type: 'string',
                  description: 'Nome da conexão para usar',
                  default: null
                }
              },
              required: ['tableName', 'schemaName', 'partitionName']
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

        // ===== DDM (Data Definition Management) =====
        if (name === 'create_schema') {
          const result = await this.ddmOperations.createSchema(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }
        if (name === 'drop_schema') {
          const result = await this.ddmOperations.dropSchema(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }
        if (name === 'list_schemas') {
          const result = await this.ddmOperations.listSchemas(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }
        if (name === 'list_tables') {
          const result = await this.ddmOperations.listTables(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }
        if (name === 'get_table_structure') {
          const result = await this.ddmOperations.getTableStructure(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }
        if (name === 'analyze_indexes') {
          const result = await this.ddmOperations.analyzeIndexes(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }
        if (name === 'list_views') {
          const result = await this.ddmOperations.listViews(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }
        if (name === 'list_routines') {
          const result = await this.ddmOperations.listRoutines(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }

        // ===== DCM (Data Control Management) =====
        if (name === 'create_user') {
          const result = await this.dcmOperations.createUser(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }
        if (name === 'drop_user') {
          const result = await this.dcmOperations.dropUser(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }
        if (name === 'list_users') {
          const result = await this.dcmOperations.listUsers(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }
        if (name === 'change_password') {
          const result = await this.dcmOperations.changePassword(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }
        if (name === 'grant_privileges') {
          const result = await this.dcmOperations.grantPrivileges(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }
        if (name === 'revoke_privileges') {
          const result = await this.dcmOperations.revokePrivileges(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }
        if (name === 'show_grants') {
          const result = await this.dcmOperations.showGrants(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }
        if (name === 'list_privileges') {
          const result = await this.dcmOperations.listPrivileges(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }
        if (name === 'audit_user_access') {
          const result = await this.dcmOperations.auditUserAccess(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }
        if (name === 'check_password_policy') {
          const result = await this.dcmOperations.checkPasswordPolicy(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }

        // ===== DLM (Data Lifecycle Management) =====
        if (name === 'create_backup') {
          const result = await this.dlmOperations.createBackup(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }
        if (name === 'restore_backup') {
          const result = await this.dlmOperations.restoreBackup(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }
        if (name === 'list_backups') {
          const result = await this.dlmOperations.listBackups(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }
        if (name === 'archive_old_data') {
          const result = await this.dlmOperations.archiveOldData(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }
        if (name === 'apply_retention_policy') {
          const result = await this.dlmOperations.applyRetentionPolicy(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }
        if (name === 'compress_table') {
          const result = await this.dlmOperations.compressTable(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }
        if (name === 'create_partition') {
          const result = await this.dlmOperations.createPartition(args);
          return {
            content: [
              {
                type: 'text',
                text: result
              }
            ]
          };
        }
        if (name === 'drop_partition') {
          const result = await this.dlmOperations.dropPartition(args);
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
