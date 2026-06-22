#!/usr/bin/env python3
"""
Conversor Draft Copa 2026 -> TXT RDBM 26
------------------------------------------
Lê o JSON exportado do draft e gera os arquivos TXT modificados
que podem ser importados diretamente pelo RDBM 26.

Fluxo:
  draft-copa-2026.json
    ↓
  converter.py
    ↓
  Arquivos TXT modificados (para pasta de saída)
    ↓
  RDBM 26 -> Squad File FC26 -> Jogo
"""

import json
import os
import shutil
import sys
import re
from pathlib import Path

# ─── CONFIGURAÇÕES ──────────────────────────────────────────────────────────

# Caminhos (relativos ou absolutos)
ORIG_DIR = Path(r"C:\Users\guilh\Downloads\Mod\Arquivos Originais")
OUTPUT_DIR = Path(r"C:\Users\guilh\Downloads\Mod\Arquivos Modificados")
DRAFT_JSON = Path("draft-copa-2026.json")
SCRIPT_DIR = Path(__file__).parent
ID_MAP_FILE = SCRIPT_DIR / "idjogadoresfc26.txt"  # mesmo diretório do script
TEAMS_FILE = ORIG_DIR / "teams.txt"

# ─── MAPEAMENTO PORTUGUÊS → INGLÊS (times) ────────────────────────────────
# O draft usa nomes em português, mas o FC26 usa nomes em inglês
TRADUCAO_TIMES = {
    "África do Sul": "South Africa",
    "Alemanha": "Germany",
    "Arábia Saudita": "Saudi Arabia",
    "Argélia": "Algeria",
    "Argentina": "Argentina",
    "Austrália": "Australia",
    "Áustria": "Austria",
    "Bélgica": "Belgium",
    "Brasil": "Brazil",
    "Cabo Verde": "Cape Verde",
    "Canadá": "Canada",
    "Catar": "Qatar",
    "Colômbia": "Colombia",
    "Coreia do Sul": "Korea Republic",
    "Costa do Marfim": "Ivory Coast",
    "Croácia": "Croatia",
    "Curaçao": "Curacao",
    "Egito": "Egypt",
    "Equador": "Ecuador",
    "Escócia": "Scotland",
    "Espanha": "Spain",
    "Estados Unidos": "USA",
    "França": "France",
    "Gana": "Ghana",
    "Haiti": "Haiti",
    "Holanda": "Netherlands",
    "Inglaterra": "England",
    "Irã": "Iran",
    "Iraque": "Iraq",
    "Japão": "Japan",
    "Jordânia": "Jordan",
    "Marrocos": "Morocco",
    "México": "Mexico",
    "Noruega": "Norway",
    "Nova Zelândia": "New Zealand",
    "Panamá": "Panama",
    "Paraguai": "Paraguay",
    "Portugal": "Portugal",
    "RD Congo": "DR Congo",
    "República Tcheca": "Czech Republic",
    "Senegal": "Senegal",
    "Suécia": "Sweden",
    "Suíça": "Switzerland",
    "Tunísia": "Tunisia",
    "Turquia": "Turkey",
    "Uruguai": "Uruguay",
    "Uzbequistão": "Uzbekistan",
}

# ─── UTILITÁRIOS UTF-16 ────────────────────────────────────────────────────

def read_utf16_lines(path):
    """Lê arquivo UTF-16 LE e retorna lista de linhas."""
    with open(path, "r", encoding="utf-16-le", errors="replace") as f:
        return f.read().splitlines(keepends=True)


def write_utf16_file(path, lines):
    """Escreve lista de linhas em UTF-16 LE."""
    with open(path, "w", encoding="utf-16-le", newline="") as f:
        for line in lines:
            f.write(line)


def parse_tsv_line(line):
    """Divide linha TSV (inclui BOM)."""
    return line.rstrip("\r\n").split("\t")


# ─── 1. CARREGAR DRAFT ─────────────────────────────────────────────────────

def carregar_draft(path):
    """Carrega o JSON de exportação do draft."""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# ─── 2. MAPEAR JOGADORES -> FC26 IDs ───────────────────────────────────────

def carregar_id_map(path):
    """
    Mapeia nomes de jogadores para FC26 nameid a partir do idjogadoresfc26.txt.
    Retorna {nome_lower: nameid}
    """
    id_map = {}
    try:
        lines = read_utf16_lines(path)
        for line in lines:
            parts = line.strip("\r\n").split("\t")
            if len(parts) >= 3 and parts[1].strip().isdigit():
                nome = parts[0].strip().lower()
                nameid = int(parts[1].strip())
                id_map[nome] = nameid
    except FileNotFoundError:
        print(f"[!] Arquivo ID map não encontrado: {path}")
        return {}
    print(f"  [OK] {len(id_map)} nome(s) mapeados no idjogadoresfc26.txt")
    return id_map


# ─── 2b. MAPEAR NOME -> PLAYERID (via players.txt) ─────────────────────────

def carregar_player_name_map(player_path, name_id_map):
    """
    Varre players.txt e monta um dicionario {nome_completo_lower: playerid}
    combinando firstnameid + lastnameid atraves do idjogadoresfc26.txt.
    """
    player_map = {}  # nome.lower() -> playerid
    nameid_reverse = {v: k for k, v in name_id_map.items()}  # nameid -> nome

    try:
        lines = read_utf16_lines(player_path)
        header = parse_tsv_line(lines[0])

        # Encontrar indice da coluna playerid
        col_playerid = None
        for i, col in enumerate(header):
            if col.strip().lower() == "playerid":
                col_playerid = i
                break

        if col_playerid is None:
            print("  [X] Coluna 'playerid' nao encontrada em players.txt")
            return {}, {}

        # Tambem gera mapa de nameid -> lista de playerids
        nameid_to_playerids = {}

        for line in lines[1:]:
            parts = parse_tsv_line(line)
            if len(parts) <= max(col_playerid, 3):
                continue

            playerid = parts[col_playerid].strip()
            if not playerid.isdigit():
                continue

            # Coletar ids de nome
            firstnameid = parts[0].strip()
            lastnameid = parts[1].strip()
            jerseynameid = parts[2].strip() if len(parts) > 2 else ""
            commonnameid = parts[3].strip() if len(parts) > 3 else ""

            # Mapa reverso: nameid -> [playerid]
            for nid in [firstnameid, lastnameid, jerseynameid, commonnameid]:
                if nid.isdigit() and int(nid) > 0:
                    if nid not in nameid_to_playerids:
                        nameid_to_playerids[nid] = []
                    if playerid not in nameid_to_playerids[nid]:
                        nameid_to_playerids[nid].append(playerid)

            # Montar nome completo
            nome_completo = ""
            if commonnameid and commonnameid.isdigit() and int(commonnameid) > 0 and int(commonnameid) in nameid_reverse:
                nome_completo = nameid_reverse[int(commonnameid)]
            elif jerseynameid and jerseynameid.isdigit() and int(jerseynameid) > 0 and int(jerseynameid) in nameid_reverse:
                nome_completo = nameid_reverse[int(jerseynameid)]
            elif lastnameid and lastnameid.isdigit() and int(lastnameid) > 0 and int(lastnameid) in nameid_reverse:
                primeiro = nameid_reverse.get(int(firstnameid), "") if firstnameid.isdigit() and int(firstnameid) > 0 and int(firstnameid) in nameid_reverse else ""
                ultimo = nameid_reverse[int(lastnameid)]
                if primeiro:
                    primeiro_abrev = primeiro[0] + "." if len(primeiro) > 0 else ""
                    nome_completo = f"{primeiro_abrev} {ultimo}"
                else:
                    nome_completo = ultimo

            if nome_completo:
                chave = nome_completo.lower().strip()
                player_map[chave] = playerid
                # Tambem mapeia apenas o sobrenome como fallback
                palavra_final = chave.split()[-1] if chave.split() else ""
                if palavra_final and palavra_final not in player_map:
                    # So guarda se for o UNICO player com este sobrenome
                    conflito = any(k != chave and k.endswith(palavra_final) for k in player_map)
                    if not conflito:
                        player_map[palavra_final] = playerid

        print(f"  [OK] {len(player_map)} nomes completos montados via players.txt")
        return player_map, nameid_to_playerids

    except FileNotFoundError:
        print(f"[!] players.txt nao encontrado: {player_path}")
        return {}, {}
    except Exception as e:
        print(f"[X] Erro ao processar players.txt: {e}")
        return {}, {}


# ─── 3. MAPEAR TIMES -> FC26 IDs ────────────────────────────────────────────

def carregar_teams(path):
    """
    Mapeia nome dos times -> teamid a partir do teams.txt.
    Retorna {nome_upper: teamid, ...}
    """
    team_map = {}
    team_name_col = None
    team_id_col = None

    try:
        lines = read_utf16_lines(path)
        header = parse_tsv_line(lines[0])

        for i, col in enumerate(header):
            if col.strip().lower() == "teamname":
                team_name_col = i
            elif col.strip().lower() == "teamid":
                team_id_col = i

        if team_name_col is None or team_id_col is None:
            print("[X] Colunas 'teamname' ou 'teamid' não encontradas em teams.txt")
            return team_map

        for line in lines[1:]:
            parts = parse_tsv_line(line)
            if len(parts) > max(team_name_col, team_id_col):
                nome = parts[team_name_col].strip()
                teamid = parts[team_id_col].strip()
                if nome and teamid.isdigit():
                    team_map[nome] = int(teamid)

        print(f"  [OK] {len(team_map)} times mapeados no teams.txt")
    except FileNotFoundError:
        print(f"[!] Arquivo teams.txt não encontrado: {path}")

    return team_map


# ─── 4. MAPEAR JOGADORES NO times.txt (players.txt) ────────────────────────

def encontrar_jogador_no_players(nameid, players_lines):
    """
    Procura um jogador pelo nameid no players.txt.
    Retorna o índice da linha e o conteúdo, ou None.
    """
    for i, line in enumerate(players_lines):
        parts = parse_tsv_line(line)
        # O nameid pode estar em várias colunas (firstnameid, lastnameid, etc.)
        # Procuramos nas primeiras colunas
        for part in parts[:5]:
            if part.strip() == str(nameid):
                return i, parts
    return None, None


# ─── 5. ENCONTRAR JOGADOR NO idjogadoresfc26 PELO NOME ────────────────────

def encontrar_nameid_por_nome(nome, id_map):
    """Busca o nameid de um jogador pelo nome, com fallbacks."""
    nome_key = nome.lower().strip()

    # 1. Match exato
    if nome_key in id_map:
        return id_map[nome_key]

    # 2. Match exato do sobrenome (após o ponto, ou última palavra)
    if "." in nome_key:
        sobrenome = nome_key.split(".")[1].strip()
    else:
        palavras = nome_key.split()
        sobrenome = palavras[-1] if palavras else ""

    if sobrenome and sobrenome in id_map:
        return id_map[sobrenome]

    return None


# ─── 6. GERAR MODIFICAÇÕES ─────────────────────────────────────────────────

def gerar_arquivos_modificados(draft_data, id_map, team_map, player_name_map, nameid_to_playerids):
    """
    Gera os arquivos TXT modificados com base no draft.
    """
    participantes = draft_data["draft"]["participants"]
    config = draft_data["draft"]["config"]

    print(f"\n{'='*60}")
    print(f"  Processando draft de {len(participantes)} participante(s)")
    print(f"  {config['playersPerTeam']} jogadores por time")
    print(f"{'='*60}\n")

    # Resumo dos participantes
    for p in participantes:
        team_pt = p["team"]
        team_name = TRADUCAO_TIMES.get(team_pt, team_pt)  # português → inglês
        team_id = team_map.get(team_name, "???")
        p["_team_en"] = team_name  # guarda para usar depois
        print(f"\n  [{p['player']}] -> {team_name} (teamid: {team_id})")
        print(f"    Jogadores ({len(p['players'])}):")
        for j in p["players"]:
            nome_lower = j["name"].lower().strip()
            playerid = player_name_map.get(nome_lower)
            id_str = f"playerid={playerid}" if playerid else "playerid=???"
            print(f"      * {j['name']:25s} ({j['position']:2s}, {j['nationality']:20s}) {id_str}")

    # ── 6a. Modificar leagues.txt ────────────────────────────────────────────
    leagues_path = ORIG_DIR / "leagues.txt"
    if leagues_path.exists():
        print(f"\n  .. Processando leagues.txt...")
        leagues_lines = read_utf16_lines(leagues_path)
        leagues_modified = False

        for i, line in enumerate(leagues_lines):
            parts = parse_tsv_line(line)
            # Procurar "International" na linha
            if len(parts) >= 2 and "international" in parts[1].strip().lower():
                if len(parts) >= 12:
                    # Último campo relevante (flag nacionalidade)
                    old_val = parts[-1].strip()
                    if old_val == "1":
                        parts[-1] = "0"
                        leagues_lines[i] = "\t".join(parts) + "\r\n"
                        leagues_modified = True
                        print(f"    [OK] Flag da liga International alterada: 1->0")

        if leagues_modified:
            write_utf16_file(OUTPUT_DIR / "leagues.txt", leagues_lines)
            print(f"  [OK] leagues.txt salvo em {OUTPUT_DIR}")
        else:
            print(f"  ~ leagues.txt: sem alterações necessárias")
    else:
        print(f"  ~ leagues.txt não encontrado, pulando...")

    # ── 6b. Modificar teamplayerlinks.txt ────────────────────────────────────
    tpl_path = ORIG_DIR / "teamplayerlinks.txt"
    if tpl_path.exists():
        print(f"\n  .. Processando teamplayerlinks.txt...")
        tpl_lines = read_utf16_lines(tpl_path)
        header = parse_tsv_line(tpl_lines[0])

        # Encontrar colunas
        col_playerid = None
        col_teamid = None
        col_artificialkey = None

        for i, col in enumerate(header):
            col_clean = col.strip().lower()
            if col_clean == "playerid":
                col_playerid = i
            elif col_clean == "teamid":
                col_teamid = i
            elif col_clean == "artificialkey":
                col_artificialkey = i

        if col_playerid is None or col_teamid is None:
            print("  [X] Colunas 'playerid' ou 'teamid' não encontradas no header")
        else:
            modifications = 0
            links_para_remover = set()
            links_para_adicionar = []

            # Busca playerid com fallbacks
            def buscar_playerid(nome_draft, pname_map, name2id, nameid2pids):
                nome_lower = nome_draft.lower().strip()
                if nome_lower in pname_map:
                    return pname_map[nome_lower]
                sobrenome = nome_lower.split(".")[1].strip() if "." in nome_lower else (nome_lower.split()[-1] if nome_lower.split() else nome_lower)
                if sobrenome and sobrenome in pname_map:
                    return pname_map[sobrenome]
                if sobrenome and sobrenome in name2id:
                    pids = nameid2pids.get(str(name2id[sobrenome]), [])
                    if len(pids) == 1:
                        return pids[0]
                if sobrenome:
                    nameid_matches = [v for k, v in name2id.items() if k and k.split()[-1] == sobrenome]
                    if len(nameid_matches) == 1:
                        pids = nameid2pids.get(str(nameid_matches[0]), [])
                        if len(pids) == 1:
                            return pids[0]
                return None

            for p in participantes:
                team_name = p["_team_en"]  # ja traduzido no resumo
                new_teamid = team_map.get(team_name)
                if not new_teamid:
                    print(f"  [X] Time '{team_name}' não encontrado no teams.txt")
                    continue

                for j in p["players"]:
                    playerid = buscar_playerid(j["name"], player_name_map, id_map, nameid_to_playerids)
                    if not playerid:
                        print(f"  ? Jogador '{j['name']}' não encontrado")
                        continue

                    # Procurar links existentes deste jogador EM TODAS as linhas
                    encontrou = False
                    for k, line in enumerate(tpl_lines):
                        if k == 0:
                            continue
                        parts = parse_tsv_line(line)
                        pid = parts[col_playerid].strip()
                        if pid == playerid:
                            # Salvar artificialkey para remover
                            if col_artificialkey is not None:
                                links_para_remover.add(parts[col_artificialkey].strip())
                            else:
                                links_para_remover.add(str(k))
                            encontrou = True

                    if encontrou:
                        # Adicionar novo link para o novo time
                        links_para_adicionar.append((playerid, new_teamid, j["position"], j["name"]))
                        modifications += 1

            print(f"    Links antigos a remover: {len(links_para_remover)}")
            print(f"    Novos links a criar:     {len(links_para_adicionar)}")

            # Remover links antigos
            novas_linhas = [tpl_lines[0]]  # header
            removidos = 0
            for i, line in enumerate(tpl_lines[1:], 1):
                parts = parse_tsv_line(line)
                keep = True

                if col_artificialkey is not None:
                    if parts[col_artificialkey].strip() in links_para_remover:
                        keep = False
                elif col_playerid is not None:
                    pid = parts[col_playerid].strip()
                    if pid.isdigit() and int(pid) in [p[0] for p in links_para_adicionar]:
                        keep = False

                if keep:
                    novas_linhas.append(line)
                else:
                    removidos += 1

            print(f"    Linhas removidas: {removidos}")

            # Adicionar novos links
            import random
            for playerid, teamid, pos, jnome in links_para_adicionar:
                jersey = random.randint(1, 99)
                pos_code = {"GK": "0", "DF": "1", "MF": "2", "FW": "3"}.get(pos, "0")
                # Formato: leaguegoals isamongtop... yellows ... artificialkey teamid ... playerid
                novas_linhas.append(
                    f"0\t0\t0\t0\t{jersey}\t{pos_code}\t-1\t{teamid}\t0\t0\t0\t0\t0\t{playerid}\t3\t0\r\n"
                )

            write_utf16_file(OUTPUT_DIR / "teamplayerlinks.txt", novas_linhas)
            print(f"  [OK] teamplayerlinks.txt salvo ({len(novas_linhas)} linhas)")
    else:
        print(f"  ~ teamplayerlinks.txt não encontrado, pulando...")

    return True


# ─── MAIN ────────────────────────────────────────────────────────────────────

def main():
    print(f"{'='*60}")
    print(f"  CONVERSOR DRAFT -> TXT RDBM 26")
    print(f"{'='*60}")

    # 1. Carregar draft
    if not DRAFT_JSON.exists():
        print(f"\n[X] Arquivo {DRAFT_JSON} não encontrado!")
        print(f"  Certifique-se de exportar o draft primeiro.")
        sys.exit(1)

    print(f"\n Carregando draft de {DRAFT_JSON}...")
    draft = carregar_draft(DRAFT_JSON)
    print(f"  [OK] Draft carregado: {draft['draft']['participants'][0]['player'] if draft['draft']['participants'] else 'vazio'}")

    # 2. Carregar ID map (nomes -> nameid)
    print(f"\n Carregando mapeamento de IDs...")
    id_map = carregar_id_map(ID_MAP_FILE)

    # 3. Carregar mapa de nomes -> playerid (via players.txt)
    print(f"\n Montando mapa de nomes completos...")
    players_txt = ORIG_DIR / "players.txt"
    player_name_map, nameid_to_playerids = carregar_player_name_map(players_txt, id_map)

    # 4. Carregar teams
    print(f"\n Carregando mapeamento de times...")
    team_map = carregar_teams(TEAMS_FILE)

    # 5. Criar diretório de saída
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"\n Pasta de saída: {OUTPUT_DIR}")

    # 6. Gerar modificações
    gerar_arquivos_modificados(draft, id_map, team_map, player_name_map, nameid_to_playerids)

    print(f"\n{'='*60}")
    print(f"  [OK] CONVERSÃO CONCLUÍDA!")
    print(f"  Os arquivos TXT modificados estão em:")
    print(f"  {OUTPUT_DIR}")
    print(f"\n  Próximo passo: importe os TXT no RDBM 26")
    print(f"  e gere o Squad File para o FC26.")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()