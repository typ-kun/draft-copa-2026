============================================================
  DRAFT COPA DO MUNDO 2026 - FC26 SQUAD IMPORT TOOL
  (Save Editor)
============================================================

OBJETIO
-------
Importar tabelas TXT (geradas pelo conversor Python) para dentro de
um arquivo Squad do EA SPORTS FC 26, gerando um novo Squad pronto para
ser carregado no jogo.

O programa faz backup automatico do arquivo original como <nome>_1_
(ou _2_, _3_ etc) antes de substituir, seguindo o mesmo padrao do RDBM.

USO
---
1) Fazer o Draft na aplicacao web (index.html) e clicar em
   "Exportar Elencos" para gerar o draft-copa-2026.json

2) Rodar o conversor (converter_v2.py ou converter.bat) para gerar
   os TXTs em "Arquivos para Importar RDBM"

3) Rodar Importar.bat (duplo clique) ou via linha de comando:
   Draft-Copa-Do-Mundo-SaveEditor.exe <squadIn> <pastaTxts> [squadOut]

   - squadIn   : caminho do Squad original (ex: RDBM26\Squads20260621...)
   - pastaTxts : pasta com os .txt do conversor
   - squadOut  : (opcional) caminho para salvar. Se omitido, sobrescreve
                 o input e cria backup <nome>_1_

ARQUIVOS
---------
- Draft-Copa-Do-Mundo-SaveEditor.exe : executavel principal
- fifa_ng_db-meta.xml                : descriptor de tabelas FC26
- FifaLibrary19.dll                  : engine RDBM (referencia)
- Importar.bat                       : script de conveniencia

ESTRUTURA
----------
O Squad e um arquivo FBCHUNKS (container) que embute um banco DB08.
O programa extrai o DB08, carrega com a engine do RDBM, importa os
TXTs e reempacota no container.

COMPILACAO
----------
Requer .NET 8 SDK. Para recompilar:
  dotnet build -c Release
