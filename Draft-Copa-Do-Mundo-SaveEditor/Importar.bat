@echo off
setlocal

set EXE=%~dp0bin\Release\net8.0-windows\win-x64\Draft-Copa-Do-Mundo-SaveEditor.exe

set SQUAD_IN=C:\draft-copa-do-mundo-2026\RDBM26\Squads20260621210219777
set TXT_DIR=C:\draft-copa-do-mundo-2026\Arquivos para Importar RDBM

echo.
echo === Draft Copa do Mundo 2026 - FC26 Squad Import ===
echo.
echo Squad de entrada : %SQUAD_IN%
echo Diretorio TXTs   : %TXT_DIR%
echo.

if not exist "%SQUAD_IN%" (
    echo [ERRO] Squad de entrada nao encontrado.
    pause
    exit /b 1
)

if not exist "%TXT_DIR%" (
    echo [ERRO] Diretorio de TXTs nao encontrado.
    pause
    exit /b 1
)

"%EXE%" "%SQUAD_IN%" "%TXT_DIR%"

echo.
pause
endlocal
