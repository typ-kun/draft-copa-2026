# Plano: Refatorar o pipeline Draft → FC26

**Data:** 2026-06-27
**Decisões do usuário:**
- Escopo: Tarefas 1+2 (schemas versionados + conversor em transforms)
- Schemas no Save Editor (C#)
- Validação: diff bit-a-bit **e** teste end-a-end no jogo

---

## Contexto (de onde viemos)

Pesquisei `mostafasudo/fifa-db-backend` e `Celtian/dbmaster-cli`. A referência útil é o
dbmaster: ele prova que existe um **vocabulário versionado de tabelas FIFA/FC** (25 tabelas, schemas
por temporada em YAML) e um pipeline de **transforms em streaming** (parse → validate → transform → serialize).
Já o `fifa-db-backend` é só um CRUD acadêmico — não lê arquivos do jogo.

Hoje o projeto tem offsets de coluna **hardcoded** no `converter_v2.py` (ex.: "col -1 do leagues",
"role1 = coluna 9 do players") e conhecimento de layout espalhado em múltiplos scripts Python.
A ideia é formalizar esse conhecimento como **schemas declarativos** e reestruturador o conversor como
**transforms encadeáveis**, diminuindo o trabalho manual a cada nova temporada.

---

## Tarefas

### Tarefa 1 — Schemas versionados das tabelas FC26

**O que:** criar, no Save Editor, uma fonte declarativa do layout das tabelas do FC26.

**Arquivos:**
- NOVOS: `Draft-Copa-Do-Mundo-SaveEditor/tables/fc26/*.yml` (um por tabela manipulada)
- MoDEIFICADO: `Draft-Copa-Do-Mundo-SaveEditor/Program.cs` (carrega schemas ao iniciar)

**Yaml modelo** (espelha `dbmaster-cli/cfg/tables/fifa21/`):
```yaml
name: leagues
shortname: leagues
fields:
  - { name: countryid,       order: 0,  type: int }
  - { name: leaguename,      order: 1,  type: string }
  - { name: leaguetype,      order: 2,  type: int }
  # ... ver header real
  - { name: isinernationalleague, order: 12, type: int }
```

Tabelas no escopo inicial: `leagues` (13 cols), `teamplayerlinks` (17 cols), `teams` (110 cols),
`players` (145 cols). Usar headers reais já extraídos como fonte da verdade.

**Por que aqui dentro do Save Editor:** isso está alinhado com a decisão do usuário
"schemas no Save Editor". Mas **avaliarei** já no fim da Tarefa 1 se o Python também
precisará ler esses schemas (decidir yml bom ou converter para JSON). Sinalizar essa decisão antes
de refatorar o conversor.

### Tarefa 2 — Pipeline de transforms no editor (parse/serializeguião)

**O que:** implementar os transforms que hoje estão hardcodes no Python mas que são no fundo
operações genéricas sobre TSVs:

- `StripNationalityFlag(league="International", col="isinternationalleague", value=0)` — limpa a
  restrição de país da liga Internacional
- `ReplaceRoster(teamid=X, new_players=[...])` — limpa elenco do time X e adiciona lista nova
- `ParseTsv(path, encoding=utf-16le)` e `SerializeTsv(rows, encoding=utf-16le)` — IO com encoding correto

**Arquivos:**
- NOVOS: `Draft-Copa-Do-Mundo-SaveEditor/Transforms/*.cs` (`ITableTransform.cs`, `ReplaceRoster.cs`,
  `SetFieldValue.cs`)
- MoDEIFICADO: `Draft-Copa-Do-Mundo-SaveEditor/Program.cs` (aplica transforms por tabela após importar TXTs)

**Pipeline-alvo (por tabela):**
```
arquivo TSV original → ParseTsv → [transform(s) configurados] → SerializeTsv → fwrite
```

### Tarefa 3 — Mapeamento de seleções (camada de domínio)

**O que:** extrair do `converter_v2.py` o dicionário `_TRAD` (PT→EN de times) e o mapeamento
teamname→teamid para um arquivo declarativo na raiz:

- NOVO (ou reutilizado): `Arquivos Originais/_fifa26_selections.json`
  ```json
  { "Brasil": { "teamname_en": "Brazil", "teamid": 123 } }
  ```

Isso será referenciado pelo rastreamento de participação do draft e mapeia o JSON
`draft-copa-2026.json` para IDs internos do FC26.

**Por que:** desacoplar o conhecimento de "seleção A vira time B" do código.
Fica reutilizável para app web, conversor e editor.

### Tarefa 4 — Validação: diff bit-a-bit

**O que:**_SCRIPT de validacão que roda o NOVO conversor/editor e compara a saída com a saída
atual (esta em `Arquivos para Importar RDBM`).

**Arquivos:**
- NOVO: `plans/validate.ps1` (ou `.bat`)
- NOVO: `plans/fixtures/` (Squad de referência + draft de referência)

**Criterio de aceite:**
```
diff -r <saida-nova> <saida-atual>  →  0 diferenças
```
Para as 4 tabelas manipuladas. Tabelas não manipuladas permanecem cópia exata do original.

### Tarefa 5 — Teste end-a-end

**O que:** roda o Squad novo no FC26 e confere:
- Liga Internacional aceita jogadores de qualquer nacionalidade
- Cada seleção está com o elenco do draft (nomes + quantidade por time)

**Arquivo:**
- NOVO: `plans/e2e-checklist.md` — checklist visual de conferência no jogo.

---## Riscos / cuidados

1. **Encoding UTF-16LE** — todo IO precisa preservar BOM e usar `Encoding.Unicode`. Qualquer
   desvio quebra o RDBM.
2. **Os bytes do cabeçalho DB08** que o editor atual preserva (offsets 6-11, `file_size`
   offset 14, `data_size` offset 1174) NÃO mexer. Isso é carne-vermelha do editor atual que
   funciona; só adicionar features ao lado.
3. **Precisão de diff** — o critério "bit-a-bit" precisa isolar a mudança (por ex. a diferença
   legítima em `teamplayerlinks` é só o elenco).

## Ordem sugerida de implementação

1. Tarefa 1 (schemas)   ← pré-requisito para 2
2. Tarefa 3 (mapeamento seleções)  ← pré-requisito para 2
3. Tarefa 2 (transforms + IO)
4. Tarefa 4 (diff)      ← valida 1+2+3
5. Tarefa 5 (e2e)       ← validação final no jogo
