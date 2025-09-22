#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Gerenciador de Configuração Hierárquico
 * Verifica configurações em ordem de prioridade:
 * 1. mcp.json (mais seguro, não vai para repo)
 * 2. mysql-connections.json (arquivo local)
 * 3. .env (variáveis de ambiente)
 * 4. Configurações padrão seguras
 */
class ConfigManager {
  constructor() {
    this.configSources = [];
    this.finalConfig = null;
    this.loadedFrom = null;
  }

  /**
   * Carrega configurações de todas as fontes em ordem de prioridade
   */
  async loadConfigurations() {
    console.log('🔧 Carregando configurações hierárquicas...\n');

    // 1. Tentar carregar do mcp.json (mais seguro)
    await this.tryLoadFromMcpJson();
    
    // 2. Tentar carregar do arquivo mysql-connections.json
    await this.tryLoadFromConfigFile();
    
    // 3. Tentar carregar do .env
    await this.tryLoadFromEnv();
    
    // 4. Usar configurações padrão seguras
    this.tryLoadDefaults();

    this.displayConfigurationSummary();
    return this.finalConfig;
  }

  /**
   * Tenta carregar configurações do mcp.json
   */
  async tryLoadFromMcpJson() {
    try {
      const mcpPath = path.join(os.homedir(), '.cursor', 'mcp.json');
      
      if (fs.existsSync(mcpPath)) {
        const mcpConfig = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
        
        // Procurar por servidores MySQL
        for (const [serverName, serverConfig] of Object.entries(mcpConfig.mcpServers || {})) {
          if (serverName.includes('mysql') && serverConfig.env?.MYSQL_CONNECTIONS) {
            const connections = JSON.parse(serverConfig.env.MYSQL_CONNECTIONS);
            this.configSources.push({
              source: 'mcp.json',
              server: serverName,
              config: connections,
              priority: 1
            });
            console.log(`✅ Configuração encontrada em mcp.json (${serverName})`);
            return;
          }
        }
      }
    } catch (error) {
      console.log(`⚠️  Erro ao carregar mcp.json: ${error.message}`);
    }
  }

  /**
   * Tenta carregar configurações do arquivo mysql-connections.json
   */
  async tryLoadFromConfigFile() {
    try {
      const configPath = path.join(projectRoot, 'config', 'mysql-connections.json');
      
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        this.configSources.push({
          source: 'mysql-connections.json',
          config: config,
          priority: 2
        });
        console.log('✅ Configuração encontrada em mysql-connections.json');
      }
    } catch (error) {
      console.log(`⚠️  Erro ao carregar mysql-connections.json: ${error.message}`);
    }
  }

  /**
   * Tenta carregar configurações do .env
   */
  async tryLoadFromEnv() {
    try {
      const envPath = path.join(projectRoot, '.env');
      
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const envVars = this.parseEnvFile(envContent);
        
        if (envVars.MYSQL_CONNECTIONS) {
          const connections = JSON.parse(envVars.MYSQL_CONNECTIONS);
          this.configSources.push({
            source: '.env',
            config: connections,
            priority: 3
          });
          console.log('✅ Configuração encontrada em .env');
        }
      }
    } catch (error) {
      console.log(`⚠️  Erro ao carregar .env: ${error.message}`);
    }
  }

  /**
   * Carrega configurações padrão seguras
   */
  tryLoadDefaults() {
    const defaultConfig = {
      connections: {
        localhost: {
          host: 'localhost',
          port: 3306,
          user: 'root',
          password: 'password',
          database: 'mysql'
        }
      },
      defaultConnection: 'localhost'
    };

    this.configSources.push({
      source: 'defaults',
      config: defaultConfig,
      priority: 4
    });
    console.log('✅ Usando configurações padrão (localhost)');
  }

  /**
   * Seleciona a melhor configuração baseada na prioridade
   */
  selectBestConfiguration() {
    if (this.configSources.length === 0) {
      throw new Error('Nenhuma configuração encontrada');
    }

    // Ordenar por prioridade (menor número = maior prioridade)
    this.configSources.sort((a, b) => a.priority - b.priority);
    
    this.finalConfig = this.configSources[0].config;
    this.loadedFrom = this.configSources[0].source;
    
    return this.finalConfig;
  }

  /**
   * Exibe resumo das configurações carregadas
   */
  displayConfigurationSummary() {
    console.log('\n📋 Resumo das Configurações:');
    console.log('=' .repeat(50));
    
    this.configSources.forEach((source, index) => {
      const status = index === 0 ? '✅ ATIVA' : '⏸️  Disponível';
      console.log(`${status} ${source.source} (Prioridade ${source.priority})`);
      
      if (source.config?.connections) {
        const connectionNames = Object.keys(source.config.connections);
        console.log(`   Conexões: ${connectionNames.join(', ')}`);
        console.log(`   Padrão: ${source.config.defaultConnection}`);
      }
      console.log();
    });

    if (this.finalConfig) {
      console.log(`🎯 Configuração selecionada: ${this.loadedFrom}`);
      console.log(`📊 Total de conexões: ${Object.keys(this.finalConfig.connections).length}`);
    }
  }

  /**
   * Parse simples de arquivo .env
   */
  parseEnvFile(content) {
    const envVars = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      }
    }
    
    return envVars;
  }

  /**
   * Obtém a configuração final
   */
  getFinalConfig() {
    if (!this.finalConfig) {
      this.selectBestConfiguration();
    }
    return this.finalConfig;
  }

  /**
   * Obtém informações sobre a fonte da configuração
   */
  getConfigSource() {
    return this.loadedFrom;
  }

  /**
   * Lista todas as fontes de configuração encontradas
   */
  getAllSources() {
    return this.configSources;
  }
}

export default ConfigManager;
