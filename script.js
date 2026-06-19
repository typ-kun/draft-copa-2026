// ======================
// DRAFT COPA DO MUNDO V2
// ======================

let jogadoresBase = [];
let jogadoresDisponiveis = [];
let poolAtual = [];

let nomesJogadores = [];
let times = [];
let refreshesPorJogador = [];

let participantesAtivos = [];

let jogadorAtual = 0;
let pickAtual = 1;

let direcaoSnake = 1;

let paisParticipante = [];
let ordemSelecao = [];
let indiceSelecao = 0;

// ======================
// CONFIGURAÇÕES
// ======================

const config = {

    draftMode: "snake",

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
    "Costa do Marfim":      "CI", "Croatia":           "HR", "Curaçao":           "CW",
    "Czechia":              "CZ", "Ecuador":           "EC", "Egypt":             "EG",
    "England":              "GB", "France":            "FR", "Germany":           "DE",
    "Ghana":                "GH", "Haiti":             "HT", "IR Iran":           "IR",
    "Iraq":                 "IQ", "Japan":             "JP", "Jordan":            "JO",
    "Korea Republic":       "KR", "Mexico":            "MX", "Morocco":           "MA",
    "Netherlands":          "NL", "New Zealand":       "NZ", "Norway":            "NO",
    "Panama":               "PA", "Paraguay":          "PY", "Portugal":          "PT",
    "Qatar":                "QA", "RD Congo":          "CD", "Saudi Arabia":      "SA",
    "Scotland":             "GB", "Senegal":           "SN", "South Africa":      "ZA",
    "Spain":                "ES", "Sweden":            "SE", "Switzerland":       "CH",
    "Tunisia":              "TN", "Türkiye":           "TR", "USA":               "US",
    "Uruguay":              "UY", "Uzbekistan":        "UZ", "Áustria":           "AT",
};

// Curaçao não tem bandeira na HLTV, usa flagcdn como fallback
const BANDEIRA_CURACAO = "cw";

function bandeira(pais) {
    if (pais === "Curaçao") {
        return `<img class="flag" src="https://flagcdn.com/20x15/${BANDEIRA_CURACAO}.png" alt="Curaçao" loading="lazy">`;
    }
    const codigo = CODIGOS_HLTV[pais];
    if (!codigo) return "";
    return `<img class="flag" src="https://www.hltv.org/img/static/flags/30x20/${codigo}.gif" alt="${pais}" loading="lazy" onerror="this.style.display='none'">`;
}

// ======================
// CARREGAR JSON
// ======================

async function carregarJogadores() {

    const resposta =
        await fetch(
            "jogadores_final.json"
        );

    jogadoresBase =
        await resposta.json();

    console.log(
        `Jogadores carregados: ${jogadoresBase.length}`
    );

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

    config.draftMode =
        document.getElementById(
            "draftMode"
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

    // Extrair lista única de países do JSON
    const paisesUnicos = [
        ...new Set(
            jogadoresBase.map(
                j => j.pais
            )
        )
    ].sort();

    // Embaralhar ordem de seleção (circular)
    const ordemOriginal = [];

    for (
        let i = 0;
        i < nomesJogadores.length;
        i++
    ) {

        ordemOriginal.push(i);

    }

    ordemSelecao =
        ordemOriginal;

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

function prosseguirParaDraft() {

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
const jaTemDoisGoleiros =
    contarGoleiros(
        jogadorAtual
    ) >= 2;

if (jaTemDoisGoleiros) {

    disponiveis =
        disponiveis.filter(
            jogador =>
                jogador.posicao !== "GK"
        );

}
    const precisaGoleiro =
        config.goalkeeperRule &&
        contarGoleiros(
            jogadorAtual
        ) < 2;

    if (precisaGoleiro) {

        const goleiros =
            disponiveis.filter(
                jogador =>
                    jogador.posicao === "GK"
            );

        if (
            goleiros.length > 0
        ) {

            const goleiro =
                aleatorio(
                    goleiros
                );

            poolAtual.push(
                goleiro
            );

            disponiveis =
                disponiveis.filter(
                    jogador =>
                        jogador !== goleiro
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
                    <span class="pool-name">${bandeira(jogador.pais)}${jogador.nome}</span>
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

}

// ======================
// RESULTADO FINAL
// ======================

function mostrarResultadoFinal() {

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

    nomesJogadores.forEach(
        (
            nome,
            index
        ) => {

            html += `
                <h2>
                    ${nome}
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
                                    <span class="pos-label">${POSICOES_ABREV[jogador.posicao]}</span> ${bandeira(jogador.pais)}${jogador.nome}
                                </div>
                            `;

                        }
                    );

                }
            );

            html += "<hr>";

        }
    );

    area.innerHTML =
        html;

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

                alert(
                    "Resultado copiado!"
                );

            }
        );

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

function mostrarModal() {

    const overlay =
        document.getElementById(
            "modalOverlay"
        );

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
                await mostrarModal();

            if (!confirmou) return;

            location.href =
                "index.html";

        }
    );

carregarJogadores();