#!/usr/bin/env python3
"""Refresh the Tistory (music-in.tistory.com) entries in songs_data.js.

Tistory image links are signed and expire at the end of each month, so this
script must be re-run every month (ideally on the 1st). It reads the blog's
sitemap, fetches every post, pulls the sheet-music images out of the post body
and rewrites only the "tistory" entries in songs_data.js. Naver and hymn
entries are left untouched.

Usage:  python3 crawl_tistory.py                 (no extra packages needed)
        python3 crawl_tistory.py --if-expiring   (skip unless links expire within 6h)
"""
import concurrent.futures
import html
import json
import re
import sys
import time
import urllib.request
from pathlib import Path

BLOG = "https://music-in.tistory.com"
DATA_FILE = Path(__file__).with_name("songs_data.js")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
WORKERS = 4
DELAY = 0.3  # seconds between requests per worker


def fetch(url, retries=3):
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:  # noqa: BLE001
            if attempt == retries - 1:
                raise
            time.sleep(2 * (attempt + 1))


def post_numbers():
    xml = fetch(f"{BLOG}/sitemap.xml")
    nums = {int(n) for n in re.findall(r"<loc>https://music-in\.tistory\.com/(\d+)</loc>", xml)}
    return sorted(nums)


def parse_post(num):
    page = fetch(f"{BLOG}/{num}")
    time.sleep(DELAY)
    m = re.search(r'<meta property="og:title" content="([^"]*)"', page)
    title = html.unescape(m.group(1)) if m else f"post {num}"
    title = re.sub(r"^\[[^\]]*\]\s*", "", title).strip()  # drop "[찬양 악보] "

    start = page.find("tt_article_useless_p_margin")
    if start < 0:
        return num, title, []
    body = page[start:]
    end = body.find('<div class="container_postbtn')
    if end > 0:
        body = body[:end]

    # Covers single images (imageblock), side-by-side grids (imagegridblock)
    # and images wrapped in a link (<a><img src>). Same image appears as both
    # data-url and src, so de-duplicate on the path (signature varies).
    images, seen = [], set()
    for u in re.findall(r'(?:data-url|src)="(https://blog\.kakaocdn\.net/dna/[^"]+)"', body):
        u = html.unescape(u)
        path = u.split("?")[0]
        if path not in seen:
            seen.add(path)
            images.append(u)
    return num, title, images


def soonest_expiry(songs):
    stamps = [int(m.group(1)) for s in songs if s.get("source") == "tistory"
              for m in [re.search(r"[?&]expires=(\d+)", s["image_url"])] if m]
    return min(stamps) if stamps else 0


def main():
    src = DATA_FILE.read_text(encoding="utf-8")
    songs = json.loads(src[src.index("["): src.rindex("]") + 1])
    others = [s for s in songs if s.get("source") != "tistory"]
    old_count = len(songs) - len(others)

    # --if-expiring: only crawl when some link has expired or will within 6 hours
    # (used by the daily GitHub Action so it does nothing most days).
    if "--if-expiring" in sys.argv:
        left = soonest_expiry(songs) - time.time()
        if left > 6 * 3600:
            print(f"Links still valid for {left / 86400:.1f} days; nothing to do.")
            return

    nums = post_numbers()
    print(f"sitemap: {len(nums)} posts", flush=True)

    results, failed = {}, []
    with concurrent.futures.ThreadPoolExecutor(WORKERS) as pool:
        futs = {pool.submit(parse_post, n): n for n in nums}
        for i, f in enumerate(concurrent.futures.as_completed(futs), 1):
            n = futs[f]
            try:
                results[n] = f.result()
            except Exception as e:  # noqa: BLE001
                failed.append(n)
                print(f"  failed {n}: {e}", file=sys.stderr)
            if i % 100 == 0:
                print(f"  {i}/{len(nums)}", flush=True)

    tistory = []
    for n in sorted(results):
        _, title, images = results[n]
        for u in images:
            tistory.append({"id": f"T-{n}", "title": title, "image_url": u, "source": "tistory"})

    if len(tistory) < old_count * 0.8:
        sys.exit(f"Only {len(tistory)} images found (was {old_count}); not writing. Check the blog layout.")

    out = "const ALL_SONGS = " + json.dumps(tistory + others, ensure_ascii=False, indent=2) + ";\n"
    DATA_FILE.write_text(out, encoding="utf-8")
    print(f"tistory images: {old_count} -> {len(tistory)} from {len(results)} posts; failed posts: {failed}")


if __name__ == "__main__":
    main()
