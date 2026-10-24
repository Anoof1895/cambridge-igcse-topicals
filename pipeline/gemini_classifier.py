"""
Batch Topic/Subtopic Classifier using Gemini API for Cambridge IGCSE Topicals
- Classifies 0580 Mathematics & 0625 Physics questions into official syllabus taxonomy.
- Batches 35–45 questions per request using gemini-2.5-flash.
- Caches classifications in pipeline/classification_cache.json so no redundant calls or billing occur.
- Updates dataset_math.json & dataset_physics.json and syncs to frontend/public/.
"""

import os
import sys
import json
import re
import time
import random
import argparse
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
from dotenv import load_dotenv

# Force UTF-8 and line-buffering on Windows
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

# Load API key
dotenv_path = os.path.join(os.getcwd(), ".env")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    load_dotenv()

# Ensure repo root is on sys.path
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

from google import genai
import pymupdf as fitz
from pipeline.batch_scanner import parse_cambridge_filename
from pipeline.syllabus import (
    MATHS_0580_TAXONOMY,
    PHYSICS_0625_TAXONOMY,
    CHEMISTRY_0620_TAXONOMY,
    BIOLOGY_0610_TAXONOMY,
    is_question_obsolete,
    is_physics_question_obsolete,
)

CACHE_FILE = os.path.join(os.path.dirname(__file__), "classification_cache.json")


def get_subject_cache_file(subject: str) -> str:
    """Returns the dedicated subject-specific cache file path."""
    return os.path.join(os.path.dirname(__file__), f"classification_cache_{subject}.json")


def load_cache_for_subject(subject: str) -> Dict[str, Dict[str, Any]]:
    """
    Loads subject-specific cache from classification_cache_<subject>.json.
    Falls back to and seeds from central classification_cache.json if needed.
    """
    subj_file = get_subject_cache_file(subject)
    cache: Dict[str, Dict[str, Any]] = {}
    if os.path.exists(subj_file):
        try:
            with open(subj_file, "r", encoding="utf-8") as f:
                cache = json.load(f)
        except Exception as e:
            print(f"[WARNING] Error reading subject cache {subj_file}: {e}")
            cache = {}

    # Check central cache to incorporate any entries not yet in subject cache
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                central = json.load(f)
            updated = False
            for k, v in central.items():
                if k.startswith(f"{subject}_") and k not in cache:
                    cache[k] = v
                    updated = True
            if updated and not os.path.exists(subj_file):
                save_cache_for_subject(subject, cache)
        except Exception as e:
            print(f"[WARNING] Error reading central cache: {e}")

    return cache


def save_cache_for_subject(subject: str, cache: Dict[str, Dict[str, Any]]) -> None:
    """
    Atomically saves subject cache to classification_cache_<subject>.json
    and synchronizes into the central classification_cache.json.
    """
    subj_file = get_subject_cache_file(subject)
    temp_subj = subj_file + ".tmp"
    with open(temp_subj, "w", encoding="utf-8") as f:
        json.dump(cache, f, indent=2, ensure_ascii=False)
    if os.path.exists(subj_file):
        os.replace(temp_subj, subj_file)
    else:
        os.rename(temp_subj, subj_file)

    # Sync to central classification_cache.json
    try:
        central = {}
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, "r", encoding="utf-8") as f:
                    central = json.load(f)
            except Exception:
                central = {}
        central.update(cache)
        temp_central = CACHE_FILE + ".tmp"
        with open(temp_central, "w", encoding="utf-8") as f:
            json.dump(central, f, indent=2, ensure_ascii=False)
        if os.path.exists(CACHE_FILE):
            os.replace(temp_central, CACHE_FILE)
        else:
            os.rename(temp_central, CACHE_FILE)
    except Exception as e:
        print(f"[WARNING] Could not sync central cache: {e}")


def load_cache() -> Dict[str, Dict[str, Any]]:
    """Loads central cache for all subjects."""
    if os.path.exists(CACHE_FILE):
        try:
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[WARNING] Error reading cache file: {e}")
    return {}


def save_cache(cache: Dict[str, Dict[str, Any]]) -> None:
    temp_file = CACHE_FILE + ".tmp"
    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(cache, f, indent=2, ensure_ascii=False)
    if os.path.exists(CACHE_FILE):
        os.replace(temp_file, CACHE_FILE)
    else:
        os.rename(temp_file, CACHE_FILE)


class PDFTextCache:
    """Caches extracted text per question by indexing each paper once on demand."""
    def __init__(self, raw_dir: str = "pipeline/raw_papers"):
        self.raw_dir = raw_dir
        self.qp_map: Dict[str, str] = {}
        self._build_qp_map()
        self.paper_questions: Dict[str, Dict[int, str]] = {}

    def _build_qp_map(self):
        for p in Path(self.raw_dir).rglob("*.pdf"):
            meta = parse_cambridge_filename(str(p))
            if meta and meta["type"] == "qp":
                self.qp_map[meta["paper_id"]] = str(p)

    def _index_paper(self, paper_id: str) -> Dict[int, str]:
        if paper_id in self.paper_questions:
            return self.paper_questions[paper_id]

        pdf_path = self.qp_map.get(paper_id)
        if not pdf_path or not os.path.exists(pdf_path):
            self.paper_questions[paper_id] = {}
            return {}

        q_dict: Dict[int, List[str]] = {}
        try:
            doc = fitz.open(pdf_path)
            cur_q = None
            for p_idx in range(len(doc)):
                page = doc[p_idx]
                page_text = page.get_text()
                # Skip back-matter periodic tables or data sheets
                if "The Periodic Table of Elements" in page_text or "DATA SHEET" in page_text:
                    continue

                blocks = page.get_text("blocks")
                blocks.sort(key=lambda b: (b[1], b[0]))
                for b in blocks:
                    raw_txt = b[4]
                    clean_txt = re.sub(r"[\x00-\x08\x0b-\x1f]", " ", raw_txt).strip()
                    if b[1] < 40.0 or b[1] > page.rect.height - 40.0:
                        continue
                    if re.search(r"UCLES|Cambridge|0625/|0580/|0620/|0610/|\[Turn\s+over\]", clean_txt):
                        continue

                    # Split text blocks that contain question headers
                    parts = re.split(
                        r"(?:^|\n|\s{2,})(\d{1,2})\s+(?=[A-Z]|The\b|A\b|An\b|Which\b|What\b|Why\b|How\b|State\b|Define\b|Describe\b|Explain\b|Calculate\b|Give\b|Fig|\()",
                        clean_txt
                    )
                    if len(parts) > 1:
                        if cur_q is not None and parts[0].strip():
                            q_dict.setdefault(cur_q, []).append(parts[0].strip())
                        for i in range(1, len(parts), 2):
                            cur_q = int(parts[i])
                            body = parts[i + 1].strip()
                            if body:
                                q_dict.setdefault(cur_q, []).append(body)
                    else:
                        if cur_q is not None:
                            q_dict.setdefault(cur_q, []).append(clean_txt)
            doc.close()
        except Exception:
            pass

        res = {k: " ".join(v).strip()[:1000] for k, v in q_dict.items()}
        self.paper_questions[paper_id] = res
        return res

    def extract_text(self, q: Dict[str, Any]) -> str:
        """Extracts the question's text from the PDF."""
        if q.get("text") and len(q["text"].strip()) > 20:
            return q["text"].strip()

        qid = q["id"]
        parts = qid.split("_")
        paper_id = "_".join(parts[:-1])
        q_num = q.get("question_number", 1)

        paper_qs = self._index_paper(paper_id)
        text = paper_qs.get(q_num, "")
        if text:
            return text
        return f"Question {q_num} from {paper_id}"


def validate_classification(
    item: Dict[str, Any],
    taxonomy: Dict[str, List[str]],
    subject: str,
    year: Optional[int],
    text: str
) -> Dict[str, Any]:
    """Validates and sanitizes Gemini output against canonical taxonomy."""
    topic = item.get("topic", "").strip()
    subtopic = item.get("subtopic", "").strip()
    obsolete = bool(item.get("obsolete", False))

    # 1. Match topic
    valid_topic = None
    if topic in taxonomy:
        valid_topic = topic
    else:
        # Check by leading digit e.g. "1" or "1." or "Topic 1"
        m_num = re.match(r"^(?:topic\s*)?(\d+)", topic, re.I)
        if m_num:
            prefix = f"{m_num.group(1)}."
            for canon_top in taxonomy.keys():
                if canon_top.startswith(prefix):
                    valid_topic = canon_top
                    break

        if not valid_topic:
            # Fuzzy match topic by keywords
            for canon_top in taxonomy.keys():
                canon_clean = re.sub(r"^\d+\.\s*", "", canon_top).lower()
                topic_clean = re.sub(r"^\d+\.\s*", "", topic).lower()
                if topic_clean in canon_clean or canon_clean in topic_clean:
                    valid_topic = canon_top
                    break

    # 2. Match subtopic within valid_topic
    valid_subtopic = None
    if valid_topic:
        subtopic_list = taxonomy[valid_topic]
        if subtopic in subtopic_list:
            valid_subtopic = subtopic
        else:
            sub_lower = subtopic.lower()
            for cand in subtopic_list:
                cand_lower = cand.lower()
                if sub_lower in cand_lower or cand_lower in sub_lower:
                    valid_subtopic = cand
                    break

    # 3. If subtopic not found in candidate topic, check across ALL taxonomy topics
    if not valid_subtopic and subtopic:
        sub_lower = subtopic.lower()
        for t_name, s_list in taxonomy.items():
            for s in s_list:
                if sub_lower in s.lower() or s.lower() in sub_lower:
                    valid_topic = t_name
                    valid_subtopic = s
                    break
            if valid_subtopic:
                break

    if not valid_topic:
        valid_topic = list(taxonomy.keys())[0]
    if not valid_subtopic:
        valid_subtopic = taxonomy[valid_topic][0]

    # 4. Multi-subtopics validation
    raw_subtopics = item.get("subtopics")
    valid_subtopics = []
    all_taxonomy_subtopics = {s.lower(): s for s_list in taxonomy.values() for s in s_list}

    if isinstance(raw_subtopics, list):
        for raw_s in raw_subtopics:
            if not isinstance(raw_s, str):
                continue
            s_clean = raw_s.strip()
            if not s_clean:
                continue
            s_low = s_clean.lower()
            if s_low in all_taxonomy_subtopics:
                matched_s = all_taxonomy_subtopics[s_low]
                if matched_s not in valid_subtopics:
                    valid_subtopics.append(matched_s)
            else:
                for cand_low, cand_name in all_taxonomy_subtopics.items():
                    if s_low in cand_low or cand_low in s_low:
                        if cand_name not in valid_subtopics:
                            valid_subtopics.append(cand_name)
                        break

    # Ensure primary valid_subtopic is at the front of valid_subtopics
    if valid_subtopic not in valid_subtopics:
        valid_subtopics.insert(0, valid_subtopic)
    else:
        valid_subtopics.remove(valid_subtopic)
        valid_subtopics.insert(0, valid_subtopic)

    valid_subtopics = valid_subtopics[:3]

    # Obsolete evaluation across all subjects based on official syllabus removals
    raw_obs_reason = item.get("obsolete_reason")
    obsolete_reason = str(raw_obs_reason).strip() if (isinstance(raw_obs_reason, str) and raw_obs_reason.strip()) else None

    rule_obs, rule_reason = is_question_obsolete(subject, text, year=year)
    if rule_obs:
        obsolete = True
        if not obsolete_reason:
            obsolete_reason = rule_reason

    # Enforce syllabus era boundaries
    if year is not None:
        if subject in ("0625", "0620", "0610") and not (2019 <= year <= 2022):
            obsolete = False
            obsolete_reason = None
        elif subject == "0580" and year > 2019:
            obsolete = False
            obsolete_reason = None

    if not obsolete:
        obsolete_reason = None

    return {
        "id": item["id"],
        "topic": valid_topic,
        "subtopic": valid_subtopic,
        "subtopics": valid_subtopics,
        "obsolete": obsolete,
        "obsolete_reason": obsolete_reason,
    }


DEFAULT_MODEL = "gemini-2.5-flash"
FALLBACK_MODELS = [
    "gemini-2.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-3.8-flash",
]

UNAVAILABLE_MODELS = set()


class GeminiKeyPool:
    """
    Manages dual/multiple Gemini API keys with round-robin load balancing,
    automatic failover on 429 rate limit errors, and health monitoring.
    """
    def __init__(self, keys: Optional[List[str]] = None):
        if not keys:
            keys = []
            for env_var in ["GEMINI_API_KEY", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3"]:
                k = os.getenv(env_var)
                if k and k.strip() and k.strip() not in keys:
                    keys.append(k.strip())
        if not keys:
            raise ValueError("No Gemini API keys found in environment or .env file.")

        self.keys = keys
        self.clients = [genai.Client(api_key=k) for k in keys]
        self.current_idx = 0
        self.key_labels = [f"Key {i+1} (...{k[-6:]})" for i, k in enumerate(keys)]
        print(f"[KEY POOL] Initialized with {len(self.keys)} active API key(s): {', '.join(self.key_labels)}", flush=True)

    @property
    def client(self) -> genai.Client:
        return self.clients[self.current_idx]

    @property
    def current_label(self) -> str:
        return self.key_labels[self.current_idx]

    def rotate_round_robin(self) -> None:
        """Rotates to next key for load balancing after each batch."""
        if len(self.clients) > 1:
            self.current_idx = (self.current_idx + 1) % len(self.clients)

    def switch_key_on_rate_limit(self) -> bool:
        """
        Switches to the next key when a 429 rate limit error occurs.
        Returns True if switched to a different key, False if only 1 key.
        """
        if len(self.clients) > 1:
            prev_label = self.key_labels[self.current_idx]
            self.current_idx = (self.current_idx + 1) % len(self.clients)
            new_label = self.key_labels[self.current_idx]
            print(f"[KEY POOL FAILOVER] Rate limit on {prev_label} -> switched to {new_label}", flush=True)
            return True
        return False


SUBJECT_REMOVALS_PROMPT: Dict[str, str] = {
    "0625": (
        "Official Cambridge IGCSE Physics (0625) Syllabus Specification:\n"
        "Topics: 1. Motion, forces and energy | 2. Thermal physics | 3. Waves | 4. Electricity and magnetism | 5. Nuclear physics | 6. Space physics.\n\n"
        "Obsolete Flagging Criteria (mark 'obsolete': true and provide concise 'obsolete_reason' for 2019-2022 papers):\n"
        "- Logic gates, digital electronics, truth tables, bistable circuits, inverter gates\n"
        "- Liquid barometers (mercury) or U-tube manometers\n"
        "- Thermal capacity calculations (C = mc, distinct from specific heat capacity c)\n"
        "- Thermocouple thermometers or liquid-in-glass thermometer design features (sensitivity, linearity, range)\n"
        "- Formal gas law calculations / formulas (Charles's law, pressure law, absolute zero; qualitative pV = constant at constant temp is retained)"
    ),
    "0620": (
        "Official Cambridge IGCSE Chemistry (0620) Syllabus Specification:\n"
        "Topics: 1. States of matter | 2. Atoms, elements and compounds | 3. Stoichiometry | 4. Electrochemistry | 5. Chemical energetics | 6. Chemical reactions | 7. Acids, bases and salts | 8. The Periodic Table | 9. Metals | 10. Chemistry of the environment | 11. Organic chemistry | 12. Experimental techniques and chemical analysis.\n\n"
        "Obsolete Flagging Criteria (mark 'obsolete': true and provide concise 'obsolete_reason' for 2019-2022 papers):\n"
        "- Extraction of zinc from zinc blende (roasting of zinc blende in blast furnace)\n"
        "- Silver salts in photography (photochemical reduction of silver halides in film/photography)\n"
        "- Simple electrochemical cells (voltage generation from two different metals dipping in electrolyte)\n"
        "- Carbohydrates, hydrolysis & chromatography (complex carbohydrates structure, acid/enzyme hydrolysis of carbohydrates/proteins, chromatography of colorless amino acids with locating agents)\n"
        "- Soil acidity treatment with lime / calcium hydroxide / calcium carbonate\n"
        "- Sulfur dioxide in food preservation or bleaching wood pulp\n"
        "- Brownian motion (removed from Chemistry; retained in Physics)\n"
        "- Carbon cycle (removed from Chemistry; retained in Biology)\n"
        "- Radioactive isotopes as energy sources (nuclear fission of uranium-235 for power generation)"
    ),
    "0610": (
        "Official Cambridge IGCSE Biology (0610) Syllabus Specification:\n"
        "Topics: 1. Characteristics and classification of living organisms | 2. Organisation of the organism | 3. Movement into and out of cells | 4. Biological molecules | 5. Enzymes | 6. Plant nutrition | 7. Human nutrition | 8. Transport in plants | 9. Transport in animals | 10. Diseases and immunity | 11. Gas exchange in humans | 12. Respiration | 13. Excretion in humans | 14. Coordination and response | 15. Drugs | 16. Reproduction | 17. Inheritance | 18. Variation and selection | 19. Organisms and their environment | 20. Human influences on ecosystems | 21. Biotechnology and genetic modification.\n\n"
        "Obsolete Flagging Criteria (mark 'obsolete': true and provide concise 'obsolete_reason' for 2019-2022 papers):\n"
        "- Misused drugs: Alcohol abuse/consumption, heroin addiction, tobacco smoking effects (carbon monoxide, nicotine, tar causing bronchitis/emphysema/cancer), anabolic steroids\n"
        "- Methods of birth control in humans: Natural family planning/rhythm method, barrier methods (condoms, femidoms, diaphragms, spermicides), surgical sterilization (vasectomy, tubal ligation)"
    ),
    "0580": (
        "Official Cambridge IGCSE Mathematics (0580) Syllabus Specification:\n"
        "Topics: 1. Number | 2. Algebra and graphs | 3. Coordinate geometry | 4. Geometry | 5. Mensuration | 6. Trigonometry | 7. Transformations and vectors | 8. Probability | 9. Statistics.\n\n"
        "Obsolete Flagging Criteria (mark 'obsolete': true and provide concise 'obsolete_reason' for 2019 papers):\n"
        "- Matrices and matrix transformations: Matrix multiplication, matrix arithmetic, inverse matrices, determinants, 2x2 matrix transformations"
    ),
}


def reconcile_obsolete_and_multi_subtopics(
    cache: Dict[str, Dict[str, Any]],
    dataset: List[Dict[str, Any]],
    pdf_cache: PDFTextCache,
    subject: str
) -> Tuple[int, int]:
    """
    1. Reconciles curve sketching for 0580: questions containing curve sketching terms
       receive 'Graphs of functions' and 'Sketching curves'.
    2. Evaluates questions against official Cambridge syllabus removal rules
       (0625, 0620, 0610 for 2019-2022; 0580 for 2019).
    Updates both cache and dataset with 'obsolete': True and 'obsolete_reason'.
    Returns (curve_upgrades, obsolete_count).
    """
    curve_upgrades = 0
    obsolete_count = 0

    # 1. Curve sketching reconciliation for 0580
    if subject == "0580":
        curve_regex = re.compile(
            r'(?:'
            r'sketch(?:\s+the)?\s+(?:graph|curve|following)'
            r'|sketch\s+of\s+(?:the\s+)?(?:graph|curve)'
            r'|(?:diagram|figure|sketch)\s+shows\s+(?:a\s+)?sketch'
            r'|the\s+sketch\s+shows'
            r'|\bsketch\b.*?\b(?:reciprocal|1\s*/\s*x|2\s*\^\s*x|quadratic|cubic|curve)'
            r'|\bsketch\b.*?\b(?:y\s*=|\bgraph\b)'
            r')',
            re.IGNORECASE | re.DOTALL
        )
        known_curve_qids = {"0580_s21_qp_23_q24", "0580_s23_qp_43_q07"}

        for q in dataset:
            qid = q["id"]
            txt = pdf_cache.extract_text(q)
            is_curve = qid in known_curve_qids or bool(curve_regex.search(txt))
            if is_curve:
                current_subtopics = list(q.get("subtopics", [q.get("subtopic", "")]))
                if "Sketching curves" not in current_subtopics:
                    is_trig = "trigonomet" in q.get("topic", "").lower() or "trigonomet" in q.get("subtopic", "").lower() or bool(re.search(r"\b(?:sin|cos|tan)\b", txt, re.I))
                    if is_trig:
                        q["topic"] = "6. Trigonometry"
                        q["subtopic"] = "Trigonometric functions"
                        q["subtopics"] = ["Trigonometric functions", "Sketching curves"]
                    else:
                        q["topic"] = "2. Algebra and graphs"
                        q["subtopic"] = "Graphs of functions"
                        q["subtopics"] = ["Graphs of functions", "Sketching curves"]

                    cache[qid] = {
                        "topic": q["topic"],
                        "subtopic": q["subtopic"],
                        "subtopics": q["subtopics"],
                        "obsolete": q.get("obsolete", False),
                        "obsolete_reason": q.get("obsolete_reason"),
                    }
                    curve_upgrades += 1
                else:
                    if qid in cache and "Sketching curves" not in cache[qid].get("subtopics", []):
                        cache[qid]["subtopics"] = current_subtopics
                        curve_upgrades += 1

    # 2. Syllabus removal / Obsolete evaluation across all subjects
    for q in dataset:
        qid = q["id"]
        y = q.get("year")
        txt = pdf_cache.extract_text(q)
        is_obs, obs_reason = is_question_obsolete(subject, txt, year=y)

        cached = cache.get(qid, {})
        cached_obs = cached.get("obsolete", False)
        cached_reason = cached.get("obsolete_reason")

        if is_obs:
            q["obsolete"] = True
            q["obsolete_reason"] = obs_reason or cached_reason or "Tests removed syllabus content"
            if qid in cache:
                cache[qid]["obsolete"] = True
                cache[qid]["obsolete_reason"] = q["obsolete_reason"]
            obsolete_count += 1
        elif cached_obs:
            # If cached item was marked obsolete previously, verify syllabus era cutoff
            if (subject in ("0625", "0620", "0610") and y and 2019 <= y <= 2022) or (subject == "0580" and y and y <= 2019):
                q["obsolete"] = True
                q["obsolete_reason"] = cached_reason or obs_reason or "Tests content removed in official Cambridge syllabus revisions"
                cache[qid]["obsolete"] = True
                cache[qid]["obsolete_reason"] = q["obsolete_reason"]
                obsolete_count += 1
            else:
                q["obsolete"] = False
                q["obsolete_reason"] = None
                if qid in cache:
                    cache[qid]["obsolete"] = False
                    cache[qid]["obsolete_reason"] = None
        else:
            q["obsolete"] = False
            q["obsolete_reason"] = None
            if qid in cache:
                cache[qid]["obsolete"] = False
                cache[qid]["obsolete_reason"] = None

    return curve_upgrades, obsolete_count


def reconcile_curve_sketching_and_multi_subtopics(
    cache: Dict[str, Dict[str, Any]],
    dataset: List[Dict[str, Any]],
    pdf_cache: PDFTextCache,
    subject: str
) -> int:
    """Backwards-compatible wrapper."""
    upgrades, _ = reconcile_obsolete_and_multi_subtopics(cache, dataset, pdf_cache, subject)
    return upgrades


def classify_batch_with_gemini(
    key_pool: GeminiKeyPool,
    batch: List[Dict[str, Any]],
    taxonomy: Dict[str, List[str]],
    subject: str,
    requested_model: str = DEFAULT_MODEL
) -> List[Dict[str, Any]]:
    """
    Calls Gemini with 35–50 questions and returns structured classifications.
    Uses requested_model with jittered exponential backoff (2s, 4s, 8s) on 503/429
    with dual API key failover, and switches to fallback models
    (gemini-3.8-flash -> gemini-3.5-flash-lite -> gemini-3.1-flash-lite -> gemini-2.5-flash)
    if retries are exhausted.
    """
    global UNAVAILABLE_MODELS
    taxonomy_str = json.dumps(taxonomy, indent=2)

    removals_text = SUBJECT_REMOVALS_PROMPT.get(
        subject,
        "Mark 'obsolete': true and provide 'obsolete_reason' if the question tests content removed from the syllabus."
    )

    prompt = (
        f"You are an expert Cambridge IGCSE ({subject}) principal examiner.\n"
        f"Analyze the question stem and all its sub-parts (a, b, c). If the question tests multiple concepts, "
        f"assign a primary topic/subtopic AND up to 2 secondary subtopics from the provided official taxonomy.\n\n"
        f"Official Cambridge syllabus taxonomy:\n"
        f"{taxonomy_str}\n\n"
        f"{removals_text}\n\n"
        "Questions to classify:\n"
        f"{json.dumps(batch, indent=2)}\n\n"
        "Requirements:\n"
        "1. 'topic' MUST be copied exactly from the top-level taxonomy keys (including number prefix, e.g. '1. Number' or '1. Motion, forces and energy').\n"
        "2. 'subtopic' MUST be copied exactly from that primary topic's subtopic array.\n"
        "3. 'subtopics' MUST be an array containing the primary 'subtopic' plus up to 2 secondary subtopics (1 to 3 items total) testing concepts across parts (a, b, c).\n"
        "   - For multi-part questions (parts a, b, c) or questions combining multiple syllabus areas, you MUST provide 2 or 3 distinct subtopics in 'subtopics'.\n"
        "   - Specifically for Mathematics (0580): Any question asking students to sketch a graph, curve, reciprocal (1/x), exponential (2^x), quadratic, or cubic must include 'Sketching curves' in 'subtopics'.\n"
        "4. 'obsolete' must be true ONLY if the question tests content removed from the official Cambridge syllabus (as detailed in the removal logs above). "
        "When 'obsolete' is true, 'obsolete_reason' MUST be a concise explanation specifying the removed concept. When false, 'obsolete_reason' MUST be null.\n\n"
        "Return JSON format:\n"
        "[\n"
        "  {\n"
        '    "id": "question_id",\n'
        '    "topic": "Primary Topic",\n'
        '    "subtopic": "Primary Subtopic",\n'
        '    "subtopics": ["Primary Subtopic", "Secondary Subtopic 1"],\n'
        '    "obsolete": true,\n'
        '    "obsolete_reason": "Tests liquid barometers and manometers (removed in 2023 Physics syllabus)"\n'
        "  }\n"
        "]\n"
    )

    models_to_try = [requested_model] + [m for m in FALLBACK_MODELS if m != requested_model]
    # Prioritize healthy models over temporarily unavailable models
    models_to_try.sort(key=lambda m: 1 if m in UNAVAILABLE_MODELS else 0)

    for model_name in models_to_try:
        max_attempts = max(3, len(key_pool.clients) * 2)
        for attempt in range(max_attempts):
            client = key_pool.client
            key_label = key_pool.current_label
            try:
                resp = client.models.generate_content(
                    model=model_name,
                    contents=prompt,
                    config={
                        "response_mime_type": "application/json",
                        "http_options": {"timeout": 60000}
                    }
                )
                raw = resp.text.strip()
                if raw.startswith("```json"):
                    raw = raw[7:]
                elif raw.startswith("```"):
                    raw = raw[3:]
                if raw.endswith("```"):
                    raw = raw[:-3]
                raw = raw.strip()

                data = json.loads(raw)
                if isinstance(data, dict) and "questions" in data:
                    data = data["questions"]
                if not isinstance(data, list):
                    raise ValueError(f"Expected JSON array, got {type(data)}")

                results_by_id = {item["id"]: item for item in data if isinstance(item, dict) and "id" in item}

                classified = []
                for q_in in batch:
                    qid = q_in["id"]
                    cand = results_by_id.get(qid, {"id": qid, "topic": "", "subtopic": "", "obsolete": False})
                    validated = validate_classification(
                        cand, taxonomy, subject, q_in.get("year"), q_in.get("text", "")
                    )
                    classified.append(validated)

                return classified

            except Exception as e:
                err_str = str(e)
                wait_sec = min(8.0, 2 ** (min(attempt, 2) + 1)) + random.uniform(0.1, 0.8)
                is_429 = "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower()
                is_503 = "503" in err_str or "UNAVAILABLE" in err_str or "overloaded" in err_str.lower()

                if is_429:
                    print(f"[{model_name} | {key_label}] Rate-limit / Quota exhausted (429). Jittered backoff ({wait_sec:.1f}s)...", flush=True)
                    time.sleep(wait_sec)
                    key_pool.switch_key_on_rate_limit()
                    if attempt >= max_attempts - 1:
                        UNAVAILABLE_MODELS.add(model_name)
                        print(f"[{model_name}] Quota exhausted across keys. Falling back to next model...", flush=True)
                        break
                elif is_503:
                    UNAVAILABLE_MODELS.add(model_name)
                    print(f"[{model_name} | {key_label}] 503 high demand spike: {e}. Switching immediately to next fallback model...", flush=True)
                    break
                else:
                    print(f"[{model_name} | {key_label}] Error: {e}. Switching to next fallback model...", flush=True)
                    break

    # Fallback to taxonomy defaults on complete failure of all models
    print("[ERROR] All Gemini models failed for this batch. Using canonical taxonomy fallback.", flush=True)
    fallback = []
    default_topic = list(taxonomy.keys())[0]
    default_sub = taxonomy[default_topic][0]
    for q_in in batch:
        fallback.append({
            "id": q_in["id"],
            "topic": default_topic,
            "subtopic": default_sub,
            "subtopics": [default_sub],
            "obsolete": False,
        })
    return fallback


def run_classifier(
    subject: str = "all",
    model: str = DEFAULT_MODEL,
    batch_size: int = 40,
    limit: Optional[int] = None,
    frontend_dir: str = "frontend/public"
):
    key_pool = GeminiKeyPool()
    print(f"Primary model: {model} (Fallbacks: {[m for m in FALLBACK_MODELS if m != model]})")

    pdf_cache = PDFTextCache()
    print(f"Discovered {len(pdf_cache.qp_map)} Question Paper PDFs.")

    subjects_to_run = ["0580", "0625", "0620", "0610"] if subject == "all" else [subject]

    for subj in subjects_to_run:
        subj_cache_file = get_subject_cache_file(subj)
        cache = load_cache_for_subject(subj)
        print(f"\n[{subj}] Loaded {len(cache)} existing cached question classifications from {subj_cache_file}.")

        if subj == "0580":
            dataset_file = "dataset_math.json"
            taxonomy = MATHS_0580_TAXONOMY
        elif subj == "0625":
            dataset_file = "dataset_physics.json"
            taxonomy = PHYSICS_0625_TAXONOMY
        elif subj == "0620":
            dataset_file = "dataset_chemistry.json"
            taxonomy = CHEMISTRY_0620_TAXONOMY
        elif subj == "0610":
            dataset_file = "dataset_biology.json"
            taxonomy = BIOLOGY_0610_TAXONOMY
        else:
            continue

        if not os.path.exists(dataset_file):
            print(f"[{subj}] [SKIP] Dataset {dataset_file} not found.")
            continue

        with open(dataset_file, "r", encoding="utf-8") as f:
            dataset: List[Dict[str, Any]] = json.load(f)

        # 1. Invalidate / Upgrade curve sketching and official syllabus removals in cache & dataset
        upgrades, obs_count = reconcile_obsolete_and_multi_subtopics(cache, dataset, pdf_cache, subj)
        if upgrades > 0 or obs_count > 0:
            save_cache_for_subject(subj, cache)
            print(f"[{subj}] Reconciled {upgrades} curve sketching Qs and {obs_count} syllabus-obsolete Qs in cache & dataset.", flush=True)

        # 2. Determine questions needing Gemini classification
        to_classify: List[Dict[str, Any]] = []
        for q in dataset:
            qid = q["id"]
            if qid in cache and cache[qid].get("topic"):
                cached = cache[qid]
                q["topic"] = cached["topic"]
                q["subtopic"] = cached["subtopic"]
                q["subtopics"] = cached.get("subtopics", [cached["subtopic"]])
                q["obsolete"] = cached.get("obsolete", False)
                q["obsolete_reason"] = cached.get("obsolete_reason") if q["obsolete"] else None
            else:
                to_classify.append(q)

        print(f"[{subj}] {len(dataset)} total questions | {len(dataset) - len(to_classify)} cached | {len(to_classify)} pending classification.")

        if limit and limit > 0:
            to_classify = to_classify[:limit]
            print(f"[{subj}] Applying limit: processing {len(to_classify)} questions.")

        if to_classify:
            print(f"[{subj}] Extracting question texts for {len(to_classify)} questions...", flush=True)
            prepared_items: List[Dict[str, Any]] = []
            for idx, q in enumerate(to_classify):
                raw_text = pdf_cache.extract_text(q)
                prepared_items.append({
                    "id": q["id"],
                    "year": q.get("year"),
                    "text": raw_text[:700],
                })
                if (idx + 1) % 1000 == 0 or (idx + 1) == len(to_classify):
                    print(f"  [{subj}] Extracted text for {idx + 1}/{len(to_classify)} questions...", flush=True)

            num_batches = (len(prepared_items) + batch_size - 1) // batch_size
            for b_idx in range(num_batches):
                start = b_idx * batch_size
                batch = prepared_items[start : start + batch_size]
                print(f"[{subj}] Classifying batch {b_idx + 1}/{num_batches} ({len(batch)} questions) on {key_pool.current_label}...", flush=True)

                results = classify_batch_with_gemini(
                    key_pool=key_pool,
                    batch=batch,
                    taxonomy=taxonomy,
                    subject=subj,
                    requested_model=model
                )

                for res in results:
                    qid = res["id"]
                    cache[qid] = {
                        "topic": res["topic"],
                        "subtopic": res["subtopic"],
                        "subtopics": res.get("subtopics", [res["subtopic"]]),
                        "obsolete": res["obsolete"],
                        "obsolete_reason": res.get("obsolete_reason") if res["obsolete"] else None,
                    }

                res_lookup = {r["id"]: r for r in results}
                for q in dataset:
                    if q["id"] in res_lookup:
                        r = res_lookup[q["id"]]
                        q["topic"] = r["topic"]
                        q["subtopic"] = r["subtopic"]
                        q["subtopics"] = r.get("subtopics", [r["subtopic"]])
                        q["obsolete"] = r["obsolete"]
                        q["obsolete_reason"] = r.get("obsolete_reason") if r["obsolete"] else None

                save_cache_for_subject(subj, cache)
                print(f"[{subj}] Batch {b_idx + 1}/{num_batches} done. Total {subj} cache size: {len(cache)}", flush=True)

                # Round-robin rotate key for next batch
                key_pool.rotate_round_robin()

                if (b_idx + 1) % 5 == 0 or (b_idx + 1) == num_batches:
                    with open(dataset_file, "w", encoding="utf-8") as f:
                        json.dump(dataset, f, indent=2, ensure_ascii=False)
                    if os.path.exists(frontend_dir):
                        fe_path = os.path.join(frontend_dir, dataset_file)
                        with open(fe_path, "w", encoding="utf-8") as f:
                            json.dump(dataset, f, indent=2, ensure_ascii=False)
                        print(f"  [Auto-sync] Saved and synced {dataset_file} ({len(cache)} cached items)", flush=True)
                time.sleep(0.3)

        # Always save dataset and sync to frontend_dir
        with open(dataset_file, "w", encoding="utf-8") as f:
            json.dump(dataset, f, indent=2, ensure_ascii=False)
        print(f"Updated {dataset_file} with classifications.")

        if os.path.exists(frontend_dir):
            fe_path = os.path.join(frontend_dir, dataset_file)
            with open(fe_path, "w", encoding="utf-8") as f:
                json.dump(dataset, f, indent=2, ensure_ascii=False)
            print(f"Synced {dataset_file} to {fe_path}.")

            if subj == "0620":
                alias_path = os.path.join(frontend_dir, "dataset_chem.json")
                with open(alias_path, "w", encoding="utf-8") as f:
                    json.dump(dataset, f, indent=2, ensure_ascii=False)
            elif subj == "0610":
                alias_path = os.path.join(frontend_dir, "dataset_bio.json")
                with open(alias_path, "w", encoding="utf-8") as f:
                    json.dump(dataset, f, indent=2, ensure_ascii=False)
            elif subj == "0580":
                alias_path = os.path.join(frontend_dir, "dataset_mathematics.json")
                with open(alias_path, "w", encoding="utf-8") as f:
                    json.dump(dataset, f, indent=2, ensure_ascii=False)

    print("\n[DONE] Gemini Batch Classification finished successfully!")

    print("\n[DONE] Gemini Batch Classification finished successfully!")


def main():
    parser = argparse.ArgumentParser(description="Cambridge IGCSE Batch Question Topic/Subtopic Classifier via Gemini")
    parser.add_argument("--subject", choices=["0580", "0625", "0620", "0610", "all"], default="all", help="Subject to classify")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="Gemini model (default: gemini-3.8-flash, with fallback to gemini-3.5-flash-lite, gemini-3.1-flash-lite)")
    parser.add_argument("--batch-size", type=int, default=40, help="Questions per Gemini request (default 40)")
    parser.add_argument("--limit", type=int, default=None, help="Optional max questions to process")
    args = parser.parse_args()

    run_classifier(subject=args.subject, model=args.model, batch_size=args.batch_size, limit=args.limit)


if __name__ == "__main__":
    main()
