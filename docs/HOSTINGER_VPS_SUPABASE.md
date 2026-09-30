# Guia de Deploy EVOCRM — VPS Hostinger + Supabase

Este guia documenta o passo a passo para hospedar o **EVOCRM** na **VPS da Hostinger** (Ubuntu 22.04 LTS ou 24.04 LTS) utilizando **Supabase** como banco de dados PostgreSQL em produção e APIs de Inteligência Artificial (**Google Gemini** e **Anthropic Claude**).

---

## 1. Configuração do Supabase (Banco de Dados)

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard) e crie ou acesse seu projeto.
2. No menu lateral, acesse **SQL Editor**.
3. Abra o arquivo `supabase/schema.sql` deste repositório, copie todo o conteúdo e execute no SQL Editor.
   - Isso criará todas as 30 tabelas relacionais com índices e políticas de Row Level Security (RLS).
4. No Supabase, acesse **Project Settings > API** e anote:
   - `Project URL`
   - `anon public key`
   - `service_role secret key`

---

## 2. Preparação da VPS Hostinger (Ubuntu)

Conecte-se à sua VPS via SSH:
```bash
ssh root@SEU_IP_DA_HOSTINGER
```

Clone o repositório ou envie os arquivos para a VPS:
```bash
git clone <URL_DO_SEU_REPOSITORIO> /var/www/evocrm
cd /var/www/evocrm
```

---

## 3. Variáveis de Ambiente em Produção

Crie o arquivo `.env.production` no diretório raiz do projeto:
```bash
cp .env.local .env.production
nano .env.production
```

Preencha com seus dados reais:
```env
# Supabase PostgreSQL
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui

# Porta e Ambiente
NODE_ENV=production
PORT=3000

# WhatsApp & n8n
NEXT_PUBLIC_EVOLUTION_API_URL=https://evolution.seudominio.com.br
EVOLUTION_API_KEY=sua-chave-evolution
N8N_WEBHOOK_URL=https://n8n.seudominio.com.br/webhook/crm-events
```

---

## 4. Deploy Automatizado com 1 Comando

O projeto inclui o script automatizado `deploy-hostinger.sh`. Basta conceder permissão de execução e rodar:

```bash
chmod +x deploy-hostinger.sh
./deploy-hostinger.sh
```

O script automaticamente:
- Atualiza pacotes do Ubuntu
- Instala Node.js 20 LTS e PM2 (se necessário)
- Instala as dependências do npm
- Executa o build de produção otimizado (`npm run build`)
- Inicia o processo em modo cluster através do `ecosystem.config.js`
- Habilita o reinício automático no boot do sistema operacional com `pm2 startup`

---

## 5. Configurar Domínio e SSL com Nginx (Opcional & Recomendado)

Para acessar seu CRM através de um domínio (ex: `crm.evopixel.com.br`):

1. Instale o Nginx e Certbot:
```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

2. Crie a configuração do site:
```bash
sudo nano /etc/nginx/sites-available/evocrm
```

Cole a configuração de proxy reverso:
```nginx
server {
    server_name crm.evopixel.com.br;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

3. Ative o site e emita o certificado SSL gratuito Let's Encrypt:
```bash
sudo ln -s /etc/nginx/sites-available/evocrm /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d crm.evopixel.com.br
```

---

## 6. Conexão de APIs de Inteligência Artificial (Gemini & Claude)

No painel do EVOCRM, navegue até **Configurações**:
- Selecione o motor desejado: **Google Gemini** ou **Anthropic Claude**.
- Insira sua API Key (obtida no Google AI Studio ou no Console Anthropic).
- Selecione o modelo (ex: `gemini-2.5-flash` ou `claude-3-7-sonnet-20250219`).
- Clique em **Testar Conexão** para validar a comunicação instantânea.
- Clique em **Salvar Chaves de IA**.

Pronto! O EVOCRM estará rodando em alta performance na Hostinger VPS com todos os dados salvos em tempo real no Supabase.
