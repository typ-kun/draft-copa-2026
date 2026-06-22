#!/usr/bin/env python3
"""
Mapeia playerids do FC26 - versao final.
Fases:
1. Busca no squad (All-PlayersID-FC26) por nome + nome invertido
2. Fallback por players.txt global
3. Para paises com squads ficcionais: atribui por posicao se sem match
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
PAIS_TO_TEAMFILE = {
    "argelia":              "111448 - Algeria",
    "argentina":            "1369 - Argentina",
    "australia":            "1415 - Australia",
    "austria":              "1322 - Austria (National team)",
    "belgica":              "1325 - Belgium",
    "bosnia e herzegovina": "105013 - Bosnia & Herzegovina",
    "brasil":               "1370 - Brazil",
    "cabo verde":           "111456 - Cabo Verde",
    "canada":               "111455 - Canada",
    "colombia":             "111109 - Colombia",
    "rd congo":             "111545 - Congo DR",
    "croacia":              "1328 - Croatia",
    "curacao":              "112054 - Curaçao",
    "republica tcheca":     "1330 - Czech Republic",
    "dinamarca":            "1331 - Denmark",
    "equador":              "111465 - Ecuador",
    "egito":                "111130 - Egypt",
    "inglaterra":           "1318 - England",
    "finlandia":            "1334 - Finland",
    "franca":               "1335 - France",
    "alemanha":             "1337 - Germany",
    "gana":                 "111462 - Ghana",
    "haiti":                "112048 - Haiti",
    "holanda":              "105035 - Holland",
    "hungria":              "1886 - Hungary",
    "islandia":             "1341 - Iceland",
    "indonesia":            "111510 - Indonesia",
    "ira":                  "111115 - Iran",
    "iraque":               "111512 - Iraq",
    "italia":               "1343 - Italy",
    "costa do marfim":      "111112 - Ivory Coast",
    "japao":                "1411 - Japan",
    "jordania":             "111513 - Jordan",
    "coreia do sul":        "974 - Korea Republic",
    "mexico":               "1386 - Mexico",
    "marrocos":             "111111 - Morocco",
    "nova zelandia":        "111473 - New Zealand",
    "irlanda do norte":     "110081 - Northern Ireland",
    "noruega":              "1352 - Norway",
    "panama":               "111475 - Panamá",
    "paraguai":             "1375 - Paraguay",
    "polonia":              "1353 - Poland",
    "portugal":             "1354 - Portugal",
    "catar":                "111527 - Qatar",
    "romenia":              "1356 - Romania",
    "arabia saudita":       "111114 - Saudi Arabia",
    "escocia":              "1359 - Scotland",
    "senegal":              "1667 - Senegal",
    "africa do sul":        "111099 - South Africa",
    "espanha":              "1362 - Spain",
    "suecia":               "1363 - Sweden",
    "suica":                "1364 - Switzerland",
    "tunisia":              "1391 - Tunisia",
    "turquia":              "1365 - Türkiye",
    "ucrania":              "1366 - Ukraine",
    "estados unidos":       "1387 - United States",
    "uruguai":              "1377 - Uruguay",
    "uzbequistao":          "111485 - Uzbekistan",
    "pais de gales":        "1367 - Wales",
}

# Paises onde o FC26 usa jogadores FICCIONAIS (sem match de nome esperado)
# Para esses, usaremos atribuicao por posicao quando sem match
PAISES_FICCIONAIS = {
    "ira", "iraque", "jordania", "curacao", "argelia",
}

def read_team_file(filepath):
    with open(filepath, "r", encoding="utf-16-le", errors="replace") as f:
        content = f.read()
    lines = content.splitlines()
    if not lines:
        return []
    header = [c.strip() for c in lines[0].split("\t")]
    results = []
    for line in lines[1:]:
        if not line.strip():
            continue
        parts = [c.strip() for c in line.split("\t")]
        row = dict(zip(header, parts))
        pid = row.get("playerid", "").strip()
        if pid and pid.isdigit():
            results.append({
                "pid": pid,
                "firstname": row.get("firstname", ""),
                "lastname": row.get("lastname", ""),
                "commonname": row.get("commonname", ""),
                "position": row.get("Position", ""),
            })
    return results

print("Carregando All-PlayersID-FC26...")
pais_squad = {}
for pais, teamfile in PAIS_TO_TEAMFILE.items():
    fpath = None
    for f in ALL_DIR.iterdir():
        if f.suffix == ".txt" and norm(f.stem) == norm(teamfile):
            fpath = f
            break
    if fpath:
        pais_squad[pais] = read_team_file(fpath)
    else:
        pais_squad[pais] = []

print("Carregando players.txt (fallback)...")
nid_to_name = {}
for line in ler_utf16(SCRIPT_DIR / "idjogadoresfc26.txt"):
    p = tsv(line)
    if len(p) >= 2 and p[1].strip().isdigit():
        nid_to_name[int(p[1].strip())] = p[0].strip()

players_lines = ler_utf16(ORIG / "players.txt")
cab = tsv(players_lines[0])
col_pid = next(i for i, c in enumerate(cab) if c.strip().lower() == "playerid")
col_nat = next(i for i, c in enumerate(cab) if c.strip().lower() == "nationality")

global_by_sn = defaultdict(list)
global_by_cn = defaultdict(list)
for line in players_lines[1:]:
    p = tsv(line)
    if len(p) <= col_pid or not p[col_pid].strip().isdigit():
        continue
    pid = p[col_pid].strip()
    fn_id = int(p[0]) if p[0].strip().isdigit() else 0
    ln_id = int(p[1]) if p[1].strip().isdigit() else 0
    jn_id = int(p[2]) if len(p) > 2 and p[2].strip().isdigit() else 0
    cn_id = int(p[3]) if len(p) > 3 and p[3].strip().isdigit() else 0
    ln = nid_to_name.get(ln_id, "")
    fn = nid_to_name.get(fn_id, "")
    cn = nid_to_name.get(cn_id, "")
    jn = nid_to_name.get(jn_id, "")
    info = {"pid": pid, "firstname": fn, "lastname": ln, "commonname": cn, "jerseyname": jn}
    if norm(ln):
        global_by_sn[norm(ln)].append(info)
    if norm(jn) and norm(jn) != norm(ln):
        global_by_sn[norm(jn)].append(info)
    if norm(cn):
        global_by_cn[norm(cn)].append(info)

# ============================================================
def score_match(player, sn_q, fn_q):
    ln = norm(player.get("lastname", ""))
    fn = norm(player.get("firstname", ""))
    cn = norm(player.get("commonname", "") or player.get("jerseyname", ""))
    score = 0
    # Sobrenome match
    if sn_q == ln or sn_q == cn:
        score += 10
    elif ln and len(sn_q) >= 4 and sn_q in ln:
        score += 7
    elif cn and len(sn_q) >= 4 and sn_q in cn:
        score += 7
    elif ln and len(sn_q) >= 5 and ln.startswith(sn_q[:5]):
        score += 5
    else:
        # Try last word of ln
        ln_parts = ln.split()
        if ln_parts and sn_q == ln_parts[-1]:
            score += 9
    if score == 0:
        return 0
    # Primeiro nome bonus
    if fn_q:
        if fn_q == fn:
            score += 8
        elif fn and (fn_q in fn or fn in fn_q):
            score += 4
        elif fn and any(part in fn for part in fn_q.split() if len(part) > 2):
            score += 2
        if cn and fn_q in cn:
            score += 3
    return score


def buscar_em_pool(pool, sn, fn):
    results = []
    for player in pool:
        s = score_match(player, norm(sn), norm(fn) if fn else "")
        if s > 0:
            results.append((s, player["pid"], player))
    results.sort(key=lambda x: (-x[0], x[1]))
    return results


def buscar_global_by_name(sn, fn):
    sn_n = norm(sn)
    fn_n = norm(fn) if fn else ""
    cands = []
    # Exact + partial sobrenome
    for key in list(global_by_sn.keys()):
        if sn_n == key or (len(sn_n) >= 5 and sn_n in key) or (len(key) >= 5 and key in sn_n):
            cands.extend(global_by_sn[key])
    # cn exact
    for key in list(global_by_cn.keys()):
        if sn_n == key:
            cands.extend(global_by_cn[key])
    seen = set()
    unique = []
    for c in cands:
        if c["pid"] not in seen:
            seen.add(c["pid"])
            unique.append(c)
    return buscar_em_pool(unique, sn, fn)


def pick_best(results):
    if not results:
        return None, "nao_encontrado"
    best = results[0][0]
    top = [r for r in results if r[0] == best]
    if best >= 18:
        return top[0][1], f"ok_{best}"
    if best >= 10:
        if len(top) == 1:
            return top[0][1], f"ok_{best}"
        return top[0][1], f"ambig_{len(top)}_{best}"
    if best >= 7:
        if len(top) == 1:
            return top[0][1], f"ok_parcial_{best}"
        return None, f"ambig_parcial_{len(top)}"
    return None, f"score_baixo_{best}"


# ============================================================
print("\nCarregando jogadores_final.json...")
with open(SCRIPT_DIR / "jogadores_final.json", encoding="utf-8") as f:
    data = json.load(f)

sem_id_orig = sum(1 for j in data if not j.get("playerid"))
print(f"Jogadores sem ID: {sem_id_orig}")

# Track which squad pids are already used (from previous matches)
used_pids = set(j["playerid"] for j in data if j.get("playerid"))

# Track remaining squad pids per pais (for positional assignment)
squad_remaining = {}
for pais, squad in pais_squad.items():
    remaining = [p for p in squad if p["pid"] not in used_pids]
    squad_remaining[pais] = remaining

atualizados = 0
posicionais = 0
falhas = []
ambiguos_list = []

for j in data:
    if j.get("playerid"):
        continue

    pais_n = norm(j["pais"])
    nc = j.get("nome_completo", "").strip()
    partes = nc.split()
    sobrenome = partes[0] if partes else ""
    primeiro = " ".join(partes[1:]) if len(partes) >= 2 else ""

    if not sobrenome:
        falhas.append((nc, j["pais"], "sem_nome", []))
        continue

    squad = pais_squad.get(pais_n, [])

    # --- Tentativa 1: squad normal (sobrenome = partes[0]) ---
    results = buscar_em_pool(squad, sobrenome, primeiro) if squad else []

    # --- Tentativa 2: nomes invertidos (para nomes arabe/persa no formato FIRSTNAME LASTNAME) ---
    if (not results or results[0][0] < 7) and primeiro:
        results2 = buscar_em_pool(squad, primeiro, sobrenome)
        if results2 and (not results or results2[0][0] > results[0][0]):
            results = results2

    # --- Tentativa 3: busca global (para jogadores em clubes) ---
    if not results or results[0][0] < 7:
        results3 = buscar_global_by_name(sobrenome, primeiro)
        if results3 and (not results or results3[0][0] > results[0][0]):
            results = results3
        # Tambem tenta invertido na busca global
        if primeiro:
            results4 = buscar_global_by_name(primeiro, sobrenome)
            if results4 and (not results or results4[0][0] > results[0][0]):
                results = results4

    pid, match_type = pick_best(results)

    if pid and pid not in used_pids:
        j["playerid"] = pid
        j["_match"] = match_type
        used_pids.add(pid)
        atualizados += 1
        # Remove from squad_remaining
        sr = squad_remaining.get(pais_n, [])
        squad_remaining[pais_n] = [p for p in sr if p["pid"] != pid]
        if "ambig" in match_type:
            ambiguos_list.append((nc, j["pais"], match_type,
                                  [(r[1], r[2].get("lastname",""), r[2].get("firstname",""), r[2].get("commonname",""))
                                   for r in results[:5]]))
    elif pid and pid in used_pids:
        # pid ja em uso - atribuir proximo disponivel
        falhas.append((nc, j["pais"], f"pid_duplicado_{pid}", []))
    else:
        falhas.append((nc, j["pais"], match_type,
                       [(r[1], r[2].get("lastname",""), r[2].get("firstname",""), r[2].get("commonname",""))
                        for r in results[:3]]))

# --- Fase 4: Atribuicao posicional para paises com squads ficcionais ---
# Para jogadores sem ID de paises ficcionais, atribui proximo jogador disponivel do squad (por posicao)
POS_FC26 = {
    "GK": ["GK"],
    "DF": ["CB", "LB", "RB", "LWB", "RWB"],
    "MF": ["CDM", "CM", "CAM", "LM", "RM"],
    "FW": ["ST", "LW", "RW", "CF", "SS"],
}
FC26_POS_TO_FIFA = {
    "GK": "GK",
    "CB": "DF", "LB": "DF", "RB": "DF", "LWB": "DF", "RWB": "DF",
    "CDM": "MF", "CM": "MF", "CAM": "MF", "LM": "MF", "RM": "MF",
    "ST": "FW", "LW": "FW", "RW": "FW", "CF": "FW", "SS": "FW",
}

falhas_posicionais = []
for j in data:
    if j.get("playerid"):
        continue
    pais_n = norm(j["pais"])
    if pais_n not in PAISES_FICCIONAIS:
        continue

    pos_fifa = j.get("posicao", "MF")  # GK/DF/MF/FW
    nc = j.get("nome_completo", "")

    remaining = squad_remaining.get(pais_n, [])
    if not remaining:
        falhas_posicionais.append((nc, j["pais"], "squad_esgotado"))
        continue

    # Tenta achar jogador na posicao correta
    fc26_positions = POS_FC26.get(pos_fifa, [])
    matched = None
    for p in remaining:
        if p.get("position", "") in fc26_positions:
            matched = p
            break
    # Se nao achou posicao exata, pega qualquer um
    if not matched:
        matched = remaining[0]

    j["playerid"] = matched["pid"]
    j["_match"] = f"posicional_{pos_fifa}_{matched['position']}"
    used_pids.add(matched["pid"])
    squad_remaining[pais_n] = [p for p in remaining if p["pid"] != matched["pid"]]
    posicionais += 1

# Contagem final
total_sem = sum(1 for j in data if not j.get("playerid"))
total_com = sum(1 for j in data if j.get("playerid"))
remaining_falhas = [j for j in data if not j.get("playerid")]

print(f"\n=== RESULTADO FINAL ===")
print(f"  Atualizados por nome: {atualizados}")
print(f"  Atribuidos por posicao (ficcionais): {posicionais}")
print(f"  Ambiguos aceitos: {len(ambiguos_list)}")
print(f"  Falhas restantes: {len(remaining_falhas)}")
print(f"  Total COM ID: {total_com}/{len(data)} ({total_com*100//len(data)}%)")
print(f"  Total SEM ID: {total_sem}")

# Salvar
with open(SCRIPT_DIR / "jogadores_final.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print("\nSalvo: jogadores_final.json")

if ambiguos_list:
    print(f"\n=== AMBIGUOS ({len(ambiguos_list)}) - verificar ===")
    for nome, pais, mt, cands in ambiguos_list[:20]:
        print(f"  {nome} ({pais}) [{mt}]")
        for c in cands[:2]:
            print(f"    pid={c[0]} sn={c[1]!r} fn={c[2]!r} cn={c[3]!r}")

if remaining_falhas:
    print(f"\n=== AINDA SEM ID ({len(remaining_falhas)}) ===")
    for j in remaining_falhas:
        print(f"  {j['nome_completo']} ({j['pais']}) [{j.get('_match','?')}]")
elif falhas:
    print(f"\n=== FALHAS RESOLVIDAS POR POSICAO ({posicionais}) ===")
    for j in data:
        if "posicional" in j.get("_match",""):
            pass  # silencioso OK
