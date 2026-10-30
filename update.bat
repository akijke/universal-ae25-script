@echo off
chcp 65001 >nul
cd /d "%~dp0"
rem Обновление = полная переустановка (удаление всех копий + свежая версия из GitHub)
call reinstall.bat %*
