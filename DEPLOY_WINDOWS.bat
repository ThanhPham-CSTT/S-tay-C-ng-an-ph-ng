@echo off
setlocal
cd /d "%~dp0"

where npx >nul 2>nul
if errorlevel 1 (
  echo [LOI] Chua co Node.js/npx. Cai Node.js LTS tu https://nodejs.org/ roi chay lai.
  pause
  exit /b 1
)

echo ============================================================
echo SO TAY CA PHUONG V13.4 - CAP NHAT PROJECT VERCEL CU
echo ============================================================
echo Khi duoc hoi, chon Link to existing project va chon DUNG project cu.
echo Khong chon tao project moi.
echo.

call npx --yes vercel@latest login
if errorlevel 1 goto :failed

call npx --yes vercel@latest link
if errorlevel 1 goto :failed

echo.
echo Dang tao ban Preview, chua thay doi domain Production...
call npx --yes vercel@latest
if errorlevel 1 goto :failed

echo.
echo Hay mo URL Preview vua hien thi va kiem tra /version.json phai la V13.4.
choice /C YN /M "Preview da dung, cap nhat Production ngay"
if errorlevel 2 goto :cancelled

call npx --yes vercel@latest --prod
if errorlevel 1 goto :failed

echo.
echo [THANH CONG] Da gui V13.4 len Production cua project da lien ket.
echo Mo website khi co mang va tai lai 2 lan de service worker cap nhat.
pause
exit /b 0

:cancelled
echo Da dung sau Preview. Production chua bi thay doi.
pause
exit /b 0

:failed
echo.
echo [LOI] Trien khai khong hoan tat. Production cu khong bi thay doi neu chua chay xong lenh --prod.
pause
exit /b 1

