# CamWatch

Plataforma SaaS de monitoramento de câmeras IP — inspirada no Verkada/Meraki, com suporte a câmeras Intelbras/ONVIF, detecção de veículos e alertas em tempo real.

## Stack

- **Backend**: Node.js 24, Express 5, Drizzle ORM, PostgreSQL
- **Frontend**: React + Vite, TailwindCSS, shadcn/ui
- **Protocolo de câmera**: ONVIF (onvif npm package)
- **Tempo real**: WebSockets
- **Idioma da UI**: Português (Brasil)

## Pré-requisitos

- [Node.js 24+](https://nodejs.org)
- [pnpm 9+](https://pnpm.io): `npm i -g pnpm`
- PostgreSQL (local ou Docker)

## Instalação

```bash
# 1. Clonar
git clone https://github.com/Noom-Labs/camwatch.git
cd camwatch

# 2. Instalar dependências
pnpm install

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais do banco
```

## Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
DATABASE_URL=postgres://usuario:senha@localhost:5432/camwatch
SESSION_SECRET=qualquer-string-secreta-aqui
```

## Banco de dados

```bash
# Criar as tabelas
pnpm --filter @workspace/db run push
```

## Executar

### Opção 1 — Dois terminais (desenvolvimento)

**Terminal 1 — API:**
```bash
cd artifacts/api-server
node ./build.mjs
PORT=8080 NODE_ENV=development node --enable-source-maps dist/index.mjs
```

**Terminal 2 — Frontend:**
```bash
pnpm --filter @workspace/web run dev
```

Acesse: http://localhost:5173

### Opção 2 — Com script de conveniência

```bash
# Build da API
cd artifacts/api-server && node ./build.mjs && cd ../..

# Rodar tudo em paralelo
pnpm --filter @workspace/api-server run dev &
pnpm --filter @workspace/web run dev
```

## Primeiro acesso

Crie o primeiro usuário via endpoint de registro:
- Acesse o frontend e clique em **"Cadastrar empresa"**
- Ou use `POST /api/auth/register` com `{ email, password, companyName }`

## Configurar câmera Intelbras

1. Adicione a câmera em **Câmeras → Adicionar câmera**
2. Informe o IP da câmera, usuário e senha
3. Clique em **"Testar conexão ONVIF"** — o sistema conecta automaticamente
4. Para alertas por webhook: clique em **"Configurar"** em _Alertas de movimento_ na página da câmera e siga as instruções para configurar no painel da câmera

## Estrutura do projeto

```
artifacts/
  api-server/   — Backend Express + Drizzle
  web/          — Frontend React + Vite
lib/
  api-client-react/  — Hooks React Query gerados (Orval)
  api-spec/          — OpenAPI spec + codegen config
  db/                — Schema Drizzle + migrations
```

## Comandos úteis

```bash
pnpm run typecheck              # Typecheck completo
pnpm --filter @workspace/api-spec run codegen   # Regerar hooks da API
pnpm --filter @workspace/db run push            # Aplicar schema no banco
```
