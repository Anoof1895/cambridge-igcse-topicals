"""
Cambridge IGCSE Chemistry (0620) Mark Scheme Matcher & Cropper:
- Papers 1 & 2 (MCQ):
  * Extracts the complete 40-question answer key {1: 'A', 2: 'C', ..., 40: 'B'}
  * Also generates clean per-question answer badge crops
- Papers 3, 4, 6 (Theory & Alternative to Practical):
  * Parses official Cambridge IGCSE 4-column mark scheme tables
  * Locates question header rows (1(a), 1(b), 2, etc.)
  * Crops matching answer rows at 2.0x scale (144-150 DPI)
  * Stitches multi-page question rubrics seamlessly with PIL
  * Saves crops to output/0620/mark_schemes/{ms_paper_id}_q{num:02d}.png
"""

import os
import re
import sys
from typing import Dict, Any, List, Optional, Tuple
from PIL import Image, ImageDraw, ImageFont
import pymupdf as fitz
from pipeline.batch_scanner import parse_cambridge_filename

# Force UTF-8 on Windows console
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


def extract_mcq_key_table(doc: fitz.Document) -> Dict[int, str]:
    """
    Parses a Cambridge Multiple Choice mark scheme into a dictionary
    mapping question number (1 to 40) to correct answer ('A', 'B', 'C', or 'D').
    """
    answers: Dict[int, str] = {}

    for page in doc:
        text = page.get_text()

        for line in text.splitlines():
            line_str = line.strip()
            m = re.match(r"^([1-9]|[1-3][0-9]|40)[\s\|\:]+([A-D])$", line_str, re.IGNORECASE)
            if m:
                q_num = int(m.group(1))
                ans = m.group(2).upper()
                answers[q_num] = ans

        words = page.get_text("words")
        for idx, w in enumerate(words):
            word_txt = w[4].strip()
            if re.match(r"^([1-9]|[1-3][0-9]|40)$", word_txt):
                q_num = int(word_txt)
                if q_num not in answers:
                    for next_w in words[idx + 1: idx + 6]:
                        if abs(next_w[1] - w[1]) < 8 and next_w[0] > w[0]:
                            cand = next_w[4].strip().upper()
                            if cand in ("A", "B", "C", "D"):
                                answers[q_num] = cand
                                break

    return answers


def render_mcq_answer_card(q_num: int, correct_answer: str, paper_id: str) -> Image.Image:
    """
    Generates a crisp 2.0x answer badge for an MCQ question.
    """
    width, height = 500, 140
    img = Image.new("RGB", (width, height), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    draw.rectangle([4, 4, width - 5, height - 5], outline=(226, 232, 240), width=2)
    # Chemistry Cyan accent strip
    draw.rectangle([4, 4, 14, height - 5], fill=(6, 182, 212))

    try:
        font_large = ImageFont.truetype("arial.ttf", 40)
        font_small = ImageFont.truetype("arial.ttf", 20)
    except Exception:
        font_large = ImageFont.load_default()
        font_small = ImageFont.load_default()

    draw.text((30, 25), f"Question {q_num} — Official Mark Scheme", fill=(30, 41, 59), font=font_small)
    draw.text((30, 65), f"Correct Key: ", fill=(71, 85, 105), font=font_large)
    draw.text((270, 65), correct_answer, fill=(6, 182, 212), font=font_large)

    return img


PREAMBLE_BLACKLIST = (
    "generic marking principles",
    "general marking principles",
    "generic marking principle",
    "mathematics-specific marking principles",
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
    r"(?:©\s*UCLES|©\s*Cambridge|Page\s+\d+\s+of\s+\d+|Cambridge\s+IGCSE.*Mark\s+Scheme|PUBLISHED|\b0620/\d{2}/)",
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


class MSMatcherChemistry:
    def __init__(self, ms_pdf_path: str, output_base_dir: str = "output/0620/mark_schemes"):
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
            m = re.search(r"_ms_([1-6])[1-3]", self.ms_paper_id, re.I)
            self.paper = int(m.group(1)) if m else 4
        self.is_mcq = self.paper in (1, 2)

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
        page = self.doc[page_idx]
        footer_y = get_footer_boundary(page)
        y_limit = min(y_max, footer_y)
        if y_limit <= y_min + 4.0:
            return None

        h_lines = [
            dr["rect"] for dr in page.get_drawings()
            if dr["rect"].height < 6.0 and dr["rect"].width > 30.0
        ]

        gridlines_above = [r for r in h_lines if y_min - 16.0 <= r.y0 <= y_min + 0.5]
        if gridlines_above:
            best_top = max(gridlines_above, key=lambda r: r.y0)
            start_y0 = max(45.0, best_top.y0 - 2.0)
        else:
            start_y0 = max(45.0, y_min - 3.0)

        if is_last_on_page:
            table_bottom_lines = [r for r in h_lines if y_min <= r.y0 <= y_limit + 0.5]
            if table_bottom_lines:
                bottom_line = max(table_bottom_lines, key=lambda r: r.y1)
                end_y1 = min(y_limit, bottom_line.y1 + 2.0)
            else:
                blocks = page.get_text("blocks")
                row_blocks = [
                    b for b in blocks
                    if b[1] >= start_y0 - 2.0 and b[3] <= y_limit + 0.5 and not FOOTER_HEADER_REGEX.search(b[4])
                ]
                row_drawings = [
                    dr["rect"] for dr in page.get_drawings()
                    if dr["rect"].y0 >= start_y0 - 2.0 and dr["rect"].y1 <= y_limit + 0.5 and dr["rect"].width > 10.0
                ]
                max_b = max((b[3] for b in row_blocks), default=start_y0)
                max_d = max((r.y1 for r in row_drawings), default=start_y0)
                end_y1 = min(y_limit, max(max_b, max_d) + 8.0)
        else:
            gridlines_below = [r for r in h_lines if y_limit - 8.0 <= r.y1 <= y_limit + 4.0]
            if gridlines_below:
                best_bottom = min(gridlines_below, key=lambda r: r.y1)
                end_y1 = min(y_limit, best_bottom.y1 + 1.0)
            else:
                end_y1 = min(y_limit, y_limit - 2.0)

        if end_y1 - start_y0 < 12.0:
            return None

        return (start_y0, end_y1)

    def match_and_crop_all(self) -> Tuple[Dict[str, str], Dict[int, str]]:
        if self.is_mcq:
            mcq_answers = extract_mcq_key_table(self.doc)
            crops: Dict[str, str] = {}
            for q_num, ans in mcq_answers.items():
                card_img = render_mcq_answer_card(q_num, ans, self.ms_paper_id)
                q_str = f"q{q_num:02d}"
                out_filename = f"{self.ms_paper_id}_{q_str}.png"
                out_path = os.path.join(self.output_dir, out_filename)
                card_img.save(out_path, "PNG", optimize=True)
                crops[q_str] = out_path
                crops[str(q_num)] = out_path
            return crops, mcq_answers

        table_started = False
        raw_entries: List[Dict[str, Any]] = []
        page_rubric_headers: Dict[int, List[Tuple[float, float]]] = {}

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

            for b in blocks:
                if b[0] > 105.0 or b[1] < scan_y_min or b[3] > footer_y:
                    continue
                txt = b[4].strip()
                if not txt or FOOTER_HEADER_REGEX.search(txt):
                    continue

                # Discard blocks overlapping with any rubric table header
                in_header = False
                for h_top, h_bot in headers:
                    if not (b[3] < h_top or b[1] > h_bot):
                        in_header = True
                        break
                if in_header:
                    continue

                first_line = txt.splitlines()[0].strip()
                m = re.match(r"^(1[0-5]|[1-9])(?:\s*\(([a-z0-9]+)\)|\.|\:|\s|$)?", first_line, re.IGNORECASE)
                if m:
                    q_num = int(m.group(1))
                    raw_sub = m.group(2)
                    raw_entries.append({
                        "q_num": q_num,
                        "sub": raw_sub,
                        "p_idx": p_idx,
                        "y_top": b[1],
                        "y_bot": b[3],
                    })

        raw_entries.sort(key=lambda e: (e["p_idx"], e["y_top"]))

        filtered_entries = []
        prev_q = 0
        for e in raw_entries:
            if e["q_num"] < prev_q and abs(e["q_num"] - prev_q) > 2:
                continue
            filtered_entries.append(e)
            prev_q = max(prev_q, e["q_num"])

        entry_spans = []
        for i, entry in enumerate(filtered_entries):
            p_idx = entry["p_idx"]
            y_top = entry["y_top"]
            page_headers = page_rubric_headers.get(p_idx, [])
            footer_y = get_footer_boundary(self.doc[p_idx])

            has_next_on_page = (i + 1 < len(filtered_entries) and filtered_entries[i + 1]["p_idx"] == p_idx)
            next_y = filtered_entries[i + 1]["y_top"] if has_next_on_page else footer_y

            # Check if a reprinted rubric header sits between y_top and next_y
            intermediate_headers = [h for h in page_headers if y_top < h[0] < next_y]

            if intermediate_headers:
                # Clamp above the reprinted table header
                y_max = intermediate_headers[0][0] - 2.0
                is_last = True
            elif has_next_on_page:
                y_max = next_y
                is_last = False
            else:
                y_max = footer_y
                is_last = True

            bounds = self._get_tight_bounds(p_idx, y_top, y_max, is_last_on_page=is_last)
            if bounds:
                entry_spans.append({
                    "entry": entry,
                    "slices": [(p_idx, bounds[0], bounds[1])],
                })

        grouped_by_key: Dict[str, List[Tuple[int, float, float]]] = {}
        for item in entry_spans:
            e = item["entry"]
            q_num = e["q_num"]
            key_str = f"q{q_num:02d}"

            if key_str not in grouped_by_key:
                grouped_by_key[key_str] = []
            grouped_by_key[key_str].extend(item["slices"])

        crops: Dict[str, str] = {}
        for key_str, slice_coords in grouped_by_key.items():
            slices = []
            for p_idx, y0, y1 in slice_coords:
                crop = self._render_page_crop(p_idx, y0, y1)
                if crop and crop.height >= 12:
                    slices.append(crop)

            if not slices:
                continue

            if len(slices) == 1:
                final_img = slices[0]
            else:
                max_w = max(s.width for s in slices)
                tot_h = sum(s.height for s in slices)
                final_img = Image.new("RGB", (max_w, tot_h), (255, 255, 255))
                curr_y = 0
                for s in slices:
                    final_img.paste(s, (0, curr_y))
                    curr_y += s.height

            out_filename = f"{self.ms_paper_id}_{key_str}.png"
            out_path = os.path.join(self.output_dir, out_filename)
            final_img.save(out_path, "PNG", optimize=True)
            crops[key_str] = out_path

            m_q = re.match(r"^q(\d{2})", key_str)
            if m_q:
                q_int = int(m_q.group(1))
                crops[q_int] = out_path
                for item in entry_spans:
                    if item["entry"]["q_num"] == q_int and item["entry"]["sub"]:
                        sub_c = item["entry"]["sub"][0].lower()
                        if sub_c.isalpha():
                            crops[f"q{q_int:02d}{sub_c}"] = out_path

        return crops, {}

    def _render_page_crop(self, page_idx: int, y0: float, y1: float) -> Optional[Image.Image]:
        page = self.doc[page_idx]
        rect = page.rect
        y0_clamped = max(48.0, y0)
        y1_clamped = min(rect.height - 40.0, y1)
        if y1_clamped <= y0_clamped + 8.0:
            return None
        crop_box = fitz.Rect(max(30.0, rect.x0 + 20.0), y0_clamped, min(rect.x1 - 20.0, rect.width - 25.0), y1_clamped)
        mat = fitz.Matrix(2.0, 2.0)
        pix = page.get_pixmap(matrix=mat, clip=crop_box)
        return Image.frombytes("RGB", [pix.width, pix.height], pix.samples)


def match_chemistry_mark_scheme(ms_pdf_path: str, output_dir: str = "output/0620/mark_schemes") -> Tuple[Dict[int, str], Dict[int, str]]:
    matcher = MSMatcherChemistry(ms_pdf_path, output_dir)
    return matcher.match_and_crop_all()


if __name__ == "__main__":
    if len(sys.argv) > 1:
        ms_file = sys.argv[1]
        out_d = sys.argv[2] if len(sys.argv) > 2 else "output/0620/mark_schemes"
        crops, mcq = match_chemistry_mark_scheme(ms_file, out_d)
        print(f"Matched {len(crops)} mark scheme crops, {len(mcq)} MCQ keys from {ms_file}")
    else:
        print("Usage: python ms_matcher_chemistry.py <path_to_ms.pdf> [output_dir]")
