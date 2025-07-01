#!/bin/bash

# Cursor Background Agent 配置设置脚本

echo "🚀 Cursor Background Agent 配置设置"
echo "=================================="

# 检查当前配置
if [ -f ".cursor/environment.json" ]; then
    echo "📋 当前配置文件已存在"
else
    echo "📋 未找到配置文件"
fi

echo ""
echo "请选择配置类型："
echo "1) 标准开发配置 (推荐)"
echo "2) Docker 开发配置"  
echo "3) 简化快速配置"
echo "4) 查看当前配置"
echo "5) 退出"

read -p "请输入选择 (1-5): " choice

case $choice in
    1)
        cp .cursor/environment.json.bak .cursor/environment.json 2>/dev/null || cp .cursor/environment.json .cursor/environment.json.bak 2>/dev/null
        echo "✅ 已设置为标准开发配置"
        ;;
    2)
        cp .cursor/environment.json .cursor/environment.json.bak 2>/dev/null
        cp .cursor/environment-docker.json .cursor/environment.json
        echo "✅ 已设置为 Docker 开发配置"
        ;;
    3)
        cp .cursor/environment.json .cursor/environment.json.bak 2>/dev/null
        cp .cursor/environment-simple.json .cursor/environment.json
        echo "✅ 已设置为简化快速配置"
        ;;
    4)
        if [ -f ".cursor/environment.json" ]; then
            echo "📄 当前配置内容："
            cat .cursor/environment.json
        else
            echo "❌ 未找到配置文件"
        fi
        ;;
    5)
        echo "👋 退出设置"
        exit 0
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

echo ""
echo "🎉 配置完成！现在可以在 Cursor 中启动 Background Agent 了。"
echo ""
echo "💡 提示："
echo "- 按 Ctrl+Shift+P 打开命令面板"
echo "- 搜索 'Background Agent' 来启动"
echo "- 或使用快捷键打开 Background Agent 控制面板"
