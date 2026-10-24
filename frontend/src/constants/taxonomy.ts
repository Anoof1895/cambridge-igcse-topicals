/**
 * Official Cambridge IGCSE 4-Subject Canonical Specification Taxonomy:
 * - Mathematics (0580)
 * - Physics (0625)
 * - Chemistry (0620)
 * - Biology (0610)
 */

import { Subject, SubjectCode, subjectSlugToCode } from '../types';

export interface TopicDefinition {
  topicNumber: number;
  topicName: string;
  subtopics: string[];
}

export interface UnitDefinition {
  unitCode: string;
  unitName: string;
  title: string;
  topics: TopicDefinition[];
}

export interface SubtopicGroup {
  topicName: string;
  subtopics: {
    name: string;
    count: number;
  }[];
}

/**
 * 1. Cambridge IGCSE Mathematics (0580)
 */
export const MATHS_0580_TOPICS: TopicDefinition[] = [
  {
    topicNumber: 1,
    topicName: '1. Number',
    subtopics: [
      'Types of number',
      'Sets',
      'Powers and roots',
      'Fractions decimals percentages',
      'Ordering',
      'The four operations',
      'Indices',
      'Standard form',
      'Estimation',
      'Limits of accuracy',
      'Ratio and proportion',
      'Rates',
      'Percentages',
      'Using a calculator',
      'Time',
      'Money',
      'Exponential growth and decay',
      'Surds',
    ],
  },
  {
    topicNumber: 2,
    topicName: '2. Algebra and graphs',
    subtopics: [
      'Introduction to algebra',
      'Algebraic manipulation',
      'Algebraic fractions',
      'Indices II',
      'Equations',
      'Inequalities',
      'Sequences',
      'Proportion',
      'Travel graphs',
      'Graphs of functions',
      'Sketching curves',
      'Differentiation',
      'Functions',
    ],
  },
  {
    topicNumber: 3,
    topicName: '3. Coordinate geometry',
    subtopics: [
      'Coordinates',
      'Drawing linear graphs',
      'Gradient of linear graphs',
      'Length and midpoint',
      'Equations of linear graphs',
      'Parallel lines',
      'Perpendicular lines',
    ],
  },
  {
    topicNumber: 4,
    topicName: '4. Geometry',
    subtopics: [
      'Geometrical terms',
      'Geometrical constructions',
      'Scale drawings',
      'Similarity',
      'Symmetry',
      'Angles',
      'Circle theorems I',
      'Circle theorems II',
    ],
  },
  {
    topicNumber: 5,
    topicName: '5. Mensuration',
    subtopics: [
      'Units of measure',
      'Area and perimeter',
      'Circles arcs and sectors',
      'Surface area and volume',
      'Compound shapes and parts of shapes',
    ],
  },
  {
    topicNumber: 6,
    topicName: '6. Trigonometry',
    subtopics: [
      'Pythagoras theorem',
      'Right-angled triangles',
      'Exact trigonometric values',
      'Trigonometric functions',
      'Non-right-angled triangles',
      '3D Pythagoras and trigonometry',
    ],
  },
  {
    topicNumber: 7,
    topicName: '7. Transformations and vectors',
    subtopics: [
      'Transformations',
      'Vectors in two dimensions',
      'Magnitude of a vector',
      'Vector geometry',
    ],
  },
  {
    topicNumber: 8,
    topicName: '8. Probability',
    subtopics: [
      'Introduction to probability',
      'Relative and expected frequencies',
      'Probability of combined events',
      'Conditional probability',
    ],
  },
  {
    topicNumber: 9,
    topicName: '9. Statistics',
    subtopics: [
      'Classifying statistical data',
      'Interpreting statistical data',
      'Averages and measures of spread',
      'Statistical charts and diagrams',
      'Scatter diagrams',
      'Cumulative frequency diagrams',
      'Histograms',
    ],
  },
];

/**
 * 2. Cambridge IGCSE Physics (0625)
 */
export const PHYSICS_0625_TOPICS: TopicDefinition[] = [
  {
    topicNumber: 1,
    topicName: '1. Motion, forces and energy',
    subtopics: [
      'Physical quantities and measurement techniques',
      'Motion',
      'Mass and weight',
      'Density',
      'Effects of forces',
      'Turning effect of forces',
      'Centre of gravity',
      'Momentum',
      'Energy',
      'Work',
      'Energy resources',
      'Power',
      'Pressure',
    ],
  },
  {
    topicNumber: 2,
    topicName: '2. Thermal physics',
    subtopics: [
      'States of matter',
      'Particle model',
      'Gases and the absolute scale of temperature',
      'Thermal expansion of solids liquids and gases',
      'Specific heat capacity',
      'Melting boiling and evaporation',
      'Conduction',
      'Convection',
      'Radiation',
      'Consequences of thermal energy transfer',
    ],
  },
  {
    topicNumber: 3,
    topicName: '3. Waves',
    subtopics: [
      'General properties of waves',
      'Reflection of light',
      'Refraction of light',
      'Thin lenses',
      'Dispersion of light',
      'Electromagnetic spectrum',
      'Sound',
    ],
  },
  {
    topicNumber: 4,
    topicName: '4. Electricity and magnetism',
    subtopics: [
      'Simple phenomena of magnetism',
      'Electric charge',
      'Electric current',
      'Electromotive force and potential difference',
      'Resistance',
      'Electrical energy and electrical power',
      'Circuit diagrams and circuit components',
      'Series and parallel circuits',
      'Action and use of circuit components',
      'Electrical safety',
      'Electromagnetic induction',
      'The a.c. generator',
      'Magnetic effect of a current',
      'Force on a current-carrying conductor',
      'The d.c. motor',
      'The transformer',
    ],
  },
  {
    topicNumber: 5,
    topicName: '5. Nuclear physics',
    subtopics: [
      'The atom',
      'The nucleus',
      'Detection of radioactivity',
      'The three types of nuclear emission',
      'Radioactive decay',
      'Half-life',
      'Safety precautions',
    ],
  },
  {
    topicNumber: 6,
    topicName: '6. Space physics',
    subtopics: [
      'The Earth',
      'The Solar System',
      'The Sun as a star',
      'Stars',
      'The Universe',
    ],
  },
];

/**
 * 3. Cambridge IGCSE Chemistry (0620)
 */
export const CHEMISTRY_0620_TOPICS: TopicDefinition[] = [
  {
    topicNumber: 1,
    topicName: '1. States of matter',
    subtopics: [
      'Solids liquids and gases',
      'Diffusion',
    ],
  },
  {
    topicNumber: 2,
    topicName: '2. Atoms, elements and compounds',
    subtopics: [
      'Elements compounds and mixtures',
      'Atomic structure and the Periodic Table',
      'Isotopes',
      'Ions and ionic bonds',
      'Simple molecules and covalent bonds',
      'Giant covalent structures',
      'Metallic bonding',
    ],
  },
  {
    topicNumber: 3,
    topicName: '3. Stoichiometry',
    subtopics: [
      'Formulae',
      'Relative masses of atoms and molecules',
      'The mole and the Avogadro constant',
    ],
  },
  {
    topicNumber: 4,
    topicName: '4. Electrochemistry',
    subtopics: [
      'Electrolysis',
      'Hydrogen-oxygen fuel cells',
    ],
  },
  {
    topicNumber: 5,
    topicName: '5. Chemical energetics',
    subtopics: [
      'Exothermic and endothermic reactions',
    ],
  },
  {
    topicNumber: 6,
    topicName: '6. Chemical reactions',
    subtopics: [
      'Physical and chemical changes',
      'Rate of reaction',
      'Reversible reactions and equilibrium',
      'Redox',
    ],
  },
  {
    topicNumber: 7,
    topicName: '7. Acids, bases and salts',
    subtopics: [
      'Characteristic properties of acids and bases',
      'Oxides',
      'Preparation of salts',
    ],
  },
  {
    topicNumber: 8,
    topicName: '8. The Periodic Table',
    subtopics: [
      'Arrangement of elements',
      'Group I properties',
      'Group VII properties',
      'Transition elements',
      'Noble gases',
    ],
  },
  {
    topicNumber: 9,
    topicName: '9. Metals',
    subtopics: [
      'Properties of metals',
      'Uses of metals',
      'Alloys and their properties',
      'Reactivity series',
      'Corrosion of metals',
      'Extraction of metals',
    ],
  },
  {
    topicNumber: 10,
    topicName: '10. Chemistry of the environment',
    subtopics: [
      'Water',
      'Fertilisers',
      'Air quality and climate',
    ],
  },
  {
    topicNumber: 11,
    topicName: '11. Organic chemistry',
    subtopics: [
      'Formulae functional groups and terminology',
      'Naming organic compounds',
      'Fuels',
      'Alkanes',
      'Alkenes',
      'Alcohols',
      'Carboxylic acids',
      'Polymers',
    ],
  },
  {
    topicNumber: 12,
    topicName: '12. Experimental techniques and chemical analysis',
    subtopics: [
      'Experimental design',
      'Acid-base titrations',
      'Chromatography',
      'Separation and purification',
      'Identification of ions and gases',
    ],
  },
];

/**
 * 4. Cambridge IGCSE Biology (0610)
 */
export const BIOLOGY_0610_TOPICS: TopicDefinition[] = [
  {
    topicNumber: 1,
    topicName: '1. Characteristics and classification of living organisms',
    subtopics: [
      'Characteristics of living organisms',
      'Concept and uses of classification systems',
      'Features of organisms',
    ],
  },
  {
    topicNumber: 2,
    topicName: '2. Organisation of the organism',
    subtopics: [
      'Cell structure',
      'Size of specimens',
    ],
  },
  {
    topicNumber: 3,
    topicName: '3. Movement into and out of cells',
    subtopics: [
      'Diffusion',
      'Osmosis',
      'Active transport',
    ],
  },
  {
    topicNumber: 4,
    topicName: '4. Biological molecules',
    subtopics: [
      'Biological molecules',
    ],
  },
  {
    topicNumber: 5,
    topicName: '5. Enzymes',
    subtopics: [
      'Enzymes',
    ],
  },
  {
    topicNumber: 6,
    topicName: '6. Plant nutrition',
    subtopics: [
      'Photosynthesis',
      'Leaf structure',
    ],
  },
  {
    topicNumber: 7,
    topicName: '7. Human nutrition',
    subtopics: [
      'Diet',
      'Digestive system',
      'Physical digestion',
      'Chemical digestion',
      'Absorption',
    ],
  },
  {
    topicNumber: 8,
    topicName: '8. Transport in plants',
    subtopics: [
      'Xylem and phloem',
      'Water uptake',
      'Transpiration',
      'Translocation',
    ],
  },
  {
    topicNumber: 9,
    topicName: '9. Transport in animals',
    subtopics: [
      'Circulatory systems',
      'Heart',
      'Blood vessels',
      'Blood',
    ],
  },
  {
    topicNumber: 10,
    topicName: '10. Diseases and immunity',
    subtopics: [
      'Diseases and immunity',
    ],
  },
  {
    topicNumber: 11,
    topicName: '11. Gas exchange in humans',
    subtopics: [
      'Gas exchange in humans',
    ],
  },
  {
    topicNumber: 12,
    topicName: '12. Respiration',
    subtopics: [
      'Respiration',
      'Aerobic respiration',
      'Anaerobic respiration',
    ],
  },
  {
    topicNumber: 13,
    topicName: '13. Excretion in humans',
    subtopics: [
      'Excretion in humans',
    ],
  },
  {
    topicNumber: 14,
    topicName: '14. Coordination and response',
    subtopics: [
      'Coordination and response',
      'Sense organs',
      'Hormones',
      'Homeostasis',
      'Tropic responses',
    ],
  },
  {
    topicNumber: 15,
    topicName: '15. Drugs',
    subtopics: [
      'Drugs',
    ],
  },
  {
    topicNumber: 16,
    topicName: '16. Reproduction',
    subtopics: [
      'Asexual reproduction',
      'Sexual reproduction',
      'Sexual reproduction in plants',
      'Sexual reproduction in humans',
      'Sex hormones in humans',
      'Sexually transmitted infections',
    ],
  },
  {
    topicNumber: 17,
    topicName: '17. Inheritance',
    subtopics: [
      'Chromosomes genes and proteins',
      'Mitosis',
      'Meiosis',
      'Monohybrid inheritance',
    ],
  },
  {
    topicNumber: 18,
    topicName: '18. Variation and selection',
    subtopics: [
      'Variation',
      'Adaptive features',
      'Selection',
    ],
  },
  {
    topicNumber: 19,
    topicName: '19. Organisms and their environment',
    subtopics: [
      'Energy flow',
      'Food chains and food webs',
      'Nutrient cycles',
      'Populations',
    ],
  },
  {
    topicNumber: 20,
    topicName: '20. Human influences on ecosystems',
    subtopics: [
      'Food supply',
      'Habitat destruction',
      'Pollution',
      'Conservation',
    ],
  },
  {
    topicNumber: 21,
    topicName: '21. Biotechnology and genetic modification',
    subtopics: [
      'Biotechnology and genetic modification',
      'Biotechnology',
      'Genetic modification',
    ],
  },
];

function topicsToRecord(topics: TopicDefinition[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const t of topics) {
    map[t.topicName] = t.subtopics;
  }
  return map;
}

/**
 * Direct SubjectCode -> { [TopicName]: Subtopics[] } taxonomy dictionary
 */
export const CAMBRIDGE_IGCSE_TAXONOMY: Record<SubjectCode, Record<string, string[]>> = {
  '0580': topicsToRecord(MATHS_0580_TOPICS),
  '0625': topicsToRecord(PHYSICS_0625_TOPICS),
  '0620': topicsToRecord(CHEMISTRY_0620_TOPICS),
  '0610': topicsToRecord(BIOLOGY_0610_TOPICS),
};

export const SUBJECT_TOPICS_MAP: Record<SubjectCode, TopicDefinition[]> = {
  '0580': MATHS_0580_TOPICS,
  '0625': PHYSICS_0625_TOPICS,
  '0620': CHEMISTRY_0620_TOPICS,
  '0610': BIOLOGY_0610_TOPICS,
};

export const OFFICIAL_IGCSE_MATHS_TAXONOMY: UnitDefinition[] = [
  {
    unitCode: '0580',
    unitName: 'Cambridge IGCSE Mathematics (0580)',
    title: 'Mathematics (0580)',
    topics: MATHS_0580_TOPICS,
  },
];

export const OFFICIAL_IGCSE_PHYSICS_TAXONOMY: UnitDefinition[] = [
  {
    unitCode: '0625',
    unitName: 'Cambridge IGCSE Physics (0625)',
    title: 'Physics (0625)',
    topics: PHYSICS_0625_TOPICS,
  },
];

export const OFFICIAL_IGCSE_CHEMISTRY_TAXONOMY: UnitDefinition[] = [
  {
    unitCode: '0620',
    unitName: 'Cambridge IGCSE Chemistry (0620)',
    title: 'Chemistry (0620)',
    topics: CHEMISTRY_0620_TOPICS,
  },
];

export const OFFICIAL_IGCSE_BIOLOGY_TAXONOMY: UnitDefinition[] = [
  {
    unitCode: '0610',
    unitName: 'Cambridge IGCSE Biology (0610)',
    title: 'Biology (0610)',
    topics: BIOLOGY_0610_TOPICS,
  },
];

// Aliases for legacy imports
export const OFFICIAL_IAL_MATHEMATICS_TAXONOMY = OFFICIAL_IGCSE_MATHS_TAXONOMY;
export const OFFICIAL_IAL_PHYSICS_TAXONOMY = OFFICIAL_IGCSE_PHYSICS_TAXONOMY;
export const OFFICIAL_IAL_CHEMISTRY_TAXONOMY = OFFICIAL_IGCSE_CHEMISTRY_TAXONOMY;

export function getTopicsForSubject(subject: SubjectCode | Subject): TopicDefinition[] {
  const code = subjectSlugToCode(subject);
  return SUBJECT_TOPICS_MAP[code] || CHEMISTRY_0620_TOPICS;
}

export function getTaxonomyForSubject(subject: SubjectCode | Subject): UnitDefinition[] {
  const code = subjectSlugToCode(subject);
  if (code === '0580') return OFFICIAL_IGCSE_MATHS_TAXONOMY;
  if (code === '0625') return OFFICIAL_IGCSE_PHYSICS_TAXONOMY;
  if (code === '0610') return OFFICIAL_IGCSE_BIOLOGY_TAXONOMY;
  return OFFICIAL_IGCSE_CHEMISTRY_TAXONOMY;
}

export function isUnitMatch(unitDef: UnitDefinition, filterUnit: string): boolean {
  if (!filterUnit) return false;
  const fLower = filterUnit.trim().toLowerCase();
  const uNameLower = unitDef.unitName.trim().toLowerCase();
  const uCodeLower = unitDef.unitCode.trim().toLowerCase();
  const uTitleLower = unitDef.title.trim().toLowerCase();

  if (uNameLower === fLower || uCodeLower === fLower || uTitleLower === fLower) {
    return true;
  }

  // Paper component filters (e.g. "Paper 2", "paper2") apply to all topics of that subject
  if (/^paper\s*[1-6]/i.test(fLower)) {
    return true;
  }

  // Topic match if filterUnit is a topic name
  if (unitDef.topics.some((t) => t.topicName.toLowerCase() === fLower)) {
    return true;
  }

  return fLower.includes(uCodeLower) || uNameLower.includes(fLower);
}

/**
 * Builds the canonical subtopic hierarchy for a given Cambridge IGCSE subject and question pool.
 */
export function buildStaticSubtopicHierarchy(
  unitFilter: string | string[],
  questions: {
    subtopic?: string;
    subtopics?: string[];
    topic?: string;
    unit?: string;
    unitCode?: string;
    subject?: SubjectCode;
    paper?: number;
    paperId?: string;
  }[],
  subject?: Subject | SubjectCode
): SubtopicGroup[] {
  const unitList: string[] = Array.isArray(unitFilter)
    ? unitFilter
    : !unitFilter || unitFilter === 'all'
    ? []
    : [unitFilter];

  let resolvedCode: SubjectCode = '0620';
  if (subject) {
    resolvedCode = subjectSlugToCode(subject);
  } else if (questions.length > 0) {
    const first = questions[0];
    if (first.subject) {
      resolvedCode = first.subject;
    } else {
      const idOrCode = (first.unitCode || first.paperId || '').toLowerCase();
      if (idOrCode.startsWith('0580') || idOrCode.startsWith('wma')) resolvedCode = '0580';
      else if (idOrCode.startsWith('0625') || idOrCode.startsWith('wph')) resolvedCode = '0625';
      else if (idOrCode.startsWith('0610')) resolvedCode = '0610';
    }
  }

  const topics = SUBJECT_TOPICS_MAP[resolvedCode] || CHEMISTRY_0620_TOPICS;

  // Precompute subtopic frequency across the questions
  const subtopicCounts = new Map<string, number>();
  for (const q of questions) {
    if (unitList.length > 0) {
      const qUnit = q.unit || (q.paper ? `Paper ${q.paper}` : '');
      const qTopic = q.topic || '';
      const matchesFilter = unitList.some((filterVal) => {
        const fLower = filterVal.trim().toLowerCase();
        if (qUnit && qUnit.toLowerCase() === fLower) return true;
        if (qTopic && qTopic.toLowerCase() === fLower) return true;
        if (q.paper && fLower === `paper${q.paper}`) return true;
        if (q.paper && fLower === `paper ${q.paper}`) return true;
        return true;
      });
      if (!matchesFilter) continue;
    }
    const subs = q.subtopics && q.subtopics.length > 0 ? q.subtopics : q.subtopic ? [q.subtopic] : [];
    for (const s of subs) {
      if (!s) continue;
      subtopicCounts.set(s, (subtopicCounts.get(s) || 0) + 1);
    }
  }

  return topics.map((topic) => ({
    topicName: topic.topicName,
    subtopics: topic.subtopics.map((sName) => ({
      name: sName,
      count: subtopicCounts.get(sName) || 0,
    })),
  }));
}

/**
 * Resolves the canonical parent topic for any subtopic string across all 4 Cambridge IGCSE subjects.
 */
export function getParentTopicForSubtopic(subtopic: string, subject?: SubjectCode | Subject): string {
  if (subject) {
    const topics = getTopicsForSubject(subject);
    for (const t of topics) {
      if (t.subtopics.includes(subtopic)) {
        return t.topicName;
      }
    }
  }

  const allTopicLists = [
    MATHS_0580_TOPICS,
    PHYSICS_0625_TOPICS,
    CHEMISTRY_0620_TOPICS,
    BIOLOGY_0610_TOPICS,
  ];
  for (const list of allTopicLists) {
    for (const t of list) {
      if (t.subtopics.includes(subtopic)) {
        return t.topicName;
      }
    }
  }
  return 'General';
}

/**
 * Resolves the canonical Subject label for a subtopic string.
 */
export function getUnitForSubtopic(subtopic: string): string {
  for (const t of MATHS_0580_TOPICS) {
    if (t.subtopics.includes(subtopic)) return 'Maths 0580';
  }
  for (const t of PHYSICS_0625_TOPICS) {
    if (t.subtopics.includes(subtopic)) return 'Physics 0625';
  }
  for (const t of CHEMISTRY_0620_TOPICS) {
    if (t.subtopics.includes(subtopic)) return 'Chemistry 0620';
  }
  for (const t of BIOLOGY_0610_TOPICS) {
    if (t.subtopics.includes(subtopic)) return 'Biology 0610';
  }
  return 'Chemistry 0620';
}
