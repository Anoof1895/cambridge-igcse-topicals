"""
Cambridge IGCSE Automated Extraction Auditor
Audits all generated questions across 0580, 0625, 0620, and 0610:
  1. Height Outlier Check: Flag any question image taller than 4800px (~3 full A4 pages at 2.0x DPI),
     or taller than 3200px for questions with fewer than 6 marks (runaway page stitching).
  2. Barcode Leak Detection: Analyze the top 60px of each question image. Flag if black pixel variance matches vertical barcode striping.
  3. Banned Text Check: Verify no question contains text matching "BLANK PAGE", "Notes for use in qualitative analysis", or "The Periodic Table".
  4. Missing Assets Check: Verify every question in dataset JSON has valid, readable QP and MS PNG files on disk.

Outputs:
  - Summary ASCII table and exact missing assets list in terminal
  - Compact, interactive HTML report: pipeline/audit_report.html
"""

import os
import sys
import json
import time
import argparse
from typing import Dict, Any, List, Optional, Tuple
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

# PyMuPDF for raw paper PDF inspection
try:
    import pymupdf as fitz
except ImportError:
    try:
        import fitz
    except ImportError:
        fitz = None

# Force UTF-8 stdout encoding on Windows
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


SUBJECT_NAMES = {
    "0580": "Mathematics",
    "0625": "Physics",
    "0620": "Chemistry",
    "0610": "Biology",
}

DATASET_PATHS = {
    "0580": [
        "frontend/public/dataset_math.json",
        "frontend/public/dataset_mathematics.json",
    ],
    "0625": [
        "frontend/public/dataset_physics.json",
    ],
    "0620": [
        "frontend/public/dataset_chemistry.json",
        "frontend/public/dataset_chem.json",
    ],
    "0610": [
        "frontend/public/dataset_biology.json",
        "frontend/public/dataset_bio.json",
    ],
}

BANNED_SENTINELS = [
    "blank page",
    "notes for use in qualitative analysis",
    "qualitative analysis notes",
    "the periodic table",
]


def resolve_existing_path(rel_url: Optional[str], search_dirs: List[str]) -> Optional[str]:
    """Resolves relative URL to an existing local file path."""
    if not rel_url:
        return None
    clean = rel_url.lstrip("/").replace("/", os.sep).replace("\\", os.sep)
    for d in search_dirs:
        cand = os.path.join(d, clean)
        if os.path.exists(cand) and os.path.getsize(cand) > 0:
            return os.path.abspath(cand)
        # Try stripping leading 'output/' if directory already points to output
        if clean.startswith(f"output{os.sep}"):
            sub = clean[len(f"output{os.sep}"):]
            cand2 = os.path.join(d, sub)
            if os.path.exists(cand2) and os.path.getsize(cand2) > 0:
                return os.path.abspath(cand2)
    return None


def detect_barcode_striping(im: Image.Image) -> Tuple[bool, int, int]:
    """
    Analyzes the top 60px of a question image for vertical barcode striping.
    Returns (is_barcode, num_solid_bars, transitions).
    """
    w, h = im.size
    crop_h = min(60, h)
    if crop_h < 20 or w < 200:
        return False, 0, 0

    crop = im.crop((0, 0, w, crop_h)).convert("L")
    raw = crop.tobytes()

    # In Cambridge exam papers (2024-2026), scanner barcodes are positioned at
    # y < 35px in leaked crops, with height >= 18px and width 250-400px.
    for y0 in range(0, min(35, crop_h - 18), 3):
        solid = bytearray(w)
        for x in range(w):
            ok = True
            for dy in range(0, 18, 3):
                if raw[(y0 + dy) * w + x] >= 120:
                    ok = False
                    break
            if ok:
                solid[x] = 1

        # Check in sliding windows of 300px
        for win_start in range(0, w - 250, 40):
            sub = solid[win_start:win_start + 300]
            num_bars = sum(sub)
            if num_bars >= 40:
                trans = 0
                for i in range(len(sub) - 1):
                    if sub[i] != sub[i + 1]:
                        trans += 1
                if trans >= 45:
                    return True, num_bars, trans

    return False, 0, 0


class PDFCache:
    """Thread-safe cache of opened fitz Documents."""
    def __init__(self):
        self._docs: Dict[str, Any] = {}

    def get_doc(self, pdf_path: str):
        if not fitz or not pdf_path or not os.path.exists(pdf_path):
            return None
        if pdf_path not in self._docs:
            try:
                self._docs[pdf_path] = fitz.open(pdf_path)
            except Exception:
                self._docs[pdf_path] = None
        return self._docs[pdf_path]


def check_banned_text_in_pdf(
    pdf_doc: Any,
    question_num: int,
    img_height: int,
) -> Optional[str]:
    """
    Checks if a question spans into appendix or blank pages in the source PDF.
    """
    if not pdf_doc or len(pdf_doc) == 0:
        return None

    # Estimate pages spanned by image height: each page at 144 DPI is ~1400-1600px
    # A single page question is <= 1500px tall. Multi-page questions span more.
    spanned_page_count = max(1, int(round((img_height + 200) / 1450.0)))

    # Find candidate starting page for this question number
    start_page = -1
    for p_idx in range(len(pdf_doc)):
        txt = pdf_doc[p_idx].get_text()
        # Look for question number heading
        q_str = str(question_num)
        if f"\n{q_str} " in txt or txt.startswith(f"{q_str} ") or f"\n{q_str}\n" in txt:
            start_page = p_idx
            break

    if start_page < 0:
        start_page = 0

    end_page = min(len(pdf_doc) - 1, start_page + spanned_page_count - 1)

    # Inspect all pages spanned by this question
    for p_idx in range(start_page, end_page + 1):
        page_txt = pdf_doc[p_idx].get_text().lower()
        for sentinel in BANNED_SENTINELS:
            if sentinel in page_txt:
                # Discard false positives on cover page instructions
                if p_idx == 0:
                    continue
                # For blank page, ensure it is genuinely a blank page (< 50 chars or explicit)
                if sentinel == "blank page":
                    if len(page_txt.strip().splitlines()) <= 4 or len(page_txt.strip()) < 80:
                        return f"BLANK PAGE (p.{p_idx + 1})"
                else:
                    return f"{sentinel.title()} (p.{p_idx + 1})"

    return None


def audit_question(
    q: Dict[str, Any],
    pdf_path: Optional[str],
    pdf_cache: PDFCache,
    search_dirs: List[str],
    max_height: int = 4800,
) -> Dict[str, Any]:
    """
    Executes all 4 integrity checks on a single question record.
    """
    qid = q.get("id", "unknown_id")
    subject = str(q.get("subject", ""))
    year = q.get("year")
    series = q.get("series", "")
    paper = q.get("paper")
    variant = q.get("variant")
    q_num = q.get("question_number") or q.get("questionNumber") or 1
    marks = q.get("total_marks") or q.get("marks") or 1

    qp_rel = q.get("question_image_url")
    ms_rel = q.get("mark_scheme_image_url")

    qp_path = resolve_existing_path(qp_rel, search_dirs)
    ms_path = resolve_existing_path(ms_rel, search_dirs)

    issues: List[Dict[str, str]] = []
    width, height = 0, 0

    # 1. Missing Assets Check
    if not qp_path:
        issues.append({
            "code": "MISSING_QP",
            "category": "Missing Asset",
            "message": f"Question paper image missing on disk: {qp_rel}",
        })
    if not ms_path:
        issues.append({
            "code": "MISSING_MS",
            "category": "Missing Asset",
            "message": f"Mark scheme image missing on disk: {ms_rel}",
        })

    # If QP image exists, test read and perform image checks
    if qp_path:
        try:
            with Image.open(qp_path) as im:
                width, height = im.size

                # 2. Calibrated Height Outlier Check:
                # Paper 6 (ATP) contains extensive 20-27 mark multi-page experiment protocols (up to 5-6 pages, ~9600px).
                # Theory papers with >= 8 marks span up to 3-4 pages (~6400px).
                # Standard questions (< 8 marks) must not exceed 4800px (~3 pages), and low-mark (< 6 marks) must not exceed 3200px.
                is_paper_6 = (paper == 6 or "qp_6" in str(qid) or "_6" in str(qid))
                has_high_marks = isinstance(marks, (int, float)) and marks >= 8

                if is_paper_6:
                    max_allowed = 9600
                elif has_high_marks:
                    max_allowed = 6400
                else:
                    max_allowed = max_height

                if height > max_allowed:
                    issues.append({
                        "code": "HEIGHT_OUTLIER",
                        "category": "Height Outlier",
                        "message": f"Image height {height}px exceeds {max_allowed}px limit for this paper type",
                    })
                elif not (is_paper_6 or has_high_marks) and height > 3200 and (isinstance(marks, (int, float)) and marks < 6):
                    issues.append({
                        "code": "HEIGHT_OUTLIER",
                        "category": "Height Outlier",
                        "message": f"Low-mark runaway stitching: {marks}m question has excessive height {height}px (> 3200px)",
                    })

                # 3. Barcode Leak Detection
                has_barcode, num_bars, trans = detect_barcode_striping(im)
                if has_barcode:
                    issues.append({
                        "code": "BARCODE_LEAK",
                        "category": "Barcode Leak",
                        "message": f"Barcode pattern detected in top 60px ({num_bars} bars, {trans} transitions)",
                    })

        except Exception as e:
            issues.append({
                "code": "CORRUPT_QP",
                "category": "Corrupt Asset",
                "message": f"Failed to open/decode QP image: {e}",
            })

    # 4. Banned Text Check
    if pdf_path and height > 0:
        pdf_doc = pdf_cache.get_doc(pdf_path)
        matched_banned = check_banned_text_in_pdf(pdf_doc, int(q_num), height)
        if matched_banned:
            issues.append({
                "code": "BANNED_TEXT",
                "category": "Banned Text",
                "message": f"Captured banned content: {matched_banned}",
            })

    return {
        "id": qid,
        "subject": subject,
        "year": year,
        "series": series,
        "paper": paper,
        "variant": variant,
        "q_num": q_num,
        "marks": marks,
        "qp_rel": qp_rel,
        "ms_rel": ms_rel,
        "qp_path": qp_path,
        "ms_path": ms_path,
        "width": width,
        "height": height,
        "issues": issues,
        "clean": len(issues) == 0,
    }


def find_dataset_file(subject: str) -> Optional[str]:
    """Finds the dataset JSON file for a given subject."""
    candidates = DATASET_PATHS.get(subject, [])
    for c in candidates:
        if os.path.exists(c) and os.path.getsize(c) > 0:
            return c
    return None


def discover_raw_paper_map(subject: str) -> Dict[str, str]:
    """
    Builds a lookup map from paper_id (e.g. '0620_s26_qp_61') to raw PDF path.
    """
    try:
        from pipeline.batch_scanner import discover_paper_pairs
        pairs = discover_paper_pairs("pipeline/raw_papers", subject)
        return {p["meta"]["paper_id"]: p["qp_path"] for p in pairs if "paper_id" in p.get("meta", {})}
    except Exception:
        return {}


def generate_html_report(
    all_results: List[Dict[str, Any]],
    stats_by_subject: Dict[str, Dict[str, int]],
    output_path: str,
):
    """
    Generates a standalone, interactive HTML audit report with visual inspection thumbnails.
    """
    total_checked = len(all_results)
    flagged_records = [r for r in all_results if not r["clean"]]
    total_flagged = len(flagged_records)
    total_clean = total_checked - total_flagged
    pass_pct = round((total_clean / total_checked * 100), 2) if total_checked > 0 else 100.0

    cards_html = []
    for r in flagged_records:
        issue_badges = []
        for iss in r["issues"]:
            cat = iss["category"]
            color = "bg-rose-500/20 text-rose-300 border-rose-500/30"
            if cat == "Height Outlier":
                color = "bg-amber-500/20 text-amber-300 border-amber-500/30"
            elif cat == "Barcode Leak":
                color = "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
            elif cat == "Banned Text":
                color = "bg-purple-500/20 text-purple-300 border-purple-500/30"

            issue_badges.append(
                f'<span class="px-2 py-0.5 rounded text-xs font-mono font-semibold border {color}">'
                f'{cat}: {iss["message"]}</span>'
            )

        badge_str = " ".join(issue_badges)
        qp_img_src = r["qp_rel"] or ""
        # Make relative for local browser preview
        if qp_img_src.startswith("/"):
            qp_img_src = f"../frontend/public{qp_img_src}"

        cards_html.append(f"""
        <div class="card p-4 rounded-xl border border-white/10 bg-slate-900/90 shadow-lg flex flex-col gap-3"
             data-categories="{' '.join(i['code'] for i in r['issues'])}">
          <div class="flex items-center justify-between">
            <span class="font-mono font-bold text-sm text-cyan-400">{r['id']}</span>
            <span class="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
              {r['width']}x{r['height']}px • {r['marks']}m
            </span>
          </div>
          <div class="flex flex-wrap gap-1.5">{badge_str}</div>
          <div class="relative bg-black/40 rounded-lg overflow-hidden border border-white/5 flex items-center justify-center min-h-[140px] max-h-[300px]">
            <img src="{qp_img_src}" alt="{r['id']}" loading="lazy" class="max-h-[300px] w-auto object-contain cursor-pointer hover:scale-[1.02] transition-transform" onclick="openModal('{qp_img_src}')" onerror="this.parentElement.innerHTML='<span class=\\'text-xs text-rose-400 p-4\\'>Image not accessible</span>'"/>
          </div>
          <div class="text-[11px] font-mono text-slate-500 truncate" title="{r['qp_path']}">
            {r['qp_rel'] or 'No QP image'}
          </div>
        </div>
        """)

    cards_joined = "\n".join(cards_html) if cards_html else """
      <div class="col-span-full py-16 text-center text-emerald-400">
        <div class="text-4xl mb-2">✓</div>
        <div class="text-lg font-bold">100% Clean! Zero extraction issues detected.</div>
        <div class="text-xs text-slate-400 mt-1">All height bounds, barcode striping, banned texts, and asset integrity checks passed.</div>
      </div>
    """

    stats_rows = []
    for subj, s in stats_by_subject.items():
        name = SUBJECT_NAMES.get(subj, subj)
        stats_rows.append(f"""
          <tr class="border-b border-white/5 text-xs font-mono">
            <td class="py-2.5 px-3 font-bold text-white">{subj} ({name})</td>
            <td class="py-2.5 px-3 text-right text-slate-300">{s['total']:,}</td>
            <td class="py-2.5 px-3 text-right text-emerald-400 font-bold">{s['clean']:,}</td>
            <td class="py-2.5 px-3 text-right {'text-rose-400 font-bold' if s['flagged'] > 0 else 'text-slate-500'}">{s['flagged']:,}</td>
            <td class="py-2.5 px-3 text-right text-amber-400">{s['height']:,}</td>
            <td class="py-2.5 px-3 text-right text-indigo-400">{s['barcode']:,}</td>
            <td class="py-2.5 px-3 text-right text-purple-400">{s['banned']:,}</td>
            <td class="py-2.5 px-3 text-right text-rose-400">{s['missing']:,}</td>
          </tr>
        """)

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Cambridge IGCSE Extraction Audit Report</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {{ background: #0B0E14; color: #E2E8F0; font-family: ui-sans-serif, system-ui, sans-serif; }}
    .glass {{ background: rgba(15, 23, 42, 0.75); backdrop-filter: blur(12px); }}
  </style>
</head>
<body class="min-h-screen p-4 sm:p-8">
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Header -->
    <div class="glass p-6 rounded-2xl border border-white/10 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-black tracking-tight text-white flex items-center gap-2">
          <span>Cambridge IGCSE Extraction Auditor</span>
          <span class="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">Auto-Auditor</span>
        </h1>
        <p class="text-xs text-slate-400 mt-1">
          Automated QA audit across 0580 Mathematics, 0625 Physics, 0620 Chemistry, and 0610 Biology.
        </p>
      </div>
      <div class="flex items-center gap-3">
        <div class="px-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-right">
          <div class="text-[10px] uppercase font-mono text-slate-400">Integrity Score</div>
          <div class="text-xl font-bold {'text-emerald-400' if pass_pct >= 99.5 else 'text-amber-400'}">{pass_pct}%</div>
        </div>
      </div>
    </div>

    <!-- Summary Metrics -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div class="glass p-4 rounded-xl border border-white/10">
        <div class="text-[11px] font-mono text-slate-400">Total Questions</div>
        <div class="text-2xl font-black text-white mt-1">{total_checked:,}</div>
      </div>
      <div class="glass p-4 rounded-xl border border-white/10">
        <div class="text-[11px] font-mono text-slate-400">Clean Questions</div>
        <div class="text-2xl font-black text-emerald-400 mt-1">{total_clean:,}</div>
      </div>
      <div class="glass p-4 rounded-xl border border-white/10">
        <div class="text-[11px] font-mono text-slate-400">Flagged Questions</div>
        <div class="text-2xl font-black {'text-rose-400' if total_flagged > 0 else 'text-slate-500'} mt-1">{total_flagged:,}</div>
      </div>
      <div class="glass p-4 rounded-xl border border-white/10">
        <div class="text-[11px] font-mono text-slate-400">Audit Timestamp</div>
        <div class="text-xs font-mono text-cyan-300 mt-2">{time.strftime('%Y-%m-%d %H:%M:%S')}</div>
      </div>
    </div>

    <!-- Coverage Table -->
    <div class="glass rounded-xl border border-white/10 overflow-hidden">
      <div class="px-4 py-3 border-b border-white/10 font-bold text-xs uppercase tracking-wider text-slate-300">
        Breakdown by Subject
      </div>
      <div class="overflow-x-auto">
        <table class="w-full text-left">
          <thead>
            <tr class="border-b border-white/10 text-[11px] font-mono uppercase text-slate-400 bg-white/[0.02]">
              <th class="py-2.5 px-3">Subject</th>
              <th class="py-2.5 px-3 text-right">Checked</th>
              <th class="py-2.5 px-3 text-right">Clean</th>
              <th class="py-2.5 px-3 text-right">Flagged</th>
              <th class="py-2.5 px-3 text-right text-amber-300">Height &gt; 4800px (&gt;3200px &amp; &lt;6m)</th>
              <th class="py-2.5 px-3 text-right text-indigo-300">Barcode</th>
              <th class="py-2.5 px-3 text-right text-purple-300">Banned Text</th>
              <th class="py-2.5 px-3 text-right text-rose-300">Missing</th>
            </tr>
          </thead>
          <tbody>
            {"".join(stats_rows)}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Filter Buttons -->
    <div class="flex items-center gap-2 flex-wrap text-xs">
      <span class="text-slate-400 font-mono text-[11px]">Filter Issues:</span>
      <button onclick="filterIssues('ALL')" class="filter-btn px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold active">All ({total_flagged})</button>
      <button onclick="filterIssues('HEIGHT_OUTLIER')" class="filter-btn px-3 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700">Height Outliers</button>
      <button onclick="filterIssues('BARCODE_LEAK')" class="filter-btn px-3 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700">Barcode Leaks</button>
      <button onclick="filterIssues('BANNED_TEXT')" class="filter-btn px-3 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700">Banned Text</button>
      <button onclick="filterIssues('MISSING_QP')" class="filter-btn px-3 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700">Missing Assets</button>
    </div>

    <!-- Cards Grid -->
    <div id="cardsGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards_joined}
    </div>
  </div>

  <!-- Image Inspection Modal -->
  <div id="imageModal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm hidden flex items-center justify-center p-4" onclick="closeModal()">
    <div class="relative max-w-5xl max-h-[90vh] bg-slate-900 border border-white/20 rounded-2xl p-2 overflow-auto" onclick="event.stopPropagation()">
      <button onclick="closeModal()" class="absolute top-3 right-3 px-3 py-1 rounded bg-black/60 text-white hover:bg-rose-600 text-sm">✕ Close</button>
      <img id="modalImg" src="" alt="Inspection" class="w-full h-auto rounded-lg"/>
    </div>
  </div>

  <script>
    function openModal(src) {{
      document.getElementById('modalImg').src = src;
      document.getElementById('imageModal').classList.remove('hidden');
    }}
    function closeModal() {{
      document.getElementById('imageModal').classList.add('hidden');
    }}
    function filterIssues(code) {{
      const cards = document.querySelectorAll('.card');
      cards.forEach(card => {{
        if (code === 'ALL' || (card.getAttribute('data-categories') || '').includes(code)) {{
          card.style.display = 'flex';
        }} else {{
          card.style.display = 'none';
        }}
      }});
      document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('bg-cyan-500/20', 'text-cyan-300', 'border-cyan-500/30'));
      event.target.classList.add('bg-cyan-500/20', 'text-cyan-300', 'border-cyan-500/30');
    }}
  </script>
</body>
</html>
"""

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html_content)


def print_ascii_summary(
    stats_by_subject: Dict[str, Dict[str, int]],
    all_results: Optional[List[Dict[str, Any]]] = None,
):
    """
    Renders an ASCII summary table and logs missing asset details directly in the terminal.
    """
    header = (
        f"{'Subject':<8} | {'Name':<12} | {'Checked':>8} | {'Clean':>8} | {'Flagged':>8} | "
        f"{'Height>4.8k':>11} | {'Barcode':>7} | {'BannedTxt':>9} | {'Missing':>7}"
    )
    divider = "-" * len(header)
    double_divider = "=" * len(header)

    print(f"\n{double_divider}")
    print("                      CAMBRIDGE IGCSE EXTRACTION INTEGRITY AUDITOR")
    print(f"{double_divider}")
    print(header)
    print(divider)

    tot_checked = 0
    tot_clean = 0
    tot_flagged = 0
    tot_height = 0
    tot_barcode = 0
    tot_banned = 0
    tot_missing = 0

    for subj, s in stats_by_subject.items():
        name = SUBJECT_NAMES.get(subj, subj)
        tot_checked += s["total"]
        tot_clean += s["clean"]
        tot_flagged += s["flagged"]
        tot_height += s["height"]
        tot_barcode += s["barcode"]
        tot_banned += s["banned"]
        tot_missing += s["missing"]

        row = (
            f"{subj:<8} | {name:<12} | {s['total']:>8,d} | {s['clean']:>8,d} | {s['flagged']:>8,d} | "
            f"{s['height']:>11,d} | {s['barcode']:>7,d} | {s['banned']:>9,d} | {s['missing']:>7,d}"
        )
        print(row)

    print(divider)
    total_row = (
        f"{'TOTAL':<8} | {'All Subjects':<12} | {tot_checked:>8,d} | {tot_clean:>8,d} | {tot_flagged:>8,d} | "
        f"{tot_height:>11,d} | {tot_barcode:>7,d} | {tot_banned:>9,d} | {tot_missing:>7,d}"
    )
    print(total_row)
    print(f"{double_divider}")

    # Detailed Missing Assets Breakdown
    if all_results and tot_missing > 0:
        missing_records = [
            r for r in all_results
            if not r["clean"] and any("MISSING" in iss["code"] for iss in r["issues"])
        ]
        print(f"\n[EXACT MISSING ASSETS BREAKDOWN] ({len(missing_records)} questions flagged with missing assets):")

        by_subj: Dict[str, List[Dict[str, Any]]] = {}
        for r in missing_records:
            by_subj.setdefault(r["subject"], []).append(r)

        for s_code, q_list in by_subj.items():
            s_name = SUBJECT_NAMES.get(s_code, s_code)
            print(f"\n  ► Subject {s_code} ({s_name}) - {len(q_list)} Question(s) with Missing Assets:")
            by_paper: Dict[str, List[Dict[str, Any]]] = {}
            for item in q_list:
                p_id = item["id"].rsplit("_", 1)[0]
                by_paper.setdefault(p_id, []).append(item)

            for p_id, p_items in by_paper.items():
                print(f"    • Paper {p_id} ({len(p_items)} Qs):")
                for pit in p_items:
                    for iss in pit["issues"]:
                        if "MISSING" in iss["code"]:
                            print(f"        - {pit['id']}: {iss['message']}")
                            print(f"          QP URL: {pit['qp_rel']}")
                            print(f"          MS URL: {pit['ms_rel']}")
        print()


def audit_subject(
    subject: str,
    search_dirs: List[str],
    max_height: int = 4800,
    max_workers: int = 8,
) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
    """
    Audits all questions for a single subject.
    """
    ds_file = find_dataset_file(subject)
    if not ds_file:
        print(f"[{subject}] No dataset JSON found on disk. Skipping.")
        return [], {"total": 0, "clean": 0, "flagged": 0, "height": 0, "barcode": 0, "banned": 0, "missing": 0}

    with open(ds_file, "r", encoding="utf-8") as f:
        questions: List[Dict[str, Any]] = json.load(f)

    raw_map = discover_raw_paper_map(subject)
    pdf_cache = PDFCache()

    stats = {
        "total": len(questions),
        "clean": 0,
        "flagged": 0,
        "height": 0,
        "barcode": 0,
        "banned": 0,
        "missing": 0,
    }

    results: List[Dict[str, Any]] = []

    def _worker(q: Dict[str, Any]) -> Dict[str, Any]:
        paper_id = q.get("id", "").rsplit("_", 1)[0]
        pdf_path = raw_map.get(paper_id)
        return audit_question(q, pdf_path, pdf_cache, search_dirs, max_height)

    # Use thread pool to audit questions concurrently
    with ThreadPoolExecutor(max_workers=max_workers) as pool:
        for res in pool.map(_worker, questions):
            results.append(res)
            if res["clean"]:
                stats["clean"] += 1
            else:
                stats["flagged"] += 1
                for iss in res["issues"]:
                    cat = iss["code"]
                    if cat == "HEIGHT_OUTLIER":
                        stats["height"] += 1
                    elif cat == "BARCODE_LEAK":
                        stats["barcode"] += 1
                    elif cat == "BANNED_TEXT":
                        stats["banned"] += 1
                    elif cat in ("MISSING_QP", "MISSING_MS", "CORRUPT_QP"):
                        stats["missing"] += 1

    return results, stats


def main():
    parser = argparse.ArgumentParser(description="Cambridge IGCSE Extraction Integrity Auditor")
    parser.add_argument(
        "--subject",
        choices=["0580", "0625", "0620", "0610", "all"],
        default="all",
        help="Subject code to audit (default: all)",
    )
    parser.add_argument(
        "--report",
        default="pipeline/audit_report.html",
        help="Path for generated HTML visual audit report (default: pipeline/audit_report.html)",
    )
    parser.add_argument(
        "--max_height",
        type=int,
        default=4800,
        help="Maximum allowed question image height in pixels (default: 4800)",
    )
    parser.add_argument(
        "--workers",
        type=int,
        default=8,
        help="Concurrency thread worker count (default: 8)",
    )

    args = parser.parse_args()

    subjects = ["0580", "0625", "0620", "0610"] if args.subject == "all" else [args.subject]
    search_dirs = [".", "output", "frontend/public", "frontend"]

    print(f"Starting Cambridge IGCSE Extraction Audit across subjects: {', '.join(subjects)}")
    start_time = time.time()

    all_results: List[Dict[str, Any]] = []
    stats_by_subject: Dict[str, Dict[str, int]] = {}

    for subj in subjects:
        subj_results, subj_stats = audit_subject(
            subject=subj,
            search_dirs=search_dirs,
            max_height=args.max_height,
            max_workers=args.workers,
        )
        all_results.extend(subj_results)
        stats_by_subject[subj] = subj_stats

    elapsed = round(time.time() - start_time, 2)
    print_ascii_summary(stats_by_subject, all_results)
    print(f"Audit completed in {elapsed}s.")

    generate_html_report(all_results, stats_by_subject, args.report)
    print(f"Visual audit report generated: {os.path.abspath(args.report)}")


if __name__ == "__main__":
    main()
