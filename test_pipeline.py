"""
Comprehensive Test Suite for Cambridge IGCSE Extraction & Matching Pipeline:
- Tests syllabus taxonomy maps against frontend constants
- Tests obsolete physics topic detector on multiple historical samples
- Tests filename parsing and 2025+ calculator transition logic
- Generates synthetic Cambridge 0580 and 0625 PDFs and runs end-to-end extraction and matching
- Validates generated datasets using pipeline.audit_dataset
"""

import os
import sys
import json
import pymupdf as fitz
from PIL import Image

from pipeline.syllabus import (
    MATHS_0580_TAXONOMY,
    PHYSICS_0625_TAXONOMY,
    CHEMISTRY_0620_TAXONOMY,
    BIOLOGY_0610_TAXONOMY,
    is_physics_question_obsolete,
    classify_question,
)
from pipeline.extract_math import parse_cambridge_filename as parse_math_filename, extract_math_paper
from pipeline.extract_physics import parse_cambridge_filename as parse_phys_filename, extract_physics_paper
from pipeline.ms_matcher_math import match_math_mark_scheme
from pipeline.ms_matcher_physics import match_physics_mark_scheme
from pipeline.audit_dataset import audit_dataset_file


def test_syllabus_taxonomy():
    print(">>> Testing Syllabus Taxonomy...")
    assert len(MATHS_0580_TAXONOMY) == 9, f"Expected 9 topics for 0580, got {len(MATHS_0580_TAXONOMY)}"
    assert len(PHYSICS_0625_TAXONOMY) == 6, f"Expected 6 topics for 0625, got {len(PHYSICS_0625_TAXONOMY)}"
    assert len(CHEMISTRY_0620_TAXONOMY) == 12, f"Expected 12 topics for 0620, got {len(CHEMISTRY_0620_TAXONOMY)}"
    assert len(BIOLOGY_0610_TAXONOMY) == 21, f"Expected 21 topics for 0610, got {len(BIOLOGY_0610_TAXONOMY)}"

    # Check specific subtopics
    assert "Surds" in MATHS_0580_TAXONOMY["1. Number"]
    assert "Differentiation" in MATHS_0580_TAXONOMY["2. Algebra and graphs"]
    assert "Circle theorems II" in MATHS_0580_TAXONOMY["4. Geometry"]
    assert "The Universe" in PHYSICS_0625_TAXONOMY["6. Space physics"]
    print("✓ Syllabus taxonomy counts and subtopics verified.")


def test_obsolete_physics():
    print(">>> Testing Obsolete Physics Rules...")
    # 1. Logic gates
    obs, cat = is_physics_question_obsolete("Figure shows a NAND logic gate. Complete the truth table.", year=2021)
    assert obs and "logic gates" in cat.lower(), f"Failed logic gate check: {obs}, {cat}"

    # 2. Barometers / Manometers
    obs, cat = is_physics_question_obsolete("A mercury barometer has a column of height 760 mm Hg.", year=2019)
    assert obs and "barometer" in cat.lower(), f"Failed barometer check: {obs}, {cat}"

    # 3. Thermocouple
    obs, cat = is_physics_question_obsolete("State why a thermocouple thermometer is suitable for measuring high temperatures.", year=2018)
    assert obs and "thermocouple" in cat.lower(), f"Failed thermocouple check: {obs}, {cat}"

    # 4. Latent heat
    obs, cat = is_physics_question_obsolete("Calculate the specific latent heat of fusion of ice using E = mL.", year=2020)
    assert obs and "latent heat" in cat.lower(), f"Failed latent heat check: {obs}, {cat}"

    # 5. Non-obsolete in 2024 (>= 2023)
    obs, _ = is_physics_question_obsolete("Calculate the pressure of liquid using p = rho g h.", year=2024)
    assert not obs, "Question in 2024 should not be flagged obsolete"

    print("✓ Obsolete physics rules verified.")


def test_filename_parsing():
    print(">>> Testing Cambridge Filename Parsing & Transition Rules...")
    # 0580 2025 Paper 2: Non-Calc, Extended
    m1 = parse_math_filename("0580_s25_qp_22.pdf")
    assert m1["year"] == 2025
    assert m1["paper"] == 2
    assert m1["tier"] == "extended"
    assert m1["calculator_allowed"] is False
    assert m1["syllabus_era"] == "2025-2028"

    # 0580 2025 Paper 4: Calc, Extended
    m2 = parse_math_filename("0580_s25_qp_42.pdf")
    assert m2["calculator_allowed"] is True
    assert m2["syllabus_era"] == "2025-2028"

    # 0580 2023 Paper 2: Pre-2025 (Calc allowed)
    m3 = parse_math_filename("0580_w23_qp_21.pdf")
    assert m3["year"] == 2023
    assert m3["calculator_allowed"] is True
    assert m3["syllabus_era"] == "2016-2024"

    # 0625 Physics
    p1 = parse_phys_filename("0625_w24_qp_41.pdf")
    assert p1["tier"] == "extended"
    assert p1["paper"] == 4
    assert p1["calculator_allowed"] is True

    p2 = parse_phys_filename("0625_s24_qp_11.pdf")
    assert p2["tier"] == "core"
    assert p2["paper"] == 1

    p3 = parse_phys_filename("0625_m25_qp_62.pdf")
    assert p3["tier"] == "practical"
    assert p3["paper"] == 6

    print("✓ Cambridge filename metadata and calculator transition rules verified.")


def create_synthetic_math_pdf(qp_path: str, ms_path: str):
    """Creates synthetic 0580 QP and MS PDFs for end-to-end testing."""
    os.makedirs(os.path.dirname(qp_path), exist_ok=True)
    os.makedirs(os.path.dirname(ms_path), exist_ok=True)

    # QP: 3 pages (Cover, Formula Sheet, Questions)
    doc_qp = fitz.open()

    # Page 0: Cover
    p0 = doc_qp.new_page()
    p0.insert_text((72, 100), "Cambridge IGCSE\nMATHEMATICS 0580/22\nPaper 2 (Extended)\n2 hours\nINSTRUCTIONS\nAnswer all questions.", fontsize=12)

    # Page 1: Formula Sheet
    p1 = doc_qp.new_page()
    p1.insert_text((72, 100), "Formula Sheet\nArea of trapezium = 1/2 (a + b) h\nVolume of sphere = 4/3 pi r^3", fontsize=12)

    # Page 2: Questions 1 & 2
    p2 = doc_qp.new_page()
    p2.insert_text((50, 100), "1  Write 35% as a fraction in its simplest form.\n\n                                            [1]", fontsize=11)
    p2.insert_text((50, 250), "2  Expand and simplify.\n   (x + 3)(x - 5)\n\n                                            [2]\n                                            [Total: 2]", fontsize=11)
    p2.insert_text((50, 780), "© UCLES 2025          0580/22/M/J/25          [Turn over", fontsize=9)

    doc_qp.save(qp_path)
    doc_qp.close()

    # MS: 2 pages (Generic principles, Table)
    doc_ms = fitz.open()
    pm0 = doc_ms.new_page()
    pm0.insert_text((72, 100), "GENERIC MARKING PRINCIPLES\nMarks should be awarded using the full scale...", fontsize=11)

    pm1 = doc_ms.new_page()
    pm1.insert_text((50, 60), "Question    Answer                Marks    Guidance", fontsize=11)
    pm1.insert_text((50, 100), "1           7/20                  1        B1 for 35/100 or equivalent", fontsize=10)
    pm1.insert_text((50, 200), "2           x^2 - 2x - 15         2        B1 for x^2 - 5x + 3x - 15 or 3 terms correct", fontsize=10)
    pm1.insert_text((50, 780), "© UCLES 2025          Page 2 of 2", fontsize=9)

    doc_ms.save(ms_path)
    doc_ms.close()


def create_synthetic_physics_mcq_pdf(qp_path: str, ms_path: str):
    """Creates synthetic 0625 MCQ QP and MS PDFs for testing."""
    os.makedirs(os.path.dirname(qp_path), exist_ok=True)
    os.makedirs(os.path.dirname(ms_path), exist_ok=True)

    doc_qp = fitz.open()
    # Cover
    p0 = doc_qp.new_page()
    p0.insert_text((72, 100), "Cambridge IGCSE\nPHYSICS 0625/11\nPaper 1 Multiple Choice (Core)\n45 minutes", fontsize=12)

    # Questions 1 and 2
    p1 = doc_qp.new_page()
    p1.insert_text((50, 80), "1  Which quantity is a scalar?\n   A  acceleration\n   B  force\n   C  mass\n   D  velocity", fontsize=11)
    p1.insert_text((50, 220), "2  A car travels at a constant speed of 15 m/s for 20 s.\n   What is the distance travelled?\n   A  0.75 m\n   B  35 m\n   C  300 m\n   D  600 m", fontsize=11)
    p1.insert_text((50, 780), "© UCLES 2024          0625/11/M/J/24          [Turn over", fontsize=9)

    doc_qp.save(qp_path)
    doc_qp.close()

    # MCQ MS
    doc_ms = fitz.open()
    pm0 = doc_ms.new_page()
    pm0.insert_text((72, 60), "Cambridge IGCSE - Mark Scheme\nQuestion   Answer\n1          C\n2          C", fontsize=11)
    doc_ms.save(ms_path)
    doc_ms.close()


def test_end_to_end_extraction():
    print(">>> Testing End-to-End Extraction & Mark Scheme Matching...")
    test_dir = "tmp_test_pipeline"
    os.makedirs(test_dir, exist_ok=True)

    math_qp = os.path.join(test_dir, "0580_s25_qp_22.pdf")
    math_ms = os.path.join(test_dir, "0580_s25_ms_22.pdf")
    create_synthetic_math_pdf(math_qp, math_ms)

    math_questions = extract_math_paper(math_qp, output_dir=os.path.join(test_dir, "output/0580/questions"))
    assert len(math_questions) == 2, f"Expected 2 math questions, got {len(math_questions)}"
    q1 = math_questions[0]
    assert q1["question_number"] == 1
    assert q1["calculator_allowed"] is False
    assert q1["syllabus_era"] == "2025-2028"
    assert q1["tier"] == "extended"
    assert os.path.exists(os.path.join(test_dir, q1["question_image_url"].lstrip("/")))

    math_ms_crops = match_math_mark_scheme(math_ms, output_dir=os.path.join(test_dir, "output/0580/mark_schemes"))
    assert 1 in math_ms_crops and 2 in math_ms_crops
    assert os.path.exists(math_ms_crops[1])

    # Physics MCQ Test
    phys_qp = os.path.join(test_dir, "0625_s24_qp_11.pdf")
    phys_ms = os.path.join(test_dir, "0625_s24_ms_11.pdf")
    create_synthetic_physics_mcq_pdf(phys_qp, phys_ms)

    phys_questions = extract_physics_paper(phys_qp, output_dir=os.path.join(test_dir, "output/0625/questions"))
    assert len(phys_questions) == 2, f"Expected 2 physics MCQs, got {len(phys_questions)}"
    assert phys_questions[0]["is_mcq"] is True
    assert phys_questions[0]["total_marks"] == 1

    phys_ms_crops, mcq_keys = match_physics_mark_scheme(phys_ms, output_dir=os.path.join(test_dir, "output/0625/mark_schemes"))
    assert mcq_keys.get(1) == "C"
    assert mcq_keys.get(2) == "C"

    # Attach MCQ answers and test dataset audit
    for q in phys_questions:
        q_num = q["question_number"]
        if q_num in mcq_keys:
            q["correct_answer"] = mcq_keys[q_num]

    test_math_json = os.path.join(test_dir, "test_dataset_math.json")
    with open(test_math_json, "w", encoding="utf-8") as f:
        json.dump(math_questions, f, indent=2)

    passed, report = audit_dataset_file(test_math_json, base_search_dirs=[test_dir])
    assert passed, f"Math dataset audit failed: {report}"

    print("✓ End-to-end extraction, matching, and dataset audit passed successfully.")


if __name__ == "__main__":
    test_syllabus_taxonomy()
    test_obsolete_physics()
    test_filename_parsing()
    test_end_to_end_extraction()
    print("\n=======================================================")
    print("ALL TESTS PASSED! Pipeline components operating nominally.")
    print("=======================================================")
