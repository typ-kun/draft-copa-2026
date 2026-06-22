#!/usr/bin/env python3
"""
Corrige playerids duplicados e aplica mapeamentos exatos para squads ficcionais.

Fase 1: Aplica mapeamentos exatos fornecidos (Iran, Jordan, Uzbekistan, Qatar, ...)
         Cada entrada: "Player Name (pid)" sera matched por nome normalizado ao FIFA player.
Fase 2: Para duplicados restantes em paises nao-ficcionais:
         Limpa o fraco, re-busca no squad disponivel.
"""
import json, unicodedata, sys, io, re
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
# MAPEAMENTOS EXATOS: nome_fornecido_pelo_usuario -> pid
# O matching com FIFA players usa comparacao de palavras (order-independent)
# ============================================================
EXACT_MAPS = {
    "ira": [
        ("Nikan Bamdadnejad", "84164"),
        ("Amin Farangis", "84165"),
        ("Shahryar Nikdel", "84167"),
        ("Pourang Shakaramy", "84168"),
        ("Omid Rastafan", "84169"),
        ("Bozorgmehr Hajian", "84170"),
        ("Arash Rostamfar", "84171"),
        ("Jahangir Peerfalak", "84172"),
        ("Peyman Sorrenga", "84173"),
        ("Arsalan Anushfar", "84174"),
        ("Puya Ganjineh", "84175"),
        ("Iliyan Babar", "84176"),
        ("Navmehran Aref", "84177"),
        ("Mousa Rayanejad", "84178"),
        ("Ashkan Nasserpoor", "84179"),
        ("Farhad Scayan", "84180"),
        ("Samsam Mantra", "84181"),
        ("Aryan Toranj", "84182"),
        ("Alireza Sinapour", "84183"),
        ("Dariush Mehrdad", "84184"),
        ("Samsam Bahador", "84185"),
        ("Tiam Farzanian", "84186"),
        ("Sepehr Delavar", "84187"),
        ("Gurgen Shahab", "84189"),
        ("Kianoush Shadi", "84190"),
        ("Nader Affkari", "84197"),
    ],
    "jordania": [
        ("Ghassan Al Muqaddam", "85479"),
        ("Tariq Ibn Fayhan", "85480"),
        ("Rafiq Al Sarhan", "85481"),
        ("Mustafa Al Rawabiah", "85482"),
        ("Naseem Rousani", "85483"),
        ("Talal Al Awazim", "85484"),
        ("Rami Tayibeen", "85485"),
        ("Nawaf Maarouf", "85486"),
        ("Qais Bannoura", "85487"),
        ("Munther Abu Diab", "85488"),
        ("Kareem Baramki", "85489"),
        ("Saif Darwaza", "85490"),
        ("Nadim Maari", "85491"),
        ("Fares Al Tamriziq", "85492"),
        ("Ghassan Nuseibeh", "85493"),
        ("Laith Wakid", "85494"),
        ("Jassim Zaghlool", "85495"),
        ("Talal Mohasseb", "85496"),
        ("Odeh Sakka", "85497"),
        ("Khalil Dewidar", "85498"),
        ("Ammer Al Sharkawi", "85499"),
        ("Marei Al Shorafa", "85500"),
        ("Muat Al Shuraymiz", "85501"),
        ("Yasin Badarini", "85502"),
        ("Mahmoud Awazimi", "85503"),
        ("Zain Mohtasebi", "85504"),
    ],
    "uzbequistao": [
        ("Jakhongir Urozov", "72737"),
        ("Abbosbek Fayzullaev", "80304"),
        ("Utkir Yusupov", "81921"),
        ("Odilzhon Khamrobekov", "81922"),
        ("Khojiakbar Alijonov", "81924"),
        ("Sherzod Nasrullaev", "81925"),
        ("Farrukh Sayfiev", "81926"),
        ("Umar Eshmurodov", "81927"),
        ("Abdulla Abdullaev", "81928"),
        ("Akmal Mozgovoy", "81930"),
        ("Azizbek Amanov", "81933"),
        ("Aziz Ganiev", "81938"),
        ("Botirali Ergashev", "81952"),
        ("Abduvokhid Nematov", "81953"),
        ("Sherzod Esanov", "86239"),
        ("Bekhruz Karimov", "86240"),
        ("Ayazbek Ulmasaliev", "86241"),
        ("Jamshid Iskanderov", "220375"),
        ("Igor Sergeev", "220376"),
        ("Eldor Shomurodov", "239964"),
        ("Dostonbek Khamdamov", "242970"),
        ("Rustamzhon Ashurmatov", "247468"),
        ("Oston Urunov", "257858"),
        ("Jaloliddin Masharipov", "262595"),
        ("Otabek Shukurov", "271294"),
        ("Abdukodir Khusanov", "277031"),
    ],
    "catar": [
        ("Ahmed Al Ganehi", "74236"),
        ("Al Hashmi Hussein", "76232"),
        ("Mohamed Al Marri", "80131"),
        ("Ayoub Al Oui", "81834"),
        ("Tahsin Mohammed", "81956"),
        ("Issa Laye", "84621"),
        ("Hassan Al Haydos", "180561"),
        ("Lucas Mendes", "203244"),
        ("Abdulaziz Hatim", "215911"),
        ("Edmilson Junior", "228352"),
        ("Akram Afif", "234051"),
        ("Assim Madibo", "239878"),
        ("Boualem Khoukhi", "268771"),
        ("Almoez Ali", "268772"),
        ("Homam Al Amin", "268776"),
        ("Karim Boudiaf", "268778"),
        ("Ahmed Alaaeldin", "268779"),
        ("Mohammed Muntari", "268780"),
        ("Pedro Miguel", "268781"),
        ("Meshaal Barsham", "268783"),
        ("Yusuf Abdurisag", "268877"),
        ("Ahmed Fathi", "268879"),
        ("Mahmoud Abunada", "268979"),
        ("Jassem Gaber", "268982"),
        ("Sultan Al Brake", "268985"),
        ("Salah Zakaria", "272472"),
    ],
}

# ============================================================
# Carregar jogadores_final.json
# ============================================================
print("Carregando jogadores_final.json...")
with open(SCRIPT_DIR / "jogadores_final.json", encoding="utf-8") as f:
    data = json.load(f)

print(f"Total: {len(data)} jogadores")

# ============================================================
# FASE 1: Aplicar mapeamentos exatos
# Match: comparacao de palavras normalized (order-independent)
# ============================================================
print("\n=== FASE 1: Mapeamentos exatos (squads ficcionais) ===")

def match_words(name_ref, nome_completo):
    """True se as palavras do nome_ref estao todas presentes em nome_completo (normalizado)."""
    ref_words = words(name_ref)
    fifa_words = words(nome_completo)
    if not ref_words: return False
    # Todos os tokens do nome de referencia devem estar presentes
    return ref_words.issubset(fifa_words)

def match_score(name_ref, nome_completo):
    """Quantidade de palavras em comum."""
    ref_words = words(name_ref)
    fifa_words = words(nome_completo)
    common = ref_words & fifa_words
    # score = common / max(len(ref_words), 1) para recompensar matches completos
    return len(common) / max(len(ref_words), 1)

exact_aplicados = 0
exact_falhas = []

for pais_key, mapa in EXACT_MAPS.items():
    # Jogadores desse pais no data
    pais_players = [j for j in data if norm(j["pais"]) == pais_key]
    print(f"\n  {pais_key}: {len(mapa)} mapeamentos | {len(pais_players)} jogadores no data")

    matched_in_data = set()  # indices em data ja atribuidos nesta fase

    for ref_name, ref_pid in mapa:
        # Encontrar o melhor match entre os jogadores do pais
        best_score = 0
        best_idx = None
        best_nome = None

        for idx, j in enumerate(data):
            if norm(j["pais"]) != pais_key: continue
            if idx in matched_in_data: continue

            nc = j.get("nome_completo", "")
            s = match_score(ref_name, nc)
            if s > best_score:
                best_score = s
                best_idx = idx
                best_nome = nc

        if best_idx is not None and best_score >= 0.5:
            old_pid = data[best_idx].get("playerid")
            data[best_idx]["playerid"] = ref_pid
            data[best_idx]["_match"] = "exact_map"
            matched_in_data.add(best_idx)
            exact_aplicados += 1
            if old_pid != ref_pid:
                print(f"    [{ref_name}] -> [{best_nome}] pid={ref_pid} (era {old_pid})")
        else:
            exact_falhas.append((pais_key, ref_name, ref_pid, best_score, best_nome))
            print(f"    FALHA [{ref_name}]: melhor={best_nome!r} score={best_score:.2f}")

print(f"\nFase 1: {exact_aplicados} mapeamentos aplicados, {len(exact_falhas)} falhas")

# ============================================================
# Carregar squad data para Fase 2
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
print("\nCarregando players.txt...")
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
    jn = nid_to_name.get(int(p[2]) if len(p)>2 and p[2].strip().isdigit() else 0, "")
    cn = nid_to_name.get(int(p[3]) if len(p)>3 and p[3].strip().isdigit() else 0, "")
    all_players[pid] = {"pid": pid, "firstname": fn, "lastname": ln,
                        "commonname": cn, "jerseyname": jn}

by_sn = defaultdict(list)
by_cn = defaultdict(list)
for info in all_players.values():
    for key in [norm(info["lastname"]), norm(info["jerseyname"])]:
        if key and len(key) >= 3:
            by_sn[key].append(info)
    if norm(info["commonname"]) and len(norm(info["commonname"])) >= 3:
        by_cn[norm(info["commonname"])].append(info)

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
        elif fn and any(pt in fn for pt in fn_q.split() if len(pt) > 2): score += 2
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
# FASE 2: Corrigir duplicados em paises nao-mapeados exatamente
# ============================================================
print("\n=== FASE 2: Corrigir duplicados por squad ===")

# Paises que ja receberam mapeamento exato - nao re-processar
PAISES_EXACT = set(EXACT_MAPS.keys())

# Identificar duplicados (excluindo paises com mapeamento exato)
pid_to_entries = defaultdict(list)
for idx, j in enumerate(data):
    if j.get("playerid") and norm(j["pais"]) not in PAISES_EXACT:
        pid_to_entries[j["playerid"]].append(idx)

dups = {pid: idxs for pid, idxs in pid_to_entries.items() if len(idxs) > 1}
print(f"Duplicados identificados: {len(dups)} pids com {sum(len(v) for v in dups.values())} entradas")

def confianca(j):
    mt = j.get("_match", "")
    if mt == "exact_map": return 30
    if mt == "manual": return 25
    if mt.startswith("ok_"):
        try: return int(mt.split("_")[-1])
        except: return 15
    if mt.startswith("posicional"): return 5
    if "parcial" in mt: return 7
    if "ambig" in mt: return 6
    if mt.startswith("recup_"): return 8
    if "fallback" in mt: return 4
    return 0

# Para cada grupo duplicado: manter o de maior confianca, limpar os demais
idx_limpos = set()
for pid, idxs in dups.items():
    entries = [(confianca(data[i]), i) for i in idxs]
    entries.sort(key=lambda x: -x[0])
    # Manter indice com maior confianca
    for _, idx in entries[1:]:
        idx_limpos.add(idx)

for idx in idx_limpos:
    data[idx]["playerid"] = None
    data[idx]["_match"] = "dup_limpo"

print(f"Entradas limpas para re-busca: {len(idx_limpos)}")

# Re-buscar para os limpos
used_pids = set(j["playerid"] for j in data if j.get("playerid"))

POS_FC26_MAP = {
    "GK": ["GK"], "DF": ["CB","LB","RB","LWB","RWB"],
    "MF": ["CDM","CM","CAM","LM","RM"], "FW": ["ST","LW","RW","CF","SS"]
}

squad_remaining = {}
for pais, squad in pais_squad.items():
    squad_remaining[pais] = [p for p in squad if p["pid"] not in used_pids]

recuperados = 0
posicionais = 0
ainda_sem = []

for idx in sorted(idx_limpos):
    j = data[idx]
    pais_n = norm(j["pais"])
    nc = j.get("nome_completo","").strip()
    partes = nc.split()
    sn = partes[0] if partes else ""
    fn = " ".join(partes[1:]) if len(partes) >= 2 else ""

    if not sn:
        ainda_sem.append(j)
        continue

    available = [p for p in pais_squad.get(pais_n,[]) if p["pid"] not in used_pids]

    # Busca no squad (normal + invertido)
    results = buscar(sn, fn, available) if available else []
    if fn and (not results or results[0][0] < 7):
        r2 = buscar(fn, sn, available)
        if r2 and (not results or r2[0][0] > results[0][0]):
            results = r2

    # Fallback global
    if not results or results[0][0] < 7:
        r3 = [r for r in buscar_global(sn, fn) if r[1] not in used_pids]
        if r3 and (not results or r3[0][0] > results[0][0]):
            results = r3
        if fn:
            r4 = [r for r in buscar_global(fn, sn) if r[1] not in used_pids]
            if r4 and (not results or r4[0][0] > results[0][0]):
                results = r4

    if results and results[0][0] >= 7:
        best = results[0]
        j["playerid"] = best[1]
        j["_match"] = f"recup_{best[0]}"
        used_pids.add(best[1])
        squad_remaining[pais_n] = [p for p in squad_remaining.get(pais_n,[]) if p["pid"] != best[1]]
        recuperados += 1
    else:
        # Posicional
        remaining = [p for p in pais_squad.get(pais_n,[]) if p["pid"] not in used_pids]
        if remaining:
            pos_fifa = j.get("posicao","MF")
            fc26_pos = POS_FC26_MAP.get(pos_fifa,[])
            matched = next((p for p in remaining if p.get("position","") in fc26_pos), remaining[0])
            j["playerid"] = matched["pid"]
            j["_match"] = f"recup_pos_{pos_fifa}"
            used_pids.add(matched["pid"])
            posicionais += 1
        else:
            ainda_sem.append(j)

# ============================================================
# Resultado final
# ============================================================
pid_cnt = defaultdict(int)
for j in data:
    if j.get("playerid"):
        pid_cnt[j["playerid"]] += 1
dup_final = {p: c for p, c in pid_cnt.items() if c > 1}
total_com = sum(1 for j in data if j.get("playerid"))
total_sem = len(data) - total_com

print(f"\n=== RESULTADO FINAL ===")
print(f"  Fase 1 - exact_map aplicados: {exact_aplicados}")
print(f"  Fase 2 - recuperados por nome: {recuperados}")
print(f"  Fase 2 - atribuidos por posicao: {posicionais}")
print(f"  Ainda sem ID: {total_sem}")
print(f"  Total COM ID: {total_com}/{len(data)} ({total_com*100//len(data)}%)")
print(f"  Duplicados remanescentes: {len(dup_final)}")

if dup_final:
    print(f"\n=== DUPLICADOS RESTANTES ({len(dup_final)}) ===")
    for pid, cnt in sorted(dup_final.items(), key=lambda x: -x[1])[:20]:
        players_dup = [j for j in data if j.get("playerid") == pid]
        print(f"  pid={pid} ({cnt}x) [{players_dup[0]['pais']}]: {[p['nome_completo'] for p in players_dup]}")

if ainda_sem:
    print(f"\n=== AINDA SEM ID ({len(ainda_sem)}) ===")
    for j in ainda_sem:
        print(f"  {j['nome_completo']} ({j['pais']}) [{j.get('_match','?')}]")

# Salvar
with open(SCRIPT_DIR / "jogadores_final.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print("\nSalvo: jogadores_final.json")
