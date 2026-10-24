"""
Centralized Cambridge IGCSE Syllabus Taxonomy Engine & Question Classifier:
- Mathematics (0580): Topics 1-9 and subtopics
- Physics (0625): Topics 1-6 and subtopics
- Chemistry (0620): Topics 1-12 and subtopics
- Biology (0610): Topics 1-21 and subtopics
- Obsolete Topic Rules for pre-2023 Physics (0625)
- Automated rule-based & keyword question classification
"""

import re
from typing import Dict, List, Tuple, Optional, Any

# ============================================================================
# 1. Official Cambridge IGCSE Taxonomy Maps
# ============================================================================

MATHS_0580_TAXONOMY: Dict[str, List[str]] = {
    "1. Number": [
        "Types of number",
        "Sets",
        "Powers and roots",
        "Fractions decimals percentages",
        "Ordering",
        "The four operations",
        "Indices",
        "Standard form",
        "Estimation",
        "Limits of accuracy",
        "Ratio and proportion",
        "Rates",
        "Percentages",
        "Using a calculator",
        "Time",
        "Money",
        "Exponential growth and decay",
        "Surds",
    ],
    "2. Algebra and graphs": [
        "Introduction to algebra",
        "Algebraic manipulation",
        "Algebraic fractions",
        "Indices II",
        "Equations",
        "Inequalities",
        "Sequences",
        "Proportion",
        "Travel graphs",
        "Graphs of functions",
        "Sketching curves",
        "Differentiation",
        "Functions",
    ],
    "3. Coordinate geometry": [
        "Coordinates",
        "Drawing linear graphs",
        "Gradient of linear graphs",
        "Length and midpoint",
        "Equations of linear graphs",
        "Parallel lines",
        "Perpendicular lines",
    ],
    "4. Geometry": [
        "Geometrical terms",
        "Geometrical constructions",
        "Scale drawings",
        "Similarity",
        "Symmetry",
        "Angles",
        "Circle theorems I",
        "Circle theorems II",
    ],
    "5. Mensuration": [
        "Units of measure",
        "Area and perimeter",
        "Circles arcs and sectors",
        "Surface area and volume",
        "Compound shapes and parts of shapes",
    ],
    "6. Trigonometry": [
        "Pythagoras theorem",
        "Right-angled triangles",
        "Exact trigonometric values",
        "Trigonometric functions",
        "Non-right-angled triangles",
        "3D Pythagoras and trigonometry",
    ],
    "7. Transformations and vectors": [
        "Transformations",
        "Vectors in two dimensions",
        "Magnitude of a vector",
        "Vector geometry",
    ],
    "8. Probability": [
        "Introduction to probability",
        "Relative and expected frequencies",
        "Probability of combined events",
        "Conditional probability",
    ],
    "9. Statistics": [
        "Classifying statistical data",
        "Interpreting statistical data",
        "Averages and measures of spread",
        "Statistical charts and diagrams",
        "Scatter diagrams",
        "Cumulative frequency diagrams",
        "Histograms",
    ],
}

PHYSICS_0625_TAXONOMY: Dict[str, List[str]] = {
    "1. Motion, forces and energy": [
        "Physical quantities and measurement techniques",
        "Motion",
        "Mass and weight",
        "Density",
        "Effects of forces",
        "Turning effect of forces",
        "Centre of gravity",
        "Momentum",
        "Energy",
        "Work",
        "Energy resources",
        "Power",
        "Pressure",
    ],
    "2. Thermal physics": [
        "States of matter",
        "Particle model",
        "Gases and the absolute scale of temperature",
        "Thermal expansion of solids liquids and gases",
        "Specific heat capacity",
        "Melting boiling and evaporation",
        "Conduction",
        "Convection",
        "Radiation",
        "Consequences of thermal energy transfer",
    ],
    "3. Waves": [
        "General properties of waves",
        "Reflection of light",
        "Refraction of light",
        "Thin lenses",
        "Dispersion of light",
        "Electromagnetic spectrum",
        "Sound",
    ],
    "4. Electricity and magnetism": [
        "Simple phenomena of magnetism",
        "Electric charge",
        "Electric current",
        "Electromotive force and potential difference",
        "Resistance",
        "Electrical energy and electrical power",
        "Circuit diagrams and circuit components",
        "Series and parallel circuits",
        "Action and use of circuit components",
        "Electrical safety",
        "Electromagnetic induction",
        "The a.c. generator",
        "Magnetic effect of a current",
        "Force on a current-carrying conductor",
        "The d.c. motor",
        "The transformer",
    ],
    "5. Nuclear physics": [
        "The atom",
        "The nucleus",
        "Detection of radioactivity",
        "The three types of nuclear emission",
        "Radioactive decay",
        "Half-life",
        "Safety precautions",
    ],
    "6. Space physics": [
        "The Earth",
        "The Solar System",
        "The Sun as a star",
        "Stars",
        "The Universe",
    ],
}

CHEMISTRY_0620_TAXONOMY: Dict[str, List[str]] = {
    "1. States of matter": ["Solids liquids and gases", "Diffusion"],
    "2. Atoms, elements and compounds": [
        "Elements compounds and mixtures",
        "Atomic structure and the Periodic Table",
        "Isotopes",
        "Ions and ionic bonds",
        "Simple molecules and covalent bonds",
        "Giant covalent structures",
        "Metallic bonding",
    ],
    "3. Stoichiometry": [
        "Formulae",
        "Relative masses of atoms and molecules",
        "The mole and the Avogadro constant",
    ],
    "4. Electrochemistry": ["Electrolysis", "Hydrogen-oxygen fuel cells"],
    "5. Chemical energetics": ["Exothermic and endothermic reactions", "Bond energies"],
    "6. Chemical reactions": [
        "Physical and chemical changes",
        "Rate of reaction",
        "Reversible reactions and equilibrium",
        "Redox",
    ],
    "7. Acids, bases and salts": [
        "Characteristic properties of acids and bases",
        "Oxides",
        "Preparation of salts",
    ],
    "8. The Periodic Table": [
        "Arrangement of elements",
        "Group I properties",
        "Group VII properties",
        "Transition elements",
        "Noble gases",
    ],
    "9. Metals": [
        "Properties of metals",
        "Uses of metals",
        "Alloys and their properties",
        "Reactivity series",
        "Corrosion of metals",
        "Extraction of metals",
    ],
    "10. Chemistry of the environment": [
        "Water",
        "Fertilisers",
        "Air quality and climate",
    ],
    "11. Organic chemistry": [
        "Formulae functional groups and terminology",
        "Naming organic compounds",
        "Fuels",
        "Alkanes",
        "Alkenes",
        "Alcohols",
        "Carboxylic acids",
        "Polymers",
    ],
    "12. Experimental techniques and chemical analysis": [
        "Apparatus",
        "Acid-base titrations",
        "Chromatography",
        "Separation and purification",
        "Identification of ions and gases",
    ],
}

BIOLOGY_0610_TAXONOMY: Dict[str, List[str]] = {
    "1. Characteristics and classification of living organisms": [
        "Characteristics of living organisms",
        "Concept and uses of classification systems",
        "Features of organisms",
    ],
    "2. Organisation of the organism": ["Cell structure", "Size of specimens"],
    "3. Movement into and out of cells": [
        "Diffusion",
        "Osmosis",
        "Active transport",
    ],
    "4. Biological molecules": ["Biological molecules"],
    "5. Enzymes": ["Enzymes"],
    "6. Plant nutrition": ["Photosynthesis", "Leaf structure"],
    "7. Human nutrition": [
        "Diet",
        "Digestive system",
        "Physical digestion",
        "Chemical digestion",
        "Absorption",
    ],
    "8. Transport in plants": [
        "Xylem and phloem",
        "Water uptake",
        "Transpiration",
        "Translocation",
    ],
    "9. Transport in animals": [
        "Circulatory systems",
        "Heart",
        "Blood vessels",
        "Blood",
    ],
    "10. Diseases and immunity": ["Diseases and immunity"],
    "11. Gas exchange in humans": ["Gas exchange in humans"],
    "12. Respiration": [
        "Respiration",
        "Aerobic respiration",
        "Anaerobic respiration",
    ],
    "13. Excretion in humans": ["Excretion in humans"],
    "14. Coordination and response": [
        "Coordination and response",
        "Sense organs",
        "Hormones",
        "Homeostasis",
        "Tropic responses",
    ],
    "15. Drugs": ["Drugs"],
    "16. Reproduction": [
        "Asexual reproduction",
        "Sexual reproduction",
        "Sexual reproduction in plants",
        "Sexual reproduction in humans",
        "Sex hormones in humans",
        "Sexually transmitted infections",
    ],
    "17. Inheritance": [
        "Chromosomes genes and proteins",
        "Mitosis",
        "Meiosis",
        "Monohybrid inheritance",
    ],
    "18. Variation and selection": [
        "Variation",
        "Adaptive features",
        "Selection",
    ],
    "19. Organisms and their environment": [
        "Energy flow",
        "Food chains and food webs",
        "Nutrient cycles",
        "Populations",
    ],
    "20. Human influences on ecosystems": [
        "Food supply",
        "Habitat destruction",
        "Pollution",
        "Conservation",
    ],
    "21. Biotechnology and genetic modification": [
        "Biotechnology and genetic modification",
        "Biotechnology",
        "Genetic modification",
    ],
}

SUBJECT_TAXONOMY_MAP: Dict[str, Dict[str, List[str]]] = {
    "0580": MATHS_0580_TAXONOMY,
    "0625": PHYSICS_0625_TAXONOMY,
    "0620": CHEMISTRY_0620_TAXONOMY,
    "0610": BIOLOGY_0610_TAXONOMY,
}

# ============================================================================
# 2. Cambridge IGCSE Official Syllabus Removal Rules & Obsolete Topic Engine
# ============================================================================

OBSOLETE_RULES_BY_SUBJECT: Dict[str, List[Dict[str, Any]]] = {
    # Physics 0625: 2023+ syllabus removals (applies strictly to 2019–2022 papers)
    "0625": [
        {
            "category": "Digital electronics & logic gates",
            "reason": "Tests digital electronics and logic gates (removed in 2023 Physics syllabus)",
            "patterns": [
                re.compile(r"\b(?:logic\s+gate[s]?|truth\s+table[s]?|NAND|NOR|AND\s+gate|OR\s+gate|NOT\s+gate|bistable|inverter\s+gate|logic\s+circuit[s]?)\b", re.I),
                re.compile(r"\binput\s+[AB]\b.*\boutput\b.*\b(?:high|low|1|0)\b", re.I),
            ],
        },
        {
            "category": "Liquid barometers, manometers & pressure instruments",
            "reason": "Tests liquid barometers and manometers (removed in 2023 Physics syllabus)",
            "patterns": [
                re.compile(r"\b(?:manometer[s]?|barometer[s]?|mercury\s+barometer[s]?|liquid\s+manometer[s]?)\b", re.I),
                re.compile(r"\b(?:mm\s*Hg|millimetres?\s+of\s+mercury|height\s+of\s+(?:the\s+)?mercury\s+column)\b", re.I),
                re.compile(r"\bU-tube\s+(?:manometer|containing\s+liquid)\b", re.I),
            ],
        },
        {
            "category": "Thermometer design features & thermocouple thermometers",
            "reason": "Tests liquid-in-glass thermometer design features or thermocouple thermometers (removed in 2023 Physics syllabus)",
            "patterns": [
                re.compile(r"\bthermocouple[s]?\b", re.I),
                re.compile(r"\b(?:liquid-in-glass|liquid\s+in\s+glass)\b.*?\b(?:sensitivity|linearity|range)\b", re.I),
                re.compile(r"\b(?:sensitivity|linearity)\s+of\s+(?:a|the)\s+thermometer\b", re.I),
                re.compile(r"\b(?:ice\s+point|steam\s+point)\b", re.I),
                re.compile(r"\bfixed\s+points\s+of\s+(?:a|the)\s+temperature\s+scale\b", re.I),
            ],
        },
        {
            "category": "Gas laws & absolute temperature calculations",
            "reason": "Tests gas laws and absolute temperature calculations (removed in 2023 Physics syllabus)",
            "patterns": [
                re.compile(r"\b(?:Charles(?:'s)?\s+law|pressure\s+law|absolute\s+zero\b.*?\b(?:gas|pressure|temperature)|kelvin\b.*?\b(?:gas|temperature\s+scale|gas\s+cylinder|proportional\s+to\s+(?:absolute\s+)?temperature))\b", re.I),
                re.compile(r"\bp\s*/\s*T\b|\bV\s*/\s*T\b", re.I),
            ],
        },
        {
            "category": "Thermal capacity calculations",
            "reason": "Tests thermal capacity calculations (removed in 2023 Physics syllabus)",
            "patterns": [
                re.compile(r"(?<!specific\s)\bthermal\s+capacity\b(?!\s+of\s+water\s+is\s+4200)", re.I),
            ],
        },
    ],

    # Chemistry 0620: 2023+ syllabus removals (applies strictly to 2019–2022 papers)
    "0620": [
        {
            "category": "Extraction of zinc from zinc blende",
            "reason": "Tests extraction of zinc from zinc blende (removed in 2023 Chemistry syllabus)",
            "patterns": [
                re.compile(r"\b(?:zinc\s+blende|roasting\s+of\s+zinc|extraction\s+of\s+zinc\b.*?\b(?:zinc\s+blende|blast\s+furnace))\b", re.I),
            ],
        },
        {
            "category": "Simple electrochemical cells",
            "reason": "Tests simple electrochemical cells producing electricity from two metals (removed in 2023 Chemistry syllabus)",
            "patterns": [
                re.compile(r"\b(?:simple\s+cell[s]?|daniell\s+cell[s]?)\b", re.I),
                re.compile(r"\b(?:two\s+different\s+metals\b.*?\b(?:electrolyte|voltage|voltmeter|produces?\s+(?:an?\s+)?(?:electric\s+current|electricity|voltage)))\b", re.I),
            ],
        },
        {
            "category": "Silver salts in photography",
            "reason": "Tests silver salts and photochemical reactions in photography (removed in 2023 Chemistry syllabus)",
            "patterns": [
                re.compile(r"\b(?:photographic\s+film|photography\b.*?\bsilver|silver\s+(?:halide[s]?|bromide|chloride)\b.*?\b(?:photograph|film))\b", re.I),
            ],
        },
        {
            "category": "Brownian motion in Chemistry",
            "reason": "Tests Brownian motion (removed from Chemistry in 2023 syllabus; retained in Physics)",
            "patterns": [
                re.compile(r"\bBrownian\s+motion\b", re.I),
            ],
        },
        {
            "category": "Carbon cycle in Chemistry",
            "reason": "Tests the carbon cycle (removed from Chemistry in 2023 syllabus; retained in Biology)",
            "patterns": [
                re.compile(r"\bcarbon\s+cycle\b", re.I),
            ],
        },
        {
            "category": "Complex carbohydrates & hydrolysis",
            "reason": "Tests complex carbohydrates and hydrolysis of proteins/carbohydrates (removed in 2023 Chemistry syllabus)",
            "patterns": [
                re.compile(r"\b(?:complex\s+carbohydrates?|hydrolysis\s+of\s+(?:carbohydrates?|starch|proteins?)|acid\s+hydrolysis\b.*?\b(?:starch|protein|carbohydrate)|locating\s+agent\b.*?\bamino\s+acid)\b", re.I),
            ],
        },
        {
            "category": "Treatment of soil acidity",
            "reason": "Tests treatment of soil acidity using lime or calcium compounds (removed in 2023 Chemistry syllabus)",
            "patterns": [
                re.compile(r"\b(?:soil\s+acidity|acidic\s+soil|treat(?:ing)?\s+soil\b.*?\b(?:lime|calcium\s+hydroxide|calcium\s+carbonate)|neutralis(?:e|ing)\s+soil)\b", re.I),
            ],
        },
        {
            "category": "Sulfur dioxide bleaching and preservation",
            "reason": "Tests uses of sulfur dioxide in bleaching and food preservation (removed in 2023 Chemistry syllabus)",
            "patterns": [
                re.compile(r"\bsulfur\s+dioxide\b.*?\b(?:bleach|wood\s+pulp|food\s+preserv|preserv\w*\s+food)\b", re.I),
                re.compile(r"\b(?:bleach\w*\s+(?:wood\s+)?pulp|food\s+preserv\w*)\b.*?\bsulfur\s+dioxide\b", re.I),
            ],
        },
        {
            "category": "Radioactive isotopes as energy sources",
            "reason": "Tests radioactive isotopes as energy sources / nuclear fission (removed in 2023 Chemistry syllabus)",
            "patterns": [
                re.compile(r"\b(?:uranium-235|U-235|nuclear\s+fission|nuclear\s+fuel|radioactive\s+isotope[s]?\s+as\s+(?:a\s+source\s+of\s+energy|energy\s+source|source\s+of\s+power))\b", re.I),
            ],
        },
    ],

    # Biology 0610: 2023+ syllabus removals (applies strictly to 2019–2022 papers)
    "0610": [
        {
            "category": "Misused drugs",
            "reason": "Tests misused drugs including alcohol, heroin, tobacco smoking, and anabolic steroids (removed in 2023 Biology syllabus)",
            "patterns": [
                re.compile(r"\b(?:misuse[d]?\s+drugs?|alcohol\s+(?:abuse|consumption|misuse|intake)|drinking\s+alcohol|excessive\s+alcohol|effect\s+of\s+alcohol|alcohol\s+is\s+a\s+depressant|heroin|anabolic\s+steroids?|tobacco\s+smoke|smoking\s+(?:tobacco|cigarettes)|nicotine\b.*?\btar\b|tar\b.*?\b(?:cilia|goblet|emphysema|chronic\s+bronchitis|lung\s+cancer)|effects?\s+of\s+(?:tobacco\s+)?smoking)\b", re.I),
            ],
        },
        {
            "category": "Methods of birth control in humans",
            "reason": "Tests methods of birth control and contraception in humans (removed in 2023 Biology syllabus)",
            "patterns": [
                re.compile(r"\b(?:birth\s+control|contraception|contraceptive[s]?|spermicide[s]?|condom[s]?|femidom[s]?|diaphragm[s]?(?:\s+and\s+spermicide)?|vasectomy|tubal\s+ligation|female\s+sterili[sz]ation|intrauterine\s+device|IUD\b|rhythm\s+method)\b", re.I),
            ],
        },
    ],

    # Mathematics 0580: 2020+ syllabus removals (applies strictly to 2019 papers)
    "0580": [
        {
            "category": "Matrices and matrix transformations",
            "reason": "Tests matrices and matrix transformations (removed in 2020 Mathematics syllabus)",
            "patterns": [
                re.compile(r"\b(?:matri(?:x|ces)|determinant\b|\binverse\s+matrix|\bidentity\s+matrix)\b", re.I),
            ],
        },
    ],
}

# Backwards compatibility
OBSOLETE_PHYSICS_RULES = OBSOLETE_RULES_BY_SUBJECT["0625"]

def is_question_obsolete(
    subject: str,
    text: str,
    year: Optional[int] = None
) -> Tuple[bool, Optional[str]]:
    """
    Checks if a question tests content removed under official Cambridge syllabus revisions:
    - 0625 Physics: Removed in 2023 (applies to 2019-2022)
    - 0620 Chemistry: Removed in 2023 (applies to 2019-2022)
    - 0610 Biology: Removed in 2023 (applies to 2019-2022)
    - 0580 Mathematics: Removed in 2020 (applies to 2019)
    Returns (is_obsolete, obsolete_reason).
    """
    norm_subj = subject.strip().lower()
    if "phys" in norm_subj or norm_subj == "0625":
        subj_code = "0625"
    elif "chem" in norm_subj or norm_subj == "0620":
        subj_code = "0620"
    elif "bio" in norm_subj or norm_subj == "0610":
        subj_code = "0610"
    elif "math" in norm_subj or norm_subj == "0580":
        subj_code = "0580"
    else:
        subj_code = norm_subj

    # Syllabus era thresholds
    if year is not None:
        if subj_code in ("0625", "0620", "0610"):
            if not (2019 <= year <= 2022):
                return False, None
        elif subj_code == "0580":
            if year > 2019:
                return False, None

    rules = OBSOLETE_RULES_BY_SUBJECT.get(subj_code, [])
    for rule in rules:
        for pat in rule["patterns"]:
            if pat.search(text):
                return True, rule["reason"]

    return False, None

def is_physics_question_obsolete(text: str, year: Optional[int] = None) -> Tuple[bool, Optional[str]]:
    """
    Backwards-compatible wrapper for 0625 Physics.
    """
    return is_question_obsolete("0625", text, year=year)

# ============================================================================
# 3. Keyword Scoring Classifier for Cambridge IGCSE
# ============================================================================

MATHS_KEYWORDS: Dict[Tuple[str, str], List[str]] = {
    ("1. Number", "Surds"): ["surd", "rationalise", "rationalize", "simplify sqrt", r"\bsqrt\b"],
    ("1. Number", "Exponential growth and decay"): ["exponential", "depreciat", "compound interest", "half-life", "growth rate"],
    ("1. Number", "Money"): ["currency", "exchange rate", "dollars", "cents", "euros", "cost", "investment", "simple interest"],
    ("1. Number", "Time"): ["24-hour", "train leaves", "flight departs", "hours and minutes", "local time", "am", "pm"],
    ("1. Number", "Using a calculator"): ["calculate", "correct to 2 decimal places", "give your answer to"],
    ("1. Number", "Percentages"): ["percentage", "percent", "% increase", "% decrease", "reverse percentage", "original price"],
    ("1. Number", "Rates"): ["speed", "density", "km/h", "m/s", "fuel consumption"],
    ("1. Number", "Ratio and proportion"): ["ratio", "divide in the ratio", "share in the ratio", "direct proportion", "inverse proportion"],
    ("1. Number", "Limits of accuracy"): ["upper bound", "lower bound", "nearest 10", "nearest 100", "nearest unit", "bounds"],
    ("1. Number", "Estimation"): ["estimate", "approximate", "rounding to 1 significant figure"],
    ("1. Number", "Standard form"): ["standard form", r"10\^", r"\times 10", "scientific notation"],
    ("1. Number", "Indices"): ["index", "indices", "power of", "fractional index", "negative index", r"x\^"],
    ("1. Number", "The four operations"): ["product", "quotient", "sum", "difference", "calculate"],
    ("1. Number", "Ordering"): ["order of size", "smallest to largest", "ascending", "descending"],
    ("1. Number", "Fractions decimals percentages"): ["fraction", "recurring decimal", "convert fraction", "numerator", "denominator"],
    ("1. Number", "Powers and roots"): ["cube root", "square root", "cube", "square", "prime factorization", "hcf", "lcm"],
    ("1. Number", "Sets"): ["venn diagram", "universal set", r"\bunion\b", r"\bintersection\b", r"\bsubset\b", r"\belement\b", r"n\(A\)", r"A'"],
    ("1. Number", "Types of number"): ["prime", "square number", "cube number", "factor", "multiple", "rational", "irrational", "integer"],

    ("2. Algebra and graphs", "Differentiation"): ["differentiate", "dy/dx", "derivative", "gradient function", "stationary point", "turning point"],
    ("2. Algebra and graphs", "Functions"): ["f(x)", "g(x)", "composite function", "inverse function", "fg(x)", "f^-1"],
    ("2. Algebra and graphs", "Sketching curves"): ["sketch the graph", "cubic graph", "turning point", "asymptote", "roots of the curve"],
    ("2. Algebra and graphs", "Graphs of functions"): ["draw the graph", "table of values", "complete the table for y =", "reciprocal graph"],
    ("2. Algebra and graphs", "Travel graphs"): ["distance-time", "speed-time", "velocity-time", "acceleration", "deceleration", "area under graph"],
    ("2. Algebra and graphs", "Proportion"): ["proportional to", "inversely proportional", "varies directly", "propto"],
    ("2. Algebra and graphs", "Sequences"): ["nth term", "sequence", "arithmetic progression", "geometric sequence", "term-to-term"],
    ("2. Algebra and graphs", "Inequalities"): ["inequality", "solve the inequality", "region", "shaded region", "<=", ">="],
    ("2. Algebra and graphs", "Equations"): ["solve", "quadratic formula", "simultaneous equations", "linear equation", "factorise to solve"],
    ("2. Algebra and graphs", "Indices II"): ["equations with indices", "unknown power", "solve 2^x"],
    ("2. Algebra and graphs", "Algebraic fractions"): ["algebraic fraction", "single fraction", "simplify (x^2", "common denominator"],
    ("2. Algebra and graphs", "Algebraic manipulation"): ["expand", "factorise", "make x the subject", "rearrange", "simplify"],
    ("2. Algebra and graphs", "Introduction to algebra"): ["substitution", "expression", "formula", "terms"],

    ("3. Coordinate geometry", "Perpendicular lines"): ["perpendicular", "gradient of perpendicular", "-1/m"],
    ("3. Coordinate geometry", "Parallel lines"): ["parallel lines", "same gradient"],
    ("3. Coordinate geometry", "Equations of linear graphs"): ["equation of the line", "y = mx + c", "point on the line"],
    ("3. Coordinate geometry", "Length and midpoint"): ["midpoint", "length of the line segment", "distance between"],
    ("3. Coordinate geometry", "Gradient of linear graphs"): ["gradient of the line", "slope", "rise/run"],
    ("3. Coordinate geometry", "Drawing linear graphs"): ["draw the line", "plot points", "grid"],
    ("3. Coordinate geometry", "Coordinates"): ["coordinates", "(x, y)", "quadrant", "origin"],

    ("4. Geometry", "Circle theorems II"): ["tangent", "alternate segment theorem", "tangent perpendicular to radius"],
    ("4. Geometry", "Circle theorems I"): ["angle at the centre", "angle in a semicircle", "cyclic quadrilateral", "angles in the same segment"],
    ("4. Geometry", "Angles"): ["parallel lines angle", "alternate angles", "corresponding angles", "interior angles of polygon"],
    ("4. Geometry", "Symmetry"): ["order of rotational symmetry", "lines of symmetry", "plane of symmetry"],
    ("4. Geometry", "Similarity"): ["similar shapes", "scale factor", "similar triangles", "ratio of areas", "ratio of volumes"],
    ("4. Geometry", "Scale drawings"): ["bearing", "three-figure bearing", "scale drawing", "map scale"],
    ("4. Geometry", "Geometrical constructions"): ["construct", "perpendicular bisector", "angle bisector", "ruler and compasses"],
    ("4. Geometry", "Geometrical terms"): ["equilateral", "isosceles", "scalene", "rhombus", "trapezium", "parallelogram"],

    ("5. Mensuration", "Compound shapes and parts of shapes"): ["compound shape", "shaded area", "cross-section"],
    ("5. Mensuration", "Surface area and volume"): ["volume of prism", "volume of cylinder", "volume of cone", "volume of sphere", "total surface area"],
    ("5. Mensuration", "Circles arcs and sectors"): ["arc length", "sector area", "perimeter of sector", "circumference"],
    ("5. Mensuration", "Area and perimeter"): ["area of triangle", "area of parallelogram", "area of trapezium", "perimeter"],
    ("5. Mensuration", "Units of measure"): ["convert", "cm^2 to m^2", "litres", "millilitres", "cm^3 to m^3"],

    ("6. Trigonometry", "3D Pythagoras and trigonometry"): ["angle between line and plane", "3D coordinates", "3D box", "cuboid"],
    ("6. Trigonometry", "Non-right-angled triangles"): ["sine rule", "cosine rule", "1/2 a b sin C", "area of triangle"],
    ("6. Trigonometry", "Trigonometric functions"): ["sin x", "cos x", "tan x", "graph of sin", "values from 0 to 360"],
    ("6. Trigonometry", "Exact trigonometric values"): ["sin 30", "cos 60", "tan 45", "without using a calculator", "exact value"],
    ("6. Trigonometry", "Right-angled triangles"): ["sohcahtoa", "sine", "cosine", "tangent", "angle of elevation", "angle of depression"],
    ("6. Trigonometry", "Pythagoras theorem"): ["pythagoras", "hypotenuse", "a^2 + b^2 = c^2"],

    ("7. Transformations and vectors", "Vector geometry"): ["vector proof", "collinear", "ratio of vectors", "midpoint vector"],
    ("7. Transformations and vectors", "Magnitude of a vector"): ["magnitude of", "column vector", "|a|", "length of vector"],
    ("7. Transformations and vectors", "Vectors in two dimensions"): ["column vector", "vector a + b", "position vector"],
    ("7. Transformations and vectors", "Transformations"): ["reflection", "rotation", "translation", "enlargement", "scale factor", "center of enlargement"],

    ("8. Probability", "Conditional probability"): ["conditional probability", "given that", "without replacement"],
    ("8. Probability", "Probability of combined events"): ["tree diagram", "two events", "sample space", "independent events"],
    ("8. Probability", "Relative and expected frequencies"): ["relative frequency", "expected number", "experimental probability"],
    ("8. Probability", "Introduction to probability"): ["probability", "fair die", "spinner", "counter is chosen"],

    ("9. Statistics", "Histograms"): ["histogram", "frequency density", "unequal class intervals"],
    ("9. Statistics", "Cumulative frequency diagrams"): ["cumulative frequency", "median from graph", "interquartile range", "iqr", "percentile"],
    ("9. Statistics", "Scatter diagrams"): ["scatter diagram", "correlation", "line of best fit"],
    ("9. Statistics", "Statistical charts and diagrams"): ["pie chart", "stem-and-leaf", "bar chart", "frequency polygon"],
    ("9. Statistics", "Averages and measures of spread"): ["mean", "median", "mode", "range", "grouped frequency table"],
    ("9. Statistics", "Interpreting statistical data"): ["compare the distributions", "two sets of data"],
    ("9. Statistics", "Classifying statistical data"): ["continuous", "discrete", "qualitative", "quantitative"],
}

PHYSICS_KEYWORDS: Dict[Tuple[str, str], List[str]] = {
    ("1. Motion, forces and energy", "Physical quantities and measurement techniques"): ["micrometer", "vernier callipers", "measuring cylinder", "scalar", "vector"],
    ("1. Motion, forces and energy", "Motion"): ["acceleration", "velocity", "speed-time graph", "terminal velocity", "free fall", "distance-time"],
    ("1. Motion, forces and energy", "Mass and weight"): ["mass", "weight", "gravitational field strength", "gravitational force", "W = mg"],
    ("1. Motion, forces and energy", "Density"): ["density", "p = m/V", "mass per unit volume"],
    ("1. Motion, forces and energy", "Effects of forces"): ["Hooke's law", "spring constant", "limit of proportionality", "resultant force", "friction", "F = ma"],
    ("1. Motion, forces and energy", "Turning effect of forces"): ["moment", "pivot", "principle of moments", "clockwise moment", "anticlockwise moment"],
    ("1. Motion, forces and energy", "Centre of gravity"): ["centre of gravity", "stability", "equilibrium", "plumb-line"],
    ("1. Motion, forces and energy", "Momentum"): ["momentum", "impulse", "conservation of momentum", "collision", "p = mv", "F t = mv - mu"],
    ("1. Motion, forces and energy", "Energy"): ["kinetic energy", "gravitational potential energy", "conservation of energy", "efficiency"],
    ("1. Motion, forces and energy", "Work"): ["work done", "W = F d", "energy transferred"],
    ("1. Motion, forces and energy", "Energy resources"): ["renewable", "solar", "wind turbine", "hydroelectric", "fossil fuels", "nuclear power station"],
    ("1. Motion, forces and energy", "Power"): ["power", "P = W/t", "P = E/t", "watts"],
    ("1. Motion, forces and energy", "Pressure"): ["pressure", "P = F/A", "hydrostatic pressure", "p = rho g h"],

    ("2. Thermal physics", "States of matter"): ["solid, liquid, gas", "arrangement of particles", "molecular structure"],
    ("2. Thermal physics", "Particle model"): ["Brownian motion", "kinetic theory", "random motion", "molecular model"],
    ("2. Thermal physics", "Gases and the absolute scale of temperature"): ["Boyle's law", "p1 V1 = p2 V2", "Kelvin", "absolute zero", "-273 °C"],
    ("2. Thermal physics", "Thermal expansion of solids liquids and gases"): ["thermal expansion", "bimetallic strip", "expansion of liquids"],
    ("2. Thermal physics", "Specific heat capacity"): ["specific heat capacity", "c = Delta E / (m Delta T)", "thermal capacity"],
    ("2. Thermal physics", "Melting boiling and evaporation"): ["evaporation", "boiling", "melting point", "cooling effect of evaporation"],
    ("2. Thermal physics", "Conduction"): ["conduction", "free electrons", "thermal conductor", "insulator"],
    ("2. Thermal physics", "Convection"): ["convection current", "density changes in fluid", "hot air rises"],
    ("2. Thermal physics", "Radiation"): ["infrared radiation", "emitter", "absorber", "black surfaces", "shiny silver surfaces"],
    ("2. Thermal physics", "Consequences of thermal energy transfer"): ["vacuum flask", "sea breeze", "greenhouse effect", "loss of thermal energy"],

    ("3. Waves", "General properties of waves"): ["transverse", "longitudinal", "wavelength", "frequency", "wave equation", "v = f lambda", "amplitude"],
    ("3. Waves", "Reflection of light"): ["angle of incidence", "angle of reflection", "plane mirror", "virtual image"],
    ("3. Waves", "Refraction of light"): ["refractive index", "Snell's law", "critical angle", "total internal reflection", "optical fibre"],
    ("3. Waves", "Thin lenses"): ["converging lens", "focal length", "principal focus", "real image", "magnifying glass"],
    ("3. Waves", "Dispersion of light"): ["dispersion", "prism", "spectrum of colours", "monochromatic"],
    ("3. Waves", "Electromagnetic spectrum"): ["electromagnetic spectrum", "gamma rays", "X-rays", "ultraviolet", "microwaves", "radio waves"],
    ("3. Waves", "Sound"): ["sound wave", "echo", "compression", "rarefaction", "speed of sound", "ultrasound", "pitch", "loudness"],

    ("4. Electricity and magnetism", "Simple phenomena of magnetism"): ["magnetic poles", "magnetic field lines", "permanent magnet", "ferrous"],
    ("4. Electricity and magnetism", "Electric charge"): ["electrostatic", "positive and negative charge", "electrons transferred", "electric field"],
    ("4. Electricity and magnetism", "Electric current"): ["electric current", "I = Q/t", "ammeter", "charge in coulombs"],
    ("4. Electricity and magnetism", "Electromotive force and potential difference"): ["emf", "potential difference", "voltage", "voltmeter", "V = W/Q"],
    ("4. Electricity and magnetism", "Resistance"): ["resistance", "V = IR", "Ohm's law", "I-V characteristic", "resistivity", "filament lamp"],
    ("4. Electricity and magnetism", "Electrical energy and electrical power"): ["P = IV", "E = IVt", "kWh", "cost of electricity"],
    ("4. Electricity and magnetism", "Circuit diagrams and circuit components"): ["circuit diagram", "diode", "thermistor", "LDR", "variable resistor"],
    ("4. Electricity and magnetism", "Series and parallel circuits"): ["series circuit", "parallel circuit", "combined resistance", "current in parallel branches"],
    ("4. Electricity and magnetism", "Action and use of circuit components"): ["potential divider", "relay", "light-dependent resistor"],
    ("4. Electricity and magnetism", "Electrical safety"): ["fuse", "circuit breaker", "earthing", "double insulation"],
    ("4. Electricity and magnetism", "Electromagnetic induction"): ["electromagnetic induction", "induced emf", "Faraday's law", "cutting magnetic field"],
    ("4. Electricity and magnetism", "The a.c. generator"): ["a.c. generator", "slip rings", "alternating current"],
    ("4. Electricity and magnetism", "Magnetic effect of a current"): ["solenoid", "electromagnet", "magnetic field around a wire"],
    ("4. Electricity and magnetism", "Force on a current-carrying conductor"): ["motor effect", "Fleming's left-hand rule", "catapult field"],
    ("4. Electricity and magnetism", "The d.c. motor"): ["d.c. motor", "split-ring commutator", "turning effect on coil"],
    ("4. Electricity and magnetism", "The transformer"): ["transformer", "step-up", "step-down", "Np/Ns = Vp/Vs", "Ip Vp = Is Vs"],

    ("5. Nuclear physics", "The atom"): ["Rutherford", "alpha particle scattering", "nucleus", "protons and neutrons", "electrons in shells"],
    ("5. Nuclear physics", "The nucleus"): ["nuclide notation", "proton number", "nucleon number", "isotope"],
    ("5. Nuclear physics", "Detection of radioactivity"): ["Geiger-Muller tube", "background radiation", "count rate", "detector"],
    ("5. Nuclear physics", "The three types of nuclear emission"): ["alpha emission", "beta emission", "gamma emission", "ionising power", "penetrating power"],
    ("5. Nuclear physics", "Radioactive decay"): ["decay equation", "alpha decay", "beta decay", "daughter nucleus"],
    ("5. Nuclear physics", "Half-life"): ["half-life", "decay curve", "activity", "radioactive sample"],
    ("5. Nuclear physics", "Safety precautions"): ["radiation safety", "lead shielding", "tongs", "storage of radioactive waste"],

    ("6. Space physics", "The Earth"): ["rotation of the Earth", "orbit of the Earth", "seasons", "day and night", "Moon phases"],
    ("6. Space physics", "The Solar System"): ["planets", "gravitational attraction of Sun", "orbital speed", "elliptical orbit"],
    ("6. Space physics", "The Sun as a star"): ["Sun", "nuclear fusion of hydrogen into helium"],
    ("6. Space physics", "Stars"): ["life cycle of a star", "protostar", "supernova", "black hole", "neutron star", "white dwarf", "light year"],
    ("6. Space physics", "The Universe"): ["Big Bang theory", "redshift", "cosmic microwave background radiation", "Hubble constant", "expanding Universe"],
}

CHEMISTRY_KEYWORDS: Dict[Tuple[str, str], List[str]] = {
    ("1. States of matter", "Solids liquids and gases"): ["solid, liquid, gas", "states of matter", "particle arrangement", "melting", "boiling", "freezing", "condensation", "sublimation", "kinetic particle theory", "cooling curve"],
    ("1. States of matter", "Diffusion"): ["diffusion", "rate of diffusion", "molecular mass", "Mr of gas", "cotton wool soaked", "ammonia and hydrogen chloride", "white smoke"],

    ("2. Atoms, elements and compounds", "Elements compounds and mixtures"): ["element", "compound", "mixture", "pure substance", "sharp melting point"],
    ("2. Atoms, elements and compounds", "Atomic structure and the Periodic Table"): ["proton number", "nucleon number", "atomic number", "mass number", "electronic configuration", "outer shell electrons", "energy levels", "protons and neutrons"],
    ("2. Atoms, elements and compounds", "Isotopes"): ["isotope", "relative atomic mass", "radioactive", "same number of protons", "different number of neutrons"],
    ("2. Atoms, elements and compounds", "Ions and ionic bonds"): ["ionic bond", "ionic lattice", "transfer of electrons", "positive ion", "negative ion", "cation", "anion", "electrostatic attraction", "dot-and-cross diagram"],
    ("2. Atoms, elements and compounds", "Simple molecules and covalent bonds"): ["covalent bond", "shared pair of electrons", "simple molecule", "intermolecular forces", "low melting point"],
    ("2. Atoms, elements and compounds", "Giant covalent structures"): ["giant covalent", "macromolecule", "diamond", "graphite", "silicon(iv) oxide", "silicon dioxide", "tetrahedral", "layers of carbon", "lubricant"],
    ("2. Atoms, elements and compounds", "Metallic bonding"): ["metallic bonding", "sea of delocalised electrons", "positive ions", "lattice of positive ions", "malleable", "ductile", "electrical conductivity of metals"],

    ("3. Stoichiometry", "Formulae"): ["formula", "chemical formula", "balanced chemical equation", "state symbols", "valency", "empirical formula", "molecular formula"],
    ("3. Stoichiometry", "Relative masses of atoms and molecules"): ["relative molecular mass", "relative formula mass", "Mr", "Ar"],
    ("3. Stoichiometry", "The mole and the Avogadro constant"): ["mole", "avogadro", "mol/dm3", "concentration", "molar gas volume", "24 dm3", "percentage yield", "percentage purity", "limiting reactant", "moles of solute"],

    ("4. Electrochemistry", "Electrolysis"): ["electrolysis", "electrode", "anode", "cathode", "electrolyte", "molten", "aqueous", "electroplating", "inert electrode", "copper refining", "cryolite"],
    ("4. Electrochemistry", "Hydrogen-oxygen fuel cells"): ["fuel cell", "hydrogen fuel", "hydrogen-oxygen", "voltage", "chemical cell"],

    ("5. Chemical energetics", "Exothermic and endothermic reactions"): ["exothermic", "endothermic", "enthalpy change", "delta h", "energy level diagram", "activation energy", "reaction pathway"],
    ("5. Chemical energetics", "Bond energies"): ["bond energy", "bond breaking", "bond making", "energy absorbed", "energy released", "calculate the energy change"],

    ("6. Chemical reactions", "Physical and chemical changes"): ["physical change", "chemical change", "easily reversible"],
    ("6. Chemical reactions", "Rate of reaction"): ["rate of reaction", "catalyst", "collision theory", "activation energy", "surface area", "temperature", "concentration", "gas syringe", "gradient of curve"],
    ("6. Chemical reactions", "Reversible reactions and equilibrium"): ["reversible reaction", "dynamic equilibrium", "le chatelier", "haber process", "contact process", "closed system", "yield of ammonia"],
    ("6. Chemical reactions", "Redox"): ["redox", "oxidation", "reduction", "oxidising agent", "reducing agent", "oxidation state", "loss of electrons", "gain of electrons", "potassium manganate(vii)", "potassium iodide"],

    ("7. Acids, bases and salts", "Characteristic properties of acids and bases"): ["acid", "base", "alkali", "pH scale", "universal indicator", "litmus", "thymolphthalein", "methyl orange", "proton donor", "proton acceptor", "neutralisation"],
    ("7. Acids, bases and salts", "Oxides"): ["basic oxide", "acidic oxide", "amphoteric oxide", "neutral oxide"],
    ("7. Acids, bases and salts", "Preparation of salts"): ["preparation of salts", "soluble salt", "insoluble salt", "precipitation", "excess base", "crystallisation", "filtration of salt", "hydrated salt"],

    ("8. The Periodic Table", "Arrangement of elements"): ["periodic table", "periodicity", "periods", "groups", "valency electrons"],
    ("8. The Periodic Table", "Group I properties"): ["group i", "alkali metal", "lithium", "sodium", "potassium", "soft metal", "density increases", "reactivity with water", "hydrogen gas evolved"],
    ("8. The Periodic Table", "Group VII properties"): ["group vii", "halogen", "chlorine", "bromine", "iodine", "displacement of halogens", "colour darkens", "diatomic"],
    ("8. The Periodic Table", "Transition elements"): ["transition element", "transition metal", "variable oxidation numbers", "coloured compounds", "catalytic activity", "high melting point and density"],
    ("8. The Periodic Table", "Noble gases"): ["group viii", "group 0", "noble gas", "helium", "argon", "neon", "unreactive", "full outer shell", "monatomic"],

    ("9. Metals", "Properties of metals"): ["thermal conductivity", "electrical conductivity", "malleability", "lustre"],
    ("9. Metals", "Uses of metals"): ["uses of aluminium", "aircraft", "food containers", "copper electrical wiring"],
    ("9. Metals", "Alloys and their properties"): ["alloy", "brass", "stainless steel", "harder than pure metal", "distorted lattice", "layers cannot slide"],
    ("9. Metals", "Reactivity series"): ["reactivity series", "potassium sodium calcium magnesium", "displacement reaction of metals", "reduction with carbon"],
    ("9. Metals", "Corrosion of metals"): ["rusting", "corrosion of iron", "water and oxygen", "barrier method", "galvanising", "sacrificial protection"],
    ("9. Metals", "Extraction of metals"): ["blast furnace", "haematite", "iron extraction", "bauxite", "aluminium extraction", "coke and limestone", "slag"],

    ("10. Chemistry of the environment", "Water"): ["water treatment", "filtration and chlorination", "distillation of sea water", "test for water", "anhydrous copper(ii) sulfate", "cobalt(ii) chloride"],
    ("10. Chemistry of the environment", "Fertilisers"): ["fertiliser", "NPK", "nitrogen, phosphorus, potassium", "ammonium nitrate", "eutrophication"],
    ("10. Chemistry of the environment", "Air quality and climate"): ["clean air composition", "carbon monoxide", "oxides of nitrogen", "sulfur dioxide", "acid rain", "greenhouse effect", "carbon dioxide and methane", "global warming", "flue-gas desulfurisation", "catalytic converter"],

    ("11. Organic chemistry", "Formulae functional groups and terminology"): ["homologous series", "functional group", "general formula", "structural formula", "displayed formula"],
    ("11. Organic chemistry", "Naming organic compounds"): ["systematic naming", "methane ethane propane butane", "isomers", "structural isomerism"],
    ("11. Organic chemistry", "Fuels"): ["petroleum", "crude oil", "fractional distillation", "refinery gas", "gasoline", "diesel", "bitumen", "fuel"],
    ("11. Organic chemistry", "Alkanes"): ["alkane", "saturated hydrocarbon", "cnh2n+2", "substitution reaction", "chlorination of methane", "photochemical", "uv light"],
    ("11. Organic chemistry", "Alkenes"): ["alkene", "unsaturated hydrocarbon", "carbon-carbon double bond", "cnh2n", "cracking of alkanes", "aqueous bromine test", "addition reaction", "hydration of ethene"],
    ("11. Organic chemistry", "Alcohols"): ["alcohol", "ethanol", "hydroxyl group", "-oh", "fermentation of glucose", "hydration of ethene to ethanol", "combustion of ethanol"],
    ("11. Organic chemistry", "Carboxylic acids"): ["carboxylic acid", "ethanoic acid", "-cooh", "vinegar", "reaction with alcohols to form esters", "esterification"],
    ("11. Organic chemistry", "Polymers"): ["polymer", "monomer", "addition polymerisation", "poly(ethene)", "condensation polymerisation", "nylon", "polyamide", "terylene", "polyester", "proteins", "plastics pollution"],

    ("12. Experimental techniques and chemical analysis", "Apparatus"): ["measuring cylinder", "burette", "volumetric pipette", "gas syringe", "conical flask", "stopwatch", "balance"],
    ("12. Experimental techniques and chemical analysis", "Acid-base titrations"): ["titration", "indicator colour change", "concordant titres", "neutralisation point"],
    ("12. Experimental techniques and chemical analysis", "Chromatography"): ["paper chromatography", "rf value", "locating agent", "baseline in pencil", "solvent front"],
    ("12. Experimental techniques and chemical analysis", "Separation and purification"): ["filtration", "crystallisation", "simple distillation", "fractional distillation", "fractionating column", "separating funnel", "centrifugation", "purity test"],
    ("12. Experimental techniques and chemical analysis", "Identification of ions and gases"): ["flame test", "aqueous sodium hydroxide", "aqueous ammonia", "cation test", "anion test", "halide test", "silver nitrate", "barium nitrate", "carbonate test", "limewater", "damp red litmus", "bleaches damp litmus", "glowing splint", "lighted splint"],
}

BIOLOGY_KEYWORDS: Dict[Tuple[str, str], List[str]] = {
    ("1. Characteristics and classification of living organisms", "Characteristics of living organisms"): ["movement", "respiration", "sensitivity", "growth", "reproduction", "excretion", "nutrition", "mrs gren", "characteristics of living"],
    ("1. Characteristics and classification of living organisms", "Concept and uses of classification systems"): ["classification", "binomial system", "genus and species", "dichotomous key", "dna base sequences", "morphology and anatomy"],
    ("1. Characteristics and classification of living organisms", "Features of organisms"): ["vertebrates", "mammals", "birds", "reptiles", "amphibians", "fish", "arthropods", "insects", "crustaceans", "arachnids", "myriapods", "ferns", "flowering plants", "monocotyledons", "dicotyledons", "viruses", "bacteria"],

    ("2. Organisation of the organism", "Cell structure"): ["cell membrane", "nucleus", "cytoplasm", "mitochondria", "ribosomes", "chloroplasts", "vacuole", "cell wall", "bacterial cell", "plasmid", "ciliated cell", "root hair cell", "palisade mesophyll cell", "red blood cell", "sperm and egg"],
    ("2. Organisation of the organism", "Size of specimens"): ["magnification", "actual size", "image size", "formula magnification", "scale bar", "micrometres", "um"],

    ("3. Movement into and out of cells", "Diffusion"): ["diffusion", "net movement", "concentration gradient", "surface area to volume ratio", "diffusion across membrane"],
    ("3. Movement into and out of cells", "Osmosis"): ["osmosis", "water potential", "partially permeable membrane", "turgid", "turgor pressure", "flaccid", "plasmolysis", "potato cylinder experiment", "dialysis tubing"],
    ("3. Movement into and out of cells", "Active transport"): ["active transport", "against concentration gradient", "protein carriers", "carrier proteins", "energy from respiration"],

    ("4. Biological molecules", "Biological molecules"): ["carbohydrate", "lipid", "protein", "glucose", "starch", "glycogen", "cellulose", "amino acids", "fatty acids and glycerol", "iodine solution test", "benedict's solution", "biuret test", "ethanol emulsion test", "dcvip test", "vitamin c"],

    ("5. Enzymes", "Enzymes"): ["enzyme", "biological catalyst", "active site", "substrate", "enzyme-substrate complex", "denatured", "optimum temperature", "optimum ph"],

    ("6. Plant nutrition", "Photosynthesis"): ["photosynthesis", "chlorophyll", "word equation for photosynthesis", "light intensity", "carbon dioxide concentration", "limiting factor", "destarched plant", "oxygen production rate"],
    ("6. Plant nutrition", "Leaf structure"): ["cuticle", "upper epidermis", "palisade mesophyll", "spongy mesophyll", "stomata", "guard cells", "vascular bundle in leaf", "air spaces in leaf"],

    ("7. Human nutrition", "Diet"): ["balanced diet", "dietary fibre", "water", "vitamins c and d", "calcium and iron", "deficiency disease", "scurvy", "rickets", "anaemia", "malnutrition", "coronary heart disease and diet"],
    ("7. Human nutrition", "Digestive system"): ["alimentary canal", "ingestion", "digestion", "absorption", "assimilation", "egestion", "mouth", "oesophagus", "stomach", "small intestine", "duodenum", "ileum", "large intestine", "colon", "pancreas", "liver"],
    ("7. Human nutrition", "Physical digestion"): ["physical digestion", "mechanical digestion", "teeth types", "incisors canines premolars molars", "enamel dentine pulp", "chewing", "peristalsis", "bile emulsification"],
    ("7. Human nutrition", "Chemical digestion"): ["chemical digestion", "amylase", "maltase", "protease", "pepsin", "trypsin", "lipase", "hydrochloric acid in stomach"],
    ("7. Human nutrition", "Absorption"): ["absorption in small intestine", "villi", "microvilli", "lacteal", "capillaries in villus", "hepatic portal vein"],

    ("8. Transport in plants", "Xylem and phloem"): ["xylem vessels", "phloem", "lignin", "vascular bundle stem root", "sieve tubes and companion cells"],
    ("8. Transport in plants", "Water uptake"): ["water uptake", "root hair cells", "cortex of root", "passage of water through root"],
    ("8. Transport in plants", "Transpiration"): ["transpiration", "evaporation from mesophyll", "loss of water vapour", "transpiration stream", "potometer", "humidity and temperature effects", "wilting"],
    ("8. Transport in plants", "Translocation"): ["translocation", "movement of sucrose and amino acids", "sources and sinks"],

    ("9. Transport in animals", "Circulatory systems"): ["circulatory system", "single circulation", "double circulation", "pulmonary and systemic", "advantages of double circulation"],
    ("9. Transport in animals", "Heart"): ["heart structure", "atria and ventricles", "bicuspid and tricuspid valves", "semi-lunar valves", "septum", "coronary arteries", "heart rate", "exercise and heart rate"],
    ("9. Transport in animals", "Blood vessels"): ["arteries", "veins", "capillaries", "thick muscular walls", "valves in veins", "narrow lumen", "exchange of materials"],
    ("9. Transport in animals", "Blood"): ["components of blood", "red blood cells", "white blood cells", "phagocytes", "lymphocytes", "platelets", "plasma", "haemoglobin", "blood clotting", "fibrinogen to fibrin"],

    ("10. Diseases and immunity", "Diseases and immunity"): ["pathogen", "transmissible disease", "direct contact and indirect contact", "skin and mucus defences", "phagocytosis", "antibodies", "antigens", "memory cells", "active immunity", "passive immunity", "vaccination"],

    ("11. Gas exchange in humans", "Gas exchange in humans"): ["gas exchange system", "lungs", "trachea", "bronchi", "bronchioles", "alveoli", "alveolar wall", "intercostal muscles", "diaphragm", "ventilation mechanism", "inhaled air vs exhaled air", "limewater breathing test"],

    ("12. Respiration", "Respiration"): ["respiration definition", "cellular respiration", "release of energy from glucose"],
    ("12. Respiration", "Aerobic respiration"): ["aerobic respiration", "c6h12o6 + 6o2", "complete breakdown of glucose", "carbon dioxide and water"],
    ("12. Respiration", "Anaerobic respiration"): ["anaerobic respiration", "breakdown of glucose without oxygen", "lactic acid in muscles", "oxygen debt", "fermentation in yeast", "ethanol and carbon dioxide"],

    ("13. Excretion in humans", "Excretion in humans"): ["excretion definition", "removal of toxic materials", "urea", "kidney structure", "cortex medulla pelvis", "nephron", "filtration and reabsorption", "ureter bladder urethra", "kidney dialysis", "kidney transplant"],

    ("14. Coordination and response", "Coordination and response"): ["nervous system", "central nervous system", "cns", "sensory neurone", "relay neurone", "motor neurone", "reflex arc", "synapse", "neurotransmitter", "receptor to effector"],
    ("14. Coordination and response", "Sense organs"): ["sense organ", "eye structure", "cornea", "iris", "pupil", "lens", "retina", "fovea", "optic nerve", "pupil reflex", "accommodation", "ciliary muscles and suspensory ligaments", "rods and cones"],
    ("14. Coordination and response", "Hormones"): ["hormone definition", "endocrine glands", "adrenaline", "insulin", "glucagon", "testosterone", "oestrogen", "comparison nervous vs hormonal"],
    ("14. Coordination and response", "Homeostasis"): ["homeostasis", "negative feedback", "control of blood glucose", "insulin and glucagon", "skin temperature control", "vasodilation and vasoconstriction", "sweating and shivering"],
    ("14. Coordination and response", "Tropic responses"): ["gravitropism", "phototropism", "geotropism", "auxin", "distribution of auxin", "shoot curvature", "root response"],

    ("15. Drugs", "Drugs"): ["drug definition", "medicinal drugs", "antibiotics", "antibiotic resistance", "mrsa", "misused drugs", "alcohol liver damage", "heroin", "tobacco smoking", "nicotine addiction", "carbon monoxide in smoke", "tar and emphysema", "chronic obstructive pulmonary disease", "lung cancer"],

    ("16. Reproduction", "Asexual reproduction"): ["asexual reproduction", "one parent", "genetically identical offspring", "mitosis", "clones", "tubers runners bulbs", "advantages and disadvantages of asexual"],
    ("16. Reproduction", "Sexual reproduction"): ["sexual reproduction", "fusion of gamete nuclei", "fertilisation", "zygote", "diploid and haploid", "genetic variation"],
    ("16. Reproduction", "Sexual reproduction in plants"): ["flower structure", "sepals petals", "anther and filament", "stamen", "stigma style ovary", "carpel", "pollen grain", "pollination", "insect-pollinated vs wind-pollinated", "seed germination conditions", "water oxygen suitable temperature"],
    ("16. Reproduction", "Sexual reproduction in humans"): ["male reproductive system", "testes scrotum sperm duct prostate", "female reproductive system", "ovaries oviducts uterus cervix vagina", "sperm vs egg", "menstrual cycle", "placenta function", "umbilical cord", "amniotic sac and fluid"],
    ("16. Reproduction", "Sex hormones in humans"): ["puberty", "secondary sexual characteristics", "fsh", "lh", "oestrogen", "progesterone"],
    ("16. Reproduction", "Sexually transmitted infections"): ["sti", "hiv", "aids", "transmission methods", "methods of control and prevention"],

    ("17. Inheritance", "Chromosomes genes and proteins"): ["chromosome", "gene", "allele", "dna molecule", "double helix", "bases a t c g", "genetic code", "protein synthesis", "mrna"],
    ("17. Inheritance", "Mitosis"): ["mitosis definition", "nuclear division", "stem cells", "repair of tissues", "growth", "exact copies of chromosomes"],
    ("17. Inheritance", "Meiosis"): ["meiosis definition", "reduction division", "production of gametes", "halving chromosome number"],
    ("17. Inheritance", "Monohybrid inheritance"): ["monohybrid inheritance", "dominant and recessive", "homozygous", "heterozygous", "genotype and phenotype", "genetic cross diagram", "punnett square", "pedigree diagram", "test cross", "sex linkage", "co-dominance", "abo blood groups"],

    ("18. Variation and selection", "Variation"): ["variation", "continuous variation", "discontinuous variation", "mutation", "causes of mutation", "ionising radiation"],
    ("18. Variation and selection", "Adaptive features"): ["adaptive features", "adaptation", "xerophyte adaptations", "hydrophyte adaptations"],
    ("18. Variation and selection", "Selection"): ["natural selection", "survival of the fittest", "evolution", "selective breeding", "artificial selection"],

    ("19. Organisms and their environment", "Energy flow"): ["sun light energy", "producer", "consumer", "herbivore carnivore", "trophic level", "energy transfer efficiency", "loss of energy between levels"],
    ("19. Organisms and their environment", "Food chains and food webs"): ["food chain", "food web", "pyramid of numbers", "pyramid of biomass", "pyramid of energy"],
    ("19. Organisms and their environment", "Nutrient cycles"): ["carbon cycle", "combustion and decomposition", "water cycle", "nitrogen cycle", "nitrification", "denitrification", "nitrogen-fixing bacteria"],
    ("19. Organisms and their environment", "Populations"): ["population definition", "community and ecosystem", "sigmoid population growth curve", "lag log stationary death phase", "limiting factors for population"],

    ("20. Human influences on ecosystems", "Food supply"): ["food supply", "monoculture", "intensive livestock farming"],
    ("20. Human influences on ecosystems", "Habitat destruction"): ["habitat destruction", "deforestation", "loss of biodiversity", "soil erosion"],
    ("20. Human influences on ecosystems", "Pollution"): ["pollution", "untreated sewage", "chemical waste", "eutrophication", "leaching of fertiliser", "algal bloom", "decomposers bod", "non-biodegradable plastics", "acid rain", "greenhouse gases global warming"],
    ("20. Human influences on ecosystems", "Conservation"): ["conservation", "sustainable resources", "endangered species", "captive breeding", "seed banks", "national parks", "recycling"],

    ("21. Biotechnology and genetic modification", "Biotechnology and genetic modification"): ["biotechnology", "microorganisms in biotechnology"],
    ("21. Biotechnology and genetic modification", "Biotechnology"): ["biofuel production", "bread-making yeast", "pectinase in fruit juice", "biological washing powders", "lactase lactose-free milk", "fermenter conditions"],
    ("21. Biotechnology and genetic modification", "Genetic modification"): ["genetic modification", "genetic engineering", "recombinant dna", "restriction enzyme", "dna ligase", "plasmid vector", "human insulin production", "gm crops"],
}


def classify_question(
    subject: str,
    text: str,
    year: Optional[int] = None
) -> Tuple[str, str, bool]:
    """
    Classifies a question into canonical (topic, subtopic, is_obsolete).
    Matches against keyword maps and checks obsolete rules.
    """
    clean_text = text.lower()
    norm_subject = subject.strip()

    # 1. Obsolete check across all Cambridge subjects
    is_obsolete, _ = is_question_obsolete(norm_subject, clean_text, year=year)

    # 2. Subject taxonomy determination
    if norm_subject in ("0580", "mathematics", "math"):
        keyword_dict = MATHS_KEYWORDS
        default_topic = "1. Number"
        default_subtopic = "Types of number"
    elif norm_subject in ("0625", "physics"):
        keyword_dict = PHYSICS_KEYWORDS
        default_topic = "1. Motion, forces and energy"
        default_subtopic = "Motion"
    elif norm_subject in ("0620", "chemistry"):
        keyword_dict = CHEMISTRY_KEYWORDS
        default_topic = "1. States of matter"
        default_subtopic = "Solids liquids and gases"
    elif norm_subject in ("0610", "biology"):
        keyword_dict = BIOLOGY_KEYWORDS
        default_topic = "1. Characteristics and classification of living organisms"
        default_subtopic = "Characteristics of living organisms"
    else:
        # Fallback for other subjects
        tax = SUBJECT_TAXONOMY_MAP.get(norm_subject, CHEMISTRY_0620_TAXONOMY)
        first_topic = next(iter(tax.keys()))
        first_sub = tax[first_topic][0]
        return first_topic, first_sub, False

    best_match: Optional[Tuple[str, str]] = None
    best_score = 0

    for (topic, subtopic), keywords in keyword_dict.items():
        score = 0
        for kw in keywords:
            if kw.startswith(r"\b") or kw.startswith(r"\\b"):
                try:
                    if re.search(kw, clean_text, re.I):
                        score += 3
                except Exception:
                    if kw.lower() in clean_text:
                        score += 2
            else:
                if kw.lower() in clean_text:
                    score += 2

        if score > best_score:
            best_score = score
            best_match = (topic, subtopic)

    if best_match and best_score > 0:
        return best_match[0], best_match[1], is_obsolete

    return default_topic, default_subtopic, is_obsolete
