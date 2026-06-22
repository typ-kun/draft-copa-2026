#!/usr/bin/env python3
"""
Enriquece jogadores_final.json com os playerids do FC26.
Cria jogadores_final_enriched.json com o campo "playerid" adicional.
"""

import json
from pathlib import Path

ORIG_DIR = Path(r"C:\Users\guilh\Downloads\Mod\Arquivos Originais")
SCRIPT_DIR = Path(__file__).parent
ID_MAP_FILE = SCRIPT_DIR / "idjogadoresfc26.txt"
PLAYERS_FILE = ORIG_DIR / "players.txt"

# ─── Utilitarios ────────────────────────────────────────────────────────────

def ler_utf16(path):
    with open(path, "r", encoding="utf-16-le", errors="replace") as f:
        return f.read().splitlines(keepends=True)

def tsv(linha):
    return linha.rstrip("\r\n").split("\t")

# ─── Carregar indices ───────────────────────────────────────────────────────

def carregar_indices():
    """Carrega indices de jogadores do FC26."""
    # nameid -> name
    id_nomes = {}
    id_nome_to_name = {}
    for line in ler_utf16(ID_MAP_FILE):
        p = tsv(line)
        if len(p) >= 3 and p[1].strip().isdigit():
            name = p[0].strip()
            nid = int(p[1].strip())
            id_nomes[name.lower()] = nid
            id_nome_to_name[nid] = name

    # players.txt -> indices
    linhas = ler_utf16(PLAYERS_FILE)
    cab = tsv(linhas[0])

    col_pid = next(i for i, c in enumerate(cab) if c.strip().lower() == "playerid")
    col_nat = next(i for i, c in enumerate(cab) if c.strip().lower() == "nationality")

    name_map = {}        # nome.lower -> playerid
    sobrenome_idx = {}   # sobrenome.lower -> [(pid, nat)]
    nameid_to_pids = {}  # nameid -> [pid]

    for line in linhas[1:]:
        p = tsv(line)
        if len(p) <= col_pid or not p[col_pid].strip().isdigit():
            continue

        pid = p[col_pid].strip()
        fn = int(p[0]) if p[0].strip().isdigit() else 0
        ln = int(p[1]) if p[1].strip().isdigit() else 0
        jn = int(p[2]) if len(p) > 2 and p[2].strip().isdigit() else 0
        cn = int(p[3]) if len(p) > 3 and p[3].strip().isdigit() else 0
        nat = int(p[col_nat]) if p[col_nat].strip().isdigit() else 0

        # Index nameids
        for nid in [fn, ln, jn, cn]:
            if nid > 0:
                if nid not in nameid_to_pids:
                    nameid_to_pids[nid] = []
                if pid not in nameid_to_pids[nid]:
                    nameid_to_pids[nid].append(pid)

        # Build name
        nome = ""
        sobrenome = ""
        if cn > 0 and cn in id_nome_to_name:
            nome = id_nome_to_name[cn]
        elif jn > 0 and jn in id_nome_to_name:
            nome = id_nome_to_name[jn]
        if nome:
            w = nome.split()
            sobrenome = w[-1].lower() if len(w) > 1 else nome.lower()
        if not nome and ln > 0 and ln in id_nome_to_name:
            ultimo = id_nome_to_name[ln]
            sobrenome = ultimo.lower()
            primeiro = id_nome_to_name.get(fn, "") if fn > 0 and fn in id_nome_to_name else ""
            nome = f"{primeiro[0]}. {ultimo}" if primeiro else ultimo
        if not sobrenome and ln > 0 and ln in id_nome_to_name:
            sobrenome = id_nome_to_name[ln].lower()

        if nome:
            name_map[nome.lower().strip()] = pid
        if sobrenome:
            if sobrenome not in sobrenome_idx:
                sobrenome_idx[sobrenome] = []
            sobrenome_idx[sobrenome].append((pid, nat))

    # Extra: add any name from id_nomes that links to players
    for nome_str, nid in id_nomes.items():
        pids = nameid_to_pids.get(nid, [])
        if pids and nome_str not in sobrenome_idx:
            sobrenome_idx[nome_str] = [(pid, 0) for pid in pids]

    return name_map, sobrenome_idx, nameid_to_pids, id_nomes


# ─── Manual overrides ───────────────────────────────────────────────────────

MANUAL = {
    "weverton": "186555", "zima": "255687", "wimmer": "254566",
    "g. rodrigues": "210212", "garry rodrigues": "210212",
    "a. freeman": "267920", "alex freeman": "267920",
    "p. hincapie": "256197", "piero hincapie": "256197", "hincapie": "256197",
    "r. gravenberch": "246104", "gravenberch": "246104",
    "g. inacio": "257179", "inacio": "257179",
    "j. piquerez": "254623", "piquerez": "254623",
    "j. neves": "272834",
    "n. kante": "215914", "kante": "215914",
    "a. mac allister": "239837", "mac allister": "239837",
    "r. leao": "241721", "leao": "241721",
}

# ─── Buscar playerid ────────────────────────────────────────────────────────

def buscar(nome_draft, name_map, sobrenome_idx, nameid_to_pids, id_nomes):
    chave = nome_draft.lower().strip()

    # Manual override
    if chave in MANUAL:
        return MANUAL[chave]

    # Exact match
    if chave in name_map:
        return name_map[chave]

    # Sobrenome
    sn = chave.split(".")[1].strip() if "." in chave else (chave.split()[-1] if chave.split() else "")
    if not sn:
        return None

    if sn in MANUAL:
        return MANUAL[sn]

    candidates = sobrenome_idx.get(sn, [])
    if not candidates:
        for s, cands in sobrenome_idx.items():
            if sn in s:
                candidates.extend(cands)

    if not candidates:
        for nome_str, nid in id_nomes.items():
            if sn in nome_str or nome_str in sn:
                pids = nameid_to_pids.get(nid, [])
                for pid in pids:
                    candidates.append((pid, 0))
                if candidates:
                    break

    if len(candidates) == 1:
        return candidates[0][0]
    if len(candidates) > 1:
        return f"?{candidates[0][0]}"  # ambiguous - use first with ? prefix
    return None


# ─── Main ───────────────────────────────────────────────────────────────────

def main():
    print("Carregando indices do FC26...")
    name_map, sobrenome_idx, nameid_to_pids, id_nomes = carregar_indices()
    print(f"  {len(name_map)} nomes, {len(sobrenome_idx)} sobrenomes indexados")

    print("Carregando jogadores_final.json...")
    with open(SCRIPT_DIR / "jogadores_final.json", "r", encoding="utf-8") as f:
        jogadores = json.load(f)

    print(f"Buscando playerids para {len(jogadores)} jogadores...")
    encontrados = 0
    ambig = 0
    nao_encontrados = []

    for j in jogadores:
        pid = buscar(j["nome"], name_map, sobrenome_idx, nameid_to_pids, id_nomes)
        if pid:
            if pid.startswith("?"):
                j["playerid"] = pid[1:]
                j["_match"] = "ambiguo"
                ambig += 1
            else:
                j["playerid"] = pid
                j["_match"] = "ok"
            encontrados += 1
        else:
            j["playerid"] = None
            j["_match"] = "nao_encontrado"
            nao_encontrados.append(j["nome"])

    print(f"\nResultado:")
    print(f"  Encontrados: {encontrados}/{len(jogadores)}")
    print(f"  Ambiguos: {ambig}")
    print(f"  Nao encontrados: {len(nao_encontrados)}")

    if nao_encontrados:
        print(f"\nNao encontrados ({len(nao_encontrados)}):")
        for n in nao_encontrados[:20]:
            print(f"  - {n}")
        if len(nao_encontrados) > 20:
            print(f"  ... e mais {len(nao_encontrados)-20}")

    # Salvar
    output_path = SCRIPT_DIR / "jogadores_final_enriched.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(jogadores, f, ensure_ascii=False, indent=2)
    print(f"\nSalvo em: {output_path}")


if __name__ == "__main__":
    main()