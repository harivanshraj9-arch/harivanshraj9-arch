"""Capture 5 Play Store phone screenshots (1080x1920 PNG) to resources/play-store/.
Run: python3 /app/frontend/resources/screenshots.py
"""
import os
from playwright.sync_api import sync_playwright

OUT = "/app/frontend/resources/play-store"
os.makedirs(OUT, exist_ok=True)
BASE = "https://executive-board-3.preview.emergentagent.com"

TARGETS = [
    ("/", "01-dashboard.png"),
    ("/hrms", "02-hrms.png"),
    ("/billing", "03-billing.png"),
    ("/discom", "04-discom.png"),
    ("/admin/login", "05-admin.png"),
]

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1080, "height": 1920}, device_scale_factor=1)
        page = ctx.new_page()
        for path, fname in TARGETS:
            page.goto(f"{BASE}{path}", wait_until="networkidle", timeout=30000)
            page.wait_for_timeout(2000)
            out = os.path.join(OUT, fname)
            page.screenshot(path=out, full_page=False, type="png")
            size = os.path.getsize(out)
            print(f"  ✓ {fname} ({size//1024} KB)")
        browser.close()
    print(f"\nSaved to {OUT}")

if __name__ == "__main__":
    main()
