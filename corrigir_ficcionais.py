#!/usr/bin/env python3
"""
Corrige playerids para squads ficcionais (Iran, Jordan, Iraq, Curacao, Algeria, Qatar).
Estrategia: para paises com squad ficticio no FC26, atribuir por POSICAO (nao por nome).
Os pids fornecidos pelo usuario sao usados como pool; as posicoes sao lidas do squad file.
Qatar: tem jogadores reais, tenta nome primeiro depois posicao.
"""
import json, unicodedata, sys, io
from pathlib import Path
from collections import defaultdict

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ALL_DIR = Path(r"C:\Users\guilh\OneDrive\Documentos\draft-copa-do-mundo-2026\All-PlayersID-FC26")
ORIG = Path(r"C:\Users\guilh\OneDrive\Documentos\draft-copa-do-mundo-2026\Arquivos Originais")
SCRIPT_DIR = Path(r"C:\Users\guilh\OneDrive\Documentos\draft-copa-do-mundo-2026")

def norm(s):
    s = unicodedata.normalize("NFD", str(s))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.lower().strip()

def words(s):
    return set(w for w in norm(s).split() if len(w) > 1)

def ler_utf16(path):
    with open(path, "r", encoding="utf-16-le", errors="replace") as f:
        return f.read().splitlines(keepends=True)

def tsv(l):
    return l.rstrip("\r\n").split("\t")

# ============================================================
# PIDs exatos fornecidos pelo usuario (26 por pais)
# ============================================================
PIDS_EXATOS = {
    "ira": [
        "84164","84165","84167","84168","84169","84170","84171","84172",
        "84173","84174","84175","84176","84177","84178","84179","84180",
        "84181","84182","84183","84184","84185","84186","84187","84189",
        "84190","84197",
    ],
    "jordania": [
        "85479","85480","85481","85482","85483","85484","85485","85486",
        "85487","85488","85489","85490","85491","85492","85493","85494",
        "85495","85496","85497","85498","85499","85500","85501","85502",
        "85503","85504",
    ],
    "uzbequistao": [
        "72737","80304","81921","81922","81924","81925","81926","81927",
        "81928","81930","81933","81938","81952","81953","86239","86240",
        "86241","220375","220376","239964","242970","247468","257858",
        "262595","271294","277031",
    ],
    "catar": [
        "74236","76232","80131","81834","81956","84621","180561","203244",
        "215911","228352","234051","239878","268771","268772","268776",
        "268778","268779","268780","268781","268783","268877","268879",
        "268979","268982","268985","272472",
    ],
}

# Paises com squad 100% ficticio (sem match de nome possivel)
PAISES_100_FICTICIO = {"ira", "jordania", "iraque"}

# ============================================================
# Ler squad files para obter posicao de cada pid
# ============================================================
PAIS_TO_TEAMFILE = {
    "argelia": "111448 - Algeria", "argentina": "1369 - Argentina",
    "australia": "1415 - Australia", "austria": "1322 - Austria (National team)",
    "belgica": "1325 - Belgium", "bosnia e herzegovina": "105013 - Bosnia & Herzegovina",
    "brasil": "1370 - Brazil", "cabo verde": "111456 - Cabo Verde",
    "canada": "111455 - Canada", "colombia": "111109 - Colombia",
    "rd congo": "111545 - Congo DR", "croacia": "1328 - Croatia",
    "curacao": "112054 - Curaçao", "republica tcheca": "1330 - Czech Republic",
    "dinamarca": "1331 - Denmark", "equador": "111465 - Ecuador",
    "egito": "111130 - Egypt", "inglaterra": "1318 - England",
    "finlandia": "1334 - Finland", "franca": "1335 - France",
    "alemanha": "1337 - Germany", "gana": "111462 - Ghana",
    "haiti": "112048 - Haiti", "holanda": "105035 - Holland",
    "hungria": "1886 - Hungary", "islandia": "1341 - Iceland",
    "indonesia": "111510 - Indonesia", "ira": "111115 - Iran",
    "iraque": "111512 - Iraq", "italia": "1343 - Italy",
    "costa do marfim": "111112 - Ivory Coast", "japao": "1411 - Japan",
    "jordania": "111513 - Jordan", "coreia do sul": "974 - Korea Republic",
    "mexico": "1386 - Mexico", "marrocos": "111111 - Morocco",
    "nova zelandia": "111473 - New Zealand", "irlanda do norte": "110081 - Northern Ireland",
    "noruega": "1352 - Norway", "panama": "111475 - Panamá",
    "paraguai": "1375 - Paraguay", "polonia": "1353 - Poland",
    "portugal": "1354 - Portugal", "catar": "111527 - Qatar",
    "romenia": "1356 - Romania", "arabia saudita": "111114 - Saudi Arabia",
    "escocia": "1359 - Scotland", "senegal": "1667 - Senegal",
    "africa do sul": "111099 - South Africa", "espanha": "1362 - Spain",
    "suecia": "1363 - Sweden", "suica": "1364 - Switzerland",
    "tunisia": "1391 - Tunisia", "turquia": "1365 - Türkiye",
    "ucrania": "1366 - Ukraine", "estados unidos": "1387 - United States",
    "uruguai": "1377 - Uruguay", "uzbequistao": "111485 - Uzbekistan",
    "pais de gales": "1367 - Wales",
}

def read_team_file(filepath):
    with open(filepath, "r", encoding="utf-16-le", errors="replace") as f:
        content = f.read()
    lines = content.splitlines()
    if not lines: return []
    header = [c.strip() for c in lines[0].split("\t")]
    results = []
    for line in lines[1:]:
        if not line.strip(): continue
        parts = [c.strip() for c in line.split("\t")]
        row = dict(zip(header, parts))
        pid = row.get("playerid","").strip()
        if pid and pid.isdigit():
            results.append({"pid": pid,
                             "firstname": row.get("firstname",""),
                             "lastname": row.get("lastname",""),
                             "commonname": row.get("commonname",""),
                             "position": row.get("Position",""),
                             "number": row.get("number","")})
    return results

pais_squad = {}
for pais, teamfile in PAIS_TO_TEAMFILE.items():
    fpath = next((f for f in ALL_DIR.iterdir()
                  if f.suffix == ".txt" and norm(f.stem) == norm(teamfile)), None)
    pais_squad[pais] = read_team_file(fpath) if fpath else []

# pid -> posicao/nome (do squad file)
pid_to_fc26 = {}
for squad in pais_squad.values():
    for p in squad:
        pid_to_fc26[p["pid"]] = p

# ============================================================
# Ordenacao de posicao: GK < DF < MF < FW
# ============================================================
POS_ORDER = {"GK": 0, "DF": 1, "MF": 2, "FW": 3}

FC26_TO_FIFA = {
    "GK": "GK",
    "CB": "DF", "LB": "DF", "RB": "DF", "LWB": "DF", "RWB": "DF",
    "CDM": "MF", "CM": "MF", "CAM": "MF", "LM": "MF", "RM": "MF",
    "ST": "FW", "LW": "FW", "RW": "FW", "CF": "FW", "SS": "FW",
}

def pos_key(pos_fifa):
    return POS_ORDER.get(pos_fifa, 2)

def fc26_pos_key(fc26_pos):
    return POS_ORDER.get(FC26_TO_FIFA.get(fc26_pos, "MF"), 2)

# ============================================================
# Carregar jogadores_final.json
# ============================================================
print("Carregando jogadores_final.json...")
with open(SCRIPT_DIR / "jogadores_final.json", encoding="utf-8") as f:
    data = json.load(f)
print(f"Total: {len(data)} jogadores")

# ============================================================
# Global player index (para Qatar - match por nome)
# ============================================================
print("Carregando players.txt...")
nid_to_name = {}
for line in ler_utf16(SCRIPT_DIR / "idjogadoresfc26.txt"):
    p = tsv(line)
    if len(p) >= 2 and p[1].strip().isdigit():
        nid_to_name[int(p[1].strip())] = p[0].strip()

players_lines = ler_utf16(ORIG / "players.txt")
cab = tsv(players_lines[0])
col_pid = next(i for i, c in enumerate(cab) if c.strip().lower() == "playerid")

all_players = {}
for line in players_lines[1:]:
    p = tsv(line)
    if len(p) <= col_pid or not p[col_pid].strip().isdigit(): continue
    pid = p[col_pid].strip()
    fn = nid_to_name.get(int(p[0]) if p[0].strip().isdigit() else 0, "")
    ln = nid_to_name.get(int(p[1]) if p[1].strip().isdigit() else 0, "")
    cn = nid_to_name.get(int(p[3]) if len(p)>3 and p[3].strip().isdigit() else 0, "")
    all_players[pid] = {"pid": pid, "firstname": fn, "lastname": ln, "commonname": cn}

def nome_score(fifa_nc, fc26_pid):
    """Score de match entre nome FIFA e nome do jogador FC26 (do squad file ou all_players)."""
    fc26 = pid_to_fc26.get(fc26_pid) or all_players.get(fc26_pid, {})
    fn = fc26.get("firstname","")
    ln = fc26.get("lastname","")
    cn = fc26.get("commonname","")
    fc26_words = words(fn + " " + ln + " " + cn)
    fifa_words = words(fifa_nc)
    if not fc26_words or not fifa_words: return 0
    common = fc26_words & fifa_words
    return len(common) / max(len(fc26_words), len(fifa_words))

# ============================================================
# PROCESSAR cada pais com mapeamento exato
# ============================================================
total_atribuidos = 0

for pais_key, pids_exatos in PIDS_EXATOS.items():
    jogadores_pais = [j for j in data if norm(j["pais"]) == pais_key]
    print(f"\n=== {pais_key.upper()} ({len(jogadores_pais)} jogadores, {len(pids_exatos)} pids) ===")

    # Limpar TODOS os IDs do pais para re-atribuir do zero
    for j in jogadores_pais:
        j["playerid"] = None
        j["_match"] = "a_reatribuir"

    used_pids_local = set()

    if pais_key in PAISES_100_FICTICIO:
        # -----------------------------------------------------------
        # ATRIBUICAO POSICIONAL PURA
        # Ordenar os pids FC26 pelos grupos de posicao
        # Ordenar os jogadores reais FIFA pelos grupos de posicao
        # Mapear 1:1
        # -----------------------------------------------------------

        # Montar pool ordenado de pids ficticios: (fc26_pos_order, pid)
        pool_fc26 = []
        for pid in pids_exatos:
            fc26p = pid_to_fc26.get(pid, {})
            fc26_pos = fc26p.get("position","CM")
            order = fc26_pos_key(fc26_pos)
            pool_fc26.append((order, fc26_pos, pid))
        pool_fc26.sort(key=lambda x: x[0])

        # Montar lista de jogadores reais ordenados por posicao FIFA
        jogadores_sorted = sorted(jogadores_pais, key=lambda j: pos_key(j.get("posicao","MF")))

        # Mapear 1:1
        used_pids_local = set()
        pool_idx = 0
        for j in jogadores_sorted:
            pos_fifa = j.get("posicao","MF")
            pos_order_real = pos_key(pos_fifa)

            # Tentar achar pid ficticio compativel que ainda nao foi usado
            best_pid = None
            best_dist = 99
            for order, fc26_pos, pid in pool_fc26:
                if pid in used_pids_local: continue
                dist = abs(order - pos_order_real)
                if dist < best_dist:
                    best_dist = dist
                    best_pid = pid
                if dist == 0:
                    break  # Posicao exata encontrada

            if best_pid:
                j["playerid"] = best_pid
                j["_match"] = f"ficticio_pos_{j.get('posicao','?')}"
                used_pids_local.add(best_pid)
                total_atribuidos += 1
                fc26_info = pid_to_fc26.get(best_pid,{})
                print(f"  {j['nome_completo']} ({pos_fifa}) -> pid={best_pid} [{fc26_info.get('firstname','')} {fc26_info.get('lastname','')} / {fc26_info.get('position','')}]")
            else:
                print(f"  SEM PID: {j['nome_completo']} ({pos_fifa})")

    elif pais_key == "uzbequistao":
        # -----------------------------------------------------------
        # UZBEKISTAO: tem jogadores reais no FC26
        # Match por nome primeiro, depois posicional para resto
        # -----------------------------------------------------------
        pool_pids = list(pids_exatos)

        # Para cada jogador real, computar score de nome contra cada pid disponivel
        for j in sorted(jogadores_pais, key=lambda j: -len(j.get("nome_completo",""))):
            nc = j.get("nome_completo","")
            best_score = 0
            best_pid = None
            for pid in pool_pids:
                if pid in used_pids_local: continue
                s = nome_score(nc, pid)
                if s > best_score:
                    best_score = s
                    best_pid = pid

            if best_pid and best_score >= 0.4:
                j["playerid"] = best_pid
                j["_match"] = f"uzb_nome_{best_score:.2f}"
                used_pids_local.add(best_pid)
                total_atribuidos += 1
                print(f"  [nome {best_score:.2f}] {nc} -> pid={best_pid}")
            else:
                # Posicional
                pos_fifa = j.get("posicao","MF")
                pos_order_real = pos_key(pos_fifa)
                best_pid2 = None
                best_dist = 99
                for pid in pool_pids:
                    if pid in used_pids_local: continue
                    fc26p = pid_to_fc26.get(pid, {})
                    order = fc26_pos_key(fc26p.get("position","CM"))
                    dist = abs(order - pos_order_real)
                    if dist < best_dist:
                        best_dist = dist
                        best_pid2 = pid
                if best_pid2:
                    j["playerid"] = best_pid2
                    j["_match"] = f"uzb_pos_{pos_fifa}"
                    used_pids_local.add(best_pid2)
                    total_atribuidos += 1
                    print(f"  [pos] {nc} ({pos_fifa}) -> pid={best_pid2}")
                else:
                    print(f"  SEM PID: {nc}")

    elif pais_key == "catar":
        # -----------------------------------------------------------
        # QATAR: mix de jogadores reais e naturalizados
        # Match por nome usando o mapeamento exato (nome FIFA <-> nome no squad file)
        # -----------------------------------------------------------
        pool_pids = list(pids_exatos)

        # Processar os que tem match alto por nome
        unmatched = []
        for j in jogadores_pais:
            nc = j.get("nome_completo","")
            best_score = 0
            best_pid = None
            for pid in pool_pids:
                if pid in used_pids_local: continue
                s = nome_score(nc, pid)
                if s > best_score:
                    best_score = s
                    best_pid = pid

            if best_pid and best_score >= 0.35:
                j["playerid"] = best_pid
                j["_match"] = f"catar_nome_{best_score:.2f}"
                used_pids_local.add(best_pid)
                total_atribuidos += 1
                print(f"  [nome {best_score:.2f}] {nc} -> pid={best_pid}")
            else:
                unmatched.append(j)

        # Posicional para os restantes
        for j in unmatched:
            pos_fifa = j.get("posicao","MF")
            pos_order_real = pos_key(pos_fifa)
            nc = j.get("nome_completo","")
            best_pid = None
            best_dist = 99
            for pid in pool_pids:
                if pid in used_pids_local: continue
                fc26p = pid_to_fc26.get(pid, {})
                order = fc26_pos_key(fc26p.get("position","CM"))
                dist = abs(order - pos_order_real)
                if dist < best_dist:
                    best_dist = dist
                    best_pid = pid
            if best_pid:
                j["playerid"] = best_pid
                j["_match"] = f"catar_pos_{pos_fifa}"
                used_pids_local.add(best_pid)
                total_atribuidos += 1
                print(f"  [pos] {nc} ({pos_fifa}) -> pid={best_pid}")
            else:
                print(f"  SEM PID: {nc}")

# ============================================================
# Tambem corrigir: Argelia, Curacao, Iraque (ficcionais sem mapa exato fornecido)
# Usa squad file disponivel, posicional
# ============================================================
OUTROS_FICCIONAIS = ["argelia", "curacao", "iraque"]
for pais_key in OUTROS_FICCIONAIS:
    if pais_key in PIDS_EXATOS:
        continue  # ja tratado
    jogadores_pais = [j for j in data if norm(j["pais"]) == pais_key]
    if not jogadores_pais: continue
    squad = pais_squad.get(pais_key, [])
    if not squad:
        print(f"\n{pais_key}: sem squad file, pulando")
        continue

    print(f"\n=== {pais_key.upper()} ({len(jogadores_pais)} jog, {len(squad)} squad) ===")

    # Montar pid_in_use global antes desse pais
    used_global = set(j.get("playerid") for j in data if j.get("playerid") and norm(j["pais"]) != pais_key)

    # Limpar
    for j in jogadores_pais:
        j["playerid"] = None

    available = [p for p in squad if p["pid"] not in used_global]
    pool_fc26 = [(fc26_pos_key(p.get("position","CM")), p.get("position",""), p["pid"]) for p in available]
    pool_fc26.sort()

    jogadores_sorted = sorted(jogadores_pais, key=lambda j: pos_key(j.get("posicao","MF")))
    used_local = set()
    for j in jogadores_sorted:
        pos_order = pos_key(j.get("posicao","MF"))
        best_pid = None
        best_dist = 99
        for order, fc26_pos, pid in pool_fc26:
            if pid in used_local: continue
            dist = abs(order - pos_order)
            if dist < best_dist:
                best_dist = dist
                best_pid = pid
        if best_pid:
            j["playerid"] = best_pid
            j["_match"] = f"ficticio_pos_{j.get('posicao','?')}"
            used_local.add(best_pid)
            total_atribuidos += 1
        else:
            print(f"  SEM PID: {j['nome_completo']}")

# ============================================================
# Resultado final
# ============================================================
pid_cnt = defaultdict(list)
for j in data:
    if j.get("playerid"):
        pid_cnt[j["playerid"]].append(j)
dup_final = {p: js for p, js in pid_cnt.items() if len(js) > 1}
total_com = sum(1 for j in data if j.get("playerid"))
total_sem = len(data) - total_com

print(f"\n=== RESULTADO ===")
print(f"  Atribuidos neste script: {total_atribuidos}")
print(f"  Total COM ID: {total_com}/{len(data)} ({total_com*100//len(data)}%)")
print(f"  Total SEM ID: {total_sem}")
print(f"  Duplicados: {len(dup_final)}")

if dup_final:
    print(f"\n=== DUPLICADOS ({len(dup_final)}) ===")
    for pid, js in sorted(dup_final.items(), key=lambda x: -len(x[1])):
        print(f"  pid={pid} ({len(js)}x) [{js[0]['pais']}]: {[j['nome_completo'] for j in js]}")

if total_sem > 0:
    print(f"\n=== SEM ID ===")
    for j in data:
        if not j.get("playerid"):
            print(f"  {j['nome_completo']} ({j['pais']})")

# Salvar
with open(SCRIPT_DIR / "jogadores_final.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print("\nSalvo: jogadores_final.json")
