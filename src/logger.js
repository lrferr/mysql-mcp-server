import winston from 'winston';
import path from 'path';
import fs from 'fs';

export class Logger {
  constructor() {
    // Criar diretório de logs se não existir
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Configuração do logger
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'mysql-mcp' },
      transports: [
        // Arquivo para todos os logs
        new winston.transports.File({
          filename: path.join(logsDir, 'mysql-mcp.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        
        // Arquivo específico para erros
        new winston.transports.File({
          filename: path.join(logsDir, 'error.log'),
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        
        // Arquivo para exceções não capturadas
        new winston.transports.File({
          filename: path.join(logsDir, 'exceptions.log'),
          handleExceptions: true,
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        
        // Arquivo para rejeições de promises
        new winston.transports.File({
          filename: path.join(logsDir, 'rejections.log'),
          handleRejections: true,
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      ]
    });

    // Se não estiver em produção, também logar no console
    if (process.env.NODE_ENV !== 'production' && !process.env.MCP_SERVER_NAME) {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        )
      }));
    }

    // Capturar exceções e rejeições não tratadas (apenas uma vez)
    // Removido para evitar listeners duplicados em múltiplas instâncias
  }

  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  error(message, meta = {}) {
    this.logger.error(message, meta);
  }

  // Método específico para logs de operações de banco
  logDatabaseOperation(operation, query, result, connectionName = null) {
    this.info('Database Operation', {
      operation,
      query: query.substring(0, 200) + (query.length > 200 ? '...' : ''), // Truncar query longa
      result: typeof result === 'object' ? 'success' : result,
      connection: connectionName,
      timestamp: new Date().toISOString()
    });
  }

  // Método específico para logs de segurança
  logSecurityEvent(event, details, severity = 'info') {
    const logMethod = severity === 'error' ? 'error' : 'warn';
    this[logMethod]('Security Event', {
      event,
      details,
      severity,
      timestamp: new Date().toISOString()
    });
  }

  // Método específico para logs de performance
  logPerformance(operation, duration, details = {}) {
    this.info('Performance Log', {
      operation,
      duration: `${duration}ms`,
      details,
      timestamp: new Date().toISOString()
    });
  }
}
