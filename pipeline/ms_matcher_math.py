"""
Cambridge IGCSE Mathematics (0580) Mark Scheme Matcher & Cropper:
- Parses official Cambridge IGCSE 4-column mark scheme tables:
  [ Question | Answer | Marks | Guidance ]
- Identifies question boundaries (1, 2, ..., N or 1(a), 1(b), ...)
- Skips Generic Marking Principles and boilerplate preamble
- Crops complete answer rubrics at 2.0x scale (144-150 DPI)
- Stitches multi-page question rubrics seamlessly with PIL
- Saves crops to output/0580/mark_schemes/{ms_paper_id}_q{num:02d}.png
"""

import os
import re
import sys
from typing import Dict, Any, List, Optional, Tuple
from PIL import Image
import pymupdf as fitz
from pipeline.batch_scanner import parse_cambridge_filename

# Force UTF-8 on Windows console
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


PREAMBLE_BLACKLIST = (
    "generic marking principles",
    "general marking principles",
    "generic marking principle",
    "mathematics-specific marking principles",
    "maths-specific marking principles",
    "science-specific marking principles",
    "annotation of scripts",
    "annotations guidance for centres",
    "acronyms and shorthand",
    "specific instructions for marking",
    "calculation specific guidance",
    "mark scheme notes",
    "presentation of mark scheme",
    "calculation questions",
    "annotation",
)


def is_appendix_or_blank_page(page: fitz.Page) -> bool:
    txt = page.get_text().strip()
    if len(txt) < 15 or "blank page" in txt.lower():
        return True
    lower_txt = txt.lower()
    sentinels = [
        "notes for use in qualitative analysis",
        "qualitative analysis notes",
        "tests for gases",
        "tests for anions",
        "tests for aqueous cations",
        "the periodic table",
        "permission to reproduce",
        "generic marking principles",
        "general marking principles",
    ]
    return any(s in lower_txt for s in sentinels)

FOOTER_HEADER_REGEX = re.compile(
    r"(?:©\s*UCLES|©\s*Cambridge|Page\s+\d+\s+of\s+\d+|Cambridge\s+IGCSE.*Mark\s+Scheme|PUBLISHED|\b0580/\d{2}/)",
    re.IGNORECASE,
)


def get_footer_boundary(page: fitz.Page) -> float:
    ph = page.rect.height
    cutoff_y = ph - 36.0

    for b in page.get_text("blocks"):
        if b[1] > ph * 0.85:
            txt = b[4].strip()
            if FOOTER_HEADER_REGEX.search(txt) or (b[1] > ph * 0.90 and re.match(r"^\d{1,2}$", txt)):
                if b[1] < cutoff_y:
                    cutoff_y = b[1] - 4.0

    return max(ph * 0.78, cutoff_y)


class MSMatcherMath:
    def __init__(self, ms_pdf_path: str, output_base_dir: str = "output/0580/mark_schemes"):
        self.ms_path = ms_pdf_path
        self.output_dir = output_base_dir
        os.makedirs(self.output_dir, exist_ok=True)
        self.doc = fitz.open(ms_pdf_path)
        for p in self.doc:
            if p.rotation != 0:
                p.remove_rotation()
        self.basename = os.path.basename(ms_pdf_path)
        meta = parse_cambridge_filename(ms_pdf_path)
        if meta:
            self.ms_paper_id = meta["paper_id"]
            self.paper = meta["paper"]
        else:
            self.ms_paper_id = os.path.splitext(self.basename)[0]
            self.paper = 2

    def _find_rubric_headers(self, page_idx: int) -> List[Tuple[float, float]]:
        """
        Locates all 'Question | Answer | Marks' table headers on page_idx.
        Returns a sorted list of (header_top_y, header_bottom_y) tuples,
        including gridlines above and below the header row.
        """
        page = self.doc[page_idx]
        page_txt_lower = page.get_text().lower()
        if "blank page" in page_txt_lower and len(page_txt_lower.strip().splitlines()) <= 3:
            return []

        for phrase in PREAMBLE_BLACKLIST:
            if phrase in page_txt_lower:
                return []

        blocks = sorted(page.get_text("blocks"), key=lambda b: (b[1], b[0]))
        h_lines = [
            dr["rect"] for dr in page.get_drawings()
            if dr["rect"].height < 6.0 and dr["rect"].width > 30.0
        ]
        headers: List[Tuple[float, float]] = []

        # Candidate 1: Single block containing question/qu AND answer AND mark/marks
        for b in blocks:
            if b[1] < 45.0 or b[1] > page.rect.height * 0.85:
                continue
            txt = b[4].strip()
            if FOOTER_HEADER_REGEX.search(txt) or len(txt.split()) > 10:
                continue
            words = set(re.findall(r"[a-z]+", txt.lower()))
            has_q = bool(words & {"question", "qu", "questions"})
            has_a = bool(words & {"answer", "answers"})
            has_m = bool(words & {"marks", "mark"})
            if has_q and has_a and has_m:
                top_lines = [r for r in h_lines if b[1] - 14.0 <= r.y0 <= b[1] + 1.0]
                h_top = min((r.y0 for r in top_lines), default=b[1] - 2.0)
                bot_lines = [r for r in h_lines if b[3] - 1.0 <= r.y1 <= b[3] + 14.0]
                h_bot = max((r.y1 for r in bot_lines), default=b[3] + 2.0)
                headers.append((h_top, h_bot))

        # Candidate 2: Split across adjacent header columns within roughly the same row
        for b in blocks:
            if b[1] < 45.0 or b[1] > page.rect.height * 0.85:
                continue
            txt = b[4].strip()
            if FOOTER_HEADER_REGEX.search(txt) or len(txt.split()) > 6:
                continue
            words = set(re.findall(r"[a-z]+", txt.lower()))
            if words & {"question", "qu", "questions"}:
                row_blocks = [
                    ob for ob in blocks
                    if abs(ob[1] - b[1]) < 12.0 and not FOOTER_HEADER_REGEX.search(ob[4])
                ]
                row_words = set()
                for rb in row_blocks:
                    row_words.update(re.findall(r"[a-z]+", rb[4].lower()))
                if (row_words & {"answer", "answers"}) and (row_words & {"marks", "mark"}):
                    r_top = min(rb[1] for rb in row_blocks)
                    r_bot = max(rb[3] for rb in row_blocks)
                    top_lines = [r for r in h_lines if r_top - 14.0 <= r.y0 <= r_top + 1.0]
                    h_top = min((r.y0 for r in top_lines), default=r_top - 2.0)
                    bot_lines = [r for r in h_lines if r_bot - 1.0 <= r.y1 <= r_bot + 14.0]
                    h_bot = max((r.y1 for r in bot_lines), default=r_bot + 2.0)
                    if not any(abs(h[0] - h_top) < 10.0 for h in headers):
                        headers.append((h_top, h_bot))

        headers.sort(key=lambda h: h[0])
        return headers

    def _find_rubric_header_bottom(self, page_idx: int) -> Optional[float]:
        headers = self._find_rubric_headers(page_idx)
        return headers[0][1] if headers else None

    def _get_tight_bounds(
        self,
        page_idx: int,
        y_min: float,
        y_max: float,
        is_last_on_page: bool = False
    ) -> Optional[Tuple[float, float]]:
        """
        Computes tight vertical bounding box (y0, y1) around actual table row content
        within [y_min, y_max] on page_idx, fully preserving diagrams, sketches,
        embedded images, and horizontal gridlines without slicing.
        """
        page = self.doc[page_idx]
        footer_y = get_footer_boundary(page)
        y_limit = min(y_max, footer_y)
        if y_limit <= y_min + 4.0:
            return None

        # Collect all horizontal lines on this page
        h_lines = [
            dr["rect"] for dr in page.get_drawings()
            if dr["rect"].height < 6.0 and dr["rect"].width > 30.0
        ]

        # 1. Determine Start y0:
        # Check for horizontal gridline immediately above y_min (within 16 pt)
        gridlines_above = [r for r in h_lines if y_min - 16.0 <= r.y0 <= y_min + 0.5]
        if gridlines_above:
            best_top = max(gridlines_above, key=lambda r: r.y0)
            start_y0 = max(45.0, best_top.y0 - 2.0)
        else:
            start_y0 = max(45.0, y_min - 3.0)

        # 2. Determine End y1:
        if is_last_on_page:
            # Case 2: Question N is the last question on page P
            # Find the bottom horizontal border line of the table
            table_bottom_lines = [r for r in h_lines if y_min <= r.y0 <= y_limit + 0.5]
            if table_bottom_lines:
                bottom_line = max(table_bottom_lines, key=lambda r: r.y1)
                end_y1 = min(y_limit, bottom_line.y1 + 2.0)
            else:
                # Fallback to lowest drawing/image/text element
                elements_y1 = []
                for b in page.get_text("blocks"):
                    if b[1] >= y_min - 3.0 and b[1] < y_limit and not FOOTER_HEADER_REGEX.search(b[4]):
                        elements_y1.append(min(y_limit, b[3]))
                for dr in page.get_drawings():
                    r = dr["rect"]
                    if r.y0 >= y_min - 4.0 and r.y1 <= y_limit + 0.5 and r.width > 5.0 and r.height >= 2.0:
                        elements_y1.append(min(y_limit, r.y1))
                try:
                    for img_info in page.get_images():
                        for r in page.get_image_rects(img_info[0]):
                            if r.y0 >= y_min - 4.0 and r.y0 < y_limit:
                                elements_y1.append(min(y_limit, r.y1))
                except Exception:
                    pass
                end_y1 = min(y_limit, (max(elements_y1) + 6.0) if elements_y1 else y_limit)
        else:
            # Case 1: Question N+1 is on page P near y_limit
            divider_lines = [r for r in h_lines if abs(r.y0 - y_limit) <= 14.0 or (y_min < r.y0 <= y_limit + 2.0)]
            if divider_lines:
                best_divider = max(divider_lines, key=lambda r: r.y1)
                end_y1 = min(y_limit, best_divider.y1 + 1.0)
            else:
                end_y1 = min(y_limit, y_limit - 2.0)

        if end_y1 <= start_y0 + 6.0:
            return None

        return (start_y0, end_y1)

    def match_and_crop_all(self, expected_questions: Optional[List[int]] = None) -> Dict[int, str]:
        """
        Locates each question in the mark scheme table, crops the corresponding rows,
        and saves the image to output/0580/mark_schemes/.
        Returns a dict mapping question_number -> saved_image_path.
        """
        q_row_pat = re.compile(r"^(\d{1,2})(?:\s*(?:\([a-z0-9ivx]+\)|[A-Za-z](?![a-zA-Z0-9])))*", re.IGNORECASE)
        occurrences: List[Tuple[int, int, float]] = []
        page_rubric_headers: Dict[int, List[Tuple[float, float]]] = {}
        table_started = False

        for p_idx in range(len(self.doc)):
            headers = self._find_rubric_headers(p_idx)
            page = self.doc[p_idx]
            footer_y = get_footer_boundary(page)

            if not table_started:
                if not headers:
                    continue
                table_started = True
                scan_y_min = headers[0][1] - 2.0
            else:
                if is_appendix_or_blank_page(page):
                    continue
                scan_y_min = 50.0

            page_rubric_headers[p_idx] = headers
            blocks = page.get_text("blocks")
            blocks.sort(key=lambda b: (b[1], b[0]))

            for b in blocks:
                txt = b[4].strip()
                if not txt or FOOTER_HEADER_REGEX.search(txt):
                    continue

                if b[0] > 105.0 or b[1] < scan_y_min or b[3] > footer_y:
                    continue

                # Discard blocks overlapping with any rubric table header
                in_header = False
                for h_top, h_bot in headers:
                    if not (b[3] < h_top or b[1] > h_bot):
                        in_header = True
                        break
                if in_header:
                    continue

                raw_lines = b[4].splitlines()
                if not raw_lines:
                    continue
                first_line = raw_lines[0].strip()
                if not first_line:
                    continue
                m = q_row_pat.match(first_line)
                if m:
                    q_num = int(m.group(1))
                    expected = (occurrences[-1][0] + 1) if occurrences else 1
                    if occurrences and q_num == occurrences[-1][0]:
                        pass
                    elif q_num == expected or (expected <= q_num <= expected + 2):
                        occurrences.append((q_num, p_idx, b[1]))

        # Deduplicate occurrences per question number
        seen = set()
        clean_occ = []
        for occ in occurrences:
            if occ[0] not in seen:
                seen.add(occ[0])
                clean_occ.append(occ)

        results: Dict[int, str] = {}

        for i, (q_num, p_start, y_start) in enumerate(clean_occ):
            is_last = (i == len(clean_occ) - 1)
            next_q = clean_occ[i + 1] if not is_last else None

            slices: List[Image.Image] = []

            if next_q and next_q[1] == p_start:
                page = self.doc[p_start]
                footer_y = get_footer_boundary(page)
                next_y = next_q[2]
                inter_h = [h for h in page_rubric_headers.get(p_start, []) if y_start < h[0] < next_y]
                if inter_h:
                    y_end = inter_h[0][0] - 2.0
                    is_last_crop = True
                else:
                    y_end = min(next_y - 2.0, footer_y)
                    is_last_crop = False
                bounds = self._get_tight_bounds(p_start, y_start, y_end, is_last_on_page=is_last_crop)
                if bounds:
                    slice_img = self._render_page_crop(p_start, bounds[0], bounds[1])
                    if slice_img:
                        slices.append(slice_img)
            else:
                p_end = next_q[1] if next_q else (len(self.doc) - 1)
                page_first = self.doc[p_start]
                footer_y1 = get_footer_boundary(page_first)
                inter_h1 = [h for h in page_rubric_headers.get(p_start, []) if y_start < h[0] < footer_y1]
                y_end1 = (inter_h1[0][0] - 2.0) if inter_h1 else footer_y1
                bounds1 = self._get_tight_bounds(p_start, y_start, y_end1, is_last_on_page=True)
                if bounds1:
                    slice_img1 = self._render_page_crop(p_start, bounds1[0], bounds1[1])
                    if slice_img1:
                        slices.append(slice_img1)

                for mid_p in range(p_start + 1, p_end):
                    if is_appendix_or_blank_page(self.doc[mid_p]):
                        break
                    page_mid = self.doc[mid_p]
                    footer_ym = get_footer_boundary(page_mid)
                    table_top_y = 50.0
                    bounds_m = self._get_tight_bounds(mid_p, table_top_y, footer_ym, is_last_on_page=True)
                    if bounds_m:
                        slice_mid = self._render_page_crop(mid_p, bounds_m[0], bounds_m[1])
                        if slice_mid:
                            slices.append(slice_mid)

                if p_end > p_start and not is_appendix_or_blank_page(self.doc[p_end]):
                    page_end = self.doc[p_end]
                    footer_ye = get_footer_boundary(page_end)
                    next_y = (next_q[2] - 2.0) if (next_q and next_q[1] == p_end) else footer_ye
                    end_headers = page_rubric_headers.get(p_end, [])
                    pre_headers = [h for h in end_headers if 45.0 <= h[0] < next_y]
                    spill_end_y = (pre_headers[0][0] - 2.0) if pre_headers else next_y
                    table_top_y = 50.0

                    if spill_end_y > table_top_y + 8.0:
                        has_content = any(
                            b[1] >= table_top_y - 2.0 and b[1] < spill_end_y - 2.0 and not FOOTER_HEADER_REGEX.search(b[4])
                            for b in page_end.get_text("blocks")
                        ) or any(
                            dr["rect"].y0 >= table_top_y - 2.0 and dr["rect"].y1 <= spill_end_y + 2.0 and dr["rect"].width > 5.0 and dr["rect"].height >= 2.0
                            for dr in page_end.get_drawings()
                        )
                        if has_content:
                            bounds_e = self._get_tight_bounds(p_end, table_top_y, spill_end_y, is_last_on_page=True)
                            if bounds_e:
                                slice_end = self._render_page_crop(p_end, bounds_e[0], bounds_e[1])
                                if slice_end:
                                    slices.append(slice_end)

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

            q_str = f"q{q_num:02d}"
            out_filename = f"{self.ms_paper_id}_{q_str}.png"
            out_path = os.path.join(self.output_dir, out_filename)
            final_img.save(out_path, "PNG", optimize=True)
            results[q_num] = out_path
            results[f"q{q_num:02d}"] = out_path

        return results

    def _render_page_crop(self, page_idx: int, y0: float, y1: float) -> Optional[Image.Image]:
        page = self.doc[page_idx]
        rect = page.rect
        y0_clamped = max(52.0, y0)
        y1_clamped = min(rect.height - 42.0, y1)
        if y1_clamped <= y0_clamped + 8.0:
            return None
        crop_box = fitz.Rect(max(30.0, rect.x0 + 20.0), y0_clamped, min(rect.x1 - 20.0, rect.width - 25.0), y1_clamped)
        mat = fitz.Matrix(2.0, 2.0)
        pix = page.get_pixmap(matrix=mat, clip=crop_box)
        return Image.frombytes("RGB", [pix.width, pix.height], pix.samples)


def match_math_mark_scheme(ms_pdf_path: str, output_dir: str = "output/0580/mark_schemes") -> Dict[int, str]:
    matcher = MSMatcherMath(ms_pdf_path, output_dir)
    return matcher.match_and_crop_all()


if __name__ == "__main__":
    if len(sys.argv) > 1:
        ms_file = sys.argv[1]
        out_d = sys.argv[2] if len(sys.argv) > 2 else "output/0580/mark_schemes"
        res = match_math_mark_scheme(ms_file, out_d)
        print(f"Matched {len(res)} mark scheme questions from {ms_file}")
    else:
        print("Usage: python ms_matcher_math.py <path_to_ms.pdf> [output_dir]")
