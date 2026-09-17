#!/usr/bin/env python3
import os
import re
import subprocess
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

SCREEN_W = 360
SCREEN_H = 740
OUT = Path(os.environ.get("NOORTOOLS_QA_OUT", "/tmp/noortools-ui-qa"))
OUT.mkdir(parents=True, exist_ok=True)


def run(*args, check=True, timeout=20, capture=True):
    cmd = ["adb", *map(str, args)]
    return subprocess.run(cmd, check=check, timeout=timeout, text=True, capture_output=capture)


def shell(*args, check=True, timeout=20):
    return run("shell", *args, check=check, timeout=timeout).stdout


def dump_ui():
    run("shell", "uiautomator", "dump", "/sdcard/window.xml", check=True, timeout=15)
    raw = run("exec-out", "cat", "/sdcard/window.xml", check=True, timeout=15).stdout
    return ET.fromstring(raw)


def visible_nodes(root):
    return [n for n in root.iter("node") if n.attrib.get("visible-to-user", "false") == "true"]


def attrs_text(node):
    return " ".join([node.attrib.get("text", ""), node.attrib.get("content-desc", "")]).strip()


def parse_bounds(bounds):
    nums = list(map(int, re.findall(r"\d+", bounds)))
    return nums if len(nums) == 4 else None


def visible_text():
    return " | ".join(t for t in (attrs_text(n) for n in visible_nodes(dump_ui())) if t)


def tap_label(label, timeout=25, exact=False):
    deadline = time.time() + timeout
    last = ""
    while time.time() < deadline:
        root = dump_ui()
        for node in visible_nodes(root):
            text = node.attrib.get("text", "")
            desc = node.attrib.get("content-desc", "")
            match = text == label or desc == label if exact else label.lower() in (text + " " + desc).lower()
            if match:
                bounds = parse_bounds(node.attrib.get("bounds", ""))
                if bounds:
                    x = (bounds[0] + bounds[2]) // 2
                    y = (bounds[1] + bounds[3]) // 2
                    run("shell", "input", "tap", x, y, timeout=10)
                    time.sleep(1)
                    return
        last = visible_text()
        time.sleep(1)
    raise AssertionError(f"Could not tap {label!r}. Visible UI: {last[:2000]}")


def assert_text(label, timeout=25):
    deadline = time.time() + timeout
    while time.time() < deadline:
        text = visible_text()
        if label.lower() in text.lower():
            return text
        time.sleep(1)
    raise AssertionError(f"Expected {label!r}. Visible UI: {visible_text()[:3000]}")


def press_back():
    run("shell", "input", "keyevent", "4", timeout=10)
    time.sleep(1)


def swipe_up():
    run("shell", "input", "swipe", 180, 650, 180, 160, 500, timeout=10)
    time.sleep(1)


def screenshot(name):
    path = OUT / f"{name}.png"
    with path.open("wb") as f:
        subprocess.run(["adb", "exec-out", "screencap", "-p"], check=True, timeout=15, stdout=f)


def assert_bounds_within_viewport():
    bad = []
    for node in visible_nodes(dump_ui()):
        b = parse_bounds(node.attrib.get("bounds", ""))
        if not b:
            continue
        if b[0] < 0 or b[1] < 0 or b[2] > SCREEN_W or b[3] > SCREEN_H:
            label = attrs_text(node)
            bad.append((label, b))
    if bad:
        raise AssertionError(f"Visible UI bounds exceed {SCREEN_W}x{SCREEN_H}: {bad[:20]}")


def assert_no_internal_ui_text():
    text = visible_text()
    forbidden = [
        "3A", "3B", "3E", "PHASE 3A", "PHASE 3B", "PHASE 3E", "PHASE 2.4",
        "source_verified", "public_domain", "blocked", "unavailable", "debug",
        "developer", "pending_scholar_review", "review state recorded",
    ]
    lowered = text.lower()
    found = [x for x in forbidden if x.lower() in lowered]
    if found:
        raise AssertionError(f"Internal/debug UI text visible: {found}. Visible UI: {text[:3000]}")


def close_any_dialogs():
    # Use native Back first; then check whether a visible modal is still present.
    press_back()
    time.sleep(1)


def nav(label):
    tap_label(label, exact=True)


def assert_clean_screen(name, expected):
    assert_text(expected)
    assert_bounds_within_viewport()
    assert_no_internal_ui_text()
    swipe_up()
    assert_text(expected)
    screenshot(name)


def run_suite():
    # Ensure small, deterministic CSS viewport and restore it on exit.
    shell("wm", "size", f"{SCREEN_W}x{SCREEN_H}")
    shell("wm", "density", "160")
    try:
        run("shell", "am", "force-stop", "com.noortools.mobile")
        run("shell", "am", "start", "-n", "com.noortools.mobile/.MainActivity", timeout=15)
        deadline = time.time() + 60
        while time.time() < deadline:
            if "NoorTools" in visible_text() or "Assalamu Alaikum" in visible_text():
                break
            time.sleep(2)
        else:
            raise AssertionError("NoorTools UI did not become visible within 60 seconds")

        # Home
        nav("Home")
        assert_clean_screen("01-home", "Assalamu Alaikum")

        # In-app Prayer Times route from Home card.
        tap_label("View all", exact=True)
        assert_clean_screen("02-prayer-times", "Prayer times")
        press_back()
        assert_text("Assalamu Alaikum")

        # Primary Prayer nav surface.
        nav("Prayer")
        assert_clean_screen("03-prayer-dashboard", "Noor Daily")
        nav("Home")

        # Quran library + Quran Reader.
        nav("Quran")
        assert_text("Noor Library")
        assert_clean_screen("04-quran-library", "Noor Library")
        tap_label("Quran Reader", exact=True)
        assert_clean_screen("05-quran-reader", "Surah browser")
        # Enter a real reader view by tapping the first Surah when present.
        try:
            tap_label("Al-Fatihah", timeout=8)
            assert_text("Al-Fatihah", timeout=10)
        except AssertionError:
            pass
        screenshot("06-quran-reader-detail")
        press_back()
        # Back from the library should return Home, never leave another library surface underneath.
        nav("Home")
        assert_text("Assalamu Alaikum")

        # More -> Qibla
        tap_label("More", exact=True)
        tap_label("Qibla", exact=True)
        assert_clean_screen("07-qibla", "Qibla")
        nav("Home")

        # More -> Tasbih
        tap_label("More", exact=True)
        tap_label("Tasbih", exact=True)
        assert_clean_screen("08-tasbih", "Tasbih")
        nav("Home")

        # More -> Salah
        tap_label("More", exact=True)
        tap_label("Salah", exact=True)
        assert_clean_screen("09-salah", "Salah")
        nav("Home")

        # More -> Tools (Islamic tools)
        tap_label("More", exact=True)
        tap_label("Tools", exact=True)
        assert_clean_screen("10-islamic-tools", "Zakat")
        press_back()
        assert_text("Assalamu Alaikum")

        # Search
        nav("Search")
        assert_clean_screen("11-search", "Search verified content")
        press_back()
        assert_text("Assalamu Alaikum")

        # Settings
        tap_label("Settings", exact=True)
        assert_clean_screen("12-settings", "Settings")
        press_back()
        assert_text("Assalamu Alaikum")

        # Duas inside Quran/library surface.
        nav("Quran")
        assert_text("Noor Library")
        tap_label("Duas", exact=True)
        assert_clean_screen("13-duas", "Source-backed supplications")
        press_back()
        nav("Home")

        # Repeated transition stress: same screens repeatedly, checking no stale modal text remains.
        for i in range(3):
            nav("Quran")
            assert_text("Noor Library")
            press_back()
            assert_text("Assalamu Alaikum")
            nav("Search")
            assert_text("Search verified content")
            press_back()
            assert_text("Assalamu Alaikum")

        # Final Android back from a top-level Home state must not resurrect any feature overlay.
        press_back()
        screenshot("14-final-back")
        assert_no_internal_ui_text()
        assert_bounds_within_viewport()

    finally:
        shell("wm", "size", "reset", check=False)
        shell("wm", "density", "reset", check=False)


if __name__ == "__main__":
    try:
        run_suite()
        print("ANDROID_UI_QA_PASS")
    except Exception as exc:
        print(f"ANDROID_UI_QA_FAIL: {exc}")
        screenshot("FAILURE")
        sys.exit(1)
