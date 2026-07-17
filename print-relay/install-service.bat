@echo off
echo ============================================
echo   Installation du Print Relay en service
echo ============================================
echo.

:: Vérifier que npm est accessible
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ERREUR : npm n'est pas installe ou pas dans le PATH
    pause
    exit /b 1
)

:: Installer pm2 globalement
echo [1/4] Installation de pm2...
call npm install -g pm2 pm2-windows-startup
echo.

:: Démarrer le print relay avec pm2
echo [2/4] Demarrage du Print Relay...
cd /d "%~dp0"
call pm2 start server.js --name "print-relay" --restart-delay=3000
echo.

:: Sauvegarder la config pm2
echo [3/4] Sauvegarde de la configuration...
call pm2 save
echo.

:: Configurer le démarrage automatique Windows
echo [4/4] Configuration du demarrage automatique...
call pm2-startup install
echo.

echo ============================================
echo   Print Relay installe avec succes !
echo.
echo   Commandes utiles :
echo     pm2 status          - voir l'etat
echo     pm2 logs print-relay - voir les logs
echo     pm2 restart print-relay - redemarrer
echo     pm2 stop print-relay - arreter
echo ============================================
pause
