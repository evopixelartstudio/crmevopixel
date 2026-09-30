#!/bin/bash
set -e

echo "🚀 Atualizando EVOCRM na VPS Hostinger..."

# 1. Puxar as alterações mais recentes do GitHub
git pull origin main

# 2. Verificar se está rodando via Docker Compose ou PM2
if command -v docker &> /dev/null && docker compose ps crmevopixel 2>/dev/null | grep -q "crmevopixel"; then
    echo "🐳 Ambiente Docker ativo detectado. Reconstruindo container crmevopixel..."
    docker compose up -d --build
    echo "✅ Container Docker atualizado e reiniciado com sucesso!"
elif command -v pm2 &> /dev/null; then
    echo "⚡ Ambiente PM2 detectado. Instalando dependências e compilando..."
    npm install
    npm run build
    if pm2 list | grep -q "evocrm"; then
        pm2 reload ecosystem.config.js --env production
    else
        pm2 start ecosystem.config.js --env production
    fi
    pm2 save
    echo "✅ Aplicação PM2 atualizada e recarregada com sucesso!"
else
    echo "📦 Instalando dependências e compilando..."
    npm install
    npm run build
    echo "✅ Build concluído!"
fi

echo "🎉 EVOCRM atualizado com sucesso na Hostinger VPS!"
