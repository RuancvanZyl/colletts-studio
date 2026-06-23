#!/usr/bin/env python3
"""
Apex Trophy Solutions — Dropbox Data Importer
Run this on Steve's laptop where Dropbox is synced.
It scans all client folders and imports into Supabase.

Usage:
  pip install openpyxl requests
  python3 import-dropbox-data.py
"""

import os
import re
import json
import zipfile
import xml.etree.ElementTree as ET
import requests
from datetime import datetime

# ── CONFIG — fill these in ─────────────────────────────────────────────────
SUPABASE_URL  = "https://kpbtydfkqrrtbpwxvbep.supabase.co"
SUPABASE_KEY  = ""   # paste your anon key here

# Path to Dropbox on Steve's Mac — try these in order, first one that exists wins
DROPBOX_PATHS = [
    os.path.expanduser("~/Dropbox/Colletts SA/01 Export Client Invoices"),
    os.path.expanduser("~/Library/CloudStorage/Dropbox/Colletts SA/01 Export Client Invoices"),
    os.path.expanduser("~/Dropbox (Personal)/Colletts SA/01 Export Client Invoices"),
]

# Which years to import — set to None to import ALL years
YEARS_TO_IMPORT = None   # e.g. [2025, 2026] for only recent years

# ── HELPERS ────────────────────────────────────────────────────────────────

def find_dropbox():
    for p in DROPBOX_PATHS:
        if os.path.isdir(p):
            print(f"✅ Found Dropbox at: {p}")
            return p
    return None


def parse_xlsx_strings(z):
    """Extract shared strings table from xlsx."""
    try:
        with z.open("xl/sharedStrings.xml") as f:
            tree = ET.parse(f)
            ns = {"ns": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
            return [
                "".join(t.text or "" for t in si.iter("{http://schemas.openxmlformats.org/spreadsheetml/2006/main}t"))
                or (si.text or "")
                for si in tree.findall(".//ns:si", ns)
            ]
    except Exception:
        return []


def get_sheet_values(z, sheet_name, strings):
    """Return list of rows (each row = list of cell values)."""
    try:
        with z.open(f"xl/worksheets/{sheet_name}") as f:
            tree = ET.parse(f)
            ns = {"ns": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
            rows = []
            for row in tree.findall(".//ns:row", ns):
                cells = []
                for c in row.findall("ns:c", ns):
                    t = c.get("t")
                    v = c.find("ns:v", ns)
                    if v is not None and v.text is not None:
                        cells.append(strings[int(v.text)] if t == "s" else v.text)
                    else:
                        cells.append("")
                rows.append(cells)
            return rows
    except Exception:
        return []


def cell(rows, row_idx, col_idx, default=""):
    """Safely get a cell value."""
    try:
        val = rows[row_idx][col_idx]
        return str(val).strip() if val else default
    except (IndexError, TypeError):
        return default


def find_cell_containing(rows, text):
    """Find first cell containing text and return the cell to its right."""
    text_lower = text.lower()
    for row in rows:
        for i, c in enumerate(row):
            if text_lower in str(c).lower():
                if i + 1 < len(row):
                    return str(row[i + 1]).strip()
    return ""


def parse_info_sheet(xlsx_path):
    """Parse an Info sheet.xlsx and return a dict of client + job data."""
    data = {
        "client_name": "", "email": "", "phone": "", "address": "",
        "safari_operator": "", "ph": "", "shipping_agent": "",
        "country_of_import": "", "area_hunted": "",
        "trophies": [],   # list of {"species": ..., "item": ..., "notes": ...}
        "invoice_items": [],  # list of {"trophy": ..., "item": ..., "cost": ...}
        "invoice_total_usd": None,
        "raw_errors": [],
    }
    try:
        with zipfile.ZipFile(xlsx_path) as z:
            strings = parse_xlsx_strings(z)

            # Sheet 1 — intake form
            s1 = get_sheet_values(z, "sheet1.xml", strings)
            data["client_name"]     = find_cell_containing(s1, "client name") or find_cell_containing(s1, "client:")
            data["email"]           = find_cell_containing(s1, "e-mail")
            data["phone"]           = find_cell_containing(s1, "phone")
            data["address"]         = find_cell_containing(s1, "address")
            data["safari_operator"] = find_cell_containing(s1, "safari operator") or find_cell_containing(s1, "operator:")
            data["ph"]              = find_cell_containing(s1, "ph:")
            data["shipping_agent"]  = find_cell_containing(s1, "shipping agent")
            data["country_of_import"] = find_cell_containing(s1, "country of import")
            data["area_hunted"]     = find_cell_containing(s1, "area hunted")

            # Collect trophy rows from sheet1
            collecting = False
            for row in s1:
                row_text = " ".join(str(c) for c in row).lower()
                if "trophy received" in row_text and "item" in row_text:
                    collecting = True
                    continue
                if collecting and any(row):
                    species = str(row[0]).strip() if row else ""
                    item    = str(row[1]).strip() if len(row) > 1 else ""
                    notes   = str(row[3]).strip() if len(row) > 3 else ""
                    if species and species.lower() not in ("trophy received", ""):
                        data["trophies"].append({"species": species, "item": item, "notes": notes})

            # Sheet 2 — invoice
            s2 = get_sheet_values(z, "sheet2.xml", strings)
            data["client_name"] = data["client_name"] or find_cell_containing(s2, "client:")
            data["email"]       = data["email"]       or find_cell_containing(s2, "email:")

            collecting_inv = False
            for row in s2:
                row_text = " ".join(str(c) for c in row).lower()
                if "trophy" in row_text and "item" in row_text and "cost" in row_text:
                    collecting_inv = True
                    continue
                if collecting_inv and any(row):
                    trophy = str(row[0]).strip() if row else ""
                    item   = str(row[1]).strip() if len(row) > 1 else ""
                    cost   = str(row[3]).strip() if len(row) > 3 else ""
                    if trophy and trophy.lower() not in ("", "trophy"):
                        if "total" in trophy.lower():
                            try:
                                data["invoice_total_usd"] = float(cost.replace(",", ""))
                            except Exception:
                                pass
                            break
                        data["invoice_items"].append({"trophy": trophy, "item": item, "cost": cost})

    except Exception as e:
        data["raw_errors"].append(str(e))

    return data


def find_info_sheet(folder_path):
    """Find the Info sheet xlsx in a client folder."""
    for fname in os.listdir(folder_path):
        if fname.endswith(".xlsx") and ("info" in fname.lower() or "sheet" in fname.lower()):
            return os.path.join(folder_path, fname)
    # Fallback: any xlsx
    for fname in os.listdir(folder_path):
        if fname.endswith(".xlsx"):
            return os.path.join(folder_path, fname)
    return None


def parse_folder_name(folder_name):
    """
    Extract job number, year, client name, outfitter from folder name.
    Examples:
      WI 2826 Jason Richard Hagerty - Jimmy Nichols Safaris
      T0326 E835 Seth Burton Scholes
    """
    result = {"job_ref": "", "client_name": "", "outfitter": "", "job_type": "export"}

    # WI format
    wi_match = re.match(r"WI\s+(\d+)\s+(.+?)(?:\s+-\s+(.+))?$", folder_name, re.IGNORECASE)
    if wi_match:
        result["job_ref"]     = f"WI{wi_match.group(1)}"
        result["client_name"] = wi_match.group(2).strip()
        result["outfitter"]   = (wi_match.group(3) or "").strip()
        result["job_type"]    = "export"
        return result

    # T format (taxidermy local)
    t_match = re.match(r"T(\d+)\s+\w+\s+(.+)$", folder_name, re.IGNORECASE)
    if t_match:
        result["job_ref"]     = f"T{t_match.group(1)}"
        result["client_name"] = t_match.group(2).strip()
        result["job_type"]    = "local"
        return result

    result["client_name"] = folder_name
    return result


# ── SUPABASE ───────────────────────────────────────────────────────────────

HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation,resolution=merge-duplicates",
}


def upsert(table, data):
    r = requests.post(f"{SUPABASE_URL}/rest/v1/{table}", headers=HEADERS, json=data)
    if r.status_code not in (200, 201):
        return None, r.text
    rows = r.json()
    return (rows[0] if rows else {}), None


def find_or_create_client(client_name, email, phone, address, notes=""):
    if not client_name:
        return None
    payload = {
        "full_name": client_name,
        "email": email or None,
        "phone": phone or None,
        "address": address or None,
        "notes": notes or None,
    }
    row, err = upsert("clients", payload)
    if err:
        print(f"   ⚠️  Client error: {err}")
        return None
    return row.get("id")


# ── MAIN ───────────────────────────────────────────────────────────────────

def main():
    print("\n🦌  Apex Trophy Solutions — Data Importer")
    print("=" * 50)

    if not SUPABASE_KEY:
        print("\n❌  SUPABASE_KEY is empty!")
        print("   Open this script in a text editor and paste your Supabase anon key.")
        return

    dropbox_root = find_dropbox()
    if not dropbox_root:
        print("\n❌  Dropbox folder not found!")
        print("   Make sure the Dropbox desktop app is installed and synced.")
        print("   Expected path: ~/Dropbox/Colletts SA/01 Export Client Invoices")
        return

    imported = 0
    skipped  = 0
    errors   = []

    # Scan years
    for year_entry in sorted(os.scandir(dropbox_root), key=lambda e: e.name):
        if not year_entry.is_dir():
            continue
        year_name = year_entry.name
        if not re.match(r"\d{4}", year_name):
            continue
        if YEARS_TO_IMPORT and int(year_name) not in YEARS_TO_IMPORT:
            continue

        print(f"\n📅  {year_name}")

        # Scan subfolders (could be direct WI/T folders or inside 01 Taxidermy etc)
        def scan_for_clients(folder):
            nonlocal imported, skipped
            for entry in sorted(os.scandir(folder), key=lambda e: e.name):
                if not entry.is_dir():
                    continue
                name = entry.name
                # Skip meta-folders
                if name.startswith("0") and len(name) < 20 and not re.match(r"(WI|T)\d", name, re.I):
                    scan_for_clients(entry.path)
                    continue
                if not re.match(r"(WI|T)\d", name, re.I):
                    continue

                meta = parse_folder_name(name)
                info_path = find_info_sheet(entry.path)

                print(f"   📁  {name}")

                sheet_data = {}
                if info_path:
                    sheet_data = parse_info_sheet(info_path)
                    if sheet_data["raw_errors"]:
                        print(f"       ⚠️  Parse warning: {sheet_data['raw_errors']}")

                # Merge folder name data with sheet data
                client_name = sheet_data.get("client_name") or meta["client_name"]
                email       = sheet_data.get("email", "")
                phone       = sheet_data.get("phone", "")
                address     = sheet_data.get("address", "")
                outfitter   = sheet_data.get("safari_operator") or meta["outfitter"]

                notes_parts = []
                if outfitter:         notes_parts.append(f"Outfitter: {outfitter}")
                if meta.get("ph"):    notes_parts.append(f"PH: {meta['ph']}")
                if sheet_data.get("country_of_import"): notes_parts.append(f"Country: {sheet_data['country_of_import']}")
                if sheet_data.get("area_hunted"):        notes_parts.append(f"Area: {sheet_data['area_hunted']}")

                # Push to Supabase
                client_id = find_or_create_client(
                    client_name, email, phone, address,
                    notes=" | ".join(notes_parts)
                )

                if client_id:
                    print(f"       ✅  Client: {client_name} (id={client_id})")
                    imported += 1
                else:
                    print(f"       ❌  Failed to import: {client_name}")
                    errors.append(name)
                    skipped += 1

        scan_for_clients(year_entry.path)

    print(f"\n{'=' * 50}")
    print(f"✅  Imported:  {imported} clients")
    print(f"⚠️   Skipped:   {skipped} clients")
    if errors:
        print(f"\nFailed folders:")
        for e in errors:
            print(f"  - {e}")
    print("\n🎉  Done! Open the app → Clients to see all imported data.")


if __name__ == "__main__":
    main()
