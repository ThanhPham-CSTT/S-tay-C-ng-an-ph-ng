#!/usr/bin/env python3
"""Build a reproducible checksum manifest for the V13.4 field-pilot package."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "RELEASE_MANIFEST_V13_4.json"
EXCLUDED = {OUTPUT.name}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main() -> None:
    files = []
    for path in sorted(p for p in ROOT.rglob("*") if p.is_file()):
        rel = path.relative_to(ROOT).as_posix()
        if path.name in EXCLUDED or rel.startswith(".git/") or "__pycache__" in path.parts:
            continue
        files.append({
            "path": rel,
            "bytes": path.stat().st_size,
            "sha256": sha256(path),
        })

    test_report = json.loads((ROOT / "TEST_REPORT_V13_4.json").read_text(encoding="utf-8"))
    audit_report = json.loads((ROOT / "DATA_AUDIT_REPORT_V13_4.json").read_text(encoding="utf-8"))
    manifest = {
        "release": "V13.4 Field Pilot & Legal Integrity Edition",
        "built_at": datetime.now(timezone.utc).isoformat(),
        "entrypoint": "index.html",
        "offline_capable": True,
        "privacy_mode": "memory-only; no localStorage/sessionStorage; idle clear after 30 minutes",
        "test_status": test_report.get("status"),
        "test_assertions": test_report.get("assertions"),
        "rows": audit_report.get("rows"),
        "nd168_nd238_rows": audit_report.get("nd168_rows"),
        "files": files,
    }
    OUTPUT.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "PASS", "files": len(files), "output": OUTPUT.name}, ensure_ascii=False))


if __name__ == "__main__":
    main()
