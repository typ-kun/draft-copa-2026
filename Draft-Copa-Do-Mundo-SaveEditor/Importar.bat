@echo off
setlocal

set EXE=%~dp0bin\Release\net8.0-windows\win-x64\Draft-Copa-Do-Mundo-SaveEditor.exe
set TXT_DIR=%~dp0..\Arquivos para Importar SaveEditor

echo.
echo === Draft Copa do Mundo 2026 - FC26 Squad Import ===
echo.

:: Procurar squad mais recente na pasta do jogo
set SQUAD_IN=
for %%f in ("%LOCALAPPDATA%\EA SPORTS FC 26\settings\Squads*") do (
    set SQUAD_IN=%%f
)

if "%SQUAD_IN%"=="" (
    echo [ERRO] Nenhum squad encontrado na pasta do jogo.
    echo Pasta: %LOCALAPPDATA%\EA SPORTS FC 26\settings\
    pause
    exit /b 1
)

echo Squad encontrado: %SQUAD_IN%
echo Diretorio TXTs: %TXT_DIR%
echo.

"%EXE%" "%SQUAD_IN%" "%TXT_DIR%"

echo.
pause
endlocal
