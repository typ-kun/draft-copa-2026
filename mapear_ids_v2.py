#!/usr/bin/env python3
"""
Mapeia playerids do FC26 para todos os jogadores da Copa do Mundo 2026.
Usa All-PlayersID-FC26 (nomes reais por selecao) como fonte primaria.
Fallback: players.txt (busca global por nome).
"""
import json, unicodedata, sys, io
from pathlib import Path

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
# Mapa pais PT -> filename prefix em All-PlayersID-FC26
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
    "chile":                None,
    "peru":                 None,
}

# ============================================================
# Carregar All-PlayersID-FC26 por selecao
# ============================================================
print("Carregando All-PlayersID-FC26...")

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
        if len(parts) < 3: continue
        row = {}
        for i, h in enumerate(header):
            row[h] = parts[i] if i < len(parts) else ""
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

# pais_norm -> list of {pid, firstname, lastname, commonname, position}
pais_squad = {}
for pais, teamfile in PAIS_TO_TEAMFILE.items():
    if teamfile is None:
        pais_squad[pais] = []
        continue
    fpath = ALL_DIR / (teamfile + ".txt")
    if not fpath.exists():
        # try case-insensitive
        found = None
        for f in ALL_DIR.iterdir():
            if norm(f.stem) == norm(teamfile):
                found = f
                break
        fpath = found
    if fpath and fpath.exists():
        pais_squad[pais] = read_team_file(fpath)
    else:
        print(f"  AVISO: arquivo nao encontrado para {pais}: {teamfile}")
        pais_squad[pais] = []

total_squad = sum(len(v) for v in pais_squad.values())
print(f"  {total_squad} jogadores carregados nos squads")

# ============================================================
# Carregar players.txt para busca global (fallback)
# ============================================================
print("Carregando players.txt (fallback global)...")
nid_to_name = {}
for line in ler_utf16(SCRIPT_DIR / "idjogadoresfc26.txt"):
    p = tsv(line)
    if len(p) >= 2 and p[1].strip().isdigit():
        nid_to_name[int(p[1].strip())] = p[0].strip()

players_lines = ler_utf16(ORIG / "players.txt")
cab = tsv(players_lines[0])
col_pid = next(i for i, c in enumerate(cab) if c.strip().lower() == "playerid")

global_by_sn = {}   # norm(lastname) -> [(pid, firstname, lastname, cn)]
global_by_cn = {}   # norm(commonname) -> [(pid, ...)]

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
    info = (pid, fn, ln, cn, jn)

    for key in [norm(ln), norm(jn)]:
        if key and len(key) >= 3:
            if key not in global_by_sn: global_by_sn[key] = []
            global_by_sn[key].append(info)
    for key in [norm(cn)]:
        if key and len(key) >= 3:
            if key not in global_by_cn: global_by_cn[key] = []
            global_by_cn[key].append(info)

print(f"  {len(global_by_sn)} sobrenomes indexados")

# ============================================================
# Funcao de scoring
# ============================================================
def score_squad_match(player, sn_q, fn_q):
    """Score matching against a squad player entry."""
    ln = norm(player["lastname"])
    fn = norm(player["firstname"])
    cn = norm(player["commonname"])
    score = 0

    # Sobrenome ou commonname
    if sn_q == ln or sn_q == cn:
        score += 10
    elif ln and sn_q in ln:
        score += 6
    elif cn and sn_q in cn:
        score += 6
    elif sn_q and (ln.startswith(sn_q[:5]) or cn.startswith(sn_q[:5])):
        score += 4
    else:
        # Partial: last word of ln == sn_q
        ln_parts = ln.split()
        if ln_parts and sn_q == ln_parts[-1]:
            score += 8

    if score == 0:
        return 0

    if fn_q:
        if fn_q == fn:
            score += 8
        elif fn and (fn_q in fn or fn in fn_q):
            score += 4
        elif fn and any(p in fn for p in fn_q.split() if len(p) > 2):
            score += 2
        if fn_q in cn:
            score += 3

    return score


def buscar_em_squad(squad, sn, fn):
    results = []
    for player in squad:
        s = score_squad_match(player, norm(sn), norm(fn) if fn else "")
        if s > 0:
            results.append((s, player["pid"], player))
    results.sort(key=lambda x: (-x[0], x[1]))
    return results


def buscar_global(sn, fn):
    sn_n = norm(sn)
    fn_n = norm(fn) if fn else ""
    cands = set()

    for key in list(global_by_sn.keys()):
        if sn_n == key or (len(sn_n) >= 5 and (sn_n in key or key in sn_n)):
            for info in global_by_sn[key]:
                cands.add(info[0])
    for key in list(global_by_cn.keys()):
        if sn_n == key:
            for info in global_by_cn[key]:
                cands.add(info[0])

    # Score each candidate
    results = []
    for pid in cands:
        # find info
        for infos in global_by_sn.values():
            found = next((i for i in infos if i[0] == pid), None)
            if found:
                _, _fn, _ln, _cn, _jn = found
                fake_player = {"lastname": _ln, "firstname": _fn, "commonname": _cn, "pid": pid}
                s = score_squad_match(fake_player, sn_n, fn_n)
                if s > 0:
                    results.append((s, pid, fake_player))
                break

    results.sort(key=lambda x: (-x[0], x[1]))
    return results


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
        # Try to disambiguate
        return top[0][1], f"ambig_{len(top)}_{best}"
    if best >= 6:
        if len(top) == 1:
            return top[0][1], f"ok_parcial_{best}"
        return None, f"ambig_parcial_{len(top)}"
    return None, f"score_baixo_{best}"


# ============================================================
# Processar
# ============================================================
print("\nCarregando jogadores_final.json...")
with open(SCRIPT_DIR / "jogadores_final.json", encoding="utf-8") as f:
    data = json.load(f)

sem_id_orig = sum(1 for j in data if not j.get("playerid"))
print(f"Jogadores sem ID: {sem_id_orig}")
print("Processando...")

atualizados = 0
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

    # --- Tentativa 1: squad da selecao (All-PlayersID-FC26) ---
    squad = pais_squad.get(pais_n, [])
    results = buscar_em_squad(squad, sobrenome, primeiro) if squad else []

    # --- Tentativa 2: busca global por players.txt ---
    if not results or results[0][0] < 6:
        results2 = buscar_global(sobrenome, primeiro)
        if results2 and (not results or results2[0][0] > results[0][0]):
            results = results2

    pid, match_type = pick_best(results)

    if pid:
        j["playerid"] = pid
        j["_match"] = match_type
        atualizados += 1
        if "ambig" in match_type:
            ambiguos_list.append((nc, j["pais"], match_type,
                                  [(r[1], r[2].get("lastname",""), r[2].get("firstname",""), r[2].get("commonname","")) for r in results[:5]]))
    else:
        falhas.append((nc, j["pais"], match_type,
                       [(r[1], r[2].get("lastname",""), r[2].get("firstname",""), r[2].get("commonname","")) for r in results[:3]]))

total_sem = sum(1 for j in data if not j.get("playerid"))
total_com = sum(1 for j in data if j.get("playerid"))

print(f"\n=== RESULTADO ===")
print(f"  Atualizados nesta rodada: {atualizados}")
print(f"  Ambiguos aceitos: {len(ambiguos_list)}")
print(f"  Falhas restantes: {len(falhas)}")
print(f"  Total com ID: {total_com}/{len(data)}")
print(f"  Total sem ID: {total_sem}")

# Salvar
with open(SCRIPT_DIR / "jogadores_final.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print("\nSalvo: jogadores_final.json")

if ambiguos_list:
    print(f"\n=== AMBIGUOS ({len(ambiguos_list)}) - revisar ===")
    for nome, pais, mt, cands in ambiguos_list:
        print(f"  {nome} ({pais}) [{mt}]")
        for c in cands[:3]:
            print(f"    pid={c[0]} sn={c[1]!r} fn={c[2]!r} cn={c[3]!r}")

if falhas:
    print(f"\n=== FALHAS ({len(falhas)}) ===")
    for nome, pais, motivo, cands in falhas:
        print(f"  [{motivo}] {nome} ({pais})")
        for c in cands[:2]:
            print(f"    pid={c[0]} sn={c[1]!r} fn={c[2]!r} cn={c[3]!r}")
