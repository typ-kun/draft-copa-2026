# Plano: Save Editor Híbrido (C# + DBM Studio/TypeScript)

**Data:** 2026-06-27
**Escopo:** **Apenas o Save Editor** — NÃO mexer em draft, conversor Python, seleções, schemas (esses estão em `plans/2026-06-27-refatorar-pipeline-draft.md`).

## Objetivo

Substituir o motor de leitura/escrita do `.db` do Save Editor — que hoje depende da
`FifaLibrary19.dll` (nativa, opaca, frágil) — pelo motor **puro em TypeScript** do
`dbm-studio-main/` (já validado, sem DLL). O fluxo CLI permanece idêntico:

```
Draft-Copa.exe <squadIn> <pastaTxts> [squadOut]
```

## Estratégia híbrida

O container FBCHUNKS (Squad) e o banco DB08 (`.db`) são coisas diferentes. O DBM Studio
sabe ler o `.db` mas **não** sabe ler o container FBCHUNKS (ele lê BIGF/BIG4, formato
diferente). O C# já faz a extração/reempacotagem do container perfeitamente.

**Divisão de responsabilidades:**

| Etapa | Quem | Arquivo |
|-------|------|---------|
| 1. Extrair DB08 do container FBCHUNKS | **C#** (mantém) | `Program.cs → ExtractDb()` |
| 2. Ler `.db` → estrutura de tabelas | **TypeScript** (DBM Studio) | `databaseReader.ts` |
| 3. Aplicar transforms (importar TXTs) | **TypeScript** (novo) | `transforms/import.ts` |
| 4. Escrever `.db` modificado | **TypeScript** (DBM Studio) | `databaseWriter.ts` |
| 5. Reempacotar no container FBCHUNKS | **C#** (mantém) | `Program.cs → RebuildSquad()` |

**Ganho:** elimina a dependência da `FifaLibrary19.dll` (a única peça nativa opaca).
O C# vira um "invólucro" que extrai e reempacota; o grosso (ler/modificar/escrever o banco)
fica em TS.

## Pré-requisito: o descriptor XML

O motor TS precisa do `fifa_ng_db-meta.xml` para saber o layout das tabelas.
**Já existe** em `RDBM26/Templates/FC 26/fifa_ng_db-meta.xml` (279 tabelas, 279 descriptors).
O C# já localiza esse arquivo via `FindDescriptorXml()` — o mesmo path serve ao motor TS.

## Tarefas

### Tarefa A — Script Node standalone `importar.mjs`

Criar em `Draft-Copa-Do-Mundo-SaveEditor/` um script Node que:

1. Recebe `(dbPath, xmlPath, txtFolder, dbOutPath)`.
2. Usa `databaseReader.ts` para ler o `.db` → `DbProject`.
3. Para cada `.txt` na pasta:
   - Usa `textTable.ts` para parsear o TXT.
   - Faz **replace** da tabela correspondente no projeto (não merge — substitui todas
     as linhas pela do TXT, como o RDBM faz ao importar).
4. Marca as tabelas modificadas como `changed`.
5. Usa `databaseWriter.ts` para salvar o `.db` (cria `.bak` automaticamente).

**Arquivos:**
- NOVO: `Draft-Copa-Do-Mundo-SaveEditor/importar.mjs` (entry point CLI)
- NOVO: `Draft-Copa-Do-Mundo-SaveEditor/src/replace.ts` (replace de tabelas)
- COPIAR/REFERENCIAR: `dbm-studio-main/src/core/{databaseReader,databaseWriter,textTable,projectIO}.ts`
- COPIAR/REFERENCIAR: `dbm-studio-main/src/shared/types.ts`

**Decisão:** copiar os 4 arquivos TS para dentro do Save Editor (com `package.json`
próprio) **ou** referenciar o `dbm-studio-main` via link. Recomendo **copiar** para
manter o Save Editor auto-contido (o `dbm-studio-main` é um app Electron grande, puxa
Angular etc. — não queremos isso como dependência).

### Tarefa B — Refatorar `Program.cs` para chamar o script Node

O `Program.cs` atual faz 6 passos. Novo fluxo:

```
[1/7] Localizar descriptor XML              (C#)
[2/7] Extrair DB08 do container FBCHUNKS    (C# ExtractDb)
[3/7] Chamar importar.mjs <db> <xml> <txts> <dbOut>  (Process.Start node)
[4/7] Reempacotar no container FBCHUNKS     (C# RebuildSquad)
[5/7] Salvar .db de backup (.bak) já feito pelo TS
[6/7] Limpar temporários
[7/7] SUCESSO
```

**Arquivo:** `Draft-Copa-Do-Mundo-SaveEditor/Program.cs` (refatorar `Main` e `ImportTable`).

**Cuidados:**
- Detectar se `node` está no PATH (senão, erro claro).
- Capturar stdout/stderr do processo Node e repassar ao console do C#.
- Validar o código de saída do Node (0 = sucesso).
- Manter a lógica de `FindDescriptorXml` e `RebuildSquad` intactas.

### Tarefa C — Validação bit-a-bit

**Critério de aceite:** o `.db` produzido pelo motor TS, **após reempacotado pelo C#**,
deve gerar um Squad idêntico ao que o Save Editor C# atual (com FifaLibrary19.dll) gera.

**Procedimento:**
1. Usar o `Squads20260621210219777` original + os TXTs de `Arquivos para Importar RDBM`.
2. Rodar o Save Editor **atual** → `squad_legacy.bin`.
3. Rodar o Save Editor **novo** → `squad_hibrido.bin`.
4. Comparar os DB08 extraídos de ambos: `diff` deve ser vazio (ou só diferenças
   aceitáveis de timestamp/ordem, se houver).
5. Teste end-a-end: carregar `squad_hibrido.bin` no FC26 e conferir os elencos.

### Tarefa D — Empacotamento

- `Draft-Copa-Do-Mundo-SaveEditor.exe` (C#) + `importar.mjs` + `node_modules/` (só as
  deps do motor TS: `fast-xml-parser`, `fifadate`, `fifarating`, `sharp` — na verdade
  só `fast-xml-parser` é essencial para o parser de XML; o resto é do app Electron).
- `Importar.bat` atualizado para chamar o `.exe` (que internamente chama o script Node).

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Motor TS não ler `.db` do FC26 corretamente | Validar primeiro contra `RDBM26/Templates/FC 26/fifa_ng_db.db` (DB puro conhecido) |
| Diferenças de encoding (UTF-16LE BOM) no `.txt` | `textTable.ts` já trata BOM; validar com diff |
| Container FBCHUNKS quebrar na reempacotagem | Não mexer no `RebuildSquad` do C# (já funciona) |
| Node não instalado na máquina do usuário | Detectar no início com erro claro; documentar requisito |
| Performance (DB 40MB) | `databaseReader.ts` é streaming por tabela; validar tempo |

## Fora de escopo (explicitamente)

- ❌ Draft / sorteio / chaveamento
- ❌ Conversor Python (`converter_v2.py`)
- ❌ Mapeamento de seleções da Copa
- ❌ Schemas YAML (já feitos em `plans/2026-06-27-refatorar-pipeline-draft.md`)
- ❌ GUI (permanece CLI)
- ❌ Reimplementar extração FBCHUNKS em TS (manter C#)

## Ordem de implementação

1. **Tarefa A** (script Node) — pré-requisito de tudo
2. **Tarefa C** (validação) — validar A contra o DB puro ANTES de tocar no C#
3. **Tarefa B** (refatorar C#) — só quando A estiver validado
4. **Tarefa D** (empacotamento) — por último
