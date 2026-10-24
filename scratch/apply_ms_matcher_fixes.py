def update_file(path, replacements):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    is_crlf = '\r\n' in content
    norm_content = content.replace('\r\n', '\n')
    
    for old, new in replacements:
        norm_old = old.replace('\r\n', '\n')
        norm_new = new.replace('\r\n', '\n')
        if norm_old not in norm_content:
            raise ValueError(f"Pattern not found in {path}:\n{repr(norm_old[:120])}")
        norm_content = norm_content.replace(norm_old, norm_new, 1)
        print(f"Applied replacement in {path}")
        
    if is_crlf:
        final_content = norm_content.replace('\n', '\r\n')
    else:
        final_content = norm_content
        
    with open(path, 'w', encoding='utf-8') as f:
        f.write(final_content)

# ----------------- 1. Physics Matcher -----------------
phys_replacements = [
    (
        '''    "calculation specific guidance",
    "mark scheme notes",
)''',
        '''    "calculation specific guidance",
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
    return any(s in lower_txt for s in sentinels)'''
    ),
    (
        '''        # Candidate 1: Single block containing question/qu AND answer AND mark/marks
        for b in blocks:
            if b[1] < 45.0 or b[1] > 350.0:
                continue
            txt = b[4].strip()
            if FOOTER_HEADER_REGEX.search(txt):
                continue
            words = set(re.findall(r"[a-z]+", txt.lower()))
            has_q = bool(words & {"question", "qu", "questions"})
            has_a = bool(words & {"answer", "answers"})
            has_m = bool(words & {"marks", "mark"})
            if has_q and has_a and has_m:
                return b[3] + 2.0

        # Candidate 2: Split across adjacent header columns within roughly the same row
        for b in blocks:
            if b[1] < 45.0 or b[1] > 350.0:
                continue
            txt = b[4].strip()
            if FOOTER_HEADER_REGEX.search(txt):
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
                    return max(rb[3] for rb in row_blocks) + 2.0''',
        '''        # Candidate 1: Single block containing question/qu AND answer AND mark/marks
        for b in blocks:
            if b[1] < 45.0 or b[1] > 350.0:
                continue
            txt = b[4].strip()
            if FOOTER_HEADER_REGEX.search(txt) or len(txt.split()) > 8:
                continue
            words = set(re.findall(r"[a-z]+", txt.lower()))
            has_q = bool(words & {"question", "qu", "questions"})
            has_a = bool(words & {"answer", "answers"})
            has_m = bool(words & {"marks", "mark"})
            if has_q and has_a and has_m:
                return b[3] + 2.0

        # Candidate 2: Split across adjacent header columns within roughly the same row
        for b in blocks:
            if b[1] < 45.0 or b[1] > 350.0:
                continue
            txt = b[4].strip()
            if FOOTER_HEADER_REGEX.search(txt) or len(txt.split()) > 5:
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
                    return max(rb[3] for rb in row_blocks) + 2.0'''
    ),
    (
        '''        all_rows: List[Tuple[int, Optional[str], int, float, str, Optional[str]]] = []
        rubric_headers: Dict[int, float] = {}

        for p_idx in range(len(self.doc)):
            header_bottom_y = self._find_rubric_header_bottom(p_idx)
            if header_bottom_y is None:
                continue
            rubric_headers[p_idx] = header_bottom_y''',
        '''        all_rows: List[Tuple[int, Optional[str], int, float, str, Optional[str]]] = []
        rubric_headers: Dict[int, float] = {}
        table_started = False

        for p_idx in range(len(self.doc)):
            header_bottom_y = self._find_rubric_header_bottom(p_idx)
            if header_bottom_y is None:
                if table_started and not is_appendix_or_blank_page(self.doc[p_idx]):
                    header_bottom_y = 52.0
                else:
                    continue
            else:
                table_started = True
            rubric_headers[p_idx] = header_bottom_y'''
    ),
    (
        '''                # Must be in Column 0 (x0 < 98) and strictly below the rubric table header
                if b[0] < 98 and b[1] >= header_bottom_y - 2.0 and b[1] < footer_y:
                    raw_lines = b[4].splitlines()
                    if not raw_lines:
                        continue
                    first_line = raw_lines[0].strip()
                    if not first_line:
                        continue
                    m_sub = re.match(r"^([1-9]|1[0-5])\s*\(([a-z])\)(?:\(([ivx]+)\))?", first_line, re.I)
                    m_attached = re.match(r"^([1-9]|1[0-5])\s*([a-z])(?![a-zA-Z0-9])", first_line, re.I)
                    m_single = re.match(r"^([1-9]|1[0-5])\s*$", first_line)''',
        '''                # Must be in Column 0 (x0 < 105) and strictly below the rubric table header
                if b[0] < 105 and b[1] >= header_bottom_y - 2.0 and b[1] < footer_y:
                    raw_lines = b[4].splitlines()
                    if not raw_lines:
                        continue
                    first_line = raw_lines[0].strip()
                    if not first_line:
                        continue
                    m_sub = re.match(r"^(1[0-5]|[1-9])\s*\(([a-z])\)(?:\(([ivx]+)\))?", first_line, re.I)
                    m_attached = re.match(r"^(1[0-5]|[1-9])\s*([a-z])(?![a-zA-Z0-9])", first_line, re.I)
                    m_single = re.match(r"^(1[0-5]|[1-9])(?:\s+|$)", first_line)'''
    )
]

update_file('pipeline/ms_matcher_physics.py', phys_replacements)

# ----------------- 2. Chemistry & Biology Matchers -----------------
for chem_bio_path in ['pipeline/ms_matcher_chemistry.py', 'pipeline/ms_matcher_biology.py']:
    cb_replacements = [
        (
            '''    "calculation specific guidance",
    "mark scheme notes",
)''',
            '''    "calculation specific guidance",
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
    return any(s in lower_txt for s in sentinels)'''
        ),
        (
            '''        for b in blocks:
            if b[1] < 45.0 or b[1] > 350.0:
                continue
            txt = b[4].strip()
            if FOOTER_HEADER_REGEX.search(txt):
                continue
            words = set(re.findall(r"[a-z]+", txt.lower()))
            has_q = bool(words & {"question", "qu", "questions"})
            has_a = bool(words & {"answer", "answers"})
            has_m = bool(words & {"marks", "mark"})
            if has_q and has_a and has_m:
                return b[3] + 2.0

        for b in blocks:
            if b[1] < 45.0 or b[1] > 350.0:
                continue
            txt = b[4].strip()
            if FOOTER_HEADER_REGEX.search(txt):
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
                    return max(rb[3] for rb in row_blocks) + 2.0''',
            '''        for b in blocks:
            if b[1] < 45.0 or b[1] > 350.0:
                continue
            txt = b[4].strip()
            if FOOTER_HEADER_REGEX.search(txt) or len(txt.split()) > 8:
                continue
            words = set(re.findall(r"[a-z]+", txt.lower()))
            has_q = bool(words & {"question", "qu", "questions"})
            has_a = bool(words & {"answer", "answers"})
            has_m = bool(words & {"marks", "mark"})
            if has_q and has_a and has_m:
                return b[3] + 2.0

        for b in blocks:
            if b[1] < 45.0 or b[1] > 350.0:
                continue
            txt = b[4].strip()
            if FOOTER_HEADER_REGEX.search(txt) or len(txt.split()) > 5:
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
                    return max(rb[3] for rb in row_blocks) + 2.0'''
        ),
        (
            '''        raw_entries: List[Dict[str, Any]] = []
        for p_idx in range(len(self.doc)):
            header_bottom = self._find_rubric_header_bottom(p_idx)
            if header_bottom is None:
                continue

            page = self.doc[p_idx]
            footer_y = get_footer_boundary(page)
            blocks = page.get_text("blocks")

            for b in blocks:
                if b[0] > 100.0 or b[1] < header_bottom - 2.0 or b[3] > footer_y:
                    continue
                txt = b[4].strip()
                if not txt or FOOTER_HEADER_REGEX.search(txt):
                    continue

                first_line = txt.splitlines()[0].strip()
                m = re.match(r"^([1-9]|1[0-5])(?:\s*\(([a-z0-9]+)\)|\.|\:)?", first_line, re.IGNORECASE)''',
            '''        table_started = False
        raw_entries: List[Dict[str, Any]] = []
        rubric_headers: Dict[int, float] = {}
        for p_idx in range(len(self.doc)):
            header_bottom = self._find_rubric_header_bottom(p_idx)
            if header_bottom is None:
                if table_started and not is_appendix_or_blank_page(self.doc[p_idx]):
                    header_bottom = 52.0
                else:
                    continue
            else:
                table_started = True
            rubric_headers[p_idx] = header_bottom

            page = self.doc[p_idx]
            footer_y = get_footer_boundary(page)
            blocks = page.get_text("blocks")

            for b in blocks:
                if b[0] > 105.0 or b[1] < header_bottom - 2.0 or b[3] > footer_y:
                    continue
                txt = b[4].strip()
                if not txt or FOOTER_HEADER_REGEX.search(txt):
                    continue

                first_line = txt.splitlines()[0].strip()
                m = re.match(r"^(1[0-5]|[1-9])(?:\s*\(([a-z0-9]+)\)|\.|\:|\s|$)?", first_line, re.IGNORECASE)'''
        )
    ]
    update_file(chem_bio_path, cb_replacements)

# ----------------- 3. Math Matcher -----------------
math_replacements = [
    (
        '''    "calculation specific guidance",
    "mark scheme notes",
)''',
        '''    "calculation specific guidance",
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
    return any(s in lower_txt for s in sentinels)'''
    ),
    (
        '''        # Candidate 1: Single block containing question/qu AND answer AND mark/marks
        for b in blocks:
            if b[1] < 45.0 or b[1] > 350.0:
                continue
            txt = b[4].strip()
            if FOOTER_HEADER_REGEX.search(txt):
                continue
            words = set(re.findall(r"[a-z]+", txt.lower()))
            has_q = bool(words & {"question", "qu", "questions"})
            has_a = bool(words & {"answer", "answers"})
            has_m = bool(words & {"marks", "mark"})
            if has_q and has_a and has_m:
                return b[3] + 2.0

        # Candidate 2: Split across adjacent header columns within roughly the same row
        for b in blocks:
            if b[1] < 45.0 or b[1] > 350.0:
                continue
            txt = b[4].strip()
            if FOOTER_HEADER_REGEX.search(txt):
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
                    return max(rb[3] for rb in row_blocks) + 2.0''',
        '''        # Candidate 1: Single block containing question/qu AND answer AND mark/marks
        for b in blocks:
            if b[1] < 45.0 or b[1] > 350.0:
                continue
            txt = b[4].strip()
            if FOOTER_HEADER_REGEX.search(txt) or len(txt.split()) > 8:
                continue
            words = set(re.findall(r"[a-z]+", txt.lower()))
            has_q = bool(words & {"question", "qu", "questions"})
            has_a = bool(words & {"answer", "answers"})
            has_m = bool(words & {"marks", "mark"})
            if has_q and has_a and has_m:
                return b[3] + 2.0

        # Candidate 2: Split across adjacent header columns within roughly the same row
        for b in blocks:
            if b[1] < 45.0 or b[1] > 350.0:
                continue
            txt = b[4].strip()
            if FOOTER_HEADER_REGEX.search(txt) or len(txt.split()) > 5:
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
                    return max(rb[3] for rb in row_blocks) + 2.0'''
    ),
    (
        '''        q_row_pat = re.compile(r"^([1-9]|[12][0-9])(?:\s*(?:\([a-z0-9ivx]+\)|[A-Za-z](?![a-zA-Z0-9])))*$", re.IGNORECASE)
        occurrences: List[Tuple[int, int, float]] = []
        rubric_headers: Dict[int, float] = {}

        for p_idx in range(len(self.doc)):
            header_bottom_y = self._find_rubric_header_bottom(p_idx)
            if header_bottom_y is None:
                continue
            rubric_headers[p_idx] = header_bottom_y''',
        '''        q_row_pat = re.compile(r"^([1-9]|[12][0-9])(?:\s*(?:\([a-z0-9ivx]+\)|[A-Za-z](?![a-zA-Z0-9])))*", re.IGNORECASE)
        occurrences: List[Tuple[int, int, float]] = []
        rubric_headers: Dict[int, float] = {}
        table_started = False

        for p_idx in range(len(self.doc)):
            header_bottom_y = self._find_rubric_header_bottom(p_idx)
            if header_bottom_y is None:
                if table_started and not is_appendix_or_blank_page(self.doc[p_idx]):
                    header_bottom_y = 52.0
                else:
                    continue
            else:
                table_started = True
            rubric_headers[p_idx] = header_bottom_y'''
    ),
    (
        '''                # Must be in Column 0 (x0 < 100) and strictly below the rubric table header
                if b[0] < 100 and b[1] >= header_bottom_y - 2.0 and b[1] < footer_y:''',
        '''                # Must be in Column 0 (x0 < 105) and strictly below the rubric table header
                if b[0] < 105 and b[1] >= header_bottom_y - 2.0 and b[1] < footer_y:'''
    ),
    (
        '''            out_path = os.path.join(self.output_dir, out_filename)
            final_img.save(out_path, "PNG", optimize=True)
            results[q_num] = out_path''',
        '''            out_path = os.path.join(self.output_dir, out_filename)
            final_img.save(out_path, "PNG", optimize=True)
            results[q_num] = out_path
            results[f"q{q_num:02d}"] = out_path'''
    )
]

update_file('pipeline/ms_matcher_math.py', math_replacements)

print("Updated all MS matchers successfully!")
