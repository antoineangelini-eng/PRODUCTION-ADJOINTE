@echo off
chcp 65001 >nul 2>&1
title Installation Service Emplacement
color 0A

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║   Installation du Service Emplacement           ║
echo  ║   Production Adjointe - Labo Argoat             ║
echo  ╚══════════════════════════════════════════════════╝
echo.

:: Dossier d'installation
set INSTALL_DIR=C:\emplacement-service
set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup

:: Arreter l'ancien service s'il tourne
echo [1/5] Arret de l'ancien service si actif...
powershell -Command "Get-Process powershell -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -match 'capture-server' -or $_.CommandLine -match 'capture-server' } | Stop-Process -Force -ErrorAction SilentlyContinue" >nul 2>&1
timeout /t 1 /nobreak >nul

:: Creer le dossier d'installation
echo [2/5] Creation du dossier %INSTALL_DIR%...
if not exist "%INSTALL_DIR%" mkdir "%INSTALL_DIR%"

:: Copier le script PowerShell
echo [3/5] Copie du serveur de capture...
copy /Y "%~dp0capture-server.ps1" "%INSTALL_DIR%\capture-server.ps1" >nul

:: Creer le lanceur VBS (execute PowerShell en arriere-plan, sans fenetre)
echo [4/5] Configuration du demarrage automatique...
(
echo Set WshShell = CreateObject^("WScript.Shell"^)
echo WshShell.Run "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File ""C:\emplacement-service\capture-server.ps1""", 0, False
) > "%INSTALL_DIR%\start-service.vbs"

:: Copier dans le dossier Startup pour demarrage auto
copy /Y "%INSTALL_DIR%\start-service.vbs" "%STARTUP_DIR%\emplacement-service.vbs" >nul

:: Creer un script de desinstallation
(
echo @echo off
echo echo Desinstallation du service emplacement...
echo taskkill /f /im powershell.exe /fi "WINDOWTITLE eq capture-server*" ^>nul 2^>^&1
echo del "%STARTUP_DIR%\emplacement-service.vbs" ^>nul 2^>^&1
echo rmdir /s /q "%INSTALL_DIR%" ^>nul 2^>^&1
echo echo Service desinstalle.
echo pause
) > "%INSTALL_DIR%\desinstaller.bat"

:: Lancer le service maintenant
echo [5/5] Demarrage du service...
cscript //nologo "%INSTALL_DIR%\start-service.vbs"
timeout /t 2 /nobreak >nul

:: Verifier que le service repond
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:9098/health' -UseBasicParsing -TimeoutSec 3; if ($r.StatusCode -eq 200) { Write-Host ''; Write-Host '  ✓ Service actif sur http://localhost:9098' -ForegroundColor Green } } catch { Write-Host ''; Write-Host '  ⚠ Le service met un peu de temps a demarrer...' -ForegroundColor Yellow }"

echo.
echo  ══════════════════════════════════════════════════
echo   Installation terminee !
echo.
echo   - Le service demarre automatiquement avec Windows
echo   - Pour desinstaller : C:\emplacement-service\desinstaller.bat
echo  ══════════════════════════════════════════════════
echo.
pause
