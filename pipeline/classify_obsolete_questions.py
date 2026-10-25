"""
Batch Question Syllabus Removals Classifier using Gemini API
Upgrades the obsolete question filter across all 4 subjects:
- Physics (0625)
- Mathematics (0580)
- Chemistry (0620)
- Biology (0610)

Uses syllabus_removals.py rubric, Gemini API with dual API keys,
persistent caching in pipeline/obsolete_cache.json, and writes enriched
fields ('is_obsolete', 'obsolete', 'obsolete_reason') into frontend/public/dataset_*.json
"""

import os
import sys
import json
import re
import time
import random
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading

# Force UTF-8 encoding
try:
    if sys.stdout.encoding != "utf-8":
        sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
    else:
        sys.stdout.reconfigure(line_buffering=True)
    if sys.stderr.encoding != "utf-8":
        sys.stderr.reconfigure(encoding="utf-8", line_buffering=True)
    else:
        sys.stderr.reconfigure(line_buffering=True)
except Exception:
    pass

import dotenv
dotenv.load_dotenv()

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from google import genai
from google.genai import types

from pipeline.syllabus_removals import (
    CUTOFF_YEARS,
    is_always_current,
    get_subject_removals_prompt,
    evaluate_rule_based_obsolete,
)
from pipeline.gemini_classifier import PDFTextCache

CACHE_FILE = os.path.join(os.path.dirname(__file__), "obsolete_cache.json")
CACHE_LOCK = threading.Lock()

SUBJECT_CODE_TO_FILE = {
    "0625": "dataset_physics.json",
    "0580": "dataset_math.json",
    "0620": "dataset_chemistry.json",
    "0610": "dataset_biology.json",
}

MODELS_TO_TRY = [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.8-flash",
    "gemini-3.6-flash",
]


class DualKeyManager:
    """Rotates across available Gemini API keys with thread-safety."""
    def __init__(self):
        self.keys = []
        k1 = os.environ.get("GEMINI_API_KEY")
        k2 = os.environ.get("GEMINI_API_KEY_2")
        if k1 and k1.strip():
            self.keys.append(("KEY_1", k1.strip()))
        if k2 and k2.strip():
            self.keys.append(("KEY_2", k2.strip()))

        if not self.keys:
            raise ValueError("No GEMINI_API_KEY or GEMINI_API_KEY_2 found in environment!")

        self.index = 0
        self.lock = threading.Lock()
        self.clients = {label: genai.Client(api_key=key) for label, key in self.keys}
        print(f"[KeyManager] Initialized with {len(self.keys)} API keys: {[l for l, _ in self.keys]}")

    def get_client(self) -> Tuple[str, Any]:
        with self.lock:
            label, _ = self.keys[self.index % len(self.keys)]
            self.index += 1
            return label, self.clients[label]


def load_obsolete_cache() -> Dict[str, Dict[str, Any]]:
    """Loads obsolete_cache.json or initializes empty dict."""
    with CACHE_LOCK:
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                print(f"[WARNING] Error reading obsolete_cache.json: {e}")
        return {}


def save_obsolete_cache(cache: Dict[str, Dict[str, Any]]) -> None:
    """Atomically saves obsolete_cache.json."""
    with CACHE_LOCK:
        temp_file = CACHE_FILE + ".tmp"
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(cache, f, indent=2, ensure_ascii=False)
        if os.path.exists(CACHE_FILE):
            os.replace(temp_file, CACHE_FILE)
        else:
            os.rename(temp_file, CACHE_FILE)


def classify_batch_with_gemini(
    key_manager: DualKeyManager,
    subject: str,
    batch: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Submits a batch of questions to Gemini to classify obsolete status.
    Returns list of dicts: [{"id": qid, "is_obsolete": bool, "obsolete_reason": str | None}]
    """
    removals_prompt = get_subject_removals_prompt(subject)

    questions_payload = []
    for q in batch:
        questions_payload.append({
            "id": q["id"],
            "question_number": q.get("question_number"),
            "year": q.get("year"),
            "paper": q.get("paper"),
            "topic": q.get("topic", ""),
            "subtopic": q.get("subtopic", ""),
            "text": q.get("text", "")[:750],
        })

    prompt = (
        f"You are a Cambridge Assessment International Education ({subject}) syllabus verification specialist.\n\n"
        f"{removals_prompt}\n\n"
        "Carefully evaluate each of the following past examination questions against the syllabus exclusion rubric above:\n"
        f"{json.dumps(questions_payload, indent=2)}\n\n"
        "Return a strictly valid JSON array of objects with the exact schema:\n"
        "[\n"
        "  {\n"
        '    "id": "question_id",\n'
        '    "is_obsolete": true,\n'
        '    "obsolete_reason": "Concise reason specifying which removed concept was tested"\n'
        "  },\n"
        "  {\n"
        '    "id": "question_id_2",\n'
        '    "is_obsolete": false,\n'
        '    "obsolete_reason": null\n'
        "  }\n"
        "]\n"
    )

    last_error = None
    for model_name in MODELS_TO_TRY:
        for attempt in range(3):
            key_label, client = key_manager.get_client()
            try:
                resp = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.0,
                    )
                )
                raw = resp.text.strip()
                if raw.startswith("```json"):
                    raw = raw[7:]
                elif raw.startswith("```"):
                    raw = raw[3:]
                if raw.endswith("```"):
                    raw = raw[:-3]
                raw = raw.strip()

                parsed = json.loads(raw)
                if isinstance(parsed, dict) and "questions" in parsed:
                    parsed = parsed["questions"]
                if isinstance(parsed, list):
                    return parsed

            except Exception as e:
                last_error = e
                err_str = str(e).lower()
                # If unavailable (503) or rate-limited (429), back off or try next key/model
                if "503" in err_str or "unavailable" in err_str or "high demand" in err_str:
                    time.sleep(1.0 + random.uniform(0.5, 1.5))
                    break  # Switch to next model
                elif "429" in err_str or "resource_exhausted" in err_str:
                    time.sleep(2.0 + attempt * 2.0)
                else:
                    time.sleep(1.0)

    print(f"[WARNING] Batch of {len(batch)} Qs failed on all models: {last_error}")
    # Fallback to rule-based evaluation if API call failed
    fallback_res = []
    for q in batch:
        rule_obs, rule_reason = evaluate_rule_based_obsolete(
            subject, q.get("text", ""), q.get("year"), q.get("paper")
        )
        fallback_res.append({
            "id": q["id"],
            "is_obsolete": rule_obs,
            "obsolete_reason": rule_reason if rule_obs else None,
        })
    return fallback_res


def process_subject(
    subject: str,
    key_manager: DualKeyManager,
    pdf_cache: PDFTextCache,
    cache: Dict[str, Dict[str, Any]],
    batch_size: int = 25,
) -> Tuple[int, int]:
    """
    Processes all questions for a subject, classifying pre-cutoff questions.
    Returns (total_evaluated, total_obsolete).
    """
    filename = SUBJECT_CODE_TO_FILE.get(subject)
    if not filename:
        return 0, 0

    dataset_path = os.path.join(REPO_ROOT, "frontend", "public", filename)
    if not os.path.exists(dataset_path):
        dataset_path = os.path.join(REPO_ROOT, filename)
    if not os.path.exists(dataset_path):
        print(f"[{subject}] Dataset file not found: {filename}")
        return 0, 0

    with open(dataset_path, "r", encoding="utf-8") as f:
        questions: List[Dict[str, Any]] = json.load(f)

    cutoff = CUTOFF_YEARS.get(subject, 2023)
    print(f"\n=======================================================")
    print(f"[{subject}] Processing {len(questions)} total questions (Cutoff year: {cutoff})")
    print(f"=======================================================")

    # 1. Immediately cache all questions from current years (>= cutoff)
    current_count = 0
    to_evaluate: List[Dict[str, Any]] = []

    for q in questions:
        qid = q["id"]
        year = q.get("year")
        if is_always_current(subject, year):
            current_count += 1
            if qid not in cache:
                cache[qid] = {"is_obsolete": False, "obsolete_reason": None}
        else:
            if qid not in cache:
                to_evaluate.append(q)

    print(f"[{subject}] {current_count} questions are year >= {cutoff} (strictly current).")
    print(f"[{subject}] {len(to_evaluate)} pre-cutoff questions need classification ({len(questions) - current_count - len(to_evaluate)} already cached).")

    if to_evaluate:
        print(f"[{subject}] Extracting text for {len(to_evaluate)} questions...", flush=True)
        for idx, q in enumerate(to_evaluate):
            q["text"] = pdf_cache.extract_text(q)

        # First pass: check deterministic rule-based matches
        rule_matched = 0
        still_needed = []
        for q in to_evaluate:
            r_obs, r_reason = evaluate_rule_based_obsolete(
                subject, q["text"], q.get("year"), q.get("paper")
            )
            if r_obs:
                cache[q["id"]] = {"is_obsolete": True, "obsolete_reason": r_reason}
                rule_matched += 1
            else:
                still_needed.append(q)

        print(f"[{subject}] {rule_matched} questions unequivocally matched deterministic rubric rules.")
        print(f"[{subject}] {len(still_needed)} questions queued for Gemini API verification.")

        # Batch API requests
        batches = [still_needed[i:i + batch_size] for i in range(0, len(still_needed), batch_size)]

        def worker(b: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
            return classify_batch_with_gemini(key_manager, subject, b)

        completed_batches = 0
        with ThreadPoolExecutor(max_workers=4) as executor:
            future_to_batch = {executor.submit(worker, b): b for b in batches}
            for future in as_completed(future_to_batch):
                batch_res = future.result()
                for item in batch_res:
                    qid = item.get("id")
                    if qid:
                        is_obs = bool(item.get("is_obsolete", False))
                        obs_reason = item.get("obsolete_reason") if is_obs else None
                        cache[qid] = {
                            "is_obsolete": is_obs,
                            "obsolete_reason": obs_reason,
                        }
                completed_batches += 1
                if completed_batches % 5 == 0 or completed_batches == len(batches):
                    print(f"  [{subject}] Processed {completed_batches}/{len(batches)} batches...", flush=True)
                    save_obsolete_cache(cache)

        save_obsolete_cache(cache)

    # 2. Enrich and update dataset with cached results
    total_obsolete = 0
    for q in questions:
        qid = q["id"]
        c_entry = cache.get(qid, {"is_obsolete": False, "obsolete_reason": None})
        is_obs = bool(c_entry.get("is_obsolete", False))
        obs_reason = c_entry.get("obsolete_reason") if is_obs else None

        q["is_obsolete"] = is_obs
        q["obsolete"] = is_obs  # Maintain backward compatibility
        q["obsolete_reason"] = obs_reason
        if is_obs:
            total_obsolete += 1

    # Write back to frontend/public/ and root
    target_files = [
        os.path.join(REPO_ROOT, "frontend", "public", filename),
        os.path.join(REPO_ROOT, filename),
    ]
    for target in target_files:
        temp_target = target + ".tmp"
        with open(temp_target, "w", encoding="utf-8") as f:
            json.dump(questions, f, indent=2, ensure_ascii=False)
        if os.path.exists(target):
            os.replace(temp_target, target)
        else:
            os.rename(temp_target, target)

    print(f"[{subject}] SUCCESS: {total_obsolete}/{len(questions)} questions classified as obsolete.")
    return len(questions), total_obsolete


def main():
    start_time = time.time()
    key_manager = DualKeyManager()
    pdf_cache = PDFTextCache()
    cache = load_obsolete_cache()
    print(f"[Main] Loaded {len(cache)} existing cached classifications.")

    subjects = ["0625", "0580", "0620", "0610"]
    summary = {}

    for subj in subjects:
        total_q, total_obs = process_subject(subj, key_manager, pdf_cache, cache)
        summary[subj] = {"total": total_q, "obsolete": total_obs}

    save_obsolete_cache(cache)

    elapsed = time.time() - start_time
    print("\n" + "=" * 60)
    print(f"CLASSIFICATION SUMMARY (completed in {elapsed:.1f}s):")
    print("=" * 60)
    for subj, res in summary.items():
        pct = (res["obsolete"] / res["total"] * 100) if res["total"] > 0 else 0
        print(f"  Subject {subj}: {res['obsolete']}/{res['total']} questions marked obsolete ({pct:.1f}%)")
    print("=" * 60)


if __name__ == "__main__":
    main()
