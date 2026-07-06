// ======================
// DRAFT COPA DO MUNDO V2
// ======================

// ─── SOM DE CLIQUE ──────────────────────────────────────────────────────────

let _audioCtx = null;

function playClickSound() {
    try {
        if (!_audioCtx) {
            _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        // Tocar o arquivo clicksound.mp3
        const audio = new Audio("clicksound.mp3");
        audio.volume = 0.5;
        audio.play().catch(() => {});
    } catch (_) {
        // Ignora se não conseguir tocar
    }
}

// Toca som em qualquer clique em botão
document.addEventListener("click", function (e) {
    if (e.target.tagName === "BUTTON" || e.target.closest("button")) {
        playClickSound();
    }
}, true); // usar capture phase para pegar antes dos handlers

// ─── TOAST ──────────────────────────────────────────────────────────────────

let _toastTimer = null;
function toast(msg, duration = 2500) {
    const el = document.getElementById("toast");
    if (!el) return;
    clearTimeout(_toastTimer);
    el.textContent = msg;
    el.classList.add("show");
    _toastTimer = setTimeout(() => el.classList.remove("show"), duration);
}

let jogadoresBase = [];
let iconsHeroesBase = [];
let jogadoresDisponiveis = [];
let poolAtual = [];

let nomesJogadores = [];
let times = [];
let refreshesPorJogador = [];

let participantesAtivos = [];

let paisesCpu = [];

let mataMata = null;

let jogadorAtual = 0;
let pickAtual = 1;

let direcaoSnake = 1;

let paisParticipante = [];
let ordemSelecao = [];
let indiceSelecao = 0;

// ======================
// PERSISTÊNCIA
// ======================

const DRAFT_STORAGE_KEY = "draftCopa2026Completo";

// ======================
// CONFIGURAÇÕES
// ======================

const config = {

    draftMode: "snake",

    startingPhase: "round32",

    goalkeeperRule: true,

    playersPerTeam: 18,

    refreshCount: 2,

    iconsHeroesMode: "none"

};

// ======================
// POSIÇÕES
// ======================

const POSICOES = {

    GK: "Goleiro",

    DF: "Defensor",

    MF: "Meio-Campista",

    FW: "Atacante"

};

const POSICOES_ABREV = {
    GK: "GK",
    DF: "DEF",
    MF: "MEI",
    FW: "ATA"
};

// ======================
// PRÉ-MENU
// ======================

const PRE_MENU_KEY = "draft2026_playerName";
const THEME_KEY = "draft2026_theme";

// ======================
// FUNÇÕES DO PRÉ-MENU
// ======================

function iniciarPreMenu() {
    // Carregar nome salvo
    const nomeSalvo = localStorage.getItem(PRE_MENU_KEY) || "";
    const inputNome = document.getElementById("prePlayerName");
    if (inputNome && nomeSalvo) {
        inputNome.value = nomeSalvo;
    }

    // Carregar tema salvo
    const temaSalvo = localStorage.getItem(THEME_KEY) || "light";
    alternarTema(temaSalvo);
    const toggle = document.getElementById("themeToggle");
    if (toggle) {
        toggle.checked = temaSalvo === "dark";
    }

    // Esconder barra de etapas e todas as seções de jogo no pré-menu
    const stepsBar = document.getElementById("stepsBar");
    if (stepsBar) stepsBar.style.display = "none";
    ["setup", "countrySelection", "draftArea", "resultsArea", "mataMataArea", "roomMenu", "lobby", "draftConfig"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
    });
}

function entrarModoOffline() {
    // Verificar se está logado ou em modo convidado
    const authOk = (typeof isAuthenticated === "function" && isAuthenticated()) || (typeof getAuthUser === "function" && getAuthUser());
    const guestOk = typeof authState !== "undefined" && authState && authState.isGuest;
    if (!authOk && !guestOk) {
        const statusEl = document.getElementById("preMenuStatus");
        if (statusEl) {
            statusEl.textContent = "⚠️ Faça login ou clique em 'Logar / Registrar' primeiro.";
            statusEl.classList.add("show");
            setTimeout(() => { statusEl.classList.remove("show"); }, 4000);
        }
        return;
    }

    // Salvar nome
    const nome = document.getElementById("prePlayerName").value.trim();
    if (nome) {
        localStorage.setItem(PRE_MENU_KEY, nome);
    }

    // Verificar se já existe um draft salvo
    const temDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (temDraft && carregarEstadoDraft()) {
        // Draft restaurado — esconder pré-menu, steps bar já aparece no carregarEstadoDraft
        document.getElementById("preMenu").style.display = "none";
        const stepsBar = document.getElementById("stepsBar");
        if (stepsBar) stepsBar.style.display = "";
        return;
    }

    // Esconder pré-menu, mostrar setup
    document.getElementById("preMenu").style.display = "none";
    document.getElementById("setup").style.display = "block";

    // Mostrar barra de etapas
    const stepsBar = document.getElementById("stepsBar");
    if (stepsBar) stepsBar.style.display = "";

    // Pré-preencher nome do jogador 1 no setup
    const input = document.getElementById("playerName1");
    if (input && nome) {
        input.value = nome;
    }

    setActiveStep(1);
}

function alternarTema(modo) {
    document.documentElement.dataset.theme = modo;
    localStorage.setItem(THEME_KEY, modo);
    const label = document.getElementById("themeLabel");
    if (label) {
        label.textContent = modo === "dark" ? "☀️ Modo claro" : "🌙 Modo escuro";
    }
    // Trocar logo para o tema
    const logos = document.querySelectorAll(".logo");
    logos.forEach(img => {
        img.src = modo === "dark"
            ? "assets/logo-darkmode.svg"
            : "assets/logo.svg";
    });
}

// ======================
// BANDEIRAS
// ======================

const CODIGOS_HLTV = {
    "Argentina":            "AR", "Argélia":           "DZ", "Austrália":         "AU",
    "Brasil":               "BR", "Bélgica":           "BE", "Bósnia e Herzegovina":"BA",
    "Cabo Verde":           "CV", "Canadá":            "CA", "Colômbia":          "CO",
    "Costa do Marfim":      "CI", "Croácia":           "HR", "Curaçao":           "CW",
    "República Tcheca":     "CZ", "Equador":           "EC", "Egito":             "EG",
    "Finlândia":            "FI", "Inglaterra":        "GB", "França":            "FR", "Alemanha":          "DE",
    "Gana":                 "GH", "Haiti":             "HT", "Irã":               "IR",
    "Itália":               "IT", "Iraque":           "IQ", "Japão":             "JP", "Jordânia":          "JO",
    "Coreia do Sul":        "KR", "México":            "MX", "Marrocos":          "MA",
    "Holanda":              "NL", "Nova Zelândia":     "NZ", "Noruega":           "NO",
    "Panamá":               "PA", "Paraguai":          "PY", "Portugal":          "PT",
    "Catar":                "QA", "RD Congo":          "CD", "Arábia Saudita":    "SA",
    "Escócia":              "GB", "Senegal":           "SN", "África do Sul":     "ZA",
    "Espanha":              "ES", "Suécia":            "SE", "Suíça":             "CH",
    "Tunísia":              "TN", "Turquia":           "TR", "Estados Unidos":    "US",
    "Uruguai":              "UY", "Uzbequistão":       "UZ", "Áustria":           "AT",
    "Bulgária":             "BG", "Chile":             "CL", "Dinamarca":         "DK",
    "Eslováquia":           "SK", "Gales":             "GB", "Hungria":           "HU",
    "Irlanda":              "IE", "Irlanda do Norte":  "GB", "Nigéria":           "NG",
    "Polônia":              "PL", "Romênia":           "RO", "Rússia":            "RU",
    "Sérvia":               "RS", "Ucrânia":           "UA",
};

const ABREVIACOES_PAISES = {
    "África do Sul": "RSA",
    "Alemanha": "ALE",
    "Arábia Saudita": "KSA",
    "Argélia": "ALG",
    "Argentina": "ARG",
    "Austrália": "AUS",
    "Áustria": "AUT",
    "Bélgica": "BEL",
    "Bósnia e Herzegovina": "BIH",
    "Cabo Verde": "CPV",
    "Canadá": "CAN",
    "Catar": "QAT",
    "Colômbia": "COL",
    "Coreia do Sul": "COR",
    "Costa do Marfim": "CIV",
    "Croácia": "CRO",
    "Curaçao": "CUR",
    "Egito": "EGI",
    "Equador": "EQU",
    "Escócia": "ESC",
    "Espanha": "ESP",
    "Estados Unidos": "EUA",
    "França": "FRA",
    "Gana": "GHA",
    "Haiti": "HAI",
    "Holanda": "HOL",
    "Inglaterra": "ING",
    "Itália": "ITA", "Irã": "IRA",
    "Iraque": "IRQ",
    "Japão": "JAP",
    "Jordânia": "JOR",
    "Marrocos": "MAR",
    "México": "MEX",
    "Noruega": "NOR",
    "Nova Zelândia": "NZL",
    "Panamá": "PAN",
    "Paraguai": "PAR",
    "Portugal": "POR",
    "RD Congo": "RDC",
    "República Tcheca": "CZE",
    "Senegal": "SEN",
    "Suécia": "SWE",
    "Suíça": "SUI",
    "Tunísia": "TUN",
    "Turquia": "TUR",
    "Uruguai": "URU",
    "Uzbequistão": "UZB",
    "Bulgária": "BUL",
    "Chile": "CHI",
    "Dinamarca": "DIN",
    "Eslováquia": "SVK",
    "Gales": "GAL",
    "Hungria": "HUN",
    "Irlanda": "IRL",
    "Irlanda do Norte": "NIR",
    "Nigéria": "NIG",
    "Polônia": "POL",
    "Romênia": "ROM",
    "Rússia": "RUS",
    "Sérvia": "SRB",
    "Ucrânia": "UCR"
};

// Mapeamento: nome PT → teamid (do teams.txt) — usado na exportação de TXTs
const TEAM_MAP = {
    "alemanha": 1337, "argentina": 1369, "argélia": 111448,
    "arábia saudita": 111114, "austrália": 1415, "bélgica": 1325,
    "brasil": 1370, "cabo verde": 0, "canadá": 111455,
    "catar": 111527, "colômbia": 111109, "coreia do sul": 0,
    "costa do marfim": 0, "croácia": 1328, "curaçao": 0,
    "egito": 111130, "equador": 111165, "escócia": 1359,
    "espanha": 1362, "estados unidos": 0, "frança": 1335,
    "gana": 111462, "haiti": 0, "holanda": 0,
    "inglaterra": 1318, "irã": 111115, "iraque": 111512,
    "japão": 1411, "jordânia": 111513, "marrocos": 111111,
    "méxico": 1386, "noruega": 1352, "nova zelândia": 0,
    "panamá": 0, "paraguai": 1375, "portugal": 1354,
    "rd congo": 111545, "república tcheca": 1330, "senegal": 1667,
    "suécia": 0, "suíça": 1364, "tunísia": 1391,
    "turquia": 0, "uruguai": 1377, "uzbequistão": 111485,
    "áfrica do sul": 111099, "áustria": 0, "irlanda do norte": 110081
};

function abreviacaoPais(
    pais
) {

    return ABREVIACOES_PAISES[pais] || pais.slice( 0, 3 ).toUpperCase();

}

// Curaçao não tem bandeira na HLTV, usa flagcdn como fallback
const BANDEIRA_CURACAO = "cw";

function bandeira(pais) {
    if (pais === "Curaçao") {
        return `<img class="flag" src="https://flagcdn.com/20x15/${BANDEIRA_CURACAO}.png" alt="Curaçao" loading="lazy">`;
    }
    if (pais === "Inglaterra") {
        return `<img class="flag" src="assets/Flag_of_England.png" alt="Inglaterra" loading="lazy">`;
    }
    if (pais === "Escócia") {
        return `<img class="flag" src="assets/Flag_of_Scotland.svg" alt="Escócia" loading="lazy">`;
    }
    if (pais === "Itália") {
        return `<img class="flag" src="assets/Flag_of_Italy.webp" alt="Itália" loading="lazy">`;
    }
    if (pais === "Gales") {
        return `<img class="flag" src="Referencias/pais-de-gales.png" alt="Gales" loading="lazy">`;
    }
    if (pais === "Irlanda do Norte") {
        return `<img class="flag" src="Referencias/irlanda-do-norte.png" alt="Irlanda do Norte" loading="lazy">`;
    }
    if (pais === "Camarões") {
        return `<img class="flag" src="Referencias/camaroes.png" alt="Camarões" loading="lazy">`;
    }
    if (pais === "Finlândia") {
        return `<img class="flag" src="assets/Flag_of_Finland.png" alt="Finlândia" loading="lazy">`;
    }
    if (pais === "Hungria") {
        return `<img class="flag" src="assets/Flag_of_Hungary.png" alt="Hungria" loading="lazy">`;
    }
    if (pais === "Polônia") {
        return `<img class="flag" src="assets/Flag_of_Poland.png" alt="Polônia" loading="lazy">`;
    }
    if (pais === "Nigéria") {
        return `<img class="flag" src="assets/Flag_of_Nigeria.png" alt="Nigéria" loading="lazy">`;
    }
    const codigo = CODIGOS_HLTV[pais];
    if (!codigo) return "";
    return `<img class="flag" src="https://www.hltv.org/img/static/flags/30x20/${codigo}.gif" alt="${pais}" loading="lazy" onerror="this.style.display='none'">`;
}

// ======================
// CARREGAR JSON
// ======================

async function carregarIconsHeroes() {
    try {
        const resposta = await fetch("icons_heroes.json");
        if (!resposta.ok) return;
        const dados = await resposta.json();
        iconsHeroesBase = dados.map(j => ({
            nome: j.nome,
            pais: j.pais,
            posicao: j.posicao,
            playerid: j.playerid || null,
            nomeCompleto: j.nome,
            tipo: j.tipo
        }));
        console.log(`Icons/Heroes carregados: ${iconsHeroesBase.length}`);
    } catch (erro) {
        console.warn("Erro ao carregar icons_heroes.json:", erro);
    }
}

async function carregarJogadores() {

    try {

        const resposta =
            await fetch(
                "jogadores_final.json"
            );

        if ( !resposta.ok ) {
            throw new Error(
                `HTTP ${resposta.status}: ${resposta.statusText}`
            );
        }

        jogadoresBase =
            await resposta.json();

        if ( !Array.isArray( jogadoresBase ) || jogadoresBase.length === 0 ) {
            throw new Error( "Arquivo de jogadores vazio ou mal formatado." );
        }

        // Mapear campos: abrev -> nome, manter compatibilidade
        const titleCase = s => s.replace(/\S+/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase());
        const inverterNome = nc => {
            if (!nc) return nc;
            const partes = nc.trim().split(/\s+/);
            if (partes.length < 2) return titleCase(nc);
            // Se TODAS as palavras sao maiusculas, e commonname em ordem correta (ex: "RAFAEL LEAO")
            if (partes.every(p => p === p.toUpperCase())) return titleCase(nc);
            // Formato FIFA: "SOBRENOME Primeiro" -> "Primeiro SOBRENOME"
            let i = 0;
            while (i < partes.length - 1 && partes[i] === partes[i].toUpperCase()) i++;
            if (i === 0) return nc;
            const sobrenome = partes.slice(0, i).join(" ");
            const primeiro = partes.slice(i).join(" ");
            return `${primeiro} ${sobrenome}`;
        };
        jogadoresBase = jogadoresBase.map(
            j => ( {
                nome: j.abrev || j.nome,
                pais: j.pais,
                posicao: j.posicao,
                playerid: j.playerid || null,
                nomeCompleto: inverterNome(j.nome_completo) || null
            } )
        );

        paisesCpu = [
            ...new Set(
                jogadoresBase.map(
                    j => j.pais
                )
            )
        ].sort();

        console.log(
            `Jogadores carregados: ${jogadoresBase.length}`
        );

        // Tentar restaurar draft salvo
        const restaurou = carregarEstadoDraft();
        if (restaurou) {
            console.log("Draft restaurado com sucesso!");
        }

    } catch ( erro ) {

        console.error(
            "Erro ao carregar jogadores:",
            erro
        );

        document.body.innerHTML = `
            <div style="
                max-width: 440px; margin: 80px auto; padding: 32px 24px;
                text-align: center; font-family: 'Hanken Grotesk', sans-serif;
                background: #fff; border: 3px solid #1B1A17;
                box-shadow: 3px 3px 0 #1B1A17;
            ">
                <h1 style="
                    font-family: 'Anton', sans-serif; font-size: 32px;
                    text-transform: uppercase; color: #E8462B;
                    margin-bottom: 12px;
                ">
                    Erro ao carregar
                </h1>
                <p style="font-size: 16px; color: #1B1A17; line-height: 1.5; margin-bottom: 20px;">
                    Não foi possível carregar a base de jogadores.<br>
                    Verifique se o arquivo <strong>jogadores_final.json</strong>
                    está presente e tente novamente.
                </p>
                <button onclick="location.reload()" style="
                    font-family: 'Anton', sans-serif; font-size: 18px;
                    padding: 12px 24px; background: #E8462B; color: #fff;
                    border: none; cursor: pointer; text-transform: uppercase;
                    box-shadow: 3px 3px 0 #1B1A17;
                ">
                    Tentar novamente
                </button>
            </div>
        `;

        throw erro;

    }

}

// ======================
// PERSISTÊNCIA DO DRAFT
// ======================

function salvarEstadoDraft() {
    const estado = {
        config: { ...config },
        nomesJogadores: [...nomesJogadores],
        times: times.map(t => [...t]),
        paisParticipante: [...paisParticipante],
        ordemSelecao: [...ordemSelecao],
        indiceSelecao: indiceSelecao,
        jogadorAtual: jogadorAtual,
        pickAtual: pickAtual,
        direcaoSnake: direcaoSnake,
        refreshesPorJogador: [...refreshesPorJogador],
        participantesAtivos: [...participantesAtivos],
        jogadoresDisponiveis: jogadoresDisponiveis.map(j => ({
            nome: j.nome, pais: j.pais, posicao: j.posicao,
            playerid: j.playerid || null, nomeCompleto: j.nomeCompleto || null,
            tipo: j.tipo || null
        })),
        poolAtual: poolAtual.map(j => ({
            nome: j.nome, pais: j.pais, posicao: j.posicao,
            playerid: j.playerid || null, nomeCompleto: j.nomeCompleto || null,
            tipo: j.tipo || null
        }))
    };

    // Determinar em qual etapa estamos
    const setupVisivel = document.getElementById("setup").style.display !== "none";
    const countryVisivel = document.getElementById("countrySelection").style.display !== "none";
    const draftVisivel = document.getElementById("draftArea").style.display !== "none";
    const resultsVisivel = document.getElementById("resultsArea").style.display !== "none";
    const mataMataVisivel = document.getElementById("mataMataArea").style.display !== "none";

    if (resultsVisivel) estado.etapa = 4;
    else if (draftVisivel) estado.etapa = 3;
    else if (countryVisivel) estado.etapa = 2;
    else if (mataMataVisivel) estado.etapa = 5;
    else estado.etapa = 1;

    try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(estado));
    } catch (e) {
        console.warn("Erro ao salvar draft:", e);
    }
}

function carregarEstadoDraft() {
    try {
        const salvo = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (!salvo) return false;
        const est = JSON.parse(salvo);
        if (!est || !est.nomesJogadores || !est.nomesJogadores.length) return false;

        // Restaurar config
        Object.assign(config, est.config);

        // Restaurar variáveis
        nomesJogadores = est.nomesJogadores;
        times = est.times;
        paisParticipante = est.paisParticipante;
        ordemSelecao = est.ordemSelecao;
        indiceSelecao = est.indiceSelecao;
        jogadorAtual = est.jogadorAtual;
        pickAtual = est.pickAtual;
        direcaoSnake = est.direcaoSnake;
        refreshesPorJogador = est.refreshesPorJogador;
        participantesAtivos = est.participantesAtivos;
        jogadoresDisponiveis = est.jogadoresDisponiveis;
        poolAtual = est.poolAtual;
        paisesCpu = [...new Set(jogadoresBase.map(j => j.pais))].sort();

        // Esconder todas as seções
        document.getElementById("preMenu").style.display = "none";
        document.getElementById("setup").style.display = "none";
        document.getElementById("countrySelection").style.display = "none";
        document.getElementById("draftArea").style.display = "none";
        document.getElementById("resultsArea").style.display = "none";
        document.getElementById("mataMataArea").style.display = "none";

        // Mostrar barra de etapas
        const stepsBar = document.getElementById("stepsBar");
        if (stepsBar) stepsBar.style.display = "";

        // Restaurar a etapa correta
        const etapa = est.etapa || 3;

        // Se tinha seleção de países, preencher país de cada jogador
        for (let i = 0; i < nomesJogadores.length; i++) {
            const input = document.getElementById(`playerName${i + 1}`);
            if (input) input.value = nomesJogadores[i];
        }

        if (etapa >= 2 && paisParticipante.length) {
            // Se todos os países já foram pickados, avança direto pro draft
            if (indiceSelecao >= nomesJogadores.length) {
                document.getElementById("countrySelection").style.display = "none";
                document.getElementById("draftArea").style.display = "block";
                renderizarTeamCards();
                atualizarRefreshes();
                atualizarStatus();
                gerarPool();
                setActiveStep(3);
                iniciarTimer(TIMER_DRAFT, autoPickJogador);
            } else {
                document.getElementById("countrySelection").style.display = "block";
                if (etapa === 2) {
                    const paisesRestantes = [...new Set(jogadoresBase.map(j => j.pais))].sort();
                    renderizarGridPaises(paisesRestantes);
                    // Timer já inicia dentro de renderizarGridPaises
                }
                setActiveStep(2);
            }
        }

        if (etapa >= 3) {
            document.getElementById("draftArea").style.display = "block";
            renderizarTeamCards();
            if (etapa === 3) {
                atualizarRefreshes();
                atualizarStatus();
                gerarPool();
                iniciarTimer(TIMER_DRAFT, autoPickJogador);
            } else {
                pararTimer();
            }
            setActiveStep(3);
        }

        if (etapa >= 4) {
            document.getElementById("draftArea").style.display = "none";
            document.getElementById("resultsArea").style.display = "block";
            setActiveStep(4);
            // Renderizar resultados
            const area = document.getElementById("finalResults");
            if (area) {
                mostrarResultadoFinal();
            }
        }

        if (etapa >= 5) {
            document.getElementById("mataMataArea").style.display = "block";
            setActiveStep(5);
        }

        console.log(`Draft restaurado: etapa ${etapa}`);
        return true;

    } catch (e) {
        console.warn("Erro ao carregar draft salvo:", e);
        return false;
    }
}

function limparEstadoDraft() {
    try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch (_) {}
}

// ======================
// UTILIDADES
// ======================

function aleatorio(lista) {

    return lista[
        Math.floor(
            Math.random() *
            lista.length
        )
    ];

}

function contarGoleiros(indiceJogador) {

    return times[
        indiceJogador
    ].filter(
        jogador =>
            jogador.posicao === "GK"
    ).length;

}

function participanteCompleto(indiceJogador) {

    return (
        times[indiceJogador]
            .length >=
        config.playersPerTeam
    );

}

function todosCompletos() {

    return times.every(
        time =>
            time.length >=
            config.playersPerTeam
    );

}

// ======================
// REFRESHES
// ======================

function atualizarRefreshes() {

    const restantes =
        refreshesPorJogador[
            jogadorAtual
        ];

    document
        .getElementById(
            "refreshes"
        )
        .innerText =
        `Refreshes: ${restantes}`;

}

// ======================
// STATUS
// ======================

function atualizarStatus() {

    const paisJogador =
        paisParticipante[
            jogadorAtual
        ];

    const bandPais =
        paisJogador
            ? bandeira(paisJogador)
            : "";

    document
        .getElementById(
            "status"
        ).innerHTML = `
            Pick ${pickAtual}
            ·
            Vez de:
            <span class="current-player">
                ${bandPais}${nomesJogadores[jogadorAtual]}
            </span>
        `;

    // Controle de turno multiplayer
    if (typeof mpAtualizarTurnoUI === "function") {
        mpAtualizarTurnoUI();
    }

}
// ======================
// TIMER (COUNTDOWN)
// ======================

const TIMER_PAISES = 10;
const TIMER_DRAFT = 15;
let timerRestante = 0;
let timerInterval = null;
let timerCallback = null;

function iniciarTimer(segundos, callback) {
    pararTimer();
    timerRestante = segundos;
    timerCallback = callback;
    atualizarTimerDisplay();
    timerInterval = setInterval(() => {
        timerRestante--;
        atualizarTimerDisplay();
        if (timerRestante <= 0) {
            const cb = timerCallback;
            pararTimer();
            if (cb) cb();
        }
    }, 1000);
}

function pararTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    timerCallback = null;
    timerRestante = 0;
    atualizarTimerDisplay();
}

function atualizarTimerDisplay() {
    const csEl = document.getElementById("csTimer");
    const draftEl = document.getElementById("draftTimer");
    const mostrando = timerInterval !== null && timerRestante > 0;
    if (csEl) {
        csEl.textContent = mostrando ? timerRestante + "s" : "";
        csEl.classList.toggle("is-warning", mostrando && timerRestante <= 3);
    }
    if (draftEl) {
        draftEl.textContent = mostrando ? timerRestante + "s" : "";
        draftEl.classList.toggle("is-warning", mostrando && timerRestante <= 3);
    }
}

// Auto-pick aleatório para países
function autoPickPais() {
    const cards = document.querySelectorAll("#countryGrid .country-card:not(.is-taken)");
    if (cards.length > 0) {
        const randomCard = cards[Math.floor(Math.random() * cards.length)];
        const pais = randomCard.querySelector(".country-name").textContent;
        const paises = [...new Set(jogadoresBase.map(j => j.pais))].sort();
        toast(`⏰ Tempo esgotado! 🇺🇳 ${pais} selecionado automaticamente.`, 3000);
        selecionarPais(pais, paises);
    }
}

// Auto-pick aleatório para jogadores
function autoPickJogador() {
    if (poolAtual.length > 0) {
        const jogador = poolAtual[Math.floor(Math.random() * poolAtual.length)];
        toast(`⏰ Tempo esgotado! ${jogador.nome} pickado automaticamente.`, 3000);
        selecionarJogador(jogador);
    }
}

// ======================
// CRIAR PARTICIPANTES
// ======================

// ======================
// GERAR INPUTS DE NOMES
// ======================

function gerarInputsNomes() {

    const quantidade =
        parseInt(
            document.getElementById(
                "playerCount"
            ).value
        );

    const container =
        document.getElementById(
            "playerNames"
        );

    container.innerHTML = "";

    for (
        let i = 1;
        i <= quantidade;
        i++
    ) {

        container.innerHTML += `
            <div>
                <input
                    id="playerName${i}"
                    placeholder="Nome Jogador ${i}"
                >
            </div>
        `;

    }

    container.innerHTML += `
        <button id="startDraft">
            INICIAR DRAFT
        </button>
    `;

    document
        .getElementById(
            "startDraft"
        )
        .addEventListener(
            "click",
            iniciarDraft
        );

}

// Mostrar inputs já com o valor padrão
gerarInputsNomes();

// Atualizar ao mudar a quantidade
document
    .getElementById(
        "playerCount"
    )
    .addEventListener(
        "change",
        gerarInputsNomes
    );

// ======================
// INICIAR DRAFT
// ======================

function iniciarDraft() {

    pararTimer();

    limparEstadoDraft();

    localStorage.removeItem(
        MATA_MATA_STORAGE_KEY
    );

    config.draftMode =
        document.getElementById(
            "draftMode"
        ).value;

    config.startingPhase =
        document.getElementById(
            "startingPhase"
        ).value;

    config.goalkeeperRule =
        document.getElementById(
            "goalkeeperRule"
        ).value === "on";

    config.playersPerTeam =
        parseInt(
            document.getElementById(
                "playersPerTeam"
            ).value
        );

    config.refreshCount =
        parseInt(
            document.getElementById(
                "refreshCount"
            ).value
        );

    config.iconsHeroesMode =
        document.getElementById(
            "iconsHeroesMode"
        ).value;

    // Slider 0-10000 mapeia linearmente para 0-100% (0.0 - 1.0)
    const sliderVal = parseInt(
        document.getElementById(
            "poolSpecialChance"
        ).value
    );
    config.poolSpecialChance = sliderVal / 10000;

    // Mostrar/esconder slider de chance conforme modo
    const chanceContainer = document.getElementById("poolSpecialChanceContainer");
    if (chanceContainer) {
        chanceContainer.style.display =
            config.iconsHeroesMode === "none" ? "none" : "block";
    }

    const extrasAtivos = iconsHeroesBase.filter(j => {
        if (config.iconsHeroesMode === "icons") return j.tipo === "icon";
        if (config.iconsHeroesMode === "heroes") return j.tipo === "hero";
        if (config.iconsHeroesMode === "both") return true;
        return false;
    });

    jogadoresDisponiveis =
        [...jogadoresBase, ...extrasAtivos];

    nomesJogadores = [];

    times = [];

    refreshesPorJogador = [];

    participantesAtivos = [];

    const quantidade =
        parseInt(
            document.getElementById(
                "playerCount"
            ).value
        );

    for (
        let i = 1;
        i <= quantidade;
        i++
    ) {

        const nome =
            document.getElementById(
                `playerName${i}`
            ).value.trim();

        nomesJogadores.push(
            nome || `Jogador ${i}`
        );

        times.push([]);

        refreshesPorJogador.push(
            config.refreshCount
        );

        participantesAtivos.push(
            i - 1
        );

    }

    // Embaralhar ordem dos picks
    function embaralhar(
        lista
    ) {

        for (
            let i = lista.length - 1;
            i > 0;
            i--
        ) {

            const j = Math.floor(
                Math.random() *
                (i + 1)
            );

            [ lista[i], lista[j] ] =
                [ lista[j], lista[i] ];

        }

        return lista;

    }
    embaralhar(participantesAtivos);

    jogadorAtual =
        participantesAtivos[0] ??
        0;

    pickAtual = 1;

    direcaoSnake = 1;

    document.getElementById(
        "setup"
    ).style.display = "none";

    paisParticipante = [];

    indiceSelecao = 0;

    iniciarSelecaoPaises();

}

// ======================
// SELEÇÃO DE PAÍSES
// ======================

function iniciarSelecaoPaises() {

    setActiveStep(2);

    // Extrair lista única de países do JSON
    const paisesUnicos = [
        ...new Set(
            jogadoresBase.map(
                j => j.pais
            )
        )
    ].sort();

    // Mesma ordem aleatória do draft (já sorteada em iniciarDraft)
    ordemSelecao = [
        ...participantesAtivos
    ];

    indiceSelecao = 0;

    // Mostrar tela de seleção
    document.getElementById(
        "countrySelection"
    ).style.display =
        "block";

    renderizarGridPaises(
        paisesUnicos
    );

}

function renderizarGridPaises(
    paises
) {

    const grid =
        document.getElementById(
            "countryGrid"
        );

    const turno =
        document.getElementById(
            "csTurn"
        );

    const jogadorIdx =
        ordemSelecao[
            indiceSelecao
        ];

    turno.innerHTML =
        `Vez de: <span class="cs-player">${nomesJogadores[jogadorIdx]}</span>`;

    grid.innerHTML = "";

    paises.forEach(
        pais => {

            const jaEscolhido =
                paisParticipante.includes(
                    pais
                );

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "country-card" +
                (jaEscolhido
                    ? " is-taken"
                    : "");

            const urlBandeira =
                bandeira(pais);

            card.innerHTML = `
                ${urlBandeira}
                <span class="country-name">${pais}</span>
            `;

            if (!jaEscolhido) {

                card.addEventListener(
                    "click",
                    () =>
                        selecionarPais(
                            pais,
                            paises
                        )
                );

            }

            grid.appendChild(
                card
            );

        }
    );

    // Iniciar timer para seleção de países
    iniciarTimer(TIMER_PAISES, autoPickPais);

    // Controle de turno multiplayer
    mpControlarTurnoPaises();

}

function selecionarPais(
    pais,
    paises
) {

    pararTimer();

    const jogadorIdx =
        ordemSelecao[
            indiceSelecao
        ];

    paisParticipante[
        jogadorIdx
    ] = pais;

    indiceSelecao++;

    salvarEstadoDraft();

    // Broadcast multiplayer
    if (modoAtual !== MODO.OFFLINE && mpState.channel) {
        mpState.channel.send({
            type: "broadcast",
            event: "country_picked",
            payload: { pais }
        });
    }

    if (
        indiceSelecao >=
        nomesJogadores.length
    ) {

        prosseguirParaDraft();
        return;

    }

    renderizarGridPaises(
        paises
    );

}

function renderizarTeamCards() {

    const teamsSection =
        document.querySelector(
            ".teams"
        );

    teamsSection.innerHTML = "";

    participantesAtivos.forEach(
        (idx, posicao) => {

            const nome =
                nomesJogadores[idx];

            const pais =
                paisParticipante[idx];

            const bandPais =
                pais
                    ? bandeira(pais)
                    : "";

            teamsSection.innerHTML += `
    <div class="team-card" data-jogador="${idx}">

        <h2>${bandPais}${nome}</h2>

        <div>
            <strong id="count${idx + 1}">
                0/${config.playersPerTeam}
            </strong>
        </div>

        <div class="team-pais">
            ${pais ?? ""}
        </div>

        <ul id="team${idx + 1}">
        </ul>

    </div>
`;

        }
    );

}

function prosseguirParaDraft() {

    setActiveStep(3);

    renderizarTeamCards();

    document.getElementById(
        "countrySelection"
    ).style.display =
        "none";

    document.getElementById(
        "draftArea"
    ).style.display =
        "block";

    jogadorAtual =
        participantesAtivos[0] ??
        0;

    pickAtual = 1;

    direcaoSnake = 1;

    atualizarRefreshes();

    atualizarStatus();

    // Em multiplayer, só o moderador gera o pool e broadcasta
    if (modoAtual !== MODO.OFFLINE && modoAtual !== MODO.ONLINE_MODERATOR) {
        // Player aguarda o pool do moderador
        poolAtual = [];
    } else {
        gerarPool();
    }
    // Forçar broadcast no início do draft (moderador envia o pool inicial)
    if (typeof mpBroadcastPool === "function") mpBroadcastPool(true);

    salvarEstadoDraft();

    // Iniciar timer do draft
    iniciarTimer(TIMER_DRAFT, autoPickJogador);

    // Controle de turno multiplayer
    if (typeof mpAtualizarTurnoUI === "function") {
        mpAtualizarTurnoUI();
    }

}

// ======================
// ATUALIZAR TIMES
// ======================

function atualizarTimes() {

    times.forEach(
        (time, index) => {

            const lista =
                document.getElementById(
                    `team${index + 1}`
                );

            if (!lista) return;
const ordemPosicao = {
    GK: 1,
    DF: 2,
    MF: 3,
    FW: 4
};

const timeOrdenado =
    [...time].sort(
        (a, b) =>
            ordemPosicao[a.posicao] -
            ordemPosicao[b.posicao]
    );
            lista.innerHTML =
                timeOrdenado
                    .map(
                        jogador => {
                            const badgeTipo = jogador.tipo === "icon"
                                ? `<img src="assets/icons.png" class="team-tipo-badge" alt="Icon">`
                                : jogador.tipo === "hero"
                                    ? `<img src="assets/heroes.png" class="team-tipo-badge" alt="Hero">`
                                    : "";
                            return `<li class="pos-${jogador.posicao.toLowerCase()}${jogador.tipo ? " is-special " + jogador.tipo : ""}">
                                <span class="pos-label">${POSICOES_ABREV[jogador.posicao]}</span> ${bandeira(jogador.pais)}${jogador.nome}${badgeTipo}
                            </li>`;
                        }
                    )
                    .join("");

            const contador =
                document.getElementById(
                    `count${index + 1}`
                );

            if (contador) {

                contador.innerText =
                    `${time.length}/${config.playersPerTeam}`;

            }

        }
    );

}
// ======================
// GERAR POOL
// ======================

function gerarPool() {

    poolAtual = [];

    // Separa normais e especiais — normais vêm de jogadoresDisponiveis (já exclui pickados)
    let normais = jogadoresDisponiveis.filter(j => !j.tipo);
    let especiais = [];
    if (config.iconsHeroesMode === "icons") {
        especiais = iconsHeroesBase.filter(j => j.tipo === "icon");
    } else if (config.iconsHeroesMode === "heroes") {
        especiais = iconsHeroesBase.filter(j => j.tipo === "hero");
    } else if (config.iconsHeroesMode === "both") {
        especiais = [...iconsHeroesBase];
    }

    const gksDoJogador =
        contarGoleiros(
            jogadorAtual
        );

    const restantes =
        config.playersPerTeam -
        times[jogadorAtual].length;

    const jaTemDoisGoleiros =
        gksDoJogador >= 2;

    const forcandoGK =
        config.goalkeeperRule && (
            (gksDoJogador === 0 &&
                restantes <= 2) ||
            (gksDoJogador === 1 &&
                restantes <= 1)
        );

    // Se já tem 2 goleiros, filtra GKs dos normais
    if (jaTemDoisGoleiros) {
        normais = normais.filter(j => j.posicao !== "GK");
    }

    // Últimas rodadas: só goleiros (sempre normais)
    if (forcandoGK) {

        let soGoleiros =
            normais.filter(
                j => j.posicao === "GK"
            );

        // Embaralhar para não vir sempre os mesmos
        for (
            let i = soGoleiros.length - 1;
            i > 0;
            i--
        ) {

            const j = Math.floor(
                Math.random() *
                (i + 1)
            );

            [ soGoleiros[i],
              soGoleiros[j] ] =
              [ soGoleiros[j],
                soGoleiros[i] ];

        }

        poolAtual = soGoleiros.slice(
            0, 5
        );

        renderizarPool();
        return;

    }

    // Precisa de goleiro: coloca 1 dos normais
    if (
        config.goalkeeperRule &&
        gksDoJogador < 2
    ) {

        const goleiros =
            normais.filter(
                j => j.posicao === "GK"
            );

        if (
            goleiros.length > 0
        ) {

            const goleiro =
                aleatorio(goleiros);

            poolAtual.push(goleiro);

            // Remove todos os goleiros dos normais
            normais = normais.filter(j => j.posicao !== "GK");

        }

    }

    // Limites de posição na pool (evita excesso de zagueiros, etc.)
    const MAX_POR_POSICAO = { GK: 1, DF: 2, MF: 2, FW: 2 };

    function contaPosicaoNaPool(posicao) {
        return poolAtual.filter(j => j.posicao === posicao).length;
    }

    // Preenche os slots restantes com chance configurável de especial
    while (
        poolAtual.length < 5 &&
        (normais.length > 0 || especiais.length > 0)
    ) {

        const sortearEspecial =
            especiais.length > 0 &&
            Math.random() < config.poolSpecialChance;

        let jogador;

        if (sortearEspecial) {
            jogador = aleatorio(especiais);
            especiais = especiais.filter(p => p !== jogador);
        } else if (normais.length > 0) {
            // Filtra normais para respeitar limites de posição
            const candidatos = normais.filter(j => {
                if (contaPosicaoNaPool(j.posicao) >= (MAX_POR_POSICAO[j.posicao] || 2)) return false;
                return true;
            });
            // Usa candidatos filtrados; se vazio, relaxa e aceita qualquer um
            const poolEscolha = candidatos.length > 0 ? candidatos : normais;
            jogador = aleatorio(poolEscolha);
            normais = normais.filter(p => p !== jogador);
        } else {
            jogador = aleatorio(especiais);
            especiais = especiais.filter(p => p !== jogador);
        }

        poolAtual.push(jogador);

    }

    renderizarPool();

}

// ======================
// RENDERIZAR POOL
// ======================

function renderizarPool() {

    const lista =
        document.getElementById(
            "poolList"
        );

    lista.innerHTML = "";

    poolAtual.forEach(
        (
            jogador,
            index
        ) => {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "player-card";

            card.style.cursor =
                "pointer";

            const badgeEspecial = jogador.tipo === "icon"
                ? `<img src="assets/icons.png" class="pool-tipo-badge" alt="Icon" title="Icon">`
                : jogador.tipo === "hero"
                    ? `<img src="assets/heroes.png" class="pool-tipo-badge" alt="Hero" title="Hero">`
                    : "";

            card.innerHTML = `
                <span class="pool-inner pos-${jogador.posicao.toLowerCase()}${jogador.tipo ? " is-special " + jogador.tipo : ""}">
                    <span class="pool-num">${index + 1}</span>
                    <span class="pool-name">${bandeira(jogador.pais)}${jogador.nomeCompleto || jogador.nome}</span>
                    ${badgeEspecial}
                    <span class="pos-label">${POSICOES_ABREV[jogador.posicao]}</span>
                </span>
            `;

            card.addEventListener(
                "click",
                () =>
                    selecionarJogador(
                        jogador
                    )
            );

            lista.appendChild(
                card
            );

        }
    );

}

// ======================
// AVANÇAR TURNO
// ======================

function avancarTurno() {

    if (
        participantesAtivos.length === 0
    ) {
        return;
    }

    // Em multiplayer, usar o modo travado
    const modoDraft = (modoAtual !== MODO.OFFLINE && mpState && mpState.draftModeLocked)
        ? mpState.draftModeLocked
        : config.draftMode;

    if (
        modoDraft ===
        "normal"
    ) {

        let indiceAtual =
            participantesAtivos.indexOf(
                jogadorAtual
            );

        indiceAtual++;

        if (
            indiceAtual >=
            participantesAtivos.length
        ) {
            indiceAtual = 0;
        }

        jogadorAtual =
            participantesAtivos[
                indiceAtual
            ];

        return;

    }

    let indiceAtual =
        participantesAtivos.indexOf(
            jogadorAtual
        );

    indiceAtual +=
        direcaoSnake;

    if (
        indiceAtual >=
        participantesAtivos.length
    ) {

        indiceAtual =
            participantesAtivos.length - 1;

        direcaoSnake = -1;

    }

    else if (
        indiceAtual < 0
    ) {

        indiceAtual = 0;

        direcaoSnake = 1;

    }

    jogadorAtual =
        participantesAtivos[
            indiceAtual
        ];

}

// ======================
// PICK
// ======================

function selecionarJogador(
    jogador
) {

    pararTimer();

    times[
        jogadorAtual
    ].push(
        jogador
    );

    jogadoresDisponiveis =
        jogadoresDisponiveis.filter(
            p =>
                !(
                    p.nome ===
                        jogador.nome &&
                    p.pais ===
                        jogador.pais
                )
        );

    atualizarTimes();

    if (
        participanteCompleto(
            jogadorAtual
        )
    ) {

        participantesAtivos =
            participantesAtivos.filter(
                p =>
                    p !== jogadorAtual
            );

    }

    if (
        todosCompletos()
    ) {

        // Broadcast multiplayer ANTES de sair (último pick)
        if (modoAtual !== MODO.OFFLINE && mpState.channel) {
            mpState.channel.send({
                type: "broadcast",
                event: "player_picked",
                payload: {
                    jogador,
                    pickerIndex: jogadorAtual,
                    nextJogadorAtual: jogadorAtual,
                    direcaoSnake,
                    refreshesRestantes: 0,
                    pool: []
                }
            });
        }

        mostrarResultadoFinal();

        return;

    }

    pickAtual++;

    // Salvar quem pickou antes de avançar (para broadcast multiplayer)
    const mpPickerIndex = jogadorAtual;
    avancarTurno();

    atualizarStatus();

    atualizarRefreshes();

    gerarPool();

    // Controle de turno multiplayer (após recriar o pool)
    if (typeof mpAtualizarTurnoUI === "function") {
        mpAtualizarTurnoUI();
    }

    salvarEstadoDraft();

    // Broadcast multiplayer (inclui pool para sync)
    if (modoAtual !== MODO.OFFLINE && mpState.channel) {
        mpState.channel.send({
            type: "broadcast",
            event: "player_picked",
            payload: {
                jogador,
                pickerIndex: mpPickerIndex,
                nextJogadorAtual: jogadorAtual,
                direcaoSnake,
                refreshesRestantes: refreshesPorJogador[jogadorAtual] ?? 0,
                pool: poolAtual.map(j => ({
                    nome: j.nome, pais: j.pais, posicao: j.posicao,
                    playerid: j.playerid || null, nomeCompleto: j.nomeCompleto || null,
                    tipo: j.tipo || null
                }))
            }
        });
    }

    // Iniciar timer para o próximo jogador
    if (!todosCompletos()) {
        iniciarTimer(TIMER_DRAFT, autoPickJogador);
    }

}

// ======================
// RESULTADO FINAL
// ======================

function mostrarResultadoFinal() {

    pararTimer();

    setActiveStep(4);

    // Desabilitar controles para não-moderadores
    if (typeof mpDesabilitarResults === "function") mpDesabilitarResults();

    // Garantir que outras seções estão ocultas
    document.getElementById("setup").style.display = "none";
    document.getElementById("countrySelection").style.display = "none";

    document.getElementById(
        "draftArea"
    ).style.display =
        "none";

    document.getElementById(
        "resultsArea"
    ).style.display =
        "block";

    const area =
        document.getElementById(
            "finalResults"
        );

    let html = "";

    let todosExpandidos = localStorage.getItem( "draftResultsExpandido" ) !== "false";
    const classeToggle = todosExpandidos ? "player-detail is-open" : "player-detail";

    // Botão de toggle + copiar
    html += `<div class="result-toggle-wrap">
        <button id="togglePlayersBtn" class="result-toggle-btn">${todosExpandidos ? "▼" : "▶"} ${todosExpandidos ? "REDUZIR LISTA" : "EXPANDIR LISTA"}</button>
        <button id="copyResults" class="result-copy-btn">Copiar escalações</button>
    </div>`;

    nomesJogadores.forEach(
        (
            nome,
            index
        ) => {

            const total = times[ index ].length;

            const pais = paisParticipante[index];
            const bandPais = pais ? bandeira(pais) : "";
            const abrevPais = pais ? abreviacaoPais(pais) : "";

            html += `
                <h2 class="player-team-head" data-team="${index}">
                    ${bandPais} ${nome} <span class="player-country-abbr">${abrevPais}</span> <span class="player-count">(${total} jogadores)</span>
                    <span class="player-toggle-icon">${todosExpandidos ? "▲" : "▼"}</span>
                </h2>
            `;

            const goleiros =
                times[index].filter(
                    j =>
                        j.posicao ===
                        "GK"
                );

            const defensores =
                times[index].filter(
                    j =>
                        j.posicao ===
                        "DF"
                );

            const meios =
                times[index].filter(
                    j =>
                        j.posicao ===
                        "MF"
                );

            const atacantes =
                times[index].filter(
                    j =>
                        j.posicao ===
                        "FW"
                );

            html += `<div class="${classeToggle}" data-detail="${index}">`;

            [
                [
                    "Goleiros",
                    goleiros
                ],
                [
                    "Defensores",
                    defensores
                ],
                [
                    "Meio-Campistas",
                    meios
                ],
                [
                    "Atacantes",
                    atacantes
                ]
            ].forEach(
                (
                    grupo
                ) => {

                    html += `
                        <h3>
                            ${grupo[0]}
                        </h3>
                    `;

                    grupo[1].forEach(
                        jogador => {

                            const badgeTipo = jogador.tipo === "icon"
                                ? `<img src="assets/icons.png" class="result-tipo-badge" alt="Icon" title="Icon">`
                                : jogador.tipo === "hero"
                                    ? `<img src="assets/heroes.png" class="result-tipo-badge" alt="Hero" title="Hero">`
                                    : "";

                            html += `
                                <div class="player-entry pos-${jogador.posicao.toLowerCase()}${jogador.tipo ? " is-special " + jogador.tipo : ""}">
                                    <span class="pos-label">${POSICOES_ABREV[jogador.posicao]}</span> ${bandeira(jogador.pais)}<span class="player-pais-sigla">${abreviacaoPais(jogador.pais)}</span> ${jogador.nome}${badgeTipo}
                                </div>
                            `;

                        }
                    );

                }
            );

            html += `</div>`;
            html += "<hr>";

        }
    );

    area.innerHTML = html;

    // Toggle individual por time
    area.querySelectorAll( ".player-team-head" ).forEach( h2 => {
        h2.addEventListener( "click", () => {
            const idx = h2.dataset.team;
            const detail = area.querySelector( `.player-detail[data-detail="${idx}"]` );
            if ( detail ) {
                detail.classList.toggle( "is-open" );
                h2.querySelector( ".player-toggle-icon" ).textContent =
                    detail.classList.contains( "is-open" ) ? "▲" : "▼";
            }
        } );
    } );

    // Toggle global
    document.getElementById( "togglePlayersBtn" ).addEventListener( "click", () => {
        const details = area.querySelectorAll( ".player-detail" );
        const algumaAberta = Array.from( details ).some( d => d.classList.contains( "is-open" ) );
        const novaAberta = !algumaAberta;

        details.forEach( d => {
            d.classList.toggle( "is-open", novaAberta );
        } );

        area.querySelectorAll( ".player-toggle-icon" ).forEach( icon => {
            icon.textContent = novaAberta ? "▲" : "▼";
        } );

        document.getElementById( "togglePlayersBtn" ).textContent =
            novaAberta ? "▼ REDUZIR LISTA" : "▶ EXPANDIR LISTA";

        localStorage.setItem( "draftResultsExpandido", novaAberta );
    } );

    document
        .getElementById(
            "copyResults"
        )
        .addEventListener(
            "click",
            () => {

                const texto = area.innerText;

                // Método mais compatível com mobile: criar textarea temporário
                const textarea = document.createElement("textarea");
                textarea.value = texto;
                textarea.style.position = "fixed";
                textarea.style.opacity = "0";
                textarea.style.left = "-9999px";
                document.body.appendChild(textarea);
                textarea.select();
                textarea.setSelectionRange(0, 99999);

                try {
                    document.execCommand("copy");
                    toast("📋 Resultado copiado!");
                } catch (err) {
                    // Fallback para Clipboard API
                    try {
                        navigator.clipboard.writeText(texto);
                        toast("📋 Resultado copiado!");
                    } catch (_) {
                        toast("❌ Não foi possível copiar. Selecione manualmente.", 3000);
                    }
                }

                document.body.removeChild(textarea);

            }
        );

    // ======================
    // EXPORTAR ELENCOS (TXT)
    // ======================

    document
        .getElementById(
            "exportDraft"
        )
        .addEventListener(
            "click",
            async () => {

                try {

                // Função local para UTF-16LE com BOM (processa em blocos)
                function encodeUTF16(str) {
                    const len = str.length;
                    const buf = new ArrayBuffer((len + 1) * 2);
                    const view = new DataView(buf);
                    // BOM UTF-16LE
                    view.setUint16(0, 0xFEFF, true);
                    const CHUNK = 50000;
                    for (let i = 0; i < len; i += CHUNK) {
                        const end = Math.min(i + CHUNK, len);
                        for (let j = i; j < end; j++)
                            view.setUint16((j + 1) * 2, str.charCodeAt(j), true);
                    }
                    return new Uint8Array(buf);
                }

                // ── 0. Carregar arquivos originais via fetch ──
                toast("Carregando dados originais...");
                let originals;
                try {
                    const resp = await fetch("originals_data.json");
                    if (!resp.ok) throw new Error("HTTP " + resp.status);
                    originals = await resp.json();
                } catch (e) {
                    toast("Erro ao carregar originals_data.json: " + e.message);
                    return;
                }

                // ── 1. Modificar leagues.txt (original + alteração na International) ──
                const lgOriginal = (originals.leagues || "").replace(/^﻿/, "");
                const lgLines = lgOriginal.split(/\r?\n/);
                for (let i = 0; i < lgLines.length; i++) {
                    const cols = lgLines[i].split("\t");
                    if (cols.length >= 2 && cols[1].toLowerCase().includes("international")) {
                        if (cols[cols.length - 1].trim() === "1") {
                            cols[cols.length - 1] = "0";
                            lgLines[i] = cols.join("\t");
                        }
                    }
                }

                // ── 2. Modificar teamplayerlinks.txt (original + substituir elencos draftados) ──
                const tplOriginal = (originals.teamplayerlinks || "").replace(/^﻿/, "");
                const tplLines = tplOriginal.split(/\r?\n/);
                const tplHeader = tplLines[0];
                const tplCols = tplHeader.split("\t");

                // Encontrar índices das colunas
                const colPid = tplCols.findIndex(c => c.trim().toLowerCase() === "playerid");
                const colTid = tplCols.findIndex(c => c.trim().toLowerCase() === "teamid");

                if (colPid === -1 || colTid === -1) {
                    toast("Erro: colunas playerid/teamid não encontradas no header");
                    return;
                }

                // Mapear participantes draftados: teamId -> lista de jogadores
                const draftTeams = new Map();
                for (let idx = 0; idx < times.length; idx++) {
                    const teamName = paisParticipante[idx] || "";
                    const teamId = TEAM_MAP[teamName.toLowerCase()] || TEAM_MAP[teamName] || 0;
                    if (!teamId) { toast("Teamid não encontrado para: " + teamName); return; }
                    for (const j of times[idx]) {
                        if (!j.playerid) { toast("Jogador sem playerid: " + j.nome); return; }
                    }
                    draftTeams.set(String(teamId), times[idx]);
                }

                // Construir novas linhas: manter header + remover linhas dos times draftados + adicionar novos
                const novasTplLines = [tplHeader];

                // Primeiro: adicionar todas as linhas originais que NÃO são de times draftados
                for (let i = 1; i < tplLines.length; i++) {
                    const line = tplLines[i];
                    if (!line.trim()) continue;
                    const cols = line.split("\t");
                    const tid = cols[colTid]?.trim();
                    if (draftTeams.has(tid)) continue; // pular — será substituído
                    novasTplLines.push(line);
                }

                // Segundo: adicionar jogadores do draft para cada time
                // (artificialkey = -1, como no converter_v2.py)
                for (const [teamId, players] of draftTeams) {
                    for (const j of players) {
                        const posMap = { GK: "0", DF: "1", MF: "2", FW: "3" };
                        const pos = posMap[j.posicao] || "3";
                        const jersey = Math.floor(Math.random() * 99) + 1;
                        novasTplLines.push(
                            `0\t0\t0\t0\t${jersey}\t${pos}\t-1\t${teamId}\t0\t0\t0\t0\t0\t${j.playerid}\t3\t0`
                        );
                    }
                }

                // ── 3. Salvar arquivos ──
                toast("Gerando arquivos TXT...");
                const tplJoined = novasTplLines.join("\r\n");
                const lgJoined = lgLines.join("\r\n");
                const tplData = encodeUTF16(tplJoined);
                const lgData = encodeUTF16(lgJoined);

                // Tenta usar File System Access API (salvar como)
                if (window.showSaveFilePicker) {
                    try {
                        const dirHandle = await window.showDirectoryPicker({ mode: "readwrite" });

                        const tplHandle = await dirHandle.getFileHandle("teamplayerlinks.txt", { create: true });
                        const tplWritable = await tplHandle.createWritable();
                        await tplWritable.write(tplData);
                        await tplWritable.close();

                        const lgHandle = await dirHandle.getFileHandle("leagues.txt", { create: true });
                        const lgWritable = await lgHandle.createWritable();
                        await lgWritable.write(lgData);
                        await lgWritable.close();

                        toast("TXTs salvos em: " + dirHandle.name + " — Agora rode Importar.bat");
                    } catch (e) {
                        if (e.name !== "AbortError") toast("Erro ao salvar: " + e.message);
                    }
                } else {
                    const tplBlob = new Blob([tplData], { type: "application/octet-stream" });
                    const tplUrl = URL.createObjectURL(tplBlob);
                    const a1 = document.createElement("a");
                    a1.href = tplUrl; a1.download = "teamplayerlinks.txt";
                    document.body.appendChild(a1); a1.click();
                    document.body.removeChild(a1); URL.revokeObjectURL(tplUrl);

                    const lgBlob = new Blob([lgData], { type: "application/octet-stream" });
                    const lgUrl = URL.createObjectURL(lgBlob);
                    const a2 = document.createElement("a");
                    a2.href = lgUrl; a2.download = "leagues.txt";
                    document.body.appendChild(a2); a2.click();
                    document.body.removeChild(a2); URL.revokeObjectURL(lgUrl);

                    toast("TXTs baixados! Coloque na pasta do projeto e rode Importar.bat");
                }

                } catch (err) {
                    console.error("Erro na exportação:", err);
                    toast("Erro ao exportar: " + err.message);
                }

            }
        );

    salvarEstadoDraft();

}

// ======================
// MATA-MATA
// ======================

const FASES_MATA_MATA = [
    {
        key: "round32",
        nome: "16 avos de final",
        competidores: 32,
        jogos: 16
    },
    {
        key: "round16",
        nome: "Oitavas de final",
        competidores: 16,
        jogos: 8
    },
    {
        key: "quarterfinals",
        nome: "Quartas de final",
        competidores: 8,
        jogos: 4
    },
    {
        key: "semifinals",
        nome: "Semifinal",
        competidores: 4,
        jogos: 2
    },
    {
        key: "final",
        nome: "Final",
        competidores: 2,
        jogos: 1
    }
];

const MATA_MATA_STORAGE_KEY = "draftCopaMundo2026MataMata";
function fasesAPartir(
    chaveFase
) {

    const indice = FASES_MATA_MATA.findIndex(
        fase => fase.key === chaveFase
    );

    return FASES_MATA_MATA.slice(
        indice >= 0
            ? indice
            : 0
    );

}

function criarRodadaVazia(
    fase
) {

    return Array.from(
        { length: fase.jogos },
        ( _, index ) => ( {
            id: `${fase.key}-${index}`,
            a: null,
            b: null,
            golsA: null,
            golsB: null,
            vencedor: null,
            concluido: false
        } )
    );

}

function montarCompetidoresMataMata(
    total
) {

    total = total || FASES_MATA_MATA[0].competidores;

    const competidores = [];

    nomesJogadores.forEach(
        ( nome, index ) => {
            const pais = paisParticipante[index];

            if ( pais ) {
                competidores.push(
                    {
                        id: `humano-${index}`,
                        pais,
                        humano: true,
                        nomePessoa: nome
                    }
                );
            }
        }
    );

    if ( competidores.length > total ) {
        embaralharLista( competidores );
        competidores.splice( total );
    }

    const usados = new Set(
        competidores.map(
            competidor => competidor.pais
        )
    );

    while (
        competidores.length < total &&
        paisesCpu.length > 0
    ) {

        const disponiveis = paisesCpu.filter(
            pais => !usados.has( pais )
        );

        if ( disponiveis.length === 0 ) {
            break;
        }

        const pais = aleatorio( disponiveis );

        competidores.push(
            {
                id: `cpu-${pais}-${competidores.length}`,
                pais,
                humano: false
            }
        );

        usados.add( pais );

    }

    return competidores;

}

function sortearMataMata() {

    // Bloqueio para não-moderadores
    if (modoAtual !== MODO.OFFLINE && mpState && !mpState.isModerator) {
        toast("⛔ Apenas o moderador pode sortear.", 2000);
        return;
    }

    const faseInicial = FASES_MATA_MATA.find(
        fase => fase.key === config.startingPhase
    ) || FASES_MATA_MATA[0];

    const competidores = montarCompetidoresMataMata(
        faseInicial.competidores
    );

    embaralharLista( competidores );

    const rodadas = {};

    fasesAPartir( faseInicial.key ).forEach(
        fase => {
            rodadas[fase.key] = criarRodadaVazia( fase );
        }
    );

    rodadas[faseInicial.key].forEach(
        ( jogo, index ) => {
            jogo.a = competidores[index * 2] || null;
            jogo.b = competidores[index * 2 + 1] || null;
        }
    );

    mataMata = {
        versao: 1,
        criadoEm: Date.now(),
        faseInicial: faseInicial.key,
        competidores,
        rodadas
    };

    salvarMataMata();
    renderizarMataMata();

}

function embaralharLista(
    lista
) {

    for (
        let i = lista.length - 1;
        i > 0;
        i--
    ) {

        const j = Math.floor(
            Math.random() * ( i + 1 )
        );

        [ lista[i], lista[j] ] =
            [ lista[j], lista[i] ];

    }

    return lista;

}

// ======================
// SORTEIO INTERATIVO
// ======================

function iniciarModoSorteio() {

    if (modoAtual !== MODO.OFFLINE && !mpState.isModerator) {
        toast("⛔ Apenas o moderador pode iniciar o sorteio.", 2000);
        return;
    }

    const faseInicial = FASES_MATA_MATA.find(
        fase => fase.key === config.startingPhase
    ) || FASES_MATA_MATA[0];

    const competidores = montarCompetidoresMataMata(
        faseInicial.competidores
    );

    embaralharLista( competidores );

    const rodadas = {};

    fasesAPartir( faseInicial.key ).forEach(
        fase => {
            rodadas[fase.key] = criarRodadaVazia( fase );
        }
    );

    mataMata = {
        versao: 1,
        criadoEm: Date.now(),
        faseInicial: faseInicial.key,
        competidores: [],
        rodadas,
        emSorteio: true,
        indiceSorteio: 0,
        poolSorteio: competidores
    };

    document.getElementById(
        "draftArea"
    ).style.display = "none";

    document.getElementById(
        "resultsArea"
    ).style.display = "none";

    document.getElementById(
        "mataMataArea"
    ).style.display = "block";

    setActiveStep( 5 );
    renderizarModoSorteio();

}

function renderizarModoSorteio() {

    if (
        !mataMata ||
        !mataMata.emSorteio
    ) {
        return;
    }

    const area = document.getElementById(
        "mataMataBracket"
    );

    const faseInicial = FASES_MATA_MATA.find(
        fase => fase.key === mataMata.faseInicial
    ) || FASES_MATA_MATA[0];

    const jogos = mataMata.rodadas[faseInicial.key] || [];
    const totalSlots = jogos.length * 2;
    const slotsPreenchidos = mataMata.indiceSorteio;
    const restantes = totalSlots - slotsPreenchidos;

    document.getElementById(
        "mataFaseInicial"
    ).innerText = faseInicial.nome;

    document.getElementById(
        "mataCompetidores"
    ).innerText = totalSlots;

    document.getElementById(
        "mataHumanos"
    ).innerText = ( mataMata.poolSorteio || [] ).filter(
        c => c.humano
    ).length + mataMata.competidores.filter(
        c => c.humano
    ).length;

    area.innerHTML = `
        <section class="mata-results-panel">
            <div class="mata-results-head">
                <div>
                    <div class="mata-results-eyebrow">Sorteio interativo</div>
                    <h2>${restantes > 0 ? "Sorteie os times um a um" : "Sorteio concluído!"}</h2>
                </div>
                <span>${slotsPreenchidos}/${totalSlots}</span>
            </div>

            <div style="display:flex;flex-direction:column;gap:16px;align-items:center;">

                <div class="mata-summary" style="width:100%;margin:0;">
                    <div>
                        <span class="mata-summary-label">Times no pote</span>
                        <strong>${mataMata.poolSorteio.length}</strong>
                    </div>
                    <div>
                        <span class="mata-summary-label">Humanos no pote</span>
                        <strong>${(mataMata.poolSorteio || []).filter(c => c.humano).length}</strong>
                    </div>
                </div>

                ${restantes > 0 ? `
                    <div style="display:flex;gap:10px;width:100%;max-width:500px;">
                        <button id="btnSortearProximo" class="btn-primary btn-sortear-um">
                            🎲 SORTEAR UM
                        </button>
                        <button id="btnSortearTodos" class="btn-primary btn-sortear-todos">
                            ⚡ SORTEAR TODOS
                        </button>
                    </div>
                ` : `
                    <button id="btnFinalizarSorteio" class="btn-primary" style="font-size:18px;padding:16px 32px;width:100%;max-width:400px;background:var(--win);">
                        ✅ FINALIZAR E VER CHAVEAMENTO
                    </button>
                `}
            </div>
        </section>

        <section class="mata-phase">
            <h2 style="text-align:center;font-size:14px;margin-bottom:10px;">${faseInicial.nome}</h2>
            <div class="mata-games-grid">
                ${jogos.map(( jogo, index ) => {
                    const slotA = index * 2;
                    const slotB = index * 2 + 1;
                    const preenchidoA = slotA < slotsPreenchidos;
                    const preenchidoB = slotB < slotsPreenchidos;
                    const ehProximo = slotA === slotsPreenchidos || slotB === slotsPreenchidos;

                    return `
                        <article class="mata-game tree-game ${preenchidoA && preenchidoB ? "is-done" : ""}" style="${preenchidoA || ehProximo ? "opacity:1;" : "opacity:0.5;"}border-color:${ehProximo && !preenchidoA ? "var(--accent)" : preenchidoA && !preenchidoB && ehProximo ? "var(--accent-2)" : "var(--ink)"};">
                            <div class="mata-game-head">
                                <span>Jogo ${index + 1} ${ehProximo && !preenchidoA ? "⬅️" : ""}</span>
                                ${preenchidoA && preenchidoB ? "<strong>Completo</strong>" : "<span style='color:var(--accent);'>Aguardando...</span>"}
                            </div>
                            <div class="mata-matchup">
                                <div class="mata-team">
                                    ${renderizarCompetidorMataMata(jogo.a)}
                                </div>
                                <div class="mata-score">
                                    <span style="font-size:14px;color:var(--muted);font-weight:800;font-family:var(--body);">VS</span>
                                </div>
                                <div class="mata-team mata-team-right">
                                    ${renderizarCompetidorMataMata(jogo.b)}
                                </div>
                            </div>
                        </article>
                    `;
                }).join("")}
            </div>
        </section>
    `;

    const btnSortear = document.getElementById(
        "btnSortearProximo"
    );

    if ( btnSortear ) {
        btnSortear.addEventListener(
            "click",
            sortearProximoTime
        );
    }

    const btnTodos = document.getElementById(
        "btnSortearTodos"
    );

    if ( btnTodos ) {
        btnTodos.addEventListener(
            "click",
            sortearTodosTimes
        );
    }

    const btnFinalizar = document.getElementById(
        "btnFinalizarSorteio"
    );

    if ( btnFinalizar ) {
        btnFinalizar.addEventListener(
            "click",
            finalizarSorteio
        );
    }

}

function sortearProximoTime() {

    if (modoAtual !== MODO.OFFLINE && !mpState.isModerator) {
        toast("⛔ Apenas o moderador pode sortear.", 2000);
        return;
    }

    if (
        !mataMata ||
        !mataMata.emSorteio ||
        !mataMata.poolSorteio ||
        mataMata.poolSorteio.length === 0
    ) {
        return;
    }

    const faseInicial = FASES_MATA_MATA.find(
        fase => fase.key === mataMata.faseInicial
    ) || FASES_MATA_MATA[0];

    const jogos = mataMata.rodadas[faseInicial.key] || [];
    const totalSlots = jogos.length * 2;
    const slotIndex = mataMata.indiceSorteio;

    if ( slotIndex >= totalSlots ) {
        return;
    }

    const matchIndex = Math.floor( slotIndex / 2 );
    const isPosA = slotIndex % 2 === 0;

    const drawn = aleatorio( mataMata.poolSorteio );

    mataMata.poolSorteio = mataMata.poolSorteio.filter(
        c => c !== drawn
    );

    const jogo = jogos[matchIndex];

    if ( isPosA ) {
        jogo.a = drawn;
    } else {
        jogo.b = drawn;
    }

    mataMata.competidores.push( drawn );
    mataMata.indiceSorteio++;

    if ( mataMata.indiceSorteio >= totalSlots ) {
        mataMata.emSorteio = false;
        salvarMataMata();
        renderizarMataMata();
        if (typeof mpBroadcastMataMata === "function") mpBroadcastMataMata();
        return;
    }

    salvarMataMata();
    renderizarModoSorteio();
    if (typeof mpBroadcastMataMata === "function") mpBroadcastMataMata();

}

function finalizarSorteio() {

    if (modoAtual !== MODO.OFFLINE && !mpState.isModerator) {
        toast("⛔ Apenas o moderador pode finalizar.", 2000);
        return;
    }

    if ( !mataMata ) {
        return;
    }

    mataMata.emSorteio = false;
    salvarMataMata();
    renderizarMataMata();
    if (typeof mpBroadcastMataMata === "function") mpBroadcastMataMata();

}

function sortearTodosTimes() {

    if (modoAtual !== MODO.OFFLINE && !mpState.isModerator) {
        toast("⛔ Apenas o moderador pode sortear.", 2000);
        return;
    }

    if ( !mataMata || !mataMata.emSorteio || !mataMata.poolSorteio || mataMata.poolSorteio.length === 0 ) {
        return;
    }

    const faseInicial = FASES_MATA_MATA.find(
        fase => fase.key === mataMata.faseInicial
    ) || FASES_MATA_MATA[0];

    const jogos = mataMata.rodadas[ faseInicial.key ] || [];
    const totalSlots = jogos.length * 2;

    while ( mataMata.indiceSorteio < totalSlots && mataMata.poolSorteio.length > 0 ) {
        const drawn = aleatorio( mataMata.poolSorteio );
        mataMata.poolSorteio = mataMata.poolSorteio.filter( c => c !== drawn );
        const slotIndex = mataMata.indiceSorteio;
        const matchIndex = Math.floor( slotIndex / 2 );
        if ( slotIndex % 2 === 0 ) {
            jogos[ matchIndex ].a = drawn;
        } else {
            jogos[ matchIndex ].b = drawn;
        }
        mataMata.competidores.push( drawn );
        mataMata.indiceSorteio++;
    }

    mataMata.emSorteio = false;
    salvarMataMata();
    renderizarMataMata();
    if (typeof mpBroadcastMataMata === "function") mpBroadcastMataMata();

}

function reiniciarSorteio() {

    iniciarModoSorteio();

}

function jogosDaFase(
    chaveFase
) {

    return (
        mataMata?.rodadas?.[ chaveFase ] ||
        []
    );

}

function faseInicialTemConfrontos() {

    return jogosDaFase(
        mataMata.faseInicial
    ).length > 0;

}

function garantirConfrontosIniciais() {

    if (
        !mataMata ||
        !mataMata.faseInicial ||
        faseInicialTemConfrontos()
    ) {
        return;
    }

    const faseInicial = FASES_MATA_MATA.find(
        fase => fase.key === mataMata.faseInicial
    ) || FASES_MATA_MATA[0];

    const competidores = mataMata.competidores?.length
        ? mataMata.competidores
        : montarCompetidoresMataMata( faseInicial.competidores );

    const rodadas = mataMata.rodadas || {};

    fasesAPartir( faseInicial.key ).forEach(
        fase => {
            if ( !rodadas[fase.key] ) {
                rodadas[fase.key] = criarRodadaVazia( fase );
            }
        }
    );

    rodadas[faseInicial.key].forEach(
        ( jogo, index ) => {
            jogo.a = competidores[index * 2] || null;
            jogo.b = competidores[index * 2 + 1] || null;
        }
    );

    mataMata.competidores = competidores;
    mataMata.rodadas = rodadas;

    salvarMataMata();

}

function salvarMataMata() {

    localStorage.setItem(
        MATA_MATA_STORAGE_KEY,
        JSON.stringify( mataMata )
    );

}

function carregarMataMata() {

    const salvo = localStorage.getItem(
        MATA_MATA_STORAGE_KEY
    );

    if ( !salvo ) {
        return null;
    }

    try {
        return JSON.parse( salvo );
    } catch ( erro ) {
        console.warn(
            "Não foi possível carregar o mata-mata salvo:",
            erro
        );
        return null;
    }

}

function sincronizarProximasFases() {

    if ( !mataMata || !mataMata.rodadas ) {
        return;
    }

    const fases = fasesAPartir( mataMata.faseInicial );

    for (
        let faseIndex = 1;
        faseIndex < fases.length;
        faseIndex++
    ) {

        const faseAtual = fases[faseIndex];
        const faseAnterior = fases[faseIndex - 1];
        const jogosAtuais = mataMata.rodadas[faseAtual.key];
        const jogosAnteriores = mataMata.rodadas[faseAnterior.key];

        if ( !jogosAtuais || !jogosAnteriores ) {
            continue;
        }

        jogosAtuais.forEach(
            ( jogo, index ) => {
                const jogoIda = jogosAnteriores[index * 2];
                const jogoVolta = jogosAnteriores[index * 2 + 1];

                jogo.a = jogoIda?.vencedor || null;
                jogo.b = jogoVolta?.vencedor || null;

                if ( !jogo.a || !jogo.b ) {
                    jogo.golsA = null;
                    jogo.golsB = null;
                    jogo.vencedor = null;
                    jogo.concluido = false;
                }
            }
        );

    }

    salvarMataMata();

}

function recalcularFasesPosteriores(
    indiceFase
) {

    if ( !mataMata || !mataMata.rodadas ) {
        return;
    }

    const fases = fasesAPartir( mataMata.faseInicial );
    const faseAtual = fases[indiceFase];

    if ( !faseAtual ) {
        return;
    }

    for (
        let faseIndex = indiceFase + 1;
        faseIndex < fases.length;
        faseIndex++
    ) {

        const fase = fases[faseIndex];
        const faseAnterior = fases[faseIndex - 1];
        const jogosAtuais = mataMata.rodadas[fase.key];
        const jogosAnteriores = mataMata.rodadas[faseAnterior.key];

        if ( !jogosAtuais || !jogosAnteriores ) {
            continue;
        }

        jogosAtuais.forEach(
            ( jogo, index ) => {
                const jogoIda = jogosAnteriores[index * 2];
                const jogoVolta = jogosAnteriores[index * 2 + 1];

                jogo.a = jogoIda?.vencedor || null;
                jogo.b = jogoVolta?.vencedor || null;
                jogo.golsA = null;
                jogo.golsB = null;
                jogo.vencedor = null;
                jogo.concluido = false;
                jogo._cpuFeito = false;
            }
        );

    }

}

function sortearGolsCpu() {

    const golsA = Math.floor(
        Math.random() * 6
    );

    let golsB = Math.floor(
        Math.random() * 6
    );

    while ( golsB === golsA ) {
        golsB = Math.floor(
            Math.random() * 6
        );
    }

    return {
        golsA,
        golsB
    };

}

function randomizarResultadosCpuCpu() {

    if ( !mataMata || !mataMata.rodadas ) {
        return;
    }

    const fases = fasesAPartir( mataMata.faseInicial );
    let alterado = false;

    fases.forEach(
        fase => {
            ( mataMata.rodadas[fase.key] || [] ).forEach(
                jogo => {
                    if (
                        jogo.concluido ||
                        !jogo.a ||
                        !jogo.b ||
                        jogo._cpuFeito
                    ) {
                        return;
                    }

                    const eHumano = jogo.a.humano === true || jogo.b.humano === true;
                    if ( eHumano ) {
                        return;
                    }

                    const placar = sortearGolsCpu();

                    jogo.golsA = placar.golsA;
                    jogo.golsB = placar.golsB;
                    jogo.vencedor = placar.golsA > placar.golsB
                        ? jogo.a
                        : jogo.b;
                    jogo.concluido = true;
                    jogo._cpuFeito = true;
                    alterado = true;
                }
            );
        }
    );

    if ( alterado ) {
        salvarMataMata();
    }

}

function renderizarMataMata() {

    if ( !mataMata ) {
        return;
    }

    if ( mataMata.emSorteio ) {
        renderizarModoSorteio();
        return;
    }

    garantirConfrontosIniciais();
    sincronizarProximasFases();

    const area = document.getElementById(
        "mataMataBracket"
    );

    const faseInicial = FASES_MATA_MATA.find(
        fase => fase.key === mataMata.faseInicial
    ) || FASES_MATA_MATA[0];

    document.getElementById(
        "mataFaseInicial"
    ).innerText = faseInicial.nome;

    document.getElementById(
        "mataCompetidores"
    ).innerText = mataMata.competidores?.length || 0;

    document.getElementById(
        "mataHumanos"
    ).innerText = ( mataMata.competidores || [] ).filter(
        competidor => competidor.humano
    ).length;

    const fases = fasesAPartir( mataMata.faseInicial );

    area.innerHTML = renderizarPainelResultados( fases ) + renderizarBracketHLTV( fases );

}

function renderizarFaseMataMata(
    fase
) {

    const jogos = mataMata.rodadas[fase.key] || [];

    return `
        <section class="mata-phase">
            <h2>${fase.nome}</h2>
            <div class="mata-games">
                ${jogos.map( renderizarJogoMataMata ).join( "" )}
            </div>
        </section>
    `;

}

function renderizarPainelResultados(
    fases
) {

    // Encontrar a primeira fase que ainda tem partidas pendentes
    let faseAtiva = null;
    const todosJogos = [];

    fases.forEach(
        fase => {
            const jogos = ( mataMata.rodadas[fase.key] || [] ).filter(
                j => j.a && j.b && ( j.a.humano || j.b.humano )
            );
            if ( jogos.length > 0 && faseAtiva === null ) {
                const pendentes = jogos.filter( j => !j.concluido );
                if ( pendentes.length > 0 ) {
                    faseAtiva = fase;
                }
            }
            jogos.forEach( j => todosJogos.push( { fase, jogo: j } ) );
        }
    );

    // Só mostrar partidas da fase ativa (a primeira incompleta)
    const jogosPendentes = [];

    if ( faseAtiva ) {
        ( mataMata.rodadas[ faseAtiva.key ] || [] ).forEach(
            ( jogo, index ) => {
                if (
                    jogo.a &&
                    jogo.b &&
                    !jogo.concluido &&
                    ( jogo.a.humano || jogo.b.humano )
                ) {
                    jogosPendentes.push( { fase: faseAtiva, jogo, index } );
                }
            }
        );
    }

    return `
        <section class="mata-results-panel">
            <div class="mata-results-head">
                <div>
                    <div class="mata-results-eyebrow">Painel de resultados</div>
                    <h2>Atualizar placares</h2>
                </div>
                <span>${jogosPendentes.length} jogo(s) pendente(s)</span>
            </div>

            <div class="mata-results-list">
                ${jogosPendentes.length
                    ? jogosPendentes.map( renderizarLinhaResultado ).join( "" )
                    : `<div class="mata-results-empty">Nenhum jogo pendente. A árvore já está atualizada.</div>`
                }
            </div>
        </section>
    `;

}

function renderizarLinhaResultado(
    item
) {

    const { fase, jogo, index } = item;

    return `
        <article class="mata-result-row" data-result-row="${jogo.id}">
            <div class="mata-result-meta">
                <span>${fase.nome}</span>
                <strong>Jogo ${index + 1}</strong>
            </div>

            <div class="mata-result-match">
                <div class="mata-result-team">
                    ${renderizarCompetidorMataMata( jogo.a, false )}
                </div>

                <div class="mata-result-score">
                    <input
                        type="number"
                        min="0"
                        inputmode="numeric"
                        value="${jogo.golsA ?? 0}"
                        data-team="a"
                        data-game="${jogo.id}"
                        aria-label="Gols de ${jogo.a?.pais || "casa"}"
                    >
                    <span>x</span>
                    <input
                        type="number"
                        min="0"
                        inputmode="numeric"
                        value="${jogo.golsB ?? 0}"
                        data-team="b"
                        data-game="${jogo.id}"
                        aria-label="Gols de ${jogo.b?.pais || "visitante"}"
                    >
                </div>

                <div class="mata-result-team mata-result-team-right">
                    ${renderizarCompetidorMataMata( jogo.b, false )}
                </div>
            </div>

            <button
                class="btn-confirm mata-result-save"
                data-confirmar
                data-game="${jogo.id}"
            >
                Salvar resultado
            </button>
        </article>
    `;

}


// ======================
// BRACKET HLTV
// ======================

function renderizarBracketHLTV( fases ) {

    // Determinar total de linhas do grid baseado na fase inicial
    const primeiraFase = fases[ 0 ];
    const cardsPorLado = ( mataMata.rodadas[ primeiraFase.key ] || [] ).length / 2;
    const totalLinhas = cardsPorLado * 3;

    const fasesTree = fases.filter(
        f => [ "round32", "round16", "quarterfinals", "semifinals", "final" ].includes( f.key )
    );

    function spanDaFase( key ) {
        const jogos = mataMata.rodadas[ key ] || [];
        const lado = key === "final" ? 1 : jogos.length / 2;
        return Math.round( totalLinhas / lado );
    }

    let html = `<div class="bracket-hltv" id="bracketHLTV">`;

    // Colunas da esquerda
    [ "round32", "round16", "quarterfinals", "semifinals" ].forEach( key => {
        const jogos = ( mataMata.rodadas[ key ] || [] ).slice( 0, ( mataMata.rodadas[ key ] || [] ).length / 2 );
        if ( jogos.length === 0 ) return;
        const span = spanDaFase( key );
        const label = FASES_MATA_MATA.find( f => f.key === key )?.nome || key;

        html += `<div class="bracket-hltv-col" data-phase="${key}" data-side="left" style="--rows:${totalLinhas};">`;
        html += `<div class="bracket-hltv-title">${label}</div>`;
        jogos.forEach( jogo => {
            const v = jogo.vencedor;
            html += `<div class="bracket-hltv-card ${jogo.concluido ? "is-done" : ""}" data-game="${jogo.id}" style="grid-row: span ${span};">
                <div class="bracket-hltv-team ${v && v === jogo.a ? "is-winner" : (jogo.concluido ? "is-loser" : "")}">${renderizarCompetidorMataMata( jogo.a, false )}${jogo.concluido ? `<span class="bracket-hltv-score">${jogo.golsA}</span>` : ""}</div>
                <div class="bracket-hltv-team ${v && v === jogo.b ? "is-winner" : (jogo.concluido ? "is-loser" : "")}">${renderizarCompetidorMataMata( jogo.b, false )}${jogo.concluido ? `<span class="bracket-hltv-score">${jogo.golsB}</span>` : ""}</div>
            </div>`;
        } );
        html += `</div>`;
    } );

    // Coluna central: Final + Campeão
    const jogoFinal = ( mataMata.rodadas.final || [] )[ 0 ];
    const campeao = obterCampeaoMataMata();
    const vice = obterViceCampeaoMataMata();
    const spanFinal = spanDaFase( "final" );

    html += `<div class="bracket-hltv-col bracket-hltv-final" data-phase="final" style="--rows:${totalLinhas};">`;
    html += `<div class="bracket-hltv-title">Final</div>`;

    if ( jogoFinal ) {
        const v = jogoFinal.vencedor;
        html += `<div class="bracket-hltv-card ${jogoFinal.concluido ? "is-done" : ""} is-final" data-game="${jogoFinal.id}" style="grid-row: span ${spanFinal};">
            <div class="bracket-hltv-team ${v && v === jogoFinal.a ? "is-winner" : (jogoFinal.concluido ? "is-loser" : "")}">${renderizarCompetidorMataMata( jogoFinal.a, false )}${jogoFinal.concluido ? `<span class="bracket-hltv-score">${jogoFinal.golsA}</span>` : ""}</div>
            <div class="bracket-hltv-team ${v && v === jogoFinal.b ? "is-winner" : (jogoFinal.concluido ? "is-loser" : "")}">${renderizarCompetidorMataMata( jogoFinal.b, false )}${jogoFinal.concluido ? `<span class="bracket-hltv-score">${jogoFinal.golsB}</span>` : ""}</div>
        </div>`;
    }

    if ( campeao ) {
        html += `<div class="bracket-hltv-champion">
            <span class="bracket-hltv-trophy">🏆</span>
            <span class="bracket-hltv-champion-label">Campeã(o)</span>
            <div class="bracket-hltv-champion-team">${renderizarCompetidorMataMata( campeao )}</div>
        </div>`;
    }

    if ( vice ) {
        html += `<div class="bracket-hltv-runnerup">
            <span class="bracket-hltv-runnerup-label">Vice-campeã(o)</span>
            <div class="bracket-hltv-runnerup-team">${renderizarCompetidorMataMata( vice )}</div>
        </div>`;
    }

    html += `</div>`;

    // Colunas da direita (do centro para fora)
    [ "semifinals", "quarterfinals", "round16", "round32" ].forEach( key => {
        const total = ( mataMata.rodadas[ key ] || [] ).length;
        const jogos = ( mataMata.rodadas[ key ] || [] ).slice( total / 2 );
        if ( jogos.length === 0 ) return;
        const span = spanDaFase( key );
        const label = FASES_MATA_MATA.find( f => f.key === key )?.nome || key;

        html += `<div class="bracket-hltv-col" data-phase="${key}" data-side="right" style="--rows:${totalLinhas};">`;
        html += `<div class="bracket-hltv-title">${label}</div>`;
        jogos.forEach( jogo => {
            const v = jogo.vencedor;
            html += `<div class="bracket-hltv-card ${jogo.concluido ? "is-done" : ""}" data-game="${jogo.id}" style="grid-row: span ${span};">
                <div class="bracket-hltv-team ${v && v === jogo.a ? "is-winner" : (jogo.concluido ? "is-loser" : "")}">${renderizarCompetidorMataMata( jogo.a, false )}${jogo.concluido ? `<span class="bracket-hltv-score">${jogo.golsA}</span>` : ""}</div>
                <div class="bracket-hltv-team ${v && v === jogo.b ? "is-winner" : (jogo.concluido ? "is-loser" : "")}">${renderizarCompetidorMataMata( jogo.b, false )}${jogo.concluido ? `<span class="bracket-hltv-score">${jogo.golsB}</span>` : ""}</div>
            </div>`;
        } );
        html += `</div>`;
    } );

    // SVG placeholder (conectores serão desenhados após o DOM)
    html += `<svg class="bracket-hltv-svg"></svg>`;
    html += `</div>`;

    requestAnimationFrame( () => desenharConexoesHLTV() );
    return html;

}

function desenharConexoesHLTV() {

    const container = document.getElementById( "bracketHLTV" );
    if ( !container ) return;

    const rect = container.getBoundingClientRect();

    const colMap = {};
    container.querySelectorAll( ".bracket-hltv-col" ).forEach( col => {
        const phase = col.dataset.phase;
        const side = col.dataset.side || "center";
        if ( !colMap[ phase ] ) colMap[ phase ] = {};
        const colRect = col.getBoundingClientRect();
        colMap[ phase ][ side ] = {
            left: colRect.left - rect.left,
            right: colRect.right - rect.left,
            cards: Array.from( col.querySelectorAll( ".bracket-hltv-card" ) ).map( card => {
                const r = card.getBoundingClientRect();
                return {
                    left: r.left - rect.left,
                    right: r.right - rect.left,
                    centerY: r.top - rect.top + r.height / 2
                };
            } )
        };
    } );

    const PAIRS = [
        [ "round32", "round16" ],
        [ "round16", "quarterfinals" ],
        [ "quarterfinals", "semifinals" ]
    ];

    let paths = [];

    // Left side: flow rightwards
    PAIRS.forEach( ( [ from, to ] ) => {
        const src = colMap[ from ]?.left;
        const tgt = colMap[ to ]?.left;
        if ( !src || !tgt ) return;
        const midX = ( src.right + tgt.left ) / 2;

        for ( let i = 0; i < tgt.cards.length; i++ ) {
            const a = src.cards[ i * 2 ];
            const b = src.cards[ i * 2 + 1 ];
            const c = tgt.cards[ i ];
            if ( !a || !b || !c ) continue;
            const yMerge = ( a.centerY + b.centerY ) / 2;
            paths.push( `M ${a.right} ${a.centerY} L ${midX} ${a.centerY} L ${midX} ${yMerge}` );
            paths.push( `M ${b.right} ${b.centerY} L ${midX} ${b.centerY} L ${midX} ${yMerge}` );
            paths.push( `M ${midX} ${yMerge} L ${midX} ${c.centerY} L ${c.left} ${c.centerY}` );
        }
    } );

    // Right side: flow leftwards
    PAIRS.forEach( ( [ from, to ] ) => {
        const src = colMap[ from ]?.right;
        const tgt = colMap[ to ]?.right;
        if ( !src || !tgt ) return;
        const midX = ( src.left + tgt.right ) / 2;

        for ( let i = 0; i < tgt.cards.length; i++ ) {
            const a = src.cards[ i * 2 ];
            const b = src.cards[ i * 2 + 1 ];
            const c = tgt.cards[ i ];
            if ( !a || !b || !c ) continue;
            const yMerge = ( a.centerY + b.centerY ) / 2;
            paths.push( `M ${a.left} ${a.centerY} L ${midX} ${a.centerY} L ${midX} ${yMerge}` );
            paths.push( `M ${b.left} ${b.centerY} L ${midX} ${b.centerY} L ${midX} ${yMerge}` );
            paths.push( `M ${midX} ${yMerge} L ${midX} ${c.centerY} L ${c.right} ${c.centerY}` );
        }
    } );

    // Semifinals → Final
    const sfL = colMap.semifinals?.left;
    const sfR = colMap.semifinals?.right;
    const fin = colMap.final?.center || colMap.final?.left;

    if ( sfL && sfL.cards[ 0 ] && fin && fin.cards[ 0 ] ) {
        const c = sfL.cards[ 0 ];
        const f = fin.cards[ 0 ];
        const midX = ( sfL.right + fin.left ) / 2;
        paths.push( `M ${c.right} ${c.centerY} L ${midX} ${c.centerY} L ${midX} ${f.centerY} L ${f.left} ${f.centerY}` );
    }

    if ( sfR && sfR.cards[ 0 ] && fin && fin.cards[ 0 ] ) {
        const c = sfR.cards[ 0 ];
        const f = fin.cards[ 0 ];
        const midX = ( sfR.left + fin.right ) / 2;
        paths.push( `M ${c.left} ${c.centerY} L ${midX} ${c.centerY} L ${midX} ${f.centerY} L ${f.right} ${f.centerY}` );
    }

    const svg = container.querySelector( ".bracket-hltv-svg" );
    if ( !svg ) return;

    svg.removeAttribute( "width" );
    svg.removeAttribute( "height" );
    svg.setAttribute( "viewBox", `0 0 ${rect.width} ${rect.height}` );
    svg.innerHTML = paths.map( d => `<path class="bracket-hltv-line" d="${d}" />` ).join( "" );

}


function renderizarCartaoCampeao(
    gridRow = null
) {

    const campeao = obterCampeaoMataMata();
    const style = gridRow ? `style="grid-row: ${gridRow};"` : "";

    return `
        <div class="mata-bracket-champion" ${style}>
            <span class="mata-champion-label">🏆 Campeã(o)</span>
            ${campeao ? renderizarCompetidorMataMata( campeao ) : renderizarCompetidorMataMata( null )}
        </div>
    `;

}

function renderizarCartaoViceCampeao(
    gridRow = null
) {

    const vice = obterViceCampeaoMataMata();
    const style = gridRow ? `style="grid-row: ${gridRow};"` : "";

    return `
        <div class="mata-bracket-runner" ${style}>
            <span class="mata-runner-label">Vice-campeã(o)</span>
            ${vice ? renderizarCompetidorMataMata( vice ) : renderizarCompetidorMataMata( null )}
        </div>
    `;

}


function renderizarJogoMataMata(
    jogo,
    index,
    faseIndex = 0,
    indiceOriginal = index,
    topo = 0,
    arvore = false
) {

    const bloqueado = jogo.concluido
        ? "disabled"
        : "";

    return `
        <article class="mata-game tree-game ${jogo.concluido ? "is-done" : ""}" data-game="${jogo.id}" style="top: ${topo}px;">
            <div class="mata-game-head">
                <span>${arvore ? "J" + (indiceOriginal + 1) : "Jogo " + (index + 1)}</span>
                ${jogo.concluido ? "<strong>OK</strong>" : ""}
            </div>

            <div class="mata-matchup">
                <div class="mata-team">
                    ${renderizarCompetidorMataMata( jogo.a )}
                </div>

                <div class="mata-score">
                    <input
                        type="number"
                        min="0"
                        inputmode="numeric"
                        value="${jogo.golsA ?? ""}"
                        data-team="a"
                        data-game="${jogo.id}"
                        aria-label="Gols do time A"
                    >
                    <span>x</span>
                    <input
                        type="number"
                        min="0"
                        inputmode="numeric"
                        value="${jogo.golsB ?? ""}"
                        data-team="b"
                        data-game="${jogo.id}"
                        aria-label="Gols do time B"
                    >
                </div>

                <div class="mata-team mata-team-right">
                    ${renderizarCompetidorMataMata( jogo.b )}
                </div>
            </div>

            ${jogo.vencedor ? `
                <div class="mata-winner">
                    Vencedor: ${renderizarCompetidorMataMata( jogo.vencedor )}
                </div>
            ` : ""}

            <button
                class="btn-confirm"
                data-confirmar
                data-game="${jogo.id}"
                ${bloqueado}
            >
                ${arvore ? "OK" : "Confirmar resultado"}
            </button>
        </article>
    `;

}

function renderizarCompetidorMataMata(
    competidor,
    mostrarHumano = true
) {

    if ( !competidor ) {
        return `<span class="mata-empty">A definir</span>`;
    }

    const nomeJogador = competidor.humano
        ? competidor.nomePessoa
        : "";

    const tagCpu = !competidor.humano && competidor.id?.startsWith( "cpu-" )
        ? `<span class="mata-cpu-tag">CPU</span>`
        : "";

    return `
        <span class="mata-competitor">
            <span class="mata-competitor-top">
                <span class="mata-country-code">${abreviacaoPais( competidor.pais )}</span>
                ${bandeira( competidor.pais )}
            </span>
            ${nomeJogador ? `<span class="mata-player-name">${nomeJogador}</span>` : ""}
            ${tagCpu}
        </span>
    `;

}

function obterCampeaoMataMata() {

    if ( !mataMata || !mataMata.rodadas ) {
        return null;
    }

    const faseFinal = FASES_MATA_MATA[FASES_MATA_MATA.length - 1];
    const jogoFinal = mataMata.rodadas[faseFinal.key]?.[0];

    return jogoFinal?.vencedor || null;

}

function obterViceCampeaoMataMata() {

    if ( !mataMata || !mataMata.rodadas ) {
        return null;
    }

    const jogoFinal = mataMata.rodadas.final?.[0];

    if ( !jogoFinal?.concluido ) {
        return null;
    }

    return jogoFinal.golsA > jogoFinal.golsB
        ? jogoFinal.b
        : jogoFinal.a;

}

function confirmarPlacar(
    idJogo
) {

    // Bloqueio para não-moderadores
    if (modoAtual !== MODO.OFFLINE && !mpState.isModerator) {
        toast("⛔ Apenas o moderador pode confirmar resultados.", 2000);
        return;
    }

    let faseEncontrada = null;
    let indiceFase = -1;
    let jogo = null;

    const fases = fasesAPartir( mataMata.faseInicial );

    fases.some(
        ( fase, faseIndex ) => {
            const encontrado = ( mataMata.rodadas[fase.key] || [] ).find(
                candidato => candidato.id === idJogo
            );

            if ( encontrado ) {
                faseEncontrada = fase;
                indiceFase = faseIndex;
                jogo = encontrado;
                return true;
            }

            return false;
        }
    );

    if ( !jogo || !jogo.a || !jogo.b ) {
        toast( "Este jogo ainda não tem os dois times definidos." );
        return;
    }

    const linhaResultado = document.querySelector(
        `[data-result-row="${idJogo}"]`
    );

    const inputA = linhaResultado?.querySelector(
        `input[data-team="a"]`
    );

    const inputB = linhaResultado?.querySelector(
        `input[data-team="b"]`
    );

    if ( !inputA || !inputB ) {
        toast( "Não foi possível encontrar o placar deste jogo." );
        return;
    }

    const golsA = parseInt( inputA.value, 10 );
    const golsB = parseInt( inputB.value, 10 );

    if (
        Number.isNaN( golsA ) ||
        Number.isNaN( golsB ) ||
        golsA < 0 ||
        golsB < 0
    ) {
        toast( "Digite o placar com números válidos." );
        return;
    }

    if ( golsA === golsB ) {
        toast( "Não pode haver empate no mata-mata. Defina um vencedor no placar." );
        return;
    }

    jogo.golsA = golsA;
    jogo.golsB = golsB;
    jogo.vencedor = golsA > golsB
        ? jogo.a
        : jogo.b;
    jogo.concluido = true;

    recalcularFasesPosteriores( indiceFase );
    randomizarResultadosCpuCpu();
    salvarMataMata();
    renderizarMataMata();

    // Broadcast do mata-mata para outros jogadores
    if (typeof mpBroadcastMataMata === "function") mpBroadcastMataMata();

}

function mostrarMataMata() {

    mataMata = carregarMataMata();

    // Esconder seções de multiplayer/lobby
    ["lobby", "draftConfig", "roomMenu"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = "none";
    });

    document.getElementById(
        "draftArea"
    ).style.display = "none";

    document.getElementById(
        "resultsArea"
    ).style.display = "none";

    document.getElementById(
        "mataMataArea"
    ).style.display = "block";

    setActiveStep( 5 );

    // Salvar que avançamos para o mata-mata
    salvarEstadoDraft();

    if ( !mataMata ) {
        iniciarModoSorteio();
        if (typeof mpDesabilitarMataMata === "function") mpDesabilitarMataMata();
        if (typeof mpBroadcastMataMata === "function") mpBroadcastMataMata();
        return;
    }

    if ( mataMata.emSorteio ) {
        renderizarModoSorteio();
        if (typeof mpDesabilitarMataMata === "function") mpDesabilitarMataMata();
        if (typeof mpBroadcastMataMata === "function") mpBroadcastMataMata();
        return;
    }

    renderizarMataMata();

    if (typeof mpDesabilitarMataMata === "function") mpDesabilitarMataMata();

}

async function resetarTudo() {

    // Confirmar antes de sair
    const confirmou = await mostrarModal({
        title: "Menu Inicial",
        message: "Você será levado ao menu inicial e todo o progresso atual será perdido.",
        confirmText: "Sair",
        cancelText: "Cancelar",
        eyebrow: "Draft"
    });
    if (!confirmou) return;

    // Avisar outros jogadores que o moderador saiu
    if (modoAtual !== MODO.OFFLINE && mpState && mpState.channel && mpState.isModerator) {
        mpState.channel.send({ type: "broadcast", event: "moderator_left", payload: {} });
    }
    // Limpar estado multiplayer
    if (typeof mpSairSala === "function") mpSairSala();

    // Preservar nome e tema antes de limpar
    const nome = localStorage.getItem(PRE_MENU_KEY);
    const tema = localStorage.getItem(THEME_KEY);
    localStorage.clear();
    if (nome) localStorage.setItem(PRE_MENU_KEY, nome);
    if (tema) localStorage.setItem(THEME_KEY, tema);
    limparEstadoDraft();
    location.reload();

}

// ======================
// REFRESH
// ======================

document
    .getElementById(
        "refreshBtn"
    )
    .addEventListener(
        "click",
        () => {

            if (
                refreshesPorJogador[
                    jogadorAtual
                ] <= 0
            ) {
                return;
            }

            refreshesPorJogador[
                jogadorAtual
            ]--;

            atualizarRefreshes();

            gerarPool();

            // Broadcast pool em multiplayer
            if (typeof mpBroadcastPool === "function") mpBroadcastPool();

        }
    );

// ======================
// INICIAR SISTEMA
// ======================

// ======================
// MODAL DE CONFIRMAÇÃO
// ======================

function mostrarModal(
    {
        title = "Recomeçar Draft?",
        message = "Todo o progresso atual será perdido e um novo draft será iniciado.",
        confirmText = "Sim, reiniciar",
        cancelText = "Cancelar",
        eyebrow = "Draft"
    } = {}
) {

    const overlay =
        document.getElementById(
            "modalOverlay"
        );

    document.querySelector(
        ".modal-eyebrow"
    ).textContent = eyebrow;

    document.querySelector(
        ".modal-title"
    ).textContent = title;

    document.querySelector(
        ".modal-msg"
    ).textContent = message;

    document.querySelector(
        ".modal-confirm-text"
    ).textContent = confirmText;

    document.querySelector(
        ".modal-cancel-text"
    ).textContent = cancelText;

    overlay.style.display =
        "flex";

    return new Promise(
        resolve => {

            const confirmar =
                document.getElementById(
                    "modalConfirm"
                );

            const cancelar =
                document.getElementById(
                    "modalCancel"
                );

            const fechar =
                document.getElementById(
                    "modalClose"
                );

            function limpar() {

                overlay.style.display =
                    "none";

                confirmar.removeEventListener(
                    "click", onConfirm
                );

                cancelar.removeEventListener(
                    "click", onCancel
                );

                fechar.removeEventListener(
                    "click", onCancel
                );

                overlay.removeEventListener(
                    "click", onOverlay
                );

                document.removeEventListener(
                    "keydown", onEscape
                );

            }

            function onEscape(e) {

                if (
                    e.key === "Escape"
                ) {

                    onCancel();

                }

            }

            function onConfirm() {

                limpar();
                resolve(true);

            }

            function onCancel() {

                limpar();
                resolve(false);

            }

            function onOverlay(e) {

                if (
                    e.target === overlay
                ) {

                    onCancel();

                }

            }

            confirmar.addEventListener(
                "click", onConfirm
            );

            cancelar.addEventListener(
                "click", onCancel
            );

            fechar.addEventListener(
                "click", onCancel
            );

            overlay.addEventListener(
                "click", onOverlay
            );

            document.addEventListener(
                "keydown", onEscape
            );

        }
    );

}

document
    .getElementById("restartDraft")
    .addEventListener(
        "click",
        () => {
            pararTimer();
            limparEstadoDraft();
            localStorage.removeItem(MATA_MATA_STORAGE_KEY);
            // Avisar outros jogadores que o moderador saiu
            if (modoAtual !== MODO.OFFLINE && mpState && mpState.channel && mpState.isModerator) {
                mpState.channel.send({ type: "broadcast", event: "moderator_left", payload: {} });
            }
            // Limpar estado multiplayer
            if (typeof mpSairSala === "function") mpSairSala();
            document.getElementById("draftArea").style.display = "none";
            document.getElementById("preMenu").style.display = "block";
            document.getElementById("setup").style.display = "none";
            document.getElementById("countrySelection").style.display = "none";
            document.getElementById("resultsArea").style.display = "none";
            document.getElementById("mataMataArea").style.display = "none";
            const stepsBar = document.getElementById("stepsBar");
            if (stepsBar) stepsBar.style.display = "none";
            iniciarPreMenu();
        }
    );

document
    .getElementById("goToMataMata")
    .addEventListener(
        "click",
        () => {
            mostrarMataMata();
            // Aplicar proteções para não-moderadores
            if (typeof mpDesabilitarMataMata === "function") {
                mpDesabilitarMataMata();
                // Reaplicar após renderização completa
                setTimeout(() => mpDesabilitarMataMata(), 300);
            }
            // Broadcast para outros jogadores entrarem no mata-mata (com estado completo)
            if (modoAtual !== MODO.OFFLINE && mpState && mpState.channel && mpState.isModerator) {
                mpState.channel.send({ type: "broadcast", event: "enter_mata_mata", payload: { mataMata } });
            }
        }
    );

document
    .getElementById("backToResults")
    .addEventListener(
        "click",
        () => {
            document.getElementById(
                "mataMataArea"
            ).style.display = "none";

            document.getElementById(
                "resultsArea"
            ).style.display = "block";

            setActiveStep( 4 );
            // Renderizar resultados se estiver vazio (multiplayer após F5)
            const finalResults = document.getElementById("finalResults");
            if (finalResults && !finalResults.innerHTML.trim()) {
                mostrarResultadoFinal();
            }
            salvarEstadoDraft();
            // Reaplicar proteções para não-moderadores
            if (typeof mpDesabilitarResults === "function") mpDesabilitarResults();
        }
    );

document
    .getElementById("backToDraft")
    .addEventListener(
        "click",
        async () => {

            const confirmou = await mostrarModal( {
                title: "Refazer Draft?",
                message: "Todos os picks feitos serão apagados. Você voltará à tela de draft para recomeçar do zero.",
                confirmText: "Sim, refazer",
                cancelText: "Cancelar",
                eyebrow: "Draft"
            } );

            if ( !confirmou ) return;

            // Resetar estado do draft por completo (zerar picks, times, refreshes)
            jogadoresDisponiveis = [ ...jogadoresBase ];
            poolAtual = [];
            times = nomesJogadores.map( () => [] );
            participantesAtivos = nomesJogadores.map( ( _, idx ) => idx );
            jogadorAtual = participantesAtivos[ 0 ] ?? 0;
            pickAtual = 1;
            direcaoSnake = 1;
            refreshesPorJogador = nomesJogadores.map( () => config.refreshCount );

            document.getElementById( "countrySelection" ).style.display = "none";
            document.getElementById( "resultsArea" ).style.display = "none";
            document.getElementById( "mataMataArea" ).style.display = "none";
            document.getElementById( "draftArea" ).style.display = "block";

            renderizarTeamCards();
            atualizarStatus();
            atualizarRefreshes();
            gerarPool();
            setActiveStep( 3 );
            salvarEstadoDraft();
        }
    );

document
    .getElementById("sortearMataMata")
    .addEventListener(
        "click",
        async () => {
            const confirmou = await mostrarModal( {
                title: "Reiniciar sorteio?",
                message: "Os placares e avanços atuais serão apagados e um novo sorteio será iniciado.",
                confirmText: "Sim, sortear",
                cancelText: "Cancelar",
                eyebrow: "Mata-mata"
            } );

            if ( !confirmou ) {
                return;
            }

            iniciarModoSorteio();
            // Broadcast para outros jogadores
            setTimeout(() => {
                if (typeof mpBroadcastMataMata === "function") mpBroadcastMataMata();
            }, 200);
        }
    );

document
    .getElementById("resetarTudo")
    .addEventListener(
        "click",
        resetarTudo
    );

document
    .getElementById("resetFromResults")
    .addEventListener(
        "click",
        resetarTudo
    );

document
    .getElementById("mataMataBracket")
    .addEventListener(
        "click",
        ( evento ) => {
            const botao = evento.target.closest(
                "[data-confirmar]"
            );

            if ( !botao ) {
                return;
            }

            confirmarPlacar(
                botao.dataset.game
            );
        }
    );

// Salvar valores dos inputs no objeto jogo conforme o usuário digita
document
    .getElementById("mataMataBracket")
    .addEventListener(
        "change",
        ( evento ) => {
            const input = evento.target.closest(
                "input[data-game][data-team]"
            );
            if ( !input ) return;

            const fases = fasesAPartir( mataMata.faseInicial );
            const jogo = fases.reduce(
                ( encontrado, fase ) => {
                    return encontrado || ( mataMata.rodadas[ fase.key ] || [] ).find(
                        j => j.id === input.dataset.game
                    );
                },
                null
            );

            if ( jogo && !jogo.concluido ) {
                const valor = Math.max( 0, parseInt( input.value ) || 0 );
                if ( input.dataset.team === "a" ) {
                    jogo.golsA = valor;
                } else {
                    jogo.golsB = valor;
                }
            }
        }
    );

// ======================
// NOTAS DAS CONFIGURAÇÕES
// ======================

const camposNota = [
    { id: "draftMode",        nota: "note-formato" },
    { id: "startingPhase",    nota: "note-starting-phase" },
    { id: "goalkeeperRule",   nota: "note-goleiros" },
    { id: "playersPerTeam",   nota: "note-elenco" },
    { id: "refreshCount",     nota: "note-refreshes" },
    { id: "iconsHeroesMode",  nota: "note-icons-heroes" },
];

function mostrarNota(idNota) {

    document.querySelectorAll(
        ".setting-note"
    ).forEach(n =>
        n.classList.remove(
            "is-visible"
        )
    );

    const nota = document.getElementById(
        idNota
    );

    if (nota) {

        nota.classList.add(
            "is-visible"
        );

    }

}

// Mostrar nota ao focar ou mudar o campo
camposNota.forEach(c => {

    const campo = document.getElementById(
        c.id
    );

    if (!campo) return;

    function ativar() {

        mostrarNota(
            c.nota
        );

    }

    campo.addEventListener(
        "focus", ativar
    );

    campo.addEventListener(
        "change", ativar
    );

});

// Esconder nota ao clicar fora
document.addEventListener(
    "click",
    (e) => {

        const dentro = e.target.closest(
            ".setting-row"
        );

        if (!dentro) {

            document.querySelectorAll(
                ".setting-note"
            ).forEach(n =>
                n.classList.remove(
                    "is-visible"
                )
            );

        }

    }
);

// ======================
// ATUALIZAR ETAPA ATIVA
// ======================

function setActiveStep(step) {

    document.querySelectorAll(
        ".steps-item"
    ).forEach(item => {

        const num =
            parseInt(
                item.dataset.step
            );

        item.classList.toggle(
            "is-active",
            num === step
        );

    });

}

carregarJogadores();
carregarIconsHeroes();

// Estimativa de icons+heroes por equipe (media estimada)
function atualizarEstimativaIconsHeroes() {
    const estimateEl = document.getElementById("poolSpecialChanceEstimate");
    const iconsHeroesSelect = document.getElementById("iconsHeroesMode");
    const poolSlider = document.getElementById("poolSpecialChance");
    if (!estimateEl || !poolSlider || !iconsHeroesSelect) return;

    const modo = iconsHeroesSelect.value;
    if (modo === "none") {
        estimateEl.textContent = "";
        return;
    }
    const chance = parseInt(poolSlider.value, 10) / 100; // 0-10000 → 0-100 (%)
    const porElenco = parseInt(document.getElementById("playersPerTeam")?.value || "18", 10);
    // Cada equipe faz `porElenco` picks, cada um com `chance`% de ser icon/hero
    const mediaPorElenco = (porElenco * chance) / 100;
    const formatado = mediaPorElenco.toFixed(1);
    const tipoLabel = modo === "icons" ? "icones" : modo === "heroes" ? "herois" : "icones+herois";
    estimateEl.textContent = "Media estimada: ~" + formatado + " " + tipoLabel + " por equipe";
}

// Sincronizar slider <-> input numérico do poolSpecialChance
(function() {
    const poolSlider = document.getElementById("poolSpecialChance");
    const poolInput = document.getElementById("poolSpecialChanceInput");
    if (poolSlider && poolInput) {
        // Escala linear: 0-10000 no slider ↔ 0-100 no input
        poolSlider.addEventListener("input", () => {
            const pct = parseInt(poolSlider.value) / 100;
            poolInput.value = pct.toFixed(2);
            atualizarEstimativaIconsHeroes();
        });
        poolInput.addEventListener("input", () => {
            const pct = Math.min(100, Math.max(0, parseFloat(poolInput.value) || 0));
            poolSlider.value = Math.round(pct * 100);
            atualizarEstimativaIconsHeroes();
        });
    }

    // Atualizar estimativa ao mudar participantes ou jogadores/elenco
    ["playerCount", "playersPerTeam"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("change", atualizarEstimativaIconsHeroes);
    });
    const iconsHeroesSelect = document.getElementById("iconsHeroesMode");
    if (iconsHeroesSelect) {
        iconsHeroesSelect.addEventListener("change", atualizarEstimativaIconsHeroes);
    }

    // Inicializar estimativa se visível
    if (poolSlider) {
        poolInput.value = parseInt(poolSlider.value, 10) / 100;
        poolInput.value = parseFloat(poolInput.value).toFixed(2);
        atualizarEstimativaIconsHeroes();
    }
})();

// Bootstrap: tentar restaurar draft, senão mostrar pré-menu
setTimeout(() => {
    // Se estávamos em multiplayer antes do F5, não restaurar draft (vai reentrar pela sala)
    const foiMP = typeof mpFoiMultiplayer === "function" && mpFoiMultiplayer();
    const restored = foiMP ? false : carregarEstadoDraft();
    // Se restaurou mas setup ficou visível (etapa 1 sem draft ativo), trata como "não restaurado"
    const setupVisivel = document.getElementById("setup").style.display !== "none";
    if (!restored || setupVisivel) {
        // Sem draft salvo — mostrar pré-menu
        document.getElementById("setup").style.display = "none";
        document.getElementById("preMenu").style.display = "block";
        iniciarPreMenu();
    } else {
        // Draft restaurado — esconder pré-menu
        document.getElementById("preMenu").style.display = "none";
    }
}, 50);

// ─── EVENT LISTENERS DO PRÉ-MENU ──────────────────────────────────────────────

document.addEventListener("click", function (e) {
    // Botão Offline
    if (e.target.id === "btnOffline" || e.target.closest("#btnOffline")) {
        entrarModoOffline();
        return;
    }
    // Botão Multiplayer → abrir menu de salas
    if (e.target.id === "btnMultiplayer" || e.target.closest("#btnMultiplayer")) {
        mpAbrirMenuSalas();
        return;
    }
});

// Toggle de tema
document.addEventListener("change", function (e) {
    if (e.target.id === "themeToggle") {
        alternarTema(e.target.checked ? "dark" : "light");
    }
});

// Botão voltar no setup
document.addEventListener("click", function (e) {
    if (e.target.id === "backToPreMenu") {
        pararTimer();
        document.getElementById("setup").style.display = "none";
        document.getElementById("preMenu").style.display = "block";
        const stepsBar = document.getElementById("stepsBar");
        if (stepsBar) stepsBar.style.display = "none";
        iniciarPreMenu();
    }

    // ── Multiplayer ──
    if (e.target.id === "btnCriarSala" || e.target.closest("#btnCriarSala")) {
        mpHandleCriarSala();
        return;
    }

    if (e.target.id === "btnEntrarSala" || e.target.closest("#btnEntrarSala")) {
        mpHandleEntrarSala();
        return;
    }

    if (e.target.id === "btnListarSalas" || e.target.closest("#btnListarSalas")) {
        mpAbrirSalasAbertas();
        return;
    }

    if (e.target.id === "btnMostrarEntrarCodigo" || e.target.closest("#btnMostrarEntrarCodigo")) {
        mpToggleEntrarCodigo();
        return;
    }

    if (e.target.id === "btnRefreshSalas" || e.target.closest("#btnRefreshSalas")) {
        mpListarSalasAbertas();
        return;
    }

    if (e.target.id === "btnVoltarRoomMenu" || e.target.closest("#btnVoltarRoomMenu")) {
        mpFecharMenuSalas();
        return;
    }

    if (e.target.id === "btnVoltarDeSalasAbertas" || e.target.closest("#btnVoltarDeSalasAbertas")) {
        mpFecharSalasAbertas();
        return;
    }

    if (e.target.id === "btnSairLobby" || e.target.closest("#btnSairLobby")) {
        mpFecharLobby();
        return;
    }

    // Configurar draft (moderador)
    if (e.target.id === "btnConfigurarDraft" || e.target.closest("#btnConfigurarDraft")) {
        mpAbrirConfig();
        return;
    }

    // Salvar configuração
    if (e.target.id === "btnSalvarConfig" || e.target.closest("#btnSalvarConfig")) {
        mpSalvarConfig();
        return;
    }

    // Voltar da config sem salvar
    if (e.target.id === "btnVoltarConfig" || e.target.closest("#btnVoltarConfig")) {
        mpFecharConfig();
        return;
    }

    // Iniciar draft (moderador)
    if (e.target.id === "btnIniciarDraft" || e.target.closest("#btnIniciarDraft")) {
        mpIniciarDraftOnline();
        return;
    }

    // Continuar mata-mata (após F5)
    if (e.target.id === "btnResumeMataMata" || e.target.closest("#btnResumeMataMata")) {
        mostrarMataMata();
        return;
    }

    // Fechar sala (moderador)
    if (e.target.id === "btnFecharSala" || e.target.closest("#btnFecharSala")) {
        mpFecharSala();
        return;
    }

    // Kickar jogador específico
    if (e.target.classList.contains("lobby-kick-btn")) {
        const playerId = e.target.dataset.playerId;
        const playerName = e.target.dataset.playerName;
        if (playerId) mpKickarJogadorEspecifico(playerId, playerName);
        return;
    }

    // Copiar código da sala ao clicar
    if (e.target.id === "lobbyCode") {
        const code = e.target.textContent;
        navigator.clipboard.writeText(code).then(() => {
            toast("📋 Código copiado: " + code, 2000);
        }).catch(() => {});
        return;
    }
});

// Enter no campo de código da sala
document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.id === "inputCodigoSala") {
        e.preventDefault();
        mpHandleEntrarSala();
    }
});

// Enter no campo de nome → inicia offline
document.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.id === "prePlayerName") {
        e.preventDefault();
        entrarModoOffline();
    }
});

// ─── CONVERSOR RDBM ──────────────────────────────────────────────────────────

(function () {

    const CV_TRAD = {
        "alemanha": "Germany", "argentina": "Argentina",
        "argélia": "Algeria", "arábia saudita": "Saudi Arabia",
        "austrália": "Australia", "bélgica": "Belgium",
        "bósnia e herzegovina": "Bosnia & Herzegovina",
        "brasil": "Brazil", "cabo verde": "Cabo Verde",
        "canadá": "Canada", "catar": "Qatar",
        "colômbia": "Colombia", "coreia do sul": "Korea Republic",
        "costa do marfim": "Ivory Coast", "croácia": "Croatia",
        "curaçao": "Curaçao", "egito": "Egypt",
        "equador": "Ecuador", "escócia": "Scotland",
        "espanha": "Spain", "estados unidos": "United States",
        "frança": "France", "gana": "Ghana", "haiti": "Haiti",
        "holanda": "Holland", "inglaterra": "England",
        "iraque": "Iraq", "irã": "Iran",
        "japão": "Japan", "jordânia": "Jordan",
        "marrocos": "Morocco", "méxico": "Mexico",
        "noruega": "Norway", "nova zelândia": "New Zealand",
        "panamá": "Panamá", "paraguai": "Paraguay",
        "portugal": "Portugal", "rd congo": "Congo DR",
        "república tcheca": "Czech Republic", "senegal": "Senegal",
        "suécia": "Sweden", "suíça": "Switzerland",
        "tunísia": "Tunisia", "turquia": "Türkiye",
        "uruguai": "Uruguay", "uzbequistão": "Uzbekistan",
        "áfrica do sul": "South Africa", "áustria": "Austria",
    };

    const CV_POS = { GK: "0", DF: "1", MF: "2", FW: "3" };

    const cvS = { tpl: null, teams: null, leagues: null, draftData: null, _downloads: [], _resolved: null };

    // ── Abrir / fechar ────────────────────────────────────────────────────────

    document.getElementById("conversorClose")?.addEventListener("click", () => {
        document.getElementById("conversorOverlay").style.display = "none";
    });

    document.getElementById("conversorOverlay").addEventListener("click", e => {
        if (e.target === document.getElementById("conversorOverlay"))
            document.getElementById("conversorOverlay").style.display = "none";
    });

    // ── Helpers UTF-16 ───────────────────────────────────────────────────────

    function cvDecode(buf) {
        const b  = new Uint8Array(buf);
        const sl = (b[0] === 0xFF && b[1] === 0xFE) ? buf.slice(2) : buf;
        return new TextDecoder("utf-16le").decode(sl);
    }

    function cvEncode(str) {
        const bom  = new Uint8Array([0xFF, 0xFE]);
        const buf  = new ArrayBuffer(str.length * 2);
        const view = new DataView(buf);
        for (let i = 0; i < str.length; i++)
            view.setUint16(i * 2, str.charCodeAt(i), true);
        const out = new Uint8Array(bom.length + buf.byteLength);
        out.set(bom, 0);
        out.set(new Uint8Array(buf), bom.length);
        return out;
    }

    function cvFindCol(header, name) {
        return header.findIndex(c => c.trim().toLowerCase() === name.toLowerCase());
    }

    function cvNorm(s) { return (s || "").toLowerCase().trim(); }

    function cvCRLF(line) { return line.replace(/[\r\n]+$/, "") + "\r\n"; }

    function cvEsc(s) {
        return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // ── Drop zone de pasta ───────────────────────────────────────────────────

    const CV_NEEDED = {
        "teamplayerlinks.txt": "tpl",
        "teams.txt":           "teams",
        "leagues.txt":         "leagues",
    };

    function cvInitFolderDz() {
        const dz    = document.getElementById("cv-dz-folder");
        const input = document.getElementById("cv-fi-folder");
        const st    = document.getElementById("cv-st-folder");
        const pills = document.getElementById("cv-file-pills");

        async function loadFiles(fileList) {
            if (!fileList || !fileList.length) return;
            st.textContent = "carregando…";
            dz.classList.remove("ok", "err");

            const found = {};
            for (const file of fileList) {
                const name = file.name.toLowerCase();
                if (CV_NEEDED[name]) {
                    try { found[name] = await file.arrayBuffer(); } catch (_) {}
                }
            }

            for (const [fname, key] of Object.entries(CV_NEEDED))
                cvS[key] = found[fname] || null;

            pills.innerHTML = Object.keys(CV_NEEDED).map(fname => {
                const ok = !!found[fname];
                const label = fname === "leagues.txt" && !ok ? fname + " (opcional)" : fname;
                return `<span class="cv-file-pill ${ok ? "ok" : "missing"}">${ok ? "✓" : "✗"} ${label}</span>`;
            }).join("");

            const hasRequired = !!(cvS.tpl && cvS.teams);
            dz.classList.toggle("ok",  hasRequired);
            dz.classList.toggle("err", !hasRequired);
            st.textContent = hasRequired ? "✓ pasta carregada" : "teamplayerlinks.txt ou teams.txt não encontrado";

            cvRenderPreview();
        }

        input.addEventListener("change", e => loadFiles(e.target.files));
        dz.addEventListener("dragover",  e => { e.preventDefault(); dz.classList.add("over"); });
        dz.addEventListener("dragleave", () => dz.classList.remove("over"));
        dz.addEventListener("drop", e => {
            e.preventDefault(); dz.classList.remove("over");
            loadFiles(e.dataTransfer.files);
        });
    }

    cvInitFolderDz();

    // ── Drop zone de JSON do draft ──────────────────────────────────────────

    function cvInitJsonDz() {
        const dz    = document.getElementById("cv-dz-json");
        const input = document.getElementById("cv-fi-json");
        const st    = document.getElementById("cv-st-json");
        const pills = document.getElementById("cv-json-pills");

        async function loadJson(fileList) {
            if (!fileList || !fileList.length) return;
            st.textContent = "carregando…";
            dz.classList.remove("ok", "err");

            const file = fileList[0];
            if (!file.name.toLowerCase().endsWith(".json")) {
                st.textContent = "✗ arquivo JSON inválido";
                dz.classList.add("err");
                pills.innerHTML = '<span class="cv-file-pill missing">✗ formato inválido</span>';
                return;
            }

            try {
                const text = await file.text();
                const data = JSON.parse(text);

                // Validar estrutura do draft
                if (!data.draft || !data.draft.participants || !Array.isArray(data.draft.participants)) {
                    throw new Error("Estrutura inválida: draft.participants não encontrado");
                }

                cvS.draftData = data;
                st.textContent = `✓ ${data.draft.participants.length} participante(s)`;
                dz.classList.add("ok");
                pills.innerHTML = `<span class="cv-file-pill ok">✓ ${file.name}</span>`;

            } catch (e) {
                st.textContent = "✗ erro ao ler JSON";
                dz.classList.add("err");
                pills.innerHTML = `<span class="cv-file-pill missing">✗ ${e.message}</span>`;
                cvS.draftData = null;
            }

            cvRenderPreview();
        }

        input.addEventListener("change", e => loadJson(e.target.files));
        dz.addEventListener("dragover",  e => { e.preventDefault(); dz.classList.add("over"); });
        dz.addEventListener("dragleave", () => dz.classList.remove("over"));
        dz.addEventListener("drop", e => {
            e.preventDefault(); dz.classList.remove("over");
            loadJson(e.dataTransfer.files);
        });
    }

    cvInitJsonDz();

    // ── Parse teams.txt ──────────────────────────────────────────────────────

    function cvParseTeams(buf) {
        const lines = cvDecode(buf).split("\n").filter(l => l.trim());
        const header = lines[0].replace(/\r$/, "").split("\t");
        const iName = cvFindCol(header, "teamname");
        const iId   = cvFindCol(header, "teamid");
        if (iName < 0 || iId < 0) return null;
        const map = {};
        for (const raw of lines.slice(1)) {
            const p  = raw.replace(/\r$/, "").split("\t");
            const id = (p[iId] || "").trim();
            if (/^\d+$/.test(id)) map[cvNorm(p[iName])] = id;
        }
        return map;
    }

    function cvResolveId(ptName, teamMap) {
        const enName = CV_TRAD[cvNorm(ptName)] || ptName;
        const id = teamMap[cvNorm(enName)] || teamMap[cvNorm(ptName)];
        if (id) return { enName, id };
        const key = cvNorm(enName);
        for (const [k, v] of Object.entries(teamMap))
            if (k.includes(key) || key.includes(k)) return { enName, id: v };
        return { enName, id: null };
    }

    // ── Preview ──────────────────────────────────────────────────────────────

    function cvGetDraftData() {
        // Prioridade 1: JSON carregado manualmente
        if (cvS.draftData && cvS.draftData.draft && cvS.draftData.draft.participants) {
            return cvS.draftData.draft.participants.map(p => ({
                player: p.player || p.playerName || "?",
                team:   p.team || null,
                players: (p.players || []).map(j => ({
                    name:        j.name || j.nome || "?",
                    position:    j.position || j.posicao || "FW",
                    nationality: j.nationality || j.pais || "",
                    playerid:    j.playerid || null,
                })),
            }));
        }

        // Prioridade 2: estado em memória do draft vivo
        if (typeof times !== "undefined" && times.length && nomesJogadores && nomesJogadores.length) {
            return nomesJogadores.map((nome, idx) => ({
                player: nome,
                team:   paisParticipante[idx] || null,
                players: (times[idx] || []).map(j => ({
                    name:        j.nome,
                    position:    j.posicao,
                    nationality: j.pais,
                    playerid:    j.playerid || null,
                })),
            }));
        }

        return null;
    }

    function cvRenderPreview() {
        if (!cvS.tpl || !cvS.teams) return;

        const teamMap = cvParseTeams(cvS.teams);
        if (!teamMap) return;

        const participants = cvGetDraftData();
        if (!participants) return;

        // Indicar fonte dos dados
        const fonte = cvS.draftData ? "📄 JSON" : "💾 memória";

        cvS._resolved = participants.map(p => {
            const { enName, id } = cvResolveId(p.team, teamMap);
            const total  = p.players.length;
            const withId = p.players.filter(j => j.playerid).length;
            return { player: p.player, team: p.team, enName, teamId: id, total, withId, players: p.players };
        });

        const rows = `<div class="cv-preview-row" style="border-bottom-color:transparent;">
            <div class="cv-prev-player" style="font-weight:700;font-size:11px;color:var(--muted);">Fonte: ${fonte}</div>
            <div class="cv-prev-team"></div>
            <span class="cv-badge-warn" style="font-size:10px;">${participants.length} time(s)</span>
        </div>` + cvS._resolved.map(r => {
            let badge, cls;
            if (!r.teamId) {
                badge = "time não encontrado"; cls = "cv-badge-err";
            } else if (r.withId === r.total) {
                badge = r.total + " jogadores OK"; cls = "cv-badge-ok";
            } else {
                badge = r.withId + "/" + r.total + " com ID"; cls = "cv-badge-warn";
            }
            const tid = r.teamId ? `<span class="cv-prev-tid">ID ${r.teamId}</span>` : "";
            return `<div class="cv-preview-row">
                <div class="cv-prev-player">${cvEsc(r.player)}</div>
                <div class="cv-prev-team">${cvEsc(r.team)} ${tid}</div>
                <span class="${cls}">${badge}</span>
            </div>`;
        }).join("");

        const el = document.getElementById("cv-preview");
        el.innerHTML = rows;
        el.style.display = "block";

        const btn = document.getElementById("cv-exportBtn");
        btn.style.display = "block";
        btn.disabled = false;
        document.getElementById("cv-clearBtn").style.display = "block";
    }

    // ── Export ───────────────────────────────────────────────────────────────

    document.getElementById("cv-exportBtn").addEventListener("click", cvDoExport);

    document.getElementById("cv-clearBtn").addEventListener("click", cvClearAll);

    function cvClearAll() {
        cvS.tpl = null;
        cvS.teams = null;
        cvS.leagues = null;
        cvS.draftData = null;
        cvS._resolved = null;
        cvS._downloads = [];

        document.getElementById("cv-dz-folder").classList.remove("ok", "err");
        document.getElementById("cv-st-folder").textContent = "aguardando";
        document.getElementById("cv-file-pills").innerHTML = "";
        document.getElementById("cv-fi-folder").value = "";

        document.getElementById("cv-dz-json").classList.remove("ok", "err");
        document.getElementById("cv-st-json").textContent = "não carregado";
        document.getElementById("cv-json-pills").innerHTML = "";
        document.getElementById("cv-fi-json").value = "";

        document.getElementById("cv-preview").innerHTML = "";
        document.getElementById("cv-preview").style.display = "none";
        document.getElementById("cv-log").classList.remove("show");
        document.getElementById("cv-log").innerHTML = "";
        document.getElementById("cv-downloads").classList.remove("show");
        document.getElementById("cv-downloads").innerHTML = "";

        const exportBtn = document.getElementById("cv-exportBtn");
        exportBtn.disabled = true;
        exportBtn.style.display = "none";
        document.getElementById("cv-clearBtn").style.display = "none";
        toast("Arquivos removidos");
    }

    function cvDoExport() {
        const log = [];

        // splitlines(keepends=True) — mantém \r\n original, igual ao Python
        const tplText  = cvDecode(cvS.tpl);
        const rawLines = tplText.match(/[^\n]*\n?/g).filter(l => l.length > 0);
        const headerCols = rawLines[0].replace(/[\r\n]+$/, "").split("\t");
        const iPlayer = cvFindCol(headerCols, "playerid");
        const iTeam   = cvFindCol(headerCols, "teamid");

        if (iPlayer < 0 || iTeam < 0) {
            cvShowLog(["[ERRO] teamplayerlinks.txt: colunas playerid/teamid não encontradas"]);
            return;
        }

        const teamIdSet = new Set(cvS._resolved.map(r => r.teamId).filter(Boolean));
        const kept = [rawLines[0]];  // header inalterado
        let removed = 0;
        for (const raw of rawLines.slice(1)) {
            if (!raw.trim()) continue;
            const tid = (raw.replace(/[\r\n]+$/, "").split("\t")[iTeam] || "").trim();
            if (teamIdSet.has(tid)) { removed++; }
            else { kept.push(raw); }  // linha original inalterada
        }
        log.push(`[OK] ${removed} jogadores removidos dos times selecionados`);

        let added = 0;
        for (const r of cvS._resolved) {
            if (!r.teamId) { log.push(`[AVISO] ${r.team}: teamid não encontrado — pulado`); continue; }
            let cnt = 0;
            for (const j of r.players) {
                if (!j.playerid) continue;
                const jersey  = Math.floor(Math.random() * 99) + 1;
                const posCode = CV_POS[j.position] || "0";
                kept.push(`0\t0\t0\t0\t${jersey}\t${posCode}\t-1\t${r.teamId}\t0\t0\t0\t0\t0\t${j.playerid}\t3\t0\r\n`);
                cnt++; added++;
            }
            log.push(`[OK] ${r.enName} (ID ${r.teamId}): +${cnt} jogadores adicionados`);
        }
        log.push(`[OK] Total adicionado: ${added} jogadores`);

        // Armazenar arquivos gerados em vez de baixar automaticamente
        cvS._downloads = [
            { filename: "teamplayerlinks.txt", data: cvEncode(kept.join("")) }
        ];

        if (cvS.leagues) {
            const lgLines = cvDecode(cvS.leagues).match(/[^\n]*\n?/g).filter(l => l.length > 0);
            let changed = 0;
            const lgOut = lgLines.map(raw => {
                const stripped = raw.replace(/[\r\n]+$/, "");
                const p = stripped.split("\t");
                if (p.length >= 2 && (p[1] || "").toLowerCase().includes("international")) {
                    if (p[p.length - 1].trim() === "1") {
                        p[p.length - 1] = "0"; changed++;
                        return p.join("\t") + "\r\n";
                    }
                }
                return raw;
            }).join("");
            cvS._downloads.push({ filename: "leagues.txt", data: cvEncode(lgOut) });
            log.push(`[OK] leagues.txt: ${changed > 0 ? changed + " flag(s) International: 1 → 0" : "nenhuma flag alterada"}`);
        }

        cvS._resolved.forEach((r, idx) => {
            log.push(`  ${r.player} (${r.team}): ${r.players.filter(j => !!j.playerid).length}/${r.players.length} com ID`);
        });

        cvShowLog(log);
        cvShowDownloads();
        toast("Arquivos gerados! Clique nos botões abaixo para baixar.");
    }

    function cvShowDownloads() {
        const el = document.getElementById("cv-downloads");
        if (!el || !cvS._downloads.length) return;

        el.innerHTML = '<div class="cv-downloads-label">📥 Arquivos gerados</div>' +
            cvS._downloads.map(f =>
                `<button class="cv-download-btn" data-file="${cvEsc(f.filename)}">📥 ${cvEsc(f.filename)}</button>`
            ).join("");

        el.classList.add("show");

        // Adicionar listeners para cada botão
        el.querySelectorAll(".cv-download-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const filename = btn.dataset.file;
                const file = cvS._downloads.find(f => f.filename === filename);
                if (file) {
                    cvDownload(file.data, file.filename);
                }
            });
        });
    }

    function cvDownload(data, filename) {
        const blob = new Blob([data], { type: "application/octet-stream" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click();
        document.body.removeChild(a); URL.revokeObjectURL(url);
    }

    function cvShowLog(lines) {
        const el = document.getElementById("cv-log");
        el.innerHTML = lines.map(l => {
            if (l.startsWith("[OK]"))    return `<span class="log-ok">${cvEsc(l)}</span>`;
            if (l.startsWith("[AVISO]")) return `<span class="log-warn">${cvEsc(l)}</span>`;
            if (l.startsWith("[ERRO]"))  return `<span class="log-err">${cvEsc(l)}</span>`;
            return cvEsc(l);
        }).join("\n");
        el.classList.add("show");
    }

})();