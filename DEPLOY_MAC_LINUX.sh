#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"

if ! command -v npx >/dev/null 2>&1; then
  echo "[LỖI] Chưa có Node.js/npx. Cài Node.js LTS từ https://nodejs.org/ rồi chạy lại."
  exit 1
fi

echo "SỔ TAY CA PHƯỜNG V13.4 - CẬP NHẬT PROJECT VERCEL CŨ"
echo "Khi được hỏi, chọn Link to existing project và chọn đúng project cũ."
echo "Không chọn tạo project mới."

npx --yes vercel@latest login
npx --yes vercel@latest link

echo "Đang tạo bản Preview; domain Production chưa thay đổi..."
npx --yes vercel@latest

echo "Mở URL Preview vừa hiển thị và kiểm tra /version.json phải là V13.4."
printf "Preview đã đúng, cập nhật Production? [y/N] "
read -r answer
case "$answer" in
  y|Y|yes|YES)
    npx --yes vercel@latest --prod
    echo "[THÀNH CÔNG] Đã gửi V13.4 lên Production của project đã liên kết."
    echo "Mở website khi có mạng và tải lại hai lần để service worker cập nhật."
    ;;
  *)
    echo "Đã dừng sau Preview. Production chưa bị thay đổi."
    ;;
esac

