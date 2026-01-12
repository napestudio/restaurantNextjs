@echo off
REM Script to generate self-signed certificate for QZ Tray
REM Based on: https://github.com/qzind/tray/wiki/signing

echo Generating QZ Tray self-signed certificate...
echo.

REM Create certificates directory
if not exist certificates mkdir certificates

REM Generate private key (2048-bit RSA)
echo Generating private key...
openssl genrsa -out certificates\qz-private-key.pem 2048

REM Generate public certificate (valid for 10 years)
echo Generating public certificate...
openssl req -new -x509 -key certificates\qz-private-key.pem -out certificates\qz-certificate.pem -days 3650 -subj "/CN=RestaurantPOS QZ Tray Certificate/O=Restaurant POS/C=US"

echo.
echo ========================================
echo    Certificate generation complete!
echo ========================================
echo.
echo Files created:
echo   - certificates\qz-private-key.pem (KEEP SECRET - used for signing)
echo   - certificates\qz-certificate.pem (PUBLIC - distribute to clients)
echo.
echo Next steps:
echo   1. Keep qz-private-key.pem secure on your server
echo   2. Add certificates/ to .gitignore to avoid committing private key
echo   3. Distribute qz-certificate.pem to your clients
echo   4. Clients install certificate in QZ Tray Settings - Certificates
echo.
pause
