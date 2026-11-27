"""Build nationwide parking snapshots for Firebase Hosting.

TDX credentials are read only from environment variables.  The generated JSON
contains public parking data and never contains the credentials.
"""

from __future__ import annotations

import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "api"))

from server import CITY_INFO, TDXClient, load_parking  # noqa: E402


OUTPUT_DIR = ROOT / "public" / "data" / "parking"


def main() -> None:
    client_id = os.environ.get("TDX_CLIENT_ID", "").strip()
    client_secret = os.environ.get("TDX_CLIENT_SECRET", "").strip()
    if not client_id or not client_secret:
        raise SystemExit("TDX_CLIENT_ID and TDX_CLIENT_SECRET are required")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    # Nationwide export intentionally runs much slower than interactive queries
    # so it stays below TDX free-plan burst limits.
    os.environ.setdefault("TDX_MIN_REQUEST_INTERVAL", "3.0")
    client = TDXClient(client_id, client_secret)
    generated_at = datetime.now(timezone.utc).isoformat()
    manifest_path = OUTPUT_DIR / "manifest.json"
    if manifest_path.exists():
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            manifest = {"cities": {}}
    else:
        manifest = {"cities": {}}
    manifest["generatedAt"] = generated_at
    requested = {item.strip() for item in os.environ.get("PARKLY_CACHE_CITIES", "").split(",") if item.strip()}
    selected_cities = [(code, info) for code, info in CITY_INFO.items() if not requested or code in requested]

    for index, (code, (name, lat, lon)) in enumerate(selected_cities, start=1):
        print(f"[{index:02d}/{len(selected_cities)}] {name} ({code})", flush=True)
        data, warnings = [], []
        for attempt in range(1, 4):
            data, warnings = load_parking(client, code, "all", lat, lon, 500.0, limit=0)
            if not warnings:
                break
            wait_seconds = 12 * attempt
            print(f"  TDX limited {len(warnings)} request(s); retrying in {wait_seconds}s", flush=True)
            time.sleep(wait_seconds)
        payload = {
            "data": data,
            "meta": {
                "city": code,
                "cityName": name,
                "count": len(data),
                "generatedAt": generated_at,
                "source": f"{name}政府資料／TDX 快取",
                "warnings": warnings,
            },
        }
        target = OUTPUT_DIR / f"{code}.json"
        target.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        manifest["cities"][code] = {"name": name, "count": len(data), "file": target.name}
        time.sleep(2.0)

    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"Created {len(selected_cities)} city snapshot(s) in {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
