"""Remove contact details accidentally included in cached fare descriptions."""

from __future__ import annotations

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "api"))

from server import first_price, sanitize_public_text  # noqa: E402


def main() -> None:
    cache_dir = ROOT / "public" / "data" / "parking"
    changed_files = 0
    changed_records = 0

    for path in sorted(cache_dir.glob("*.json")):
        if path.name == "manifest.json":
            continue
        payload = json.loads(path.read_text(encoding="utf-8"))
        changed = False
        for item in payload.get("data", []):
            original = str(item.get("fare") or "")
            sanitized = sanitize_public_text(original)
            if sanitized == original:
                continue
            item["fare"] = sanitized
            item["price"] = first_price(sanitized)
            changed = True
            changed_records += 1
        if changed:
            path.write_text(
                json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
                encoding="utf-8",
            )
            changed_files += 1

    print(f"Sanitized {changed_records} record(s) in {changed_files} cache file(s).")


if __name__ == "__main__":
    main()
