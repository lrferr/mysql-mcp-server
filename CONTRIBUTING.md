# 🤝 Guia de Contribuição

Obrigado por considerar contribuir com o MySQL MCP Server! Este documento fornece diretrizes para contribuir com o projeto.

## 📋 Como Contribuir

### 🐛 Reportar Bugs

1. Verifique se o bug já foi reportado nas [issues](https://github.com/lrferr/mysql-mcp-server/issues)
2. Use o template de bug report
3. Inclua informações detalhadas sobre o ambiente
4. Forneça passos para reproduzir o problema

### ✨ Sugerir Melhorias

1. Verifique se a melhoria já foi sugerida
2. Use o template de feature request
3. Explique o problema que a melhoria resolveria
4. Descreva a solução proposta

### 💻 Contribuir com Código

1. Fork o repositório
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 🛠️ Configuração do Ambiente de Desenvolvimento

### Pré-requisitos
- Node.js 18.0.0+
- MySQL 5.7+ ou MariaDB 10.3+
- Git

### Instalação
```bash
git clone https://github.com/lrferr/mysql-mcp-server.git
cd mysql-mcp-server
npm install
npm run setup
```

### Executar Testes
```bash
npm test
npm run test:security
npm run test:integration
```

### Linting
```bash
npm run lint
npm run format
```

## 📝 Padrões de Código

### JavaScript/Node.js
- Use ES6+ modules
- Siga as regras do ESLint configuradas
- Use async/await ao invés de callbacks
- Documente funções complexas com JSDoc

### Estrutura de Arquivos
```
src/
├── index.js              # Servidor principal
├── connection-manager.js  # Gerenciamento de conexões
├── mysql-monitor.js      # Monitoramento
├── ddl-operations.js     # Operações DDL
├── dml-operations.js     # Operações DML
├── dcl-operations.js     # Operações DCL
├── security-audit.js     # Auditoria de segurança
├── migration-validator.js # Validação de migrações
├── notification-service.js # Notificações
└── logger.js             # Sistema de logs
```

### Convenções de Nomenclatura
- Classes: PascalCase (`MySQLMonitor`)
- Funções: camelCase (`checkDatabaseHealth`)
- Constantes: UPPER_SNAKE_CASE (`MAX_CONNECTIONS`)
- Arquivos: kebab-case (`mysql-monitor.js`)

## 🧪 Testes

### Executar Todos os Testes
```bash
npm run test:all
```

### Testes Unitários
```bash
npm run test:unit
```

### Testes de Segurança
```bash
npm run test:security
```

### Testes de Integração
```bash
npm run test:integration
```

### Testes de Performance
```bash
npm run test:performance
```

### Adicionar Novos Testes
- Crie arquivos de teste em `tests/`
- Use a convenção `test-*.js`
- Inclua testes para casos positivos e negativos
- Documente casos de teste complexos

## 📚 Documentação

### Atualizar Documentação
- README.md para mudanças principais
- docs/ para documentação detalhada
- examples/ para exemplos de uso
- Comente código complexo

### Padrões de Documentação
- Use Markdown para arquivos .md
- Inclua exemplos práticos
- Mantenha documentação atualizada com o código
- Use emojis para melhorar legibilidade

## 🔒 Segurança

### Relatório de Vulnerabilidades
- NÃO abra issues públicas para vulnerabilidades
- Envie email para lrferr@gmail.com
- Inclua detalhes sobre a vulnerabilidade
- Aguarde confirmação antes de divulgar

### Boas Práticas
- Valide todas as entradas do usuário
- Use prepared statements para queries
- Implemente rate limiting
- Log operações sensíveis
- Nunca commite credenciais

## 🏷️ Versionamento

Seguimos [Semantic Versioning](https://semver.org/):
- MAJOR: mudanças incompatíveis
- MINOR: funcionalidades compatíveis
- PATCH: correções compatíveis

### Changelog
- Documente mudanças em CHANGELOG.md
- Use formato convencional de commits
- Agrupe mudanças por tipo

## 📋 Checklist para Pull Requests

- [ ] Código segue padrões do projeto
- [ ] Testes passam (`npm test`)
- [ ] Linting passa (`npm run lint`)
- [ ] Documentação atualizada
- [ ] Changelog atualizado
- [ ] Commits bem descritos
- [ ] Branch atualizada com main

## 🎯 Áreas de Contribuição

### Prioridade Alta
- Melhorias de performance
- Novas ferramentas de monitoramento
- Suporte a mais tipos de banco
- Testes de integração

### Prioridade Média
- Documentação
- Exemplos de uso
- Ferramentas CLI
- Scripts de automação

### Prioridade Baixa
- Refatorações
- Melhorias de UI/UX
- Traduções
- Otimizações menores

## 💬 Comunidade

### Código de Conduta
- Seja respeitoso e inclusivo
- Foque no que é melhor para a comunidade
- Aceite críticas construtivas
- Ajude outros contribuidores

### Comunicação
- Issues para bugs e features
- Discussions para dúvidas
- Pull Requests para código
- Email para segurança

## 🏆 Reconhecimento

Contribuidores serão reconhecidos:
- No README.md
- No CHANGELOG.md
- Em releases
- No perfil GitHub

## ❓ Dúvidas?

- Abra uma [discussion](https://github.com/lrferr/mysql-mcp-server/discussions)
- Consulte a [documentação](README.md)
- Entre em contato: lrferr@gmail.com

---

**Obrigado por contribuir! 🎉**






