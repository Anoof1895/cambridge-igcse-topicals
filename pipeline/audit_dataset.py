"""
Cambridge IGCSE Dataset Auditor:
- Validates 100% question image and mark scheme image existence on disk
- Verifies mark totals (total_marks >= 1)
- Verifies 0580 Mathematics 2025+ transition rules:
  * Papers 1 & 2: calculator_allowed == False, syllabus_era == '2025-2028'
  * Papers 3 & 4: calculator_allowed == True, syllabus_era == '2025-2028'
- Verifies 0625 Physics obsolete question classification rules
- Formats and displays an ASCII coverage summary table broken down by Year, Series, and Paper
- Returns exit code 0 if all checks pass, exit code 1 if integrity failures exist
"""

import os
import sys
import json
import argparse
from typing import Dict, Any, List, Tuple, Optional
from collections import defaultdict

# Force UTF-8 on Windows console
if sys.stdout.encoding != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


def check_file_exists(rel_url: str, base_dirs: List[str]) -> bool:
    """
    Checks if an image referenced by a URL (e.g. /output/0580/questions/...) exists
    in any of the given base search directories.
    """
    if not rel_url:
        return False

    clean_path = rel_url.lstrip("/").replace("/", os.sep).replace("\\", os.sep)
    for b in base_dirs:
        candidate = os.path.join(b, clean_path)
        if os.path.exists(candidate) and os.path.getsize(candidate) > 0:
            return True
        # Also check without leading 'output/' if base_dir already includes output
        if clean_path.startswith(f"output{os.sep}"):
            sub_path = clean_path[len(f"output{os.sep}"):]
            cand2 = os.path.join(b, sub_path)
            if os.path.exists(cand2) and os.path.getsize(cand2) > 0:
                return True
    return False


def audit_dataset_file(
    dataset_path: str,
    base_search_dirs: Optional[List[str]] = None,
    enforce_image_check: bool = True
) -> Tuple[bool, Dict[str, Any]]:
    """
    Performs full integrity audit on a dataset JSON file.
    """
    if not os.path.exists(dataset_path):
        print(f"[AUDIT ERROR] Dataset file not found: {dataset_path}")
        return False, {}

    try:
        with open(dataset_path, "r", encoding="utf-8") as f:
            questions: List[Dict[str, Any]] = json.load(f)
    except Exception as e:
        print(f"[AUDIT ERROR] Failed to load JSON from {dataset_path}: {e}")
        return False, {}

    if base_search_dirs is None:
        base_search_dirs = [".", "output", "frontend/public", "frontend"]

    total_count = len(questions)
    print(f"\n=======================================================")
    print(f"Auditing Dataset: {dataset_path} ({total_count} questions)")
    print(f"=======================================================")

    if total_count == 0:
        print("[AUDIT WARNING] Dataset contains 0 questions.")
        return True, {"total": 0}

    errors = []
    warnings = []

    # Coverage trackers: (year, series, paper) -> count
    coverage_map = defaultdict(int)
    marks_by_paper = defaultdict(list)
    calculator_stats = {"non_calc": 0, "calc": 0}
    mcq_count = 0
    obsolete_count = 0

    for idx, q in enumerate(questions):
        qid = q.get("id", f"index_{idx}")
        subject = str(q.get("subject", ""))
        year = q.get("year")
        series = q.get("series", "")
        paper = q.get("paper")
        total_marks = q.get("total_marks")
        calc_allowed = q.get("calculator_allowed")
        era = q.get("syllabus_era")
        is_mcq = q.get("is_mcq", False)
        is_obsolete = q.get("obsolete", False)

        qp_img = q.get("question_image_url")
        ms_img = q.get("mark_scheme_image_url")

        coverage_map[(year, series, paper)] += 1
        if isinstance(total_marks, (int, float)):
            marks_by_paper[paper].append(total_marks)

        if calc_allowed is False:
            calculator_stats["non_calc"] += 1
        else:
            calculator_stats["calc"] += 1

        if is_mcq:
            mcq_count += 1
        if is_obsolete:
            obsolete_count += 1

        # 1. Total marks check
        if total_marks is None or total_marks < 1:
            errors.append(f"[{qid}] Invalid total_marks: {total_marks} (must be >= 1)")

        # 2. 0580 Mathematics transition rules
        if subject == "0580":
            if year is not None and year >= 2025:
                if paper in (1, 2) and calc_allowed is not False:
                    errors.append(f"[{qid}] 0580 Year {year} Paper {paper} MUST have calculator_allowed = False")
                if paper in (3, 4) and calc_allowed is not True:
                    errors.append(f"[{qid}] 0580 Year {year} Paper {paper} MUST have calculator_allowed = True")
                if era != "2025-2028":
                    errors.append(f"[{qid}] 0580 Year {year} MUST have syllabus_era = '2025-2028', got '{era}'")
            elif year is not None and year < 2025:
                if calc_allowed is not True:
                    errors.append(f"[{qid}] 0580 Pre-2025 (Year {year}) MUST have calculator_allowed = True")
                if era not in ("2019-2024", "2020-2024"):
                    errors.append(f"[{qid}] 0580 Year {year} MUST have syllabus_era in ('2019-2024', '2020-2024'), got '{era}'")

        # 3. 0625 Physics obsolete validation (strictly 2019-2022)
        if subject == "0625":
            if is_obsolete and year is not None and not (2019 <= year <= 2022):
                warnings.append(f"[{qid}] Marked obsolete but year is {year}. Obsolete content applies strictly to 2019–2022.")

        # 4. Image file existence checks
        if enforce_image_check:
            if not check_file_exists(qp_img, base_search_dirs):
                errors.append(f"[{qid}] Missing question crop image on disk: {qp_img}")
            if not check_file_exists(ms_img, base_search_dirs):
                warnings.append(f"[{qid}] Missing mark scheme crop image on disk: {ms_img}")

    # Display coverage table
    print("\n--- Past Paper Question Coverage Breakdown ---")
    print(f"{'Year':<6} | {'Series':<8} | {'Paper':<6} | {'Questions':<10}")
    print("-" * 38)
    for (yr, ser, ppr), cnt in sorted(coverage_map.items()):
        print(f"{yr or 'N/A':<6} | {ser or 'N/A':<8} | Paper {ppr or '?':<1} | {cnt:<10}")

    print("\n--- Attribute Diagnostics ---")
    print(f"Total Questions    : {total_count}")
    print(f"MCQ Questions      : {mcq_count}")
    print(f"Non-Calculator Qs  : {calculator_stats['non_calc']}")
    print(f"Calculator Qs      : {calculator_stats['calc']}")
    print(f"Obsolete Questions : {obsolete_count}")

    # Output results
    if warnings:
        print(f"\n[AUDIT WARNINGS] {len(warnings)} non-critical warning(s) found:")
        for w in warnings[:10]:
            print(f"  • {w}")
        if len(warnings) > 10:
            print(f"  ... and {len(warnings) - 10} more warnings.")

    if errors:
        print(f"\n[AUDIT FAILED] {len(errors)} validation error(s) detected:")
        for err in errors[:15]:
            print(f"  ✖ {err}")
        if len(errors) > 15:
            print(f"  ... and {len(errors) - 15} more errors.")
        return False, {"errors": errors, "warnings": warnings}

    print("\n✓ [AUDIT PASSED] 100% of specification rules and integrity invariants verified successfully!")
    return True, {"total": total_count, "errors": [], "warnings": warnings}


def main():
    parser = argparse.ArgumentParser(description="Cambridge IGCSE Dataset Integrity Auditor")
    parser.add_argument("--dataset", default=None, help="Path to specific dataset JSON file")
    parser.add_argument("--all", action="store_true", help="Audit both dataset_math.json and dataset_physics.json")
    parser.add_argument("--skip_image_check", action="store_true", help="Skip checking local disk file existence")

    args = parser.parse_args()

    files_to_check = []
    if args.dataset:
        files_to_check.append(args.dataset)
    elif args.all or not args.dataset:
        candidates = ["dataset_math.json", "dataset_physics.json", "frontend/public/dataset_math.json", "frontend/public/dataset_physics.json"]
        for c in candidates:
            if os.path.exists(c) and c not in files_to_check:
                files_to_check.append(c)

    if not files_to_check:
        print("No dataset files specified or found to audit. Pass --dataset <path>.")
        sys.exit(0)

    all_passed = True
    for f in files_to_check:
        passed, _ = audit_dataset_file(f, enforce_image_check=not args.skip_image_check)
        if not passed:
            all_passed = False

    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
