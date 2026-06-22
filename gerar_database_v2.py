#!/usr/bin/env python3
"""
Gera database a partir da lista oficial de convocados da FIFA.
Usa a Lista-Jogadores-Convocados-Copa-do-Mundo-2026.txt como verdade absoluta.
"""

import json, re
from pathlib import Path

ORIG_DIR = Path(r"C:\Users\guilh\Downloads\Mod\Arquivos Originais")
SCRIPT_DIR = Path(__file__).parent
SQUAD_FILE = SCRIPT_DIR / "Lista-Jogadores-Convocados-Copa-do-Mundo-2026.txt"
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

# ─── Traducao paises (PT -> EN) ─────────────────────────────────────────────
PAIS_PT_EN = {
    "áfrica do sul": "South Africa", "alemanha": "Germany",
    "argélia": "Algeria", "arábia saudita": "Saudi Arabia",
    "argentina": "Argentina", "áustria": "Austria",
    "austrália": "Australia", "bélgica": "Belgium",
    "bósnia e herzegovina": "Bosnia & Herzegovina",
    "brasil": "Brazil", "cabo verde": "Cape Verde",
    "canadá": "Canada", "colômbia": "Colombia",
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
    "catar": "Qatar", "república tcheca": "Czech Republic",
    "rd congo": "DR Congo", "senegal": "Senegal",
    "suécia": "Sweden", "suíça": "Switzerland",
    "tunísia": "Tunisia", "turquia": "Turkey",
    "uruguai": "Uruguay", "uzbequistão": "Uzbekistan",
}

# ─── Manual IDs (confirmados pelo usuario) ──────────────────────────────────
MANUAL = {
    "weverton": "186555", "zima": "255687", "wimmer": "254566",
    "garry rodrigues": "210212", "g. rodrigues": "210212",
    "alex freeman": "267920", "a. freeman": "267920",
    "piero hincapie": "256197", "p. hincapie": "256197", "hincapie": "256197",
    "ryan gravenberch": "246104", "r. gravenberch": "246104", "gravenberch": "246104",
    "goncalo inacio": "257179", "g. inacio": "257179", "inacio": "257179",
    "joaquin piquerez": "254623", "j. piquerez": "254623", "piquerez": "254623",
    "joao neves": "272834", "j. neves": "272834",
    "ngolo kante": "215914", "n. kante": "215914", "kante": "215914",
    "alexis mac allister": "239837", "a. mac allister": "239837", "mac allister": "239837",
    "rafael leao": "241721", "r. leao": "241721", "leao": "241721",
    "lucas paqueta": "233927", "l. paqueta": "233927",
    "marc guehi": "241159", "m. guehi": "241159", "guehi": "241159",
    "warren zaire-emery": "270673", "w. zaire-emery": "270673",
    "alexander nubel": "223885", "a. nuebel": "223885", "nuebel": "223885",
    "nikola vlasic": "241095", "n. vlasic": "241095", "vlasic": "241095",
    "yvon mvogo": "206003", "y. mvogo": "206003", "mvogo": "206003",
    "arda guler": "264309", "a. guler": "264309", "guler": "264309",
}

# ─── Carregar indices FC26 ──────────────────────────────────────────────────
print("Carregando indices FC26...")
nid_to_name = {}
for line in ler_utf16(ID_MAP_FILE):
    p = tsv(line)
    if len(p) >= 3 and p[1].strip().isdigit():
        nid_to_name[int(p[1].strip())] = p[0].strip()

name_to_nid = {v.lower(): k for k, v in nid_to_name.items()}

players_txt = ler_utf16(PLAYERS_FILE)
cab = tsv(players_txt[0])
col_pid = next(i for i,c in enumerate(cab) if c.strip().lower() == "playerid")
col_nat = next(i for i,c in enumerate(cab) if c.strip().lower() == "nationality")

# Build: sobrenome -> [(pid, nat, role)]
sobrenome_idx = {}
# nameid -> [pid]
nameid_pids = {}
# pid -> info
pid_info = {}

for line in players_txt[1:]:
    p = tsv(line)
    if len(p) <= col_pid or not p[col_pid].strip().isdigit():
        continue
    pid = p[col_pid].strip()
    fn = int(p[0]) if p[0].strip().isdigit() else 0
    ln = int(p[1]) if p[1].strip().isdigit() else 0
    jn = int(p[2]) if len(p)>2 and p[2].strip().isdigit() else 0
    cn = int(p[3]) if len(p)>3 and p[3].strip().isdigit() else 0
    nat = int(p[col_nat]) if p[col_nat].strip().isdigit() else 0
    role = int(p[9]) if len(p)>9 and p[9].strip().isdigit() else 0

    pid_info[pid] = {"fn":fn,"ln":ln,"jn":jn,"cn":cn,"nat":nat,"role":role}
    for nid in [fn, ln, jn, cn]:
        if nid > 0:
            if nid not in nameid_pids: nameid_pids[nid] = []
            if pid not in nameid_pids[nid]: nameid_pids[nid].append(pid)

    # Indexar pelo sobrenome (lastname)
    if ln > 0 and ln in nid_to_name:
        sn = nid_to_name[ln].lower()
        if sn not in sobrenome_idx: sobrenome_idx[sn] = []
        sobrenome_idx[sn].append((pid, nat, role))
    # Tambem pelo jersey/common name
    if jn > 0 and jn in nid_to_name:
        nome = nid_to_name[jn].lower()
        for palavra in nome.split():
            if len(palavra) > 3:
                if palavra not in sobrenome_idx: sobrenome_idx[palavra] = []
                if not any(p[0]==pid for p in sobrenome_idx[palavra]):
                    sobrenome_idx[palavra].append((pid, nat, role))

# Extra: names from database
for name_str, nid in name_to_nid.items():
    pids = nameid_pids.get(nid, [])
    if pids and name_str not in sobrenome_idx:
        sobrenome_idx[name_str] = [(p, pid_info[p]["nat"], pid_info[p]["role"]) for p in pids]

# Team -> nationid
times = {}
for line in ler_utf16(TEAMS_FILE):
    p = tsv(line)
    if p[0].strip() == "assetid": continue
    if len(p) > 76 and p[76].strip().isdigit():
        times[p[20].strip()] = p[76].strip()

t2n = {}
for line in ler_utf16(TN_FILE):
    p = tsv(line)
    if len(p) >= 3 and p[0].strip().isdigit():
        t2n[p[1].strip()] = int(p[2].strip())

nat_map = {}
for nome, tid in times.items():
    if tid in t2n:
        nat_map[nome.lower()] = t2n[tid]

# ─── Buscar playerid ────────────────────────────────────────────────────────
def buscar_id(sobrenome, pos_fifa, pais_en):
    sn = sobrenome.lower().strip()
    if sn in MANUAL:
        pid = MANUAL[sn]
        return (str(pid), "manual") if pid else (None, "manual_none")

    # Candidatos
    cands = list(sobrenome_idx.get(sn, []))
    if not cands:
        for s, c in sobrenome_idx.items():
            if sn in s or s in sn:
                cands.extend(c)

    if not cands:
        return (None, "sem_candidatos")

    # target nationid
    target = nat_map.get(pais_en.lower()) if pais_en else None

    ranges = {"GK": (100,200), "DF": (0,60), "MF": (60,100), "FW": (0,25)}
    rmin, rmax = ranges.get(pos_fifa, (0, 999))

    # Tenta: nacionalidade + posicao
    if target:
        bynat = [(p,n,r) for (p,n,r) in cands if n == int(target)]
        bynatpos = [(p,n,r) for (p,n,r) in bynat if rmin <= r <= rmax]
        if len(bynatpos) == 1: return (bynatpos[0][0], "nat+pos")
        if len(bynat) == 1: return (bynat[0][0], "só_nat")
        if bynat: cands = bynat

    # So posicao
    bypos = [(p,n,r) for (p,n,r) in cands if rmin <= r <= rmax]
    if len(bypos) == 1: return (bypos[0][0], "só_pos")

    if cands: return (cands[0][0], "primeiro")
    return (None, "nenhum")

# ─── Parse squad list ───────────────────────────────────────────────────────
print("Parsing lista de convocados...")
with open(SQUAD_FILE, "r", encoding="utf-8") as f:
    linhas = f.readlines()

# Mapa: codigo pais (ALG, BRA, etc.) -> nome em portugues
COD_PAIS = {
    "ALG": "Argélia", "ARG": "Argentina", "AUS": "Austrália", "AUT": "Áustria",
    "BEL": "Bélgica", "BIH": "Bósnia e Herzegovina", "BRA": "Brasil",
    "CAN": "Canadá", "CPV": "Cabo Verde", "COL": "Colômbia",
    "CRO": "Croácia", "CUR": "Curaçao", "CZE": "República Tcheca",
    "COD": "RD Congo", "DEN": "Dinamarca", "EGY": "Egito", "ENG": "Inglaterra",
    "EQD": "Equador", "ESP": "Espanha", "FRA": "França", "GER": "Alemanha",
    "GHA": "Gana", "HAI": "Haiti", "IRN": "Irã", "IRQ": "Iraque",
    "ITA": "Itália", "JPN": "Japão", "JOR": "Jordânia", "KOR": "Coreia do Sul",
    "KSA": "Arábia Saudita", "MAR": "Marrocos", "MEX": "México",
    "NED": "Holanda", "NOR": "Noruega", "NZL": "Nova Zelândia",
    "PAN": "Panamá", "PAR": "Paraguai", "POL": "Polônia", "POR": "Portugal",
    "QAT": "Catar", "RSA": "África do Sul", "SCO": "Escócia",
    "SEN": "Senegal", "SUI": "Suíça", "SWE": "Suécia",
    "TUN": "Tunísia", "TUR": "Turquia", "UAE": "Emirados Árabes",
    "UKR": "Ucrânia", "URU": "Uruguai", "USA": "Estados Unidos",
    "UZB": "Uzbequistão",
}

POS_MAP = {"GK":"GK","DF":"DF","MF":"MF","FW":"FW","Goalkeeper":"GK","Defender":"DF","Midfielder":"MF","Forward":"FW"}

database = []
pais_atual = None
pais_codigo = None

# Tambem construir indice dos convocados para validacao
convocados = {}  # (sobrenome_lower, pais_pt) -> info

for linha in linhas:
    linha_strip = linha.strip()

    # Detectar cabecalho de pais: "Algeria (ALG)"
    m = re.match(r'^\s*([A-Za-zÀ-ÿ\s]+)\s\(([A-Z]{3})\)\s*$', linha)
    if m and not linha_strip.startswith("#") and not any(x in linha for x in ["PLAYER","COACH","DOB"]):
        pais_atual = m.group(1).strip()
        pais_codigo = m.group(2)
        continue

    # Pular cabecalho e linhas vazias
    if not linha_strip or linha_strip.startswith("#") or "POS" in linha_strip or "ROLE" in linha_strip or "DOB" in linha_strip:
        continue

    # Linha de jogador: numero, posicao, nome, etc.
    parts = [p for p in linha_strip.split("  ") if p.strip()]
    if len(parts) < 3:
        continue

    # Tentar extrair: numero, posicao, nome
    try:
        num = parts[0].strip()
        pos = parts[1].strip()
        nome_completo_parts = parts[2].strip().split()
        if not nome_completo_parts:
            continue
    except:
        continue

    pos = POS_MAP.get(pos, pos)
    if pos not in ("GK","DF","MF","FW"):
        continue

    # Extrair sobrenome (ultimo nome ou nome da camisa)
    # O formato e: "POS  NOME_COMPLETO" ou "NUM POS NOME_COMPLETO"
    if num.isdigit() and 1 <= int(num) <= 26:
        # Linha tem formato: "14      DF     TOUGAI Mohamed Amine"
        # Nome completo esta depois da posicao
        idx_pos = linha.find(pos)
        if idx_pos >= 0:
            after_pos = linha[idx_pos+len(pos):].strip()
            nome_completo = after_pos.split("  ")[0].strip() if "  " in after_pos else after_pos
        else:
            nome_completo = nome_completo_parts[0]
    else:
        nome_completo = nome_completo_parts[0]

    # Pular linha de tecnico
    if any(x in linha for x in ["Head coach","COACH"]):
        continue

    nome_completo = nome_completo.strip()
    # Pegar ultimo sobrenome (para match com FC26)
    sobrenome = nome_completo.split()[-1] if nome_completo.split() else nome_completo

    # Nome abreviado (formato do draft)
    palavras = nome_completo.split()
    if len(palavras) >= 2:
        abrev = f"{palavras[0][0]}. {sobrenome}"
    else:
        abrev = sobrenome

    # Pais em portugues
    pais_pt = COD_PAIS.get(pais_codigo, pais_atual)
    pais_en = PAIS_PT_EN.get(pais_pt.lower(), pais_pt)

    # Buscar ID
    pid, motivo = buscar_id(sobrenome, pos, pais_en)

    entry = {
        "abrev": abrev,
        "posicao": pos,
        "pais": pais_pt,
        "nome_completo": nome_completo,
        "playerid": pid,
        "_match": motivo
    }
    database.append(entry)

print(f"Total jogadores extraidos: {len(database)}")
found = sum(1 for d in database if d["playerid"])
print(f"Encontrados: {found}/{len(database)}")

# Mostrar nao encontrados
nao = [d for d in database if not d["playerid"]]
if nao:
    print(f"\nNao encontrados ({len(nao)}):")
    for d in nao:
        print(f"  {d['nome_completo']:35s} ({d['posicao']:2s}, {d['pais']}) match={d['_match']}")

# Salvar
output = SCRIPT_DIR / "jogadores_final.json"
with open(output, "w", encoding="utf-8") as f:
    json.dump(database, f, ensure_ascii=False, indent=2)
print(f"\nSalvo em: {output}")
PYEOF