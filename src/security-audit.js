import { Logger } from './logger.js';
import fs from 'fs';
import path from 'path';

export class SecurityAudit {
  constructor() {
    this.logger = new Logger();
    this.auditLogPath = path.join(process.cwd(), 'logs', 'security-audit.log');
    this.initializeAuditLog();
  }

  initializeAuditLog() {
    try {
      // Criar arquivo de auditoria se não existir
      if (!fs.existsSync(this.auditLogPath)) {
        fs.writeFileSync(this.auditLogPath, '');
      }
    } catch (error) {
      this.logger.error('Erro ao inicializar log de auditoria:', error);
    }
  }

  // ===== LOG DE OPERAÇÕES =====

  async logOperation(operationData) {
    const {
      user,
      operation,
      resource,
      query,
      result,
      timestamp = new Date().toISOString(),
      connectionName = null,
      ipAddress = null
    } = operationData;

    const logEntry = {
      timestamp,
      user: user || 'unknown',
      operation,
      resource,
      query: query ? query.substring(0, 500) : null, // Truncar query longa
      success: result.success,
      message: result.message,
      connection: connectionName,
      ipAddress
    };

    try {
      // Log no arquivo de auditoria
      const logLine = JSON.stringify(logEntry) + '\n';
      fs.appendFileSync(this.auditLogPath, logLine);

      // Log no logger principal
      if (result.success) {
        this.logger.info('Operação de auditoria', logEntry);
      } else {
        this.logger.error('Operação de auditoria falhou', logEntry);
      }

      // Log específico de segurança
      this.logger.logSecurityEvent(
        `OPERATION_${operation}`,
        {
          user,
          resource,
          success: result.success
        },
        result.success ? 'info' : 'error'
      );

    } catch (error) {
      this.logger.error('Erro ao registrar operação de auditoria:', error);
    }
  }

  // ===== VALIDAÇÕES DE SEGURANÇA =====

  validateTableName(tableName) {
    if (!tableName || typeof tableName !== 'string') {
      throw new Error('Nome da tabela deve ser uma string válida');
    }
    
    // Verificar padrões suspeitos
    const suspiciousPatterns = [
      /\.\./, // Path traversal
      /\/\*.*\*\//, // SQL comments
      /--/, // SQL comments
      /union.*select/i, // SQL injection
      /drop.*table/i, // SQL injection
      /delete.*from/i, // SQL injection
      /insert.*into/i, // SQL injection
      /update.*set/i // SQL injection
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(tableName)) {
        throw new Error(`Nome de tabela suspeito detectado: ${tableName}`);
      }
    }
    
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(tableName)) {
      throw new Error('Nome da tabela deve conter apenas letras, números e underscore, começando com letra');
    }
    
    if (tableName.length > 64) {
      throw new Error('Nome da tabela não pode exceder 64 caracteres');
    }
  }

  validateUsername(username) {
    if (!username || typeof username !== 'string') {
      throw new Error('Nome de usuário deve ser uma string válida');
    }
    
    // Verificar padrões suspeitos
    const suspiciousPatterns = [
      /\.\./, // Path traversal
      /\/\*.*\*\//, // SQL comments
      /--/, // SQL comments
      /union.*select/i, // SQL injection
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(username)) {
        throw new Error(`Nome de usuário suspeito detectado: ${username}`);
      }
    }
    
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(username)) {
      throw new Error('Nome de usuário deve conter apenas letras, números e underscore, começando com letra');
    }
    
    if (username.length > 16) {
      throw new Error('Nome de usuário não pode exceder 16 caracteres');
    }
  }

  validatePassword(password) {
    if (!password || typeof password !== 'string') {
      throw new Error('Senha deve ser uma string válida');
    }
    
    // Verificar força da senha
    if (password.length < 8) {
      throw new Error('Senha deve ter pelo menos 8 caracteres');
    }
    
    if (password.length > 128) {
      throw new Error('Senha não pode exceder 128 caracteres');
    }
    
    // Verificar se contém pelo menos um número
    if (!/\d/.test(password)) {
      throw new Error('Senha deve conter pelo menos um número');
    }
    
    // Verificar se contém pelo menos uma letra maiúscula
    if (!/[A-Z]/.test(password)) {
      throw new Error('Senha deve conter pelo menos uma letra maiúscula');
    }
    
    // Verificar se contém pelo menos uma letra minúscula
    if (!/[a-z]/.test(password)) {
      throw new Error('Senha deve conter pelo menos uma letra minúscula');
    }
  }

  validateWhereClause(whereClause) {
    if (!whereClause || typeof whereClause !== 'string') {
      throw new Error('Cláusula WHERE deve ser uma string válida');
    }
    
    // Verificar palavras perigosas
    const dangerousKeywords = [
      'DROP', 'DELETE', 'ALTER', 'CREATE', 'TRUNCATE', 'EXECUTE', 'CALL',
      'GRANT', 'REVOKE', 'INSERT', 'UPDATE', 'REPLACE'
    ];
    
    const upperWhere = whereClause.toUpperCase();
    
    for (const keyword of dangerousKeywords) {
      if (upperWhere.includes(keyword)) {
        throw new Error(`Palavra-chave perigosa detectada na cláusula WHERE: ${keyword}`);
      }
    }
    
    // Verificar padrões de SQL injection
    const injectionPatterns = [
      /union.*select/i,
      /or.*1\s*=\s*1/i,
      /and.*1\s*=\s*1/i,
      /'.*or.*'.*=/i,
      /".*or.*".*=/i,
      /;.*drop/i,
      /;.*delete/i,
      /;.*insert/i,
      /;.*update/i
    ];
    
    for (const pattern of injectionPatterns) {
      if (pattern.test(whereClause)) {
        throw new Error('Possível tentativa de SQL injection detectada na cláusula WHERE');
      }
    }
  }

  validatePrivileges(privileges) {
    if (!privileges || !Array.isArray(privileges) || privileges.length === 0) {
      throw new Error('Lista de privilégios é obrigatória');
    }
    
    const validPrivileges = [
      'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'RELOAD',
      'SHUTDOWN', 'PROCESS', 'FILE', 'GRANT', 'REFERENCES', 'INDEX',
      'ALTER', 'SHOW DATABASES', 'SUPER', 'CREATE TEMPORARY TABLES',
      'LOCK TABLES', 'EXECUTE', 'REPLICATION SLAVE', 'REPLICATION CLIENT',
      'CREATE VIEW', 'SHOW VIEW', 'CREATE ROUTINE', 'ALTER ROUTINE',
      'CREATE USER', 'EVENT', 'TRIGGER', 'CREATE TABLESPACE'
    ];
    
    for (const privilege of privileges) {
      if (!validPrivileges.includes(privilege.toUpperCase())) {
        throw new Error(`Privilégio inválido: ${privilege}`);
      }
    }
  }

  // ===== DETECÇÃO DE ATIVIDADES SUSPEITAS =====

  async detectSuspiciousActivity() {
    const suspiciousActivities = [];

    try {
      // Verificar logs de auditoria para atividades suspeitas
      if (fs.existsSync(this.auditLogPath)) {
        const logContent = fs.readFileSync(this.auditLogPath, 'utf8');
        const logLines = logContent.split('\n').filter(line => line.trim());

        // Analisar últimas 100 operações
        const recentOperations = logLines.slice(-100);

        for (const line of recentOperations) {
          try {
            const logEntry = JSON.parse(line);
            
            // Verificar múltiplas falhas do mesmo usuário
            if (!logEntry.success) {
              const userFailures = recentOperations
                .filter(l => {
                  const entry = JSON.parse(l);
                  return entry.user === logEntry.user && !entry.success;
                }).length;
              
              if (userFailures >= 5) {
                suspiciousActivities.push({
                  type: 'MULTIPLE_FAILURES',
                  message: `Usuário ${logEntry.user} teve ${userFailures} falhas recentes`,
                  severity: 'high',
                  timestamp: logEntry.timestamp
                });
              }
            }

            // Verificar operações em horários suspeitos
            const hour = new Date(logEntry.timestamp).getHours();
            if (hour < 6 || hour > 22) {
              suspiciousActivities.push({
                type: 'UNUSUAL_TIME',
                message: `Operação ${logEntry.operation} executada em horário suspeito (${hour}:00)`,
                severity: 'medium',
                timestamp: logEntry.timestamp,
                user: logEntry.user
              });
            }

            // Verificar queries muito longas
            if (logEntry.query && logEntry.query.length > 1000) {
              suspiciousActivities.push({
                type: 'LONG_QUERY',
                message: `Query muito longa detectada (${logEntry.query.length} caracteres)`,
                severity: 'medium',
                timestamp: logEntry.timestamp,
                user: logEntry.user
              });
            }

          } catch (parseError) {
            // Ignorar linhas malformadas
            continue;
          }
        }
      }

      // Verificar conexões simultâneas excessivas
      const connectionCount = await this.checkConcurrentConnections();
      if (connectionCount > 50) {
        suspiciousActivities.push({
          type: 'HIGH_CONNECTIONS',
          message: `Número alto de conexões simultâneas: ${connectionCount}`,
          severity: 'high',
          timestamp: new Date().toISOString()
        });
      }

    } catch (error) {
      this.logger.error('Erro ao detectar atividades suspeitas:', error);
      suspiciousActivities.push({
        type: 'DETECTION_ERROR',
        message: `Erro na detecção de atividades suspeitas: ${error.message}`,
        severity: 'low',
        timestamp: new Date().toISOString()
      });
    }

    return suspiciousActivities;
  }

  async checkConcurrentConnections() {
    // Esta função seria implementada com uma conexão real ao banco
    // Por enquanto, retorna um valor simulado
    return Math.floor(Math.random() * 100);
  }

  // ===== GERAÇÃO DE RELATÓRIOS DE AUDITORIA =====

  async generateAuditReport(options = {}) {
    const {
      startDate = new Date(Date.now() - 24 * 60 * 60 * 1000), // Últimas 24h
      endDate = new Date(),
      user,
      operation,
      success
    } = options;

    try {
      let report = '# Relatório de Auditoria\n\n';
      report += `**Período:** ${startDate.toISOString()} - ${endDate.toISOString()}\n`;
      report += `**Gerado em:** ${new Date().toISOString()}\n\n`;

      if (!fs.existsSync(this.auditLogPath)) {
        report += 'Nenhum log de auditoria encontrado.\n';
        return report;
      }

      const logContent = fs.readFileSync(this.auditLogPath, 'utf8');
      const logLines = logContent.split('\n').filter(line => line.trim());

      let filteredOperations = [];

      for (const line of logLines) {
        try {
          const logEntry = JSON.parse(line);
          const entryDate = new Date(logEntry.timestamp);

          // Filtrar por período
          if (entryDate < startDate || entryDate > endDate) {
            continue;
          }

          // Filtrar por usuário
          if (user && logEntry.user !== user) {
            continue;
          }

          // Filtrar por operação
          if (operation && logEntry.operation !== operation) {
            continue;
          }

          // Filtrar por sucesso/falha
          if (success !== undefined && logEntry.success !== success) {
            continue;
          }

          filteredOperations.push(logEntry);

        } catch (parseError) {
          // Ignorar linhas malformadas
          continue;
        }
      }

      // Estatísticas gerais
      const totalOperations = filteredOperations.length;
      const successfulOperations = filteredOperations.filter(op => op.success).length;
      const failedOperations = totalOperations - successfulOperations;

      report += '## Estatísticas Gerais\n\n';
      report += `- **Total de Operações:** ${totalOperations}\n`;
      report += `- **Operações Bem-sucedidas:** ${successfulOperations}\n`;
      report += `- **Operações Falharam:** ${failedOperations}\n`;
      report += `- **Taxa de Sucesso:** ${totalOperations > 0 ? ((successfulOperations / totalOperations) * 100).toFixed(2) : 0}%\n\n`;

      // Operações por usuário
      const userStats = {};
      for (const operation of filteredOperations) {
        if (!userStats[operation.user]) {
          userStats[operation.user] = { total: 0, successful: 0, failed: 0 };
        }
        userStats[operation.user].total++;
        if (operation.success) {
          userStats[operation.user].successful++;
        } else {
          userStats[operation.user].failed++;
        }
      }

      if (Object.keys(userStats).length > 0) {
        report += '## Operações por Usuário\n\n';
        report += '| Usuário | Total | Sucesso | Falhas | Taxa de Sucesso |\n';
        report += '|---------|-------|---------|--------|-----------------|\n';

        for (const [user, stats] of Object.entries(userStats)) {
          const successRate = ((stats.successful / stats.total) * 100).toFixed(2);
          report += `| ${user} | ${stats.total} | ${stats.successful} | ${stats.failed} | ${successRate}% |\n`;
        }
        report += '\n';
      }

      // Operações por tipo
      const operationStats = {};
      for (const operation of filteredOperations) {
        if (!operationStats[operation.operation]) {
          operationStats[operation.operation] = { total: 0, successful: 0, failed: 0 };
        }
        operationStats[operation.operation].total++;
        if (operation.success) {
          operationStats[operation.operation].successful++;
        } else {
          operationStats[operation.operation].failed++;
        }
      }

      if (Object.keys(operationStats).length > 0) {
        report += '## Operações por Tipo\n\n';
        report += '| Operação | Total | Sucesso | Falhas | Taxa de Sucesso |\n';
        report += '|----------|-------|---------|--------|-----------------|\n';

        for (const [operation, stats] of Object.entries(operationStats)) {
          const successRate = ((stats.successful / stats.total) * 100).toFixed(2);
          report += `| ${operation} | ${stats.total} | ${stats.successful} | ${stats.failed} | ${successRate}% |\n`;
        }
        report += '\n';
      }

      // Últimas operações falharam
      const recentFailures = filteredOperations
        .filter(op => !op.success)
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 10);

      if (recentFailures.length > 0) {
        report += '## Últimas Falhas\n\n';
        report += '| Timestamp | Usuário | Operação | Recurso | Mensagem |\n';
        report += '|-----------|---------|----------|---------|----------|\n';

        for (const failure of recentFailures) {
          const timestamp = new Date(failure.timestamp).toLocaleString();
          report += `| ${timestamp} | ${failure.user} | ${failure.operation} | ${failure.resource} | ${failure.message} |\n`;
        }
        report += '\n';
      }

      return report;

    } catch (error) {
      this.logger.error('Erro ao gerar relatório de auditoria:', error);
      throw new Error(`Erro ao gerar relatório: ${error.message}`);
    }
  }
}



