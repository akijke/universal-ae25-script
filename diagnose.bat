@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
title UniKit diagnostics
set "OUT=%USERPROFILE%\Desktop\UniKit_diag.txt"
echo Собираю диагностику в %OUT% ...

> "%OUT%" echo UniKit diagnostics — %DATE% %TIME%
>> "%OUT%" echo Папка проекта: %~dp0
>> "%OUT%" echo.

>> "%OUT%" echo === Версия в папке проекта ===
if exist "%~dp0VERSION" type "%~dp0VERSION" >> "%OUT%"
findstr /C:"BUILD:" "%~dp0dist\UniKit.jsx" >> "%OUT%" 2>nul
>> "%OUT%" echo.

>> "%OUT%" echo === After Effects: процесс и установки ===
tasklist /FI "IMAGENAME eq AfterFX.exe" 2>nul | find /I "AfterFX.exe" >> "%OUT%" || >> "%OUT%" echo AfterFX.exe не запущен
for /d %%A in ("%ProgramFiles%\Adobe\Adobe After Effects*") do >> "%OUT%" echo найден: %%~A
for /d %%V in ("%APPDATA%\Adobe\After Effects\*") do >> "%OUT%" echo prefs: %%~V
reg query "HKLM\SOFTWARE\Adobe\After Effects" >> "%OUT%" 2>nul
>> "%OUT%" echo.

>> "%OUT%" echo === Реестр PlayerDebugMode ===
for %%V in (8 9 10 11 12) do (
    reg query "HKCU\Software\Adobe\CSXS.%%V" /v PlayerDebugMode >> "%OUT%" 2>nul || >> "%OUT%" echo CSXS.%%V: нет ключа
)
>> "%OUT%" echo.

>> "%OUT%" echo === CEP-расширение (пользовательская папка) ===
set "CEPDST=%APPDATA%\Adobe\CEP\extensions\com.unikit.panel"
if exist "%CEPDST%" (
    dir /s /b "%CEPDST%" >> "%OUT%"
    >> "%OUT%" echo --- manifest.xml:
    type "%CEPDST%\CSXS\manifest.xml" >> "%OUT%" 2>nul
    >> "%OUT%" echo --- установленная сборка:
    findstr /C:"BUILD:" "%CEPDST%\host\UniKit.jsx" >> "%OUT%" 2>nul
    >> "%OUT%" echo --- repo_path.txt:
    type "%CEPDST%\repo_path.txt" >> "%OUT%" 2>nul
) else (
    >> "%OUT%" echo НЕ УСТАНОВЛЕНО: %CEPDST%
)
>> "%OUT%" echo.
>> "%OUT%" echo === Все расширения CEP ===
dir /b "%APPDATA%\Adobe\CEP\extensions" >> "%OUT%" 2>nul
dir /b "%ProgramFiles%\Common Files\Adobe\CEP\extensions" >> "%OUT%" 2>nul
dir /b "%ProgramFiles(x86)%\Common Files\Adobe\CEP\extensions" >> "%OUT%" 2>nul
>> "%OUT%" echo.

>> "%OUT%" echo === ScriptUI-копии ===
for /d %%V in ("%APPDATA%\Adobe\After Effects\*") do if exist "%%~V\Scripts\ScriptUI Panels\UniKit.jsx" >> "%OUT%" echo %%~V\Scripts\ScriptUI Panels\UniKit.jsx
for /d %%A in ("%ProgramFiles%\Adobe\Adobe After Effects*") do if exist "%%~A\Support Files\Scripts\ScriptUI Panels\UniKit.jsx" (
    >> "%OUT%" echo %%~A\Support Files\Scripts\ScriptUI Panels\UniKit.jsx
    findstr /C:"BUILD:" "%%~A\Support Files\Scripts\ScriptUI Panels\UniKit.jsx" >> "%OUT%" 2>nul
)
>> "%OUT%" echo.

>> "%OUT%" echo === Логи CEP (последние 60 строк каждого) ===
for %%L in ("%LOCALAPPDATA%\Temp\csxs12-AEFT.log" "%LOCALAPPDATA%\Temp\csxs11-AEFT.log" "%LOCALAPPDATA%\Temp\csxs10-AEFT.log" "%LOCALAPPDATA%\Temp\CEPHtmlEngine12-AEFT*.log") do (
    for %%F in (%%L) do if exist "%%~F" (
        >> "%OUT%" echo --- %%~F
        powershell -NoProfile -Command "Get-Content -LiteralPath '%%~F' -Tail 60" >> "%OUT%" 2>nul
    )
)
>> "%OUT%" echo.
>> "%OUT%" echo === Конец ===

echo.
echo Готово: %OUT%
echo Отправьте этот файл для разбора.
echo.
start "" notepad "%OUT%"
pause
