#!/usr/bin/env python3
"""
Apex Trophy Solutions — Dropbox Data Importer
Scans all WI / T client folders and imports into Supabase.

Usage:
  python3 import-dropbox-data.py
"""

import os, re, zipfile, xml.etree.ElementTree as ET, requests, json
from datetime import datetime

# ── CONFIG ─────────────────────────────────────────────────────────────────
SUPABASE_URL = "https://kpbtydfkqrrtbpwxvbep.supabase.co"
SUPABASE_KEY = ""   # ← paste your Supabase service_role key here before running

DROPBOX_ROOT = os.path.expanduser(
    "~/Library/CloudStorage/Dropbox/Colletts SA"
)

SCAN_ROOTS = [
    "01 Export Client Invoices",   # international / export clients
    "02 Local Clients Invoices",   # local SA clients
]

# Set to e.g. ["2025","2026"] to only import recent years, or None for all
YEARS_FILTER = None

# ── EXCEL HELPERS ──────────────────────────────────────────────────────────

def xlsx_strings(z):
    try:
        with z.open("xl/sharedStrings.xml") as f:
            NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
            return [
                "".join(t.text or "" for t in si.iter(f"{{{NS}}}t"))
                for si in ET.parse(f).findall(f".//{{{NS}}}si")
            ]
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

EXCEL_ERRORS = {"#ref!", "#value!", "#name?", "#n/a", "#div/0!", "#null!", "#num!"}

def is_clean(val):
    """Return True if val is a real non-formula, non-error cell value."""
    s = str(val).strip()
    if not s or s == "0":
        return False
    if s.lower() in EXCEL_ERRORS:
        return False
    if s.startswith("="):
        return False
    if s.replace(",", "").replace(".", "").isdigit():
        return False
    return True

def find_after(rows, label):
    """Find the cell value immediately after a label in any row."""
    label_l = label.lower()
    for row in rows:
        for i, c in enumerate(row):
            if label_l in str(c).lower() and i + 1 < len(row):
                val = str(row[i + 1]).strip()
                if val and is_clean(val):
                    return val
    return ""

def parse_info_sheet(xlsx_path):
    data = {
        "client_name": "", "email": "", "phone": "", "address": "",
        "operator": "", "ph": "", "shipping_agent": "",
        "country": "", "area_hunted": "",
        "trophies": [], "invoice_total_usd": None,
    }
    try:
        with zipfile.ZipFile(xlsx_path) as z:
            strings = xlsx_strings(z)
            s1 = sheet_rows(z, "sheet1.xml", strings)
            s2 = sheet_rows(z, "sheet2.xml", strings)

            data["client_name"]    = find_after(s1, "client name:") or find_after(s1, "client:")  or find_after(s2, "client:")
            data["email"]          = find_after(s1, "e-mail")        or find_after(s2, "email:")
            data["phone"]          = find_after(s1, "phone number")  or find_after(s1, "tel no")
            data["address"]        = find_after(s1, "address:")
            data["operator"]       = find_after(s1, "safari operator") or find_after(s1, "operator:")
            data["ph"]             = find_after(s1, "ph:")
            data["shipping_agent"] = find_after(s1, "shipping agent")
            data["country"]        = find_after(s1, "country of import")
            data["area_hunted"]    = find_after(s1, "area hunted")

            # Trophy rows from sheet1
            collecting = False
            for row in s1:
                row_text = " ".join(str(c) for c in row).lower()
                if "trophy received" in row_text and "item" in row_text:
                    collecting = True; continue
                if collecting:
                    species = str(row[0]).strip() if row else ""
                    if not species or species.lower() in ("trophy received", "area hunted", ""):
                        continue
                    data["trophies"].append({
                        "species": species,
                        "item": str(row[1]).strip() if len(row) > 1 else "",
                        "notes": str(row[3]).strip() if len(row) > 3 else "",
                    })

            # Invoice total from sheet2
            for row in s2:
                row_text = " ".join(str(c) for c in row).lower()
                if "total" in row_text:
                    for c in reversed(row):
                        try:
                            data["invoice_total_usd"] = float(str(c).replace(",", "").strip())
                            break
                        except Exception:
                            continue
                    if data["invoice_total_usd"]:
                        break
    except Exception as e:
        pass
    return data

def find_xlsx(folder):
    for f in os.listdir(folder):
        if f.endswith(".xlsx") and ("info" in f.lower() or "sheet" in f.lower()):
            return os.path.join(folder, f)
    for f in os.listdir(folder):
        if f.endswith(".xlsx"):
            return os.path.join(folder, f)
    return None

# ── FOLDER NAME PARSING ────────────────────────────────────────────────────

def parse_folder(name, year, source):
    """
    Extract structured data from folder names like:
      WI 2826 Jason Richard Hagerty - Jimmy Nichols Safaris
      WI 0326 Deirdre Matthews L261 - Steve works with this client
      T0326 E835 Seth Burton Scholes
    """
    ref = client = outfitter = ref_num = notes = ""
    job_type = "export" if source == "01 Export Client Invoices" else "local"

    # WI format
    m = re.match(r"WI\s+(\d+)\s+(.*)", name, re.I)
    if m:
        ref = f"WI {m.group(1)}"
        rest = m.group(2).strip()
        # Extract reference number (E### or L###)
        ref_m = re.search(r"\b([EL]\d{3,})\b", rest)
        if ref_m:
            ref_num = ref_m.group(1)
            rest = rest.replace(ref_m.group(0), "").strip()
        # Split on " - " for outfitter / notes
        parts = re.split(r"\s+-\s+", rest, maxsplit=1)
        client = parts[0].strip()
        outfitter = parts[1].strip() if len(parts) > 1 else ""
        return dict(ref=ref, client=client, outfitter=outfitter,
                    ref_num=ref_num, job_type=job_type, year=year)

    # T format (taxidermy)
    m = re.match(r"T(\d+)\s+\w+\s+(.*)", name, re.I)
    if m:
        ref = f"T{m.group(1)}"
        client = m.group(2).strip()
        return dict(ref=ref, client=client, outfitter="",
                    ref_num="", job_type="taxidermy", year=year)

    return None

# ── SUPABASE ───────────────────────────────────────────────────────────────

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}

def sb_insert(table, payload):
    r = requests.post(f"{SUPABASE_URL}/rest/v1/{table}", headers=HEADERS, json=payload)
    if r.status_code in (200, 201):
        rows = r.json()
        return rows[0] if rows else {}, None
    return {}, r.text

# ── MAIN ───────────────────────────────────────────────────────────────────

def main():
    print("\n🦌  Apex Trophy Solutions — Data Importer")
    print("=" * 55)

    if not SUPABASE_KEY:
        print("\n❌  Add your SUPABASE_KEY to this script first!")
        return

    imported = skipped = 0
    all_clients = []

    for scan_root in SCAN_ROOTS:
        base = os.path.join(DROPBOX_ROOT, scan_root)
        if not os.path.isdir(base):
            print(f"⚠️  Not found: {base}")
            continue

        for year_entry in sorted(os.scandir(base), key=lambda e: e.name):
            if not year_entry.is_dir() or not re.match(r"\d{4}$", year_entry.name):
                continue
            year = year_entry.name
            if YEARS_FILTER and year not in YEARS_FILTER:
                continue

            print(f"\n📅  {year}  ({scan_root})")

            def scan_dir(folder):
                nonlocal imported, skipped
                try:
                    entries = sorted(os.scandir(folder), key=lambda e: e.name)
                except PermissionError:
                    return
                for entry in entries:
                    if not entry.is_dir():
                        continue
                    meta = parse_folder(entry.name, year, scan_root)
                    if not meta:
                        # Maybe a sub-folder like "01 Taxidermy" — recurse one level
                        scan_dir(entry.path)
                        continue

                    print(f"   📁  {entry.name[:60]}")

                    # Parse Excel
                    xlsx = find_xlsx(entry.path)
                    sheet = parse_info_sheet(xlsx) if xlsx else {}

                    raw_name    = sheet.get("client_name") or meta["client"]
                    client_name = raw_name if is_clean(raw_name) else meta["client"]
                    email       = sheet.get("email", "")
                    phone       = sheet.get("phone", "")
                    address     = sheet.get("address", "")
                    operator    = sheet.get("operator") or meta["outfitter"]

                    notes_parts = [f"Job ref: {meta['ref']}", f"Year: {year}"]
                    if operator:           notes_parts.append(f"Operator: {operator}")
                    if sheet.get("ph"):    notes_parts.append(f"PH: {sheet['ph']}")
                    if sheet.get("country"): notes_parts.append(f"Country: {sheet['country']}")
                    if meta.get("ref_num"): notes_parts.append(f"Ref: {meta['ref_num']}")

                    trophies = sheet.get("trophies", [])
                    trophy_summary = ", ".join(t["species"] for t in trophies if t["species"])

                    all_clients.append({
                        "folder": entry.name,
                        "year": year,
                        "source": scan_root,
                        "ref": meta["ref"],
                        "job_type": meta["job_type"],
                        "client_name": client_name,
                        "email": email,
                        "phone": phone,
                        "address": address,
                        "operator": operator,
                        "trophies": trophy_summary,
                        "notes": " | ".join(notes_parts),
                        "invoice_total_usd": sheet.get("invoice_total_usd"),
                    })

                    # Skip rows with no usable name
                    final_name = client_name if is_clean(client_name) else ""
                    if not final_name:
                        print(f"       ⚠️  Skipped (no valid name): {entry.name[:60]}")
                        skipped += 1
                        continue

                    # Push client to Supabase
                    payload = {
                        "full_name": final_name,
                        "email": email or None,
                        "phone": phone or None,
                        "address": address or None,
                        "notes": " | ".join(notes_parts),
                    }
                    row, err = sb_insert("clients", payload)
                    if err:
                        print(f"       ❌  {err[:80]}")
                        skipped += 1
                    else:
                        client_id = row.get("id", "?")
                        print(f"       ✅  {client_name or '(unnamed)'} → id={client_id}")
                        imported += 1

            scan_dir(year_entry.path)

    # Save a local backup JSON
    backup_path = os.path.expanduser("~/Desktop/apex-import-backup.json")
    with open(backup_path, "w") as f:
        json.dump(all_clients, f, indent=2)

    print(f"\n{'=' * 55}")
    print(f"✅  Imported : {imported} clients")
    print(f"⚠️   Skipped  : {skipped} clients")
    print(f"💾  Backup   : {backup_path}")
    print("\n🎉  Open the app → Clients to see all imported data.")

if __name__ == "__main__":
    main()
