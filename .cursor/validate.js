#!/usr/bin/env node

/**
 * Cursor Background Agent 配置验证脚本
 * 验证 environment.json 文件的格式和内容
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function validateEnvironmentConfig() {
    console.log('🔍 验证 Cursor Background Agent 配置...\n');
    
    const configPath = path.join(__dirname, 'environment.json');
    
    // 检查文件是否存在
    if (!fs.existsSync(configPath)) {
        console.error('❌ 错误: environment.json 文件不存在');
        console.log('💡 提示: 运行 .cursor/setup.sh 来创建配置文件');
        process.exit(1);
    }
    
    try {
        // 读取和解析 JSON
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configContent);
        
        console.log('✅ JSON 格式有效');
        
        // 验证必需字段
        const requiredFields = ['install'];
        
        for (const field of requiredFields) {
            if (!config[field]) {
                console.error(`❌ 错误: 缺少必需字段 "${field}"`);
                process.exit(1);
            }
        }
        
        console.log('✅ 必需字段检查通过');
        
        // 验证 terminals 结构
        if (config.terminals) {
            if (!Array.isArray(config.terminals)) {
                console.error('❌ 错误: terminals 必须是数组');
                process.exit(1);
            }
            
            for (let i = 0; i < config.terminals.length; i++) {
                const terminal = config.terminals[i];
                if (!terminal.name || !terminal.command) {
                    console.error(`❌ 错误: terminals[${i}] 缺少 name 或 command 字段`);
                    process.exit(1);
                }
            }
            
            console.log(`✅ Terminals 配置有效 (${config.terminals.length} 个终端)`);
        }
        
        // 显示配置摘要
        console.log('\n📋 配置摘要:');
        console.log(`   Install: ${config.install}`);
        if (config.start) {
            console.log(`   Start: ${config.start}`);
        }
        if (config.terminals) {
            console.log(`   Terminals: ${config.terminals.length} 个`);
            config.terminals.forEach((terminal, i) => {
                console.log(`     ${i + 1}. ${terminal.name}`);
            });
        }
        
        console.log('\n🎉 配置验证通过！可以安全使用 Background Agent。');
        
    } catch (error) {
        console.error('❌ 错误: JSON 格式无效');
        console.error(error.message);
        process.exit(1);
    }
}

// 运行验证
validateEnvironmentConfig();
