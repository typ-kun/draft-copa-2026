# Draft Copa do Mundo 2026 🏆

Sistema completo para organizar campeonatos Fantasy de futebol entre amigos, integrando um draft de jogadores via web com a execução das partidas no **EA Sports FC 26 (PC)**.

---

## 🚀 Funcionalidades

### Jogabilidade
- **Draft Snake/Circular** — até 8 participantes
- **Sorteio de seleções reais** (Brasil, Alemanha, Argentina, etc.)
- **Pool de jogadores** com refresh e timer de 15s por pick
- **Mata-mata** com bracket estilo HLTV
- **Exportação** dos elencos para o EA FC 26

### Multiplayer (Supabase Realtime)
- Salas online com criação por código
- Presença em tempo real (jogadores online/offline)
- Draft sincronizado entre jogadores
- Reconexão automática após F5

### Sistema de Contas
- **Login por email/senha** via Supabase Auth
- **Login com Google** (OAuth)
- Modo **convidado** (sem login)
- Sessão persistente entre reloads
- Indicador de login no pré-menu

### Níveis de Privilégio

| Nível | Offline | Criar Salas | Entrar | Painel Admin |
|-------|:-------:|:-----------:|:------:|:------------:|
| **👑 Admin** | ✅ | ✅ | ✅ | ✅ |
| **⭐ Premium** | ✅ | ❌ | ✅ | ❌ |
| **🎮 Comum** | ❌ | ❌ | ✅ | ❌ |
| **👤 Convidado** | ❌ | ❌ | ✅ | ❌ |

### Painel Admin
- Lista de usuários cadastrados
- Alterar nível (Comum ↔ Premium) com notificação em tempo real
- Apenas o Admin tem acesso

---

## 🛠️ Tecnologias

- **Frontend:** HTML + CSS + JavaScript puro
- **Backend:** Supabase (Auth, Realtime, PostgreSQL)
- **Estilo:** Design próprio, suporte a dark/light mode
- **Hospedagem:** Cloudflare Workers + Static Assets
- **Som:** Clique sonoro toggleável

---

## ☁️ Cloudflare Workers (Deploy)

O site é hospedado no **Cloudflare Workers** usando **Static Assets**.

### URL do Worker
```
https://draft-copa-2026.typkun.workers.dev
```

### Domínio customizado
```
https://draft26.com.br/
```

### Configuração (`wrangler.jsonc`)

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "draft-copa-2026",
  "main": "src/worker.js",
  "compatibility_date": "2026-07-08",
  "assets": {
    "directory": "Draft Copa Do Mundo 2026",
    "binding": "ASSETS",
    "not_found_handling": "single-page-application"
  }
}
```

A pasta `Draft Copa Do Mundo 2026/` contém todos os arquivos estáticos do site (HTML, CSS, JS, imagens). O Worker (`src/worker.js`) apenas serve esses assets:

```js
export default {
  async fetch(request, env, ctx) {
    return env.ASSETS.fetch(request);
  }
};
```

### Como fazer deploy manual

```bash
cd C:\draft-copa-do-mundo-2026
npx wrangler deploy
```

### Deploy automático via GitHub

Um token de API do Cloudflare está configurado no repositório para deploy via GitHub Actions (opcional).

### Migração do Cloudflare Pages

> **Histórico:** O site estava originalmente no Cloudflare Pages, mas o Pages não estava publicando os arquivos estáticos corretamente via Git Integration (os builds passavam mas os deployments ficavam vazios). Migramos para Workers Static Assets, que é a abordagem recomendada atualmente pela Cloudflare para projetos novos. A migration incluiu:
> - Criação do `wrangler.jsonc` com configuração de assets
> - Criação do `src/worker.js` (servidor HTTP mínimo)
> - Deploy via `npx wrangler deploy`
> - Domínio `draft26.com.br` apontado para o Worker

---

## 📁 Estrutura do Projeto

```
draft-copa-do-mundo-2026/
├── wrangler.jsonc              → Config do Cloudflare Worker
├── src/worker.js               → Worker script (serve assets)
├── Draft Copa Do Mundo 2026/   → Site (HTML/CSS/JS)
│   ├── index.html              → Página principal
│   ├── script.js               → Lógica do jogo (draft, mata-mata)
│   ├── multiplayer.js          → Modo multiplayer (Supabase Realtime)
│   ├── auth.js                 → Login, registro, admin, monitor de nível
│   ├── style.css               → Estilos completos (light/dark)
│   ├── supabase-config.js      → Configuração do Supabase
│   ├── auth.sql                → SQL para configurar o banco
│   └── assets/                 → Logos, ícones, bandeiras
├── Draft-Copa-Do-Mundo-SaveEditor/  → Ferramenta C# para importar no FC26
└── README.md
```

---

## ⚡ Como Usar

1. **Abrir o app** — `https://draft26.com.br/`
2. **Logar / Registrar** — ou continuar como convidado
3. **Offline** — configurar draft local com amigos no mesmo PC
4. **Multiplayer** — criar sala (Admin apenas) ou entrar com código
5. **Draft** — cada participante escolhe jogadores para seu time
6. **Exportar** — gerar JSON e importar no EA FC 26 via SaveEditor

---

## 🗄️ Configuração do Banco (Supabase)

Para ativar o sistema de contas e níveis, execute o `auth.sql` no **Supabase Dashboard → SQL Editor**.

Isso cria:
- Tabela `profiles` (níveis de usuário)
- Trigger automático para novos cadastros
- RLS policies para segurança
- Define o Admin pelo email

### Publicações Realtime

Para as notificações de nível e multiplayer funcionarem, a publicação `supabase_realtime` precisa ter as tabelas marcadas:

- ✅ `profiles`
- ✅ `rooms`
- ✅ `room_players`

(Vá em **Supabase Dashboard → Database → Publications → supabase_realtime**)

---

## 🔧 Manutenção

**Adicionar Premium:**
No Painel Admin (botão 👑 flutuante), ou no Supabase SQL Editor:
```sql
UPDATE profiles SET level = 'premium' WHERE email = 'email@exemplo.com';
```

**Adicionar Admin:**
```sql
UPDATE profiles SET level = 'admin' WHERE email = 'email@exemplo.com';
```

**Obter API Token do Cloudflare:**
O token de API pode ser gerenciado em [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens). Permissões necessárias:
- `Workers Scripts:Edit`
- `Workers R2 Storage:Edit`
- `Cloudflare Pages:Edit` (caso ainda use Pages)

---

## 📝 Changelog

### 08/07/2026
- ✅ Migração de Cloudflare Pages → Workers Static Assets
- ✅ Notificação de nível refatorada (agora notifica qualquer alteração, não só level up)
- ✅ Designs dos modais padronizados com o tema do site
- ✅ Monitor de nível via Realtime (com logs de debug no console)

### 06-07/07/2026
- ✅ Sistema de login/registro (email + Google)
- ✅ 3 níveis de privilégio (Admin, Premium, Comum)
- ✅ Painel Admin para gerenciar usuários
- ✅ Tela dedicada "Salas Abertas" com refresh
- ✅ Som de clique e notificação de level up

---

## 👤 Créditos

Desenvolvido por: **Guilherme (@typ-kun)**  
Julho de 2026
