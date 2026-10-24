export interface PhysicalConstant {
  name: string;
  symbol: string;
  symbolLatex?: string;
  value: string;
  valueLatex?: string;
  unit: string;
  notes?: string;
}

export interface MetricMultiplier {
  prefix: string;
  symbol: string;
  factor: string;
  power: number;
}

export interface EquationItem {
  id: string;
  topic: string;
  unit: string;
  title: string;
  formula: string;
  latex: string;
  description?: string;
}

export interface CircuitSymbolItem {
  id: string;
  name: string;
  description: string;
  symbolType: 'power' | 'switch' | 'resistor' | 'meter' | 'output' | 'semiconductor';
}

export interface PeriodicElement {
  atomicNumber: number;
  symbol: string;
  name: string;
  atomicMass: string;
  period: number;
  group: number | string;
  category: 'alkali' | 'alkaline-earth' | 'transition' | 'post-transition' | 'metalloid' | 'nonmetal' | 'halogen' | 'noble-gas' | 'lanthanide' | 'actinide';
}

export interface QualitativeTestItem {
  id: string;
  ionOrGas: string;
  formulaLatex?: string;
  test: string;
  result: string;
  type: 'anion' | 'cation' | 'gas' | 'flame';
}

export interface FoodTestItem {
  nutrient: string;
  reagent: string;
  method: string;
  initialColor: string;
  positiveColor: string;
}

export interface MathFormulaItem {
  id: string;
  section: string;
  category: string;
  title: string;
  latex: string;
  description?: string;
  inBooklet?: boolean;
  unit?: string;
}

// =============================================================================
// 1. CAMBRIDGE IGCSE MATHEMATICS (0580) — OFFICIAL 2025–2028 FORMULA SHEET
// =============================================================================
export const CAMBRIDGE_MATH_FORMULAE: MathFormulaItem[] = [
  // Geometry & Mensuration
  {
    id: 'math-area-tri',
    section: 'Mensuration',
    category: 'Area & Perimeter',
    title: 'Area of a triangle',
    latex: String.raw`\text{Area} = \frac{1}{2}bh`,
    description: 'b = base, h = perpendicular height',
    inBooklet: true,
    unit: 'Core & Extended',
  },
  {
    id: 'math-area-circle',
    section: 'Mensuration',
    category: 'Area & Perimeter',
    title: 'Area of a circle',
    latex: String.raw`\text{Area} = \pi r^2`,
    description: 'r = radius',
    inBooklet: true,
    unit: 'Core & Extended',
  },
  {
    id: 'math-circ-circle',
    section: 'Mensuration',
    category: 'Area & Perimeter',
    title: 'Circumference of a circle',
    latex: String.raw`C = 2\pi r = \pi d`,
    description: 'r = radius, d = diameter',
    inBooklet: true,
    unit: 'Core & Extended',
  },
  {
    id: 'math-trapezium-area',
    section: 'Mensuration',
    category: 'Area & Perimeter',
    title: 'Area of a trapezium',
    latex: String.raw`\text{Area} = \frac{1}{2}(a + b)h`,
    description: 'a, b = parallel sides, h = height',
    inBooklet: true,
    unit: 'Core & Extended',
  },
  {
    id: 'math-csa-cylinder',
    section: 'Mensuration',
    category: 'Surface Area',
    title: 'Curved surface area of a cylinder',
    latex: String.raw`A = 2\pi rh`,
    description: 'r = radius, h = height',
    inBooklet: true,
    unit: 'Core & Extended',
  },
  {
    id: 'math-csa-cone',
    section: 'Mensuration',
    category: 'Surface Area',
    title: 'Curved surface area of a cone',
    latex: String.raw`A = \pi rl`,
    description: 'r = radius, l = slant height',
    inBooklet: true,
    unit: 'Extended',
  },
  {
    id: 'math-sa-sphere',
    section: 'Mensuration',
    category: 'Surface Area',
    title: 'Surface area of a sphere',
    latex: String.raw`A = 4\pi r^2`,
    description: 'r = radius',
    inBooklet: true,
    unit: 'Extended',
  },
  {
    id: 'math-vol-prism',
    section: 'Mensuration',
    category: 'Volume',
    title: 'Volume of a prism',
    latex: String.raw`V = Ah = Al`,
    description: 'A = cross-sectional area, l = length',
    inBooklet: true,
    unit: 'Core & Extended',
  },
  {
    id: 'math-vol-cylinder',
    section: 'Mensuration',
    category: 'Volume',
    title: 'Volume of a cylinder',
    latex: String.raw`V = \pi r^2 h`,
    description: 'r = radius, h = height',
    inBooklet: true,
    unit: 'Core & Extended',
  },
  {
    id: 'math-vol-pyramid',
    section: 'Mensuration',
    category: 'Volume',
    title: 'Volume of a pyramid',
    latex: String.raw`V = \frac{1}{3}Ah`,
    description: 'A = base area, h = perpendicular height',
    inBooklet: true,
    unit: 'Extended',
  },
  {
    id: 'math-vol-cone',
    section: 'Mensuration',
    category: 'Volume',
    title: 'Volume of a cone',
    latex: String.raw`V = \frac{1}{3}\pi r^2 h`,
    description: 'r = radius, h = perpendicular height',
    inBooklet: true,
    unit: 'Extended',
  },
  {
    id: 'math-vol-sphere',
    section: 'Mensuration',
    category: 'Volume',
    title: 'Volume of a sphere',
    latex: String.raw`V = \frac{4}{3}\pi r^3`,
    description: 'r = radius',
    inBooklet: true,
    unit: 'Extended',
  },

  // Algebra
  {
    id: 'math-quad-formula',
    section: 'Algebra',
    category: 'Quadratic Equations',
    title: 'Quadratic equation formula',
    latex: String.raw`x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}`,
    description: 'For any equation of the form ax² + bx + c = 0',
    inBooklet: true,
    unit: 'Extended',
  },

  // Trigonometry
  {
    id: 'math-sine-rule',
    section: 'Trigonometry',
    category: 'Non-Right-Angled Triangles',
    title: 'Sine rule',
    latex: String.raw`\frac{a}{\sin A} = \frac{b}{\sin B} = \frac{c}{\sin C}`,
    description: 'Also used inverted: sin A / a = sin B / b = sin C / c',
    inBooklet: true,
    unit: 'Extended',
  },
  {
    id: 'math-cosine-rule-side',
    section: 'Trigonometry',
    category: 'Non-Right-Angled Triangles',
    title: 'Cosine rule (for sides)',
    latex: String.raw`a^2 = b^2 + c^2 - 2bc \cos A`,
    description: 'Use when two sides and the included angle are known',
    inBooklet: true,
    unit: 'Extended',
  },
  {
    id: 'math-cosine-rule-angle',
    section: 'Trigonometry',
    category: 'Non-Right-Angled Triangles',
    title: 'Cosine rule (for angles)',
    latex: String.raw`\cos A = \frac{b^2 + c^2 - a^2}{2bc}`,
    description: 'Use when all three sides are known',
    inBooklet: true,
    unit: 'Extended',
  },
  {
    id: 'math-area-sin',
    section: 'Trigonometry',
    category: 'Non-Right-Angled Triangles',
    title: 'Area of triangle (sine formula)',
    latex: String.raw`\text{Area} = \frac{1}{2}ab \sin C`,
    description: 'Two sides and the included angle',
    inBooklet: true,
    unit: 'Extended',
  },

  // Statistics
  {
    id: 'math-stat-mean',
    section: 'Statistics',
    category: 'Averages',
    title: 'Mean of grouped frequency data',
    latex: String.raw`\bar{x} = \frac{\sum fx}{\sum f}`,
    description: 'x = mid-interval value, f = frequency',
    inBooklet: true,
    unit: 'Core & Extended',
  },
];

// Compatibility aliases for existing references
export const PURE_MATH_FORMULAE: MathFormulaItem[] = CAMBRIDGE_MATH_FORMULAE;
export const MECHANICS_FORMULAE: MathFormulaItem[] = [];
export const STATISTICS_FORMULAE: MathFormulaItem[] = [];

// =============================================================================
// 2. CAMBRIDGE IGCSE PHYSICS (0625) — OFFICIAL EQUATIONS & CONSTANTS
// =============================================================================
export const CAMBRIDGE_PHYSICS_CONSTANTS: PhysicalConstant[] = [
  { name: 'Acceleration of free fall (gravity)', symbol: 'g', symbolLatex: 'g', value: '9.8', valueLatex: String.raw`g = 9.8\text{ m/s}^2\text{ (or N/kg)}`, unit: 'm/s² (or N/kg)', notes: "Earth's surface (9.8 used in 2023+ syllabus)" },
  { name: 'Speed of light in a vacuum', symbol: 'c', symbolLatex: 'c', value: '3.0 × 10⁸', valueLatex: String.raw`c = 3.0 \times 10^8\text{ m/s}`, unit: 'm/s', notes: 'Electromagnetic wave speed in vacuum' },
  { name: 'Speed of sound in air', symbol: 'v_sound', symbolLatex: 'v', value: '330–350', valueLatex: String.raw`v = 330\text{--}350\text{ m/s}`, unit: 'm/s', notes: 'At standard atmospheric temperature' },
  { name: 'Hubble constant', symbol: 'H₀', symbolLatex: 'H_0', value: '2.2 × 10⁻¹⁸', valueLatex: String.raw`H_0 \approx 2.2 \times 10^{-18}\text{ s}^{-1}`, unit: 's⁻¹', notes: 'Recession velocity proportionality' },
];

export const PHYSICS_CONSTANTS = CAMBRIDGE_PHYSICS_CONSTANTS;

export const METRIC_MULTIPLIERS: MetricMultiplier[] = [
  { prefix: 'giga', symbol: 'G', factor: '1 000 000 000', power: 9 },
  { prefix: 'mega', symbol: 'M', factor: '1 000 000', power: 6 },
  { prefix: 'kilo', symbol: 'k', factor: '1 000', power: 3 },
  { prefix: 'centi', symbol: 'c', factor: '0.01', power: -2 },
  { prefix: 'milli', symbol: 'm', factor: '0.001', power: -3 },
  { prefix: 'micro', symbol: 'μ', factor: '0.000 001', power: -6 },
  { prefix: 'nano', symbol: 'n', factor: '0.000 000 001', power: -9 },
];

export const CAMBRIDGE_PHYSICS_EQUATIONS: EquationItem[] = [
  // 1. Motion, Forces & Energy
  { id: 'ph-speed', topic: 'Motion', unit: 'Topic 1', title: 'Average speed', formula: 'v = s / t', latex: String.raw`v = \frac{s}{t}` },
  { id: 'ph-accel', topic: 'Motion', unit: 'Topic 1', title: 'Acceleration', formula: 'a = (v - u) / t', latex: String.raw`a = \frac{\Delta v}{\Delta t} = \frac{v - u}{t}` },
  { id: 'ph-density', topic: 'Matter', unit: 'Topic 1', title: 'Density', formula: 'ρ = m / V', latex: String.raw`\rho = \frac{m}{V}` },
  { id: 'ph-newton2', topic: 'Forces', unit: 'Topic 1', title: "Newton's second law", formula: 'F = ma', latex: String.raw`F = ma` },
  { id: 'ph-weight', topic: 'Forces', unit: 'Topic 1', title: 'Weight', formula: 'W = mg', latex: String.raw`W = mg` },
  { id: 'ph-hooke', topic: 'Forces', unit: 'Topic 1', title: "Hooke's law", formula: 'F = kx', latex: String.raw`F = kx` },
  { id: 'ph-pressure', topic: 'Pressure', unit: 'Topic 1', title: 'Pressure', formula: 'p = F / A', latex: String.raw`p = \frac{F}{A}` },
  { id: 'ph-liquid-pressure', topic: 'Pressure', unit: 'Topic 1', title: 'Liquid pressure at depth', formula: 'Δp = ρgΔh', latex: String.raw`\Delta p = \rho g \Delta h` },
  { id: 'ph-work', topic: 'Energy', unit: 'Topic 1', title: 'Work done', formula: 'W = Fd = ΔE', latex: String.raw`W = Fd = \Delta E` },
  { id: 'ph-ke', topic: 'Energy', unit: 'Topic 1', title: 'Kinetic energy', formula: 'E_k = ½mv²', latex: String.raw`E_k = \frac{1}{2}mv^2` },
  { id: 'ph-gpe', topic: 'Energy', unit: 'Topic 1', title: 'Gravitational potential energy', formula: 'ΔE_p = mgΔh', latex: String.raw`\Delta E_p = mg\Delta h` },
  { id: 'ph-power', topic: 'Energy', unit: 'Topic 1', title: 'Power', formula: 'P = W / t = ΔE / t', latex: String.raw`P = \frac{W}{t} = \frac{\Delta E}{t}` },
  { id: 'ph-efficiency', topic: 'Energy', unit: 'Topic 1', title: 'Efficiency', formula: 'η = (useful / total) × 100%', latex: String.raw`\text{Efficiency} = \frac{\text{useful energy output}}{\text{total energy input}} \times 100\%` },
  { id: 'ph-moment', topic: 'Forces', unit: 'Topic 1', title: 'Moment of a force', formula: 'moment = Fd', latex: String.raw`\text{Moment} = Fd` },
  { id: 'ph-momentum', topic: 'Momentum', unit: 'Topic 1', title: 'Momentum', formula: 'p = mv', latex: String.raw`p = mv` },
  { id: 'ph-impulse', topic: 'Momentum', unit: 'Topic 1', title: 'Impulse of a force', formula: 'FΔt = Δp = m(v - u)', latex: String.raw`F\Delta t = \Delta p = m(v - u)` },

  // 2. Thermal Physics
  { id: 'ph-shc', topic: 'Thermal', unit: 'Topic 2', title: 'Specific heat capacity', formula: 'c = ΔE / (mΔθ)', latex: String.raw`c = \frac{\Delta E}{m\Delta \theta} \implies \Delta E = mc\Delta \theta` },
  { id: 'ph-boyle', topic: 'Thermal', unit: 'Topic 2', title: "Boyle's law (constant temp)", formula: 'p₁V₁ = p₂V₂', latex: String.raw`p_1 V_1 = p_2 V_2` },

  // 3. Waves
  { id: 'ph-wavespeed', topic: 'Waves', unit: 'Topic 3', title: 'Wave speed', formula: 'v = fλ', latex: String.raw`v = f\lambda` },
  { id: 'ph-snell', topic: 'Light', unit: 'Topic 3', title: 'Refractive index (Snell)', formula: 'n = sin i / sin r', latex: String.raw`n = \frac{\sin i}{\sin r}` },
  { id: 'ph-refract-speed', topic: 'Light', unit: 'Topic 3', title: 'Refractive index (speed)', formula: 'n = c / v', latex: String.raw`n = \frac{c}{v}` },
  { id: 'ph-critical-angle', topic: 'Light', unit: 'Topic 3', title: 'Critical angle', formula: 'sin c = 1 / n', latex: String.raw`\sin c = \frac{1}{n}` },

  // 4. Electricity & Magnetism
  { id: 'ph-current', topic: 'Electricity', unit: 'Topic 4', title: 'Electric current', formula: 'I = Q / t', latex: String.raw`I = \frac{Q}{t} \implies Q = It` },
  { id: 'ph-emf-pd', topic: 'Electricity', unit: 'Topic 4', title: 'Electromotive force / p.d.', formula: 'V = W / Q', latex: String.raw`V = \frac{W}{Q}` },
  { id: 'ph-resistance', topic: 'Electricity', unit: 'Topic 4', title: 'Resistance (Ohm)', formula: 'R = V / I', latex: String.raw`R = \frac{V}{I}` },
  { id: 'ph-elec-power', topic: 'Electricity', unit: 'Topic 4', title: 'Electrical power', formula: 'P = IV = I²R = V²/R', latex: String.raw`P = IV = I^2 R = \frac{V^2}{R}` },
  { id: 'ph-elec-energy', topic: 'Electricity', unit: 'Topic 4', title: 'Electrical energy', formula: 'E = IVt = Pt', latex: String.raw`E = IVt = Pt` },
  { id: 'ph-res-series', topic: 'Electricity', unit: 'Topic 4', title: 'Resistors in series', formula: 'R_T = R₁ + R₂ + ...', latex: String.raw`R_T = R_1 + R_2 + \dots` },
  { id: 'ph-res-parallel', topic: 'Electricity', unit: 'Topic 4', title: 'Resistors in parallel', formula: '1/R_T = 1/R₁ + 1/R₂', latex: String.raw`\frac{1}{R_T} = \frac{1}{R_1} + \frac{1}{R_2} \implies R_T = \frac{R_1 R_2}{R_1 + R_2}` },
  { id: 'ph-pot-divider', topic: 'Electricity', unit: 'Topic 4', title: 'Potential divider', formula: 'V₁/V₂ = R₁/R₂', latex: String.raw`\frac{V_1}{V_2} = \frac{R_1}{R_2},\quad V_{\text{out}} = V_{\text{in}} \left(\frac{R_1}{R_1 + R_2}\right)` },
  { id: 'ph-transformer-turns', topic: 'Magnetism', unit: 'Topic 4', title: 'Transformer voltage equation', formula: 'V_p / V_s = N_p / N_s', latex: String.raw`\frac{V_p}{V_s} = \frac{N_p}{N_s}` },
  { id: 'ph-transformer-power', topic: 'Magnetism', unit: 'Topic 4', title: 'Ideal transformer power', formula: 'I_p V_p = I_s V_s', latex: String.raw`I_p V_p = I_s V_s` },

  // 5. Space Physics
  { id: 'ph-orbital-speed', topic: 'Space', unit: 'Topic 6', title: 'Orbital speed', formula: 'v = 2πr / T', latex: String.raw`v = \frac{2\pi r}{T}` },
  { id: 'ph-hubble', topic: 'Space', unit: 'Topic 6', title: "Hubble's law", formula: 'v = H₀d', latex: String.raw`v = H_0 d` },
  { id: 'ph-universe-age', topic: 'Space', unit: 'Topic 6', title: 'Estimate of the age of the Universe', formula: 'd / v = 1 / H₀', latex: String.raw`t \approx \frac{1}{H_0}` },
];

export const IAS_PHYSICS_EQUATIONS = CAMBRIDGE_PHYSICS_EQUATIONS;
export const IA2_PHYSICS_EQUATIONS = [];

export const CIRCUIT_SYMBOLS: CircuitSymbolItem[] = [
  { id: 'sym-cell', name: 'Cell', description: 'Single chemical cell generating d.c. (long thin line positive, short thick line negative)', symbolType: 'power' },
  { id: 'sym-battery', name: 'Battery of cells', description: 'Multiple cells connected in series to provide higher e.m.f.', symbolType: 'power' },
  { id: 'sym-power-supply', name: 'Power supply', description: 'General electrical power supply terminals (two open terminal circles with horizontal leads)', symbolType: 'power' },
  { id: 'sym-dc-source', name: 'd.c. power supply', description: 'Direct current power supply terminals marked with + and − polarity', symbolType: 'power' },
  { id: 'sym-ac-source', name: 'a.c. power supply', description: 'Alternating current power supply (two open terminal circles with sine wave ~ between them)', symbolType: 'power' },
  { id: 'sym-resistor', name: 'Fixed resistor', description: 'Provides fixed electrical resistance to control current (plain horizontal rectangle)', symbolType: 'resistor' },
  { id: 'sym-var-resistor', name: 'Variable resistor', description: 'Resistor with adjustable resistance (diagonal arrow pointing up-right across rectangle)', symbolType: 'resistor' },
  { id: 'sym-thermistor', name: 'Thermistor', description: 'NTC temperature-dependent resistor; resistance decreases as temperature increases', symbolType: 'resistor' },
  { id: 'sym-ldr', name: 'Light-dependent resistor (LDR)', description: 'Resistance decreases as light intensity increases (rectangle with two inward arrows)', symbolType: 'resistor' },
  { id: 'sym-heater', name: 'Heater', description: 'Transfers electrical energy to thermal energy (rectangle divided by 3 vertical internal lines)', symbolType: 'output' },
  { id: 'sym-potential-divider', name: 'Potential divider', description: 'Potentiometer / variable potential divider with sliding contact arrow onto top edge', symbolType: 'resistor' },
  { id: 'sym-transformer', name: 'Transformer', description: 'Two facing vertical coils separated by a vertical core line for stepping a.c. voltage up or down', symbolType: 'power' },
  { id: 'sym-magnetising-coil', name: 'Magnetising coil', description: 'Solenoid / inductor coil producing a magnetic field when current flows (4 consecutive arches)', symbolType: 'power' },
  { id: 'sym-switch-open', name: 'Switch (open)', description: 'Breaks circuit path and stops current flow (open angled contact blade)', symbolType: 'switch' },
  { id: 'sym-switch-closed', name: 'Switch (closed)', description: 'Completes circuit path allowing current flow (closed flat contact blade)', symbolType: 'switch' },
  { id: 'sym-earth', name: 'Earth or ground', description: 'Safety connection to earth at 0 V potential (vertical lead to 3 horizontal bars of decreasing width)', symbolType: 'switch' },
  { id: 'sym-junction', name: 'Junction of conductors', description: 'Electrical connection where wires meet (solid filled dot at T-intersection)', symbolType: 'switch' },
  { id: 'sym-lamp', name: 'Lamp', description: 'Filament indicator lamp transferring electrical energy to light (circle with diagonal X)', symbolType: 'output' },
  { id: 'sym-motor', name: 'Motor', description: 'Transfers electrical energy to kinetic energy (circle with underlined capital M)', symbolType: 'output' },
  { id: 'sym-generator', name: 'Generator', description: 'Transfers mechanical energy to electrical energy (square box with capital G inside)', symbolType: 'power' },
  { id: 'sym-ammeter', name: 'Ammeter', description: 'Measures electric current in amperes; connected in series (circle with capital A)', symbolType: 'meter' },
  { id: 'sym-voltmeter', name: 'Voltmeter', description: 'Measures potential difference in volts; connected in parallel (circle with capital V)', symbolType: 'meter' },
  { id: 'sym-diode', name: 'Diode', description: 'Semiconductor allowing current in one direction only (triangle pointing to bar with wire through center)', symbolType: 'semiconductor' },
  { id: 'sym-led', name: 'Light-emitting diode (LED)', description: 'Emits light when forward-biased (diode symbol with two outward diagonal arrows)', symbolType: 'semiconductor' },
  { id: 'sym-fuse', name: 'Fuse', description: 'Safety component that melts and breaks circuit if current exceeds rating (rectangle with center line through)', symbolType: 'switch' },
  { id: 'sym-relay', name: 'Relay coil', description: 'Electromagnetic switch coil with vertical leads from top-center and bottom-center of empty rectangle', symbolType: 'switch' },
  { id: 'sym-bell', name: 'Electric bell', description: 'Audible electromagnetic signalling device (semicircular dome cap with two vertical legs below)', symbolType: 'output' },
];

// =============================================================================
// 3. CAMBRIDGE IGCSE CHEMISTRY (0620) — PERIODIC TABLE & QUALITATIVE ANALYSIS
// =============================================================================
export const QUALITATIVE_ANALYSIS_NOTES: QualitativeTestItem[] = [
  // Tests for Anions
  { id: 'an-carb', ionOrGas: 'Carbonate', formulaLatex: 'CO_3^{2-}', test: 'Add dilute acid', result: 'Effervescence; produced carbon dioxide gas turns limewater cloudy', type: 'anion' },
  { id: 'an-chlor', ionOrGas: 'Chloride (in solution)', formulaLatex: 'Cl^-', test: 'Acidify with dilute nitric acid, then add aqueous silver nitrate', result: 'White precipitate formed', type: 'anion' },
  { id: 'an-brom', ionOrGas: 'Bromide (in solution)', formulaLatex: 'Br^-', test: 'Acidify with dilute nitric acid, then add aqueous silver nitrate', result: 'Cream precipitate formed', type: 'anion' },
  { id: 'an-iod', ionOrGas: 'Iodide (in solution)', formulaLatex: 'I^-', test: 'Acidify with dilute nitric acid, then add aqueous silver nitrate', result: 'Yellow precipitate formed', type: 'anion' },
  { id: 'an-nit', ionOrGas: 'Nitrate (in solution)', formulaLatex: 'NO_3^-', test: 'Add aqueous sodium hydroxide, then aluminium foil; warm gently', result: 'Ammonia gas produced; turns damp red litmus paper blue', type: 'anion' },
  { id: 'an-sulf', ionOrGas: 'Sulfate (in solution)', formulaLatex: 'SO_4^{2-}', test: 'Acidify with dilute nitric acid, then add aqueous barium nitrate', result: 'White precipitate formed', type: 'anion' },
  { id: 'an-sulfite', ionOrGas: 'Sulfite', formulaLatex: 'SO_3^{2-}', test: 'Add small volume of acidified aqueous potassium manganate(VII)', result: 'Color changes from purple to colorless', type: 'anion' },

  // Tests for Aqueous Cations
  { id: 'cat-al', ionOrGas: 'Aluminium', formulaLatex: 'Al^{3+}', test: 'Effect of aqueous NaOH: White ppt., soluble in excess giving colorless solution. Effect of aqueous NH₃: White ppt., insoluble in excess.', result: 'White ppt. soluble in excess NaOH; insoluble in excess NH₃', type: 'cation' },
  { id: 'cat-nh4', ionOrGas: 'Ammonium', formulaLatex: 'NH_4^+', test: 'Add aqueous sodium hydroxide; warm gently', result: 'Ammonia gas produced on warming (turns damp red litmus paper blue)', type: 'cation' },
  { id: 'cat-ca', ionOrGas: 'Calcium', formulaLatex: 'Ca^{2+}', test: 'Effect of aqueous NaOH: White ppt., insoluble in excess. Effect of aqueous NH₃: No ppt. or very slight white ppt.', result: 'White ppt. insoluble in excess NaOH; no ppt. in NH₃', type: 'cation' },
  { id: 'cat-cr', ionOrGas: 'Chromium(III)', formulaLatex: 'Cr^{3+}', test: 'Effect of aqueous NaOH: Green ppt., soluble in excess. Effect of aqueous NH₃: Grey-green ppt., insoluble in excess.', result: 'Green ppt. soluble in excess NaOH; grey-green ppt. insoluble in NH₃', type: 'cation' },
  { id: 'cat-cu', ionOrGas: 'Copper(II)', formulaLatex: 'Cu^{2+}', test: 'Effect of aqueous NaOH: Light blue ppt., insoluble in excess. Effect of aqueous NH₃: Light blue ppt., soluble in excess giving dark blue solution.', result: 'Light blue ppt.; gives dark blue solution in excess NH₃', type: 'cation' },
  { id: 'cat-fe2', ionOrGas: 'Iron(II)', formulaLatex: 'Fe^{2+}', test: 'Effect of aqueous NaOH: Green ppt., insoluble in excess. Effect of aqueous NH₃: Green ppt., insoluble in excess.', result: 'Green ppt. insoluble in excess; turns reddish-brown at surface on standing', type: 'cation' },
  { id: 'cat-fe3', ionOrGas: 'Iron(III)', formulaLatex: 'Fe^{3+}', test: 'Effect of aqueous NaOH: Red-brown ppt., insoluble in excess. Effect of aqueous NH₃: Red-brown ppt., insoluble in excess.', result: 'Red-brown ppt. insoluble in excess', type: 'cation' },
  { id: 'cat-zn', ionOrGas: 'Zinc', formulaLatex: 'Zn^{2+}', test: 'Effect of aqueous NaOH: White ppt., soluble in excess giving colorless solution. Effect of aqueous NH₃: White ppt., soluble in excess giving colorless solution.', result: 'White ppt. soluble in excess of both NaOH and NH₃', type: 'cation' },

  // Tests for Gases
  { id: 'gas-nh3', ionOrGas: 'Ammonia', formulaLatex: 'NH_3', test: 'Expose to damp red litmus paper', result: 'Turns damp red litmus paper blue; sharp pungent smell', type: 'gas' },
  { id: 'gas-co2', ionOrGas: 'Carbon dioxide', formulaLatex: 'CO_2', test: 'Bubble through aqueous calcium hydroxide (limewater)', result: 'Limewater turns milky / cloudy white', type: 'gas' },
  { id: 'gas-cl2', ionOrGas: 'Chlorine', formulaLatex: 'Cl_2', test: 'Expose to damp litmus paper', result: 'Bleaches damp litmus paper white (turns red momentarily first)', type: 'gas' },
  { id: 'gas-h2', ionOrGas: 'Hydrogen', formulaLatex: 'H_2', test: 'Hold a lighted wooden splint near the mouth of the tube', result: "'Pops' with a lighted splint", type: 'gas' },
  { id: 'gas-o2', ionOrGas: 'Oxygen', formulaLatex: 'O_2', test: 'Insert a glowing wooden splint into the gas', result: 'Relights a glowing splint', type: 'gas' },
  { id: 'gas-so2', ionOrGas: 'Sulfur dioxide', formulaLatex: 'SO_2', test: 'Bubble into acidified aqueous potassium manganate(VII)', result: 'Color turns from purple to colorless', type: 'gas' },

  // Flame Tests
  { id: 'flame-li', ionOrGas: 'Lithium', formulaLatex: 'Li^+', test: 'Clean nichrome wire dipped in concentrated HCl and solid sample into non-luminous Bunsen flame', result: 'Red flame', type: 'flame' },
  { id: 'flame-na', ionOrGas: 'Sodium', formulaLatex: 'Na^+', test: 'Clean nichrome wire into non-luminous Bunsen flame', result: 'Yellow flame', type: 'flame' },
  { id: 'flame-k', ionOrGas: 'Potassium', formulaLatex: 'K^+', test: 'Clean nichrome wire into non-luminous Bunsen flame', result: 'Lilac flame', type: 'flame' },
  { id: 'flame-ca', ionOrGas: 'Calcium', formulaLatex: 'Ca^{2+}', test: 'Clean nichrome wire into non-luminous Bunsen flame', result: 'Orange-red flame', type: 'flame' },
  { id: 'flame-ba', ionOrGas: 'Barium', formulaLatex: 'Ba^{2+}', test: 'Clean nichrome wire into non-luminous Bunsen flame', result: 'Light green flame', type: 'flame' },
  { id: 'flame-cu', ionOrGas: 'Copper(II)', formulaLatex: 'Cu^{2+}', test: 'Clean nichrome wire into non-luminous Bunsen flame', result: 'Blue-green flame', type: 'flame' },
];

export const PERIODIC_ELEMENTS: PeriodicElement[] = [
  { atomicNumber: 1, symbol: 'H', name: 'Hydrogen', atomicMass: '1', period: 1, group: 1, category: 'nonmetal' },
  { atomicNumber: 2, symbol: 'He', name: 'Helium', atomicMass: '4', period: 1, group: 18, category: 'noble-gas' },
  { atomicNumber: 3, symbol: 'Li', name: 'Lithium', atomicMass: '7', period: 2, group: 1, category: 'alkali' },
  { atomicNumber: 4, symbol: 'Be', name: 'Beryllium', atomicMass: '9', period: 2, group: 2, category: 'alkaline-earth' },
  { atomicNumber: 5, symbol: 'B', name: 'Boron', atomicMass: '11', period: 2, group: 13, category: 'metalloid' },
  { atomicNumber: 6, symbol: 'C', name: 'Carbon', atomicMass: '12', period: 2, group: 14, category: 'nonmetal' },
  { atomicNumber: 7, symbol: 'N', name: 'Nitrogen', atomicMass: '14', period: 2, group: 15, category: 'nonmetal' },
  { atomicNumber: 8, symbol: 'O', name: 'Oxygen', atomicMass: '16', period: 2, group: 16, category: 'nonmetal' },
  { atomicNumber: 9, symbol: 'F', name: 'Fluorine', atomicMass: '19', period: 2, group: 17, category: 'halogen' },
  { atomicNumber: 10, symbol: 'Ne', name: 'Neon', atomicMass: '20', period: 2, group: 18, category: 'noble-gas' },
  { atomicNumber: 11, symbol: 'Na', name: 'Sodium', atomicMass: '23', period: 3, group: 1, category: 'alkali' },
  { atomicNumber: 12, symbol: 'Mg', name: 'Magnesium', atomicMass: '24', period: 3, group: 2, category: 'alkaline-earth' },
  { atomicNumber: 13, symbol: 'Al', name: 'Aluminium', atomicMass: '27', period: 3, group: 13, category: 'post-transition' },
  { atomicNumber: 14, symbol: 'Si', name: 'Silicon', atomicMass: '28', period: 3, group: 14, category: 'metalloid' },
  { atomicNumber: 15, symbol: 'P', name: 'Phosphorus', atomicMass: '31', period: 3, group: 15, category: 'nonmetal' },
  { atomicNumber: 16, symbol: 'S', name: 'Sulfur', atomicMass: '32', period: 3, group: 16, category: 'nonmetal' },
  { atomicNumber: 17, symbol: 'Cl', name: 'Chlorine', atomicMass: '35.5', period: 3, group: 17, category: 'halogen' },
  { atomicNumber: 18, symbol: 'Ar', name: 'Argon', atomicMass: '40', period: 3, group: 18, category: 'noble-gas' },
  { atomicNumber: 19, symbol: 'K', name: 'Potassium', atomicMass: '39', period: 4, group: 1, category: 'alkali' },
  { atomicNumber: 20, symbol: 'Ca', name: 'Calcium', atomicMass: '40', period: 4, group: 2, category: 'alkaline-earth' },
  { atomicNumber: 21, symbol: 'Sc', name: 'Scandium', atomicMass: '45', period: 4, group: 3, category: 'transition' },
  { atomicNumber: 22, symbol: 'Ti', name: 'Titanium', atomicMass: '48', period: 4, group: 4, category: 'transition' },
  { atomicNumber: 23, symbol: 'V', name: 'Vanadium', atomicMass: '51', period: 4, group: 5, category: 'transition' },
  { atomicNumber: 24, symbol: 'Cr', name: 'Chromium', atomicMass: '52', period: 4, group: 6, category: 'transition' },
  { atomicNumber: 25, symbol: 'Mn', name: 'Manganese', atomicMass: '55', period: 4, group: 7, category: 'transition' },
  { atomicNumber: 26, symbol: 'Fe', name: 'Iron', atomicMass: '56', period: 4, group: 8, category: 'transition' },
  { atomicNumber: 27, symbol: 'Co', name: 'Cobalt', atomicMass: '59', period: 4, group: 9, category: 'transition' },
  { atomicNumber: 28, symbol: 'Ni', name: 'Nickel', atomicMass: '59', period: 4, group: 10, category: 'transition' },
  { atomicNumber: 29, symbol: 'Cu', name: 'Copper', atomicMass: '64', period: 4, group: 11, category: 'transition' },
  { atomicNumber: 30, symbol: 'Zn', name: 'Zinc', atomicMass: '65', period: 4, group: 12, category: 'transition' },
  { atomicNumber: 31, symbol: 'Ga', name: 'Gallium', atomicMass: '70', period: 4, group: 13, category: 'post-transition' },
  { atomicNumber: 32, symbol: 'Ge', name: 'Germanium', atomicMass: '73', period: 4, group: 14, category: 'metalloid' },
  { atomicNumber: 33, symbol: 'As', name: 'Arsenic', atomicMass: '75', period: 4, group: 15, category: 'metalloid' },
  { atomicNumber: 34, symbol: 'Se', name: 'Selenium', atomicMass: '79', period: 4, group: 16, category: 'nonmetal' },
  { atomicNumber: 35, symbol: 'Br', name: 'Bromine', atomicMass: '80', period: 4, group: 17, category: 'halogen' },
  { atomicNumber: 36, symbol: 'Kr', name: 'Krypton', atomicMass: '84', period: 4, group: 18, category: 'noble-gas' },
  { atomicNumber: 37, symbol: 'Rb', name: 'Rubidium', atomicMass: '85.5', period: 5, group: 1, category: 'alkali' },
  { atomicNumber: 38, symbol: 'Sr', name: 'Strontium', atomicMass: '88', period: 5, group: 2, category: 'alkaline-earth' },
  { atomicNumber: 39, symbol: 'Y', name: 'Yttrium', atomicMass: '89', period: 5, group: 3, category: 'transition' },
  { atomicNumber: 40, symbol: 'Zr', name: 'Zirconium', atomicMass: '91', period: 5, group: 4, category: 'transition' },
  { atomicNumber: 41, symbol: 'Nb', name: 'Niobium', atomicMass: '93', period: 5, group: 5, category: 'transition' },
  { atomicNumber: 42, symbol: 'Mo', name: 'Molybdenum', atomicMass: '96', period: 5, group: 6, category: 'transition' },
  { atomicNumber: 43, symbol: 'Tc', name: 'Technetium', atomicMass: '98', period: 5, group: 7, category: 'transition' },
  { atomicNumber: 44, symbol: 'Ru', name: 'Ruthenium', atomicMass: '101', period: 5, group: 8, category: 'transition' },
  { atomicNumber: 45, symbol: 'Rh', name: 'Rhodium', atomicMass: '103', period: 5, group: 9, category: 'transition' },
  { atomicNumber: 46, symbol: 'Pd', name: 'Palladium', atomicMass: '106', period: 5, group: 10, category: 'transition' },
  { atomicNumber: 47, symbol: 'Ag', name: 'Silver', atomicMass: '108', period: 5, group: 11, category: 'transition' },
  { atomicNumber: 48, symbol: 'Cd', name: 'Cadmium', atomicMass: '112', period: 5, group: 12, category: 'transition' },
  { atomicNumber: 49, symbol: 'In', name: 'Indium', atomicMass: '115', period: 5, group: 13, category: 'post-transition' },
  { atomicNumber: 50, symbol: 'Sn', name: 'Tin', atomicMass: '119', period: 5, group: 14, category: 'post-transition' },
  { atomicNumber: 51, symbol: 'Sb', name: 'Antimony', atomicMass: '122', period: 5, group: 15, category: 'metalloid' },
  { atomicNumber: 52, symbol: 'Te', name: 'Tellurium', atomicMass: '128', period: 5, group: 16, category: 'metalloid' },
  { atomicNumber: 53, symbol: 'I', name: 'Iodine', atomicMass: '127', period: 5, group: 17, category: 'halogen' },
  { atomicNumber: 54, symbol: 'Xe', name: 'Xenon', atomicMass: '131', period: 5, group: 18, category: 'noble-gas' },
  { atomicNumber: 55, symbol: 'Cs', name: 'Caesium', atomicMass: '133', period: 6, group: 1, category: 'alkali' },
  { atomicNumber: 56, symbol: 'Ba', name: 'Barium', atomicMass: '137', period: 6, group: 2, category: 'alkaline-earth' },
  { atomicNumber: 57, symbol: 'La', name: 'Lanthanum', atomicMass: '139', period: 6, group: 3, category: 'lanthanide' },
  { atomicNumber: 72, symbol: 'Hf', name: 'Hafnium', atomicMass: '178.5', period: 6, group: 4, category: 'transition' },
  { atomicNumber: 73, symbol: 'Ta', name: 'Tantalum', atomicMass: '181', period: 6, group: 5, category: 'transition' },
  { atomicNumber: 74, symbol: 'W', name: 'Tungsten', atomicMass: '184', period: 6, group: 6, category: 'transition' },
  { atomicNumber: 75, symbol: 'Re', name: 'Rhenium', atomicMass: '186', period: 6, group: 7, category: 'transition' },
  { atomicNumber: 76, symbol: 'Os', name: 'Osmium', atomicMass: '190', period: 6, group: 8, category: 'transition' },
  { atomicNumber: 77, symbol: 'Ir', name: 'Iridium', atomicMass: '192', period: 6, group: 9, category: 'transition' },
  { atomicNumber: 78, symbol: 'Pt', name: 'Platinum', atomicMass: '195', period: 6, group: 10, category: 'transition' },
  { atomicNumber: 79, symbol: 'Au', name: 'Gold', atomicMass: '197', period: 6, group: 11, category: 'transition' },
  { atomicNumber: 80, symbol: 'Hg', name: 'Mercury', atomicMass: '201', period: 6, group: 12, category: 'transition' },
  { atomicNumber: 81, symbol: 'Tl', name: 'Thallium', atomicMass: '204', period: 6, group: 13, category: 'post-transition' },
  { atomicNumber: 82, symbol: 'Pb', name: 'Lead', atomicMass: '207', period: 6, group: 14, category: 'post-transition' },
  { atomicNumber: 83, symbol: 'Bi', name: 'Bismuth', atomicMass: '209', period: 6, group: 15, category: 'post-transition' },
  { atomicNumber: 84, symbol: 'Po', name: 'Polonium', atomicMass: '209', period: 6, group: 16, category: 'metalloid' },
  { atomicNumber: 85, symbol: 'At', name: 'Astatine', atomicMass: '210', period: 6, group: 17, category: 'halogen' },
  { atomicNumber: 86, symbol: 'Rn', name: 'Radon', atomicMass: '222', period: 6, group: 18, category: 'noble-gas' },
  { atomicNumber: 87, symbol: 'Fr', name: 'Francium', atomicMass: '223', period: 7, group: 1, category: 'alkali' },
  { atomicNumber: 88, symbol: 'Ra', name: 'Radium', atomicMass: '226', period: 7, group: 2, category: 'alkaline-earth' },
  { atomicNumber: 89, symbol: 'Ac', name: 'Actinium', atomicMass: '227', period: 7, group: 3, category: 'actinide' },
  { atomicNumber: 92, symbol: 'U', name: 'Uranium', atomicMass: '238', period: 7, group: 3, category: 'actinide' },
];

export const CHEMISTRY_CONSTANTS: PhysicalConstant[] = [
  { name: 'Avogadro constant', symbol: 'L or N_A', symbolLatex: 'N_A', value: '6.02 × 10²³', unit: 'mol⁻¹', notes: 'Number of particles in one mole' },
  { name: 'Molar gas volume at r.t.p.', symbol: 'V_m', symbolLatex: 'V_m', value: '24.0', unit: 'dm³/mol', notes: 'At room temperature and pressure (20 °C, 1 atm)' },
];

export const CHEMISTRY_KEY_EQUATIONS: EquationItem[] = [
  { id: 'ch-moles-mass', topic: 'Stoichiometry', unit: 'Topic 3', title: 'Moles from mass', formula: 'n = m / M_r', latex: String.raw`n = \frac{m}{M_r}` },
  { id: 'ch-moles-conc', topic: 'Stoichiometry', unit: 'Topic 3', title: 'Moles from concentration', formula: 'n = C × V', latex: String.raw`n = C \times V \quad (V\text{ in dm}^3)` },
  { id: 'ch-moles-gas', topic: 'Stoichiometry', unit: 'Topic 3', title: 'Gas volume at r.t.p.', formula: 'V = n × 24', latex: String.raw`V = n \times 24\text{ dm}^3` },
  { id: 'ch-perc-yield', topic: 'Stoichiometry', unit: 'Topic 3', title: 'Percentage yield', formula: '(actual / theoretical) × 100%', latex: String.raw`\text{\% yield} = \frac{\text{actual mass}}{\text{theoretical mass}} \times 100\%` },
  { id: 'ch-perc-purity', topic: 'Stoichiometry', unit: 'Topic 3', title: 'Percentage purity', formula: '(pure / total) × 100%', latex: String.raw`\text{\% purity} = \frac{\text{mass of pure chemical}}{\text{total mass of sample}} \times 100\%` },
];

export const CHEMISTRY_INDICATORS = [
  { name: 'Thymolphthalein', pKin: '9.9', acidColour: 'Colorless', phRange: '9.3 – 10.5', alkalineColour: 'Blue' },
  { name: 'Methyl orange', pKin: '3.7', acidColour: 'Red', phRange: '3.1 – 4.4', alkalineColour: 'Yellow' },
  { name: 'Litmus', pKin: '6.5', acidColour: 'Red', phRange: '5.0 – 8.0', alkalineColour: 'Blue' },
  { name: 'Universal indicator', pKin: 'varies', acidColour: 'Red / Orange (pH 1-6)', phRange: '1.0 – 14.0', alkalineColour: 'Blue / Violet (pH 8-14)' },
];

export const IR_SPECTROSCOPY_DATA = [];
export const PROTON_NMR_SHIFTS = [];
export const CARBON_NMR_SHIFTS = [];
export const ELECTRODE_POTENTIALS = [];

// =============================================================================
// 4. CAMBRIDGE IGCSE BIOLOGY (0610) — FORMULAE & BIOCHEMICAL TESTS
// =============================================================================
export const BIOLOGY_FOOD_TESTS: FoodTestItem[] = [
  {
    nutrient: 'Starch',
    reagent: 'Iodine solution',
    method: 'Add drops of yellow-brown iodine solution directly to sample',
    initialColor: 'Yellow-brown / Orange',
    positiveColor: 'Blue-black',
  },
  {
    nutrient: 'Reducing Sugars (Glucose, Maltose)',
    reagent: "Benedict's reagent",
    method: "Add equal volume of blue Benedict's solution; heat in hot water bath (> 80 °C) for 3–5 min",
    initialColor: 'Clear Blue',
    positiveColor: 'Green → Yellow → Orange → Brick-red precipitate',
  },
  {
    nutrient: 'Proteins',
    reagent: 'Biuret reagent',
    method: 'Add dilute potassium/sodium hydroxide, then dilute copper(II) sulfate (or Biuret solution)',
    initialColor: 'Light Blue',
    positiveColor: 'Violet / Purple',
  },
  {
    nutrient: 'Fats & Oils (Lipids)',
    reagent: 'Ethanol emulsion test',
    method: 'Dissolve sample in ethanol; shake thoroughly, then decant clear liquid into cold water',
    initialColor: 'Colorless',
    positiveColor: 'Milky-white emulsion',
  },
  {
    nutrient: 'Vitamin C (Ascorbic acid)',
    reagent: 'DCPIP solution',
    method: 'Add test solution drop by drop to a measured volume of dark blue DCPIP solution',
    initialColor: 'Dark Blue',
    positiveColor: 'Decolorizes (turns Colorless)',
  },
];

export const BIOLOGY_MAGNIFICATION_FORMULAE: MathFormulaItem[] = [
  {
    id: 'bio-mag-m',
    section: 'Cell Measurement',
    category: 'Magnification',
    title: 'Magnification Formula',
    latex: String.raw`M = \frac{I}{A}`,
    description: 'M = magnification, I = image size (measured with ruler), A = actual specimen size',
    inBooklet: true,
    unit: 'Topic 2: Cells',
  },
  {
    id: 'bio-mag-a',
    section: 'Cell Measurement',
    category: 'Actual Size',
    title: 'Actual Size Formula',
    latex: String.raw`A = \frac{I}{M}`,
    description: 'Actual size = Image size / Magnification. Convert mm to μm by multiplying by 1000',
    inBooklet: true,
    unit: 'Topic 2: Cells',
  },
  {
    id: 'bio-mag-i',
    section: 'Cell Measurement',
    category: 'Image Size',
    title: 'Image Size Formula',
    latex: String.raw`I = M \times A`,
    description: 'Image size = Magnification × Actual size',
    inBooklet: true,
    unit: 'Topic 2: Cells',
  },
  {
    id: 'bio-unit-conv',
    section: 'Units & Conversion',
    category: 'Scale Conversions',
    title: 'Metric Micrometre Conversion',
    latex: String.raw`1\text{ cm} = 10\text{ mm} = 10\,000\text{ }\mu\text{m},\quad 1\text{ mm} = 1\,000\text{ }\mu\text{m}`,
    description: 'Always measure image size in millimetres (mm) then multiply by 1000 to get micrometres (μm)',
    inBooklet: true,
    unit: 'Topic 2: Cells',
  },
];

// Helper functions for math / normal distribution table compatibility
export const NORMAL_TABLE_5COL = [];
export const NORMAL_PERCENTAGE_POINTS = [];
export function calculatePhi(z: number): number {
  if (isNaN(z)) return NaN;
  if (z < 0) return Math.round((1 - calculatePhi(-z)) * 10000) / 10000;
  if (z >= 3.9) return 1.0;
  const t = 1.0 / (1.0 + 0.2316419 * z);
  const d = 0.3989422804014327 * Math.exp((-z * z) / 2);
  const prob = 1.0 - d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return Math.round(prob * 10000) / 10000;
}
