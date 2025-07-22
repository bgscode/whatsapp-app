@echo off
echo WABoss App Signing Tool
echo =============================================

REM Path to the SignTool utility - update this path based on your Windows SDK installation
set SIGNTOOL_PATH="C:\Program Files (x86)\Windows Kits\10\bin\10.0.22000.0\x64\signtool.exe"

REM Certificate information
set CERT_FILE="%~dp0cert.pem"
set KEY_FILE="%~dp0key.pem"
set APP_FILE="%~dp0dist\waboss Setup 1.0.0.exe"

echo Checking if SignTool exists...
if not exist %SIGNTOOL_PATH% (
    echo SignTool not found at the specified path.
    echo Please install Windows SDK or update the SIGNTOOL_PATH in this script.
    pause
    exit /b 1
)

REM Converting PEM files to PFX
echo.
echo Converting PEM certificate and key to PFX format...
echo Please make sure you have OpenSSL installed and in your PATH
openssl pkcs12 -export -out temp_cert.pfx -inkey %KEY_FILE% -in %CERT_FILE% -password pass:temppassword

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Error converting PEM files to PFX. Please make sure OpenSSL is installed.
    echo You can download OpenSSL from https://slproweb.com/products/Win32OpenSSL.html
    pause
    exit /b 1
)

echo.
echo Signing the application...
%SIGNTOOL_PATH% sign /f "temp_cert.pfx" /p "temppassword" /fd sha256 /tr http://timestamp.digicert.com /td sha256 /d "WABoss" %APP_FILE%

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Error signing the application.
    del temp_cert.pfx
    pause
    exit /b 1
) else (
    echo.
    echo Application signed successfully!
    echo.
    echo Verifying signature...
    %SIGNTOOL_PATH% verify /pa %APP_FILE%
)

echo.
echo Cleaning up temporary files...
del temp_cert.pfx

echo.
echo Process completed!
pause