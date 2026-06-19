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

// ======================
// BANDEIRAS
// ======================

const CODIGOS_PAIS = {
    "Argentina":            "ar",
    "Argélia":              "dz",
    "Austrália":            "au",
    "Brasil":               "br",
    "Bélgica":              "be",
    "Bósnia e Herzegovina": "ba",
    "Cabo Verde":           "cv",
    "Canadá":               "ca",
    "Colômbia":             "co",
    "Costa do Marfim":      "ci",
    "Croatia":              "hr",
    "Curaçao":              "cw",
    "Czechia":              "cz",
    "Ecuador":              "ec",
    "Egypt":                "eg",
    "England":              "gb-eng",
    "France":               "fr",
    "Germany":              "de",
    "Ghana":                "gh",
    "Haiti":                "ht",
    "IR Iran":              "ir",
    "Iraq":                 "iq",
    "Japan":                "jp",
    "Jordan":               "jo",
    "Korea Republic":       "kr",
    "Mexico":               "mx",
    "Morocco":              "ma",
    "Netherlands":          "nl",
    "New Zealand":          "nz",
    "Norway":               "no",
    "Panama":               "pa",
    "Paraguay":             "py",
    "Portugal":             "pt",
    "Qatar":                "qa",
    "RD Congo":             "cd",
    "Saudi Arabia":         "sa",
    "Scotland":             "gb-sct",
    "Senegal":              "sn",
    "South Africa":         "za",
    "Spain":                "es",
    "Sweden":               "se",
    "Switzerland":          "ch",
    "Tunisia":              "tn",
    "Türkiye":              "tr",
    "USA":                  "us",
    "Uruguay":              "uy",
    "Uzbekistan":           "uz",
    "Áustria":              "at",
};

function bandeira(pais) {
    const codigo = CODIGOS_PAIS[pais];
    if (!codigo) return "";
    return `<img class="flag" src="https://flagcdn.com/20x15/${codigo}.png" alt="${pais}" loading="lazy">`;
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
                                ${bandeira(jogador.pais)}${jogador.nome}<span class="pos-label">${POSICOES[jogador.posicao]}</span>
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
                <span class="pool-info">${bandeira(jogador.pais)}${jogador.pais} · ${POSICOES[jogador.posicao]}</span>
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
                                    ${bandeira(jogador.pais)}${jogador.nome}
                                    <span class="pos-label">${POSICOES[jogador.posicao]}</span>
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