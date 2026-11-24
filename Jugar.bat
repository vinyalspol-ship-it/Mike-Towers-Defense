@echo off
cd /d "%~dp0"
echo Iniciando Zombies Must Come Down... (cierra esta ventana para parar el juego)
call npm run dev -- --open
