#!/usr/bin/env python3
"""
Mapeia playerids do FC26 para todos os jogadores da Copa do Mundo 2026.
Estrategia principal: usar squad da selecao (teamplayerlinks) + matching por nome.
Fallback: busca global por nationality + nome.
"""
import json, unicodedata
from pathlib import Path

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
# Mapa pais PT -> teamid no FC26 (International league 78)
# Fonte: fornecidos explicitamente pelo usuario
# ============================================================
PAIS_TO_TEAMID = {
    "argelia":              "111448",
    "argentina":            "1369",
    "australia":            "1415",
    "austria":              "1322",
    "belgica":              "1325",
    "bosnia e herzegovina": "105013",
    "brasil":               "1370",
    "cabo verde":           "111456",
    "canada":               "111455",
    "colombia":             "111109",
    "rd congo":             "111545",
    "croacia":              "1328",
    "curacao":              "112054",
    "republica tcheca":     "1330",
    "dinamarca":            "1331",
    "equador":              "111465",
    "egito":                "111130",
    "inglaterra":           "1318",
    "finlandia":            "1334",
    "franca":               "1335",
    "alemanha":             "1337",
    "gana":                 "111462",
    "haiti":                "112048",
    "holanda":              "105035",
    "hungria":              "1886",
    "islandia":             "1341",
    "indonesia":            "111510",
    "ira":                  "111115",
    "iraque":               "111512",
    "italia":               "1343",
    "costa do marfim":      "111112",
    "japao":                "1411",
    "jordania":             "111513",
    "coreia do sul":        "974",
    "mexico":               "1386",
    "marrocos":             "111111",
    "nova zelandia":        "111473",
    "irlanda do norte":     "110081",
    "noruega":              "1352",
    "panama":               "111475",
    "paraguai":             "1375",
    "polonia":              "1353",
    "portugal":             "1354",
    "catar":                "111527",
    "romenia":              "1356",
    "arabia saudita":       "111114",
    "escocia":              "1359",
    "senegal":              "1667",
    "africa do sul":        "111099",
    "espanha":              "1362",
    "suecia":               "1363",
    "suica":                "1364",
    "tunisia":              "1391",
    "turquia":              "1365",
    "ucrania":              "1366",
    "estados unidos":       "1387",
    "uruguai":              "1377",
    "uzbequistao":          "111485",
    "pais de gales":        "1367",
    # Extra (caso aparecam na database)
    "chile":                "111109",  # nao na Copa 2026 mas caso exista
    "peru":                 "1375",
}

# ============================================================
# Carregar dados do FC26
# ============================================================
print("Carregando nomes FC26...")
nid_to_name = {}
for line in ler_utf16(SCRIPT_DIR / "idjogadoresfc26.txt"):
    p = tsv(line)
    if len(p) >= 2 and p[1].strip().isdigit():
        nid_to_name[int(p[1].strip())] = p[0].strip()
print(f"  {len(nid_to_name)} nomes")

print("Carregando players.txt...")
players_lines = ler_utf16(ORIG / "players.txt")
cab = tsv(players_lines[0])
col_pid = next(i for i, c in enumerate(cab) if c.strip().lower() == "playerid")
col_nat = next(i for i, c in enumerate(cab) if c.strip().lower() == "nationality")

pid_info = {}
nat_to_pids = {}

for line in players_lines[1:]:
    p = tsv(line)
    if len(p) <= col_pid or not p[col_pid].strip().isdigit():
        continue
    pid = p[col_pid].strip()
    fn_id = int(p[0]) if p[0].strip().isdigit() else 0
    ln_id = int(p[1]) if p[1].strip().isdigit() else 0
    jn_id = int(p[2]) if len(p) > 2 and p[2].strip().isdigit() else 0
    cn_id = int(p[3]) if len(p) > 3 and p[3].strip().isdigit() else 0
    nat = int(p[col_nat]) if p[col_nat].strip().isdigit() else 0

    ln = nid_to_name.get(ln_id, "")
    fn = nid_to_name.get(fn_id, "")
    cn = nid_to_name.get(cn_id, "")
    jn = nid_to_name.get(jn_id, "")

    pid_info[pid] = {
        "sobrenome": norm(ln),
        "primeiro": norm(fn),
        "cn": norm(cn),
        "jn": norm(jn),
        "sobrenome_raw": ln,
        "primeiro_raw": fn,
        "cn_raw": cn,
        "jn_raw": jn,
        "nat": nat,
    }

    if nat not in nat_to_pids:
        nat_to_pids[nat] = []
    nat_to_pids[nat].append(pid)

print(f"  {len(pid_info)} jogadores")

print("Carregando teamplayerlinks.txt...")
tpl_lines = ler_utf16(ORIG / "teamplayerlinks.txt")
tpl_cab = tsv(tpl_lines[0])
col_tpl_team = next(i for i, c in enumerate(tpl_cab) if c.strip().lower() == "teamid")
col_tpl_pid = next(i for i, c in enumerate(tpl_cab) if c.strip().lower() == "playerid")

team_to_pids = {}
for line in tpl_lines[1:]:
    p = tsv(line)
    if len(p) > max(col_tpl_team, col_tpl_pid):
        tid = p[col_tpl_team].strip()
        pid = p[col_tpl_pid].strip()
        if tid.isdigit() and pid.isdigit():
            if tid not in team_to_pids:
                team_to_pids[tid] = []
            team_to_pids[tid].append(pid)

print(f"  {len(team_to_pids)} times com jogadores")

# Pais -> lista de pids (do squad da selecao no FC26)
print("\nConstruindo indices por selecao...")
pais_squad_pids = {}
for pais, teamid in PAIS_TO_TEAMID.items():
    squad = team_to_pids.get(teamid, [])
    pais_squad_pids[pais] = squad
    if squad:
        pass  # ok

# Para paises sem squad (fallback), usar nationality
# teamnationlinks -> teamid -> nationid
tnl_lines = ler_utf16(ORIG / "teamnationlinks.txt")
tid_to_nationid = {}
for line in tnl_lines[1:]:
    p = tsv(line)
    if len(p) >= 3 and p[1].strip().isdigit() and p[2].strip().isdigit():
        tid_to_nationid[p[1].strip()] = int(p[2].strip())

pais_to_nationid = {}
for pais, teamid in PAIS_TO_TEAMID.items():
    if teamid in tid_to_nationid:
        pais_to_nationid[pais] = tid_to_nationid[teamid]

# ============================================================
# Funcao de scoring
# ============================================================
def score_match(info, sn_query, fn_query):
    alvos_sn = [a for a in [info["sobrenome"], info["cn"], info["jn"]] if a]
    score = 0

    if any(sn_query == a for a in alvos_sn):
        score += 10
    elif any(sn_query in a for a in alvos_sn):
        score += 6
    elif sn_query and any(sn_query[:5] in a for a in alvos_sn if len(a) >= 5):
        score += 3

    if score == 0:
        return 0

    if fn_query:
        if fn_query == info["primeiro"]:
            score += 8
        elif info["primeiro"] and (fn_query in info["primeiro"] or info["primeiro"] in fn_query):
            score += 4
        elif any(part in info["primeiro"] for part in fn_query.split() if len(part) > 2):
            score += 2
        if any(fn_query in a for a in [info["cn"], info["jn"]] if a):
            score += 3

    return score


def buscar(sobrenome_query, primeiro_query, pool_pids):
    sn = norm(sobrenome_query)
    fn = norm(primeiro_query) if primeiro_query else ""

    results = []
    for pid in pool_pids:
        if pid not in pid_info:
            continue
        info = pid_info[pid]
        s = score_match(info, sn, fn)
        if s > 0:
            results.append((s, pid, info))

    results.sort(key=lambda x: (-x[0], x[1]))
    return results


def pick_best(results, nc, pais):
    """Escolhe o melhor resultado ou retorna falha."""
    if not results:
        return None, "nao_encontrado", []

    best_score = results[0][0]

    if best_score >= 18:
        return results[0][1], f"ok_{best_score}", []

    if best_score >= 10:
        top = [r for r in results if r[0] == best_score]
        if len(top) == 1:
            return top[0][1], f"ok_{best_score}", []
        return top[0][1], f"ambig_{len(top)}_{best_score}", [(r[1], r[2]["sobrenome_raw"], r[2]["primeiro_raw"], r[2]["cn_raw"]) for r in top[:5]]

    if best_score >= 5:
        top = [r for r in results if r[0] >= 5]
        if len(top) == 1:
            return top[0][1], f"ok_parcial_{best_score}", []
        return None, f"ambig_parcial_{len(top)}", [(r[1], r[2]["sobrenome_raw"], r[2]["primeiro_raw"], r[2]["cn_raw"]) for r in top[:5]]

    return None, f"score_baixo_{best_score}", []


# ============================================================
# Processar jogadores_final.json
# ============================================================
print("Carregando jogadores_final.json...")
with open(SCRIPT_DIR / "jogadores_final.json", "r", encoding="utf-8") as f:
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

    pais_norm = norm(j["pais"])
    nc = j.get("nome_completo", "").strip()
    partes = nc.split()
    sobrenome = partes[0] if partes else ""
    primeiro = " ".join(partes[1:]) if len(partes) >= 2 else ""

    if not sobrenome:
        falhas.append((nc, j["pais"], "sem_nome", []))
        continue

    # --- Tentativa 1: squad da selecao no FC26 ---
    squad_pids = pais_squad_pids.get(pais_norm, [])
    results = buscar(sobrenome, primeiro, squad_pids) if squad_pids else []

    # --- Tentativa 2: nationality (todos os jogadores da nacao) ---
    if not results or results[0][0] < 10:
        nat_id = pais_to_nationid.get(pais_norm)
        if nat_id:
            nat_pool = nat_to_pids.get(nat_id, [])
            results2 = buscar(sobrenome, primeiro, nat_pool)
            if results2 and (not results or results2[0][0] > results[0][0]):
                results = results2

    # --- Tentativa 3: busca global por sobrenome (para nomes unicos) ---
    if not results or results[0][0] < 5:
        # Busca entre TODOS os jogadores por sobrenome/cn exato
        global_pool = []
        sn_norm = norm(sobrenome)
        fn_norm = norm(primeiro)
        for pid, info in pid_info.items():
            if (info["sobrenome"] == sn_norm or info["cn"] == sn_norm or
                    info["jn"] == sn_norm or
                    (sn_norm and len(sn_norm) >= 4 and (sn_norm in info["cn"] or sn_norm in info["sobrenome"]))):
                global_pool.append(pid)
        results3 = buscar(sobrenome, primeiro, global_pool)
        if results3 and (not results or results3[0][0] > results[0][0]):
            results = results3

    pid_found, match_type, cands = pick_best(results, nc, j["pais"])

    if pid_found:
        j["playerid"] = pid_found
        j["_match"] = match_type
        atualizados += 1
        if "ambig" in match_type:
            ambiguos_list.append((nc, j["pais"], match_type, cands))
    else:
        falhas.append((nc, j["pais"], match_type, cands))

total_sem = sum(1 for j in data if not j.get("playerid"))
total_com = sum(1 for j in data if j.get("playerid"))

print(f"\n=== RESULTADO ===")
print(f"  Atualizados nesta rodada: {atualizados}")
print(f"  Ambiguos aceitos (revisar): {len(ambiguos_list)}")
print(f"  Falhas restantes: {len(falhas)}")
print(f"  Total com ID: {total_com}/{len(data)}")
print(f"  Total sem ID: {total_sem}")

# Salvar
with open(SCRIPT_DIR / "jogadores_final.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print("\nSalvo: jogadores_final.json")

if ambiguos_list:
    print(f"\n=== AMBIGUOS (aceitos, revisar) ===")
    for nome, pais, mt, cands in ambiguos_list[:30]:
        print(f"  {nome} ({pais}) [{mt}]")
        for c in cands[:3]:
            print(f"    pid={c[0]} sn={c[1]!r} fn={c[2]!r} cn={c[3]!r}")

if falhas:
    print(f"\n=== FALHAS ({len(falhas)}) ===")
    for nome, pais, motivo, cands in falhas:
        print(f"  [{motivo}] {nome} ({pais})")
        for c in cands[:2]:
            print(f"    pid={c[0]} sn={c[1]!r} fn={c[2]!r} cn={c[3]!r}")
