#!/usr/bin/env python3
"""
Refaz todos os IDs usando a lista FIFA como referencia,
buscando no FC26 por nome + nacionalidade + posicao.
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

# Carregar nameid -> name
nid_to_name = {}
for line in ler_utf16(SCRIPT_DIR / "idjogadoresfc26.txt"):
    p = tsv(line)
    if len(p) >= 3 and p[1].strip().isdigit():
        nid_to_name[int(p[1].strip())] = p[0].strip()

# Carregar players.txt
players = ler_utf16(ORIG_DIR / "players.txt")
cab = tsv(players[0])
col_pid = next(i for i,c in enumerate(cab) if c.strip().lower()=="playerid")
col_nat = next(i for i,c in enumerate(cab) if c.strip().lower()=="nationality")

# Indice: para cada jogador no FC26, armazenar info
player_db = {}  # pid -> {first, last, jersey, common, nat, role, fullname}
name_parts_idx = {}  # palavra_lower -> [(pid, nat, role)]

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

    first = nid_to_name.get(fn, "")
    last = nid_to_name.get(ln, "")
    jersey = nid_to_name.get(jn, "") if jn else ""
    common = nid_to_name.get(cn, "") if cn else ""
    full = common or jersey or f"{first} {last}".strip()

    player_db[pid] = {"first":first, "last":last, "jersey":jersey,
                       "common":common, "nat":nat, "role":role, "full":full}

    # Indexar cada palavra do nome
    for nome_comp in [full, jersey, last, first, common]:
        for palavra in nome_comp.split():
            pword = palavra.lower().strip(".,- ")
            if len(pword) > 1:
                if pword not in name_parts_idx:
                    name_parts_idx[pword] = []
                # Evitar duplicatas
                if not any(x[0]==pid for x in name_parts_idx[pword]):
                    name_parts_idx[pword].append((pid, nat, role))

# Mapa de paises
PAIS_PT_EN = {
    "alemanha":"Germany","argentina":"Argentina","argélia":"Algeria",
    "arábia saudita":"Saudi Arabia","áustria":"Austria","austrália":"Australia",
    "bélgica":"Belgium","bósnia e herzegovina":"Bosnia & Herzegovina",
    "brasil":"Brazil","cabo verde":"Cape Verde","canadá":"Canada",
    "catar":"Qatar","colômbia":"Colombia","coreia do sul":"Korea Republic",
    "costa do marfim":"Ivory Coast","croácia":"Croatia","curaçao":"Curacao",
    "egito":"Egypt","equador":"Ecuador","escócia":"Scotland",
    "espanha":"Spain","estados unidos":"USA","frança":"France",
    "gana":"Ghana","haiti":"Haiti","holanda":"Netherlands",
    "inglaterra":"England","irã":"Iran","iraque":"Iraq",
    "japão":"Japan","jordânia":"Jordan","marrocos":"Morocco",
    "méxico":"Mexico","noruega":"Norway","nova zelândia":"New Zealand",
    "panamá":"Panama","paraguai":"Paraguay","portugal":"Portugal",
    "rd congo":"DR Congo","república tcheca":"Czech Republic",
    "senegal":"Senegal","suécia":"Sweden","suíça":"Switzerland",
    "tunísia":"Tunisia","turquia":"Turkey","uruguai":"Uruguay",
    "uzbequistão":"Uzbekistan","áfrica do sul":"South Africa",
}

pos_role = {"GK":range(100,200), "DF":range(0,60), "MF":range(60,100), "FW":range(0,25)}

def buscar_no_fc26(sobrenome, primeiro_nome, pais_pt, posicao):
    """Busca jogador no FC26 usando sobrenome + nacionalidade + posicao."""
    sn = sobrenome.lower().strip(".,- ")
    pa_en = PAIS_PT_EN.get(pais_pt.lower().strip(), pais_pt)

    # Achar nationid
    # (usando teams.txt + teamnationlinks)
    nat_id = None
    for line in ler_utf16(ORIG_DIR / "teams.txt"):
        p = tsv(line)
        if p[0].strip() == "assetid": continue
        if len(p) > 76 and p[20].strip().lower() == pa_en.lower():
            tid = p[76].strip()
            for tn in ler_utf16(ORIG_DIR / "teamnationlinks.txt"):
                tp = tsv(tn)
                if len(tp) >= 3 and tp[1].strip() == tid:
                    nat_id = int(tp[2].strip())
                    break
            break

    role_range = pos_role.get(posicao, range(0,999))

    # 1. Buscar pelo sobrenome exato
    cands = name_parts_idx.get(sn, [])

    # 2. Se nao achou, tentar parcial
    if not cands:
        for pword, pids in name_parts_idx.items():
            if sn in pword or pword in sn:
                cands.extend(pids)

    if not cands:
        return None, "nao_encontrado"

    # 3. Filtrar por nacionalidade + posicao
    if nat_id:
        bynat = [(p,n,r) for (p,n,r) in cands if n == nat_id and r in role_range]
        if len(bynat) == 1:
            return bynat[0][0], "ok"
        bynat2 = [(p,n,r) for (p,n,r) in cands if n == nat_id]
        if len(bynat2) == 1:
            return bynat2[0][0], "ok_só_nat"

    # 4. So por posicao
    bypos = [(p,n,r) for (p,n,r) in cands if r in role_range]
    if len(bypos) == 1:
        return bypos[0][0], "ok_só_pos"

    if cands:
        # Tentar pelo nome completo: inicial + sobrenome
        if primeiro_nome and sn:
            inicial = primeiro_nome[0].lower()
            for pid, nat, role in cands:
                info = player_db.get(pid, {})
                nome_info = (info.get("full","") + " " + info.get("first","") + " " + info.get("last","")).lower()
                if inicial in nome_info and sn in nome_info:
                    if nat_id and nat == nat_id:
                        return pid, "ok_nome_comp"
                    elif role in role_range:
                        return pid, "ok_nome_comp"

        return cands[0][0], f"primeiro"
    return None, "nenhum"

# Processar database
with open(SCRIPT_DIR / "jogadores_final.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# Extra: mapear primeiros nomes dos jogadores
# O formato da lista FIFA: "SOBRENOME PrimeiroNome"
for j in data:
    nome_comp = j.get("nome_completo", "")
    partes = nome_comp.split()
    if len(partes) >= 2:
        j["_sobrenome"] = partes[0]  # Primeiro item = sobrenome na lista FIFA
        j["_primeiro"] = " ".join(partes[1:])  # Resto = primeiro nome
    else:
        j["_sobrenome"] = partes[0] if partes else j.get("abrev", "")
        j["_primeiro"] = ""

print(f"Buscando IDs para {len(data)} jogadores...")
stats = {"ok":0, "ok_só_nat":0, "ok_só_pos":0, "ok_nome_comp":0, "primeiro":0, "falha":0}
for j in data:
    pid, motivo = buscar_no_fc26(j["_sobrenome"], j["_primeiro"], j["pais"], j["posicao"])
    if pid:
        j["playerid"] = pid
        j["_match"] = motivo
        stats[motivo] = stats.get(motivo, 0) + 1
    else:
        j["playerid"] = None
        j["_match"] = motivo
        stats["falha"] += 1

print(f"\nTotal: {len(data)}")
for k,v in sorted(stats.items(), key=lambda x:-x[1]):
    print(f"  {k}: {v}")

with open(SCRIPT_DIR / "jogadores_final.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print("\nSalvo!")