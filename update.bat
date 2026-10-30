@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
title UniKit updater
cd /d "%~dp0"

echo.
echo === UniKit: обновление из GitHub ===
echo.

where git >nul 2>&1
if errorlevel 1 (
    echo [!] git не найден. Установите Git for Windows: https://git-scm.com/download/win
    goto :end
)

if not exist ".git" (
    echo [!] Эта папка не является git-репозиторием.
    echo     Склонируйте проект заново:
    echo       git clone https://github.com/akijke/universal-ae25-script.git
    echo     и запускайте update.bat из склонированной папки.
    goto :end
)

for /f %%H in ('git rev-parse --short HEAD') do set "OLD=%%H"
echo Текущая версия: !OLD!
echo Проверяю обновления...

git fetch --quiet origin main
if errorlevel 1 (
    echo [!] Не удалось связаться с GitHub. Проверьте интернет / доступ к репозиторию.
    goto :end
)

for /f %%H in ('git rev-parse --short origin/main') do set "NEW=%%H"
if "!OLD!"=="!NEW!" (
    echo [OK] Уже установлена последняя версия ^(!OLD!^).
    set UPDATED=0
) else (
    echo Доступно обновление: !OLD! -^> !NEW!
    echo.
    git --no-pager log --oneline --no-decorate !OLD!..origin/main
    echo.
    git status --porcelain | findstr /r "^.M ^M. ^A ^D" >nul
    if not errorlevel 1 (
        echo [!] Есть локальные изменения — откладываю их ^(git stash^), чтобы не потерять.
        git stash push -q -m "unikit-update-%DATE%-%TIME%"
    )
    git pull --ff-only --quiet origin main
    if errorlevel 1 (
        echo [!] Не удалось обновить ^(конфликт истории^). Выполните вручную: git pull --rebase origin main
        goto :end
    )
    echo [OK] Код обновлён до !NEW!.
    set UPDATED=1
)

rem --- пересборка (если есть node; иначе используем dist из репозитория)
where node >nul 2>&1
if not errorlevel 1 (
    echo Пересобираю dist\UniKit.jsx...
    node build.js >nul
    if errorlevel 1 (
        echo [--] Сборка не удалась, использую dist из репозитория.
    ) else (
        echo [OK] Сборка готова.
    )
) else (
    echo [--] node не найден — использую готовый dist из репозитория.
)

rem --- переустановка панелей
echo.
call install.bat /silent

echo.
if "!UPDATED!"=="1" (
    echo === Обновление завершено. Перезапустите After Effects. ===
) else (
    echo === Переустановка завершена. Если AE открыт — перезапустите его. ===
)

:end
echo.
if /i not "%~1"=="/silent" pause
endlocal
