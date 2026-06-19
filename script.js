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

// ======================
// BANDEIRAS
// ======================

const BANDEIRAS_ARQUIVOS = {
    "Argentina":            "argentina.png",
    "Argélia":              "argelia.png",
    "Austrália":            "australia.png",
    "Brasil":               "brasil.png",
    "Bélgica":              "belgica.png",
    "Bósnia e Herzegovina": "bosnia-e-herzegovina.png",
    "Cabo Verde":           "cabo-verde.png",
    "Canadá":               "canada.png",
    "Colômbia":             "colombia.png",
    "Costa do Marfim":      "costa-do-marfim.png",
    "Croatia":              "croatia.png",
    "Curaçao":              "curacao.png",
    "Czechia":              "czechia.png",
    "Ecuador":              "ecuador.png",
    "Egypt":                "egypt.png",
    "England":              "england.png",
    "France":               "france.png",
    "Germany":              "germany.png",
    "Ghana":                "ghana.png",
    "Haiti":                "haiti.png",
    "IR Iran":              "ir-iran.png",
    "Iraq":                 "iraq.png",
    "Japan":                "japan.png",
    "Jordan":               "jordan.png",
    "Korea Republic":       "korea-republic.png",
    "Mexico":               "mexico.png",
    "Morocco":              "morocco.png",
    "Netherlands":          "netherlands.png",
    "New Zealand":          "new-zealand.png",
    "Norway":               "norway.png",
    "Panama":               "panama.png",
    "Paraguay":             "paraguay.png",
    "Portugal":             "portugal.png",
    "Qatar":                "qatar.png",
    "RD Congo":             "rd-congo.png",
    "Saudi Arabia":         "saudiarabia.png",
    "Scotland":             "scotland.png",
    "Senegal":              "senegal.png",
    "South Africa":         "south-africa.png",
    "Spain":                "spain.png",
    "Sweden":               "sweden.png",
    "Switzerland":          "switzerland.png",
    "Tunisia":              "tunisia.png",
    "Türkiye":              "turkiye.png",
    "USA":                  "usa.png",
    "Uruguay":              "uruguay.png",
    "Uzbekistan":           "uzbekistan.png",
    "Áustria":              "austria.png",
};

function bandeira(pais) {
    const arquivo = BANDEIRAS_ARQUIVOS[pais];
    if (!arquivo) return "";
    return `<img class="flag" src="flags/${arquivo}" alt="${pais}" loading="lazy">`;
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

    let texto =
        "Refreshes: ";

    for (
        let i = 0;
        i < restantes;
        i++
    ) {

        texto += "● ";

    }

    if (
        restantes === 0
    ) {

        texto += "(0)";

    }

    document
        .getElementById(
            "refreshes"
        )
        .innerText =
        texto;

}

// ======================
// STATUS
// ======================

function atualizarStatus() {

    document
        .getElementById(
            "status"
        ).innerHTML = `
            Pick ${pickAtual}
            ·
            Vez de:
            <span class="current-player">
                ${nomesJogadores[jogadorAtual]}
            </span>
        `;

}
// ======================
// CRIAR PARTICIPANTES
// ======================

document
    .getElementById(
        "createPlayers"
    )
    .addEventListener(
        "click",
        () => {

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
                    <div style="margin-bottom:10px;">
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

    nomesJogadores.forEach(
        (nome, index) => {

            teamsSection.innerHTML += `
    <div class="team-card">

        <h2>${nome}</h2>

        <div>
            <strong id="count${index + 1}">
                0/${config.playersPerTeam}
            </strong>
        </div>

        <ul id="team${index + 1}">
        </ul>

    </div>
`;

        }
    );

    jogadorAtual = 0;

    pickAtual = 1;

    direcaoSnake = 1;

    document.getElementById(
        "setup"
    ).style.display = "none";

    document.getElementById(
        "draftArea"
    ).style.display = "block";

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
                <span class="pool-num">${index + 1}</span>
                <span class="pool-name">${jogador.nome}</span>
                <span class="pool-info">${POSICOES_ABREV[jogador.posicao]} · ${bandeira(jogador.pais)}${jogador.pais}</span>
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

document
    .getElementById("restartDraft")
    .addEventListener(
        "click",
        () => {

            if (
                !confirm(
                    "Tem certeza que deseja reiniciar?"
                )
            ) return;

            location.href =
                "index.html";

        }
    );

carregarJogadores();