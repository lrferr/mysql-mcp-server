import { Logger } from './logger.js';
import fs from 'fs';
import path from 'path';

export class NotificationService {
  constructor() {
    this.logger = new Logger();
    this.notificationLogPath = path.join(process.cwd(), 'logs', 'notifications.log');
    this.initializeNotificationLog();
  }

  initializeNotificationLog() {
    try {
      // Criar arquivo de notificações se não existir
      if (!fs.existsSync(this.notificationLogPath)) {
        fs.writeFileSync(this.notificationLogPath, '');
      }
    } catch (error) {
      this.logger.error('Erro ao inicializar log de notificações:', error);
    }
  }

  // ===== NOTIFICAÇÕES DE SISTEMA =====

  async sendSystemNotification(type, message, severity = 'info', metadata = {}) {
    const notification = {
      timestamp: new Date().toISOString(),
      type,
      message,
      severity,
      metadata,
      id: this.generateNotificationId()
    };

    try {
      // Log da notificação
      this.logNotification(notification);

      // Log no logger principal
      switch (severity) {
      case 'error':
        this.logger.error(`[${type}] ${message}`, metadata);
        break;
      case 'warning':
        this.logger.warn(`[${type}] ${message}`, metadata);
        break;
      case 'success':
        this.logger.info(`[${type}] ${message}`, metadata);
        break;
      default:
        this.logger.info(`[${type}] ${message}`, metadata);
      }

      // Log específico de notificação
      this.logger.logSecurityEvent(
        `NOTIFICATION_${type.toUpperCase()}`,
        {
          message,
          severity,
          ...metadata
        },
        severity
      );

      return notification;

    } catch (error) {
      this.logger.error('Erro ao enviar notificação:', error);
      throw new Error(`Erro ao enviar notificação: ${error.message}`);
    }
  }

  // ===== NOTIFICAÇÕES DE MONITORAMENTO =====

  async notifyDatabaseHealthChange(healthData, previousHealth = null) {
    const notifications = [];

    try {
      // Verificar mudanças nas conexões
      if (previousHealth && healthData.connections) {
        const currentConnections = healthData.connections.total_connections || 0;
        const previousConnections = previousHealth.connections?.total_connections || 0;
        
        if (Math.abs(currentConnections - previousConnections) > 10) {
          notifications.push(
            await this.sendSystemNotification(
              'CONNECTION_CHANGE',
              `Mudança significativa no número de conexões: ${previousConnections} → ${currentConnections}`,
              currentConnections > previousConnections ? 'warning' : 'info',
              {
                previous: previousConnections,
                current: currentConnections,
                change: currentConnections - previousConnections
              }
            )
          );
        }
      }

      // Verificar uso de armazenamento
      if (healthData.storage) {
        for (const database of healthData.storage) {
          if (database.size_mb > 1000) { // > 1GB
            notifications.push(
              await this.sendSystemNotification(
                'LARGE_DATABASE',
                `Database ${database.table_schema} está muito grande: ${database.size_mb}MB`,
                'warning',
                {
                  database: database.table_schema,
                  size_mb: database.size_mb
                }
              )
            );
          }
        }
      }

      // Verificar performance
      if (healthData.performance) {
        // Aqui você pode adicionar lógica para detectar problemas de performance
        // Por exemplo, QPS muito baixo, uptime baixo, etc.
      }

      return notifications;

    } catch (error) {
      this.logger.error('Erro ao notificar mudanças de saúde do banco:', error);
      return [];
    }
  }

  async notifySchemaChange(schemaName, changeType, details) {
    try {
      const message = `Mudança detectada no schema ${schemaName}: ${changeType}`;
      
      return await this.sendSystemNotification(
        'SCHEMA_CHANGE',
        message,
        'info',
        {
          schema: schemaName,
          changeType,
          details,
          timestamp: new Date().toISOString()
        }
      );

    } catch (error) {
      this.logger.error('Erro ao notificar mudança de schema:', error);
      throw error;
    }
  }

  async notifySensitiveTableChange(tableName, changeType, details) {
    try {
      const message = `Mudança detectada em tabela sensível ${tableName}: ${changeType}`;
      
      return await this.sendSystemNotification(
        'SENSITIVE_TABLE_CHANGE',
        message,
        'warning',
        {
          table: tableName,
          changeType,
          details,
          timestamp: new Date().toISOString()
        }
      );

    } catch (error) {
      this.logger.error('Erro ao notificar mudança em tabela sensível:', error);
      throw error;
    }
  }

  async notifySecurityEvent(eventType, details) {
    try {
      const message = `Evento de segurança detectado: ${eventType}`;
      
      return await this.sendSystemNotification(
        'SECURITY_EVENT',
        message,
        'error',
        {
          eventType,
          details,
          timestamp: new Date().toISOString()
        }
      );

    } catch (error) {
      this.logger.error('Erro ao notificar evento de segurança:', error);
      throw error;
    }
  }

  // ===== NOTIFICAÇÕES DE OPERAÇÕES =====

  async notifyOperationSuccess(operation, resource, user, connectionName = null) {
    try {
      const message = `Operação ${operation} executada com sucesso em ${resource}`;
      
      return await this.sendSystemNotification(
        'OPERATION_SUCCESS',
        message,
        'success',
        {
          operation,
          resource,
          user,
          connectionName,
          timestamp: new Date().toISOString()
        }
      );

    } catch (error) {
      this.logger.error('Erro ao notificar sucesso da operação:', error);
      throw error;
    }
  }

  async notifyOperationFailure(operation, resource, user, error, connectionName = null) {
    try {
      const message = `Operação ${operation} falhou em ${resource}: ${error}`;
      
      return await this.sendSystemNotification(
        'OPERATION_FAILURE',
        message,
        'error',
        {
          operation,
          resource,
          user,
          error: error.toString(),
          connectionName,
          timestamp: new Date().toISOString()
        }
      );

    } catch (error) {
      this.logger.error('Erro ao notificar falha da operação:', error);
      throw error;
    }
  }

  // ===== NOTIFICAÇÕES DE CONEXÃO =====

  async notifyConnectionEstablished(connectionName, connectionInfo) {
    try {
      const message = `Conexão estabelecida: ${connectionName}`;
      
      return await this.sendSystemNotification(
        'CONNECTION_ESTABLISHED',
        message,
        'success',
        {
          connectionName,
          connectionInfo,
          timestamp: new Date().toISOString()
        }
      );

    } catch (error) {
      this.logger.error('Erro ao notificar conexão estabelecida:', error);
      throw error;
    }
  }

  async notifyConnectionFailed(connectionName, error) {
    try {
      const message = `Falha ao estabelecer conexão: ${connectionName}`;
      
      return await this.sendSystemNotification(
        'CONNECTION_FAILED',
        message,
        'error',
        {
          connectionName,
          error: error.toString(),
          timestamp: new Date().toISOString()
        }
      );

    } catch (error) {
      this.logger.error('Erro ao notificar falha de conexão:', error);
      throw error;
    }
  }

  async notifyConnectionClosed(connectionName) {
    try {
      const message = `Conexão fechada: ${connectionName}`;
      
      return await this.sendSystemNotification(
        'CONNECTION_CLOSED',
        message,
        'info',
        {
          connectionName,
          timestamp: new Date().toISOString()
        }
      );

    } catch (error) {
      this.logger.error('Erro ao notificar conexão fechada:', error);
      throw error;
    }
  }

  // ===== NOTIFICAÇÕES DE MIGRAÇÃO =====

  async notifyMigrationStart(migrationName, targetSchema) {
    try {
      const message = `Migração iniciada: ${migrationName}`;
      
      return await this.sendSystemNotification(
        'MIGRATION_START',
        message,
        'info',
        {
          migrationName,
          targetSchema,
          timestamp: new Date().toISOString()
        }
      );

    } catch (error) {
      this.logger.error('Erro ao notificar início de migração:', error);
      throw error;
    }
  }

  async notifyMigrationComplete(migrationName, targetSchema, duration) {
    try {
      const message = `Migração concluída: ${migrationName} (${duration}ms)`;
      
      return await this.sendSystemNotification(
        'MIGRATION_COMPLETE',
        message,
        'success',
        {
          migrationName,
          targetSchema,
          duration,
          timestamp: new Date().toISOString()
        }
      );

    } catch (error) {
      this.logger.error('Erro ao notificar conclusão de migração:', error);
      throw error;
    }
  }

  async notifyMigrationFailed(migrationName, targetSchema, error) {
    try {
      const message = `Migração falhou: ${migrationName}`;
      
      return await this.sendSystemNotification(
        'MIGRATION_FAILED',
        message,
        'error',
        {
          migrationName,
          targetSchema,
          error: error.toString(),
          timestamp: new Date().toISOString()
        }
      );

    } catch (error) {
      this.logger.error('Erro ao notificar falha de migração:', error);
      throw error;
    }
  }

  // ===== MÉTODOS AUXILIARES =====

  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  logNotification(notification) {
    try {
      const logLine = JSON.stringify(notification) + '\n';
      fs.appendFileSync(this.notificationLogPath, logLine);
    } catch (error) {
      this.logger.error('Erro ao registrar notificação:', error);
    }
  }

  // ===== CONSULTA DE NOTIFICAÇÕES =====

  async getNotifications(options = {}) {
    const {
      startDate = new Date(Date.now() - 24 * 60 * 60 * 1000), // Últimas 24h
      endDate = new Date(),
      type,
      severity,
      limit = 100
    } = options;

    try {
      if (!fs.existsSync(this.notificationLogPath)) {
        return [];
      }

      const logContent = fs.readFileSync(this.notificationLogPath, 'utf8');
      const logLines = logContent.split('\n').filter(line => line.trim());

      let notifications = [];

      for (const line of logLines) {
        try {
          const notification = JSON.parse(line);
          const notificationDate = new Date(notification.timestamp);

          // Filtrar por período
          if (notificationDate < startDate || notificationDate > endDate) {
            continue;
          }

          // Filtrar por tipo
          if (type && notification.type !== type) {
            continue;
          }

          // Filtrar por severidade
          if (severity && notification.severity !== severity) {
            continue;
          }

          notifications.push(notification);

        } catch (parseError) {
          // Ignorar linhas malformadas
          continue;
        }
      }

      // Ordenar por timestamp (mais recente primeiro)
      notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      // Limitar resultados
      return notifications.slice(0, limit);

    } catch (error) {
      this.logger.error('Erro ao obter notificações:', error);
      return [];
    }
  }

  async getNotificationSummary(options = {}) {
    const notifications = await this.getNotifications(options);

    const summary = {
      total: notifications.length,
      byType: {},
      bySeverity: {},
      recent: notifications.slice(0, 10)
    };

    // Agrupar por tipo
    for (const notification of notifications) {
      if (!summary.byType[notification.type]) {
        summary.byType[notification.type] = 0;
      }
      summary.byType[notification.type]++;
    }

    // Agrupar por severidade
    for (const notification of notifications) {
      if (!summary.bySeverity[notification.severity]) {
        summary.bySeverity[notification.severity] = 0;
      }
      summary.bySeverity[notification.severity]++;
    }

    return summary;
  }
}

