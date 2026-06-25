#!/usr/bin/env python3
"""
Apex Trophy Solutions — Dropbox Full Import v4
Reads the LIVE Dropbox structure on this Mac and syncs everything to Supabase.

What it does:
  • Scans 01 Export Client Invoices  (all years 2017-2026)
  • Scans 02 Local Clients Invoices  (all years 2018-2026)
  • One CLIENT record per person (merged across years)
  • One HUNT record per WI/T/LT folder (with Dropbox path + job refs)
  • One DOCUMENT record per file in each folder (categorised)
  • Sets client_type = local / export from which folder it came from
  • Reads info sheets (.xlsx) for contact details

Usage:
  1. Paste your Supabase service_role key into SUPABASE_KEY below
  2. Run:  python3 scripts/import-dropbox-data.py
  3. Remove the key from this file when done — NEVER commit it
"""

import os, re, zipfile, xml.etree.ElementTree as ET, requests, json, sys
from pathlib import Path
from datetime import datetime

# ── CONFIG ──────────────────────────────────────────────────────────────────
SUPABASE_URL = "https://kpbtydfkqrrtbpwxvbep.supabase.co"
SUPABASE_KEY = ""   # ← paste service_role key here before running

DROPBOX_ROOT = Path.home() / "Library/CloudStorage/Dropbox/Colletts SA"

SCAN_ROOTS = {
    "01 Export Client Invoices": "export",
    "02 Local Clients Invoices": "local",
}

# ── FILE CATEGORISATION ──────────────────────────────────────────────────────
def categorise_file(name: str) -> object:
    """Return doc_type string or None if the file should be skipped."""
    n = name.lower()
    # Skip noise
    if any(x in n for x in ["terms and conditions", "process report", "company profile",
                             "banking details", "list of clients", "commission", ".lnk",
                             "info sheet", "info_sheet", "deadlines", "price list"]):
        return None
    # Categorise
    if any(x in n for x in ["receiving sheet", "receiving sh", "receving sheet", "trophies received"]):
        return "receiving_sheet"
    if any(x in n for x in ["job card", "jobcard", "hunt report", "hunt job"]):
        return "job_card"
    if any(x in n for x in ["packing list", "packlist", "commercial packing"]):
        return "packing_list"
    if any(x in n for x in ["invoice", "pro-forma", "proforma", "statement", "running statement", "quote "]):
        return "invoice"
    if any(x in n for x in ["cites", "tops", "cit permit"]):
        return "cites"
    if any(x in n for x in ["permit", "hunting register", "hunt register", "hunting licence",
                             "hunting license", "written permission", "permission to hunt",
                             "hunting rights", "transfer of hunting", "fencing certificate",
                             "croc tag", "protected species", "tops species",
                             "ais permit", "provincial", "mpumalanga"]):
        return "permit"
    if any(x in n for x in ["import permit", "sarb", "it2", "it25", "it24"]):
        return "import_permit"
    # Photos — only flag as arrival if clearly an animal/hunt photo
    ext = name.rsplit(".", 1)[-1].lower() if "." in name else ""
    if ext in ("jpg", "jpeg", "png"):
        return "arrival_photo"
    if ext in ("pdf", "docx", "doc", "xlsx", "xls", "msg"):
        return "other"
    return None

# ── EXCEL HELPERS ────────────────────────────────────────────────────────────
EXCEL_ERRORS = {"#ref!", "#value!", "#name?", "#n/a", "#div/0!", "#null!", "#num!"}

def is_clean(val) -> bool:
    s = str(val).strip()
    if not s or s in ("0", "nan", "None"): return False
    if s.lower() in EXCEL_ERRORS: return False
    if s.startswith("="): return False
    cleaned = s.replace(",", "").replace(".", "").replace("+", "").replace("-", "").replace(" ", "")
    if cleaned.isdigit() and len(cleaned) < 5: return False
    return True

def xlsx_strings(z):
    try:
        with z.open("xl/sharedStrings.xml") as f:
            NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
            return ["".join(t.text or "" for t in si.iter(f"{{{NS}}}t"))
                    for si in ET.parse(f).findall(f".//{{{NS}}}si")]
    except Exception:
        return []

def sheet_rows(z, sheet="sheet1.xml", strings=None):
    strings = strings or []
    try:
        with z.open(f"xl/worksheets/{sheet}") as f:
            NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
            rows = []
            for row in ET.parse(f).findall(f".//{{{NS}}}row"):
                cells = []
                for c in row.findall(f"{{{NS}}}c"):
                    v = c.find(f"{{{NS}}}v")
                    if v is not None and v.text is not None:
                        cells.append(strings[int(v.text)] if c.get("t") == "s" else v.text)
                    else:
                        cells.append("")
                rows.append(cells)
            return rows
    except Exception:
        return []

def label_after(rows, *labels) -> str:
    """Find value after any of the given labels in the sheet."""
    for label in labels:
        ll = label.lower()
        for row in rows:
            for i, c in enumerate(row):
                if ll in str(c).lower() and i + 1 < len(row):
                    val = str(row[i + 1]).strip()
                    if val and is_clean(val):
                        return val
    return ""

def parse_info_sheet(xlsx_path: Path) -> dict:
    data = {"client_name": "", "email": "", "phone": "", "address": "",
            "operator": "", "ph": "", "country": "", "hunt_area": "", "species": []}
    try:
        with zipfile.ZipFile(xlsx_path) as z:
            strings = xlsx_strings(z)
            s1 = sheet_rows(z, "sheet1.xml", strings)
            try:
                s2 = sheet_rows(z, "sheet2.xml", strings)
            except Exception:
                s2 = []
            all_rows = s1 + s2

            data["client_name"] = label_after(all_rows, "client name:", "client:", "name:")
            data["email"]       = label_after(all_rows, "e-mail", "email:", "email address")
            data["phone"]       = label_after(all_rows, "phone number", "tel no", "telephone", "cell", "mobile")
            data["address"]     = label_after(all_rows, "address:")
            data["operator"]    = label_after(all_rows, "safari operator", "operator:", "outfitter")
            data["ph"]          = label_after(all_rows, "ph:", "professional hunter", "p.h.")
            data["country"]     = label_after(all_rows, "country of import", "country:")
            data["hunt_area"]   = label_after(all_rows, "area hunted", "hunt area", "hunting area")

            # Collect species rows
            collecting = False
            for row in s1:
                row_text = " ".join(str(c) for c in row).lower()
                if "trophy received" in row_text and ("item" in row_text or "species" in row_text):
                    collecting = True; continue
                if collecting and row:
                    species = str(row[0]).strip()
                    if not species or "trophy" in species.lower():
                        continue
                    if is_clean(species) and not species[0].isdigit():
                        data["species"].append(species)
    except Exception:
        pass
    return data

# ── FOLDER NAME PARSER ───────────────────────────────────────────────────────
def parse_folder_name(folder_name: str, client_type: str) -> object:
    """
    Parse a hunt folder name like:
      WI 4825 Verlin Ray E774 - E778-Steve handles this client
      WI 1825 Jimmy van Zyl L204
      LT0225 Deirdre Matthews L178-Steve to advise cost
      T3224 Verlin Ray E667, 668, 669, 670-job card issued
    Returns dict with: wi_ref, client_name, job_refs, notes, handler
    """
    name = folder_name.strip()

    # Match: WI XXXX / LT XXXX / T XXXX
    m = re.match(r'^(WI\s+\d+|LT\s*\d+|T\s*\d+)\s+(.*)', name, re.I)
    if not m:
        return None

    wi_ref = re.sub(r'\s+', ' ', m.group(1).strip().upper())
    rest   = m.group(2).strip()

    # Extract all E### / L### job references
    job_refs = re.findall(r'[EL]\d{3,}', rest)

    # Known handlers to strip from client name
    handlers_pattern = r'[-–]\s*(Steve|Jimmy|Gerrie|G Pretorius|Aubrey|HP|Johan|julian)\b.*'
    handler_m = re.search(handlers_pattern, rest, re.I)
    handler = handler_m.group(1).strip() if handler_m else ""

    # Strip job refs and handler/notes from the client name
    # Client name = everything before first E### or L### or - followed by note
    client_part = re.sub(r'\s+[EL]\d{3,}.*', '', rest)    # cut at job ref
    client_part = re.sub(r'\s*[-–].*$', '', client_part)  # cut at dash
    client_name = client_part.strip()

    # Fallback: use the full rest minus refs
    if not client_name:
        client_name = re.sub(r'[EL]\d{3,}', '', rest).strip(' -–')

    # Notes = everything after the client name block
    notes_m = re.search(r'[-–]\s*(.+)$', name)
    notes = notes_m.group(1).strip() if notes_m else ""

    if not client_name or len(client_name) < 2:
        return None

    return {
        "wi_ref":      wi_ref,
        "client_name": client_name,
        "job_refs":    job_refs,
        "handler":     handler,
        "notes":       notes,
    }

# ── SUPABASE HELPERS ─────────────────────────────────────────────────────────
def headers():
    return {
        "apikey":        SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type":  "application/json",
        "Prefer":        "return=representation",
    }

def sb_get(path: str):
    r = requests.get(f"{SUPABASE_URL}/rest/v1/{path}", headers=headers())
    return r.json() if r.status_code == 200 else []

def sb_post(table: str, payload: dict) -> dict:
    r = requests.post(f"{SUPABASE_URL}/rest/v1/{table}", headers=headers(), json=payload)
    if r.status_code in (200, 201):
        rows = r.json()
        return rows[0] if isinstance(rows, list) and rows else {}
    return {"_error": r.text[:200]}

def sb_patch(table: str, match: str, payload: dict):
    r = requests.patch(f"{SUPABASE_URL}/rest/v1/{table}?{match}",
                       headers=headers(), json=payload)
    return r.status_code in (200, 204)

# ── MAIN LOGIC ───────────────────────────────────────────────────────────────
def main():
    print("\n🦌  Apex Trophy Solutions — Dropbox Full Import v4")
    print("=" * 60)

    if not SUPABASE_KEY:
        print("\n❌  Paste your service_role key into SUPABASE_KEY on line 37 first!")
        sys.exit(1)

    if not DROPBOX_ROOT.exists():
        print(f"\n❌  Dropbox not found at: {DROPBOX_ROOT}")
        sys.exit(1)

    # ── Load existing clients ─────────────────────────────────────────────
    print("\n📡  Loading existing clients from Supabase…")
    existing_clients = sb_get("clients?select=id,full_name,client_type,email,phone")
    client_by_name = {c["full_name"].lower().strip(): c for c in existing_clients}
    print(f"    {len(existing_clients)} existing clients")

    # Load existing hunts to avoid duplicates
    existing_hunts = sb_get("client_hunts?select=id,ref_number,client_id")
    hunt_by_ref = {h["ref_number"].upper().strip(): h for h in existing_hunts}
    print(f"    {len(existing_hunts)} existing hunts")

    # Load existing docs to avoid duplicates
    existing_docs = sb_get("hunt_documents?select=id,hunt_id,title")
    doc_keys = {(d["hunt_id"], d["title"].lower()[:60]) for d in existing_docs}
    print(f"    {len(existing_docs)} existing documents\n")

    stats = {
        "clients_new": 0, "clients_updated": 0,
        "hunts_new": 0, "hunts_skipped": 0,
        "docs_new": 0, "docs_skipped": 0,
        "by_year": {}, "by_type": {"export": 0, "local": 0},
    }

    # ── Scan Dropbox ──────────────────────────────────────────────────────
    for scan_dir, client_type in SCAN_ROOTS.items():
        base = DROPBOX_ROOT / scan_dir
        if not base.exists():
            print(f"⚠️  Not found: {base}")
            continue

        print(f"\n{'='*60}")
        print(f"📂  {scan_dir}  [{client_type.upper()}]")
        print(f"{'='*60}")

        # Iterate years
        for year_dir in sorted(base.iterdir()):
            if not year_dir.is_dir() or not re.match(r'^\d{4}$', year_dir.name):
                continue
            year = year_dir.name

            # Iterate client folders inside year
            for folder in sorted(year_dir.iterdir()):
                if not folder.is_dir():
                    continue

                parsed = parse_folder_name(folder.name, client_type)
                if not parsed:
                    # Check for sub-folders that are client folders (e.g. 01 Taxidermy/T###...)
                    for sub in sorted(folder.iterdir()):
                        if not sub.is_dir():
                            continue
                        parsed_sub = parse_folder_name(sub.name, client_type)
                        if parsed_sub:
                            process_hunt_folder(
                                sub, year, client_type, parsed_sub,
                                client_by_name, hunt_by_ref, doc_keys, stats
                            )
                    continue

                process_hunt_folder(
                    folder, year, client_type, parsed,
                    client_by_name, hunt_by_ref, doc_keys, stats
                )

    # ── Summary ──────────────────────────────────────────────────────────
    print(f"\n{'='*60}")
    print(f"✅  IMPORT COMPLETE")
    print(f"{'='*60}")
    print(f"   Clients:  {stats['clients_new']} new  |  {stats['clients_updated']} updated")
    print(f"   Hunts:    {stats['hunts_new']} new  |  {stats['hunts_skipped']} already existed")
    print(f"   Documents:{stats['docs_new']} new  |  {stats['docs_skipped']} already existed")
    print(f"   Export hunts: {stats['by_type']['export']}  |  Local hunts: {stats['by_type']['local']}")
    if stats["by_year"]:
        print(f"\n   Hunts by year:")
        for y in sorted(stats["by_year"].keys()):
            print(f"     {y}: {stats['by_year'][y]}")
    print(f"\n⚠️   Remember to remove SUPABASE_KEY from this file!")


def process_hunt_folder(folder: Path, year: str, client_type: str, parsed: dict,
                         client_by_name: dict, hunt_by_ref: dict, doc_keys: set, stats: dict):
    """Upsert client + hunt + documents for one WI folder."""
    client_name = parsed["client_name"]
    wi_ref      = parsed["wi_ref"]
    job_refs    = parsed["job_refs"]
    handler     = parsed["handler"]
    notes       = parsed["notes"]

    # Find info sheet
    info_sheet = None
    for f in folder.iterdir():
        if f.suffix.lower() == ".xlsx" and "info" in f.name.lower():
            info_sheet = f
            break

    sheet = parse_info_sheet(info_sheet) if info_sheet else {}

    # Merge name: prefer sheet name if longer and cleaner
    sheet_name = sheet.get("client_name", "").strip()
    final_name = sheet_name if (sheet_name and len(sheet_name) > 2) else client_name
    if not final_name or len(final_name) < 2:
        return

    email   = sheet.get("email", "")   if is_clean(sheet.get("email", ""))   else ""
    phone   = sheet.get("phone", "")   if is_clean(sheet.get("phone", ""))   else ""
    country = sheet.get("country", "") if is_clean(sheet.get("country", "")) else ""
    operator= sheet.get("operator", "") or ""
    ph      = sheet.get("ph", "")      or handler or ""
    area    = sheet.get("hunt_area", "") or ""
    species = sheet.get("species", [])

    # Relative Dropbox path for deep linking
    rel_path = str(folder.relative_to(Path.home() / "Library/CloudStorage/Dropbox/Colletts SA"))

    # ── Upsert client ────────────────────────────────────────────────────
    name_key = final_name.lower().strip()
    if name_key in client_by_name:
        existing = client_by_name[name_key]
        client_id = existing["id"]
        patch = {}
        if not existing.get("email") and email:   patch["email"] = email
        if not existing.get("phone") and phone:   patch["phone"] = phone
        if client_type == "local" and existing.get("client_type") != "local":
            patch["client_type"] = "local"
        if patch:
            sb_patch("clients", f"id=eq.{client_id}", patch)
            stats["clients_updated"] += 1
    else:
        row = sb_post("clients", {
            "full_name":   final_name,
            "email":       email or None,
            "phone":       phone or None,
            "country":     country or None,
            "client_type": client_type,
            "notes":       notes or None,
        })
        if "_error" in row:
            print(f"   ❌  Client insert failed: {final_name}: {row['_error']}")
            return
        client_id = row.get("id")
        client_by_name[name_key] = row
        stats["clients_new"] += 1
        print(f"   ✅  New client: {final_name} [{client_type}]")

    # ── Upsert hunt ──────────────────────────────────────────────────────
    ref_key = wi_ref.upper().strip()
    if ref_key in hunt_by_ref:
        hunt_id = hunt_by_ref[ref_key]["id"]
        stats["hunts_skipped"] += 1
    else:
        notes_full = notes
        if job_refs:
            notes_full = (f"Job refs: {', '.join(job_refs)}. " + notes_full).strip()
        if species:
            notes_full += f" | Species: {', '.join(species[:10])}"

        hunt_row = sb_post("client_hunts", {
            "client_id":    client_id,
            "year":         year,
            "ref_number":   wi_ref,
            "operator":     operator or None,
            "ph":           ph or None,
            "country":      country or None,
            "hunt_area":    area or None,
            "dropbox_path": rel_path,
            "notes":        notes_full or None,
            "status":       "active",
        })
        if "_error" in hunt_row:
            print(f"   ❌  Hunt insert failed: {wi_ref}: {hunt_row['_error']}")
            return
        hunt_id = hunt_row.get("id")
        hunt_by_ref[ref_key] = hunt_row
        stats["hunts_new"] += 1
        stats["by_year"][year] = stats["by_year"].get(year, 0) + 1
        stats["by_type"][client_type] = stats["by_type"].get(client_type, 0) + 1
        print(f"   📁  Hunt: {wi_ref} | {final_name} | {year} | {client_type}")

    if not hunt_id:
        return

    # ── Catalogue files ──────────────────────────────────────────────────
    try:
        files = list(folder.iterdir())
    except PermissionError:
        return

    for f in sorted(files):
        if f.is_dir():
            continue  # sub-folders handled at parent level
        doc_type = categorise_file(f.name)
        if not doc_type:
            continue

        # Skip arrival photos — they go to client_photos table separately
        if doc_type == "arrival_photo":
            continue

        title_key = (hunt_id, f.name.lower()[:60])
        if title_key in doc_keys:
            stats["docs_skipped"] += 1
            continue

        doc_row = sb_post("hunt_documents", {
            "hunt_id":     hunt_id,
            "doc_type":    doc_type if doc_type in (
                "permit","cites","import_permit","job_card",
                "receiving_sheet","packing_list","invoice","other"
            ) else "other",
            "title":       f.name,
            "dropbox_path": str(f.relative_to(Path.home() / "Library/CloudStorage/Dropbox/Colletts SA")),
            "status":      "complete",
        })
        if "_error" not in doc_row:
            doc_keys.add(title_key)
            stats["docs_new"] += 1
        else:
            print(f"      ⚠️  Doc failed: {f.name[:50]}")


if __name__ == "__main__":
    main()
