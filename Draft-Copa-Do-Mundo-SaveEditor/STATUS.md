# Draft-Copa-Do-Mundo-SaveEditor - Status do Projeto

## Objetivo

Programa C# .NET 8 que importa tabelas TXT (geradas pelo conversor Python
`converter_v2.py`) para dentro de um arquivo Squad do EA SPORTS FC 26 e salva
o resultado como um novo Squad, pronto para ser carregado no jogo.

## Como funciona

```
Squad original (FBCHUNKS container)
    ↓ Extrai DB08
DB puro (.db)
    ↓ DbFile.LoadDb (FifaLibrary19.dll)
DbFile em memoria
    ↓ Importa TXTs (Table.ConvertFromDataTable)
DbFile modificado
    ↓ DbFile.SaveDb (calcula CRC automaticamente)
DB modificado (.db)
    ↓ Reempacota no container FBCHUNKS (header + trailer intactos)
Novo Squad (FBCHUNKS container)
```

### Backup automatico

Antes de qualquer operacao, o programa cria um backup do arquivo original
com sufixo `_1_` (ex: `Squads20260621210219777_1_`), seguindo o padrao do RDBM.

## Como usar

```
1) Fazer o Draft na aplicacao web (index.html) e clicar "Exportar Elencos"
2) Rodar o conversor: converter_v2.py  (gera TXTs em "Arquivos para Importar RDBM")
3) Rodar: Importar.bat  (duplo clique)

O script chama:
  Draft-Copa-Do-Mundo-SaveEditor.exe ^
    "C:\...\Arquivos Originais\Squads20260621210219777" ^
    "C:\...\Arquivos para Importar RDBM"

O Squad gerado fica em:
  %LOCALAPPDATA%\EA SPORTS FC 26\settings\SquadsYYYYMMDDHHMMSSxxx
```

## Dependencias

- .NET 8 SDK (build)
- `FifaLibrary19.dll` (engine do RDBM, copiada de RDBM26/)
- `fifa_ng_db-meta.xml` (descriptor de tabelas FC26, copiado para o output)
- NAO depende de Node.js nem TypeScript (versao atual)

## Como compilar

```bash
cd Draft-Copa-Do-Mundo-SaveEditor
dotnet build -c Release
```

O executavel fica em: `bin\Release\net8.0-windows\win-x64\Draft-Copa-Do-Mundo-SaveEditor.exe`

## Requisitos do sistema

- Windows 11
- .NET 8 Runtime
- RDBM 26 (para a FifaLibrary19.dll e o fifa_ng_db-meta.xml)

## Descobertas tecnicas

### Formato do arquivo Squad

```
[0]      10 bytes:  magic "FBCHUNKS"
[10]     4 bytes:   main_header_offset (LE) = 1108
[14]     4 bytes:   file_size (LE)
[18]     <=40 bytes: ingame_name (ex: "Elencos 1")
[varies] padding ate offset 1178
[1174]   4 bytes:   data_size (LE) = db_size + trailer_size
[1178]   8 bytes:   magic DB08 (44 42 00 08 ...)
[...]    banco de dados DB08
[...]    trailer BNRY
```

### DB08 (banco de dados)

magic: `44 42 00 08 00 00 00 00`
- Header global: signature, declaredSize, tableCount, CRC header, tabela directory
- 83 tabelas (no FC26)
- Cada tabela: 38 bytes header + 4 CRC + N*16 field descriptors + 4 CRC + N*recordSize registros + [Huffman tree + compressed strings]
- Trailer BNRY: 45985 bytes

### CRC

Calculado por `FifaUtil.ComputeCrcDb11`:
- CRC-32 padrao (polinomio 0x04C11DB7)
- Init: 0xFFFFFFFF
- Sem XOR final
- Calculado em secoes: header, shortnames, e para cada tabela (header + records separados)

### Estrutura de cada tabela

```csharp
// Header (38 bytes)
int   unk00;
int   recordSize;
int   nBitRecords;
int   compressedStringLength;  // 0 se nao tem, -1 temporario se tem
short nRecords;
short nWrittenRecords;
short nCancelledRecords;
short unknown16;
byte  nFields;
byte  pad[3];
int   unknown1C;
// CRC tableHeader (4 bytes)
// field descriptors: nFields * 16 bytes cada:
//   int fieldType, int bitOffset, byte[4] shortName, int depth
// CRC records (4 bytes)
// registros: nRecords * recordSize bytes
// [se tem compressed: Huffman tree + compressed strings]
```

### Compressed Strings (Huffman)

- Tabelas com `NCompressedStringFields > 0` usam Huffman
- A arvore Huffman e armazenada junto aos dados
- 95 tabelas das 239 tem compressed strings no FC26
- IMPORTANTE: nunca reconstruir a arvore Huffman — sempre preserver a original

### Ordem dos campos

Os campos em cada registro estao em ordem de `bitOffset` (menor para maior).
O `TableDescriptor.SortFields()` ordena pelo campo `order` numeral do XML.

### Tabelas manipuladas pelo draft

Apenas tabelas cujos TXTs em `Arquivos para Importar RDBM/` sao diferentes do original.
Normalmente: `teamplayerlinks` (elencos) e `leagues` (flag internacional).

## Referencias

- `fifa_ng_db-meta.xml` em `RDBM26/Templates/FC 26/`
- `FifaLibrary19.dll` em `RDBM26/`
- https://github.com/ViniMacacari/dbm-studio — motor TS de referencia
- https://github.com/xAranaktu/FIFASquadFileDownloader — download de squads
- https://github.com/Celtian/dbmaster-cli — pipeline FIFA 11-21

## Notas

- O tamanho do DB pode ficar menor apos SaveDb (FifaLibrary otimiza registros cancelados)
- Isso nao afeta o funcionamento no jogo
- O arquivo Squad final tera tamanho proporcional ao DB gerado
