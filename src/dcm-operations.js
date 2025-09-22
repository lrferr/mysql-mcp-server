import { Logger } from './logger.js';
import mysql from 'mysql2/promise';
import { ConnectionManager } from './connection-manager.js';

export class DCMOperations {
  constructor(connectionManager = null) {
    this.logger = new Logger();
    this.connectionManager = connectionManager || new ConnectionManager();
  }

  async getConnection(connectionName = null) {
    try {
      if (this.connectionManager) {
        return await this.connectionManager.getConnection(connectionName);
      }
      throw new Error('Nenhuma configuração de conexão disponível');
    } catch (error) {
      this.logger.error('Erro ao conectar com MySQL:', error);
      throw new Error(`Falha na conexão: ${error.message}`);
    }
  }

  // ===== GESTÃO DE USUÁRIOS =====

  async createUser(options = {}) {
    const {
      username,
      password,
      host = '%',
      ifNotExists = true,
      connectionName = null
    } = options;

    if (!username || !password) {
      throw new Error('Nome de usuário e senha são obrigatórios');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      // Verificar se o usuário já existe
      if (ifNotExists) {
        const exists = await this.userExists(connection, username, host);
        if (exists) {
          return `⚠️ Usuário '${username}'@'${host}' já existe. Operação ignorada.`;
        }
      }

      const createQuery = `
        CREATE USER ${ifNotExists ? 'IF NOT EXISTS ' : ''}'${username}'@'${host}' 
        IDENTIFIED BY '${password}'
      `;

      await connection.execute(createQuery);

      this.logger.info(`Usuário '${username}'@'${host}' criado com sucesso`);
      return `✅ Usuário '${username}'@'${host}' criado com sucesso!`;

    } catch (error) {
      this.logger.error('Erro ao criar usuário:', error);
      throw new Error(`Erro ao criar usuário: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async dropUser(options = {}) {
    const {
      username,
      host = '%',
      ifExists = true,
      connectionName = null
    } = options;

    if (!username) {
      throw new Error('Nome de usuário é obrigatório');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      // Verificar se o usuário existe
      if (ifExists) {
        const exists = await this.userExists(connection, username, host);
        if (!exists) {
          return `⚠️ Usuário '${username}'@'${host}' não existe. Operação ignorada.`;
        }
      }

      const dropQuery = `DROP USER ${ifExists ? 'IF EXISTS ' : ''}'${username}'@'${host}'`;
      await connection.execute(dropQuery);

      this.logger.info(`Usuário '${username}'@'${host}' removido com sucesso`);
      return `✅ Usuário '${username}'@'${host}' removido com sucesso!`;

    } catch (error) {
      this.logger.error('Erro ao remover usuário:', error);
      throw new Error(`Erro ao remover usuário: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async listUsers(options = {}) {
    const {
      includeSystem = false,
      connectionName = null
    } = options;

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      let query = `
        SELECT 
          user,
          host,
          account_locked,
          password_expired,
          password_last_changed,
          password_lifetime,
          password_reuse_time,
          password_require_current,
          password_require_current_nist
        FROM mysql.user
      `;

      if (!includeSystem) {
        query += ' WHERE user NOT IN (\'mysql.session\', \'mysql.sys\', \'mysql.infoschema\', \'root\')';
      }

      query += ' ORDER BY user, host';

      const [rows] = await connection.execute(query);

      let output = '';
      
      if (rows.length === 0) {
        output = 'Nenhum usuário encontrado.';
      } else {
        output += '| Usuário | Host | Conta Bloqueada | Senha Expirada | Última Alteração | Vida da Senha |\n';
        output += '|---------|------|-----------------|----------------|------------------|---------------|\n';
        
        for (const row of rows) {
          const lastChanged = row.password_last_changed ? 
            new Date(row.password_last_changed).toLocaleString() : 'N/A';
          const lifetime = row.password_lifetime ? 
            `${row.password_lifetime} dias` : 'N/A';
          
          output += `| ${row.user} | ${row.host} | ${row.account_locked} | ${row.password_expired} | ${lastChanged} | ${lifetime} |\n`;
        }
        
        output += `\n**Total de usuários:** ${rows.length}`;
      }

      return output;

    } catch (error) {
      this.logger.error('Erro ao listar usuários:', error);
      throw new Error(`Erro ao listar usuários: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async changePassword(options = {}) {
    const {
      username,
      newPassword,
      host = '%',
      connectionName = null
    } = options;

    if (!username || !newPassword) {
      throw new Error('Nome de usuário e nova senha são obrigatórios');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      const alterQuery = `
        ALTER USER '${username}'@'${host}' 
        IDENTIFIED BY '${newPassword}'
      `;

      await connection.execute(alterQuery);

      this.logger.info(`Senha do usuário '${username}'@'${host}' alterada com sucesso`);
      return `✅ Senha do usuário '${username}'@'${host}' alterada com sucesso!`;

    } catch (error) {
      this.logger.error('Erro ao alterar senha:', error);
      throw new Error(`Erro ao alterar senha: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  // ===== GESTÃO DE PRIVILÉGIOS =====

  async grantPrivileges(options = {}) {
    const {
      privileges,
      database = '*',
      table = '*',
      username,
      host = '%',
      withGrantOption = false,
      connectionName = null
    } = options;

    if (!privileges || !Array.isArray(privileges) || privileges.length === 0) {
      throw new Error('Lista de privilégios é obrigatória');
    }

    if (!username) {
      throw new Error('Nome de usuário é obrigatório');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      const privilegesList = privileges.join(', ');
      const grantOption = withGrantOption ? ' WITH GRANT OPTION' : '';
      const onObject = `${database}.${table}`;

      const grantQuery = `
        GRANT ${privilegesList} 
        ON ${onObject} 
        TO '${username}'@'${host}'${grantOption}
      `;

      await connection.execute(grantQuery);

      this.logger.info(`Privilégios concedidos para '${username}'@'${host}' em ${onObject}`);
      return `✅ Privilégios ${privilegesList} concedidos para '${username}'@'${host}' em ${onObject}!`;

    } catch (error) {
      this.logger.error('Erro ao conceder privilégios:', error);
      throw new Error(`Erro ao conceder privilégios: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async revokePrivileges(options = {}) {
    const {
      privileges,
      database = '*',
      table = '*',
      username,
      host = '%',
      connectionName = null
    } = options;

    if (!privileges || !Array.isArray(privileges) || privileges.length === 0) {
      throw new Error('Lista de privilégios é obrigatória');
    }

    if (!username) {
      throw new Error('Nome de usuário é obrigatório');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      const privilegesList = privileges.join(', ');
      const onObject = `${database}.${table}`;

      const revokeQuery = `
        REVOKE ${privilegesList} 
        ON ${onObject} 
        FROM '${username}'@'${host}'
      `;

      await connection.execute(revokeQuery);

      this.logger.info(`Privilégios revogados de '${username}'@'${host}' em ${onObject}`);
      return `✅ Privilégios ${privilegesList} revogados de '${username}'@'${host}' em ${onObject}!`;

    } catch (error) {
      this.logger.error('Erro ao revogar privilégios:', error);
      throw new Error(`Erro ao revogar privilégios: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async showGrants(options = {}) {
    const {
      username,
      host = '%',
      connectionName = null
    } = options;

    if (!username) {
      throw new Error('Nome de usuário é obrigatório');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      const showQuery = `SHOW GRANTS FOR '${username}'@'${host}'`;
      const [rows] = await connection.execute(showQuery);

      let output = '';
      
      if (rows.length === 0) {
        output = `Nenhum privilégio encontrado para '${username}'@'${host}'.`;
      } else {
        output += `## Privilégios de '${username}'@'${host}'\n\n`;
        
        for (const row of rows) {
          const grant = Object.values(row)[0];
          output += `- ${grant}\n`;
        }
      }

      return output;

    } catch (error) {
      this.logger.error('Erro ao mostrar privilégios:', error);
      throw new Error(`Erro ao mostrar privilégios: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async listPrivileges(options = {}) {
    const {
      database = null,
      table = null,
      connectionName = null
    } = options;

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      let query = `
        SELECT 
          grantee,
          table_schema,
          table_name,
          privilege_type,
          is_grantable
        FROM information_schema.table_privileges
        WHERE 1=1
      `;

      const params = [];
      if (database) {
        query += ' AND table_schema = ?';
        params.push(database);
      }
      if (table) {
        query += ' AND table_name = ?';
        params.push(table);
      }

      query += ' ORDER BY grantee, table_schema, table_name, privilege_type';

      const [rows] = await connection.execute(query, params);

      let output = '';
      
      if (rows.length === 0) {
        output = 'Nenhum privilégio encontrado.';
      } else {
        output += '| Usuário | Database | Tabela | Privilégio | Pode Conceder |\n';
        output += '|---------|----------|--------|------------|---------------|\n';
        
        for (const row of rows) {
          output += `| ${row.grantee} | ${row.table_schema} | ${row.table_name} | ${row.privilege_type} | ${row.is_grantable} |\n`;
        }
        
        output += `\n**Total de privilégios:** ${rows.length}`;
      }

      return output;

    } catch (error) {
      this.logger.error('Erro ao listar privilégios:', error);
      throw new Error(`Erro ao listar privilégios: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  // ===== AUDITORIA E SEGURANÇA =====

  async auditUserAccess(options = {}) {
    const {
      username = null,
      host = null,
      timeRange = '7d',
      includeFailedAttempts = true,
      connectionName = null
    } = options;

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      // Converter timeRange para dias
      let days = 7;
      if (timeRange.endsWith('d')) {
        days = parseInt(timeRange.replace('d', ''));
      } else if (timeRange.endsWith('h')) {
        days = Math.ceil(parseInt(timeRange.replace('h', '')) / 24);
      }

      let query = `
        SELECT 
          user,
          host,
          event_timestamp,
          event_name,
          status,
          error_code,
          error_message
        FROM performance_schema.events_statements_summary_by_user_by_event_name
        WHERE event_timestamp > DATE_SUB(NOW(), INTERVAL ? DAY)
      `;

      const params = [days];
      if (username) {
        query += ' AND user = ?';
        params.push(username);
      }
      if (host) {
        query += ' AND host = ?';
        params.push(host);
      }

      query += ' ORDER BY event_timestamp DESC LIMIT 100';

      const [rows] = await connection.execute(query, params);

      let output = '';
      
      if (rows.length === 0) {
        output = 'Nenhuma atividade encontrada no período especificado.';
      } else {
        output += `## Auditoria de Acesso - Últimos ${days} dias\n\n`;
        output += '| Usuário | Host | Timestamp | Evento | Status | Código Erro |\n';
        output += '|---------|------|-----------|--------|--------|-------------|\n';
        
        for (const row of rows) {
          const timestamp = new Date(row.event_timestamp).toLocaleString();
          const status = row.status || 'N/A';
          const errorCode = row.error_code || 'N/A';
          
          output += `| ${row.user} | ${row.host} | ${timestamp} | ${row.event_name} | ${status} | ${errorCode} |\n`;
        }
        
        output += `\n**Total de eventos:** ${rows.length}`;
      }

      return output;

    } catch (error) {
      this.logger.error('Erro ao auditar acesso de usuários:', error);
      throw new Error(`Erro ao auditar acesso de usuários: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async checkPasswordPolicy(options = {}) {
    const {
      connectionName = null
    } = options;

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      const queries = [
        'SHOW VARIABLES LIKE "validate_password%"',
        'SELECT @@validate_password.policy',
        'SELECT @@validate_password.length',
        'SELECT @@validate_password.mixed_case_count',
        'SELECT @@validate_password.number_count',
        'SELECT @@validate_password.special_char_count'
      ];

      let output = '## Política de Senhas do Sistema\n\n';

      for (const query of queries) {
        try {
          const [rows] = await connection.execute(query);
          
          if (rows.length > 0) {
            for (const row of rows) {
              const key = Object.keys(row)[0];
              const value = Object.values(row)[0];
              output += `- **${key}:** ${value}\n`;
            }
          }
        } catch (error) {
          // Ignorar erros de variáveis não disponíveis
          continue;
        }
      }

      // Verificar usuários com senhas fracas
      const weakPasswordsQuery = `
        SELECT 
          user,
          host,
          password_last_changed,
          password_lifetime
        FROM mysql.user
        WHERE password_lifetime IS NULL 
           OR password_lifetime = 0
           OR password_last_changed < DATE_SUB(NOW(), INTERVAL 90 DAY)
        ORDER BY password_last_changed
      `;

      try {
        const [weakRows] = await connection.execute(weakPasswordsQuery);
        
        if (weakRows.length > 0) {
          output += '\n## ⚠️ Usuários com Senhas Fracas\n\n';
          output += '| Usuário | Host | Última Alteração | Vida da Senha |\n';
          output += '|---------|------|------------------|---------------|\n';
          
          for (const row of weakRows) {
            const lastChanged = row.password_last_changed ? 
              new Date(row.password_last_changed).toLocaleString() : 'N/A';
            const lifetime = row.password_lifetime ? 
              `${row.password_lifetime} dias` : 'Nunca expira';
            
            output += `| ${row.user} | ${row.host} | ${lastChanged} | ${lifetime} |\n`;
          }
        }
      } catch (error) {
        output += `\n⚠️ Não foi possível verificar senhas fracas: ${error.message}`;
      }

      return output;

    } catch (error) {
      this.logger.error('Erro ao verificar política de senhas:', error);
      throw new Error(`Erro ao verificar política de senhas: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  // ===== MÉTODOS AUXILIARES =====

  async userExists(connection, username, host) {
    try {
      const query = `
        SELECT COUNT(*) 
        FROM mysql.user 
        WHERE user = ? AND host = ?
      `;
      const [rows] = await connection.execute(query, [username, host]);
      return rows[0]['COUNT(*)'] > 0;
    } catch (error) {
      return false;
    }
  }

  // ===== VALIDAÇÕES DE SEGURANÇA =====

  validateUsername(username) {
    if (!username || typeof username !== 'string') {
      throw new Error('Nome de usuário deve ser uma string válida');
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
    
    if (password.length < 8) {
      throw new Error('Senha deve ter pelo menos 8 caracteres');
    }
    
    if (password.length > 128) {
      throw new Error('Senha não pode exceder 128 caracteres');
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
      'CREATE USER', 'EVENT', 'TRIGGER', 'CREATE TABLESPACE',
      'ALL', 'ALL PRIVILEGES'
    ];
    
    for (const privilege of privileges) {
      if (!validPrivileges.includes(privilege.toUpperCase())) {
        throw new Error(`Privilégio inválido: ${privilege}`);
      }
    }
  }
}
