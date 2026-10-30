@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
title UniKit installer

set "SRC=%~dp0dist\UniKit.jsx"
set "CEPSRC=%~dp0cep\com.unikit.panel"
if not exist "%SRC%" (
    echo [!] Не найден dist\UniKit.jsx. Сначала соберите: node build.js
    pause
    exit /b 1
)

echo.
echo === UniKit: установка в After Effects ===
echo.

rem ---------------------------------------------------------------
rem 1) CEP-панель (современный интерфейс: вкладки, превью, hover)
rem ---------------------------------------------------------------
if exist "%CEPSRC%\CSXS\manifest.xml" (
    set "CEPDST=%APPDATA%\Adobe\CEP\extensions\com.unikit.panel"
    if exist "!CEPDST!" rmdir /s /q "!CEPDST!"
    xcopy "%CEPSRC%" "!CEPDST!\" /E /I /Y /Q >nul
    if !errorlevel! equ 0 (
        echo [OK] CEP-панель: !CEPDST!
    ) else (
        echo [--] Не удалось скопировать CEP-панель
    )
    rem разрешить неподписанные расширения (PlayerDebugMode) для CEP 9..12
    for %%V in (9 10 11 12) do (
        reg add "HKCU\Software\Adobe\CSXS.%%V" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul 2>&1
    )
    echo [OK] PlayerDebugMode=1 (HKCU\Software\Adobe\CSXS.9-12)
    rem путь к репозиторию — для кнопки «Обновить» в панели
    > "!CEPDST!\repo_path.txt" echo %~dp0
) else (
    echo [--] CEP-панель не найдена в cep\, ставлю только ScriptUI-версию
)

rem ---------------------------------------------------------------
rem 2) ScriptUI-панель (резервный вариант, Window > UniKit.jsx)
rem ---------------------------------------------------------------
set FOUND=0
for /d %%V in ("%APPDATA%\Adobe\After Effects\*") do (
    set "DST=%%~V\Scripts\ScriptUI Panels"
    if not exist "!DST!" mkdir "!DST!" >nul 2>&1
    copy /y "%SRC%" "!DST!\UniKit.jsx" >nul 2>&1
    if !errorlevel! equ 0 (
        echo [OK] ScriptUI: !DST!\UniKit.jsx
        set FOUND=1
    )
)
for /d %%A in ("%ProgramFiles%\Adobe\Adobe After Effects*") do (
    set "DST=%%~A\Support Files\Scripts\ScriptUI Panels"
    if exist "!DST!" (
        copy /y "%SRC%" "!DST!\UniKit.jsx" >nul 2>&1
        if !errorlevel! equ 0 (
            echo [OK] ScriptUI: !DST!\UniKit.jsx
            set FOUND=1
        ) else (
            echo [--] Нет прав на запись: !DST!  (запустите от администратора, если нужна системная копия)
        )
    )
)

echo.
echo Готово. Перезапустите After Effects:
echo   - CEP-панель:     Window ^> Extensions ^> UniKit
echo   - ScriptUI-панель: Window ^> UniKit.jsx
echo Если панель пустая/не открывается: Edit ^> Preferences ^> Scripting ^& Expressions ^>
echo   включить "Allow Scripts to Write Files and Access Network", затем перезапустить AE.
echo.
if /i not "%~1"=="/silent" pause
