// ======================
// DRAFT COPA DO MUNDO V2
// ======================

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

    refreshCount: 2

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
// BANDEIRAS
// ======================

const CODIGOS_HLTV = {
    "Argentina":            "AR", "Argélia":           "DZ", "Austrália":         "AU",
    "Brasil":               "BR", "Bélgica":           "BE", "Bósnia e Herzegovina":"BA",
    "Cabo Verde":           "CV", "Canadá":            "CA", "Colômbia":          "CO",
    "Costa do Marfim":      "CI", "Croácia":           "HR", "Curaçao":           "CW",
    "República Tcheca":     "CZ", "Equador":           "EC", "Egito":             "EG",
    "Inglaterra":           "GB", "França":            "FR", "Alemanha":          "DE",
    "Gana":                 "GH", "Haiti":             "HT", "Irã":               "IR",
    "Iraque":               "IQ", "Japão":             "JP", "Jordânia":          "JO",
    "Coreia do Sul":        "KR", "México":            "MX", "Marrocos":          "MA",
    "Holanda":              "NL", "Nova Zelândia":     "NZ", "Noruega":           "NO",
    "Panamá":               "PA", "Paraguai":          "PY", "Portugal":          "PT",
    "Catar":                "QA", "RD Congo":          "CD", "Arábia Saudita":    "SA",
    "Escócia":              "GB", "Senegal":           "SN", "África do Sul":     "ZA",
    "Espanha":              "ES", "Suécia":            "SE", "Suíça":             "CH",
    "Tunísia":              "TN", "Turquia":           "TR", "Estados Unidos":    "US",
    "Uruguai":              "UY", "Uzbequistão":       "UZ", "Áustria":           "AT",
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
    "Irã": "IRA",
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
    "Uzbequistão": "UZB"
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
    const codigo = CODIGOS_HLTV[pais];
    if (!codigo) return "";
    return `<img class="flag" src="https://www.hltv.org/img/static/flags/30x20/${codigo}.gif" alt="${pais}" loading="lazy" onerror="this.style.display='none'">`;
}

// ======================
// CARREGAR JSON
// ======================

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
            playerid: j.playerid || null, nomeCompleto: j.nomeCompleto || null
        })),
        poolAtual: poolAtual.map(j => ({
            nome: j.nome, pais: j.pais, posicao: j.posicao,
            playerid: j.playerid || null, nomeCompleto: j.nomeCompleto || null
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
        document.getElementById("setup").style.display = "none";
        document.getElementById("countrySelection").style.display = "none";
        document.getElementById("draftArea").style.display = "none";
        document.getElementById("resultsArea").style.display = "none";
        document.getElementById("mataMataArea").style.display = "none";

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
            } else {
                document.getElementById("countrySelection").style.display = "block";
                if (etapa === 2) {
                    const paisesRestantes = [...new Set(jogadoresBase.map(j => j.pais))].sort();
                    renderizarGridPaises(paisesRestantes);
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
            Iniciar Draft
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

    jogadoresDisponiveis =
        [...jogadoresBase];

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

}

function selecionarPais(
    pais,
    paises
) {

    const jogadorIdx =
        ordemSelecao[
            indiceSelecao
        ];

    paisParticipante[
        jogadorIdx
    ] = pais;

    indiceSelecao++;

    salvarEstadoDraft();

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

    gerarPool();

    salvarEstadoDraft();

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
                            return `<li class="pos-${jogador.posicao.toLowerCase()}">
                                <span class="pos-label">${POSICOES_ABREV[jogador.posicao]}</span> ${bandeira(jogador.pais)}${jogador.nome}
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

    let disponiveis =
        [...jogadoresDisponiveis];

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

    // Se já tem 2 goleiros, filtra todos
    if (jaTemDoisGoleiros) {

        disponiveis =
            disponiveis.filter(
                j =>
                    j.posicao !== "GK"
            );

    }

    // Últimas rodadas: só goleiros
    if (forcandoGK) {

        let soGoleiros =
            disponiveis.filter(
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

    // Precisa de goleiro: coloca 1 e remove os demais
    if (
        config.goalkeeperRule &&
        gksDoJogador < 2
    ) {

        const goleiros =
            disponiveis.filter(
                j => j.posicao === "GK"
            );

        if (
            goleiros.length > 0
        ) {

            const goleiro =
                aleatorio(goleiros);

            poolAtual.push(goleiro);

            // Remove todos os goleiros do disponiveis
            // para garantir no máximo 1 por pool
            disponiveis =
                disponiveis.filter(
                    j =>
                        j.posicao !== "GK"
                );

        }

    }

    while (
        poolAtual.length < 5 &&
        disponiveis.length > 0
    ) {

        const jogador =
            aleatorio(
                disponiveis
            );

        poolAtual.push(
            jogador
        );

        disponiveis =
            disponiveis.filter(
                p => p !== jogador
            );

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

            card.innerHTML = `
                <span class="pool-inner pos-${jogador.posicao.toLowerCase()}">
                    <span class="pool-num">${index + 1}</span>
                    <span class="pool-name">${bandeira(jogador.pais)}${jogador.nomeCompleto || jogador.nome}</span>
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

    if (
        config.draftMode ===
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

        mostrarResultadoFinal();

        return;

    }

    pickAtual++;

    avancarTurno();

    atualizarStatus();

    atualizarRefreshes();

    gerarPool();

    salvarEstadoDraft();

}

// ======================
// RESULTADO FINAL
// ======================

function mostrarResultadoFinal() {

    setActiveStep(4);

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

    // Botão de toggle + copiar
    html += `<div class="result-toggle-wrap">
        <button id="togglePlayersBtn" class="result-toggle-btn">${todosExpandidos ? "▼" : "▶"} ${todosExpandidos ? "Reduzir tudo" : "Expandir tudo"}</button>
        <button id="copyResults" class="result-copy-btn" title="Copiar lista">📋</button>
    </div>`;

    let todosExpandidos = localStorage.getItem( "draftResultsExpandido" ) !== "false";
    const classeToggle = todosExpandidos ? "player-detail is-open" : "player-detail";

    nomesJogadores.forEach(
        (
            nome,
            index
        ) => {

            const total = times[ index ].length;

            html += `
                <h2 class="player-team-head" data-team="${index}">
                    ${nome} <span class="player-count">(${total} jogadores)</span>
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

                            html += `
                                <div class="player-entry pos-${jogador.posicao.toLowerCase()}">
                                    <span class="pos-label">${POSICOES_ABREV[jogador.posicao]}</span> ${bandeira(jogador.pais)}<span class="player-pais-sigla">${abreviacaoPais(jogador.pais)}</span> ${jogador.nome}
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
            novaAberta ? "▼ Reduzir tudo" : "▶ Expandir tudo";

        localStorage.setItem( "draftResultsExpandido", novaAberta );
    } );

    document
        .getElementById(
            "copyResults"
        )
        .addEventListener(
            "click",
            () => {

                navigator
                    .clipboard
                    .writeText(
                        area.innerText
                    );

                toast("Resultado copiado!");

            }
        );

    // ======================
    // EXPORTAR ELENCOS (JSON)
    // ======================

    document
        .getElementById(
            "exportDraft"
        )
        .addEventListener(
            "click",
            () => {

                const dados = {
                    version: 1,
                    exportedAt: new Date().toISOString(),
                    draft: {
                        config: {
                            mode: config.draftMode,
                            playersPerTeam: config.playersPerTeam,
                            goalkeeperRule: config.goalkeeperRule,
                            startingPhase: config.startingPhase
                        },
                        participants: nomesJogadores.map(
                            ( nome, idx ) => ( {
                                player: nome,
                                team: paisParticipante[ idx ] || null,
                                players: times[ idx ].map(
                                    j => ( {
                                        name: j.nome,
                                        position: j.posicao,
                                        nationality: j.pais,
                                        playerid: j.playerid || null
                                    } )
                                )
                            } )
                        )
                    }
                };

                const blob =
                    new Blob(
                        [ JSON.stringify( dados, null, 2 ) ],
                        { type: "application/json" }
                    );

                const url =
                    URL.createObjectURL(
                        blob
                    );

                const a =
                    document.createElement(
                        "a"
                    );

                a.href = url;
                a.download =
                    `draft-copa-2026.json`;

                document.body.appendChild(
                    a
                );

                a.click();

                document.body.removeChild(
                    a
                );

                URL.revokeObjectURL(
                    url
                );

                toast("Elencos exportados com sucesso!");

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
                        <button id="btnSortearProximo" class="btn-primary" style="font-size:18px;padding:16px 24px;flex:1;box-shadow:4px 4px 0 var(--ink);">
                            🎲 SORTEAR UM
                        </button>
                        <button id="btnSortearTodos" class="btn-primary" style="font-size:18px;padding:16px 24px;flex:1;background:var(--ink);box-shadow:4px 4px 0 var(--accent-2);">
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
        return;
    }

    salvarMataMata();
    renderizarModoSorteio();

}

function finalizarSorteio() {

    if ( !mataMata ) {
        return;
    }

    mataMata.emSorteio = false;
    salvarMataMata();
    renderizarMataMata();

}

function sortearTodosTimes() {

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

    const tagHumano = mostrarHumano && competidor.humano
        ? `<span class="mata-human-tag">${competidor.nomePessoa}</span>`
        : "";

    const tagCpu = !competidor.humano && competidor.id?.startsWith( "cpu-" )
        ? `<span class="mata-cpu-tag">CPU</span>`
        : "";

    if ( tagCpu && mostrarHumano === false ) {
        return `
            <span class="mata-competitor">
                <span class="mata-country-code">${abreviacaoPais( competidor.pais )}</span>
                ${bandeira( competidor.pais )}
            </span>
            ${tagCpu}
        `;
    }

    return `
        <span class="mata-competitor">
            <span class="mata-country-code">${abreviacaoPais( competidor.pais )}</span>
            ${bandeira( competidor.pais )}
            ${tagHumano}${tagCpu}
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

}

function mostrarMataMata() {

    mataMata = carregarMataMata();

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
        return;
    }

    if ( mataMata.emSorteio ) {
        renderizarModoSorteio();
        return;
    }

    renderizarMataMata();

}

async function resetarTudo() {

    const confirmou = await mostrarModal( {
        title: "Recomeçar tudo?",
        message: "Todo o draft e mata-mata atuais serão apagados.",
        confirmText: "Sim, recomeçar",
        cancelText: "Cancelar",
        eyebrow: "Mata-mata"
    } );

    if ( !confirmou ) {
        return;
    }

    localStorage.clear();
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
        async () => {

            const confirmou =
                await mostrarModal( {
                    title: "Recomeçar Draft?",
                    message: "Todo o progresso atual será perdido e um novo draft será iniciado.",
                    confirmText: "Sim, reiniciar",
                    cancelText: "Cancelar",
                    eyebrow: "Draft"
                } );

            if (!confirmou) return;

            // Limpar estado salvo antes de recarregar
            limparEstadoDraft();
            localStorage.removeItem( MATA_MATA_STORAGE_KEY );
            location.href =
                "index.html";

        }
    );

document
    .getElementById("goToMataMata")
    .addEventListener(
        "click",
        mostrarMataMata
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
            salvarEstadoDraft();
        }
    );

document
    .getElementById("backToDraft")
    .addEventListener(
        "click",
        async () => {

            const confirmou = await mostrarModal( {
                title: "Voltar ao menu?",
                message: "O draft atual será perdido e você voltará à tela de configuração.",
                confirmText: "Sim, voltar",
                cancelText: "Cancelar",
                eyebrow: "Draft"
            } );

            if ( !confirmou ) return;

            limparEstadoDraft();

            // Resetar variáveis do draft
            times = [];
            jogadoresDisponiveis = [];
            poolAtual = [];
            participantesAtivos = [];
            nomesJogadores = [];
            paisParticipante = [];
            mataMata = null;
            localStorage.removeItem( MATA_MATA_STORAGE_KEY );

            // Esconder todas as seções do jogo
            document.getElementById( "countrySelection" ).style.display = "none";
            document.getElementById( "draftArea" ).style.display = "none";
            document.getElementById( "resultsArea" ).style.display = "none";
            document.getElementById( "mataMataArea" ).style.display = "none";

            // Mostrar tela de configuração
            document.getElementById( "setup" ).style.display = "block";

            // Resetar contagem de participantes no formulário
            const playerCount = document.getElementById( "playerCount" );
            if ( playerCount ) {
                playerCount.value = "1";
                gerarInputsNomes();
            }

            setActiveStep( 1 );
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
        }
    );

document
    .getElementById("resetarTudo")
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
    { id: "draftMode",      nota: "note-formato" },
    { id: "startingPhase",  nota: "note-starting-phase" },
    { id: "goalkeeperRule", nota: "note-goleiros" },
    { id: "playersPerTeam", nota: "note-elenco" },
    { id: "refreshCount",   nota: "note-refreshes" },
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

// Etapa inicial: Configurar (1)
setTimeout(() => setActiveStep(1), 50);

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

    document.getElementById("openConversor").addEventListener("click", () => {
        document.getElementById("conversorOverlay").style.display = "flex";
        cvRenderPreview();
    });

    document.getElementById("conversorClose").addEventListener("click", () => {
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