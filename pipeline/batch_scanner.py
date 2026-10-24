"""
Cambridge IGCSE Batch Ingestion & Extraction Scanner:
- Discovers paired QP & MS PDFs under raw_papers/{subject}/ recursively
- Universal filename parser supporting both standard code (0625_m26_qp_12.pdf)
  and human-readable descriptive filenames (0625 Physics March 2026 Question Paper  12.pdf)
- Coordinates extraction with extract_math.py and extract_physics.py
- Coordinates mark scheme alignment with ms_matcher_math.py and ms_matcher_physics.py
- Automatically attaches MCQ keys ('A'|'B'|'C'|'D') for Physics P1 & P2
- Emits dataset_math.json and dataset_physics.json matching frontend/src/types.ts
- Syncs output datasets to frontend/public/ for immediate live workspace availability
"""

import os
import re
import sys
import json
import glob
import shutil
import argparse
from pathlib import Path

# Add project root to sys.path so pipeline imports succeed when run as a script
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

from typing import Dict, Any, List, Optional, Tuple
from tqdm import tqdm

# Force UTF-8 on Windows console
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


def normalize_cambridge_series(series_raw: str) -> str:
    """
    Normalizes exam series/season strings to Cambridge single-letter codes:
      'm' = Feb/March (India)
      's' = May/June
      'w' = October/November
    """
    s = series_raw.lower().strip()
    s_clean = re.sub(r"[\s\-_]+", " ", s)
    if s_clean in ("m", "feb", "march", "feb march", "february march", "february"):
        return "m"
    if s_clean in ("s", "may", "june", "may june"):
        return "s"
    if s_clean in ("w", "oct", "nov", "october", "november", "oct nov", "october november"):
        return "w"
    if "feb" in s_clean or "march" in s_clean:
        return "m"
    if "may" in s_clean or "june" in s_clean:
        return "s"
    if "oct" in s_clean or "nov" in s_clean:
        return "w"
    return "s"


def normalize_cambridge_type(type_raw: str) -> str:
    """
    Normalizes document type to 'qp' or 'ms'.
    """
    t = type_raw.lower().strip()
    t_clean = re.sub(r"[\s\-_]+", " ", t)
    if "mark" in t_clean or t_clean == "ms":
        return "ms"
    if "question" in t_clean or t_clean == "qp":
        return "qp"
    return "qp"


# Regex Pattern A: Standard Cambridge code
# e.g. 0625_m26_qp_12.pdf, 0580_s25_ms_22.pdf, 0580_s21_ms_11(1).pdf
PATTERN_A = re.compile(
    r"^(?P<subject>\d{4})_(?P<season>[msw])(?P<year>\d{2})_(?P<type>qp|ms)_(?P<pv>\d{1,2})(?:\(\d+\))?\.pdf$",
    re.IGNORECASE,
)

# Regex Pattern A_alt: Split paper and variant e.g. 0580_m18_1_2_qp.pdf, 0625_w22_4_1_ms.pdf
PATTERN_A_ALT = re.compile(
    r"^(?P<subject>\d{4})_(?P<season>[msw])(?P<year>\d{2})_(?P<paper>[1-6])_(?P<variant>[1-3])_(?P<type>qp|ms)\.pdf$",
    re.IGNORECASE,
)

# Regex Pattern B: Descriptive / Human-Readable with arbitrary whitespace
# e.g. "0625 Physics March 2026 Question Paper  12.pdf"
# e.g. "0580 Mathematics June 2026 Mark Scheme  11.pdf"
PATTERN_B = re.compile(
    r"^(?P<subject>\d{4})\s+[A-Za-z\s\-]+\s+(?P<season>March|Feb[- ]?March|Feb|May[- ]?June|June|May|Oct[- ]?Nov|November|Nov|Oct)\s+(?P<year>\d{4})\s+(?P<type>Question\s*Paper|Mark\s*Scheme|QP|MS)\s+(?P<pv>\d{1,2})(?:\s*\(\d+\))?\.pdf$",
    re.IGNORECASE,
)


def parse_cambridge_filename(filepath: str) -> Optional[Dict[str, Any]]:
    """
    Universal Cambridge filename parser supporting standard codes, split codes,
    and descriptive human-readable filenames.
    Returns normalized metadata dictionary or None if unparseable.
    """
    basename = os.path.basename(filepath)

    m = PATTERN_A.match(basename)
    if m:
        d = m.groupdict()
        subject = d["subject"]
        season = d["season"].lower()
        yy = int(d["year"])
        year = 2000 + yy if yy < 50 else 1900 + yy
        type_str = d["type"].lower()
        pv = d["pv"]
        if len(pv) == 2:
            paper = int(pv[0])
            variant = int(pv[1])
        else:
            paper = int(pv)
            variant = 1
    else:
        m = PATTERN_A_ALT.match(basename)
        if m:
            d = m.groupdict()
            subject = d["subject"]
            season = d["season"].lower()
            yy = int(d["year"])
            year = 2000 + yy if yy < 50 else 1900 + yy
            type_str = d["type"].lower()
            paper = int(d["paper"])
            variant = int(d["variant"])
        else:
            m = PATTERN_B.match(basename)
            if m:
                d = m.groupdict()
                subject = d["subject"]
                season = normalize_cambridge_series(d["season"])
                year = int(d["year"])
                type_str = normalize_cambridge_type(d["type"])
                pv = d["pv"]
                if len(pv) == 2:
                    paper = int(pv[0])
                    variant = int(pv[1])
                else:
                    paper = int(pv)
                    variant = 1
            else:
                # Fallback for filenames with 4-digit year or dashes
                alt = re.match(
                    r"^(?P<subject>\d{4})[_-](?:(?P<year_full>\d{4})[_-])?(?P<season>[msw])(?P<year>\d{2})?[_-](?P<type>qp|ms)[_-](?P<paper>[1-6])(?P<variant>[1-3])\.pdf$",
                    basename,
                    re.IGNORECASE,
                )
                if alt:
                    d = alt.groupdict()
                    subject = d["subject"]
                    season = d["season"].lower()
                    type_str = d["type"].lower()
                    paper = int(d["paper"])
                    variant = int(d["variant"])
                    if d.get("year_full"):
                        year = int(d["year_full"])
                    else:
                        yy = int(d["year"])
                        year = 2000 + yy if yy < 50 else 1900 + yy
                else:
                    return None

    # Explicitly exclude Paper 5 (Practical Test) across all subjects
    if paper == 5:
        return None

    # Tier determination
    if subject == "0580":
        # 0580 Mathematics: P1 & P3 = Core, P2 & P4 = Extended
        tier = "core" if paper in (1, 3) else "extended"
        # 2025+ Calculator transition rules:
        # P1 & P2: strictly Non-Calculator; P3 & P4: Calculator
        # Pre-2025: All papers permitted calculators
        if year >= 2025:
            syllabus_era = "2025-2028"
            calculator_allowed = False if paper in (1, 2) else True
        else:
            syllabus_era = "2019-2024"
            calculator_allowed = True
    else:
        # Sciences: 0625 Physics, 0620 Chemistry, 0610 Biology
        # P1, P3 = Core; P2, P4 = Extended; P5, P6 = Practical
        if paper in (1, 3):
            tier = "core"
        elif paper in (2, 4):
            tier = "extended"
        else:
            tier = "practical"
        syllabus_era = "2025-2028" if year >= 2025 else "2020-2024"
        calculator_allowed = True

    base_id = f"{subject}_{season}{str(year)[-2:]}_{paper}{variant}"
    paper_id = f"{subject}_{season}{str(year)[-2:]}_{type_str}_{paper}{variant}"

    return {
        "subject": subject,
        "year": year,
        "season": season,
        "series": season,
        "type": type_str,
        "paper": paper,
        "variant": variant,
        "tier": tier,
        "syllabus_era": syllabus_era,
        "calculator_allowed": calculator_allowed,
        "filename": basename,
        "base_id": base_id,
        "paper_id": paper_id,
    }


def resolve_raw_directory(raw_dir: str) -> str:
    """
    Resolves raw_papers directory considering multiple common paths.
    """
    candidates = [
        raw_dir,
        os.path.join(os.getcwd(), raw_dir),
        os.path.join(os.path.dirname(__file__), "raw_papers"),
        os.path.join(os.getcwd(), "pipeline", "raw_papers"),
        os.path.join(os.getcwd(), "raw_papers"),
    ]
    for c in candidates:
        if os.path.exists(c) and os.path.isdir(c):
            return os.path.abspath(c)
    return os.path.abspath(raw_dir)


def discover_paper_pairs(
    raw_dir: str,
    subject_code: str,
    year_filter: Optional[int] = None,
    series_filter: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Recursively scans raw_papers for matching Question Paper (qp) and Mark Scheme (ms) pairs.
    Keys pairs by `{subject}_{season}{yy}_{paper}{variant}`.
    """
    resolved_raw = resolve_raw_directory(raw_dir)

    all_pdfs = [str(p) for p in Path(resolved_raw).rglob("*.pdf")]

    qp_files: Dict[str, str] = {}
    ms_files: Dict[str, str] = {}
    meta_cache: Dict[str, Dict[str, Any]] = {}

    for pdf_path in all_pdfs:
        meta = parse_cambridge_filename(pdf_path)
        if not meta or meta["subject"] != subject_code:
            continue
        if meta.get("paper") == 5:
            continue

        # Restrict discovery strictly to subject-specific platform scope:
        # Maths (0580) & Physics (0625): 2019 <= year <= 2026
        # Chemistry (0620) & Biology (0610): 2021 <= year <= 2026
        min_year = 2019 if subject_code in ("0580", "0625") else 2021
        if not (min_year <= meta["year"] <= 2026):
            continue

        if year_filter is not None and meta["year"] != year_filter:
            continue

        if series_filter is not None and meta["series"] != series_filter:
            continue

        base_id = meta["base_id"]
        meta_cache[base_id] = meta

        if meta["type"] == "qp":
            qp_files[base_id] = pdf_path
        elif meta["type"] == "ms":
            ms_files[base_id] = pdf_path

    pairs = []
    for base_id, qp_path in qp_files.items():
        ms_path = ms_files.get(base_id)
        meta = meta_cache.get(base_id, parse_cambridge_filename(qp_path))
        pairs.append({
            "base_id": base_id,
            "meta": meta,
            "qp_path": qp_path,
            "ms_path": ms_path,
        })

    # Sort pairs deterministically by year, series, paper, variant
    pairs.sort(key=lambda p: (
        p["meta"]["year"],
        p["meta"]["series"],
        p["meta"]["paper"],
        p["meta"]["variant"]
    ))
    return pairs


def process_subject(
    subject_code: str,
    raw_dir: str = "raw_papers",
    output_base: str = "output",
    frontend_public_dir: str = "frontend/public",
    year_filter: Optional[int] = None,
    series_filter: Optional[str] = None,
    merge_existing: bool = True
) -> List[Dict[str, Any]]:
    """
    Processes all discovered papers for a given subject ('0580' or '0625').
    """
    # Lazy imports of extractors to prevent circular imports
    from pipeline.extract_math import extract_math_paper
    from pipeline.extract_physics import extract_physics_paper
    from pipeline.extract_chemistry import extract_chemistry_paper
    from pipeline.extract_biology import extract_biology_paper
    from pipeline.ms_matcher_math import match_math_mark_scheme
    from pipeline.ms_matcher_physics import match_physics_mark_scheme
    from pipeline.ms_matcher_chemistry import match_chemistry_mark_scheme
    from pipeline.ms_matcher_biology import match_biology_mark_scheme

    print(f"\n=======================================================")
    print(f"Cambridge IGCSE Batch Ingestion: Subject {subject_code}")
    if year_filter:
        print(f"Target Year Filter  : {year_filter}")
    if series_filter:
        print(f"Target Series Filter: {series_filter}")
    print(f"=======================================================")

    pairs = discover_paper_pairs(raw_dir, subject_code, year_filter=year_filter, series_filter=series_filter)
    print(f"Found {len(pairs)} question paper(s) to process for {subject_code}.")

    output_q_dir = os.path.join(output_base, subject_code, "questions")
    output_ms_dir = os.path.join(output_base, subject_code, "mark_schemes")
    os.makedirs(output_q_dir, exist_ok=True)
    os.makedirs(output_ms_dir, exist_ok=True)

    extracted_questions: List[Dict[str, Any]] = []

    for pair in tqdm(pairs, desc=f"Ingesting {subject_code} papers", unit="paper"):
        qp_path = pair["qp_path"]
        ms_path = pair["ms_path"]
        meta = pair["meta"]

        # 1. Extract questions
        if subject_code == "0580":
            questions = extract_math_paper(qp_path, output_dir=output_q_dir)
        elif subject_code == "0625":
            questions = extract_physics_paper(qp_path, output_dir=output_q_dir)
        elif subject_code == "0620":
            questions = extract_chemistry_paper(qp_path, output_dir=output_q_dir)
        elif subject_code == "0610":
            questions = extract_biology_paper(qp_path, output_dir=output_q_dir)
        else:
            questions = extract_physics_paper(qp_path, output_dir=output_q_dir)

        # 2. Extract and align mark scheme if present
        ms_crops = {}
        mcq_answers = {}
        if ms_path and os.path.exists(ms_path):
            try:
                if subject_code == "0580":
                    ms_crops = match_math_mark_scheme(ms_path, output_dir=output_ms_dir)
                elif subject_code == "0625":
                    ms_crops, mcq_answers = match_physics_mark_scheme(ms_path, output_dir=output_ms_dir)
                elif subject_code == "0620":
                    ms_crops, mcq_answers = match_chemistry_mark_scheme(ms_path, output_dir=output_ms_dir)
                elif subject_code == "0610":
                    ms_crops, mcq_answers = match_biology_mark_scheme(ms_path, output_dir=output_ms_dir)
            except Exception as e:
                print(f"\n[WARNING] Error matching MS {ms_path}: {e}")

        # 3. Update questions with mark scheme info and MCQ keys
        for q in questions:
            q_num = q["question_number"]
            # If MCQ answers were parsed, attach correct_answer
            if q.get("is_mcq") and q_num in mcq_answers:
                q["correct_answer"] = mcq_answers[q_num]

            # Ensure mark_scheme_image_url references the best available crop
            q_key = q["id"].split("_")[-1]
            parent_key = f"q{q_num:02d}"
            if q_key in ms_crops:
                q["mark_scheme_image_url"] = f"/output/{subject_code}/mark_schemes/{os.path.basename(ms_crops[q_key])}"
            elif parent_key in ms_crops:
                q["mark_scheme_image_url"] = f"/output/{subject_code}/mark_schemes/{os.path.basename(ms_crops[parent_key])}"
            elif q_num in ms_crops:
                q["mark_scheme_image_url"] = f"/output/{subject_code}/mark_schemes/{os.path.basename(ms_crops[q_num])}"

            extracted_questions.append(q)

    # Dataset file management
    if subject_code == "0580":
        dataset_filename = "dataset_math.json"
    elif subject_code == "0625":
        dataset_filename = "dataset_physics.json"
    elif subject_code == "0620":
        dataset_filename = "dataset_chemistry.json"
    elif subject_code == "0610":
        dataset_filename = "dataset_biology.json"
    else:
        dataset_filename = f"dataset_{subject_code}.json"
    root_dataset_path = dataset_filename

    final_questions: List[Dict[str, Any]] = []
    if merge_existing and os.path.exists(root_dataset_path):
        try:
            with open(root_dataset_path, "r", encoding="utf-8") as f:
                existing_questions = json.load(f)
            # Remove existing questions that are being replaced (matching paper or year if year_filter)
            new_ids = {q["id"] for q in extracted_questions}
            new_papers = {q["id"].rsplit("_", 1)[0] for q in extracted_questions}
            preserved = [
                q for q in existing_questions
                if q.get("id") not in new_ids
                and q.get("id", "").rsplit("_", 1)[0] not in new_papers
                and (year_filter is None or q.get("year") != year_filter)
            ]
            final_questions = preserved + extracted_questions
        except Exception:
            final_questions = extracted_questions
    else:
        final_questions = extracted_questions

    # Re-apply verified Gemini classifications from classification_cache.json if available
    cache_path = os.path.join(os.path.dirname(__file__), "classification_cache.json")
    if os.path.exists(cache_path):
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                class_cache = json.load(f)
            for q in final_questions:
                qid = q.get("id")
                if qid and qid in class_cache:
                    cached = class_cache[qid]
                    q["topic"] = cached["topic"]
                    q["subtopic"] = cached["subtopic"]
                    q["subtopics"] = cached.get("subtopics", [cached["subtopic"]])
                    if "obsolete" in cached:
                        q["obsolete"] = cached["obsolete"]
                elif "subtopics" not in q and "subtopic" in q:
                    q["subtopics"] = [q["subtopic"]]
        except Exception as e:
            print(f"[WARNING] Could not attach classification cache: {e}")

    # Export datasets
    with open(root_dataset_path, "w", encoding="utf-8") as f:
        json.dump(final_questions, f, indent=2)
    print(f"\nExported {len(final_questions)} questions ({len(extracted_questions)} new/updated) to {root_dataset_path}.")

    # Sync to frontend/public
    if os.path.exists(frontend_public_dir):
        frontend_dataset_path = os.path.join(frontend_public_dir, dataset_filename)
        with open(frontend_dataset_path, "w", encoding="utf-8") as f:
            json.dump(final_questions, f, indent=2)
        print(f"Synced dataset to {frontend_dataset_path}.")

        # Also write short name aliases if chemistry or biology
        if dataset_filename == "dataset_chemistry.json":
            chem_alias = os.path.join(frontend_public_dir, "dataset_chem.json")
            with open(chem_alias, "w", encoding="utf-8") as f:
                json.dump(final_questions, f, indent=2)
        elif dataset_filename == "dataset_biology.json":
            bio_alias = os.path.join(frontend_public_dir, "dataset_bio.json")
            with open(bio_alias, "w", encoding="utf-8") as f:
                json.dump(final_questions, f, indent=2)

        # Sync images to frontend/public/output/{subject_code}
        public_out_dir = os.path.join(frontend_public_dir, "output", subject_code)
        src_out_dir = os.path.join(output_base, subject_code)
        if os.path.exists(src_out_dir):
            os.makedirs(public_out_dir, exist_ok=True)
            for sub in ("questions", "mark_schemes"):
                src_sub = os.path.join(src_out_dir, sub)
                dst_sub = os.path.join(public_out_dir, sub)
                if os.path.exists(src_sub):
                    shutil.copytree(src_sub, dst_sub, dirs_exist_ok=True)
            print(f"Synced {subject_code} output images to {public_out_dir}.")

    return final_questions


def main():
    parser = argparse.ArgumentParser(description="Cambridge IGCSE Batch Past Paper Ingestion Scanner")
    parser.add_argument("--subject", choices=["0580", "0625", "0620", "0610", "all"], default="all", help="Subject code to process")
    parser.add_argument("--year", default="all", help="Year to filter (e.g. '2026', '2025', or 'all')")
    parser.add_argument("--series", choices=["m", "s", "w", "all"], default="all", help="Series/season filter ('m'=Feb/Mar, 's'=May/Jun, 'w'=Oct/Nov, 'all')")
    parser.add_argument("--raw_dir", default="raw_papers", help="Directory containing raw past papers")
    parser.add_argument("--output_dir", default="output", help="Directory for cropped question and MS images")
    parser.add_argument("--public_dir", default="frontend/public", help="Frontend public directory for live dataset sync")
    parser.add_argument("--no_merge", action="store_true", help="Do not merge with existing dataset JSON, overwrite completely")
    parser.add_argument("--all", action="store_true", help="Process all subjects across all years (2020-2026)")

    args = parser.parse_args()

    all_subjects = ["0580", "0625", "0620", "0610"]
    if args.all:
        year_filter = None
        series_filter = None
        subjects = all_subjects
    else:
        year_filter = None if args.year.lower() == "all" else int(args.year)
        series_filter = None if args.series.lower() == "all" else args.series.lower()
        subjects = all_subjects if args.subject == "all" else [args.subject]

    raw_dir = args.raw_dir
    if not os.path.exists(raw_dir) and os.path.exists(os.path.join("pipeline", "raw_papers")):
        raw_dir = os.path.join("pipeline", "raw_papers")

    for subj in subjects:
        process_subject(
            subject_code=subj,
            raw_dir=raw_dir,
            output_base=args.output_dir,
            frontend_public_dir=args.public_dir,
            year_filter=year_filter,
            series_filter=series_filter,
            merge_existing=not args.no_merge
        )


if __name__ == "__main__":
    main()
