#!/usr/bin/env python3
"""
Valida todos os playerids da database conferindo
nacionalidade + posicao + nome completo no FC26.
"""
import json, sys
from pathlib import Path

ORIG_DIR = Path(r"C:\Users\guilh\OneDrive\Documentos\draft-copa-do-mundo-2026\Arquivos Originais")
SCRIPT_DIR = Path(__file__).parent

def ler_utf16(path):
    with open(path, "r", encoding="utf-16-le", errors="replace") as f:
        return f.read().splitlines(keepends=True)
def tsv(linha):
    return linha.rstrip("\r\n").split("\t")

# Carregar FC26
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

fc26_db = {}  # pid -> {nome, nat, role}
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
    if not nome and ln and ln in nid_to_name:
        primeiro = nid_to_name.get(fn, "") if fn else ""
        ultimo = nid_to_name[ln]
        nome = f"{primeiro} {ultimo}" if primeiro else ultimo

    fc26_db[pid] = {"nome": nome, "nat": nat, "role": role}

# Mapa: pais_pt -> nationid esperado
team_lines = ler_utf16(ORIG_DIR / "teams.txt")
tn_lines = ler_utf16(ORIG_DIR / "teamnationlinks.txt")
tn_hdr = tsv(tn_lines[0])
tn_tid = next(i for i,c in enumerate(tn_hdr) if c.strip().lower()=="teamid")
tn_nid = next(i for i,c in enumerate(tn_hdr) if c.strip().lower()=="nationid")

team_to_nation = {}
for line in tn_lines[1:]:
    p = tsv(line)
    if len(p) > max(tn_tid, tn_nid):
        team_to_nation[p[tn_tid].strip()] = int(p[tn_nid].strip())

t_hdr = tsv(team_lines[0])
t_name = next(i for i,c in enumerate(t_hdr) if c.strip().lower()=="teamname")
t_id = next(i for i,c in enumerate(t_hdr) if c.strip().lower()=="teamid")

team_name_to_nation = {}
for line in team_lines[1:]:
    p = tsv(line)
    if len(p) > max(t_name, t_id) and p[t_id].strip().isdigit():
        tid = p[t_id].strip()
        if tid in team_to_nation:
            team_name_to_nation[p[t_name].strip().lower()] = team_to_nation[tid]

# Carregar database
with open(SCRIPT_DIR / "jogadores_final.json", "r", encoding="utf-8") as f:
    data = json.load(f)

# Mapa paises
PAIS_PT_EN = {
    "alemanha":"germany","argentina":"argentina","argélia":"algeria",
    "arábia saudita":"saudi arabia","austrália":"australia","áustria":"austria",
    "bélgica":"belgium","bósnia e herzegovina":"bosnia & herzegovina",
    "brasil":"brazil","cabo verde":"cape verde","canadá":"canada",
    "catar":"qatar","colômbia":"colombia","coreia do sul":"korea republic",
    "costa do marfim":"ivory coast","croácia":"croatia","curaçao":"curacao",
    "egito":"egypt","equador":"ecuador","escócia":"scotland",
    "espanha":"spain","estados unidos":"usa","frança":"france",
    "gana":"ghana","haiti":"haiti","holanda":"netherlands",
    "inglaterra":"england","irã":"iran","iraque":"iraq",
    "japão":"japan","jordânia":"jordan","marrocos":"morocco",
    "méxico":"mexico","noruega":"norway","nova zelândia":"new zealand",
    "panamá":"panama","paraguai":"paraguay","portugal":"portugal",
    "rd congo":"dr congo","república tcheca":"czech republic",
    "senegal":"senegal","suécia":"sweden","suíça":"switzerland",
    "tunísia":"tunisia","turquia":"turkey","uruguai":"uruguay",
    "uzbequistão":"uzbekistan","áfrica do sul":"south africa",
}

pos_role = {"GK":range(100,200),"DF":range(0,60),"MF":range(60,100),"FW":range(0,25)}

print("Validando IDs...")
invalidos = []
corrigidos = 0

for j in data:
    pid = j.get("playerid")
    if not pid:
        continue

    info = fc26_db.get(pid)
    if not info:
        j["_match"] = "ID_invalido"
        invalidos.append(j)
        continue

    # Validar nacionalidade
    pais_key = j["pais"].lower().strip()
    pais_en = PAIS_PT_EN.get(pais_key, pais_key)
    nat_esperada = team_name_to_nation.get(pais_en)

    if nat_esperada and info["nat"] != nat_esperada:
        j["_match"] = f"nat_errada(esperada={nat_esperada},real={info['nat']})"
        invalidos.append(j)
        continue

    # Validar posicao
    role_range = pos_role.get(j["posicao"], range(0,999))
    if info["role"] not in role_range:
        j["_match"] = f"pos_errada(role={info['role']})"
        invalidos.append(j)
        continue

    j["_match"] = "validado"

print(f"\nValidos: {len(data) - len(invalidos)}/{len(data)}")
print(f"Invalidos: {len(invalidos)}")

if invalidos:
    print(f"\nPrimeiros 20 invalidos:")
    for j in invalidos[:20]:
        info = fc26_db.get(j["playerid"], {})
        print(f'  {j["abrev"]:25s} ({j["posicao"]:2s}, {j["pais"]:20s}) pid={j["playerid"]} -> {info.get("nome","?")[:30]:30s} [{j["_match"]}]')

with open(SCRIPT_DIR / "jogadores_final.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print("\nSalvo!")