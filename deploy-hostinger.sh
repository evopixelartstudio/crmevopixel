#!/bin/bash
# ==============================================================================
# EVOCRM — SCRIPT DE DEPLOY AUTOMATIZADO PARA VPS HOSTINGER (UBUNTU)
# ==============================================================================

set -e

echo "🚀 Iniciando deploy do EVOCRM na VPS Hostinger..."

# 1. Atualizar pacotes do sistema
sudo apt update && sudo apt upgrade -y

# 2. Instalar Node.js 20 LTS (se ainda não instalado)
if ! command -v node &> /dev/null; then
    echo "📦 Instalando Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# 3. Instalar PM2 globalmente
if ! command -v pm2 &> /dev/null; then
    echo "📦 Instalando PM2..."
    sudo npm install -g pm2
fi

# 4. Instalar dependências do projeto
echo "📦 Instalando dependências do projeto..."
npm install --production=false

# 5. Compilar bundle de produção otimizado do Next.js
echo "⚡ Compilando Next.js para produção..."
npm run build

# 6. Iniciar ou recarregar aplicação com PM2
echo "🔄 Iniciando serviço com PM2..."
if pm2 list | grep -q "evocrm"; then
    pm2 reload ecosystem.config.js --env production
else
    pm2 start ecosystem.config.js --env production
fi

# 7. Salvar processos no startup do sistema
pm2 save
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp /home/$USER || true

echo "✅ EVOCRM rodando com sucesso na VPS Hostinger na porta 3000!"
echo "🔗 Para configurar domínio com SSL, aponte Nginx para http://localhost:3000."
