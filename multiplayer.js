// ======================
// MULTIPLAYER - DRAFT COPA 2026
// ======================

const MODO = {
    OFFLINE: "offline",
    ONLINE_MODERATOR: "online_moderator",
    ONLINE_PLAYER: "online_player"
};

let modoAtual = MODO.OFFLINE;
let mpState = {
    roomId: null,
    roomCode: null,
    playerId: null,
    isModerator: false,
    moderadorPresente: null,
    channel: null,
    players: [],
    settings: {},
    roomStatus: "waiting"
};

// ─── SALAS ───────────────────────────────────────────────────────────────────

async function mpCriarSala(playerName) {
    const supabase = initSupabase();
    if (!supabase) return { erro: "Supabase não configurado. Configure o supabase-config.js primeiro." };

    const code = gerarCodigoSala();

    // Usar um UUID temporário pro moderator_id (o Supabase gera o id da room)
    const tempModId = crypto.randomUUID();

    const { data: room, error } = await supabase
        .from("rooms")
        .insert({
            code,
            moderator_id: tempModId,
            status: "waiting",
            settings: {}
        })
        .select()
        .single();

    if (error) return { erro: error.message };

    // Adicionar criador como moderador
    const { data: player, error: pErr } = await supabase
        .from("room_players")
        .insert({
            room_id: room.id,
            player_name: playerName,
            is_moderator: true,
            player_order: 0
        })
        .select()
        .single();

    if (pErr) {
        // Limpar sala se falhou
        await supabase.from("rooms").delete().eq("id", room.id);
        return { erro: pErr.message };
    }

    mpState.roomId = room.id;
    mpState.roomCode = code;
    mpState.playerId = player.id;
    mpState.isModerator = true;
    modoAtual = MODO.ONLINE_MODERATOR;
    mpMarcarMultiplayer();

    return { room, player, code };
}

async function mpEntrarSala(code, playerName) {
    const supabase = initSupabase();
    if (!supabase) return { erro: "Supabase não configurado. Configure o supabase-config.js primeiro." };

    const { data: rooms, error: rErr } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", code.toUpperCase())
        .limit(1);

    if (rErr) return { erro: rErr.message };
    if (!rooms || rooms.length === 0) return { erro: "Sala não encontrada" };

    const room = rooms[0];
    // Permitir entrar mesmo se já iniciou (para reconectar após F5)
    const statusPermitido = room.status === "waiting" || room.status === "configuring";
    if (!statusPermitido) {
        // Se já finalizou, ainda permite entrar como espectador
        if (room.status !== "results" && room.status !== "knockout" && room.status !== "drafting") {
            return { erro: "Sala indisponível" };
        }
    }

    // Verificar se este jogador já existia na sala (reconexão após F5)
    const { data: existing, error: eErr } = await supabase
        .from("room_players")
        .select("*")
        .eq("room_id", room.id);

    if (eErr) return { erro: eErr.message };

    // Verificar se já sou um jogador existente (reconexão)
    const meuRegistroExistente = existing ? existing.find(p => p.player_name === playerName) : null;

    if (meuRegistroExistente) {
        // Já existia → reutilizar o registro (preserva is_moderator original)
        mpState.roomId = room.id;
        mpState.roomCode = code;
        mpState.playerId = meuRegistroExistente.id;
        mpState.isModerator = meuRegistroExistente.is_moderator;
        modoAtual = meuRegistroExistente.is_moderator ? MODO.ONLINE_MODERATOR : MODO.ONLINE_PLAYER;
        mpMarcarMultiplayer();
        return { room, player: meuRegistroExistente, code };
    }

    // Novo jogador
    const playerOrder = existing ? existing.length : 0;

    const { data: player, error: pErr } = await supabase
        .from("room_players")
        .insert({
            room_id: room.id,
            player_name: playerName,
            is_moderator: false,
            player_order: playerOrder
        })
        .select()
        .single();

    if (pErr) return { erro: pErr.message };

    mpState.roomId = room.id;
    mpState.roomCode = code;
    mpState.playerId = player.id;
    mpState.isModerator = false;
    modoAtual = MODO.ONLINE_PLAYER;
    mpMarcarMultiplayer();

    return { room, player, code };
}

// ─── LOBBY ────────────────────────────────────────────────────────────────────

function mpIniciarLobby() {
    const supabase = initSupabase();
    if (!supabase || !mpState.roomId) return;

    if (mpState.channel) return;

    const channel = supabase.channel(`room:${mpState.roomId}`, {
        config: {
            presence: { key: mpState.playerId },
            broadcast: { self: false }
        }
    });

    // ── Presence (jogadores online) ──
    channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const allPlayers = Object.values(state).flatMap(p => p);
        const seen = new Set();
        mpState.players = allPlayers.filter(p => {
            if (seen.has(p.player_id)) return false;
            seen.add(p.player_id);
            return true;
        });
        // Verificar se o moderador ainda está online
        mpState.moderadorPresente = mpState.players.some(p => p.is_moderator);
        mpRenderizarLobby();
    });

    channel.on("presence", { event: "join" }, ({ newPresences }) => {
        newPresences.forEach(p => {
            toast(`🎮 ${p.player_name} entrou na sala!`, 2500);
        });
    });

    channel.on("presence", { event: "leave" }, ({ leftPresences }) => {
        leftPresences.forEach(p => {
            toast(`👋 ${p.player_name} saiu da sala.`, 2500);
            // Se o moderador saiu, kickar todos
            if (p.is_moderator && !mpState.isModerator) {
                toast(`🛡️ O moderador saiu. Voltando ao menu...`, 3000);
                setTimeout(() => {
                    mpKickarJogador();
                }, 2000);
            }
        });
    });

    // ── Broadcast ──
    channel.on("broadcast", { event: "draft_start" }, (payload) => {
        mpReceberDraftStart(payload.payload);
    });

    channel.on("broadcast", { event: "country_picked" }, (payload) => {
        mpReceberPickPais(payload.payload);
    });

    channel.on("broadcast", { event: "player_picked" }, (payload) => {
        mpReceberPickJogador(payload.payload);
    });

    channel.on("broadcast", { event: "enter_mata_mata" }, (payload) => {
        if (!mpState.isModerator && payload.payload && payload.payload.mataMata) {
            mataMata = payload.payload.mataMata;
            salvarMataMata();
            mostrarMataMata();
        }
    });

    channel.on("broadcast", { event: "moderator_left" }, () => {
        if (!mpState.isModerator) {
            toast(`🛡️ O moderador encerrou a sessão. Voltando ao menu...`, 3000);
            setTimeout(() => {
                mpKickarJogador();
            }, 2000);
        }
    });

    channel.on("broadcast", { event: "mata_mata_sync" }, (payload) => {
        if (modoAtual !== MODO.OFFLINE && !mpState.isModerator) {
            mpReceberMataMataSync(payload.payload);
            // Reforçar desabilitar após render
            setTimeout(() => {
                if (typeof mpDesabilitarMataMata === "function") mpDesabilitarMataMata();
            }, 300);
        }
    });

    channel.on("broadcast", { event: "pool_sync" }, (payload) => {
        poolAtual = payload.payload.pool;
        renderizarPool();
        // Sincronizar refreshes do jogador da vez
        if (payload.payload.refreshesRestantes !== undefined) {
            refreshesPorJogador[jogadorAtual] = payload.payload.refreshesRestantes;
            atualizarRefreshes();
        }
        mpAtualizarTurnoUI();
    });

    // ── Postgres CDC (mudanças na sala) ──
    channel.on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "rooms",
        filter: `id=eq.${mpState.roomId}`
    }, (payload) => {
        mpState.settings = payload.new.settings || {};
        mpState.roomStatus = payload.new.status;
        mpRenderizarLobby();
    });

    channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
            await channel.track({
                player_id: mpState.playerId,
                player_name: localStorage.getItem(PRE_MENU_KEY) || "Anônimo",
                is_moderator: mpState.isModerator
            });
        }
    });

    // Buscar estado atual da sala (útil após F5)
    supabase.from("rooms").select("*").eq("id", mpState.roomId).single().then(({ data }) => {
        if (!data) return;
        mpState.settings = data.settings || {};
        mpState.roomStatus = data.status;
        if (!data.settings || !data.settings.mataMata) return;

        mataMata = data.settings.mataMata;
        salvarMataMata();
        if (data.settings.resultadosDraft) {
            const r = data.settings.resultadosDraft;
            if (r.nomesJogadores) nomesJogadores = r.nomesJogadores;
            if (r.times) times = r.times;
            if (r.paisParticipante) paisParticipante = r.paisParticipante;
        }

        // Ir direto pro mata-mata usando a função original
        // (que cuida de mostrar/esconder seções corretamente)
        config.startingPhase = mpState.settings.startingPhase || "round32";
        config.playersPerTeam = mpState.settings.playersPerTeam || 18;
        mostrarMataMata();
        // Reforçar proteções
        if (!mpState.isModerator && typeof mpDesabilitarMataMata === "function") {
            setTimeout(() => mpDesabilitarMataMata(), 300);
        }
    });

    mpState.channel = channel;
}

function mpSairSala() {
    mpDesmarcarMultiplayer();
    if (mpState.channel) {
        const supabase = initSupabase();
        if (supabase) supabase.removeChannel(mpState.channel);
        mpState.channel = null;
    }
    mpState.roomId = null;
    mpState.roomCode = null;
    mpState.playerId = null;
    mpState.isModerator = false;
    mpState.players = [];
    mpState.settings = {};
    modoAtual = MODO.OFFLINE;
}

// ─── LOBBY UI ────────────────────────────────────────────────────────────────

function mpRenderizarLobby() {
    // Código da sala
    const codeEl = document.getElementById("lobbyCode");
    if (codeEl && mpState.roomCode) {
        codeEl.textContent = mpState.roomCode;
        codeEl.title = "Clique para copiar";
    }

    // Lista de jogadores
    const listEl = document.getElementById("lobbyPlayers");
    if (!listEl) return;

    if (mpState.players.length === 0) {
        listEl.innerHTML = '<div class="lobby-empty">Nenhum jogador conectado</div>';
    } else {
        listEl.innerHTML = mpState.players.map(p => `
            <div class="lobby-player">
                <span>${p.player_name}</span>
                ${p.is_moderator ? '<span class="lobby-player-moderator">🛡️ Moderador</span>' : ''}
                <span style="margin-left:auto;font-size:12px;color:var(--muted);font-family:var(--body);">🟢 online</span>
            </div>
        `).join("");
    }

    // Moderador vê botão de configurar / iniciar
    const modArea = document.getElementById("lobbyModArea");
    const waitArea = document.getElementById("lobbyWaitArea");
    const configBtn = document.getElementById("btnConfigurarDraft");
    const startBtn = document.getElementById("btnIniciarDraft");
    const resumeBtn = document.getElementById("btnResumeMataMata");
    if (modArea && waitArea) {
        if (mpState.isModerator) {
            modArea.style.display = "block";
            waitArea.style.display = "none";
            // Se já tem configuração salva, mostrar "Iniciar Draft"
            const temConfig = mpState.settings && Object.keys(mpState.settings).length > 0;
            const temMataMata = mpState.settings && mpState.settings.mataMata;
            if (configBtn) configBtn.style.display = temConfig && !temMataMata ? "none" : "block";
            if (startBtn) startBtn.style.display = temConfig && !temMataMata ? "block" : "none";
            // Mostrar botão de continuar mata-mata para todos se houver dados
            if (resumeBtn) {
                resumeBtn.style.display = temMataMata ? "block" : "none";
            }
        } else {
            modArea.style.display = "none";
            waitArea.style.display = "block";
            const waitText = waitArea.querySelector(".lobby-waiting");
            if (waitText) {
                if (temMataMata) {
                    waitText.textContent = "O mata-mata está em andamento. Clique em 'Continuar Mata-Mata' acima.";
                    // Mostrar botão para P2 também
                    if (resumeBtn) resumeBtn.style.display = "block";
                } else if (mpState.roomStatus === "configuring" || (mpState.settings && Object.keys(mpState.settings).length > 0)) {
                    waitText.textContent = "O moderador está configurando o draft...";
                } else {
                    waitText.textContent = "Aguardando o moderador configurar o draft...";
                }
            }
        }
    }
}

// ─── NAVEGAÇÃO DE SALAS ───────────────────────────────────────────────────────

function mpAbrirMenuSalas() {
    document.getElementById("preMenu").style.display = "none";
    document.getElementById("roomMenu").style.display = "block";
    document.getElementById("roomStatus").textContent = "";
    document.getElementById("inputCodigoSala").value = "";
    const stepsBar = document.getElementById("stepsBar");
    if (stepsBar) stepsBar.style.display = "none";
}

function mpFecharMenuSalas() {
    document.getElementById("roomMenu").style.display = "none";
    document.getElementById("preMenu").style.display = "block";
}

function mpAbrirLobby() {
    // Esconder tudo que não é lobby
    ["roomMenu", "setup", "countrySelection", "draftArea", "resultsArea", "mataMataArea"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
    });
    document.getElementById("lobby").style.display = "block";
    mpIniciarLobby();
}

function mpFecharLobby() {
    mpSairSala();
    document.getElementById("lobby").style.display = "none";
    document.getElementById("preMenu").style.display = "block";
    const stepsBar = document.getElementById("stepsBar");
    if (stepsBar) stepsBar.style.display = "none";
    iniciarPreMenu();
}

// ─── CONFIGURAÇÃO DO DRAFT (moderador) ────────────────────────────────────────

function mpAbrirConfig() {
    document.getElementById("lobby").style.display = "none";
    document.getElementById("draftConfig").style.display = "block";
    // Mostrar/esconder chance de icon conforme modo
    const iconsSelect = document.getElementById("mpIconsHeroesMode");
    const chanceContainer = document.getElementById("mpSpecialChanceContainer");
    if (iconsSelect && chanceContainer) {
        chanceContainer.style.display = iconsSelect.value === "none" ? "none" : "block";
        iconsSelect.addEventListener("change", () => {
            chanceContainer.style.display = iconsSelect.value === "none" ? "none" : "block";
        });
    }
}

function mpFecharConfig() {
    document.getElementById("draftConfig").style.display = "none";
    document.getElementById("lobby").style.display = "block";
}

async function mpSalvarConfig() {
    const supabase = initSupabase();
    if (!supabase || !mpState.roomId) return;

    const settings = {
        draftMode: document.getElementById("mpDraftMode").value,
        startingPhase: document.getElementById("mpStartingPhase").value,
        goalkeeperRule: document.getElementById("mpGoalkeeperRule").value === "on",
        playersPerTeam: parseInt(document.getElementById("mpPlayersPerTeam").value) || 18,
        refreshCount: parseInt(document.getElementById("mpRefreshCount").value) || 2,
        iconsHeroesMode: document.getElementById("mpIconsHeroesMode").value,
        poolSpecialChance: parseFloat(document.getElementById("mpSpecialChance").value || "1") / 100
    };

    const { error } = await supabase
        .from("rooms")
        .update({ settings, status: "configuring" })
        .eq("id", mpState.roomId);

    if (error) {
        toast("❌ Erro ao salvar: " + error.message, 3000);
        return;
    }

    mpState.settings = settings;
    mpState.roomStatus = "configuring";
    toast("✅ Configuração salva!", 2000);
    mpFecharConfig();
}

async function mpIniciarDraftOnline() {
    const supabase = initSupabase();
    if (!supabase || !mpState.roomId) return;

    // Atualizar status da sala para "drafting"
    await supabase
        .from("rooms")
        .update({ status: "drafting" })
        .eq("id", mpState.roomId);

    // Buscar todos os jogadores da sala
    const { data: players } = await supabase
        .from("room_players")
        .select("*")
        .eq("room_id", mpState.roomId)
        .order("player_order");

    if (!players || players.length === 0) return;

    // Gerar ordem embaralhada (moderador define, todos usam a mesma)
    const ordemEmbaralhada = [...players.map((_, i) => i)];
    for (let i = ordemEmbaralhada.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ordemEmbaralhada[i], ordemEmbaralhada[j]] = [ordemEmbaralhada[j], ordemEmbaralhada[i]];
    }

    // Broadcast para todos iniciarem o draft
    if (mpState.channel) {
        mpState.channel.send({
            type: "broadcast",
            event: "draft_start",
            payload: { settings: mpState.settings, players, ordemEmbaralhada }
        });
    }

    // Iniciar o draft localmente (moderador) com as settings
    mpArrancarDraft(players, ordemEmbaralhada, mpState.settings);
}

// ─── RECEPÇÃO DE BROADCASTS ───────────────────────────────────────────────────

function mpReceberDraftStart(payload) {
    if (modoAtual === MODO.ONLINE_PLAYER) {
        mpArrancarDraft(payload.players, payload.ordemEmbaralhada, payload.settings);
    }
}

function mpArrancarDraft(players, ordemEmbaralhada, settingsOverride) {
    const nomes = players.map(p => p.player_name);
    const qtd = nomes.length;

    // Descobrir qual índice sou eu
    const meuNome = (document.getElementById("prePlayerName")?.value || localStorage.getItem(PRE_MENU_KEY) || "").trim();
    mpState.myPlayerIndex = players.findIndex(p => p.player_name === meuNome);
    if (mpState.myPlayerIndex < 0) mpState.myPlayerIndex = 0;

    // Usar settings do broadcast (multiplayer) ou do mpState
    const s = settingsOverride || mpState.settings || {};
    config.draftMode = s.draftMode || "snake";
    // Travar o modo do draft para multiplayer (evita que seja sobrescrito)
    mpState.draftModeLocked = config.draftMode;
    config.startingPhase = s.startingPhase || "round32";
    config.goalkeeperRule = s.goalkeeperRule !== false;
    config.playersPerTeam = s.playersPerTeam || 18;
    config.refreshCount = s.refreshCount || 2;
    config.iconsHeroesMode = s.iconsHeroesMode || "none";
    config.poolSpecialChance = s.poolSpecialChance || 0.01;

    // Montar jogadores disponíveis (igual ao iniciarDraft offline)
    let base = [...jogadoresBase];
    if (config.iconsHeroesMode !== "none") {
        const especiais = iconsHeroesBase.filter(j => {
            if (config.iconsHeroesMode === "icons") return j.tipo === "icon";
            if (config.iconsHeroesMode === "heroes") return j.tipo === "hero";
            return true;
        });
        base = base.concat(especiais);
    }

    jogadoresDisponiveis = [...base];
    poolAtual = [];
    nomesJogadores = nomes;
    times = nomes.map(() => []);
    refreshesPorJogador = nomes.map(() => config.refreshCount);
    paisParticipante = [];
    paisesCpu = [...new Set(jogadoresBase.map(j => j.pais))].sort();

    // Participantes ativos — usar ordem definida pelo moderador
    participantesAtivos = ordemEmbaralhada || nomes.map((_, i) => i);

    jogadorAtual = participantesAtivos[0] ?? 0;
    pickAtual = 1;
    direcaoSnake = 1;

    // Esconder lobby/config, mostrar draft
    document.getElementById("lobby").style.display = "none";
    document.getElementById("draftConfig").style.display = "none";
    document.getElementById("preMenu").style.display = "none";
    document.getElementById("setup").style.display = "none";
    document.getElementById("draftArea").style.display = "block";
    document.getElementById("countrySelection").style.display = "block";

    // Iniciar seleção de países
    iniciarSelecaoPaises();

    const stepsBar = document.getElementById("stepsBar");
    if (stepsBar) stepsBar.style.display = "";
}

// ─── CRIAÇÃO / ENTRADA ────────────────────────────────────────────────────────

async function mpHandleCriarSala() {
    const statusEl = document.getElementById("roomStatus");
    // Tentar ler do input do pré-menu primeiro, depois do localStorage
    const inputNome = document.getElementById("prePlayerName");
    const nome = (inputNome ? inputNome.value.trim() : "") || (localStorage.getItem(PRE_MENU_KEY) || "").trim();
    if (!nome) {
        statusEl.textContent = "⚠️ Defina seu nome no pré-menu primeiro.";
        return;
    }
    // Garantir que está salvo
    localStorage.setItem(PRE_MENU_KEY, nome);

    statusEl.textContent = "🔄 Criando sala...";

    const result = await mpCriarSala(nome);
    if (result.erro) {
        statusEl.textContent = "❌ " + result.erro;
        return;
    }

    statusEl.textContent = "";
    mpAbrirLobby();
}

async function mpHandleEntrarSala() {
    const statusEl = document.getElementById("roomStatus");
    const input = document.getElementById("inputCodigoSala");
    const code = (input.value || "").trim().toUpperCase();
    const inputNome = document.getElementById("prePlayerName");
    const nome = (inputNome ? inputNome.value.trim() : "") || (localStorage.getItem(PRE_MENU_KEY) || "").trim();

    if (!code) {
        statusEl.textContent = "⚠️ Digite o código da sala.";
        return;
    }
    if (!nome) {
        statusEl.textContent = "⚠️ Defina seu nome no pré-menu primeiro.";
        return;
    }
    localStorage.setItem(PRE_MENU_KEY, nome);

    statusEl.textContent = "🔄 Entrando na sala...";

    const result = await mpEntrarSala(code, nome);
    if (result.erro) {
        statusEl.textContent = "❌ " + result.erro;
        return;
    }

    statusEl.textContent = "";
    mpAbrirLobby();
}

// ─── UTILIDADES ───────────────────────────────────────────────────────────────

// ─── MATA-MATA ────────────────────────────────────────────────────────────────

function mpBroadcastMataMata() {
    if (modoAtual === MODO.OFFLINE || !mpState.channel || !mpState.isModerator) return;
    if (!mataMata) return;
    // Salvar resultados do draft + mataMata no Supabase
    const supabase = initSupabase();
    if (supabase) {
        const resultadosDraft = {
            nomesJogadores: typeof nomesJogadores !== "undefined" ? nomesJogadores : [],
            times: typeof times !== "undefined" ? times.map(t => t.map(j => ({
                nome: j.nome, pais: j.pais, posicao: j.posicao,
                playerid: j.playerid || null, nomeCompleto: j.nomeCompleto || null,
                tipo: j.tipo || null
            }))) : [],
            paisParticipante: typeof paisParticipante !== "undefined" ? paisParticipante : []
        };
        supabase.from("rooms").update({
            settings: { ...mpState.settings, mataMata, resultadosDraft }
        }).eq("id", mpState.roomId).then().catch(() => {});
    }
    mpState.channel.send({
        type: "broadcast",
        event: "mata_mata_sync",
        payload: { mataMata }
    });
}

// Ao receber sync do mata-mata, salvar no localStorage
function mpReceberMataMataSync(payload) {
    if (!payload || !payload.mataMata) return;
    mataMata = payload.mataMata;
    salvarMataMata();
    mostrarMataMata();
}

// ─── OBSERVADOR DE MUTAÇÃO: desabilita novos elementos automaticamente ───────

let mpObserverAtivo = false;
let mpObserver = null;

function mpAtivarObserver() {
    if (mpObserver) mpObserver.disconnect();
    const alvo = document.getElementById("mataMataArea") || document.getElementById("resultsArea");
    if (!alvo) return;

    mpObserver = new MutationObserver(() => {
        if (modoAtual !== MODO.OFFLINE && !mpState.isModerator) {
            mpDesabilitarMataMataAgora();
            mpObserverAtivo = true;
        }
    });

    mpObserver.observe(alvo, { childList: true, subtree: true });
}

function mpDesabilitarMataMataAgora() {
    // ── Esconder TODOS os botões de ação ──
    const esconder = [
        "sortearMataMata", "resetarTudo", "sortearProximo", "sortearTodos",
        "backToDraft"
    ];
    esconder.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
    });

    // ── Desabilitar inputs de placar ──
    document.querySelectorAll("#mataMataBracket input, #mataMataArea input[type='number']").forEach(inp => {
        inp.disabled = true;
    });

    // ── Desabilitar TODOS os botões no bracket ──
    document.querySelectorAll("#mataMataBracket button, .mata-actions button, .btn-sortear-um, .btn-sortear-todos, .btn-reset").forEach(btn => {
        btn.disabled = true;
    });
}

function mpDesabilitarMataMata() {
    if (modoAtual === MODO.OFFLINE || mpState.isModerator) return;
    mpDesabilitarMataMataAgora();
    mpAtivarObserver();
}

function mpDesabilitarResults() {
    if (modoAtual === MODO.OFFLINE || mpState.isModerator) return;
    const btnRefazer = document.getElementById("backToDraft");
    if (btnRefazer) btnRefazer.style.display = "none";
    mpAtivarObserver();
}

// ─── INTERCEPTADOR GLOBAL: bloqueia cliques no mata-mata para não-moderadores ──

document.addEventListener("click", function (e) {
    if (modoAtual === MODO.OFFLINE || mpState.isModerator) return;
    // Se clicou em algo dentro do mata-mata ou resultados, bloquear ação
    const areaMata = document.getElementById("mataMataArea");
    const areaResults = document.getElementById("resultsArea");
    const alvo = e.target.closest("#mataMataArea, #resultsArea");
    if (!alvo) return;

    // Botoes liberados para não-moderadores
    const liberados = ["backToResults", "exportDraft", "goToMataMata", "resetFromResults"];
    if (liberados.includes(e.target.id)) return;

    // Qualquer outro clique em área restrita → bloquear
    if (e.target.tagName === "BUTTON" || e.target.closest("button")) {
        e.preventDefault();
        e.stopPropagation();
        toast("⛔ Apenas o moderador pode fazer isso.", 2000);
        return false;
    }
}, true); // usar capture phase para interceptar antes

function gerarCodigoSala() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

// ─── SINCRONIZAR POOL ─────────────────────────────────────────────────────────

function mpBroadcastPool(force) {
    if (modoAtual === MODO.OFFLINE || !mpState.channel) return;
    if (!poolAtual || poolAtual.length === 0) return;
    // Só quem está na vez broadcasta (a menos que force=true, usado na inicialização)
    if (!force && mpState.myPlayerIndex !== jogadorAtual) {
        return;
    }
    mpState.channel.send({
        type: "broadcast",
        event: "pool_sync",
        payload: {
            refreshesRestantes: refreshesPorJogador[jogadorAtual] ?? 0,
            pool: poolAtual.map(j => ({
                nome: j.nome, pais: j.pais, posicao: j.posicao,
                playerid: j.playerid || null, nomeCompleto: j.nomeCompleto || null,
                tipo: j.tipo || null
            }))
        }
    });
}

// ─── FLAG MULTIPLAYER ─────────────────────────────────────────────────────────

const MP_FLAG_KEY = "draft2026_wasMultiplayer";

function mpMarcarMultiplayer() {
    localStorage.setItem(MP_FLAG_KEY, "1");
}

function mpDesmarcarMultiplayer() {
    localStorage.removeItem(MP_FLAG_KEY);
}

function mpFoiMultiplayer() {
    return localStorage.getItem(MP_FLAG_KEY) === "1";
}

// ─── KICKAR JOGADOR ───────────────────────────────────────────────────────────

function mpKickarJogador() {
    mpSairSala();
    // Esconder todas as seções do jogo
    ["draftArea", "countrySelection", "resultsArea", "mataMataArea", "lobby", "draftConfig", "roomMenu"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
    });
    const setup = document.getElementById("setup");
    if (setup) setup.style.display = "none";
    // Mostrar pré-menu
    const preMenu = document.getElementById("preMenu");
    if (preMenu) preMenu.style.display = "block";
    const stepsBar = document.getElementById("stepsBar");
    if (stepsBar) stepsBar.style.display = "none";
    iniciarPreMenu();
}

// ─── RECEPÇÃO DE PICKS (multiplayer) ──────────────────────────────────────────

function mpReceberPickPais(data) {
    if (modoAtual === MODO.OFFLINE) return;
    const { pais } = data;
    const paises = [...new Set(jogadoresBase.map(j => j.pais))].sort();
    // Processar diretamente (já estamos recebendo de quem fez o pick)
    const jogadorIdx = ordemSelecao[indiceSelecao];
    paisParticipante[jogadorIdx] = pais;
    indiceSelecao++;

    if (indiceSelecao >= nomesJogadores.length) {
        prosseguirParaDraft();
        return;
    }
    renderizarGridPaises(paises);
}

function mpReceberPickJogador(data) {
    if (modoAtual === MODO.OFFLINE) return;
    const { jogador, pickerIndex, nextJogadorAtual, direcaoSnake: dirSync, pool, refreshesRestantes } = data;

    // Sincronizar direção do snake e refreshes
    if (dirSync !== undefined) direcaoSnake = dirSync;

    // Sincronizar refreshes do próximo jogador
    if (refreshesRestantes !== undefined) {
        refreshesPorJogador[nextJogadorAtual] = refreshesRestantes;
    }

    // Adicionar jogador ao time do picker
    times[pickerIndex].push(jogador);
    jogadoresDisponiveis = jogadoresDisponiveis.filter(p =>
        !(p.nome === jogador.nome && p.pais === jogador.pais)
    );

    // Sincronizar jogadorAtual para o próximo (sender já avançou)
    jogadorAtual = nextJogadorAtual;

    // Remover picker dos ativos se completou o time
    if (participanteCompleto(pickerIndex)) {
        participantesAtivos = participantesAtivos.filter(p => p !== pickerIndex);
    }

    atualizarTimes();

    if (todosCompletos()) {
        mostrarResultadoFinal();
        return;
    }

    pickAtual++;

    // Verificar se o jogo acabou (pool vazio = último pick)
    if (todosCompletos()) {
        mostrarResultadoFinal();
        return;
    }

    // Usar o pool recebido (é o mesmo para todos os jogadores)
    if (pool && pool.length > 0) {
        poolAtual = pool;
        renderizarPool();
    } else {
        gerarPool();
    }

    atualizarStatus();
    atualizarRefreshes();
    salvarEstadoDraft();

    // Timer só pro jogador da vez
    const souEu = mpState.myPlayerIndex === jogadorAtual;
    if (souEu) {
        iniciarTimer(TIMER_DRAFT, autoPickJogador);
    }
}

// ─── CONTROLE DE TURNO (PAÍSES) ───────────────────────────────────────────────

function mpControlarTurnoPaises() {
    if (modoAtual === MODO.OFFLINE) return;

    const jogadorIdx = ordemSelecao[indiceSelecao];
    const ehMinhaVez = jogadorIdx === mpState.myPlayerIndex;

    const cards = document.querySelectorAll("#countryGrid .country-card:not(.is-taken)");
    cards.forEach(card => {
        if (ehMinhaVez) {
            card.style.pointerEvents = "auto";
            card.style.opacity = "1";
            card.style.cursor = "pointer";
        } else {
            card.style.pointerEvents = "none";
            card.style.opacity = "0.4";
            card.style.cursor = "default";
        }
    });

    // Atualizar texto do turno
    const turno = document.getElementById("csTurn");
    if (turno && !ehMinhaVez) {
        const nome = nomesJogadores[jogadorIdx] || "—";
        turno.innerHTML = `Vez de: <span class="cs-player">${nome}</span> <span style="color:var(--accent);font-weight:700;">(Aguardando...)</span>`;
    }

    // Timer só para quem é a vez
    if (!ehMinhaVez) {
        pararTimer();
    }
}

// ─── CONTROLE DE TURNO (UI) ───────────────────────────────────────────────────

function mpAtualizarTurnoUI() {
    if (modoAtual === MODO.OFFLINE) return;

    const ehMinhaVez = mpState.myPlayerIndex === jogadorAtual;

    // Controles do pool (draft)
    const poolCards = document.querySelectorAll("#poolList .player-card");
    poolCards.forEach(card => {
        if (ehMinhaVez) {
            card.style.pointerEvents = "auto";
            card.style.opacity = "1";
        } else {
            card.style.pointerEvents = "none";
            card.style.opacity = "0.4";
        }
    });

    // Botão de refresh
    const refreshBtn = document.getElementById("refreshBtn");
    if (refreshBtn) {
        refreshBtn.disabled = !ehMinhaVez;
        refreshBtn.style.opacity = ehMinhaVez ? "1" : "0.4";
    }

    // Timer só para quem é a vez
    if (!ehMinhaVez) {
        pararTimer();
    }

    // Atualizar status
    const statusEl = document.getElementById("status");
    if (statusEl && !ehMinhaVez) {
        const textoAtual = statusEl.innerHTML;
        if (!textoAtual.includes("(Aguardando)")) {
            statusEl.innerHTML += ` <span style="color:var(--accent);font-weight:700;">(Aguardando...)</span>`;
        }
    }
}
