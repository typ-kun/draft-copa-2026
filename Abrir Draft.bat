@echo off
title Draft Copa do Mundo 2026
echo.
echo  ========================================
echo   Draft Copa do Mundo 2026
echo   Servidor local iniciando...
echo  ========================================
echo.
echo  Abrindo no navegador...
echo  Feche esta janela para encerrar o servidor.
echo.

start "" http://localhost:8080
python -m http.server 8080
