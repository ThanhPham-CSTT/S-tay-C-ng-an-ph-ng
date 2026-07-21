BÁO CÁO GIAI ĐOẠN 4 - KIỂM TRA CHÉO HỆ THỐNG & KHÓA LÕI TRA CỨU
Phiên bản: V10.8 Stage 4 System Audit Lock Edition
Ngày kiểm tra: 07/07/2026

1) NỀN KIỂM TRA
- Nền đầu vào: V10.7 Stage 3 PCCC Audit Lock Edition.
- Nguyên tắc: giữ nguyên dữ liệu đã khóa của GĐ1 NĐ168, GĐ2 NĐ336, GĐ3 PCCC; chỉ sửa lớp tìm kiếm/xếp hạng để tránh nhảy sai modul.
- Không can thiệp hình ảnh, không xóa dữ liệu pháp lý đã khóa.

2) KIỂM TRA CẤU TRÚC
- Tổng dòng dữ liệu chính: 872.
- Phân loại dữ liệu theo nhận diện hệ thống: {'168': 412, '336': 164, 'pccc': 262, 'other': 11, 'v4': 23}.
- Dòng pháp lý đủ cấu trúc Điều/Khoản/Mức phạt theo bộ nhận diện: {'168': 412, '336': 75, 'pccc': 149}.
- Dòng bị chặn/không dùng độc lập: {'pccc': 113, 'other': 11, '336': 89, 'v4': 23}.
- Số ảnh trong assets: 8.
- Ảnh trùng hash: 0.
- Liên kết assets bị thiếu: 0.
- HTML không còn ảnh base64 nhúng trực tiếp: 0 lần xuất hiện.
- JavaScript kiểm tra cú pháp bằng node --check: ĐẠT.
- ZIP giải nén được: ĐẠT.

3) LỖI ĐÃ KHẮC PHỤC Ở GIAI ĐOẠN 4
- Bổ sung nhận diện và ưu tiên tra cứu cho nhóm NĐ168:
  + xe tải/ô tô đi vào đường cấm, khu vực cấm, biển cấm đi vào.
  + không có GPLX/không giấy phép lái xe/GPLX bị trừ hết điểm/GPLX hết hạn.
  + chở hàng quá tải/vượt tải/vượt trọng tải.
  + dừng xe, đỗ xe tại nơi cấm dừng/cấm đỗ.
- Bổ sung nhận diện và ưu tiên tra cứu cho nhóm NĐ336:
  + đổ vật liệu xây dựng/chất phế thải trong hành lang an toàn đường bộ.
  + hạn chế kết quả PCCC/NĐ168 chen vào khi truy vấn thuộc đô thị.
- Bổ sung nhận diện và ưu tiên tra cứu cho nhóm PCCC:
  + không trang bị phương tiện chữa cháy.
  + không thực tập/không tổ chức thực tập phương án chữa cháy.
- Tăng bộ chặn xung đột liên modul:
  + truy vấn PCCC không kéo NĐ168/NĐ336 lên trước.
  + truy vấn NĐ336 không kéo NĐ168/PCCC lên trước.
  + truy vấn NĐ168 không kéo NĐ336/PCCC lên trước.

4) BỘ TEST TRA CỨU CHÉO
- mũ bảo hiểm: 168 Điều 7 khoản 2 điểm h | Không đội “mũ bảo hiểm cho người đi mô tô, xe máy” hoặc đội “mũ bảo hiểm cho người đi mô tô, xe máy”
- đi ngược chiều: 168 Điều 6 khoản 9 điểm d | Đi ngược chiều của đường một chiều, đi ngược chiều trên đường có biển “Cấm đi ngược chiều”, trừ các 
- nồng độ cồn: 168 Điều 6 khoản 6 điểm c | Điều khiển xe trên đường mà trong máu hoặc hơi thở có nồng độ cồn nhưng chưa vượt quá 50 miligam/100
- lấn chiếm vỉa hè: 336 Điều 5 khoản 3 điểm  | Phạt tiền từ 3.000.000 đồng đến 5.000.000 đồng đối với cá nhân, từ 6.000.000 đồng đến 10.000.000 đồn
- bán hàng rong: 336 Điều 5 khoản 3 điểm  | Phạt tiền từ 3.000.000 đồng đến 5.000.000 đồng đối với cá nhân, từ 6.000.000 đồng đến 10.000.000 đồn
- đổ rác: 336 Điều 5 khoản 2 điểm d | Đổ rác thải ra đường bộ không đúng nơi quy định, trừ hành vi vi phạm quy định tại điểm a khoản 4 Điề
- quảng cáo: 336 Điều 5 khoản 2 điểm c | Đặt, treo biển hiệu, bảng quảng cáo trên đất của đường bộ ở đoạn đường ngoài đô thị trừ việc đặt, tr
- bình chữa cháy hết hạn: PCCC Điều 21 khoản 2 điểm  | không duy trì đủ số lượng hoặc không bảo đảm chất lượng của phương tiện chữa cháy thông dụng, dụng c
- bình chữa cháy mất áp: PCCC Điều 21 khoản 2 điểm  | không duy trì đủ số lượng hoặc không bảo đảm chất lượng của phương tiện chữa cháy thông dụng, dụng c
- lối thoát nạn bị khóa: PCCC Điều 24 khoản 3 điểm a | Không duy trì cửa đi đã được lắp đặt trên lối thoát nạn hoặc đường thoát nạn; 'b) Khóa cửa đi lắp đặ
- không xây dựng phương án chữa cháy: PCCC Điều 26 khoản 5 điểm  | không xây dựng phương án chữa cháy, cứu nạn, cứu hộ của cơ sở, phương tiện giao thông
- không trang bị phương tiện chữa cháy: PCCC Điều 20 khoản 9 điểm c | Không trang bị phương tiện chữa cháy, cứu nạn, cứu hộ cơ giới
- xe tải vào đường cấm: 168 Điều 6 khoản 5 điểm i | Đi vào khu vực cấm, đường có biển báo hiệu có nội dung cấm đi vào đối với loại phương tiện đang điều
- không giấy phép lái xe: 168 Điều 18 khoản 5 điểm a-c | Người điều khiển mô tô đến 125 cm3/công suất đến 11 kW không có GPLX, GPLX bị trừ hết điểm, không hợ
- dừng xe cấm dừng: 168 Điều 6 khoản 2 điểm đ | Dừng xe không sát theo lề đường, vỉa hè phía bên phải theo chiều đi hoặc bánh xe gần nhất cách lề đư
- chở hàng quá tải: 168 Điều 21 khoản 2 điểm a-b | Chở hàng vượt trọng tải cho phép trên 10% đến 30% (hoặc xe xi téc theo mức quy định); kéo rơ moóc/sơ
- không đội mũ người ngồi sau: 168 Điều 7 khoản 2 điểm h | Không đội “mũ bảo hiểm cho người đi mô tô, xe máy” hoặc đội “mũ bảo hiểm cho người đi mô tô, xe máy”
- sử dụng lòng đường: 336 Điều 5 khoản 3 điểm  | Phạt tiền từ 3.000.000 đồng đến 5.000.000 đồng đối với cá nhân, từ 6.000.000 đồng đến 10.000.000 đồn
- đặt biển quảng cáo: 336 Điều 5 khoản 2 điểm c | Đặt, treo biển hiệu, bảng quảng cáo trên đất của đường bộ ở đoạn đường ngoài đô thị trừ việc đặt, tr
- đổ vật liệu xây dựng: 336 Điều 5 khoản 4 điểm a | Đổ, để trái phép vật liệu, chất phế thải trong hành lang an toàn đường bộ;
- không thực tập phương án chữa cháy: PCCC Điều 26 khoản 2 điểm a | Không thực tập hết các tình huống trong phương án chữa cháy, cứu nạn, cứu hộ của cơ sở, phương tiện 

5) TRẠNG THÁI KHÓA SAU GIAI ĐOẠN 4
- NĐ168: giữ khóa từ GĐ1.
- NĐ336: giữ khóa từ GĐ2.
- PCCC: giữ khóa từ GĐ3.
- Lõi tra cứu/xếp hạng: khóa sau GĐ4.
- Assets/hình ảnh: khóa sau GĐ4, không thiếu ảnh.

6) ĐÁNH GIÁ
- Ổn định kỹ thuật: khoảng 96-97%.
- Ổn định tra cứu thực tế theo bộ test trọng điểm: khoảng 95-97%.
- Dữ liệu pháp lý: đã được khóa theo cấu trúc trong ứng dụng; khi lập hồ sơ thực tế vẫn cần đối chiếu văn bản gốc, tình tiết, chủ thể cá nhân/tổ chức và thẩm quyền tại thời điểm xử lý.
