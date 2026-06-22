#!/usr/bin/env python3
"""
Conversor Draft Copa 2026 -> TXT RDBM 26 (v2)
-----------------------------------------------
Lê o JSON exportado do draft e gera arquivos TXT modificados
para importacao direta no RDBM 26.

Fluxo: draft-copa-2026.json -> converter.py -> TXT modificados -> RDBM 26 -> FC26
"""

import json
import random
import sys
from pathlib import Path

# ─── CONFIGURACOES ──────────────────────────────────────────────────────────

ORIG_DIR = Path(r"C:\Users\guilh\Downloads\Mod\Arquivos Originais")
OUTPUT_DIR = Path(r"C:\Users\guilh\Downloads\Mod\Arquivos Modificados")
IMPORT_DIR = Path(r"C:\Users\guilh\Downloads\Mod\Arquivos para Importar RDBM")
DRAFT_JSON = Path("draft-copa-2026.json")
SCRIPT_DIR = Path(__file__).parent
ID_MAP_FILE = SCRIPT_DIR / "idjogadoresfc26.txt"
PLAYERS_FILE = ORIG_DIR / "players.txt"
TEAMS_FILE = ORIG_DIR / "teams.txt"
TP_LINKS_FILE = ORIG_DIR / "teamplayerlinks.txt"
LEAGUES_FILE = ORIG_DIR / "leagues.txt"
TEAM_NATION_FILE = ORIG_DIR / "teamnationlinks.txt"

# ─── NOMES PT -> EN (TIMES) ────────────────────────────────────────────────

# Tudo em lowercase para busca case-insensitive
_TRAD = {
    "áfrica do sul": "South Africa", "alemanha": "Germany",
    "arábia saudita": "Saudi Arabia", "argélia": "Algeria",
    "argentina": "Argentina", "austrália": "Australia",
    "áustria": "Austria", "bélgica": "Belgium",
    "brasil": "Brazil", "cabo verde": "Cape Verde",
    "canadá": "Canada", "catar": "Qatar",
    "colômbia": "Colombia", "colombia": "Colombia",
    "coreia do sul": "Korea Republic",
    "costa do marfim": "Ivory Coast", "croácia": "Croatia",
    "curaçao": "Curacao", "egito": "Egypt",
    "equador": "Ecuador", "escócia": "Scotland",
    "espanha": "Spain", "estados unidos": "USA",
    "frança": "France", "gana": "Ghana",
    "haiti": "Haiti", "holanda": "Netherlands",
    "inglaterra": "England", "irã": "Iran",
    "iraque": "Iraq", "japão": "Japan",
    "jordânia": "Jordan", "marrocos": "Morocco",
    "méxico": "Mexico", "noruega": "Norway",
    "nova zelândia": "New Zealand", "panamá": "Panama",
    "paraguai": "Paraguay", "portugal": "Portugal",
    "rd congo": "DR Congo", "república tcheca": "Czech Republic",
    "senegal": "Senegal", "suécia": "Sweden",
    "suíça": "Switzerland", "tunísia": "Tunisia",
    "turquia": "Turkey", "uruguai": "Uruguay",
    "uzbequistão": "Uzbekistan"
}

# Mapa posicao draft -> role1 esperado
POS_ROLE_MAP = {
    "GK": list(range(100, 150)),  # GK codes ~100-130
    "DF": list(range(1, 60)),     # Defensor codes
    "MF": list(range(60, 100)),   # Meia codes
    "FW": list(range(0, 20)),     # Atacante codes (includes 0-19)
}

# Role1 codes mapeados para grandes posicoes
ROLE_POS_MAP = {}
for p, codes in POS_ROLE_MAP.items():
    for c in codes:
        ROLE_POS_MAP[c] = p

# ─── UTILITARIOS ────────────────────────────────────────────────────────────

def ler_utf16(arquivo):
    with open(arquivo, "r", encoding="utf-16-le", errors="replace") as f:
        return f.read().splitlines(keepends=True)

def escrever_utf16(arquivo, linhas):
    with open(arquivo, "w", encoding="utf-16-le", newline="") as f:
        for linha in linhas:
            f.write(linha)

def tsv(linha):
    return linha.rstrip("\r\n").split("\t")

def achar_col(header, nome):
    for i, col in enumerate(header):
        if col.strip().lower() == nome.lower():
            return i
    return None


# ─── MANUAL OVERRIDE: nomes que o matching automatico nao encontra ─────────
# Extraidos via FC Editor pelo usuario
MANUAL_PLAYER_IDS = {
    "weverton": "186555",
    "zima": "255687", "d. zima": "255687", "david zima": "255687",
    "wimmer": "254566", "p. wimmer": "254566", "patrick wimmer": "254566",
    "g. rodrigues": "210212", "garry rodrigues": "210212",
    "a. freeman": "267920", "alex freeman": "267920",
    "p. hincapie": "256197", "piero hincapie": "256197", "hincapie": "256197",
    "r. gravenberch": "246104", "ryan gravenberch": "246104", "gravenberch": "246104",
    "g. inacio": "257179", "goncalo inacio": "257179", "goncalo inacio": "257179", "inacio": "257179",
    "j. piquerez": "254623", "joaquin piquerez": "254623", "joaquin piquerez": "254623", "piquerez": "254623",
    "j. neves": "272834", "joao neves": "272834", "joao neves": "272834",
    "n. kante": "215914", "ngolo kante": "215914", "ngolo kante": "215914", "kante": "215914",
    "a. mac allister": "239837", "alexis mac allister": "239837", "mac allister": "239837",
    "r. leao": "241721", "rafael leao": "241721", "rafael leao": "241721", "leao": "241721",
    "i. laye": None, "m. mohebbi": None,
}


# ─── 1. CARREGAR MAPEAMENTOS ────────────────────────────────────────────────

def carregar_nomes_id(caminho):
    """idjogadoresfc26.txt -> {nome_lower: nameid}"""
    mapa = {}
    for linha in ler_utf16(caminho):
        p = tsv(linha)
        if len(p) >= 3 and p[1].strip().isdigit():
            mapa[p[0].strip().lower()] = int(p[1].strip())
    print(f"  [OK] {len(mapa)} nomes mapeados")
    return mapa


def carregar_times(caminho):
    """teams.txt -> {teamname_en: teamid}"""
    linhas = ler_utf16(caminho)
    cab = tsv(linhas[0])
    col_nome = achar_col(cab, "teamname")
    col_id = achar_col(cab, "teamid")
    if col_nome is None or col_id is None:
        print("  [X] teamname/teamid nao encontrados")
        return {}
    times = {}
    for linha in linhas[1:]:
        p = tsv(linha)
        if len(p) > max(col_nome, col_id) and p[col_id].strip().isdigit():
            times[p[col_nome].strip()] = int(p[col_id].strip())
    print(f"  [OK] {len(times)} times mapeados")
    return times


def carregar_nationalities(caminho_times, caminho_tnl):
    """
    Mapeia nome do time (em ingles) -> nationid
    Usando teams.txt + teamnationlinks.txt
    """
    # Primeiro: teamid -> nationid
    tnl_linhas = ler_utf16(caminho_tnl)
    cab = tsv(tnl_linhas[0])
    col_teamid = achar_col(cab, "teamid")
    col_nationid = achar_col(cab, "nationid")
    team_to_nation = {}
    for linha in tnl_linhas[1:]:
        p = tsv(linha)
        if len(p) > max(col_teamid, col_nationid):
            team_to_nation[p[col_teamid].strip()] = p[col_nationid].strip()

    # Depois: teamname -> teamid
    times = carregar_times(caminho_times)

    # Final: teamname -> nationid (inclui traducoes alternativas)
    nome_para_nation = {}
    for nome, tid in times.items():
        tid_str = str(tid)
        if tid_str in team_to_nation:
            nid = team_to_nation[tid_str]
            nome_para_nation[nome.lower()] = nid
            # Se time tem traducao, adiciona tbm com nome traduzido
            for pt, en in _TRAD.items():
                if en.lower() == nome.lower():
                    nome_para_nation[pt] = nid  # chave em portugues

    return nome_para_nation


def carregar_indice_jogadores(caminho, id_nomes):
    """
    Varre players.txt e cria um indice completo:
    - player_map = {nome_lower: playerid}
    - player_index = {playerid: {nome, sobrenome, nat_id, role1}}
    - sobrenome_index = {sobrenome_lower: [(playerid, nat_id, role1), ...]}
    """
    linhas = ler_utf16(caminho)
    cab = tsv(linhas[0])
    col_pid = achar_col(cab, "playerid")
    col_nat = achar_col(cab, "nationality")
    if col_pid is None:
        return {}, {}, {}

    # role1 = column 9, firstnameid=0, lastnameid=1, jerseynameid=2, commonnameid=3
    rev = {v: k for k, v in id_nomes.items()}

    player_map = {}       # nome_lower -> playerid
    player_idx = {}       # playerid -> {nome, sobrenome, nat, role1}
    sobrenome_idx = {}    # sobrenome_lower -> [(playerid, nat, role1)]

    for linha in linhas[1:]:
        p = tsv(linha)
        if len(p) <= col_pid:
            continue
        pid = p[col_pid].strip()
        if not pid.isdigit():
            continue

        fn_id = int(p[0].strip()) if p[0].strip().isdigit() else 0
        ln_id = int(p[1].strip()) if p[1].strip().isdigit() else 0
        jn_id = int(p[2].strip()) if len(p) > 2 and p[2].strip().isdigit() else 0
        cn_id = int(p[3].strip()) if len(p) > 3 and p[3].strip().isdigit() else 0
        nat = int(p[col_nat].strip()) if p[col_nat].strip().isdigit() else 0
        role1 = int(p[9].strip()) if len(p) > 9 and p[9].strip().isdigit() else 0

        # Montar nome
        nome = ""
        if cn_id > 0 and cn_id in rev:
            nome = rev[cn_id]
        elif jn_id > 0 and jn_id in rev:
            nome = rev[jn_id]
        elif ln_id > 0 and ln_id in rev:
            primeiro = rev.get(fn_id, "") if fn_id > 0 and fn_id in rev else ""
            ultimo = rev[ln_id]
            if primeiro:
                nome = f"{primeiro[0]}. {ultimo}"
            else:
                nome = ultimo

        # Obter sobrenome (ultima palavra do nome)
        sobrenome = ""
        if ln_id > 0 and ln_id in rev:
            sobrenome = rev[ln_id].lower()

        # Salvar indices
        if nome:
            chave = nome.lower().strip()
            player_map[chave] = pid

        player_idx[pid] = {"nome": nome, "sobrenome": sobrenome, "nat": nat, "role1": role1}

        if sobrenome:
            if sobrenome not in sobrenome_idx:
                sobrenome_idx[sobrenome] = []
            sobrenome_idx[sobrenome].append((pid, nat, role1))

    print(f"  [OK] {len(player_map)} nomes, {len(player_idx)} jogadores indexados")
    return player_map, player_idx, sobrenome_idx


# ─── 2. BUSCAR JOGADOR ─────────────────────────────────────────────────────

def buscar_playerid(nome_draft, pos_draft, nat_draft, player_map, player_idx,
                    sobrenome_idx, id_nomes, nat_time_map):
    """
    Busca playerid usando nome + posicao + nacionalidade.
    Retorna (playerid, nome_encontrado) ou (None, motivo).
    """
    chave = nome_draft.lower().strip()

    # 0. Manual override (via FC Editor)
    if chave in MANUAL_PLAYER_IDS:
        pid = MANUAL_PLAYER_IDS[chave]
        if pid:
            return pid, f"manual: {pid}"
        else:
            return None, "nao existe (manual)"

    # 1. Match exato
    if chave in player_map:
        pid = player_map[chave]
        info = player_idx.get(pid, {})
        return pid, f"exato: {info.get('nome', '?')}"

    # 2. Match por sobrenome
    sobrenome = ""
    if "." in chave:
        sobrenome = chave.split(".")[1].strip()
    else:
        palavras = chave.split()
        sobrenome = palavras[-1] if palavras else chave

    if not sobrenome:
        return None, "sem sobrenome"

    # Obter candidatos pelo sobrenome
    candidatos = sobrenome_idx.get(sobrenome, [])

    # Se nao achou, tenta match parcial do sobrenome
    if not candidatos:
        for sob, cands in sobrenome_idx.items():
            if sobrenome in sob:
                candidatos.extend(cands)

    # Tambem tentar manual override pelo sobrenome
    if sobrenome in MANUAL_PLAYER_IDS:
        pid = MANUAL_PLAYER_IDS[sobrenome]
        if pid:
            return pid, f"manual sobrenome: {pid}"

    if not candidatos:
        # Fallback: tentar buscar no id_nomes
        nid = id_nomes.get(sobrenome)
        if nid:
            return None, f"nameid={nid} (nao vinculado a players.txt)"
        return None, "nenhum candidato"

    # Pegar nationid da nacionalidade do draft
    nat_pt = nat_draft.lower().strip() if nat_draft else ""
    nat_en = _TRAD.get(nat_pt.strip(), nat_pt.title().strip() if nat_pt else "")
    target_nat = nat_time_map.get(nat_en.lower(), None)

    # Tentar mapear posicao do draft para role1 esperado
    role_esperado = None
    pos_role_map_amplo = {
        "GK": list(range(100, 200)),
        "DF": list(range(0, 60)),
        "MF": list(range(60, 100)),
        "FW": list(range(0, 25)),
    }
    codes = pos_role_map_amplo.get(pos_draft, [])

    # Filtrar por nacionalidade + posicao
    filtrados = []
    for pid, nat, role1 in candidatos:
        nat_ok = (target_nat is None) or (nat == int(target_nat)) if target_nat else True
        role_ok = not codes or (role1 in codes)
        if nat_ok and role_ok:
            info = player_idx.get(pid, {})
            filtrados.append((pid, nat, role1, info.get("nome", "?")))

    # Se achou exatamente 1, retorna
    if len(filtrados) == 1:
        return filtrados[0][0], f"filtrado: {filtrados[0][3]}"

    # Se achou varios, tenta so por nacionalidade
    if target_nat:
        so_nat = [(p, n, r) for p, n, r in candidatos if n == int(target_nat)]
        if len(so_nat) == 1:
            info = player_idx.get(so_nat[0][0], {})
            return so_nat[0][0], f"só nat: {info.get('nome', '?')}"

    # Se achou varios, tenta so por posicao
    if codes:
        so_pos = [(p, n, r) for p, n, r in candidatos if r in codes]
        if len(so_pos) == 1:
            info = player_idx.get(so_pos[0][0], {})
            return so_pos[0][0], f"só pos: {info.get('nome', '?')}"

    # Se ainda tem candidatos, mostra todos
    if filtrados:
        detalhes = [(pid, nome, nat, role1) for pid, nat, role1, nome in filtrados]
        return None, f"ambiguo ({len(filtrados)}): {[(p, n) for p, n, _, _ in detalhes[:3]]}"

    # Nenhum filtrado, mostrar candidatos originais
    if candidatos:
        detalhes = [(pid, player_idx.get(pid, {}).get("nome", "?"), nat, role1) for pid, nat, role1 in candidatos[:3]]
        return None, f"candidatos sem filtro: {[(d[0], d[1]) for d in detalhes]} (nat esperada={target_nat}, role~{pos_draft})"

    return None, "sem matches"


# ─── 3. GERAR ARQUIVOS MODIFICADOS ──────────────────────────────────────────

def gerar_modificacoes(draft, id_nomes, team_map, nat_time_map,
                       player_map, player_idx, sobrenome_idx):
    participantes = draft["draft"]["participants"]
    config = draft["draft"]["config"]

    print(f"\n{'='*60}")
    print(f"  Draft: {len(participantes)} participante(s), {config['playersPerTeam']} jogadores/time")
    print(f"{'='*60}")

    for p in participantes:
        nome_pt = p["team"]
        nome_en = _TRAD.get(nome_pt.lower(), nome_pt)
        teamid = team_map.get(nome_en)
        p["_team_en"] = nome_en
        print(f"\n  [{p['player']}] -> {nome_en} (teamid={teamid})")
        print(f"  Jogadores ({len(p['players'])}):")
        for j in p["players"]:
            # Usar playerid direto do JSON (se disponivel)
            if j.get("playerid"):
                pid = str(j["playerid"])
                motivo = "do JSON"
            else:
                pid, motivo = buscar_playerid(j["name"], j["position"], j["nationality"],
                                               player_map, player_idx, sobrenome_idx,
                                               id_nomes, nat_time_map)
            j["_playerid"] = pid
            j["_match"] = motivo or "NAO ENCONTRADO"
            status = f"playerid={pid}" if pid else "???"
            print(f"    * {j['name']:25s} ({j['position']:2s}, {j['nationality']:20s}) {status} [{j['_match']}]")

    # ── 3a. leagues.txt ──────────────────────────────────────────────────────
    if LEAGUES_FILE.exists():
        print(f"\n  [leagues.txt] Modificando liga International...")
        linhas = ler_utf16(LEAGUES_FILE)
        modificado = False
        for i, linha in enumerate(linhas):
            p = tsv(linha)
            if len(p) >= 2 and "international" in p[1].strip().lower() and len(p) >= 12:
                if p[-1].strip() == "1":
                    p[-1] = "0"
                    linhas[i] = "\t".join(p) + "\r\n"
                    modificado = True
                    print(f"    [OK] Flag International: 1 -> 0")
        if modificado:
            escrever_utf16(OUTPUT_DIR / "leagues.txt", linhas)
            #escrever_utf16(IMPORT_DIR / "leagues.txt", linhas)

    # ── 3b. teamplayerlinks.txt ─────────────────────────────────────────────
    if TP_LINKS_FILE.exists():
        print(f"\n  [teamplayerlinks.txt] Substituindo elencos...")
        linhas = ler_utf16(TP_LINKS_FILE)
        cab = tsv(linhas[0])
        col_pid = achar_col(cab, "playerid")
        col_tid = achar_col(cab, "teamid")
        col_artkey = achar_col(cab, "artificialkey")

        if col_pid is None or col_tid is None:
            print("  [X] playerid/teamid nao encontrados")
            return

        for p in participantes:
            nome_en = p["_team_en"]
            teamid = team_map.get(nome_en)
            if not teamid:
                continue

            # 1. REMOVER TODOS os jogadores atuais do time
            novas_linhas = [linhas[0]]
            removidos = 0
            tid_str = str(teamid)
            for linha in linhas[1:]:
                parts = tsv(linha)
                if parts[col_tid].strip() == tid_str:
                    removidos += 1
                    continue
                novas_linhas.append(linha)
            print(f"    {nome_en}: {removidos} jogadores originais removidos")

            # 2. ADICIONAR jogadores do draft
            adicionados = 0
            for j in p["players"]:
                pid = j.get("_playerid")
                if not pid:
                    continue
                jersey = random.randint(1, 99)
                pos_code = {"GK": "0", "DF": "1", "MF": "2", "FW": "3"}.get(j["position"], "0")
                novas_linhas.append(
                    f"0\t0\t0\t0\t{jersey}\t{pos_code}\t-1\t{teamid}\t0\t0\t0\t0\t0\t{pid}\t3\t0\r\n"
                )
                adicionados += 1

            print(f"    {adicionados} jogadores do draft adicionados")
            linhas = novas_linhas  # acumula para proximo participante

        escrever_utf16(OUTPUT_DIR / "teamplayerlinks.txt", linhas)
        #escrever_utf16(IMPORT_DIR / "teamplayerlinks.txt", linhas)
        print(f"  [OK] teamplayerlinks.txt salvo ({len(linhas)} linhas)")


# ─── MAIN ────────────────────────────────────────────────────────────────────

def main():
    print(f"{'='*60}")
    print(f"  CONVERSOR DRAFT -> TXT RDBM 26 (v2)")
    print(f"{'='*60}")

    # Perguntar caminho do draft JSON
    default_json = str(SCRIPT_DIR / "draft-copa-2026.json")
    resposta = input(f"\nCaminho do draft JSON [Enter = {default_json}]: ").strip()
    DRAFT_JSON = Path(resposta) if resposta else Path(default_json)

    if not DRAFT_JSON.exists():
        print(f"\n[X] {DRAFT_JSON} nao encontrado!")
        sys.exit(1)

    # Carregar draft
    print(f"\n[1] Carregando draft...")
    with open(DRAFT_JSON, "r", encoding="utf-8") as f:
        draft = json.load(f)
    print(f"  [OK] {draft['draft']['participants'][0]['player'] if draft['draft']['participants'] else 'vazio'}")

    # Carregar mapeamentos
    print(f"\n[2] Carregando idjogadoresfc26.txt...")
    id_nomes = carregar_nomes_id(ID_MAP_FILE)

    print(f"\n[3] Indexando players.txt...")
    player_map, player_idx, sobrenome_idx = carregar_indice_jogadores(PLAYERS_FILE, id_nomes)

    print(f"\n[4] Carregando teams.txt...")
    team_map = carregar_times(TEAMS_FILE)

    print(f"\n[5] Carregando mapeamento nacionalidades...")
    nat_time_map = carregar_nationalities(TEAMS_FILE, TEAM_NATION_FILE)
    print(f"  [OK] {len(nat_time_map)} nacionalidades mapeadas")

    # Criar diretorio de saida
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    IMPORT_DIR.mkdir(parents=True, exist_ok=True)

    # Gerar modificacoes
    print(f"\n{'='*60}")
    print(f"  GERANDO MODIFICACOES")
    print(f"{'='*60}")
    gerar_modificacoes(draft, id_nomes, team_map, nat_time_map,
                       player_map, player_idx, sobrenome_idx)

    print(f"\n{'='*60}")
    print(f"  [OK] CONCLUIDO!")
    print(f"  Arquivos em: {OUTPUT_DIR}")
    print(f"  Importe no RDBM 26 e gere o Squad File.")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()