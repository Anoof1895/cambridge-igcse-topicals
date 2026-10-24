"""
Cambridge IGCSE Chemistry (0620) Question Extractor:
- High-performance PyMuPDF document parser for all paper types:
  * Papers 1 & 2: Multiple Choice (40 MCQs, 1 mark each)
  * Papers 3 & 4: Core & Extended Theory (structured questions, [Total: X])
  * Paper 6: Alternative to Practical (apparatus, experiments, ion/gas qualitative analysis)
- Strict boundary clamping:
  * Ignore header barcodes (>85 pt)
  * Strip copyright notices and running footers at bottom
  * Clamp bottom boundary directly above next question or total mark brackets
  * Vector drawing preservation for apparatus, chemical structures, and lab set-ups
- Multi-part question tracking: (a), (b), (c) with subparts (i), (ii), (iii)
- Renders 2.0x high-DPI crops into output/0620/questions/
"""

import os
import re
import sys
from typing import Dict, Any, List, Optional, Tuple
from PIL import Image
import pymupdf as fitz

from pipeline.syllabus import classify_question
from pipeline.batch_scanner import parse_cambridge_filename

# Force UTF-8 on Windows console
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


def extract_mark_total(text: str) -> Optional[int]:
    """
    Extracts the total mark for a theory question from brackets like [Total: 8].
    """
    tot_match = re.search(r"\[Total:\s*(\d+)\]", text, re.I)
    if tot_match:
        try:
            return int(tot_match.group(1))
        except ValueError:
            pass

    sub_marks = re.findall(r"(?:^|\s)\[(\d{1,2})\](?:\s|$)", text)
    if sub_marks:
        try:
            total = sum(int(m) for m in sub_marks)
            if total > 0:
                return total
        except ValueError:
            pass

    return None


PAGE_CONTENT_TOP = 58.0
HEADER_SAFE_Y = 98.0
CONTINUATION_SAFE_TOP = 58.0
PAGE_CONTENT_BOTTOM_MARGIN = 62.0

BARCODE_HEADER_IGNORE_PAT = re.compile(
    r"(?:\*\s*0000|\bDFD\b|DO\s+NOT\s+WRITE\s+IN\s+THIS\s+MARGIN|Calculators\s+must\s+not\s+be\s+used|[\x00-\x08\x0b\x0c\x0e-\x1f])",
    re.IGNORECASE,
)

FOOTER_PAT = re.compile(
    r"(?:©\s*UCLES|©\s*Cambridge|Turn\s+over|\b0620/\d{2}/|DC\s*\([A-Z/]+\)|Permission\s+to\s+reproduce)",
    re.IGNORECASE,
)
COPYRIGHT_DISCLAIMER_PAT = re.compile(
    r"(?:Permission to reproduce items|Copyright Acknowledgements Booklet|Cambridge International Education is the name of our awarding body)",
    re.IGNORECASE,
)
TOTAL_BRACKET_PAT = re.compile(r"\[Total:\s*\d+\]", re.IGNORECASE)


def is_appendix_or_blank_page(page: fitz.Page) -> bool:
    txt = page.get_text().strip()
    if len(txt) < 15 or "blank page" in txt.lower():
        return True
    # If the page contains question numbering or mark brackets, it is NOT an appendix!
    if re.search(r"\[\d{1,2}\]", txt) or re.search(r"^\s*\d{1,2}\s+[A-Z(]", txt, re.M):
        return False
    lower_txt = txt.lower()
    sentinels = [
        "notes for use in qualitative analysis",
        "qualitative analysis notes",
        "tests for gases",
        "tests for anions",
        "tests for aqueous cations",
        "the periodic table",
        "permission to reproduce",
    ]
    return any(s in lower_txt for s in sentinels)


def get_footer_boundary(page: fitz.Page) -> float:
    """
    Finds the vertical y-coordinate where running footers begin.
    Strips '[Turn over]', page numbers, '0620/...' code lines, and '© UCLES'.
    """
    rect = page.rect
    ph = rect.height
    max_allowed_y1 = ph - PAGE_CONTENT_BOTTOM_MARGIN
    cutoff_y = max_allowed_y1

    blocks = page.get_text("blocks")
    for b in blocks:
        if b[1] > ph * 0.82:
            txt = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", b[4]).strip()
            if FOOTER_PAT.search(txt) or BARCODE_HEADER_IGNORE_PAT.search(txt) or (b[1] > ph * 0.88 and re.match(r"^\d{1,2}$", txt)):
                if b[1] < cutoff_y:
                    cutoff_y = b[1] - 4.0

    return min(max_allowed_y1, max(ph * 0.72, cutoff_y))


class ChemistryQPExtractor:
    def __init__(self, pdf_path: str, output_base_dir: str = "output/0620/questions"):
        self.pdf_path = pdf_path
        self.meta = parse_cambridge_filename(pdf_path)
        if not self.meta:
            raise ValueError(f"Could not parse Cambridge filename metadata from: {pdf_path}")
        self.output_dir = output_base_dir
        os.makedirs(self.output_dir, exist_ok=True)
        self.doc = fitz.open(pdf_path)

    def extract_all(self) -> List[Dict[str, Any]]:
        paper = self.meta["paper"]
        if paper in (1, 2):
            return self._extract_mcq_paper()
        else:
            return self._extract_theory_or_atp_paper()

    def _extract_mcq_paper(self) -> List[Dict[str, Any]]:
        """
        Extracts 40 multiple choice questions from Paper 1 or Paper 2.
        Slices each question strictly within its own boundaries without bleed
        from preceding or subsequent questions.
        """
        year = self.meta["year"]
        num_pages = len(self.doc)
        results: List[Dict[str, Any]] = []

        q_pat = re.compile(r"^([1-9]|[1-3][0-9]|40)(?:\s+|$|\.|\:)")

        # 1. Discover all 40 questions sequentially across pages 1 to num_pages - 1
        all_detected: List[Tuple[int, int, float]] = []  # (q_num, page_idx, y_top)
        expected = 1

        for p_idx in range(1, num_pages):
            page = self.doc[p_idx]
            page_txt = page.get_text()
            if "blank page" in page_txt.lower() and len(page_txt.strip().splitlines()) <= 3:
                continue

            pw = page.rect.width
            ph = page.rect.height
            d = page.get_text("dict")
            page_lines = []
            for b in d["blocks"]:
                if "lines" not in b:
                    continue
                for l in b["lines"]:
                    bbox = l["bbox"]
                    if bbox[1] < ph * 0.065 or bbox[1] > ph * 0.91:
                        continue
                    if bbox[0] > pw * 0.12:
                        continue
                    line_txt = "".join(s["text"] for s in l["spans"]).strip()
                    page_lines.append((bbox[1], bbox[0], line_txt))

            page_lines.sort(key=lambda x: x[0])

            for y_top, x_left, line_txt in page_lines:
                m = q_pat.match(line_txt)
                if m:
                    val = int(m.group(1))
                    if val == expected:
                        all_detected.append((val, p_idx, y_top))
                        expected += 1
                        if expected > 40:
                            break
            if expected > 40:
                break

        # Group detected questions by page_idx
        page_qs_map: Dict[int, List[Tuple[int, float]]] = {}
        for q_num, p_idx, y_top in all_detected:
            if p_idx not in page_qs_map:
                page_qs_map[p_idx] = []
            page_qs_map[p_idx].append((q_num, y_top))

        # 2. Extract and crop each question with strict boundary slicing
        for p_idx, q_list in page_qs_map.items():
            page = self.doc[p_idx]
            rect = page.rect
            footer_y = get_footer_boundary(page)

            d = page.get_text("dict")
            elements: List[Tuple[float, float, float, float]] = []
            for b in d["blocks"]:
                if "lines" in b:
                    for l in b["lines"]:
                        elements.append(l["bbox"])
            for dr in page.get_drawings():
                r = dr["rect"]
                if r.y0 >= HEADER_SAFE_Y and r.y1 < footer_y + 10.0:
                    elements.append((r.x0, r.y0, r.x1, r.y1))

            for k in range(len(q_list)):
                q_num, y_top = q_list[k]
                y0 = max(PAGE_CONTENT_TOP, y_top - 4.0)

                if k + 1 < len(q_list):
                    next_q_y_top = q_list[k + 1][1]
                    y1 = next_q_y_top - 6.0
                else:
                    q_elements = [e for e in elements if e[1] >= y0 - 2.0 and e[3] <= footer_y + 5.0]
                    if q_elements:
                        max_elem_y1 = max(e[3] for e in q_elements)
                        y1 = min(footer_y, max(max_elem_y1 + 12.0, y0 + 60.0))
                    else:
                        y1 = footer_y

                y1 = min(y1, rect.height - PAGE_CONTENT_BOTTOM_MARGIN)

                if y1 - y0 < 60.0:
                    y1 = min(rect.height - PAGE_CONTENT_BOTTOM_MARGIN, y0 + 60.0)

                x0 = max(36.0, rect.x0 + 36.0)
                x1 = min(rect.width - 36.0, rect.x1 - 36.0)

                crop_box = fitz.Rect(x0, y0, x1, y1)
                scale = 2.0 if rect.width < 700 else 1.5
                mat = fitz.Matrix(scale, scale)
                pix = page.get_pixmap(matrix=mat, clip=crop_box)
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

                q_str = f"q{q_num:02d}"
                qid = f"{self.meta['paper_id']}_{q_str}"
                img_filename = f"{qid}.png"
                img_path = os.path.join(self.output_dir, img_filename)
                clip_rect = fitz.Rect(rect.x0, y0, rect.x1, y1)
                q_text = page.get_text(clip=clip_rect).strip()
                if "removed from the question paper" in q_text.lower():
                    continue

                img.save(img_path, "PNG", optimize=True)
                topic, subtopic, is_obsolete = classify_question("0620", q_text, year=year)

                ms_paper_id = self.meta["paper_id"].replace("_qp_", "_ms_")
                ms_img_url = f"/output/0620/mark_schemes/{ms_paper_id}_{q_str}.png"
                qp_img_url = f"/output/0620/questions/{img_filename}"

                record: Dict[str, Any] = {
                    "id": qid,
                    "subject": "0620",
                    "year": self.meta["year"],
                    "series": self.meta["series"],
                    "paper": self.meta["paper"],
                    "variant": self.meta["variant"],
                    "tier": self.meta["tier"],
                    "syllabus_era": self.meta["syllabus_era"],
                    "calculator_allowed": True,
                    "question_number": q_num,
                    "total_marks": 1,
                    "topic": topic,
                    "subtopic": subtopic,
                    "question_image_url": qp_img_url,
                    "mark_scheme_image_url": ms_img_url,
                    "is_mcq": True,
                    "obsolete": is_obsolete,
                }
                results.append(record)

        results.sort(key=lambda r: r["question_number"])
        return results

    def _extract_theory_or_atp_paper(self) -> List[Dict[str, Any]]:
        """
        Extracts structured theory (Paper 3, 4) or ATP (Paper 6) questions.
        Extracts each question as ONE unified question (Q01, Q02, ... Q11),
        preserving stems, apparatus diagrams, figures, and sub-parts intact.
        Clamps strictly after the official mark box [Total: X] (+8.0 pt) or page footer.
        """
        year = self.meta["year"]
        num_pages = len(self.doc)
        results: List[Dict[str, Any]] = []

        header_pat = re.compile(
            r"^(?:[Qq]uestion\s+)?(\d{1,2})\s+(?=[A-Z]|A\b|An\b|The\b|Fig|\()|^\s*(\d{1,2})\s*\([a-zA-Z]\)"
        )
        primary_qs: List[Tuple[int, int, float]] = []
        expected_q = 1

        for p_idx in range(1, num_pages):
            page = self.doc[p_idx]
            if is_appendix_or_blank_page(page):
                continue
            blocks = sorted(page.get_text("blocks"), key=lambda b: (b[1], b[0]))
            for b in blocks:
                if b[0] < 65.0 and b[1] > 55.0:
                    raw_txt = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", b[4]).strip()
                    if not raw_txt or BARCODE_HEADER_IGNORE_PAT.search(raw_txt) or FOOTER_PAT.search(raw_txt):
                        continue
                    flat_txt = " ".join(l.strip() for l in raw_txt.splitlines() if l.strip())
                    m = header_pat.match(flat_txt)
                    if m:
                        val = int(m.group(1) or m.group(2))
                        if val == expected_q:
                            primary_qs.append((val, p_idx, b[1]))
                            expected_q += 1

        prev_end_info: Optional[Tuple[int, float]] = None

        for i, (q_num, q_pidx, q_ytop) in enumerate(primary_qs):
            next_q = primary_qs[i + 1] if i + 1 < len(primary_qs) else None
            start_p = q_pidx

            page_q_doc = self.doc[q_pidx]
            rect_q = page_q_doc.rect
            q_prev_bottom = PAGE_CONTENT_TOP
            if prev_end_info and prev_end_info[0] == q_pidx:
                q_prev_bottom = min(prev_end_info[1] + 4.0, q_ytop - 2.0)

            pre_drawings = [
                dr["rect"] for dr in page_q_doc.get_drawings()
                if dr["rect"].height < rect_q.height * 0.80
                and dr["rect"].x1 > 40.0 and dr["rect"].x0 < rect_q.width - 40.0
                and dr["rect"].y0 >= max(HEADER_SAFE_Y, q_prev_bottom - 2.0)
                and dr["rect"].y1 <= q_ytop + 4.0
                and dr["rect"].height >= 4.0 and dr["rect"].width > 10.0
            ]
            if pre_drawings:
                first_dr_y0 = min(r.y0 for r in pre_drawings)
                start_y = max(q_prev_bottom, max(PAGE_CONTENT_TOP, first_dr_y0 - 4.0))
            else:
                start_y = max(q_prev_bottom, max(PAGE_CONTENT_TOP, q_ytop - 4.0))

            search_end_p = next_q[1] if next_q else (num_pages - 1)
            found_total = None
            for p in range(start_p, search_end_p + 1):
                if p > start_p and is_appendix_or_blank_page(self.doc[p]):
                    search_end_p = p - 1
                    break
                footer_limit = get_footer_boundary(self.doc[p])
                for b in self.doc[p].get_text("blocks"):
                    if p == start_p and b[1] < start_y - 2.0:
                        continue
                    if next_q and p == next_q[1] and b[3] > next_q[2]:
                        continue
                    m_tot = TOTAL_BRACKET_PAT.search(b[4])
                    if not m_tot and next_q is None:
                        m_tot = re.search(r"\[6\]", b[4])
                    if m_tot:
                        num_m = re.search(r"\d+", m_tot.group(0))
                        marks_val = int(num_m.group(0)) if num_m else 6
                        found_total = (p, min(footer_limit, b[3] + 8.0), marks_val)
                        break
                if found_total:
                    break

            if found_total:
                end_p, end_y, total_marks = found_total
            else:
                if next_q:
                    if next_q[1] == start_p:
                        end_p = start_p
                        end_y = max(start_y + 10.0, next_q[2] - 5.0)
                    else:
                        page_next = self.doc[next_q[1]]
                        has_content_on_next = any(
                            HEADER_SAFE_Y < b[1] < next_q[2] - 8.0 and not BARCODE_HEADER_IGNORE_PAT.search(b[4])
                            for b in page_next.get_text("blocks")
                        )
                        if has_content_on_next:
                            end_p = next_q[1]
                            end_y = next_q[2] - 5.0
                        else:
                            end_p = next_q[1] - 1
                            end_y = get_footer_boundary(self.doc[end_p])
                else:
                    end_p = search_end_p
                    while end_p > start_p:
                        if is_appendix_or_blank_page(self.doc[end_p]):
                            end_p -= 1
                        else:
                            break
                    end_y = get_footer_boundary(self.doc[end_p])

                q_text_tmp = self._get_text_multi_page(start_p, start_y, end_p, end_y)
                total_marks = extract_mark_total(q_text_tmp) or 6

            prev_end_info = (end_p, end_y)

            final_img = self._render_multi_page_crop(start_p, start_y, end_p, end_y)
            if not final_img:
                continue

            q_text = self._get_text_multi_page(start_p, start_y, end_p, end_y)
            if "removed from the question paper" in q_text.lower():
                continue

            q_str = f"q{q_num:02d}"
            qid = f"{self.meta['paper_id']}_{q_str}"
            img_filename = f"{qid}.png"
            img_path = os.path.join(self.output_dir, img_filename)
            final_img.save(img_path, "PNG", optimize=True)

            topic, subtopic, is_obsolete = classify_question("0620", q_text, year=year)

            ms_paper_id = self.meta["paper_id"].replace("_qp_", "_ms_")
            ms_img_url = f"/output/0620/mark_schemes/{ms_paper_id}_{q_str}.png"
            qp_img_url = f"/output/0620/questions/{img_filename}"

            record: Dict[str, Any] = {
                "id": qid,
                "subject": "0620",
                "year": self.meta["year"],
                "series": self.meta["series"],
                "paper": self.meta["paper"],
                "variant": self.meta["variant"],
                "tier": self.meta["tier"],
                "syllabus_era": self.meta["syllabus_era"],
                "calculator_allowed": True,
                "question_number": q_num,
                "total_marks": total_marks,
                "topic": topic,
                "subtopic": subtopic,
                "question_image_url": qp_img_url,
                "mark_scheme_image_url": ms_img_url,
                "is_mcq": False,
                "obsolete": is_obsolete,
            }
            results.append(record)

        return results

    def _get_tight_content_bounds(
        self, page_idx: int, y_min: float, y_max: float, is_continuation: bool = False
    ) -> Optional[Tuple[float, float]]:
        """
        Finds the tight vertical bounds (y0, y1) of actual question content on page_idx
        within [y_min, y_max], ignoring barcodes, page numbers, margin text, and footers.
        Enforces HEADER_SAFE_Y = 98.0 for vector drawings and CONTINUATION_SAFE_TOP = 58.0 for text blocks
        across ALL pages to completely strip barcodes, candidate boxes, and running headers.
        """
        page = self.doc[page_idx]
        rect = page.rect
        footer_y = get_footer_boundary(page)
        effective_top = CONTINUATION_SAFE_TOP
        y_top_limit = max(effective_top, (CONTINUATION_SAFE_TOP if is_continuation else y_min) - 4.0)
        y_bot_limit = min(y_max, footer_y, rect.height - PAGE_CONTENT_BOTTOM_MARGIN)

        # Explicit Copyright Blacklist and [Total: X] clamp
        for b in page.get_text("blocks"):
            txt = b[4].strip()
            if not txt:
                continue
            if COPYRIGHT_DISCLAIMER_PAT.search(txt):
                y_bot_limit = min(y_bot_limit, max(y_top_limit + 10.0, b[1] - 8.0))
            if TOTAL_BRACKET_PAT.search(txt) and b[1] >= y_top_limit - 4.0:
                y_bot_limit = min(y_bot_limit, b[3] + 8.0)

        if y_bot_limit <= y_top_limit + 8.0:
            return None

        elem_y0s: List[float] = []
        elem_y1s: List[float] = []

        # 1. Text blocks
        for b in page.get_text("blocks"):
            txt = b[4].strip()
            if not txt:
                continue
            if b[1] < effective_top or (b[3] <= 60.0 and re.match(r"^\d{1,2}$", txt)):
                continue
            if BARCODE_HEADER_IGNORE_PAT.search(txt) or FOOTER_PAT.search(txt):
                continue
            if "blank page" in txt.lower():
                continue
            if b[1] >= y_top_limit - 3.0 and b[1] < y_bot_limit - 2.0:
                elem_y0s.append(max(effective_top, b[1]))
                elem_y1s.append(min(y_bot_limit, b[3]))

        # 2. Vector drawings - globally discard any drawing with rect.y0 < HEADER_SAFE_Y (98.0)
        drawings = [d for d in page.get_drawings() if d["rect"].y0 >= HEADER_SAFE_Y]

        for dr in drawings:
            r = dr["rect"]
            if r.height > rect.height * 0.80:
                continue
            if r.y1 <= effective_top or r.y0 >= y_bot_limit:
                continue
            if r.x1 <= 40.0 or r.x0 >= rect.width - 40.0:
                continue
            if r.y0 >= y_top_limit - 2.0 and r.y1 <= y_bot_limit + 2.0:
                elem_y0s.append(max(effective_top, r.y0))
                elem_y1s.append(min(y_bot_limit, r.y1))

        # 3. Images - discard header barcodes
        try:
            for img_info in page.get_image_info(xrefs=True):
                ibox = fitz.Rect(img_info["bbox"])
                if ibox.y0 < HEADER_SAFE_Y:
                    continue
                if ibox.y1 <= effective_top or ibox.y0 >= y_bot_limit:
                    continue
                if ibox.x1 <= 40.0 or ibox.x0 >= rect.width - 40.0:
                    continue
                if ibox.y0 >= y_top_limit - 2.0 and ibox.y1 <= y_bot_limit + 2.0:
                    elem_y0s.append(max(effective_top, ibox.y0))
                    elem_y1s.append(min(y_bot_limit, ibox.y1))
        except Exception:
            pass

        if not elem_y0s:
            return None

        tight_y0 = max(effective_top, min(elem_y0s) - 4.0)
        tight_y1 = min(y_bot_limit, max(elem_y1s) + 8.0)
        if tight_y1 <= tight_y0 + 8.0:
            return None
        return (tight_y0, tight_y1)

    def _render_page_crop(self, page_idx: int, y0: float, y1: float) -> Optional[Image.Image]:
        page = self.doc[page_idx]
        rect = page.rect
        y0_clamped = max(y0, PAGE_CONTENT_TOP)
        y1_clamped = min(y1, rect.height - PAGE_CONTENT_BOTTOM_MARGIN)
        if y1_clamped <= y0_clamped + 8.0:
            return None
        x0 = max(36.0, rect.x0 + 36.0)
        x1 = min(rect.width - 36.0, rect.x1 - 36.0)
        crop_box = fitz.Rect(x0, y0_clamped, x1, y1_clamped)
        scale = 2.0 if rect.width < 700 else 1.5
        mat = fitz.Matrix(scale, scale)
        pix = page.get_pixmap(matrix=mat, clip=crop_box)
        return Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

    def _render_multi_page_crop(self, p_start: int, y_start: float, p_end: int, y_end: float) -> Optional[Image.Image]:
        slices: List[Image.Image] = []
        if p_start == p_end:
            bounds = self._get_tight_content_bounds(p_start, y_start, y_end, is_continuation=False)
            if bounds:
                im = self._render_page_crop(p_start, bounds[0], bounds[1])
                if im and im.height > 8:
                    slices.append(im)
        else:
            f1 = get_footer_boundary(self.doc[p_start])
            bounds1 = self._get_tight_content_bounds(p_start, y_start, f1, is_continuation=False)
            p1_has_total = False
            if bounds1:
                im1 = self._render_page_crop(p_start, bounds1[0], bounds1[1])
                if im1 and im1.height > 8:
                    slices.append(im1)
                p1_text = self._get_text_in_rect(p_start, bounds1[0], bounds1[1])
                if TOTAL_BRACKET_PAT.search(p1_text):
                    p1_has_total = True
            if not p1_has_total:
                for p in range(p_start + 1, p_end):
                    if is_appendix_or_blank_page(self.doc[p]):
                        break
                    fm = get_footer_boundary(self.doc[p])
                    bounds_m = self._get_tight_content_bounds(p, CONTINUATION_SAFE_TOP, fm, is_continuation=True)
                    if bounds_m:
                        imm = self._render_page_crop(p, bounds_m[0], bounds_m[1])
                        if imm and imm.height > 8:
                            slices.append(imm)
                        p_text = self._get_text_in_rect(p, bounds_m[0], bounds_m[1])
                        if TOTAL_BRACKET_PAT.search(p_text) or re.search(r"\[6\]", p_text):
                            p1_has_total = True
                            break
                if not p1_has_total and y_end > CONTINUATION_SAFE_TOP + 8.0:
                    if not is_appendix_or_blank_page(self.doc[p_end]):
                        bounds_e = self._get_tight_content_bounds(p_end, CONTINUATION_SAFE_TOP, y_end, is_continuation=True)
                        if bounds_e:
                            iml = self._render_page_crop(p_end, bounds_e[0], bounds_e[1])
                            if iml and iml.height > 8:
                                slices.append(iml)

        if not slices:
            return None
        if len(slices) == 1:
            return slices[0]
        total_w = max(s.width for s in slices)
        total_h = sum(s.height for s in slices)
        out = Image.new("RGB", (total_w, total_h), (255, 255, 255))
        cy = 0
        for s in slices:
            out.paste(s, (0, cy))
            cy += s.height
        return out

    def _get_text_multi_page(self, p_start: int, y_start: float, p_end: int, y_end: float) -> str:
        parts = []
        if p_start == p_end:
            parts.append(self._get_text_in_rect(p_start, y_start, y_end))
        else:
            f1 = get_footer_boundary(self.doc[p_start])
            parts.append(self._get_text_in_rect(p_start, y_start, f1))
            for p in range(p_start + 1, p_end):
                if is_appendix_or_blank_page(self.doc[p]):
                    break
                fm = get_footer_boundary(self.doc[p])
                parts.append(self._get_text_in_rect(p, CONTINUATION_SAFE_TOP, fm))
            if y_end > CONTINUATION_SAFE_TOP + 8.0 and not is_appendix_or_blank_page(self.doc[p_end]):
                parts.append(self._get_text_in_rect(p_end, CONTINUATION_SAFE_TOP, y_end))
        return "\n".join(parts).strip()

    def _get_text_in_rect(self, page_idx: int, y0: float, y1: float) -> str:
        page = self.doc[page_idx]
        rect = page.rect
        clip = fitz.Rect(rect.x0, y0, rect.x1, y1)
        return page.get_text(clip=clip)


def extract_chemistry_paper(pdf_path: str, output_dir: str = "output/0620/questions") -> List[Dict[str, Any]]:
    extractor = ChemistryQPExtractor(pdf_path, output_dir)
    return extractor.extract_all()


if __name__ == "__main__":
    if len(sys.argv) > 1:
        pdf_file = sys.argv[1]
        out_d = sys.argv[2] if len(sys.argv) > 2 else "output/0620/questions"
        res = extract_chemistry_paper(pdf_file, out_d)
        print(f"Extracted {len(res)} questions from {pdf_file}")
    else:
        print("Usage: python extract_chemistry.py <path_to_qp.pdf> [output_dir]")
