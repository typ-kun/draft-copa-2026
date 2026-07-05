# Draft Copa do Mundo 2026 — Notas Técnicas e Aprendizados

**Data:** 2026-06-27

Este documento registra tudo o que foi descoberto durante o desenvolvimento de ferramentas
para importar TXTs do Draft Copa 2026 em arquivos Squad do EA Sports FC 26.

---

## 1. Formato do arquivo Squad

O arquivo Squad é um container binário **sem extensão** (ex: `Squads20260621210219777`).

### 1.1 Container FBCHUNKS

```
[0]      10 bytes:  magic "FBCHUNKS" (46 42 43 48 55 4E 4B 53 01 00)
[10]     4 bytes:   main_header_offset (LE) = 1108
[14]     4 bytes:   file_size (LE) = tamanho total - prefixo(1126)
[18]     <=40 bytes: ingame_name (ex: "Elencos 1", null-padded)
[varies] padding ate offset 1126
[1108]   48 bytes:  main header
[1126]   N bytes:   DB08 (banco de dados)
[...]    trailer BNRY
```

### 1.2 Main Header (48 bytes, offset 1108)

```
[0]      16 bytes: save type ("SaveType_Squads\0")
[16]     4 bytes:  CRC32 (placeholder durante escrita)
[20]     4 bytes:  data_size (db_size + trailer_size, LE)
[24]     24 bytes: padding/reserved
```

### 1.3 DB08 — Banco de dados

```
magic: 44 42 00 08 00 00 00 00
[8]   dbSize (uint32 LE)
[12]  reserved (4 bytes)
[16]  tableCount (uint32 LE) — 83 no FC26
[24]  table directory: tableCount * 8 bytes (4 shortName + 4 offset)
[...] padding
[...] tabelas (uma atras da outra)
```

### 1.4 Trailer BNRY

Magic: `42 4E 52 59`
Tamanho fixo: ~45.985 bytes para Squads.

---

## 2. Formato das Tabelas no DB08

Cada tabela tem a estrutura:

```
[0]   unk00 (int32)
[4]   recordSize (int32)
[8]   nBitRecords (int32)
[12]  compressedStringLength (int32) — 0 se nao tem compressed strings
[16]  nRecords (uint16) — capacidade total
[18]  nWrittenRecords (uint16) — registros escritos
[20]  nCancelledRecords (uint16)
[22]  unknown16 (int16)
[24]  nFields (byte)
[25]  padding (3 bytes)
[28]  unknown1C (int32)
[32]  CRC tableHeader (uint32)
[36]  field descriptors: nFields * 16 bytes
      [0]  fieldType (int32): 0=string, 3=integer, 13=shortCompressedString, 14=longCompressedString
      [4]  bitOffset (int32)
      [8]  shortName (4 bytes, latin1)
      [12] depth (int32) — bits usados
[...] CRC records (uint32)
[...] registros: nRecords * recordSize bytes
[...] [se compressed]: Huffman tree + bloco de strings comprimidas
```

### 2.1 Campos (Fields)

Os campos dentro de cada registro estão em ordem de `bitOffset` (menor para maior).
Campos string ocupam N bytes fixos (0-terminated UTF-8).
Campos integer usam bit packing little-endian (menos significativo primeiro).

### 2.2 Compressed Strings (Huffman)

95 de 239 tabelas usam strings comprimidas com Huffman.
- O campo no registro guarda um **offset inteiro** (32 bits) para o bloco de compressed strings.
- A árvore Huffman é armazenada junto aos dados da tabela.
- **Nunca reconstruir a árvore Huffman** — sempre preservar a original.

### 2.3 Exemplo: teamplayerlinks

```
[21] shortName=RrqT name=teamplayerlinks
recSize=16, nRec=27000, nWri=23810, nFld=16

field  bitOff  depth  shortName  fieldType
  0      8      1     SuuuG      integer (isamongtopscorers)
  1      9      6     jtWI       integer (yellows)
  2     15      1     pchV       integer (isamongtopscorersinteam)
  3      0      8     UMDX       integer (leaguegoals)
  4     16      7     JFiY       integer (jerseynumber)
  5     23      6     vjla       integer (position)
  6     29     19     JMld       integer (artificialkey)
  7     48     18     mCXg       integer (teamid)
  8     66      4     NbFh       integer (leaguegoalsprevmatch)
  9     70      6     Vili       (injury)
 10     76      6     stFk       (leagueappearances)
 11     82      1     YbEm       integer (istopscorer)
 12     83      5     dGNm       integer (leaguegoalsprevthreematches)
 13     88     19     ykFq       integer (playerid)
 14    107      3     rLZx       integer (form)
 15    110      5     jIcz       integer (reds)
```

### 2.4 Exemplo: leagues

```
[31] shortName=onMQ name=leagues
recSize=128, nRec=100, nWri=53, nFld=13

field  bitOff  depth  shortName  name
  0      0      8     WDGJ       countryid
  1      8    960     HEQX       leaguename (string, 120 bytes)
  2    968      5     JtdE       leaguetype
  3    973      3     paPI       level
  4    976      2     VtHL       iscompetitionscarfenabled
  5    978      2     uhiM       isbannerenabled
  6    980     12     aQrQ       leagueid
  7    992      2     eLCT       iscompetitionpoleflagenabled
  8    994      2     FtgW       iscompetitioncrowdcardsenabled
  9    996      6     ilBe       leaguetimeslice
 10   1002      1     SDHe       iswomencompetition
 11   1003      1     hXTp       iswithintransferwindow
 12   1004      1     JGZu       isinternationalleague
```

**`isinternationalleague` está no bit 1004 = byte 125, bit 4.**

---

## 3. CRC32

O CRC usado pelo jogo é CRC-32 padrão (polinômio `0x04C11DB7`), implementado em
`FifaUtil.ComputeCrcDb11`:

```csharp
int crc = -1;
foreach (byte b in bytes)
{
    crc ^= b << 24;
    for (int i = 0; i < 8; i++)
        crc = (crc < 0) ? (crc * 2) ^ 79764919 : crc * 2;
}
// Sem XOR final, sem reflect
```

**Onde o CRC é calculado:**
1. **Header global do DB** — bytes [0..32)
2. **ShortNames** — entre o directory e a primeira tabela
3. **Cada tabela** — CRC do header (após unk1C) e CRC dos registros
4. **Compressed strings** — são parte do bloco de registros

---

## 4. Descobertas Importantes

### 4.1 Os registros NÃO geralmente podem ser editados in-place

Tabelas com compressed strings (Huffman) usam offsets que referenciam um bloco
compartilhado. Modificar um registro pode invalidar offsets de outros registros.
**A única forma segura de modificar é reconstruir a tabela inteira** via FifaLibrary.

### 4.2 O tamanho do DB pode mudar após modificação

A `DbFile.SaveDb` da FifaLibrary otimiza registros cancelados e regenera o bloco
compressed, geralmente produzindo um DB menor. O jogo aceita isso, desde que os
CRCs estejam corretos.

### 4.3 Os TXTs estão em uma ordem diferente dos registros no DB

Os TXTs exportados pelo RDBM estão em ordem de "tabela exportada internamente",
que pode ser diferente da ordem dos registros no DB.
**Não** dê match linha-a-linha entre TXT e DB sem antes mapear por chave primária.

### 4.4 rangeLow

Campos integer podem ter `rangeLow != 0`. Ao ler: `valor_real = valor_lido + rangeLow`.
Ao escrever: `valor_a_escrever = valor_real - rangeLow`.
Ex: `jerseynumber` tem rangeLow=1, `teamid` rangeLow=1.

---

## 5. Ferramentas Analisadas

### 5.1 FifaLibrary19.dll (engine do RDBM)

**Localização:** `RDBM26/FifaLibrary19.dll`

Classes principais:
- `DbFile` — LoadDb, SaveDb, ComputeAllCrc
- `Table` — ConvertFromDataTable, ConvertToDataTable, Load, Save
- `FieldDescriptor` — BitOffset, Depth, RangeLow, FieldType
- `FifaUtil` — ComputeCrcDb11 (implementação do CRC)
- `Record` — Load, Save, LoadCompressedStrings

**Descompilador recomendado:** dnSpy (https://github.com/dnSpyEx/dnSpy)

### 5.2 FIFASquadFileDownloader (xAranaktu)

https://github.com/xAranaktu/FIFASquadFileDownloader

Ferramenta Python que **baixa** squads diretamente dos servidores da EA.

Importante: esta ferramenta **apenas baixa e descomprime** (LZ77 custom).
Ela **não** faz edição de registros. Recomendada para:
- Entender o formato de compressão LZ77 usado pela EA
- Obter squads oficiais como referência

### 5.3 dbmaster-cli (Celtian)

https://github.com/Celtian/dbmaster-cli

Pipeline FIFA 11-21 em TypeScript. Não suporta FC26 completamente.
Útil para entender o pipeline TSV ↔ JSON ↔ transformações.

### 5.4 FIFASquadFileDownloader →Nota

A documentação do Aranaktu afirma: "Você precisa recalcular o CRC de todas as
tabelas quando monta a squad, precisa do xml da base de dados pra fazer isso."

Isso confirma que **o CRC xml é obrigatório** e deve ser obtido do descriptor
`fifa_ng-db-meta.xml` que acompanha o RDBM.

---

## 6. O que funcionou (e o que não funcionou)

### Funcionou:
- ✅ Extração do DB08 do container FBCHUNKS
- ✅ Reempacotagem no container (header + trailer preservados)
- ✅ Cálculo correto do CRC (FifaUtil.ComputeCrcDb11)
- ✅ Leitura de field descriptors do DB

### NÃO funcionou (e por quê):
- ❌ Edição in-place sem reconstruir compressed strings — corrompe o jogo
- ❌ SaveDb da FifaLibrary — tamanho muda (~7.7MB vs ~10.4MB) e corrompe
- ❌ Ignorar rangeLow — campos como jerseynumber ficam errados

### Suspeita atual:
O jogo provavelmente valida não apenas os CRCs, mas também a **estrutura interna**
do bloco compressed (Huffman). Quando modmos inplace e só recalculamos o CRC
de registros, o bloco compressed não muda — mas os apontadores nos registros
podem ficar inconsistentes.

**SOLUÇÃO CORRETA:** A única forma segura é reconstruir a tabela completamente
(compressed string block incluído) via FifaLibrary.SaveDb**, mas depois
**substituir o DB reconstruído dentro do container preservando o tamanho** e
**ajustar todos os offsets e CRCs globais**.

OU: **usar o próprio RDBM** via automação de UI para fazer a importação,
pois ele sabe recalcular tudo corretamente.

---

## 7. Próximos Passos Sugeridos

1. **Automatizar o RDBM** via AutoHotkey ou PowerShell UI Automation
   - o RDBM fará a importação + recálculo de CRC corretamente
   - Tamanho pode variar, mas o jogo aceitará

2. **Investigar a relação tamanho × CRC × compressed strings**
   - Por que o SaveDb gera um DB menor?
   - O jogo aceita DBs reconstruídos de tamanho diferente?

3. **Usar o RDBM para gerar um DB "esperado"** e comparar byte-a-byte
   - com o DB que a FifaLibrary gera via SaveDb
   - para entender o que falta no recálculo de CRC

4. **Verificar se o problema é o padding**
   - Talvez o jogo valide que o padding específico (zeros vs outro padrão)
   - no final do DB reconstruído

---

## 8. Referências

- Pasta do RDBM: `C:\draft-copa-do-mundo-2026\RDBM26\`
- Templates: `RDBM26/Templates/FC 26/fifa_ng_db-meta.xml`
- Squads originais: `Arquivos Originais/`
- TXTs para importar: `Arquivos para Importar RDBM/`

**Contato:** para mais informações, ver os arquivos em `FifaLibrary19_src/`
(código descompilado via dnSpy).
