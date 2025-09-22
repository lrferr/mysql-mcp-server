import { Logger } from './logger.js';
import mysql from 'mysql2/promise';
import { ConnectionManager } from './connection-manager.js';

export class DCLOperations {
  constructor(connectionConfig = null, connectionManager = null) {
    this.logger = new Logger();
    this.connectionConfig = connectionConfig;
    this.connectionManager = connectionManager || new ConnectionManager();
  }

  async getConnection(connectionName = null) {
    try {
      // Se temos um ConnectionManager, usar ele
      if (this.connectionManager) {
        return await this.connectionManager.getConnection(connectionName);
      }
      
      // Fallback para configuração antiga
      if (this.connectionConfig) {
        const connection = await mysql.createConnection(this.connectionConfig);
        return connection;
      }
      
      throw new Error('Nenhuma configuração de conexão disponível');
    } catch (error) {
      this.logger.error('Erro ao conectar com MySQL:', error);
      throw new Error(`Falha na conexão: ${error.message}`);
    }
  }

  // ===== OPERAÇÕES DE USUÁRIO =====

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

  async alterUser(options = {}) {
    const {
      username,
      host = '%',
      password,
      connectionName = null
    } = options;

    if (!username || !password) {
      throw new Error('Nome de usuário e nova senha são obrigatórios');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      const alterQuery = `
        ALTER USER '${username}'@'${host}' 
        IDENTIFIED BY '${password}'
      `;

      await connection.execute(alterQuery);

      this.logger.info(`Senha do usuário '${username}'@'${host}' alterada com sucesso`);
      return `✅ Senha do usuário '${username}'@'${host}' alterada com sucesso!`;

    } catch (error) {
      this.logger.error('Erro ao alterar usuário:', error);
      throw new Error(`Erro ao alterar usuário: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  // ===== OPERAÇÕES DE PRIVILÉGIOS =====

  async grantPrivileges(options = {}) {
    const {
      privileges,
      onObject,
      toUser,
      toHost = '%',
      withGrantOption = false,
      connectionName = null
    } = options;

    if (!privileges || !Array.isArray(privileges) || privileges.length === 0) {
      throw new Error('Lista de privilégios é obrigatória');
    }

    if (!onObject || !toUser) {
      throw new Error('Objeto e usuário de destino são obrigatórios');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      const privilegesList = privileges.join(', ');
      const grantOption = withGrantOption ? ' WITH GRANT OPTION' : '';

      const grantQuery = `
        GRANT ${privilegesList} 
        ON ${onObject} 
        TO '${toUser}'@'${toHost}'${grantOption}
      `;

      await connection.execute(grantQuery);

      this.logger.info(`Privilégios concedidos para '${toUser}'@'${toHost}' em ${onObject}`);
      return `✅ Privilégios ${privilegesList} concedidos para '${toUser}'@'${toHost}' em ${onObject}!`;

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
      onObject,
      fromUser,
      fromHost = '%',
      connectionName = null
    } = options;

    if (!privileges || !Array.isArray(privileges) || privileges.length === 0) {
      throw new Error('Lista de privilégios é obrigatória');
    }

    if (!onObject || !fromUser) {
      throw new Error('Objeto e usuário de origem são obrigatórios');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      const privilegesList = privileges.join(', ');

      const revokeQuery = `
        REVOKE ${privilegesList} 
        ON ${onObject} 
        FROM '${fromUser}'@'${fromHost}'
      `;

      await connection.execute(revokeQuery);

      this.logger.info(`Privilégios revogados de '${fromUser}'@'${fromHost}' em ${onObject}`);
      return `✅ Privilégios ${privilegesList} revogados de '${fromUser}'@'${fromHost}' em ${onObject}!`;

    } catch (error) {
      this.logger.error('Erro ao revogar privilégios:', error);
      throw new Error(`Erro ao revogar privilégios: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  // ===== OPERAÇÕES DE ROLE (MySQL 8.0+) =====

  async createRole(options = {}) {
    const {
      roleName,
      ifNotExists = true,
      connectionName = null
    } = options;

    if (!roleName) {
      throw new Error('Nome do role é obrigatório');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      // Verificar se o role já existe
      if (ifNotExists) {
        const exists = await this.roleExists(connection, roleName);
        if (exists) {
          return `⚠️ Role '${roleName}' já existe. Operação ignorada.`;
        }
      }

      const createQuery = `CREATE ROLE ${ifNotExists ? 'IF NOT EXISTS ' : ''}'${roleName}'`;
      await connection.execute(createQuery);

      this.logger.info(`Role '${roleName}' criado com sucesso`);
      return `✅ Role '${roleName}' criado com sucesso!`;

    } catch (error) {
      this.logger.error('Erro ao criar role:', error);
      throw new Error(`Erro ao criar role: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async dropRole(options = {}) {
    const {
      roleName,
      ifExists = true,
      connectionName = null
    } = options;

    if (!roleName) {
      throw new Error('Nome do role é obrigatório');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      // Verificar se o role existe
      if (ifExists) {
        const exists = await this.roleExists(connection, roleName);
        if (!exists) {
          return `⚠️ Role '${roleName}' não existe. Operação ignorada.`;
        }
      }

      const dropQuery = `DROP ROLE ${ifExists ? 'IF EXISTS ' : ''}'${roleName}'`;
      await connection.execute(dropQuery);

      this.logger.info(`Role '${roleName}' removido com sucesso`);
      return `✅ Role '${roleName}' removido com sucesso!`;

    } catch (error) {
      this.logger.error('Erro ao remover role:', error);
      throw new Error(`Erro ao remover role: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async grantRole(options = {}) {
    const {
      roleName,
      toUser,
      toHost = '%',
      connectionName = null
    } = options;

    if (!roleName || !toUser) {
      throw new Error('Nome do role e usuário de destino são obrigatórios');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      const grantQuery = `GRANT '${roleName}' TO '${toUser}'@'${toHost}'`;
      await connection.execute(grantQuery);

      this.logger.info(`Role '${roleName}' concedido para '${toUser}'@'${toHost}'`);
      return `✅ Role '${roleName}' concedido para '${toUser}'@'${toHost}'!`;

    } catch (error) {
      this.logger.error('Erro ao conceder role:', error);
      throw new Error(`Erro ao conceder role: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  async revokeRole(options = {}) {
    const {
      roleName,
      fromUser,
      fromHost = '%',
      connectionName = null
    } = options;

    if (!roleName || !fromUser) {
      throw new Error('Nome do role e usuário de origem são obrigatórios');
    }

    let connection;
    try {
      connection = await this.getConnection(connectionName);

      const revokeQuery = `REVOKE '${roleName}' FROM '${fromUser}'@'${fromHost}'`;
      await connection.execute(revokeQuery);

      this.logger.info(`Role '${roleName}' revogado de '${fromUser}'@'${fromHost}'`);
      return `✅ Role '${roleName}' revogado de '${fromUser}'@'${fromHost}'!`;

    } catch (error) {
      this.logger.error('Erro ao revogar role:', error);
      throw new Error(`Erro ao revogar role: ${error.message}`);
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }

  // ===== OPERAÇÕES DE CONSULTA =====

  async listUsers(connectionName = null) {
    let connection;
    try {
      connection = await this.getConnection(connectionName);

      const query = `
        SELECT 
          user,
          host,
          account_locked,
          password_expired,
          password_last_changed,
          password_lifetime
        FROM mysql.user 
        WHERE user NOT IN ('mysql.session', 'mysql.sys', 'mysql.infoschema')
        ORDER BY user, host
      `;

      const [rows] = await connection.execute(query);

      let output = '';
      
      if (rows.length === 0) {
        output = 'Nenhum usuário encontrado.';
      } else {
        output += '| Usuário | Host | Conta Bloqueada | Senha Expirada | Última Alteração | Vida da Senha |\n';
        output += '|---------|------|-----------------|----------------|------------------|---------------|\n';
        
        for (const row of rows) {
          output += `| ${row.user} | ${row.host} | ${row.account_locked} | ${row.password_expired} | ${row.password_last_changed || 'N/A'} | ${row.password_lifetime || 'N/A'} |\n`;
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

  async listPrivileges(user, host = '%', connectionName = null) {
    let connection;
    try {
      connection = await this.getConnection(connectionName);

      const query = `
        SELECT 
          table_schema,
          table_name,
          privilege_type,
          is_grantable
        FROM information_schema.table_privileges 
        WHERE grantee = CONCAT('${user}', '@', '${host}')
        ORDER BY table_schema, table_name, privilege_type
      `;

      const [rows] = await connection.execute(query);

      let output = '';
      
      if (rows.length === 0) {
        output = `Nenhum privilégio encontrado para '${user}'@'${host}'.`;
      } else {
        output += `## Privilégios de '${user}'@'${host}'\n\n`;
        output += '| Database | Tabela | Privilégio | Pode Conceder |\n';
        output += '|----------|--------|------------|---------------|\n';
        
        for (const row of rows) {
          output += `| ${row.table_schema} | ${row.table_name} | ${row.privilege_type} | ${row.is_grantable} |\n`;
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

  async listRoles(connectionName = null) {
    let connection;
    try {
      connection = await this.getConnection(connectionName);

      const query = `
        SELECT 
          user as role_name,
          host,
          account_locked
        FROM mysql.user 
        WHERE user LIKE '%_role_%' 
           OR authentication_string = ''
        ORDER BY user
      `;

      const [rows] = await connection.execute(query);

      let output = '';
      
      if (rows.length === 0) {
        output = 'Nenhum role encontrado.';
      } else {
        output += '| Role | Host | Status |\n';
        output += '|------|------|--------|\n';
        
        for (const row of rows) {
          const status = row.account_locked === 'Y' ? 'Bloqueado' : 'Ativo';
          output += `| ${row.role_name} | ${row.host} | ${status} |\n`;
        }
        
        output += `\n**Total de roles:** ${rows.length}`;
      }

      return output;

    } catch (error) {
      this.logger.error('Erro ao listar roles:', error);
      throw new Error(`Erro ao listar roles: ${error.message}`);
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

  async roleExists(connection, roleName) {
    try {
      const query = `
        SELECT COUNT(*) 
        FROM mysql.user 
        WHERE user = ? AND authentication_string = ''
      `;
      const [rows] = await connection.execute(query, [roleName]);
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




