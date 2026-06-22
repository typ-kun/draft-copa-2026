#!/usr/bin/env python3
"""
Corrige playerids duplicados no jogadores_final.json.
Para cada grupo duplicado: mantém o melhor match, limpa os demais, re-busca.
"""
import json, unicodedata, sys, io
from pathlib import Path
from collections import defaultdict

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ALL_DIR = Path(r"C:\Users\guilh\OneDrive\Documentos\draft-copa-do-mundo-2026\All-PlayersID-FC26")
ORIG = Path(r"C:\Users\guilh\OneDrive\Documentos\draft-copa-do-mundo-2026\Arquivos Originais")
SCRIPT_DIR = Path(r"C:\Users\guilh\OneDrive\Documentos\draft-copa-do-mundo-2026")

def ler_utf16(path):
    with open(path, "r", encoding="utf-16-le", errors="replace") as f:
        return f.read().splitlines(keepends=True)

def tsv(l):
    return l.rstrip("\r\n").split("\t")

def norm(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return s.lower().strip()

# ============================================================
# Carregar squad data
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
                             "position": row.get("Position","")})
    return results

pais_squad = {}
for pais, teamfile in PAIS_TO_TEAMFILE.items():
    fpath = next((f for f in ALL_DIR.iterdir()
                  if f.suffix == ".txt" and norm(f.stem) == norm(teamfile)), None)
    pais_squad[pais] = read_team_file(fpath) if fpath else []

# ============================================================
# Global player index from players.txt
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

# pid -> full info
all_players = {}
for line in players_lines[1:]:
    p = tsv(line)
    if len(p) <= col_pid or not p[col_pid].strip().isdigit(): continue
    pid = p[col_pid].strip()
    fn = nid_to_name.get(int(p[0]) if p[0].strip().isdigit() else 0, "")
    ln = nid_to_name.get(int(p[1]) if p[1].strip().isdigit() else 0, "")
    jn = nid_to_name.get(int(p[2]) if len(p)>2 and p[2].strip().isdigit() else 0, "")
    cn = nid_to_name.get(int(p[3]) if len(p)>3 and p[3].strip().isdigit() else 0, "")
    all_players[pid] = {"pid": pid, "firstname": fn, "lastname": ln,
                        "commonname": cn, "jerseyname": jn}

# Indices globais
by_sn = defaultdict(list)
by_cn = defaultdict(list)
for info in all_players.values():
    for key in [norm(info["lastname"]), norm(info["jerseyname"])]:
        if key and len(key) >= 3:
            by_sn[key].append(info)
    for key in [norm(info["commonname"])]:
        if key and len(key) >= 3:
            by_cn[key].append(info)

# ============================================================
# Scoring
# ============================================================
def score_match(player, sn_q, fn_q):
    ln = norm(player.get("lastname",""))
    fn = norm(player.get("firstname",""))
    cn = norm(player.get("commonname","") or player.get("jerseyname",""))
    score = 0
    if sn_q == ln or sn_q == cn:
        score += 10
    elif ln and len(sn_q) >= 4 and sn_q in ln:
        score += 7
    elif cn and len(sn_q) >= 4 and sn_q in cn:
        score += 7
    else:
        ln_parts = ln.split()
        if ln_parts and sn_q == ln_parts[-1]:
            score += 9
    if score == 0: return 0
    if fn_q:
        if fn_q == fn: score += 8
        elif fn and (fn_q in fn or fn in fn_q): score += 4
        elif fn and any(p in fn for p in fn_q.split() if len(p) > 2): score += 2
        if cn and fn_q in cn: score += 3
    return score

def buscar(sn, fn, pool):
    results = []
    for player in pool:
        s = score_match(player, norm(sn), norm(fn) if fn else "")
        if s > 0:
            results.append((s, player["pid"], player))
    results.sort(key=lambda x: (-x[0], x[1]))
    return results

def buscar_global(sn, fn):
    sn_n = norm(sn)
    fn_n = norm(fn) if fn else ""
    cands = []
    for key in by_sn:
        if sn_n == key or (len(sn_n) >= 5 and sn_n in key) or (len(key) >= 5 and key in sn_n):
            cands.extend(by_sn[key])
    for key in by_cn:
        if sn_n == key:
            cands.extend(by_cn[key])
    seen = set()
    unique = [c for c in cands if c["pid"] not in seen and not seen.add(c["pid"])]
    return buscar(sn, fn, unique)

# ============================================================
# Carregar e analisar duplicados
# ============================================================
print("Carregando jogadores_final.json...")
with open(SCRIPT_DIR / "jogadores_final.json", encoding="utf-8") as f:
    data = json.load(f)

pid_to_players = defaultdict(list)
for j in data:
    if j.get("playerid"):
        pid_to_players[j["playerid"]].append(j)

# Score de confianca por match type
def confianca(j):
    mt = j.get("_match", "")
    if mt.startswith("ok_") and "ambig" not in mt:
        try: return int(mt.split("_")[-1])
        except: return 15
    if mt == "manual": return 30
    if mt.startswith("posicional"): return 5
    if mt.startswith("ok_parcial"): return 7
    if mt.startswith("ambig"): return 6
    if mt.startswith("score="): return int(mt.split("=")[1])
    if "fallback" in mt: return 4
    return 0

# Para cada duplicado: manter o de maior confianca, limpar os demais
limpos = 0
for pid, players in pid_to_players.items():
    if len(players) <= 1: continue
    # Ordenar por confianca desc
    players.sort(key=lambda j: -confianca(j))
    # Manter o primeiro (maior confianca), limpar os demais
    for j in players[1:]:
        j["playerid"] = None
        j["_match"] = "duplicado_limpo"
        limpos += 1

print(f"Duplicados limpos: {limpos}")

# ============================================================
# Re-buscar para os limpos
# ============================================================
POS_FC26_MAP = {
    "GK": ["GK"], "DF": ["CB","LB","RB","LWB","RWB"],
    "MF": ["CDM","CM","CAM","LM","RM"], "FW": ["ST","LW","RW","CF","SS","ST"]
}

used_pids = set(j["playerid"] for j in data if j.get("playerid"))

# Para cada pais, rastrear pids disponiveis do squad
squad_remaining = {}
for pais, squad in pais_squad.items():
    squad_remaining[pais] = [p for p in squad if p["pid"] not in used_pids]

recuperados = 0
posicionais2 = 0
ainda_sem = []

for j in data:
    if j.get("playerid"): continue

    pais_n = norm(j["pais"])
    nc = j.get("nome_completo","").strip()
    partes = nc.split()
    sn = partes[0] if partes else ""
    fn = " ".join(partes[1:]) if len(partes) >= 2 else ""

    if not sn:
        ainda_sem.append(j)
        continue

    squad = pais_squad.get(pais_n, [])

    # Filtrar pids disponiveis do squad
    available_squad = [p for p in squad if p["pid"] not in used_pids]

    # Busca 1: squad disponivel (normal)
    results = buscar(sn, fn, available_squad) if available_squad else []

    # Busca 2: squad invertido (firstname=sn, lastname=fn)
    if (not results or results[0][0] < 7) and fn:
        r2 = buscar(fn, sn, available_squad)
        if r2 and (not results or r2[0][0] > results[0][0]):
            results = r2

    # Busca 3: global
    if not results or results[0][0] < 7:
        r3 = [r for r in buscar_global(sn, fn) if r[1] not in used_pids]
        if r3 and (not results or r3[0][0] > results[0][0]):
            results = r3
        # invertido global
        if fn:
            r4 = [r for r in buscar_global(fn, sn) if r[1] not in used_pids]
            if r4 and (not results or r4[0][0] > results[0][0]):
                results = r4

    if results and results[0][0] >= 7:
        best = results[0]
        j["playerid"] = best[1]
        j["_match"] = f"recup_{best[0]}"
        used_pids.add(best[1])
        # Remove from remaining
        squad_remaining[pais_n] = [p for p in squad_remaining.get(pais_n,[]) if p["pid"] != best[1]]
        recuperados += 1
    else:
        # Atribuicao posicional (squad disponivel)
        remaining = squad_remaining.get(pais_n, [])
        if remaining:
            pos_fifa = j.get("posicao","MF")
            fc26_pos = POS_FC26_MAP.get(pos_fifa, [])
            matched = next((p for p in remaining if p.get("position","") in fc26_pos), remaining[0])
            j["playerid"] = matched["pid"]
            j["_match"] = f"recup_posicional_{pos_fifa}"
            used_pids.add(matched["pid"])
            squad_remaining[pais_n] = [p for p in remaining if p["pid"] != matched["pid"]]
            posicionais2 += 1
        else:
            ainda_sem.append(j)

# Verificar duplicados remanescentes
pid_to_cnt2 = defaultdict(int)
for j in data:
    if j.get("playerid"):
        pid_to_cnt2[j["playerid"]] += 1
dup2 = {p: c for p, c in pid_to_cnt2.items() if c > 1}

print(f"\n=== RESULTADO ===")
print(f"  Limpos e re-buscados por nome: {recuperados}")
print(f"  Re-atribuidos por posicao: {posicionais2}")
print(f"  Ainda sem ID: {len(ainda_sem)}")
print(f"  Duplicados remanescentes: {len(dup2)}")
total_com = sum(1 for j in data if j.get("playerid"))
print(f"  Total com ID: {total_com}/{len(data)}")

if dup2:
    print(f"\n=== DUPLICADOS RESTANTES ({len(dup2)}) ===")
    for pid, cnt in list(dup2.items())[:15]:
        players_dup = [j for j in data if j.get("playerid") == pid]
        print(f"  pid={pid} ({cnt}x): {[p['nome_completo'] for p in players_dup]}")

if ainda_sem:
    print(f"\n=== AINDA SEM ID ({len(ainda_sem)}) ===")
    for j in ainda_sem[:20]:
        print(f"  {j['nome_completo']} ({j['pais']})")

# Salvar
with open(SCRIPT_DIR / "jogadores_final.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print("\nSalvo: jogadores_final.json")
