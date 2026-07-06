@echo off
cd /d "%~dp0"

if "%1"=="" (
    for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set "dt=%%I"
    set "msg=Atualizacao %dt:~0,4%-%dt:~4,2%-%dt:~6,2% %dt:~8,2%:%dt:~10,2%"
) else (
    set "msg=%*"
)

echo.
echo ========================================
echo  Git Push - Draft Copa do Mundo 2026
echo ========================================
echo.

git add -A
if %errorlevel% neq 0 (
    echo [ERRO] git add falhou
    pause
    exit /b 1
)

git commit -m "%msg%"
if %errorlevel% neq 0 (
    if %errorlevel% equ 1 (
        echo.
        echo [INFO] Nada novo para commitar.
        pause
        exit /b 0
    )
    echo [ERRO] git commit falhou
    pause
    exit /b 1
)

git push
if %errorlevel% neq 0 (
    echo [ERRO] git push falhou
    pause
    exit /b 1
)

echo.
echo ========================================
echo  Publicado com sucesso! ^<3
echo ========================================
echo.
pause
