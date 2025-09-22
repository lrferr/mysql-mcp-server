import { Logger } from './logger.js';

export class MigrationValidator {
  constructor() {
    this.logger = new Logger();
  }

  // ===== VALIDAÇÃO DE SCRIPTS DE MIGRAÇÃO =====

  validateScript(script, targetSchema) {
    try {
      const validationResults = {
        isValid: true,
        warnings: [],
        errors: [],
        suggestions: []
      };

      // Validações básicas
      this.validateScriptStructure(script, validationResults);
      this.validateSQLSyntax(script, validationResults);
      this.validateSchemaReferences(script, targetSchema, validationResults);
      this.validateSecurityRisks(script, validationResults);
      this.validatePerformanceImpact(script, validationResults);
      this.validateRollbackCapability(script, validationResults);

      // Gerar relatório
      return this.generateValidationReport(validationResults);

    } catch (error) {
      this.logger.error('Erro ao validar script de migração:', error);
      return `❌ Erro ao validar script: ${error.message}`;
    }
  }

  validateScriptStructure(script, results) {
    if (!script || typeof script !== 'string') {
      results.errors.push('Script deve ser uma string não vazia');
      results.isValid = false;
      return;
    }

    // Verificar se contém pelo menos uma operação SQL
    const sqlKeywords = ['CREATE', 'ALTER', 'DROP', 'INSERT', 'UPDATE', 'DELETE', 'GRANT', 'REVOKE'];
    const hasSQLOperation = sqlKeywords.some(keyword => 
      script.toUpperCase().includes(keyword)
    );

    if (!hasSQLOperation) {
      results.errors.push('Script deve conter pelo menos uma operação SQL válida');
      results.isValid = false;
    }

    // Verificar tamanho do script
    if (script.length > 100000) {
      results.warnings.push('Script muito grande (>100KB). Considere dividir em scripts menores');
    }

    // Verificar se contém comentários explicativos
    if (!script.includes('--') && !script.includes('/*')) {
      results.suggestions.push('Considere adicionar comentários explicativos ao script');
    }
  }

  validateSQLSyntax(script, results) {
    // Verificar parênteses balanceados
    const openParens = (script.match(/\(/g) || []).length;
    const closeParens = (script.match(/\)/g) || []).length;
    
    if (openParens !== closeParens) {
      results.errors.push('Parênteses não balanceados no script');
      results.isValid = false;
    }

    // Verificar aspas balanceadas
    const singleQuotes = (script.match(/'/g) || []).length;
    if (singleQuotes % 2 !== 0) {
      results.errors.push('Aspas simples não balanceadas no script');
      results.isValid = false;
    }

    const doubleQuotes = (script.match(/"/g) || []).length;
    if (doubleQuotes % 2 !== 0) {
      results.errors.push('Aspas duplas não balanceadas no script');
      results.isValid = false;
    }

    // Verificar ponto e vírgula no final
    const lines = script.split('\n');
    const lastNonEmptyLine = lines.reverse().find(line => line.trim());
    if (lastNonEmptyLine && !lastNonEmptyLine.trim().endsWith(';')) {
      results.warnings.push('Última linha do script deve terminar com ponto e vírgula');
    }

    // Verificar uso de palavras reservadas sem escape
    const reservedWords = ['ORDER', 'GROUP', 'HAVING', 'WHERE', 'SELECT', 'FROM'];
    for (const word of reservedWords) {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      if (regex.test(script)) {
        results.suggestions.push(`Verifique se a palavra reservada '${word}' está sendo usada corretamente`);
      }
    }
  }

  validateSchemaReferences(script, targetSchema, results) {
    if (!targetSchema) {
      results.warnings.push('Schema de destino não especificado');
      return;
    }

    // Verificar se o script referencia o schema correto
    const schemaReferences = script.match(/`?\w+`?\./g) || [];
    const hasSchemaReference = schemaReferences.some(ref => 
      ref.toLowerCase().includes(targetSchema.toLowerCase())
    );

    if (schemaReferences.length > 0 && !hasSchemaReference) {
      results.warnings.push(`Script não referencia o schema de destino '${targetSchema}'`);
    }

    // Verificar referências a schemas do sistema
    const systemSchemas = ['mysql', 'information_schema', 'performance_schema', 'sys'];
    for (const schema of systemSchemas) {
      if (script.toLowerCase().includes(`\`${schema}\`.`)) {
        results.warnings.push(`Script referencia schema do sistema '${schema}' - verifique se é necessário`);
      }
    }
  }

  validateSecurityRisks(script, results) {
    // Verificar operações perigosas
    const dangerousOperations = [
      { pattern: /DROP\s+DATABASE/i, message: 'Script contém DROP DATABASE - operação muito perigosa' },
      { pattern: /DROP\s+TABLE.*CASCADE/i, message: 'Script contém DROP TABLE CASCADE - pode afetar outras tabelas' },
      { pattern: /TRUNCATE\s+TABLE/i, message: 'Script contém TRUNCATE TABLE - todos os dados serão perdidos' },
      { pattern: /DELETE\s+FROM.*WHERE\s*$/i, message: 'Script contém DELETE sem WHERE - pode deletar todos os registros' },
      { pattern: /UPDATE.*SET.*WHERE\s*$/i, message: 'Script contém UPDATE sem WHERE - pode afetar todos os registros' },
      { pattern: /GRANT\s+ALL\s+PRIVILEGES/i, message: 'Script concede ALL PRIVILEGES - considere privilégios específicos' },
      { pattern: /CREATE\s+USER.*IDENTIFIED\s+BY\s+'/i, message: 'Script cria usuário com senha em texto claro' }
    ];

    for (const operation of dangerousOperations) {
      if (operation.pattern.test(script)) {
        results.warnings.push(operation.message);
      }
    }

    // Verificar possíveis SQL injections
    const injectionPatterns = [
      /union.*select/i,
      /or.*1\s*=\s*1/i,
      /'.*or.*'.*=/i,
      /;.*drop/i
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(script)) {
        results.errors.push('Possível tentativa de SQL injection detectada');
        results.isValid = false;
      }
    }

    // Verificar senhas em texto claro
    const passwordPatterns = [
      /PASSWORD\s*=\s*'[^']+'/i,
      /IDENTIFIED\s+BY\s+'[^']+'/i
    ];

    for (const pattern of passwordPatterns) {
      if (pattern.test(script)) {
        results.warnings.push('Senhas em texto claro detectadas - considere usar variáveis de ambiente');
      }
    }
  }

  validatePerformanceImpact(script, results) {
    // Verificar operações que podem ser lentas
    const slowOperations = [
      { pattern: /CREATE\s+INDEX/i, message: 'Criação de índice pode ser lenta em tabelas grandes' },
      { pattern: /ALTER\s+TABLE.*ADD\s+INDEX/i, message: 'Adição de índice pode ser lenta em tabelas grandes' },
      { pattern: /CREATE\s+FULLTEXT\s+INDEX/i, message: 'Índice FULLTEXT pode ser muito lento de criar' },
      { pattern: /OPTIMIZE\s+TABLE/i, message: 'OPTIMIZE TABLE pode ser lento e bloquear a tabela' },
      { pattern: /ANALYZE\s+TABLE/i, message: 'ANALYZE TABLE pode ser lento em tabelas grandes' }
    ];

    for (const operation of slowOperations) {
      if (operation.pattern.test(script)) {
        results.warnings.push(operation.message);
      }
    }

    // Verificar operações em lote
    const batchOperations = script.match(/INSERT\s+INTO.*VALUES\s*\(/gi) || [];
    if (batchOperations.length > 10) {
      results.warnings.push('Muitas operações INSERT - considere executar em lotes menores');
    }

    // Verificar uso de transações
    const hasBegin = /BEGIN|START\s+TRANSACTION/i.test(script);
    const hasCommit = /COMMIT/i.test(script);
    const hasRollback = /ROLLBACK/i.test(script);

    if (hasBegin && !hasCommit && !hasRollback) {
      results.warnings.push('Transação iniciada mas não há COMMIT ou ROLLBACK explícito');
    }

    if ((hasCommit || hasRollback) && !hasBegin) {
      results.warnings.push('COMMIT/ROLLBACK sem BEGIN/START TRANSACTION correspondente');
    }
  }

  validateRollbackCapability(script, results) {
    // Verificar se o script pode ser revertido
    const irreversibleOperations = [
      { pattern: /DROP\s+TABLE/i, message: 'DROP TABLE é irreversível - considere fazer backup primeiro' },
      { pattern: /DROP\s+COLUMN/i, message: 'DROP COLUMN é irreversível - dados serão perdidos' },
      { pattern: /TRUNCATE\s+TABLE/i, message: 'TRUNCATE TABLE é irreversível - todos os dados serão perdidos' },
      { pattern: /DELETE\s+FROM/i, message: 'DELETE pode ser irreversível - considere fazer backup' }
    ];

    for (const operation of irreversibleOperations) {
      if (operation.pattern.test(script)) {
        results.warnings.push(operation.message);
      }
    }

    // Verificar se há script de rollback
    if (!script.toLowerCase().includes('rollback') && !script.toLowerCase().includes('undo')) {
      results.suggestions.push('Considere incluir um script de rollback ou instruções de reversão');
    }
  }

  generateValidationReport(results) {
    let report = '# Relatório de Validação do Script de Migração\n\n';

    // Status geral
    if (results.isValid) {
      report += '## ✅ Status: Script Válido\n\n';
    } else {
      report += '## ❌ Status: Script Inválido\n\n';
    }

    // Erros
    if (results.errors.length > 0) {
      report += '## 🚨 Erros Encontrados\n\n';
      results.errors.forEach((error, index) => {
        report += `${index + 1}. ${error}\n`;
      });
      report += '\n';
    }

    // Avisos
    if (results.warnings.length > 0) {
      report += '## ⚠️ Avisos\n\n';
      results.warnings.forEach((warning, index) => {
        report += `${index + 1}. ${warning}\n`;
      });
      report += '\n';
    }

    // Sugestões
    if (results.suggestions.length > 0) {
      report += '## 💡 Sugestões\n\n';
      results.suggestions.forEach((suggestion, index) => {
        report += `${index + 1}. ${suggestion}\n`;
      });
      report += '\n';
    }

    // Resumo
    report += '## 📊 Resumo\n\n';
    report += `- **Total de Erros:** ${results.errors.length}\n`;
    report += `- **Total de Avisos:** ${results.warnings.length}\n`;
    report += `- **Total de Sugestões:** ${results.suggestions.length}\n`;

    if (results.isValid) {
      report += '\n✅ **O script pode ser executado**, mas revise os avisos e sugestões antes de aplicar em produção.';
    } else {
      report += '\n❌ **O script não deve ser executado** até que todos os erros sejam corrigidos.';
    }

    return report;
  }

  // ===== VALIDAÇÃO DE NOMES DE OBJETOS =====

  validateObjectName(name, type = 'table') {
    const validationResults = {
      isValid: true,
      warnings: [],
      errors: []
    };

    if (!name || typeof name !== 'string') {
      validationResults.errors.push(`Nome de ${type} deve ser uma string válida`);
      validationResults.isValid = false;
      return validationResults;
    }

    // Verificar comprimento
    const maxLength = type === 'table' ? 64 : 16;
    if (name.length > maxLength) {
      validationResults.errors.push(`Nome de ${type} não pode exceder ${maxLength} caracteres`);
      validationResults.isValid = false;
    }

    // Verificar caracteres válidos
    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) {
      validationResults.errors.push(`Nome de ${type} deve conter apenas letras, números e underscore, começando com letra`);
      validationResults.isValid = false;
    }

    // Verificar palavras reservadas
    const reservedWords = [
      'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP',
      'ALTER', 'TABLE', 'DATABASE', 'INDEX', 'VIEW', 'TRIGGER', 'FUNCTION',
      'PROCEDURE', 'USER', 'GRANT', 'REVOKE', 'ORDER', 'GROUP', 'HAVING'
    ];

    if (reservedWords.includes(name.toUpperCase())) {
      validationResults.warnings.push(`Nome '${name}' é uma palavra reservada - considere usar outro nome`);
    }

    // Verificar convenções de nomenclatura
    if (name.includes('__')) {
      validationResults.warnings.push('Nome contém underscores duplos - considere usar underscores simples');
    }

    if (name.startsWith('_') || name.endsWith('_')) {
      validationResults.warnings.push('Nome começa ou termina com underscore - considere usar apenas no meio');
    }

    return validationResults;
  }

  // ===== VALIDAÇÃO DE DADOS =====

  validateDataTypes(columns) {
    const validationResults = {
      isValid: true,
      warnings: [],
      errors: []
    };

    if (!Array.isArray(columns)) {
      validationResults.errors.push('Colunas devem ser um array');
      validationResults.isValid = false;
      return validationResults;
    }

    for (const column of columns) {
      if (!column.name || !column.type) {
        validationResults.errors.push('Cada coluna deve ter nome e tipo definidos');
        validationResults.isValid = false;
        continue;
      }

      // Validar nome da coluna
      const nameValidation = this.validateObjectName(column.name, 'column');
      if (!nameValidation.isValid) {
        validationResults.errors.push(...nameValidation.errors);
        validationResults.isValid = false;
      }
      validationResults.warnings.push(...nameValidation.warnings);

      // Validar tipo de dados
      const validTypes = [
        'TINYINT', 'SMALLINT', 'MEDIUMINT', 'INT', 'INTEGER', 'BIGINT',
        'FLOAT', 'DOUBLE', 'DECIMAL', 'NUMERIC',
        'CHAR', 'VARCHAR', 'TINYTEXT', 'TEXT', 'MEDIUMTEXT', 'LONGTEXT',
        'TINYBLOB', 'BLOB', 'MEDIUMBLOB', 'LONGBLOB',
        'DATE', 'TIME', 'DATETIME', 'TIMESTAMP', 'YEAR',
        'ENUM', 'SET', 'JSON', 'GEOMETRY'
      ];

      if (!validTypes.includes(column.type.toUpperCase())) {
        validationResults.errors.push(`Tipo de dados inválido para coluna '${column.name}': ${column.type}`);
        validationResults.isValid = false;
      }

      // Avisos sobre tipos de dados
      if (column.type.toUpperCase() === 'TEXT' && !column.length) {
        validationResults.warnings.push(`Coluna '${column.name}' usa TEXT sem especificar tamanho`);
      }

      if (column.type.toUpperCase().includes('CHAR') && column.length && column.length > 255) {
        validationResults.warnings.push(`Coluna '${column.name}' usa CHAR/VARCHAR com tamanho > 255 - considere usar TEXT`);
      }
    }

    return validationResults;
  }
}





