"""
Cambridge IGCSE Mathematics (0580) Question Extractor:
- High-performance PyMuPDF (fitz) document parser for Papers 1, 2, 3, 4
- Automatically skips Page 1 cover sheet and Page 2 Formula Sheet (2025+ syllabus)
- Accurately tracks sequential question numbers (1, 2, ..., N)
- Trims running footers (UCLES copyright, paper code, page numbers, 'Turn over')
- Handles multi-page questions with vertical PIL stitching
- Computes correct tier ('core' for P1/P3; 'extended' for P2/P4)
- Computes calculator_allowed (False for P1/P2 in 2025+; True otherwise)
- Computes syllabus_era ('2025-2028' if year >= 2025 else '2016-2024')
- Classifies each question using pipeline.syllabus
- Renders 2.0x high-DPI crops into output/0580/questions/
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


def is_formula_or_cover_page(page_idx: int, page_text: str, year: int) -> bool:
    """
    Checks if a page is a cover sheet or Cambridge formula sheet.
    - Page 0 is always the cover sheet.
    - Page 1 in 2025+ papers is usually the Formula Sheet.
    - Also skips BLANK PAGE notices.
    """
    if page_idx == 0:
        return True

    clean = page_text.lower()
    if "blank page" in clean and len(clean.strip().splitlines()) <= 4:
        return True

    # 2025+ Formula Sheet check
    if page_idx == 1:
        if "formula sheet" in clean or "formulae" in clean or "mathematical formulae" in clean:
            return True
        if "area of trapezium" in clean or "volume of cone" in clean or "curved surface area" in clean:
            return True

    return False


def extract_mark_total(text: str) -> Optional[int]:
    """
    Extracts the total mark for a question from brackets such as:
    [Total: 4] or [Total: 12] or sums sub-marks [1], [2], [3].
    """
    tot_match = re.search(r"\[Total:\s*(\d+)\]", text, re.I)
    if tot_match:
        try:
            return int(tot_match.group(1))
        except ValueError:
            pass

    # Sum sub-part marks e.g. [2] at end of line
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
PAGE_CONTENT_BOTTOM_MARGIN = 62.0
HEADER_SAFE_Y = 98.0
CONTINUATION_SAFE_TOP = 58.0

BARCODE_HEADER_IGNORE_PAT = re.compile(
    r"(?:\*\s*0000|\bDFD\b|DO\s+NOT\s+WRITE\s+IN\s+THIS\s+MARGIN|Calculators\s+must\s+not\s+be\s+used|[\x00-\x08\x0b\x0c\x0e-\x1f])",
    re.IGNORECASE,
)

FOOTER_PAT = re.compile(
    r"(?:©\s*UCLES|©\s*Cambridge|Turn\s+over|\b0580/\d{2}/|DC\s*\([A-Z/]+\)|Permission\s+to\s+reproduce)",
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
    ]
    if any(s in lower_txt for s in sentinels):
        return True
    if "permission to reproduce" in lower_txt and len(txt) < 400:
        return True
    return False


def get_footer_boundary(page: fitz.Page) -> float:
    """
    Finds the vertical y-coordinate (points) where running footers start
    (e.g., '© UCLES 2025', '0580/22/M/J/25', '[Turn over', or page number).
    Returns the y-coordinate to clamp crops above.
    """
    rect = page.rect
    ph = rect.height
    max_allowed_y1 = ph - PAGE_CONTENT_BOTTOM_MARGIN
    cutoff_y = max_allowed_y1

    blocks = page.get_text("blocks")
    for b in blocks:
        # Blocks in bottom 18% of the page
        if b[1] > ph * 0.82:
            txt = b[4].strip()
            if FOOTER_PAT.search(txt) or BARCODE_HEADER_IGNORE_PAT.search(txt) or (b[1] > ph * 0.88 and re.match(r"^\d{1,2}$", txt)):
                if b[1] < cutoff_y:
                    cutoff_y = b[1] - 4.0

    return min(max_allowed_y1, max(ph * 0.72, cutoff_y))


class MathQPExtractor:
    def __init__(self, pdf_path: str, output_base_dir: str = "output/0580/questions"):
        self.pdf_path = pdf_path
        self.meta = parse_cambridge_filename(pdf_path)
        if not self.meta:
            raise ValueError(f"Could not parse Cambridge filename metadata from: {pdf_path}")
        self.output_dir = output_base_dir
        os.makedirs(self.output_dir, exist_ok=True)
        self.doc = fitz.open(pdf_path)

    def extract_all(self) -> List[Dict[str, Any]]:
        """
        Extracts all questions sequentially from the 0580 Question Paper.
        """
        year = self.meta["year"]
        num_pages = len(self.doc)
        results: List[Dict[str, Any]] = []

        # Find starting page (skip cover and formula sheets)
        start_page = 1
        for p_idx in range(min(4, num_pages)):
            txt = self.doc[p_idx].get_text()
            if is_formula_or_cover_page(p_idx, txt, year):
                start_page = p_idx + 1
            else:
                break

        # Scan for questions using span-level bold and margin filtering
        question_occurrences: List[Tuple[int, int, float, str]] = []
        current_q = 0

        for p_idx in range(start_page, num_pages):
            page = self.doc[p_idx]
            if is_appendix_or_blank_page(page):
                continue

            ph = page.rect.height
            text_dict = page.get_text("dict")
            lines = []
            for block in text_dict.get("blocks", []):
                for line in block.get("lines", []):
                    lines.append(line)
            lines.sort(key=lambda l: (l["bbox"][1], l["bbox"][0]))

            for line in lines:
                line_full_txt = "".join(s.get("text", "") for s in line.get("spans", [])).strip()
                if re.search(r"is printed on the next page|\[Turn over|\bTurn over\b", line_full_txt, re.IGNORECASE):
                    continue

                target_q = current_q + 1
                for span in line.get("spans", []):
                    x0, y0, x1, y1 = span["bbox"]
                    if 30.0 <= x0 < 65.0 and 50.0 <= y0 <= ph - 65.0:
                        txt = span["text"].strip()
                        m = re.match(rf"^{target_q}(?:\b|\s*\([a-z]\))", txt)
                        if m:
                            font = span["font"].lower()
                            is_bold = "bold" in font or bool(span.get("flags", 0) & 16) or "allandnone" in font
                            if is_bold or x0 < 52.0:
                                current_q = target_q
                                question_occurrences.append((target_q, p_idx, y0, txt))
                                break

        if not question_occurrences:
            return []

        clean_occurrences = question_occurrences

        # Now build page bounding boxes for each question
        for i, (q_num, p_start, y_start, text_sample) in enumerate(clean_occurrences):
            is_last = (i == len(clean_occurrences) - 1)
            next_q = clean_occurrences[i + 1] if not is_last else None
            prev_q = clean_occurrences[i - 1] if i > 0 else None

            # Calculate safe starting y0 for Question N on p_start
            page_start_doc = self.doc[p_start]
            rect_start = page_start_doc.rect
            q_prev_bottom = PAGE_CONTENT_TOP
            if prev_q and prev_q[1] == p_start:
                # Find lowest mark bracket of Question N-1 on this page
                prev_y_top = prev_q[2]
                last_mark_prev = None
                for b in page_start_doc.get_text("blocks"):
                    if prev_y_top <= b[1] < y_start - 2.0:
                        if re.search(r"\[(?:\d{1,2}|Total:\s*\d+)\]", b[4]):
                            if last_mark_prev is None or b[3] > last_mark_prev:
                                last_mark_prev = b[3]
                if last_mark_prev is not None:
                    q_prev_bottom = last_mark_prev + 8.0
                else:
                    q_prev_bottom = prev_y_top + 20.0

            # Check for any drawings/diagrams above Question N's text line but below q_prev_bottom
            pre_drawings = [
                dr["rect"] for dr in page_start_doc.get_drawings()
                if dr["rect"].height < rect_start.height * 0.80
                and dr["rect"].x1 > 40.0 and dr["rect"].x0 < rect_start.width - 40.0
                and dr["rect"].y0 >= max(HEADER_SAFE_Y, q_prev_bottom - 2.0)
                and dr["rect"].y1 <= y_start + 4.0
                and dr["rect"].height >= 4.0 and dr["rect"].width > 10.0
            ]
            if pre_drawings:
                first_dr_y0 = min(r.y0 for r in pre_drawings)
                effective_y_start = max(q_prev_bottom, max(PAGE_CONTENT_TOP, first_dr_y0 - 4.0))
            else:
                effective_y_start = max(q_prev_bottom, max(PAGE_CONTENT_TOP, y_start - 6.0))

            # Collect all page regions for question `q_num`
            slices: List[Image.Image] = []
            full_question_text = []

            # Case A: Next question is on the same page
            if next_q and next_q[1] == p_start:
                page = self.doc[p_start]
                footer_y = get_footer_boundary(page)
                y_end = min(next_q[2] - 8.0, footer_y)

                # Clamp at terminal mark bracket: if Question N ends with [1], [2], [3], [Total: X]
                last_mark_y1 = None
                for b in page.get_text("blocks"):
                    if y_start <= b[1] < next_q[2] - 2.0:
                        txt = b[4].strip()
                        if re.search(r"\[(?:\d{1,2}|Total:\s*\d+)\]", txt):
                            if last_mark_y1 is None or b[3] > last_mark_y1:
                                last_mark_y1 = b[3]
                if last_mark_y1 is not None and (last_mark_y1 + 12.0) < y_end:
                    y_end = min(y_end, last_mark_y1 + 12.0)

                bounds = self._get_tight_content_bounds(p_start, effective_y_start, y_end, is_continuation=False, next_q_num=next_q[0])
                if bounds:
                    slice_img = self._render_page_crop(p_start, bounds[0], bounds[1], is_continuation=False)
                    if slice_img:
                        slices.append(slice_img)
                full_question_text.append(self._get_text_in_rect(p_start, effective_y_start, y_end))

            # Case B: Terminal Question in 0580 (is_last is True)
            elif is_last:
                page_last = self.doc[p_start]
                rect_last = page_last.rect
                footer_yl = min(get_footer_boundary(page_last), rect_last.height - 50.0)

                last_mark_y1 = None
                for b in page_last.get_text("blocks"):
                    if y_start <= b[1] < footer_yl:
                        txt = b[4].strip()
                        if re.search(r"\[(?:\d{1,2}|Total:\s*\d+)\]", txt):
                            if last_mark_y1 is None or b[3] > last_mark_y1:
                                last_mark_y1 = b[3]
                if last_mark_y1 is not None and (last_mark_y1 + 14.0) < footer_yl:
                    y_end_last = min(footer_yl, last_mark_y1 + 14.0)
                else:
                    y_end_last = footer_yl

                bounds = self._get_tight_content_bounds(p_start, effective_y_start, y_end_last, is_continuation=False, next_q_num=None)
                if bounds:
                    slice_img = self._render_page_crop(p_start, bounds[0], bounds[1], is_continuation=False)
                    if slice_img:
                        slices.append(slice_img)
                full_question_text.append(self._get_text_in_rect(p_start, effective_y_start, y_end_last))

                # Check if terminal question continues to subsequent pages (multi-page terminal question)
                has_marks_on_start = bool(last_mark_y1 is not None)
                if not has_marks_on_start:
                    curr_p = p_start + 1
                    while curr_p < num_pages:
                        if is_appendix_or_blank_page(self.doc[curr_p]):
                            break
                        page_cont = self.doc[curr_p]
                        footer_cont = min(get_footer_boundary(page_cont), page_cont.rect.height - 50.0)
                        last_m_cont = None
                        for b in page_cont.get_text("blocks"):
                            if CONTINUATION_SAFE_TOP <= b[1] < footer_cont:
                                txt = b[4].strip()
                                if re.search(r"\[(?:\d{1,2}|Total:\s*\d+)\]", txt):
                                    if last_m_cont is None or b[3] > last_m_cont:
                                        last_m_cont = b[3]
                        if last_m_cont is not None and (last_m_cont + 14.0) < footer_cont:
                            y_end_cont = min(footer_cont, last_m_cont + 14.0)
                        else:
                            y_end_cont = footer_cont

                        bounds_cont = self._get_tight_content_bounds(curr_p, CONTINUATION_SAFE_TOP, y_end_cont, is_continuation=True, next_q_num=None)
                        if bounds_cont and (bounds_cont[1] - bounds_cont[0] >= 25.0):
                            slice_cont = self._render_page_crop(curr_p, bounds_cont[0], bounds_cont[1], is_continuation=True)
                            if slice_cont:
                                slices.append(slice_cont)
                            full_question_text.append(self._get_text_in_rect(curr_p, bounds_cont[0], bounds_cont[1]))
                        if last_m_cont is not None:
                            break
                        curr_p += 1

            # Case C: Question spans to page boundary or crosses multiple pages to next_q
            else:
                page_first = self.doc[p_start]
                footer_y1 = get_footer_boundary(page_first)
                bounds1 = self._get_tight_content_bounds(p_start, effective_y_start, footer_y1, is_continuation=False, next_q_num=None)
                if bounds1:
                    slice_img1 = self._render_page_crop(p_start, bounds1[0], bounds1[1], is_continuation=False)
                    if slice_img1:
                        slices.append(slice_img1)
                p_first_text = self._get_text_in_rect(p_start, effective_y_start, footer_y1)
                full_question_text.append(p_first_text)

                # Fix page continuation:
                is_next_near_top = (next_q is not None and next_q[1] == p_start + 1 and next_q[2] < 120.0)
                has_terminal_marks = (
                    bool(re.search(r"\[Total:\s*\d+\]", p_first_text))
                    or bool(re.search(r"(?:=\s*|\.\.\.\s*)\[\d{1,2}\]", p_first_text))
                    or bool(re.search(r"\[\d{1,2}\]\s*$", p_first_text.strip()))
                )

                # Only continue if not complete on p_start
                if not (is_next_near_top or (has_terminal_marks and next_q and next_q[1] == p_start + 1 and next_q[2] < 160.0)):
                    p_end = next_q[1] if next_q else (p_start + 1)
                    if not next_q and p_end < num_pages and is_appendix_or_blank_page(self.doc[p_end]):
                        p_end = p_start

                    # Intermediate pages (if any)
                    for mid_p in range(p_start + 1, p_end):
                        if mid_p >= num_pages or is_appendix_or_blank_page(self.doc[mid_p]):
                            break
                        page_mid = self.doc[mid_p]
                        footer_ym = get_footer_boundary(page_mid)
                        bounds_m = self._get_tight_content_bounds(mid_p, CONTINUATION_SAFE_TOP, footer_ym, is_continuation=True, next_q_num=None)
                        if bounds_m:
                            slice_mid = self._render_page_crop(mid_p, bounds_m[0], bounds_m[1], is_continuation=True)
                            if slice_mid:
                                slices.append(slice_mid)
                            full_question_text.append(self._get_text_in_rect(mid_p, bounds_m[0], bounds_m[1]))

                    # Last page of question (if next question is on p_end)
                    if next_q and next_q[1] == p_end and p_end < num_pages:
                        if next_q[2] >= 100.0:
                            y_end_last = next_q[2] - 8.0
                            page_e = self.doc[p_end]
                            last_mark_y1 = None
                            for b in page_e.get_text("blocks"):
                                if CONTINUATION_SAFE_TOP <= b[1] < next_q[2] - 2.0:
                                    txt = b[4].strip()
                                    if re.search(r"\[(?:\d{1,2}|Total:\s*\d+)\]", txt):
                                        if last_mark_y1 is None or b[3] > last_mark_y1:
                                            last_mark_y1 = b[3]
                            if last_mark_y1 is not None and (last_mark_y1 + 12.0) < y_end_last:
                                y_end_last = min(y_end_last, last_mark_y1 + 12.0)

                            bounds_e = self._get_tight_content_bounds(p_end, CONTINUATION_SAFE_TOP, y_end_last, is_continuation=True, next_q_num=next_q[0])
                            if bounds_e and (bounds_e[1] - bounds_e[0] >= 25.0):
                                slice_end = self._render_page_crop(p_end, bounds_e[0], bounds_e[1], is_continuation=True)
                                if slice_end:
                                    slices.append(slice_end)
                                full_question_text.append(self._get_text_in_rect(p_end, bounds_e[0], bounds_e[1]))

            # Stitch slices if multi-page
            if not slices:
                continue

            if len(slices) == 1:
                final_img = slices[0]
            else:
                total_w = max(s.width for s in slices)
                total_h = sum(s.height for s in slices)
                final_img = Image.new("RGB", (total_w, total_h), (255, 255, 255))
                curr_y = 0
                for s in slices:
                    final_img.paste(s, (0, curr_y))
                    curr_y += s.height

            combined_text = "\n".join(full_question_text)
            if "removed from the question paper" in combined_text.lower():
                print(f"Skipping withdrawn question {qid}")
                continue

            # Question ID according to Cambridge pattern
            # e.g. 0580_s25_qp_22_q04
            q_str = f"q{q_num:02d}"
            qid = f"{self.meta['paper_id']}_{q_str}"
            img_filename = f"{qid}.png"
            img_path = os.path.join(self.output_dir, img_filename)
            final_img.save(img_path, "PNG", optimize=True)

            total_marks = extract_mark_total(combined_text) or 1
            topic, subtopic, is_obsolete = classify_question("0580", combined_text, year=year)

            # Mark scheme image URL path
            ms_paper_id = self.meta["paper_id"].replace("_qp_", "_ms_")
            ms_img_url = f"/output/0580/mark_schemes/{ms_paper_id}_{q_str}.png"
            qp_img_url = f"/output/0580/questions/{img_filename}"

            record: Dict[str, Any] = {
                "id": qid,
                "subject": "0580",
                "year": self.meta["year"],
                "series": self.meta["series"],
                "paper": self.meta["paper"],
                "variant": self.meta["variant"],
                "tier": self.meta["tier"],
                "syllabus_era": self.meta["syllabus_era"],
                "calculator_allowed": self.meta["calculator_allowed"],
                "question_number": q_num,
                "total_marks": total_marks,
                "topic": topic,
                "subtopic": subtopic,
                "question_image_url": qp_img_url,
                "mark_scheme_image_url": ms_img_url,
                "is_mcq": False,
                "obsolete": False,
            }
            results.append(record)

        return results

    def _get_tight_content_bounds(
        self, page_idx: int, y_min: float, y_max: float, is_continuation: bool = False, next_q_num: Optional[int] = None
    ) -> Optional[Tuple[float, float]]:
        """
        Finds the tight vertical bounds (y0, y1) of actual question content on page_idx
        within [y_min, y_max], ignoring barcodes, page numbers, margin text, and footers.
        On continuation pages (is_continuation=True), enforces HEADER_SAFE_Y = 98.0
        to completely strip continuation page header barcodes, candidate boxes, and headers.
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

        # Strict boundary gating: Never allow a subsequent question header to enter the bounding box
        if next_q_num is not None:
            for b in page.get_text("blocks"):
                if b[0] < 70 and b[1] >= y_top_limit + 12.0:
                    if re.match(rf"^\s*{next_q_num}\b(?:\s+|$|[.:\)\-–])", b[4]):
                        y_bot_limit = min(y_bot_limit, b[1] - 8.0)

        if y_bot_limit <= y_top_limit + 8.0:
            return None

        elem_y0s: List[float] = []
        elem_y1s: List[float] = []

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
            if b[1] >= y_top_limit - 4.0 and b[1] < y_bot_limit - 2.0:
                elem_y0s.append(max(effective_top, b[1]))
                elem_y1s.append(min(y_bot_limit, b[3]))

        # Vector drawings - discard header drawings/barcodes
        drawings = [d for d in page.get_drawings() if d["rect"].y0 >= HEADER_SAFE_Y]

        for dr in drawings:
            r = dr["rect"]
            # Ignore outer page frames, margin strips, and corner registration crosshairs
            if r.height > rect.height * 0.80:
                continue
            if r.y1 <= effective_top or r.y0 >= y_bot_limit:
                continue
            if r.x1 <= 40.0 or r.x0 >= rect.width - 40.0:
                continue
            if r.y0 >= y_top_limit - 2.0 and r.y1 <= y_bot_limit + 2.0:
                elem_y0s.append(max(effective_top, r.y0))
                elem_y1s.append(min(y_bot_limit, r.y1))

        # Images - discard header barcodes
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

        tight_y0 = max(effective_top, min(elem_y0s) - 6.0)
        tight_y1 = min(y_bot_limit, max(elem_y1s) + 8.0)
        if tight_y1 <= tight_y0 + 8.0:
            return None
        return (tight_y0, tight_y1)

    def _render_page_crop(self, page_idx: int, y0: float, y1: float, is_continuation: bool = False) -> Optional[Image.Image]:
        """
        Renders a horizontal slice of a page with strict content margins,
        clamping y0 to HEADER_SAFE_Y (98.0) on continuation pages or PAGE_CONTENT_TOP (52.0) on starting pages,
        and y1 to rect.height - PAGE_CONTENT_BOTTOM_MARGIN (46.0),
        and horizontal margins to [36.0, width - 36.0].
        """
        page = self.doc[page_idx]
        rect = page.rect

        min_top = CONTINUATION_SAFE_TOP if is_continuation else PAGE_CONTENT_TOP
        y0_clamped = max(y0, min_top)
        y1_clamped = min(y1, rect.height - PAGE_CONTENT_BOTTOM_MARGIN)
        if y1_clamped <= y0_clamped + 8.0:
            return None

        x0 = max(36.0, rect.x0 + 36.0)
        x1 = min(rect.width - 36.0, rect.x1 - 36.0)

        crop_box = fitz.Rect(x0, y0_clamped, x1, y1_clamped)
        scale = 2.0 if rect.width < 700 else 1.5
        mat = fitz.Matrix(scale, scale)
        pix = page.get_pixmap(matrix=mat, clip=crop_box)
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

        return img

    def _get_text_in_rect(self, page_idx: int, y0: float, y1: float) -> str:
        page = self.doc[page_idx]
        rect = page.rect
        clip = fitz.Rect(rect.x0, y0, rect.x1, y1)
        return page.get_text(clip=clip)


def extract_math_paper(pdf_path: str, output_dir: str = "output/0580/questions") -> List[Dict[str, Any]]:
    extractor = MathQPExtractor(pdf_path, output_dir)
    return extractor.extract_all()


if __name__ == "__main__":
    if len(sys.argv) > 1:
        pdf_file = sys.argv[1]
        out_d = sys.argv[2] if len(sys.argv) > 2 else "output/0580/questions"
        res = extract_math_paper(pdf_file, out_d)
        print(f"Extracted {len(res)} questions from {pdf_file}")
    else:
        print("Usage: python extract_math.py <path_to_qp.pdf> [output_dir]")
