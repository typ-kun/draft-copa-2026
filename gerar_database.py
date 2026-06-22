#!/usr/bin/env python3
"""
Gera database completa de jogadores: abreviacao, nome completo, playerid.
Valida pela nacionalidade para evitar ambiguidades.
"""

import json
from pathlib import Path

ORIG_DIR = Path(r"C:\Users\guilh\Downloads\Mod\Arquivos Originais")
SCRIPT_DIR = Path(__file__).parent
ID_MAP_FILE = SCRIPT_DIR / "idjogadoresfc26.txt"
PLAYERS_FILE = ORIG_DIR / "players.txt"
TEAMS_FILE = ORIG_DIR / "teams.txt"
TN_FILE = ORIG_DIR / "teamnationlinks.txt"

# ─── Utilitarios ────────────────────────────────────────────────────────────

def ler_utf16(path):
    with open(path, "r", encoding="utf-16-le", errors="replace") as f:
        return f.read().splitlines(keepends=True)

def tsv(linha):
    return linha.rstrip("\r\n").split("\t")

# ─── Manual overrides (IDs confirmados pelo usuario) ────────────────────────

MANUAL = {
    "weverton": "186555",
    "zima": "255687", "d. zima": "255687", "david zima": "255687",
    "wimmer": "254566", "p. wimmer": "254566", "patrick wimmer": "254566",
    "g. rodrigues": "210212", "garry rodrigues": "210212",
    "a. freeman": "267920", "alex freeman": "267920", "freeman": "267920",
    "p. hincapie": "256197", "piero hincapie": "256197", "hincapie": "256197",
    "r. gravenberch": "246104", "ryan gravenberch": "246104", "gravenberch": "246104",
    "g. inacio": "257179", "goncalo inacio": "257179", "goncalo inacio": "257179", "inacio": "257179",
    "j. piquerez": "254623", "joaquin piquerez": "254623", "joaquin piquerez": "254623", "piquerez": "254623",
    "j. neves": "272834", "joao neves": "272834", "joao neves": "272834",
    "n. kante": "215914", "ngolo kante": "215914", "kante": "215914",
    "a. mac allister": "239837", "alexis mac allister": "239837", "mac allister": "239837",
    "r. leao": "241721", "rafael leao": "241721", "leao": "241721",
}

# ─── Carregar indices ───────────────────────────────────────────────────────

def carregar_tudo():
    """Carrega todos os indices necessarios."""
    # 1. nameid -> name string
    nid_to_name = {}
    for line in ler_utf16(ID_MAP_FILE):
        p = tsv(line)
        if len(p) >= 3 and p[1].strip().isdigit():
            nid_to_name[int(p[1].strip())] = p[0].strip()

    # 2. players.txt indice + mapeamento nameid -> pids
    linhas = ler_utf16(PLAYERS_FILE)
    cab = tsv(linhas[0])
    col_pid = next(i for i, c in enumerate(cab) if c.strip().lower() == "playerid")
    col_nat = next(i for i, c in enumerate(cab) if c.strip().lower() == "nationality")

    player_idx = {}       # playerid -> { first, last, jersey, common, nat, role }
    nameid_to_pids = {}   # nameid -> [playerid]

    for line in linhas[1:]:
        p = tsv(line)
        if len(p) <= col_pid or not p[col_pid].strip().isdigit():
            continue
        pid = p[col_pid].strip()
        fn = int(p[0]) if p[0].strip().isdigit() else 0
        ln = int(p[1]) if p[1].strip().isdigit() else 0
        jn = int(p[2]) if len(p) > 2 and p[2].strip().isdigit() else 0
        cn = int(p[3]) if len(p) > 3 and p[3].strip().isdigit() else 0
        nat = int(p[col_nat]) if p[col_nat].strip().isdigit() else 0
        role = int(p[9]) if len(p) > 9 and p[9].strip().isdigit() else 0

        player_idx[pid] = {"fn": fn, "ln": ln, "jn": jn, "cn": cn, "nat": nat, "role": role}

        for nid in [fn, ln, jn, cn]:
            if nid > 0:
                if nid not in nameid_to_pids:
                    nameid_to_pids[nid] = []
                if pid not in nameid_to_pids[nid]:
                    nameid_to_pids[nid].append(pid)

    # 3. team -> nationid mapping
    times = {}
    for line in ler_utf16(TEAMS_FILE):
        p = tsv(line)
        if p[0].strip() == "assetid":
            continue
        if len(p) > 76 and p[76].strip().isdigit():
            times[p[20].strip()] = p[76].strip()

    t2n = {}
    for line in ler_utf16(TN_FILE):
        p = tsv(line)
        if len(p) >= 3 and p[0].strip().isdigit():
            t2n[p[1].strip()] = int(p[2].strip())

    nat_map = {}  # nome_ingles.lower() -> nationid
    for nome, tid in times.items():
        if tid in t2n:
            nat_map[nome.lower()] = t2n[tid]

    return nid_to_name, player_idx, nameid_to_pids, nat_map


# ─── Resolver nome completo ─────────────────────────────────────────────────

def nome_completo(info, nid_to_name):
    """Monta o nome completo do jogador a partir dos nameids."""
    fn = nid_to_name.get(info["fn"], "")
    ln = nid_to_name.get(info["ln"], "")
    jn = nid_to_name.get(info["jn"], "")
    cn = nid_to_name.get(info["cn"], "")

    nome = cn or jn or ""
    if not nome and ln:
        if fn:
            nome = f"{fn} {ln}"
        else:
            nome = ln
    return nome


# ─── Mapa de paises (pt -> en) ─────────────────────────────────────────────

PAIS_PT_EN = {
    "brasil": "brazil", "gana": "ghana", "colômbia": "colombia",
    "colombia": "colombia", "coreia do sul": "korea republic",
    "república tcheca": "czech republic", "áustria": "austria",
    "catar": "qatar", "irã": "iran", "rd congo": "dr congo",
    "cabo verde": "cabo verde", "austrália": "australia",
    "noruega": "norway", "estados unidos": "usa",
    "equador": "ecuador", "espanha": "spain",
    "portugal": "portugal", "frança": "france",
    "inglaterra": "england", "alemanha": "germany",
    "holanda": "netherlands", "argentina": "argentina",
    "uruguai": "uruguay", "méxico": "mexico",
    "bélgica": "belgium", "itália": "italy",
    "suíça": "switzerland", "suiça": "switzerland",
    "suécia": "sweden", "polônia": "poland",
    "ucrânia": "ukraine", "dinamarca": "denmark",
    "croácia": "croatia", "japão": "japan",
    "marrocos": "morocco", "senegal": "senegal",
    "tunísia": "tunisia", "argélia": "algeria",
    "costa do marfim": "ivory coast",
    "egito": "egypt", "paraguai": "paraguay",
    "irã": "iran", "escócia": "scotland",
    "arábia saudita": "saudi arabia",
    "nova zelândia": "new zealand",
    "canadá": "canada",
    "panamá": "panama",
    "bósnia e herzegovina": "bosnia & herzegovina",
    "curaçao": "curacao",
    "jordânia": "jordan",
    "iraque": "iraq",
    "uzbequistão": "uzbekistan",
    "turquia": "turkey", "turquia": "turkey",
}


def pais_para_nationid(pais_str, nat_map):
    """Converte nome do pais (pt) para nationid do FC26."""
    chave = pais_str.lower().strip()
    en = PAIS_PT_EN.get(chave, chave)
    return nat_map.get(en)


# ─── Main ───────────────────────────────────────────────────────────────────

def main():
    print("Carregando indices do FC26...")
    nid_to_name, player_idx, nameid_to_pids, nat_map = carregar_tudo()
    print(f"  {len(player_idx)} jogadores, {len(nid_to_name)} nomes, {len(nat_map)} paises")

    print("Carregando jogadores_final.json...")
    with open(SCRIPT_DIR / "jogadores_final.json", "r", encoding="utf-8") as f:
        jogadores = json.load(f)

    print(f"\nProcessando {len(jogadores)} jogadores...\n")
    database = []
    erros = []
    duvidas = []

    for j in jogadores:
        abrev = j["nome"]
        pos = j["posicao"]
        pais = j["pais"]
        pid = j.get("playerid")

        entry = {
            "abrev": abrev,
            "posicao": pos,
            "pais": pais,
            "playerid": pid,
            "nome_completo": None,
            "status": "pendente"
        }

        # 1. Verificar manual override
        chave = abrev.lower().strip()
        if chave in MANUAL:
            pid = MANUAL[chave]
            entry["playerid"] = pid
            entry["status"] = "manual"

        # 2. Se tem playerid, validar
        if pid and pid != "None":
            info = player_idx.get(pid)
            if info:
                nome = nome_completo(info, nid_to_name)
                entry["nome_completo"] = nome

                # Validar nacionalidade
                target_nat = pais_para_nationid(pais, nat_map)
                if target_nat and info["nat"] != target_nat:
                    # Nacionalidade nao confere - marcar como duvida
                    entry["status"] = "nacionalidade_errada"
                    entry["_nat_esperada"] = target_nat
                    entry["_nat_real"] = info["nat"]
                    duvidas.append(entry)
                elif entry["status"] != "manual":
                    entry["status"] = "ok"

                # Verificar se tem nome
                if not nome:
                    entry["status"] = "sem_nome"
                    duvidas.append(entry)
            else:
                entry["status"] = "id_invalido"
                erros.append(entry)
        else:
            entry["status"] = "sem_id"
            erros.append(entry)

        database.append(entry)

    # Relatorio
    print(f"{'='*60}")
    print(f"  RESULTADO")
    print(f"{'='*60}")
    print(f"  Total: {len(database)}")
    print(f"  OK: {sum(1 for d in database if d['status'] == 'ok')}")
    print(f"  Manual: {sum(1 for d in database if d['status'] == 'manual')}")
    print(f"  Nacionalidade errada: {len([d for d in duvidas if d['status'] == 'nacionalidade_errada'])}")
    print(f"  Sem nome: {len([d for d in duvidas if d['status'] == 'sem_nome'])}")
    print(f"  Sem ID: {len([d for d in erros if d['status'] == 'sem_id'])}")
    print(f"  ID invalido: {len([d for d in erros if d['status'] == 'id_invalido'])}")

    if duvidas:
        print(f"\n{'='*60}")
        print(f"  DUVIDAS - jogadores com informacoes conflitantes")
        print(f"{'='*60}")
        for d in duvidas:
            print(f"  {d['abrev']:25s} ({d['posicao']:2s}, {d['pais']:20s}) playerid={d['playerid']}")
            print(f"    Nome no FC26: {d['nome_completo'] or '???'}")
            if d['status'] == 'nacionalidade_errada':
                print(f"    NACIONALIDADE: esperada={d['_nat_esperada']}, real={d['_nat_real']}")
            print()

    if erros:
        print(f"\n{'='*60}")
        print(f"  ERROS - jogadores sem ID ou com ID invalido")
        print(f"{'='*60}")
        for d in erros:
            print(f"  {d['abrev']:25s} ({d['posicao']:2s}, {d['pais']:20s}) {d['status']}")

    # Salvar
    output = SCRIPT_DIR / "database_jogadores.json"
    with open(output, "w", encoding="utf-8") as f:
        json.dump(database, f, ensure_ascii=False, indent=2)
    print(f"\nDatabase salva em: {output}")
    print(f"\nDuvidas: {len(duvidas)} jogadores precisam de revisao manual.")
    print(f"Erros: {len(erros)} jogadores sem ID valido.")


if __name__ == "__main__":
    main()