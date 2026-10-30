@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
title UniKit installer

set "SRC=%~dp0dist\UniKit.jsx"
if not exist "%SRC%" (
    echo [!] Не найден dist\UniKit.jsx. Сначала соберите: node build.js
    pause
    exit /b 1
)

set FOUND=0

echo.
echo === UniKit: установка в After Effects ===
echo.

rem --- 1) пользовательская папка (не требует прав администратора, AE 2020+)
for /d %%V in ("%APPDATA%\Adobe\After Effects\*") do (
    set "DST=%%~V\Scripts\ScriptUI Panels"
    if not exist "!DST!" mkdir "!DST!" >nul 2>&1
    copy /y "%SRC%" "!DST!\UniKit.jsx" >nul 2>&1
    if !errorlevel! equ 0 (
        echo [OK] !DST!\UniKit.jsx
        set FOUND=1
    )
)

rem --- 2) системные папки установленных версий AE
for /d %%A in ("%ProgramFiles%\Adobe\Adobe After Effects*") do (
    set "DST=%%~A\Support Files\Scripts\ScriptUI Panels"
    if exist "!DST!" (
        copy /y "%SRC%" "!DST!\UniKit.jsx" >nul 2>&1
        if !errorlevel! equ 0 (
            echo [OK] !DST!\UniKit.jsx
            set FOUND=1
        ) else (
            echo [--] Нет прав на запись: !DST!
            echo      Запустите install.bat от имени администратора или скопируйте файл вручную.
        )
    )
)

echo.
if %FOUND%==0 (
    echo [!] After Effects не найден. Скопируйте dist\UniKit.jsx вручную в
    echo     "C:\Program Files\Adobe\Adobe After Effects 2025\Support Files\Scripts\ScriptUI Panels\"
) else (
    echo Готово. Перезапустите After Effects и откройте Window ^> UniKit.jsx
    echo Если панель не видна: Edit ^> Preferences ^> Scripting ^& Expressions ^>
    echo   "Allow Scripts to Write Files and Access Network" — включить.
)
echo.
pause
