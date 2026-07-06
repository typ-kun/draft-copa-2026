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
- Alterar nível (Comum ↔ Premium)
- Apenas o Admin tem acesso

---

## 🛠️ Tecnologias

- **Frontend:** HTML + CSS + JavaScript puro
- **Backend:** Supabase (Auth, Realtime, PostgreSQL)
- **Estilo:** Design próprio, suporte a dark/light mode
- **Som:** Clique sonoro toggleável

---

## 📁 Estrutura do Projeto

```
draft-copa-do-mundo-2026/
├── Draft Copa Do Mundo 2026/
│   ├── index.html              → Página principal
│   ├── script.js               → Lógica do jogo (draft, mata-mata)
│   ├── multiplayer.js          → Modo multiplayer (Supabase Realtime)
│   ├── auth.js                 → Login, registro, admin
│   ├── style.css               → Estilos completos
│   ├── supabase-config.js      → Configuração do Supabase
│   ├── auth.sql                → SQL para configurar o banco
│   └── assets/                 → Logos, ícones, bandeiras
├── Draft-Copa-Do-Mundo-SaveEditor/  → Ferramenta C# para importar no FC26
└── README.md
```

---

## ⚡ Como Usar

1. **Abrir o app** — `Abrir Draft.bat` ou pelo GitHub Pages
2. **Logar / Registrar** — ou continuar como convidado
3. **Offline** — configurar draft local com amigos no mesmo PC
4. **Multiplayer** — criar sala (Admin/Premium) ou entrar com código
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

---

## 🔧 Manutenção

**Adicionar Premium:**
Edite `auth.js` e adicione o email no array `PREMIUM_EMAILS`, ou use o Painel Admin.

**Adicionar Admin:**
No Supabase SQL Editor:
```sql
UPDATE profiles SET level = 'admin' WHERE email = 'email@exemplo.com';
```

---

## 📝 Changelog (06/07/2026)

- ✅ Sistema de login/registro (email + Google)
- ✅ 3 níveis de privilégio (Admin, Premium, Comum)
- ✅ Painel Admin para gerenciar usuários
- ✅ Tela dedicada "Salas Abertas" com refresh
- ✅ Botão "Fechar Sala" e "Kickar jogador" no lobby
- ✅ Som de clique toggleável
- ✅ Toast melhor posicionado e estilizado
- ✅ Logo consistente entre telas
- ✅ Modo offline e criar sala bloqueados sem permissão
- ✅ Corrigido Neuer como jogador normal
- ✅ Copiar escalações funciona em mobile
