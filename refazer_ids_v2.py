#!/usr/bin/env python3
"""
Refaz IDs usando estrategia: filtrar por pais -> posicao -> nome.
Muito mais preciso que matching por sobrenome.
"""
import json
from pathlib import Path

ORIG_DIR = Path(r"C:\Users\guilh\OneDrive\Documentos\draft-copa-do-mundo-2026\Arquivos Originais")
SCRIPT_DIR = Path(__file__).parent

def ler_utf16(path):
    with open(path, "r", encoding="utf-16-le", errors="replace") as f:
        return f.read().splitlines(keepends=True)
def tsv(linha):
    return linha.rstrip("\r\n").split("\t")

# 1. Carregar indices
print("Carregando FC26...")
nid_to_name = {}
for line in ler_utf16(SCRIPT_DIR / "idjogadoresfc26.txt"):
    p = tsv(line)
    if len(p) >= 3 and p[1].strip().isdigit():
        nid_to_name[int(p[1].strip())] = p[0].strip()

players = ler_utf16(ORIG_DIR / "players.txt")
cab = tsv(players[0])
col_pid = next(i for i,c in enumerate(cab) if c.strip().lower()=="playerid")
col_nat = next(i for i,c in enumerate(cab) if c.strip().lower()=="nationality")

# Indice: nat_id -> [(pid, role, nome_completo)]
nat_idx = {}  # {nationid: [(pid, role, nome_completo)]}

for line in players[1:]:
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

    nome = nid_to_name.get(cn or jn or ln, "")
    if not nome and ln in nid_to_name:
        primeiro = nid_to_name.get(fn, "")
        ultimo = nid_to_name[ln]
        nome = f"{primeiro} {ultimo}" if primeiro else ultimo

    if nat not in nat_idx:
        nat_idx[nat] = []
    nat_idx[nat].append((pid, role, nome))

print(f"Indexados {sum(len(v) for v in nat_idx.values())} jogadores de {len(nat_idx)} nacoes")

# 2. Mapa: pais -> nationid
pais_to_nid = {}
for line in ler_utf16(ORIG_DIR / "teams.txt"):
    p = tsv(line)
    if p[0].strip() == "assetid": continue
    if len(p) > 76 and p[76].strip().isdigit():
        nome_time = p[20].strip()
        tid = p[76].strip()
        for tn in ler_utf16(ORIG_DIR / "teamnationlinks.txt"):
            tp = tsv(tn)
            if len(tp) >= 3 and tp[1].strip() == tid:
                pais_to_nid[nome_time.lower()] = int(tp[2].strip())
                break

PAIS_PT_EN = {
    "alemanha":"Germany","argentina":"Argentina","argélia":"Algeria",
    "arábia saudita":"Saudi Arabia","áustria":"Austria","austrália":"Australia",
    "bélgica":"Belgium","bósnia e herzegovina":"Bosnia & Herzegovina",
    "brasil":"Brazil","cabo verde":"Cape Verde","canadá":"Canada","catar":"Qatar",
    "colômbia":"Colombia","coreia do sul":"Korea Republic",
    "costa do marfim":"Ivory Coast","croácia":"Croatia","curaçao":"Curacao",
    "egito":"Egypt","equador":"Ecuador","escócia":"Scotland","espanha":"Spain",
    "estados unidos":"USA","frança":"France","gana":"Ghana","haiti":"Haiti",
    "holanda":"Netherlands","inglaterra":"England","irã":"Iran","iraque":"Iraq",
    "japão":"Japan","jordânia":"Jordan","marrocos":"Morocco","méxico":"Mexico",
    "noruega":"Norway","nova zelândia":"New Zealand","panamá":"Panama",
    "paraguai":"Paraguay","portugal":"Portugal","rd congo":"DR Congo",
    "república tcheca":"Czech Republic","senegal":"Senegal","suécia":"Sweden",
    "suíça":"Switzerland","tunísia":"Tunisia","turquia":"Turkey","uruguai":"Uruguay",
    "uzbequistão":"Uzbekistan","áfrica do sul":"South Africa",
}


# 3. Carregar database
with open(SCRIPT_DIR / "jogadores_final.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# Extrair sobrenome e primeiro nome
for j in data:
    nc = j.get("nome_completo", "")
    partes = nc.split()
    if len(partes) >= 2:
        j["_sobrenome"] = partes[0].lower()
        j["_primeiro"] = " ".join(partes[1:]).lower()
    else:
        j["_sobrenome"] = (partes[0] if partes else j.get("abrev","")).lower()
        j["_primeiro"] = ""

print(f"Buscando IDs para {len(data)} jogadores...")

buscar = 0
stats = {"ok":0, "falha_total":0}

for j in data:
    # Achar nationid
    pais_pt = j["pais"].lower().strip()
    pais_en = PAIS_PT_EN.get(pais_pt, pais_pt)
    nat_id = pais_to_nid.get(pais_en.lower())
    if not nat_id:
        j["playerid"] = None
        j["_match"] = f"pais_desconhecido"
        stats["falha_total"] += 1
        continue

    # Filtrar por NACIONALIDADE
    candidates = nat_idx.get(nat_id, [])
    if not candidates:
        j["playerid"] = None
        j["_match"] = f"sem_jogadores_nacao"
        stats["falha_total"] += 1
        continue

    # Filtrar por NOME (sobrenome aparece no nome)
    candidates = list(candidates)
    sn = j["_sobrenome"].lower()
    primeiro = j["_primeiro"].lower()

    byname = [(p, r, n) for (p, r, n) in candidates if n and (sn in n.lower() or (n.lower().split() and sn == n.lower().split()[-1]))]

    if len(byname) == 1:
        j["playerid"] = byname[0][0]
        j["_match"] = "ok"
        stats["ok"] += 1
        continue

    # Se mais de 1, tentar com o primeiro nome tambem
    if len(byname) > 1 and primeiro:
        byfull = []
        for p, r, n in byname:
            nl = n.lower()
            # Ver se alguma parte do primeiro nome aparece no nome FC26
            if any(palavra in nl for palavra in primeiro.split() if len(palavra) > 2):
                byfull.append((p, r, n))
        if len(byfull) == 1:
            j["playerid"] = byfull[0][0]
            j["_match"] = "ok_nome_comp"
            stats["ok"] += 1
            continue

    # Se ainda > 1 ou 0, tentar parcial
    if len(byname) > 1:
        # Pegar o que tem o nome mais curto (provavelmente o correto)
        byname.sort(key=lambda x: len(x[2]))
        j["playerid"] = byname[0][0]
        j["_match"] = f"ambiguo_{len(byname)}"
        stats["ok"] += 1
        continue

    # Se 0 por nome exato, tentar parcial
    if not byname:
        bypartial = [(p, r, n) for (p, r, n) in candidates if sn[:4] in n.lower()]
        if len(bypartial) == 1:
            j["playerid"] = bypartial[0][0]
            j["_match"] = "ok_parcial"
            stats["ok"] += 1
            continue
        elif len(candidates) == 1:
            j["playerid"] = candidates[0][0]
            j["_match"] = "ok_so_pos"
            stats["ok"] += 1
            continue

    j["playerid"] = None
    j["_match"] = f"nao_encontrado"
    stats["falha_total"] += 1

print(f"\nResultado:")
for k,v in sorted(stats.items(), key=lambda x:-x[1]):
    print(f"  {k}: {v} ({v*100//len(data)}%)")

# Salvar
with open(SCRIPT_DIR / "jogadores_final.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

# Mostrar alguns erros
erros = [j for j in data if not j.get("playerid")]
if erros:
    print(f"\nErros ({len(erros)}):")
    for j in erros[:10]:
        print(f'  {j["abrev"]:25s} ({j["posicao"]:2s}, {j["pais"]}) - {j["_match"]}')

print("\nSalvo!")