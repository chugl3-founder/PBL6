"""Pytest plugin that prints the UnitTesting sheet cases (UT-01..UT-08) in Vietnamese.

Loaded with `-p ut_demo_plugin -p no:terminal`, so it is the only output during the demo.
"""

import os
import sys
import time

os.system("")  # turns on ANSI colours in the Windows console
sys.stdout.reconfigure(encoding="utf-8")

GREEN, RED, YELLOW, CYAN, GREY, BOLD, RESET = (
    "\033[92m", "\033[91m", "\033[93m", "\033[96m", "\033[90m", "\033[1m", "\033[0m")

FUNCTIONS = {
    "A": "Function A - Phát hiện 4 góc sân (detect_court_corners)",
    "B": "Function B - Phát hiện điểm chạm cầu và lọc trùng (BadmintonHitNet)",
}
CASES = {
    "ut01": ("UT-01", "A", "Phát hiện 4 góc sân trên video chuẩn"),
    "ut02": ("UT-02", "A", "Bỏ qua cảnh intro / khán giả khi chọn frame"),
    "ut03": ("UT-03", "A", "Phát hiện sân khi ánh sáng, màu sắc thay đổi"),
    "ut04": ("UT-04", "A", "Dùng tọa độ sân mặc định khi không thấy sân"),
    "ut05": ("UT-05", "B", "Phát hiện thời điểm chạm cầu trên video trận đấu"),
    "ut06": ("UT-06", "B", "Xác định đúng người đánh phía trên / dưới"),
    "ut07": ("UT-07", "B", "Lọc các điểm chạm cầu bị phát hiện trùng"),
    "ut08": ("UT-08", "B", "Phục hồi cú giao cầu và cú đánh bị bỏ sót"),
}
VARIANTS = {
    "test_ut01_detects_four_corners_on_standard_video": "video sân giả lập 1280x720",
    "test_ut01_real_broadcast_clip_is_detected_without_fallback": "clip truyền hình thật",
    "original": "ảnh gốc", "darker_30": "tối hơn 30%", "brighter_30": "sáng hơn 30%",
    "warm": "ám vàng", "cool": "ám xanh",
    "crowd": "cảnh khán giả", "green_billboard": "bảng quảng cáo màu xanh",
}
_SCAN_MINUTES = int(os.environ.get("UT_SCAN_FRAMES", 18000)) / 30 / 60
SLOW_NOTE = {"ut05": f"quét {_SCAN_MINUTES:g} phút video trận đấu bằng mô hình AI, so với nhãn ShuttleSet"}

_results: dict[str, list[str]] = {}
_setup_seconds: dict[str, float] = {}
_shown_function: set[str] = set()
_shown_case: set[str] = set()
_started = 0.0


def _case(item_name: str):
    key = item_name.split("_")[1]
    return key, CASES[key]


def _variant(item_name: str) -> str:
    if "[" in item_name:
        return VARIANTS.get(item_name.split("[")[1].rstrip("]"), "")
    return VARIANTS.get(item_name, "")


def pytest_sessionstart(session):
    global _started
    _started = time.time()
    print(f"\n{BOLD}{CYAN}{'=' * 72}")
    print("  KIỂM THỬ ĐƠN VỊ (UNIT TEST) - PBL6 Badminton AI      pytest + OpenCV")
    print(f"{'=' * 72}{RESET}")


def pytest_runtest_logstart(nodeid, location):
    name = nodeid.split("::")[-1]
    key, (case_id, function, title) = _case(name)
    if function not in _shown_function:
        _shown_function.add(function)
        print(f"\n{BOLD}{FUNCTIONS[function]}{RESET}")
    if case_id not in _shown_case:
        _shown_case.add(case_id)
        print(f"  {BOLD}{case_id}{RESET}  {title}")
        if key in SLOW_NOTE:
            print(f"        {YELLOW}... {SLOW_NOTE[key]}{RESET}")
    sys.stdout.flush()


def pytest_runtest_logreport(report):
    name = report.nodeid.split("::")[-1]
    if report.when == "setup" and report.passed:
        # UT-05 scans the match video inside its fixture, so its time belongs to the case.
        _setup_seconds[report.nodeid] = report.duration
        return
    if report.when == "teardown" and report.passed:
        return
    key, (case_id, _, _) = _case(name)
    variant = _variant(name)
    label = f" ({variant})" if variant else ""
    if report.skipped:
        outcome = "SKIP"
        line = f"        {YELLOW}- BỎ QUA{RESET}{label}"
    elif report.passed:
        outcome = "PASS"
        seconds = report.duration + _setup_seconds.get(report.nodeid, 0.0)
        line = f"        {GREEN}✔ PASSED{RESET}{label} {GREY}{seconds:.1f}s{RESET}"
    else:
        outcome = "FAIL"
        line = f"        {RED}✘ FAILED{RESET}{label}"
    _results.setdefault(case_id, []).append(outcome)
    print(line)
    for _, text in report.sections:
        for detail in text.strip().splitlines():
            if detail.startswith(case_id):
                print(f"        {GREY}{detail}{RESET}")
    if report.failed:
        print(f"{RED}{str(report.longrepr)[-1500:]}{RESET}")
    sys.stdout.flush()


def pytest_sessionfinish(session, exitstatus):
    passed = [c for c, r in _results.items() if "FAIL" not in r and "PASS" in r]
    failed = [c for c, r in _results.items() if "FAIL" in r]
    colour = GREEN if not failed and _results else RED
    print(f"\n{BOLD}{colour}{'=' * 72}")
    print(f"  KẾT QUẢ: {len(passed)}/{len(_results)} test case PASSED"
          f"   ({sum(len(r) for r in _results.values())} lần kiểm tra,"
          f" {time.time() - _started:.0f} giây)")
    if failed:
        print(f"  FAILED: {', '.join(failed)}")
    print(f"{'=' * 72}{RESET}")
    missing = [cid for cid, _, _ in CASES.values() if cid not in _results]
    if missing:
        print(f"{GREY}  Không chạy ở chế độ nhanh: {', '.join(missing)} "
              f"(chọn chế độ đầy đủ để chạy cả 8 case){RESET}")
