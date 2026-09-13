"""Record the FieldPulse engineer-capture → PM dashboard workflow as a video."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "docs" / "demo"
SAMPLE = OUT_DIR / "site-excavation.jpg"
VIDEO_DIR = OUT_DIR / "video-raw"
BASE = "http://localhost:3000"


def make_sample_photo() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    img = Image.new("RGB", (1280, 720), (32, 48, 64))
    draw = ImageDraw.Draw(img)
    draw.rectangle([80, 120, 1200, 580], outline=(245, 158, 11), width=8)
    draw.rectangle([200, 250, 1080, 480], fill=(71, 85, 105))
    try:
        font = ImageFont.truetype("arial.ttf", 42)
        small = ImageFont.truetype("arial.ttf", 28)
    except OSError:
        font = ImageFont.load_default()
        small = font
    draw.text((180, 40), "FieldPulse AI — Site Evidence", fill=(255, 255, 255), font=font)
    draw.text((220, 320), "EXC-01  Site Excavation Phase 1", fill=(253, 224, 71), font=font)
    draw.text((220, 390), "Assam pipeline corridor — progress photo", fill=(226, 232, 240), font=small)
    img.save(SAMPLE, "JPEG", quality=88)


def record() -> None:
    from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout

    make_sample_photo()
    VIDEO_DIR.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": 1440, "height": 900},
            record_video_dir=str(VIDEO_DIR),
            record_video_size={"width": 1440, "height": 900},
        )
        page = context.new_page()
        page.set_default_timeout(25000)

        # 1. Landing
        page.goto(BASE)
        page.wait_for_timeout(1800)

        # 2. Engineer login
        page.goto(f"{BASE}/login-engineer")
        page.wait_for_timeout(800)
        page.locator('input[type="tel"]').fill("+91 98765 43210")
        page.get_by_role("button", name="Send OTP").click()
        page.wait_for_timeout(1500)
        page.locator('input[inputmode="numeric"]').fill("123456")
        page.get_by_test_id("engineer-verify-otp").click()
        page.wait_for_url("**/engineer/**", timeout=20000)
        page.wait_for_timeout(1600)

        # 3. Capture photo from gallery
        page.goto(f"{BASE}/engineer/capture")
        page.wait_for_timeout(1000)
        page.get_by_test_id("engineer-gallery-input").set_input_files(str(SAMPLE))
        page.wait_for_timeout(800)
        notes = page.get_by_test_id("capture-notes")
        notes.fill("Site Excavation Phase 1 complete for corridor A. Earthwork progressing.")
        page.wait_for_timeout(600)
        page.get_by_test_id("capture-submit").click()
        page.wait_for_timeout(4000)

        # 4. Submissions
        page.goto(f"{BASE}/engineer/my-submissions")
        page.wait_for_timeout(1800)

        # 5. Logout via landing + PM login
        page.goto(f"{BASE}/login-office")
        page.wait_for_timeout(800)
        page.get_by_placeholder("you@fieldpulse.dev").fill("pm@fieldpulse.dev")
        page.locator('input[type="password"]').fill("Password123!")
        page.get_by_test_id("office-sign-in").click()
        try:
            page.wait_for_url("**/pm/**", timeout=20000)
        except PlaywrightTimeout:
            page.wait_for_timeout(2000)

        page.wait_for_timeout(1800)
        page.goto(f"{BASE}/pm/review-queue")
        page.wait_for_timeout(2000)

        first_card = page.locator("div.card.p-4.cursor-pointer").first
        if first_card.count():
            first_card.click()
            page.wait_for_timeout(1000)
            pct = page.locator('input[type="number"], input[placeholder*="percent" i]')
            if pct.count():
                pct.first.fill("60")
            approve = page.get_by_role("button", name="Approve")
            if approve.count():
                approve.click()
                page.wait_for_timeout(2000)

        page.goto(f"{BASE}/pm/dashboard")
        page.wait_for_timeout(3500)

        context.close()
        browser.close()

    videos = list(VIDEO_DIR.glob("*.webm"))
    dest = OUT_DIR / "fieldpulse-engineer-to-pm-workflow.webm"
    if videos:
        latest = max(videos, key=lambda p: p.stat().st_mtime)
        if dest.exists():
            dest.unlink()
        latest.replace(dest)
        print(f"VIDEO_SAVED {dest}")
    else:
        print("VIDEO_MISSING")


if __name__ == "__main__":
    record()
