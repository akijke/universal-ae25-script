@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
title UniKit: полная переустановка
cd /d "%~dp0"

echo.
echo ============================================================
echo   UniKit: полное удаление и чистая установка новой версии
echo ============================================================
echo.

rem ------------------------------------------------------------
rem 0) After Effects должен быть закрыт (иначе файлы заняты и
rem    панель загрузит старую копию)
rem ------------------------------------------------------------
tasklist /FI "IMAGENAME eq AfterFX.exe" 2>nul | find /I "AfterFX.exe" >nul
if not errorlevel 1 (
    echo [!] After Effects запущен. Для переустановки его нужно закрыть.
    if /i "%~1"=="/silent" (
        echo     Закрываю AfterFX.exe...
        taskkill /IM AfterFX.exe /F >nul 2>&1
    ) else (
        choice /C YN /M "Закрыть After Effects сейчас (несохранённые изменения потеряются)? [Y/N]"
        if errorlevel 2 (
            echo Отменено. Сохраните проект, закройте AE и запустите reinstall.bat снова.
            goto :end
        )
        taskkill /IM AfterFX.exe /F >nul 2>&1
    )
    rem подождать, пока процесс отпустит файлы
    timeout /t 3 /nobreak >nul
)

rem ------------------------------------------------------------
rem 1) ПОЛНОЕ УДАЛЕНИЕ всех копий
rem ------------------------------------------------------------
echo.
echo --- Удаление старых копий ---

rem CEP-панель: пользовательская и системные папки расширений
for %%D in (
    "%APPDATA%\Adobe\CEP\extensions\com.unikit.panel"
    "%ProgramFiles%\Common Files\Adobe\CEP\extensions\com.unikit.panel"
    "%ProgramFiles(x86)%\Common Files\Adobe\CEP\extensions\com.unikit.panel"
) do (
    if exist "%%~D" (
        rmdir /s /q "%%~D" 2>nul
        if exist "%%~D" (echo [--] Не удалось удалить: %%~D) else (echo [OK] Удалено: %%~D)
    )
)

rem Кеш CEP (здесь CEP хранит закешированные html/js панелей)
for /d %%C in ("%LOCALAPPDATA%\Temp\cep_cache*") do (
    rmdir /s /q "%%~C" 2>nul
    echo [OK] Очищен кеш CEP: %%~C
)
for /d %%C in ("%LOCALAPPDATA%\Adobe\CEP\cache*") do (
    rmdir /s /q "%%~C" 2>nul
    echo [OK] Очищен кеш CEP: %%~C
)
if exist "%APPDATA%\Adobe\CEP\extensions\.unikit" rmdir /s /q "%APPDATA%\Adobe\CEP\extensions\.unikit" 2>nul

rem ScriptUI-панель: все версии AE, пользовательские и системные папки
for /d %%V in ("%APPDATA%\Adobe\After Effects\*") do (
    if exist "%%~V\Scripts\ScriptUI Panels\UniKit.jsx" (
        del /f /q "%%~V\Scripts\ScriptUI Panels\UniKit.jsx" 2>nul
        echo [OK] Удалено: %%~V\Scripts\ScriptUI Panels\UniKit.jsx
    )
    if exist "%%~V\Scripts\UniKit.jsx" del /f /q "%%~V\Scripts\UniKit.jsx" 2>nul
)
for /d %%A in ("%ProgramFiles%\Adobe\Adobe After Effects*") do (
    if exist "%%~A\Support Files\Scripts\ScriptUI Panels\UniKit.jsx" (
        del /f /q "%%~A\Support Files\Scripts\ScriptUI Panels\UniKit.jsx" 2>nul
        if exist "%%~A\Support Files\Scripts\ScriptUI Panels\UniKit.jsx" (
            echo [--] Нет прав удалить: %%~A\Support Files\Scripts\ScriptUI Panels\UniKit.jsx  ^(запустите от администратора^)
        ) else (
            echo [OK] Удалено: %%~A\Support Files\Scripts\ScriptUI Panels\UniKit.jsx
        )
    )
)

echo [OK] Старые копии удалены.

rem ------------------------------------------------------------
rem 2) Свежая версия из GitHub (если это git-репозиторий)
rem ------------------------------------------------------------
echo.
echo --- Получение новой версии ---
where git >nul 2>&1
if errorlevel 1 (
    echo [--] git не найден — использую файлы из этой папки без обновления.
) else if not exist ".git" (
    echo [--] Папка не является git-репозиторием — использую файлы как есть.
) else (
    for /f %%H in ('git rev-parse --short HEAD') do set "OLD=%%H"
    git fetch --quiet origin main
    if errorlevel 1 (
        echo [--] Нет связи с GitHub — использую локальную версию !OLD!.
    ) else (
        for /f %%H in ('git rev-parse --short origin/main') do set "NEW=%%H"
        if "!OLD!"=="!NEW!" (
            echo [OK] Локальная версия уже последняя: !OLD!
        ) else (
            echo Обновление !OLD! -^> !NEW!:
            git --no-pager log --oneline --no-decorate !OLD!..origin/main
            git status --porcelain | findstr /r "^.M ^M. ^A ^D" >nul
            if not errorlevel 1 git stash push -q -m "unikit-reinstall"
            git pull --ff-only --quiet origin main
            if errorlevel 1 (
                echo [--] git pull не удался, продолжаю с локальной версией.
            ) else (
                echo [OK] Код обновлён до !NEW!.
            )
        )
    )
)

rem ------------------------------------------------------------
rem 3) Сборка (если есть node) — иначе dist из репозитория
rem ------------------------------------------------------------
echo.
echo --- Сборка ---
where node >nul 2>&1
if errorlevel 1 (
    echo [--] node не найден — использую готовый dist\UniKit.jsx.
) else (
    node build.js >nul 2>&1
    if errorlevel 1 (echo [--] Сборка не удалась, использую dist из репозитория.) else (echo [OK] Собрано.)
)
if not exist "dist\UniKit.jsx" (
    echo [!] Нет dist\UniKit.jsx — установка невозможна.
    goto :end
)

rem ------------------------------------------------------------
rem 4) Чистая установка
rem ------------------------------------------------------------
echo.
echo --- Установка ---
call install.bat /silent

rem ------------------------------------------------------------
rem 5) Проверка: что реально установлено
rem ------------------------------------------------------------
echo.
echo --- Проверка ---
set "CEPDST=%APPDATA%\Adobe\CEP\extensions\com.unikit.panel"
if exist "%CEPDST%\host\UniKit.jsx" (
    for /f "tokens=2 delims='" %%B in ('findstr /C:"BUILD:" "%CEPDST%\host\UniKit.jsx"') do echo [OK] Установлена сборка: %%B
    echo [OK] CEP-панель: %CEPDST%
) else (
    echo [!] CEP-панель не установлена.
)
reg query "HKCU\Software\Adobe\CSXS.12" /v PlayerDebugMode >nul 2>&1 && echo [OK] PlayerDebugMode включён || echo [--] PlayerDebugMode не найден

echo.
echo ============================================================
echo   Готово. Запустите After Effects: Window ^> Extensions ^> UniKit
echo   Штамп сборки в правом нижнем углу панели должен совпадать
echo   с указанным выше.
echo ============================================================

:end
echo.
if /i not "%~1"=="/silent" pause
endlocal
