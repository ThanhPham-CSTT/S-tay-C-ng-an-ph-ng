#!/usr/bin/env python3
"""Build V13.4 field-pilot data from the preserved V13.0 standalone release."""

from __future__ import annotations

import json
import re
from copy import deepcopy
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "script_1.js"
INDEX_PATH = ROOT / "index.html"

SOURCE_168 = (
    "https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-dinh-168-2024-nd-cp-"
    "quy-dinh-xu-phat-vi-pham-hanh-chinh-ve-trat-tu-atgt-duong-bo-119241231164556785.htm"
)
SOURCE_238 = (
    "https://xaydungchinhsach.chinhphu.vn/nghi-dinh-so-238-2026-nd-cp-sua-doi-"
    "quy-dinh-xu-phat-vi-pham-giao-thong-duong-bo-tru-diem-phuc-hoi-diem-"
    "giay-phep-lai-xe-119260630142033452.htm"
)

# Khoản 4 Điều 41 NĐ168: danh mục riêng của Trưởng Công an cấp xã.
WARD_SCOPE: dict[str, dict[str, set[str] | None]] = {
    "6": {"1": {"đ"}, "2": {"d", "đ"}, "3": {"b", "d", "đ", "e", "g"}},
    "7": {
        "1": {"d", "e", "g", "i"},
        "2": {"a", "d", "e", "g", "h", "i", "k"},
        "3": {"b", "c", "e", "g", "k"},
        "4": {"b", "d", "đ"},
    },
    "8": {"2": None, "3": {"b", "c"}, "4": {"c", "d", "đ", "e"}},
    "9": {
        "1": {"a", "b", "c", "d", "đ", "e", "g", "h", "i", "k", "l", "m", "n", "o"},
        "2": None,
        "3": {"a", "b", "c"},
        "4": {"d", "đ"},
    },
    "10": {"1": None, "2": {"b", "c"}},
    "11": {"1": None, "2": None},
    "12": {"1": None, "2": None, "3": None, "5": None, "6": {"c", "d"}},
    "15": {"*": None},
    "17": {"1": None},
    "20": {"3": {"b"}},
    "33": {"1": None, "2": None},
    "35": {"1": None},
}

AUTH_FIELDS = [
    "Mã trạng thái thẩm quyền V13.1",
    "Lý do thẩm quyền V13.1",
    "Căn cứ thẩm quyền V13.1",
    "Mức phạt tối đa dùng kiểm toán (đồng)",
    "Kết quả kiểm toán tự động V13.1",
    "Hiệu lực từ",
    "Hiệu lực đến",
]


def text(row: dict, key: str) -> str:
    return str(row.get(key, "") or "").strip()


def is_nd168(row: dict) -> bool:
    return "168" in (text(row, "Nghị định") + " " + text(row, "Module chuẩn V3.6"))


def is_reference(row: dict) -> bool:
    t = " ".join(
        [text(row, "Loại dữ liệu"), text(row, "Tên điều"), text(row, "Hành vi / nội dung")]
    ).lower()
    return any(x in t for x in ["căn cứ thẩm quyền", "không phải hành vi", "nguyên tắc", "phân định thẩm quyền"])


def is_legal_violation(row: dict) -> bool:
    if not (text(row, "Điều") and text(row, "Hành vi / nội dung") and text(row, "Mức phạt / hình thức theo khoản")):
        return False
    t = (text(row, "Loại dữ liệu") + " " + text(row, "Nghị định")).lower()
    return not any(x in t for x in ["tình huống", "gợi ý", "checklist", "thực chiến", "tóm tắt", "không phải hành vi"])


def in_ward_scope(row: dict) -> bool:
    article, clause, point = text(row, "Điều"), text(row, "Khoản"), text(row, "Điểm").lower()
    rules = WARD_SCOPE.get(article)
    if not rules:
        return False
    if "*" in rules:
        return True
    allowed = rules.get(clause)
    if clause not in rules:
        return False
    if allowed is None:
        return True
    return point in allowed


def money_values(value: str) -> list[int]:
    values = []
    for token in re.findall(r"\d{1,3}(?:\.\d{3})+", value):
        try:
            values.append(int(token.replace(".", "")))
        except ValueError:
            pass
    return values


def fine_limit(row: dict) -> tuple[int, bool]:
    fine = text(row, "Mức phạt / hình thức theo khoản")
    if "cảnh cáo" in fine.lower() and not money_values(fine):
        return 0, True
    values = money_values(fine)
    if not values:
        return 0, False
    max_value = max(values)
    organization = "tổ chức" in fine.lower()
    allowed = max_value <= (5_000_000 if organization else 2_500_000)
    return max_value, allowed


def has_complex_sanction(row: dict) -> tuple[bool, str]:
    if text(row, "Trừ điểm GPLX"):
        return True, "hành vi có trừ điểm GPLX; Điều 50 yêu cầu người có thẩm quyền phù hợp"
    if text(row, "Tước GPLX/giấy phép") or text(row, "Hình thức xử phạt bổ sung"):
        return True, "có tước giấy phép/đình chỉ hoặc hình thức bổ sung ngoài giới hạn Điều 43 khoản 3"
    if text(row, "Tịch thu phương tiện/tang vật"):
        return True, "có tịch thu nhưng dữ liệu không đủ xác định chắc chắn giá trị trong giới hạn 5 triệu đồng"
    remedy = (text(row, "Biện pháp khắc phục hậu quả") + " " + text(row, "Biện pháp khắc phục hậu quả hiển thị")).lower()
    if "buộc" in remedy:
        allowed = ["khôi phục lại tình trạng ban đầu", "khắc phục tình trạng ô nhiễm"]
        if not any(x in remedy for x in allowed) or any(
            x in remedy
            for x in ["tái xuất", "tháo dỡ", "lắp đặt", "nộp lại", "thu hồi", "đưa phương tiện", "hạ phần hàng", "dỡ phần hàng"]
        ):
            return True, "có biện pháp khắc phục ngoài điểm a, b khoản 3 Điều 3"
    return False, ""


def authority_audit(row: dict) -> None:
    for key in AUTH_FIELDS:
        row.setdefault(key, "")
    if not is_nd168(row):
        row["Mã trạng thái thẩm quyền V13.1"] = "NGOAI_MA_TRAN_ND168"
        row["Lý do thẩm quyền V13.1"] = "Dòng thuộc NĐ336/PCCC hoặc lớp phụ trợ; chưa áp dụng ma trận Điều 41 NĐ168."
        row["Kết quả kiểm toán tự động V13.1"] = "Không kết luận thẩm quyền bằng ma trận NĐ168."
        return
    if is_reference(row) or not is_legal_violation(row):
        row["Mã trạng thái thẩm quyền V13.1"] = "THAM_KHAO"
        row["Lý do thẩm quyền V13.1"] = "Dòng nguyên tắc/thẩm quyền/tóm tắt; không dùng độc lập để ra quyết định."
        row["Kết quả kiểm toán tự động V13.1"] = "Đạt kiểm tra phân lớp tham khảo."
        return

    maximum, fine_ok = fine_limit(row)
    row["Mức phạt tối đa dùng kiểm toán (đồng)"] = str(maximum) if maximum else ""
    scope_ok = in_ward_scope(row)
    complex_sanction, complex_reason = has_complex_sanction(row)
    reasons = []
    if not scope_ok:
        reasons.append("không thuộc danh mục khoản 4 Điều 41")
    if not fine_ok:
        reasons.append("khung tiền phạt vượt giới hạn Điều 43 khoản 3 hoặc chưa đủ dữ liệu xác định")
    if complex_sanction:
        reasons.append(complex_reason)

    row["CA phường lập BB"] = (
        "Có điều kiện — khi trực tiếp phát hiện trong lúc thi hành công vụ, hành vi thuộc phạm vi nhiệm vụ "
        "và người lập biên bản đáp ứng Điều 46; phải chuyển hồ sơ nếu không có thẩm quyền ra quyết định."
    )
    row["Căn cứ thẩm quyền V13.1"] = "Khoản 4 Điều 41; khoản 3 Điều 43; Điều 45, Điều 46 và Điều 50 NĐ168/2024/NĐ-CP."
    if not reasons:
        row["Mã trạng thái thẩm quyền V13.1"] = "PHUONG_CO_THE_QD_CO_DIEU_KIEN"
        row["Lý do thẩm quyền V13.1"] = (
            "Nằm trong danh mục khoản 4 Điều 41; khung phạt và hình thức thể hiện trong dòng không vượt "
            "giới hạn khoản 3 Điều 43. Vẫn phải kiểm tra chủ thể, tình tiết và hồ sơ thực tế."
        )
        row["Trưởng CA phường ra QĐ"] = "Có điều kiện — chỉ sau khi kiểm tra đủ chủ thể, tình tiết, mức phạt và hồ sơ thực tế."
        row["Hướng xử lý"] = "Kiểm tra đủ dấu hiệu và hồ sơ; Trưởng Công an phường có thể xem xét ra quyết định trong giới hạn thẩm quyền."
        row["Kết quả kiểm toán tự động V13.1"] = "ĐẠT ma trận sơ bộ; bắt buộc kiểm tra con người trước khi ký."
    else:
        row["Mã trạng thái thẩm quyền V13.1"] = "LAP_BB_CHUYEN_CAP"
        row["Lý do thẩm quyền V13.1"] = "; ".join(dict.fromkeys(reasons)) + "."
        row["Trưởng CA phường ra QĐ"] = "Không — lập biên bản/hoàn thiện tài liệu trong phạm vi nhiệm vụ và chuyển người có thẩm quyền."
        row["Hướng xử lý"] = "Ghi nhận đầy đủ chứng cứ, lập biên bản khi đủ điều kiện, bảo toàn tài liệu và chuyển CSGT/cấp có thẩm quyền."
        row["Kết quả kiểm toán tự động V13.1"] = "CHẶN ra quyết định tại phường theo ma trận tự động."


def make_future_row(template: dict, article: str, title: str, clause: str, point: str, action: str, fine: str, points: str = "") -> dict:
    row = {key: "" for key in template.keys()}
    row.update(
        {
            "Điều": article,
            "Tên điều": title,
            "Khoản": clause,
            "Điểm": point,
            "Hành vi / nội dung": action,
            "Mức phạt / hình thức theo khoản": fine,
            "Trừ điểm GPLX": points,
            "Nghị định": "NĐ 238/2026/NĐ-CP sửa NĐ 168/2024/NĐ-CP",
            "CA phường lập BB": "Đối chiếu theo phạm vi nhiệm vụ và Điều 46 sau khi văn bản có hiệu lực.",
            "Trưởng CA phường ra QĐ": "Chờ ma trận thẩm quyền V13.1.",
            "Hướng xử lý": "CHƯA ÁP DỤNG trước 15/08/2026; lưu để hệ thống tự chuyển hiệu lực đúng ngày.",
            "Ghi chú nghiệp vụ": "Dòng chuyển tiếp NĐ238; không dùng cho hành vi xảy ra và kết thúc trước ngày có hiệu lực.",
            "Căn cứ thẩm quyền": "NĐ238/2026/NĐ-CP; đối chiếu Điều 41, 43, 45, 46, 50 NĐ168 sau sửa đổi.",
            "Từ khóa tìm kiếm thêm": action + "; NĐ238; hiệu lực 15/08/2026",
            "Loại dữ liệu": "Quy định tương lai NĐ238 - CHƯA ÁP DỤNG trước 15/08/2026",
            "Hiệu lực áp dụng": "Có hiệu lực từ 15/08/2026; không áp dụng trước ngày này.",
            "Hiệu lực từ": "2026-08-15",
            "Hiệu lực đến": "",
            "Nguồn cập nhật": "V13.1 - lớp chuyển tiếp hiệu lực NĐ238/2026/NĐ-CP.",
            "Module chuẩn V3.6": "NĐ168 giao thông - lớp sửa đổi NĐ238",
            "Nhóm nghiệp vụ V3.6": "NĐ238; Chuyển tiếp hiệu lực; Giao thông",
            "Phiên bản dữ liệu": "V13.1 - Legal Integrity & Effective-Date Edition",
            "Chuyên đề trực quan": "Giao thông",
            "Trạng thái khóa dữ liệu": "KHÓA TƯƠNG LAI - hệ thống chỉ kích hoạt từ 15/08/2026.",
            "Nguồn kiểm định pháp lý": "Cổng TTĐT Chính phủ: " + SOURCE_238,
            "Ngày khóa dữ liệu": "21/07/2026",
            "Trạng thái kiểm toán GĐ1": "ĐÃ ĐỐI CHIẾU NĐ238 - CHỜ HIỆU LỰC",
        }
    )
    return row


def future_amendments(template: dict) -> list[dict]:
    rows = [
        make_future_row(template, "3", "Biện pháp khắc phục hậu quả theo NĐ238", "3", "i", "Buộc lắp đặt thiết bị giám sát hành trình, thiết bị ghi nhận hình ảnh người lái xe, thiết bị ghi nhận hình ảnh khoang chở khách, dây đai an toàn, ghế ngồi cho trẻ em mầm non/học sinh tiểu học và thiết bị cứu hộ theo quy định.", "Không phải hành vi xử phạt độc lập."),
        make_future_row(template, "3", "Biện pháp khắc phục hậu quả theo NĐ238", "3", "l", "Buộc cung cấp, cập nhật, truyền dẫn, lưu trữ và quản lý dữ liệu từ thiết bị giám sát hành trình, camera người lái và camera khoang chở khách theo quy định.", "Không phải hành vi xử phạt độc lập."),
        make_future_row(template, "6", "Xử phạt người điều khiển xe ô tô vi phạm quy tắc giao thông", "1a", "", "Chở trẻ em dưới 10 tuổi và chiều cao dưới 1,35 mét trên xe mà không sử dụng thiết bị an toàn phù hợp, trừ xe kinh doanh vận tải hành khách.", "Phạt cảnh cáo."),
        make_future_row(template, "6", "Xử phạt người điều khiển xe ô tô vi phạm quy tắc giao thông", "3", "m", "Chở trẻ em dưới 10 tuổi và chiều cao dưới 1,35 mét ngồi cùng hàng ghế với người lái xe, trừ xe chỉ có một hàng ghế.", "Phạt tiền từ 800.000 đồng đến 1.000.000 đồng."),
        make_future_row(template, "20", "Xử phạt người điều khiển xe ô tô kinh doanh vận tải hành khách", "5", "đ", "Điều khiển xe hợp đồng dùng hợp đồng giấy nhưng không có hợp đồng hoặc danh sách hành khách; hợp đồng không đúng quy định; đón, chở người không có tên trong danh sách.", "Phạt tiền từ 1.000.000 đồng đến 2.000.000 đồng.", "02 điểm"),
        make_future_row(template, "20", "Xử phạt người điều khiển xe ô tô kinh doanh vận tải hành khách", "5", "g", "Điều khiển xe hợp đồng đón, trả khách tại trụ sở hoặc địa điểm cố định trên tuyến đường phố; đón, trả đối tượng không đúng địa điểm trong hợp đồng hoặc vận chuyển không đúng đối tượng theo quy định.", "Phạt tiền từ 1.000.000 đồng đến 2.000.000 đồng.", "02 điểm"),
        make_future_row(template, "20", "Xử phạt người điều khiển xe ô tô kinh doanh vận tải hành khách", "5", "l", "Xe kinh doanh vận tải hành khách hoặc xe vận tải nội bộ không lắp camera người lái, camera không hoạt động hoặc làm sai lệch dữ liệu.", "Phạt tiền từ 1.000.000 đồng đến 2.000.000 đồng.", "02 điểm"),
        make_future_row(template, "20", "Xử phạt người điều khiển xe ô tô kinh doanh vận tải hành khách", "5", "m", "Xe hợp đồng điện tử không có thiết bị truy cập hợp đồng/danh sách hành khách, không truy cập được, hợp đồng không đúng hoặc tự ý thay đổi thông tin, đón người không có tên.", "Phạt tiền từ 1.000.000 đồng đến 2.000.000 đồng.", "02 điểm"),
        make_future_row(template, "20", "Xử phạt người điều khiển xe ô tô kinh doanh vận tải hành khách", "5", "n", "Xe kinh doanh vận tải hành khách từ 08 chỗ trở lên không lắp camera khoang chở khách, camera không hoạt động hoặc làm sai lệch dữ liệu.", "Phạt tiền từ 1.000.000 đồng đến 2.000.000 đồng.", "02 điểm"),
        make_future_row(template, "20", "Xử phạt người điều khiển xe ô tô kinh doanh vận tải hành khách", "6", "đ", "Xe kinh doanh vận tải hành khách hoặc xe vận tải nội bộ không lắp thiết bị giám sát hành trình, thiết bị không hoạt động hoặc làm sai lệch dữ liệu.", "Phạt tiền từ 3.000.000 đồng đến 5.000.000 đồng.", "02 điểm"),
        make_future_row(template, "20", "Xử phạt người điều khiển xe ô tô kinh doanh vận tải hành khách", "8a", "", "Điều khiển xe ô tô không kinh doanh vận tải hành khách nhưng chở người có thu tiền hoặc ký hợp đồng, nhận đặt chỗ để chở người.", "Phạt tiền từ 12.000.000 đồng đến 14.000.000 đồng.", "06 điểm"),
    ]
    for row in rows[:2]:
        row["Loại dữ liệu"] = "Căn cứ biện pháp khắc phục tương lai - không phải hành vi xử phạt"
    return rows


def mark_transition_rows(rows: list[dict]) -> None:
    for row in rows:
        if not is_nd168(row):
            continue
        article, clause, point = text(row, "Điều"), text(row, "Khoản"), text(row, "Điểm").lower()
        action = text(row, "Hành vi / nội dung").lower()
        if article == "6" and clause == "3" and point == "m" and "không sử dụng thiết bị an toàn" in action:
            row["Hiệu lực đến"] = "2026-08-14"
            row["Hiệu lực áp dụng"] = "Đang áp dụng đến hết 14/08/2026; từ 15/08/2026 áp dụng các dòng NĐ238 tương ứng."
        if article == "20" and clause == "5" and point == "g" and "địa điểm" in action:
            row["Hiệu lực đến"] = "2026-08-14"
            row["Hiệu lực áp dụng"] = "Đang áp dụng đến hết 14/08/2026; từ 15/08/2026 áp dụng điểm g sửa đổi."
        if article == "42" and "đang áp dụng đến hết" in action:
            row["Hiệu lực đến"] = "2026-08-14"
        if article == "42" and "15/08/2026" in (action + text(row, "Hiệu lực áp dụng")):
            row["Hiệu lực từ"] = "2026-08-15"
        if article == "20" and ((clause == "5" and point == "a-m") or (clause == "6" and point == "a-e")):
            row["Loại dữ liệu"] = text(row, "Loại dữ liệu") + " | Tóm tắt phạm vi rộng - không dùng độc lập"
            row["Trạng thái khóa dữ liệu"] = "TÓM TẮT BỊ CHẶN - chọn dòng Điều/Khoản/Điểm cụ thể trước khi lập hồ sơ."


def update_index(rows: list[dict]) -> None:
    html = INDEX_PATH.read_text(encoding="utf-8")
    payload = json.dumps(rows, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    html, n = re.subn(
        r'(<script id="data" type="application/json">).*?(</script>)',
        lambda m: m.group(1) + payload + m.group(2),
        html,
        count=1,
        flags=re.S,
    )
    if n != 1:
        raise RuntimeError("Không tìm thấy vùng dữ liệu nhúng")

    for old, new in {
        "V13.0 NĐ168 Expanded Coverage Edition": "V13.4 Field Pilot & Legal Integrity Edition",
        "Sổ tay CA phường V13.0": "Sổ tay CA phường V13.4",
        "Sổ tay tra cứu xử phạt Công an phường V13.0": "Sổ tay tra cứu xử phạt Công an phường V13.4",
        "Chạy kiểm tra hồi quy V13.0": "Chạy kiểm tra hồi quy V13.4",
        "V13.0 INDEPENDENT CORE AUDIT": "V13.4 INDEPENDENT CORE AUDIT",
        "V13.0 LEGAL SEARCH AUDIT": "V13.4 LEGAL SEARCH AUDIT",
        "window.__V130_READY": "window.__V134_READY",
    }.items():
        html = html.replace(old, new)

    if "v13_4.css" not in html:
        html = html.replace("</head>", '<link href="v13_4.css" rel="stylesheet"/>\n</head>', 1)
    if "id=\"fieldCasePanel\"" not in html:
        case_markup = (ROOT / "tools" / "case_panel.html").read_text(encoding="utf-8")
        html = html.replace('<section class="panel" id="resultsPanel">', case_markup + '\n<section class="panel" id="resultsPanel">', 1)
        html = html.replace("</header>", '</header><button id="fieldCaseToggle" class="field-case-toggle" type="button">🗂️ Hồ sơ vụ việc <span id="caseCount">0</span></button>', 1)
    if "v13_4.js" not in html:
        html = html.replace("</body>", '<script src="v13_4.js"></script>\n</body>', 1)

    # Stop the legacy compatibility core from deleting the new offline cache.
    html = re.sub(
        r"\s*// Remove stale service workers/caches; failures are harmless for local files\.\s*try\{ if\(navigator\.serviceWorker[\s\S]*?if\(document\.readyState",
        "\n  // V13.4 manages the service worker and release cache.\n  if(document.readyState",
        html,
        count=1,
    )
    INDEX_PATH.write_text(html, encoding="utf-8")


def main() -> None:
    rows = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    rows = [r for r in rows if "V13.1 - Legal Integrity" not in text(r, "Phiên bản dữ liệu")]
    for row in rows:
        for key in AUTH_FIELDS:
            row.setdefault(key, "")
    mark_transition_rows(rows)
    rows.extend(future_amendments(rows[0]))
    for row in rows:
        authority_audit(row)
    for index, row in enumerate(rows, 1):
        row["STT"] = str(index)
        if "V13.1 - Legal Integrity" in text(row, "Phiên bản dữ liệu"):
            row["Mã tra cứu V12"] = f"V134-{index:04d}"

    DATA_PATH.write_text(json.dumps(rows, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    update_index(rows)

    direct = sum(text(r, "Mã trạng thái thẩm quyền V13.1") == "PHUONG_CO_THE_QD_CO_DIEU_KIEN" for r in rows)
    transfer = sum(text(r, "Mã trạng thái thẩm quyền V13.1") == "LAP_BB_CHUYEN_CAP" for r in rows)
    report = {
        "release": "V13.4",
        "locked_at": "2026-07-21",
        "rows": len(rows),
        "nd168_rows": sum(is_nd168(r) for r in rows),
        "future_nd238_rows_added": 11,
        "ward_conditional_decision_rows": direct,
        "record_and_transfer_rows": transfer,
        "rule_basis": "Điều 41(4), 43(3), 45, 46, 50 NĐ168/2024/NĐ-CP",
        "sources": [SOURCE_168, SOURCE_238],
        "warning": "Ma trận tự động là lớp chặn/an toàn; không thay thế kiểm tra hồ sơ và văn bản gốc bởi người có thẩm quyền.",
    }
    (ROOT / "DATA_AUDIT_REPORT_V13_4.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
