"""
Cambridge IGCSE Official Syllabus Removals & Obsolete Question Rubric
Covers:
- Physics (0625): 2023+ current, 2019-2022 evaluated
- Mathematics (0580): 2025+ current, 2019-2024 evaluated
- Chemistry (0620): 2023+ current, 2021-2022 evaluated
- Biology (0610): 2023+ current, 2021-2022 evaluated
"""

import re
from typing import Dict, List, Optional, Tuple, Any

# Cutoff years where questions are strictly current under the latest Cambridge syllabus
CUTOFF_YEARS: Dict[str, int] = {
    "0625": 2023,  # 2023-2028 Physics syllabus
    "0620": 2023,  # 2023-2028 Chemistry syllabus
    "0610": 2023,  # 2023-2028 Biology syllabus
    "0580": 2025,  # 2025-2028 Mathematics syllabus
}

def is_always_current(subject: str, year: Optional[int]) -> bool:
    """Returns True if the question year is >= the syllabus cutoff year."""
    if year is None:
        return False
    subj_code = str(subject).strip()
    cutoff = CUTOFF_YEARS.get(subj_code, 2023)
    return year >= cutoff


# Structured removal criteria per subject
SYLLABUS_REMOVALS_RUBRIC: Dict[str, List[Dict[str, Any]]] = {
    "0625": [
        {
            "id": "PHYS_01",
            "name": "Digital electronics & logic gates",
            "description": "Logic gates (AND, OR, NAND, NOR, NOT), truth tables, combinational logic circuits, bistable circuits.",
            "reason": "Tests logic gates / digital electronics (removed from 2023 Physics syllabus)",
            "regex": r"\b(logic\s+gate|truth\s+table|nand\s+gate|nor\s+gate|and\s+gate|or\s+gate|not\s+gate|bistable|inverter\s+gate)\b",
        },
        {
            "id": "PHYS_02",
            "name": "Pressure instruments (barometers & manometers)",
            "description": "Simple mercury barometer (reading in mm Hg) and U-tube manometers. (Note: p = F/A and Δp = ρgΔh ARE retained).",
            "reason": "Tests simple mercury barometers or U-tube manometers (removed from 2023 Physics syllabus)",
            "regex": r"\b(mercury\s+barometer|simple\s+barometer|barometer\s+tube|u-tube\s+manometer|\bmanometer\b|height\s+of\s+the\s+mercury\s+column|barometer\s+reading|column\s+of\s+mercury\s+in\s+the\s+tube)\b",
            "negative_regex": r"\b(specific\s+heat|p\s*=\s*f\s*/\s*a|density\s+of\s+liquid)\b",
        },
        {
            "id": "PHYS_03",
            "name": "Thermometry & liquid-in-glass thermometer design",
            "description": "Liquid-in-glass thermometer structure, sensitivity, range, linearity, fixed points, thermocouple thermometers.",
            "reason": "Tests thermometry / liquid-in-glass design & thermocouples (removed from 2023 Physics syllabus)",
            "regex": r"\b(liquid-in-glass|sensitivity\s+of\s+(a\s+)?thermometer|linearity\s+of\s+(a\s+)?thermometer|range\s+of\s+(a\s+)?thermometer|fixed\s+points?\s+of\s+(a\s+)?thermometer|thermocouple\s+thermometer|\bthermocouple\b|calibrat\w+\s+a\s+thermometer)\b",
        },
        {
            "id": "PHYS_04",
            "name": "Thermal capacity (heat capacity C = mc)",
            "description": "Thermal capacity (heat capacity) C = mc in J/°C. (Note: specific heat capacity c = ΔE/(mΔθ) IS retained).",
            "reason": "Tests thermal capacity C = mc in J/°C (removed from 2023 Physics syllabus; specific heat capacity is retained)",
            "regex": r"\b(thermal\s+capacity|heat\s+capacity\s+of\s+the\s+(block|body|substance|copper|object)|unit\s+of\s+thermal\s+capacity)\b",
            "negative_regex": r"\b(specific\s+heat\s+capacity)\b",
        },
        {
            "id": "PHYS_05",
            "name": "Specific latent heat (E = ml)",
            "description": "Specific latent heat of fusion/vaporisation numerical calculations and E = ml. (Note: qualitative melting/boiling without temperature change IS retained).",
            "reason": "Tests specific latent heat E = ml (removed from 2023 Physics syllabus)",
            "regex": r"\b(specific\s+latent\s+heat|latent\s+heat\s+of\s+fusion|latent\s+heat\s+of\s+vaporisation|latent\s+heat\s+of\s+vaporization|e\s*=\s*m\s*l|energy\s*=\s*mass\s*×\s*latent\s+heat)\b",
        },
        {
            "id": "PHYS_06",
            "name": "Micrometer screw gauge",
            "description": "Micrometer screw gauge reading and usage.",
            "reason": "Tests micrometer screw gauge measurement (removed from 2023 Physics syllabus)",
            "regex": r"\b(micrometer\s+screw\s+gauge|\bmicrometer\b)\b",
        },
        {
            "id": "PHYS_07",
            "name": "Non-right angle graphical vector addition",
            "description": "Graphical resultant of two vectors at non-right angles using parallelogram or triangle scale drawing. (Right-angled vectors ARE retained).",
            "reason": "Tests graphical resultant of vectors at non-right angles (removed from 2023 Physics syllabus)",
            "regex": r"\b(parallelogram\s+rule|parallelogram\s+of\s+vectors|vector\s+triangle\s+to\s+scale|scale\s+diagram\s+to\s+determine\s+the\s+resultant\s+force)\b",
        },
        {
            "id": "PHYS_08",
            "name": "Methods of magnetisation and demagnetisation",
            "description": "Methods of magnetisation (stroking with permanent magnet, hammering in magnetic field) and demagnetisation (hammering, heating, AC in coil).",
            "reason": "Tests methods of magnetisation/demagnetisation (removed from 2023 Physics syllabus)",
            "regex": r"\b(stroking\s+with\s+a\s+magnet|method\s+of\s+magnetisation|methods\s+of\s+magnetisation|method\s+of\s+magnetization|methods\s+of\s+magnetization|demagnetis\w+\s+by\s+(heating|hammering|alternating\s+current)|demagnetiz\w+\s+by\s+(heating|hammering|alternating\s+current))\b",
        },
        {
            "id": "PHYS_09",
            "name": "Electrostatic charging by induction",
            "description": "Electrostatic charging by induction. (Charging by friction / rubbing IS retained).",
            "reason": "Tests charging by induction (removed from 2023 Physics syllabus; charging by friction is retained)",
            "regex": r"\b(charging\s+by\s+induction|induced\s+charge\s+on\s+the\s+sphere|electrostatic\s+induction)\b",
            "negative_regex": r"\b(electromagnetic\s+induction|faraday|generator|alternator)\b",
        },
    ],

    "0580": [
        {
            "id": "MATH_01",
            "name": "Matrices & matrix transformations",
            "description": "Matrix addition/multiplication, 2x2 determinant |A|, inverse matrix A^-1, transformation matrices.",
            "reason": "Tests matrices and matrix transformations (removed from 2020/2025 Mathematics syllabus)",
            "regex": r"\b(inverse\s+matrix|matrix\s+multiplication|determinant\s+of\s+(the\s+)?matrix|transformation\s+matrix|\bmatrix\s+[A-Z]\b|find\s+the\s+matrix\b|\b2\s*×\s*2\s+matrix\b)\b",
        },
        {
            "id": "MATH_02",
            "name": "Loci & intersecting loci",
            "description": "Locus of points equidistant from two points or two lines, intersecting loci.",
            "reason": "Tests loci and intersecting locus constructions (removed from 2020/2025 Mathematics syllabus)",
            "regex": r"\b(locus\s+of\s+points|loci\s+of|equidistant\s+from\s+[A-Z]\s+and\s+[A-Z]|points\s+equidistant\s+from\s+the\s+lines|shade\s+the\s+region\s+inside.*locus)\b",
        },
        {
            "id": "MATH_03",
            "name": "Compass constructions (perpendicular/angle bisectors)",
            "description": "Compass constructions of perpendicular bisectors and angle bisectors. (Constructing a triangle given 3 sides with ruler and compasses IS retained).",
            "reason": "Tests compass construction of angle or perpendicular bisectors (removed from 2025 Mathematics syllabus)",
            "regex": r"\b(construct\s+the\s+perpendicular\s+bisector|construct\s+the\s+bisector\s+of\s+angle|using\s+a\s+ruler\s+and\s+compasses\s+only,?\s+construct\s+the\s+(perpendicular\s+bisector|angle\s+bisector))\b",
            "negative_regex": r"\b(construct\s+triangle|construct\s+a\s+triangle)\b",
        },
        {
            "id": "MATH_04",
            "name": "Linear programming (optimizing objective function)",
            "description": "Linear programming: finding max/min of an objective function over a shaded region. (Shading inequalities and defining regions ARE retained).",
            "reason": "Tests linear programming / optimizing objective function over region (removed from 2025 Mathematics syllabus)",
            "regex": r"\b(objective\s+function|find\s+the\s+maximum\s+value\s+of\s+\d*[a-z]\s*\+\s*\d*[a-z]|greatest\s+possible\s+profit\s+from\s+the\s+shaded\s+region|linear\s+programming)\b",
        },
        {
            "id": "MATH_05",
            "name": "Box-and-whisker plots",
            "description": "Drawing or reading box-and-whisker plots. (Cumulative frequency diagrams and IQR ARE retained).",
            "reason": "Tests box-and-whisker plots (removed from 2025 Mathematics syllabus; cumulative frequency is retained)",
            "regex": r"\b(box-and-whisker|box\s+plot|box\s+and\s+whisker\s+diagram)\b",
        },
        {
            "id": "MATH_06",
            "name": "Proper subset notation ⊂ and ⊄",
            "description": "Proper subset notation ⊂ and ⊄. (General subset ⊆ and set language ARE retained).",
            "reason": "Tests proper subset notation ⊂ / ⊄ (removed from 2025 Mathematics syllabus; general subset ⊆ is retained)",
            "regex": r"(\bproper\s+subset\b|[⊂⊄])",
        },
        {
            "id": "MATH_07",
            "name": "Formal triangle congruence proofs (SSS, SAS, ASA, RHS)",
            "description": "Formal geometric proofs of congruence using criteria SSS, SAS, ASA, RHS. (Similar triangles and angle properties ARE retained).",
            "reason": "Tests formal triangle congruence criteria proofs (removed from 2025 Mathematics syllabus; similar triangles are retained)",
            "regex": r"\b(prove\s+that\s+triangle\s+[A-Z]{3}\s+is\s+congruent\s+to|congruent\s+triangles?\s*\((sss|sas|asa|rhs)\)|criteria\s+for\s+congruence)\b",
            "negative_regex": r"\b(similar\s+triangle|similarity)\b",
        },
        {
            "id": "MATH_08",
            "name": "Core-only removals (vectors/histograms/fractional indices in Paper 1 or 3)",
            "description": "Core Paper 1 or Paper 3 testing vector addition, histograms with unequal widths, or fractional indices.",
            "reason": "Tests vector arithmetic or histograms in Core syllabus (removed from 2025 Core Mathematics)",
            "core_only": True,
            "regex": r"\b(vector\s+[a-z]\s*\+\s*[a-z]|column\s+vector|frequency\s+density|histogram\s+with\s+unequal\s+class\s+widths)\b",
        },
    ],

    "0620": [
        {
            "id": "CHEM_01",
            "name": "Brownian motion",
            "description": "Brownian motion (removed from Chemistry syllabus; retained in Physics).",
            "reason": "Tests Brownian motion (removed from 2023 Chemistry syllabus; retained in Physics)",
            "regex": r"\b(brownian\s+motion|smoke\s+particles\s+moving\s+randomly|pollen\s+grains\s+in\s+water)\b",
        },
        {
            "id": "CHEM_02",
            "name": "Radioactive isotopes as energy / industrial uses",
            "description": "Radioactive isotopes in nuclear power (U-235) and medical/industrial tracer uses in chemistry.",
            "reason": "Tests radioactive isotopes as energy sources / industrial uses (removed from 2023 Chemistry syllabus)",
            "regex": r"\b(uranium-235|nuclear\s+energy\s+source|radioactive\s+isotope\s+as\s+a\s+source\s+of\s+energy|medical\s+use\s+of\s+radioactive\s+isotopes?|industrial\s+use\s+of\s+radioactive\s+isotopes?)\b",
        },
        {
            "id": "CHEM_03",
            "name": "Simple electrochemical cells & electrolysis of conc. HCl",
            "description": "Simple electrochemical cells (two different metals in an electrolyte generating voltage) and electrolysis of concentrated hydrochloric acid.",
            "reason": "Tests simple electrochemical cells / electrolysis of conc. HCl (removed from 2023 Chemistry syllabus)",
            "regex": r"\b(simple\s+cell|electrochemical\s+cell\s+consisting\s+of\s+two\s+different\s+metals|voltage\s+produced\s+by\s+two\s+metals\s+dipping|electrolysis\s+of\s+concentrated\s+hydrochloric\s+acid)\b",
            "negative_regex": r"\b(fuel\s+cell|hydrogen\s+fuel\s+cell)\b",
        },
        {
            "id": "CHEM_04",
            "name": "Silver salts in photography",
            "description": "Photochemical reduction of silver salts (halides) in photography and photographic film.",
            "reason": "Tests photochemical reduction of silver salts in photography (removed from 2023 Chemistry syllabus)",
            "regex": r"\b(photographic\s+film|silver\s+halides?\s+in\s+photography|reduction\s+of\s+silver\s+salts\s+by\s+light|photography\s+uses?\s+silver)\b",
        },
        {
            "id": "CHEM_05",
            "name": "Zinc blende extraction & thermal decomposition of nitrates/hydroxides",
            "description": "Extraction of zinc from zinc blende (roasting in air), thermal decomposition of metal nitrates and hydroxides, and metal recycling specifics.",
            "reason": "Tests zinc extraction from zinc blende / nitrate thermal decomposition (removed from 2023 Chemistry syllabus)",
            "regex": r"\b(zinc\s+blende|roasting\s+zinc\s+blende|extraction\s+of\s+zinc\s+from\s+its\s+ore|thermal\s+decomposition\s+of\s+(metal\s+)?nitrates?|thermal\s+decomposition\s+of\s+(metal\s+)?hydroxides?)\b",
        },
        {
            "id": "CHEM_06",
            "name": "Fractional distillation of liquid air, lead in petrol, Carbon cycle",
            "description": "Fractional distillation of liquid air, lead compounds in petrol as pollutant, and the Carbon Cycle in chemistry.",
            "reason": "Tests fractional distillation of liquid air / lead in petrol / Carbon cycle (removed from 2023 Chemistry syllabus)",
            "regex": r"\b(fractional\s+distillation\s+of\s+liquid\s+air|liquid\s+air|lead\s+compounds?\s+in\s+petrol|carbon\s+cycle)\b",
        },
        {
            "id": "CHEM_07",
            "name": "Sources of sulfur & uses of SO2 as bleach/preservative",
            "description": "Sources of sulfur, uses of sulfur dioxide as food preservative or bleach for wood pulp, and concentrated sulfuric acid properties. (Note: Contact Process in 6.3 IS retained).",
            "reason": "Tests uses of SO2 as bleach/preservative or concentrated sulfuric acid properties (removed from 2023 Chemistry syllabus; Contact process is retained)",
            "regex": r"\b(sulfur\s+dioxide\s+as\s+a\s+food\s+preservative|sulfur\s+dioxide\s+in\s+bleaching|sources\s+of\s+sulfur\s+in\s+the\s+earth|dehydrating\s+agent\s+property\s+of\s+concentrated\s+sulfuric\s+acid)\b",
            "negative_regex": r"\b(contact\s+process|vanadium(\s*\(v\))?\s*oxide|manufacture\s+of\s+sulfuric\s+acid)\b",
        },
        {
            "id": "CHEM_08",
            "name": "Manufacture of lime / slaked lime for soil acidity & cement",
            "description": "Manufacture of lime and slaked lime from limestone, treating soil acidity with calcium hydroxide, and CaCO3 in cement manufacture.",
            "reason": "Tests manufacture of lime for soil acidity / cement (removed from 2023 Chemistry syllabus)",
            "regex": r"\b(treatment\s+of\s+acid\s+soil\s+with\s+(lime|slaked\s+lime|calcium\s+hydroxide)|lime\s+kiln|manufacture\s+of\s+lime\s+from\s+limestone|limestone\s+in\s+cement)\b",
            "negative_regex": r"\b(flue\s+gas\s+desulfuri[sz]ation|blast\s+furnace|extraction\s+of\s+iron)\b",
        },
        {
            "id": "CHEM_09",
            "name": "Carbohydrates, hydrolysis & chromatography of hydrolysis products",
            "description": "Complex carbohydrates (starch) structure, acid/enzyme hydrolysis of carbohydrates/proteins, and chromatography with locating agents.",
            "reason": "Tests carbohydrates structure / hydrolysis of starch/proteins (removed from 2023 Chemistry syllabus)",
            "regex": r"\b(structure\s+of\s+starch|hydrolysis\s+of\s+(starch|carbohydrates?|proteins?)|chromatography\s+of\s+(amino\s+acids|colorless\s+substances|colourless\s+substances)\s+using\s+a\s+locating\s+agent|locating\s+agent\s+for\s+amino\s+acids)\b",
            "negative_regex": r"\b(chromatography\s+of\s+(inks?|dyes?|pigments?))\b",
        },
    ],

    "0610": [
        {
            "id": "BIO_01",
            "name": "Rough endoplasmic reticulum (RER) & vesicles",
            "description": "Identification or function of rough endoplasmic reticulum (RER) and vesicles in animal/plant cell diagrams.",
            "reason": "Tests rough endoplasmic reticulum (RER) or vesicles in cell diagrams (removed from 2023 Biology syllabus)",
            "regex": r"\b(rough\s+endoplasmic\s+reticulum|\brer\b|secretory\s+vesicles?\s+in\s+the\s+cell)\b",
        },
        {
            "id": "BIO_02",
            "name": "Amino acid sequences in classification",
            "description": "Using amino acid sequences to classify organisms. (DNA base sequences ARE retained).",
            "reason": "Tests amino acid sequences in classification (removed from 2023 Biology syllabus; DNA sequences are retained)",
            "regex": r"\b(amino\s+acid\s+sequences?\s+(in|for)\s+classification|compare\s+the\s+amino\s+acid\s+sequence\s+to\s+determine\s+how\s+closely\s+related)\b",
            "negative_regex": r"\b(dna\s+base\s+sequence|dna\s+sequence)\b",
        },
        {
            "id": "BIO_03",
            "name": "Glasshouse management",
            "description": "Commercial glasshouse environmental control (CO2 enrichment, artificial lighting, temperature regulation).",
            "reason": "Tests glasshouse management / CO2 enrichment in greenhouses (removed from 2023 Biology syllabus)",
            "regex": r"\b(glasshouse|greenhouse\s+management|controlling\s+conditions\s+in\s+a\s+glasshouse|enrichment\s+with\s+carbon\s+dioxide\s+in\s+(a\s+)?glasshouse)\b",
        },
        {
            "id": "BIO_04",
            "name": "Dietary deficiencies, ORT, and tooth care",
            "description": "Kwashiorkor, marasmus, starvation, constipation, obesity, oral rehydration therapy (ORT), and dental decay prevention/tooth care details.",
            "reason": "Tests kwashiorkor/marasmus/ORT or dental decay prevention (removed from 2023 Biology syllabus)",
            "regex": r"\b(kwashiorkor|marasmus|oral\s+rehydration\s+therapy|\bort\b|dental\s+decay|brushing\s+teeth|flossing|fluoride\s+in\s+toothpaste\s+preventing\s+decay|causes\s+of\s+constipation)\b",
            "negative_regex": r"\b(scurvy|rickets|vitamin\s+[cd]|iron\s+deficiency|anaemia)\b",
        },
        {
            "id": "BIO_05",
            "name": "Surgical and drug treatments for CHD",
            "description": "Surgical/drug treatments for coronary heart disease (stents, coronary angioplasty, bypass surgery, aspirin).",
            "reason": "Tests surgical/drug treatments for CHD (stents, bypass, aspirin) (removed from 2023 Biology syllabus)",
            "regex": r"\b(angioplasty|coronary\s+bypass|bypass\s+surgery|stents?\s+in\s+(coronary\s+)?arter\w+|aspirin\s+to\s+treat\s+heart\s+disease)\b",
        },
        {
            "id": "BIO_06",
            "name": "Lymphatic system & shunt vessels",
            "description": "Lymph nodes, lymphatic vessels, tissue fluid transfer, and shunt vessels in temperature regulation.",
            "reason": "Tests lymphatic system / shunt vessels (removed from 2023 Biology syllabus)",
            "regex": r"\b(lymph\s+nodes?|lymphatic\s+vessels?|lymphatic\s+system|\blymph\b|tissue\s+fluid\s+entering\s+lymph|shunt\s+vessels?)\b",
        },
        {
            "id": "BIO_07",
            "name": "Kidney dialysis machines and transplants",
            "description": "Kidney dialysis machines, dialysate composition, and kidney transplants. (Nephron structure/filtration and deamination ARE retained).",
            "reason": "Tests kidney dialysis machines or transplants (removed from 2023 Biology syllabus; nephron filtration is retained)",
            "regex": r"\b(dialysis\s+machine|kidney\s+dialysis|dialysis\s+fluid|kidney\s+transplant|donor\s+kidney|immunosuppressant\s+drugs?\s+for\s+kidney)\b",
            "negative_regex": r"\b(nephron|glomerulus|ultrafiltration|reabsorption|deamination)\b",
        },
        {
            "id": "BIO_08",
            "name": "Synthetic plant hormone 2,4-D weedkillers",
            "description": "Synthetic auxins such as 2,4-D used as selective weedkillers.",
            "reason": "Tests synthetic weedkiller 2,4-D (removed from 2023 Biology syllabus)",
            "regex": r"\b(2,4-d|synthetic\s+auxin\s+as\s+weedkiller|selective\s+weedkiller\s+killing\s+broad-leaved)\b",
        },
        {
            "id": "BIO_09",
            "name": "Misused drugs (alcohol, heroin, tobacco, anabolic steroids)",
            "description": "Alcohol abuse/effects, heroin mechanism at synapses, tobacco smoking (tar, nicotine, CO, COPD, emphysema, lung cancer), anabolic steroids in sport.",
            "reason": "Tests misused drugs (tobacco/alcohol/heroin/steroids) (removed from 2023 Biology syllabus)",
            "regex": r"\b(alcohol\s+(abuse|addiction|effect\s+on\s+liver|consumption)|heroin\s+(and\s+synapses?|addiction|withdrawal)|\btar\b\s+in\s+cigarette|\bnicotine\b|effects\s+of\s+tobacco\s+smoke|emphysema|chronic\s+bronchitis|anabolic\s+steroids?\s+in\s+sport)\b",
            "negative_regex": r"\b(antibiotics?|penicillin|mrsa|resistant\s+bacteria)\b",
        },
        {
            "id": "BIO_10",
            "name": "Human birth control, labour/birth stages, antenatal care",
            "description": "Contraceptive methods (pill, IUD, condoms, vasectomy, etc.), stages of labour and birth, antenatal care, breastfeeding vs bottle-feeding.",
            "reason": "Tests birth control / labour & birth / antenatal care (removed from 2023 Biology syllabus)",
            "regex": r"\b(contraceptive\s+pill|\biud\b|intrauterine\s+device|barrier\s+method\s+of\s+contraception|condom|vasectomy|tubal\s+ligation|stages\s+of\s+labour|dilation\s+of\s+cervix|antenatal\s+care|breast-feeding\s+vs\s+bottle-feeding|advantages\s+of\s+breast\s+milk\s+over\s+formula)\b",
        },
        {
            "id": "BIO_11",
            "name": "Sickle-cell anaemia and malaria resistance",
            "description": "Sickle-cell anaemia alleles providing resistance to malaria.",
            "reason": "Tests sickle-cell anaemia and malaria resistance link (removed from 2023 Biology syllabus)",
            "regex": r"\b(sickle-cell\s+anaemia\s+and\s+malaria|resistance\s+to\s+malaria\s+in\s+heterozygotes|hba\s+and\s+hbs\s+distribution)\b",
        },
        {
            "id": "BIO_12",
            "name": "Environmental cycles (water), famine, acid rain, sewage treatment",
            "description": "Water cycle, famine causes, acid rain causes/effects, nuclear fallout, female contraceptive hormones in water courses, sewage treatment stages.",
            "reason": "Tests water cycle / famine / acid rain / sewage stages (removed from 2023 Biology syllabus)",
            "regex": r"\b(water\s+cycle|causes\s+of\s+famine|acid\s+rain\s+effects\s+on\s+lakes|nuclear\s+fall-?out|contraceptive\s+hormones?\s+in\s+water\s+courses|stages\s+of\s+sewage\s+treatment|trickling\s+filter\s+in\s+sewage|activated\s+sludge\s+process)\b",
            "negative_regex": r"\b(carbon\s+cycle|nitrogen\s+cycle|eutrophication)\b",
        },
    ]
}


def get_subject_removals_prompt(subject: str) -> str:
    """Builds the comprehensive Cambridge syllabus removals instructions for Gemini."""
    subj_code = str(subject).strip()
    cutoff = CUTOFF_YEARS.get(subj_code, 2023)
    rubrics = SYLLABUS_REMOVALS_RUBRIC.get(subj_code, [])

    lines = [
        f"Official Cambridge IGCSE ({subj_code}) Syllabus Exclusion Rubric:",
        f"- Questions from year >= {cutoff} are ALWAYS CURRENT and must NEVER be flagged obsolete.",
        f"- For questions before {cutoff}, evaluate whether the question tests ANY of the following specific removed topics:",
    ]

    for idx, r in enumerate(rubrics, start=1):
        lines.append(f"{idx}. {r['name']}: {r['description']}")

    lines.append(
        "\nIMPORTANT CLASSIFICATION RULES:\n"
        "1. Only set 'is_obsolete': true if the question specifically requires knowledge or techniques of the removed topic.\n"
        "2. Do NOT flag a question as obsolete if it tests retained core concepts, even if adjacent to a removed topic (e.g. specific heat capacity is retained; p = F/A is retained; Contact process is retained; similar triangles are retained; cumulative frequency is retained).\n"
        "3. When 'is_obsolete' is true, provide a concise, professional 'obsolete_reason' naming the removed Cambridge syllabus concept. When false, 'obsolete_reason' MUST be null."
    )

    return "\n".join(lines)


def evaluate_rule_based_obsolete(
    subject: str,
    text: str,
    year: Optional[int],
    paper: Optional[int] = None
) -> Tuple[bool, Optional[str]]:
    """
    Deterministically evaluates if question text matches official Cambridge syllabus removals.
    Returns (is_obsolete, obsolete_reason).
    """
    if is_always_current(subject, year):
        return False, None

    subj_code = str(subject).strip()
    rubrics = SYLLABUS_REMOVALS_RUBRIC.get(subj_code, [])
    clean_text = text.lower() if text else ""

    for r in rubrics:
        if r.get("core_only") and paper not in (1, 3):
            continue

        pattern = r.get("regex")
        if not pattern:
            continue

        if re.search(pattern, clean_text, re.IGNORECASE):
            neg_pat = r.get("negative_regex")
            if neg_pat and re.search(neg_pat, clean_text, re.IGNORECASE):
                # Has retaining exception, let Gemini handle nuanced classification
                continue
            return True, r["reason"]

    return False, None
