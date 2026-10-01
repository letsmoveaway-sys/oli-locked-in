// Concise, original revision notes aligned to the configured specifications.
// They are editorially checked foundations, not a substitute for subject-teacher QA.
export const DETAILED_TOPIC_NOTES: Record<string, string[]> = {
  // AQA Mathematics 8300 Higher
  'maths-number-structure': [
    'Place value determines the value of each digit; moving one place left multiplies by 10 and moving right divides by 10.',
    'On a number line, values increase to the right. A negative number with a greater magnitude is smaller, so −8 < −3.',
    'To compare fractions, use a common denominator or convert accurately to decimals; recurring decimals must not be rounded too early.',
    'Inequality signs point towards the smaller value. Equality means two expressions have exactly the same value.',
  ],
  'maths-number-calculation': [
    'Apply brackets, indices, multiplication and division, then addition and subtraction; operations at the same level are completed left to right.',
    'Subtraction is addition of the negative, while division by a number is multiplication by its reciprocal.',
    'Inverse operations check one another: addition/subtraction, multiplication/division, squaring/square root.',
    'Estimate first using rounded values, then compare the estimate with the calculated answer to detect entry or place-value errors.',
  ],
  'maths-number-fdp': [
    'A fraction represents division. Equivalent fractions multiply or divide numerator and denominator by the same non-zero value.',
    'For addition or subtraction, use a common denominator; for division, multiply by the reciprocal of the second fraction.',
    'Percentage means per hundred. Convert a percentage to a decimal by dividing by 100 and use decimal multipliers for changes.',
    'Convert a recurring decimal algebraically by shifting the repeating digits and subtracting the original value.',
  ],
  'maths-number-powers': [
    'A prime has exactly two positive factors. A prime-factor product supports reliable HCF and LCM calculations.',
    'When multiplying equal bases add indices; when dividing subtract indices; when raising a power to a power multiply indices.',
    'A negative index means reciprocal and a fractional index combines a root with a power.',
    'The HCF uses the lowest shared prime powers; the LCM uses every prime at its highest required power.',
  ],
  'maths-number-standard-surds': [
    'Standard form is a × 10ⁿ where 1 ≤ a < 10 and n is an integer.',
    'Multiply standard-form values by multiplying the numbers and adding powers; divide by dividing and subtracting powers.',
    'A surd is an exact irrational root. Simplify by extracting square factors, for example √72 = 6√2.',
    'Rationalise a denominator by multiplying numerator and denominator by a suitable surd or conjugate.',
  ],
  'maths-number-accuracy': [
    'Decimal-place rounding depends on position; significant figures begin at the first non-zero digit.',
    'A value rounded to the nearest unit u lies from the stated value minus u/2 up to, but not including, the value plus u/2.',
    'For a maximum positive product or quotient, choose bounds deliberately rather than automatically using all upper bounds.',
    'Bounds answers should distinguish the error interval from the requested upper or lower bound of a calculation.',
  ],
  'maths-algebra-manipulation': [
    'Only like terms combine. Expanding multiplies every term, while factorising reverses expansion by exposing common factors or products.',
    'An identity is true for every permitted value; an equation is true only for its solution values.',
    'Algebraic fractions simplify only through common factors of the complete numerator and denominator, not by cancelling separate terms.',
    'Algebraic proof starts from known forms, such as consecutive integers n and n + 1, and ends in the required general form.',
  ],
  'maths-algebra-equations': [
    'Maintain equality by performing the same valid operation on both sides and show each rearrangement clearly.',
    'Quadratics may be solved by factorising, completing the square, the quadratic formula or a graph; select a method that fits the expression.',
    'When rearranging a formula, treat the target symbol as the unknown and undo operations in a controlled order.',
    'Iteration uses a stated recurrence and starting value; repeat with full calculator accuracy and report the requested rounded solution.',
  ],
  'maths-algebra-simultaneous': [
    'A simultaneous solution satisfies both equations and represents an intersection of their graphs.',
    'For two linear equations, eliminate one variable by matching coefficients or substitute one expression into the other.',
    'A linear–quadratic pair can produce zero, one or two intersections; substitution normally leads to a quadratic equation.',
    'Substitute every candidate solution back to find its paired coordinate and reject values that fail either original equation.',
  ],
  'maths-algebra-inequalities': [
    'Solve a linear inequality like an equation, but reverse the inequality when multiplying or dividing by a negative value.',
    'Use open circles for excluded endpoints and filled circles for included endpoints on a number line.',
    'For a quadratic inequality, find the roots and use the graph or sign of each interval to identify the solution set.',
    'Keep compound conditions together and distinguish “and” intersections from “or” unions.',
  ],
  'maths-algebra-sequences': [
    'An arithmetic sequence has a constant first difference and nth term dn + c.',
    'A quadratic sequence has a constant second difference; half that difference gives the coefficient of n².',
    'A geometric sequence multiplies by a constant ratio, so its nth term contains a power of that ratio.',
    'Check an nth term by substituting n = 1, 2 and 3 and comparing with the original sequence.',
  ],
  'maths-algebra-graphs': [
    'For y = mx + c, m is the gradient and c is the y-intercept; parallel lines share a gradient and perpendicular gradients multiply to −1.',
    'Roots are x-axis intersections, the y-intercept occurs at x = 0, and simultaneous solutions are graph intersections.',
    'A distance–time gradient represents speed; a velocity–time gradient represents acceleration and its signed area represents displacement.',
    'Recognise the characteristic shapes and symmetries of quadratic, cubic, reciprocal, exponential and trigonometric graphs.',
  ],
  'maths-algebra-functions': [
    'Function notation f(x) describes an input–output rule; f(3) means substitute 3 for every x.',
    'A composite function fg(x) means apply g first and then f; order usually changes the result.',
    'An inverse function reverses the original mapping and can be found by writing y = f(x), rearranging for x and swapping labels.',
    'For graph transformations, changes outside f(x) affect y-values while changes inside the bracket affect x-values in the opposite direction.',
  ],
  'maths-ratio-proportion': [
    'Simplify a ratio by dividing every part by a common factor and keep quantities in the same units.',
    'To share an amount, add the ratio parts, find one part, then multiply by each share.',
    'A scale factor multiplies corresponding lengths; maps and recipes require consistent direction and units.',
    'A part-to-part ratio can be converted to a fraction of the whole only after finding the total number of parts.',
  ],
  'maths-ratio-direct-inverse': [
    'Direct proportion has y = kx or y = kxⁿ, so the ratio y/xⁿ is constant.',
    'Inverse proportion has y = k/x or y = k/xⁿ, so the product yxⁿ is constant.',
    'Find k from one complete pair of values before using the model to calculate another value.',
    'Direct-proportion graphs through the origin are straight only for y = kx; other powers produce different shapes.',
  ],
  'maths-ratio-percentages': [
    'Percentage change is change ÷ original × 100, so the denominator is always the starting value.',
    'An increase of r% uses multiplier 1 + r/100; a decrease uses 1 − r/100.',
    'Reverse percentages divide by the final multiplier instead of reversing the percentage arithmetically.',
    'Repeated growth or decay applies the multiplier once per period and therefore produces a compound change.',
  ],
  'maths-ratio-rates': [
    'A compound measure combines quantities, such as speed = distance/time, density = mass/volume and pressure = force/area.',
    'Rearrange the defining equation before substitution and convert all values into compatible units.',
    'A gradient is change in vertical quantity divided by change in horizontal quantity and often represents a rate.',
    'Unit pricing compares equivalent quantities; state the resulting unit so the comparison remains meaningful.',
  ],
  'maths-geometry-angles': [
    'Angles on a line total 180°, around a point total 360°, and vertically opposite angles are equal.',
    'With parallel lines, corresponding and alternate angles are equal while co-interior angles total 180°.',
    'The interior-angle sum of an n-sided polygon is (n − 2) × 180° and exterior angles total 360°.',
    'Geometrical reasoning requires the exact angle fact beside each conclusion; never assume a diagram is drawn to scale.',
  ],
  'maths-geometry-constructions': [
    'Perpendicular bisectors and angle bisectors are produced with equal-radius compass arcs, preserving equal distances.',
    'A locus is the complete set of points satisfying a condition; shade the intersection when several conditions apply.',
    'Bearings are measured clockwise from north and written with three digits.',
    'Scale drawings, plans and elevations must preserve the stated scale and the correct viewing direction.',
  ],
  'maths-geometry-measures': [
    'Write the relevant perimeter, area, surface-area or volume formula before substituting and keep units consistent.',
    'An arc or sector is the angle fraction θ/360 of the full circumference or circle area.',
    'For a prism, volume equals cross-sectional area × length; surface area requires every exposed face.',
    'Split compound shapes into known parts, calculate them separately and add or subtract without double counting.',
  ],
  'maths-geometry-transformations': [
    'A reflection needs a mirror line, a rotation needs centre, angle and direction, and an enlargement needs centre and scale factor.',
    'A translation is described by a column vector showing horizontal movement above vertical movement.',
    'A negative enlargement places the image on the opposite side of the centre; a fractional factor reduces it.',
    'In vector proof, express routes using consistent vectors and simplify to show parallelism, ratios or collinearity.',
  ],
  'maths-geometry-similarity': [
    'Congruent shapes match exactly; similarity preserves angles while corresponding lengths share a constant scale factor.',
    'Area scale factor is the square of the length factor and volume scale factor is its cube.',
    'Use the same direction for every corresponding ratio and identify whether the calculation moves from smaller to larger or back.',
    'Triangle congruence can be established by SSS, SAS, ASA or RHS, but not by matching three angles alone.',
  ],
  'maths-geometry-trig': [
    'Pythagoras links the three sides of a right triangle; SOHCAHTOA links an angle with selected side ratios.',
    'For non-right triangles use the sine rule, cosine rule or ½ab sin C after identifying the known sides and angles.',
    'Exact values for common angles should remain exact unless a decimal is requested.',
    'In 3D, draw and solve one right triangle at a time and check the calculator is in degree mode.',
  ],
  'maths-geometry-circles': [
    'A radius is perpendicular to a tangent at the point of contact, enabling right-triangle reasoning.',
    'Angles at the circumference standing on the same chord are equal; the angle at the centre is twice the circumference angle.',
    'An angle in a semicircle is 90° and opposite angles in a cyclic quadrilateral total 180°.',
    'For x² + y² = r² the centre is the origin; tangent-gradient questions also use perpendicular gradients.',
  ],
  'maths-probability-basics': [
    'Probability lies from 0 to 1 and exhaustive mutually exclusive outcomes sum to 1.',
    'Experimental probability is relative frequency; larger trials usually give a more stable estimate of theoretical probability.',
    'Expected frequency equals number of trials × probability, but it is a long-run prediction rather than a guarantee.',
    'Use the complement P(not A) = 1 − P(A) when it is simpler than listing every unwanted outcome.',
  ],
  'maths-probability-combined': [
    'Multiply along successive branches and add probabilities of separate routes leading to the required event.',
    'Without replacement, both the total and relevant category count change after the first selection.',
    'Venn diagrams separate intersections, unions and complements; enter the overlap before the single-set regions.',
    'Conditional probability restricts the sample space to cases where the stated condition is already known to be true.',
  ],
  'maths-statistics-sampling': [
    'A population is the complete group of interest; a sample is the smaller group actually measured.',
    'Random sampling reduces selection bias, while stratified sampling represents known subgroups in population proportions.',
    'Convenience or opportunity samples may overrepresent easy-to-reach people and cannot automatically be generalised.',
    'A larger sample improves reliability but does not remove bias from a poor sampling frame or question design.',
  ],
  'maths-statistics-represent': [
    'Choose a display that fits the data: bar charts for categories, histograms for continuous grouped data and scatter graphs for paired variables.',
    'Histogram height is frequency density = frequency/class width, so bar area represents frequency.',
    'Cumulative-frequency graphs estimate median and quartiles; box plots display these values for comparison.',
    'Correlation describes association, not causation, and extrapolation beyond the observed range is unreliable.',
  ],
  'maths-statistics-interpret': [
    'Mean uses every value, median is the ordered middle, mode is most frequent and range measures total spread.',
    'Interquartile range measures the spread of the middle 50% and is less affected by extreme values than the range.',
    'Compare distributions using both a measure of location and a measure of spread, in context.',
    'An outlier may be genuine or erroneous; investigate it before deciding whether exclusion is justified.',
  ],

  // AQA English Language 8700
  'english-language-p1-q1': [
    'The task assesses retrieval of explicit information from the specified lines, not inference or language analysis.',
    'Give four separate details; one quotation can contain more than one detail only when each is clearly distinct.',
    'Use only the named part of the source and avoid repeating the same idea in different words.',
  ],
  'english-language-p1-language': [
    'Select short words or phrases with rich connotations and connect them directly to the question focus.',
    'Analyse vocabulary, imagery, sentence forms or language patterns by explaining how they shape meaning and response.',
    'Technique labels do not earn analysis by themselves; develop a precise inference and support it from the wording.',
  ],
  'english-language-p1-structure': [
    'Structure concerns how the whole text is organised: opening focus, shifts, contrasts, sequence, pace and ending.',
    'Track what the reader knows or notices at different points and explain why the writer changes focus then.',
    'Use references from across the source rather than treating structure as sentence-level language analysis.',
  ],
  'english-language-p1-evaluation': [
    'Form a clear judgement about the statement and test it against precise evidence from the specified section.',
    'Evaluate how successfully the writer creates the claimed impression through language and structure.',
    'A developed response may qualify the statement, offering an alternative reading while remaining evidence-led.',
  ],
  'english-language-paper1-writing': [
    'Shape a deliberate viewpoint or narrative arc instead of listing disconnected description.',
    'Control paragraphing, sentence length, imagery and recurring details to create pace and cohesion.',
    'Technical accuracy is separately rewarded: leave time to check sentences, agreement, spelling and punctuation.',
  ],
  'english-language-p2-q1': [
    'Select exactly four statements supported by the specified lines of the correct source.',
    'Check every option against the text rather than relying on memory or what seems plausible.',
    'This is explicit retrieval: do not infer an unstated motive or effect.',
  ],
  'english-language-p2-summary': [
    'Synthesis combines both sources around clear similarities or differences rather than summarising each separately.',
    'Infer what the selected details suggest, then link the paired evidence to the question focus.',
    'Keep quotations short and spend more time explaining the comparison than copying the sources.',
  ],
  'english-language-p2-language': [
    'Analyse how one non-fiction writer presents a viewpoint or experience through vocabulary, imagery, tone and sentence choices.',
    'Connect each method to the writer\'s attitude and intended effect in this particular context.',
    'Avoid discussing the second source here; comparison belongs to the later comparison task.',
  ],
  'english-language-p2-comparison': [
    'Compare both what the writers think and how they communicate those perspectives.',
    'Organise by a point of comparison so both sources appear within each developed section.',
    'Use methods and evidence from both sources, explaining meaningful similarities and differences rather than spotting them.',
  ],
  'english-language-paper2-writing': [
    'Match the required form, audience and purpose while sustaining a clear viewpoint throughout.',
    'Sequence arguments deliberately, using examples, counterarguments, rhetorical choices and a purposeful conclusion.',
    'Keep persuasive methods controlled and credible; accuracy and paragraph-level cohesion remain essential.',
  ],
  'english-language-spoken': [
    'A presentation needs a clear purpose, logical structure and evidence appropriate to its audience.',
    'Delivery includes pace, volume, emphasis, eye contact and Standard English suited to the context.',
    'Responses to questions should listen to the challenge, answer directly and extend or clarify the original idea.',
  ],

  // AQA Combined Science: Trilogy 8464 Higher
  'science-b-cell': [
    'Eukaryotic cells contain a nucleus and membrane-bound structures; prokaryotic cells are smaller and have circular DNA free in the cytoplasm.',
    'Magnification = image size/real size. Convert both measurements to the same unit before dividing.',
    'Mitosis produces genetically identical cells for growth and repair, while differentiation creates specialised structures and functions.',
    'Diffusion moves particles down a concentration gradient, osmosis moves water through a partially permeable membrane, and active transport moves substances against a gradient using energy.',
  ],
  'science-b-organisation': [
    'Cells form tissues, tissues form organs and organs work together in organ systems.',
    'Digestive enzymes break large insoluble molecules into smaller soluble molecules; temperature and pH affect enzyme shape and activity.',
    'The heart supplies a double circulatory system; arteries, veins and capillaries have structures adapted to pressure and exchange.',
    'Xylem carries water and mineral ions upward, while phloem translocates dissolved sugars between sources and sinks.',
  ],
  'science-b-infection': [
    'Pathogens include bacteria, viruses, fungi and protists; transmission can occur through air, water, contact or vectors.',
    'Skin, mucus, cilia and stomach acid form non-specific defences, while white blood cells phagocytose pathogens and produce antibodies and antitoxins.',
    'Vaccination exposes antigens safely so memory cells produce a faster secondary response.',
    'Antibiotics treat susceptible bacteria, not viruses; resistant variants survive selection and reproduce.',
  ],
  'science-b-bioenergetics': [
    'Photosynthesis transfers light energy into glucose: carbon dioxide + water → glucose + oxygen.',
    'Light intensity, carbon dioxide and temperature can limit photosynthesis; once one stops limiting, another controls the rate.',
    'Aerobic respiration releases energy using oxygen, while anaerobic respiration releases less energy and produces lactic acid in animals.',
    'Metabolism includes all cellular reactions, including building larger molecules and breaking down glucose.',
  ],
  'science-b-homeostasis': [
    'Homeostasis keeps internal conditions within limits using receptors, coordination centres and effectors in negative-feedback loops.',
    'The nervous system uses electrical impulses for rapid responses; hormones travel in blood and usually act more slowly for longer.',
    'Insulin lowers blood glucose and glucagon raises it; the kidneys control water and ion balance and remove urea.',
    'Reproductive hormones coordinate the menstrual cycle, and fertility treatments alter these hormone signals.',
  ],
  'science-b-inheritance': [
    'DNA is arranged into genes on chromosomes; alleles are different versions of a gene.',
    'Meiosis produces genetically varied gametes with half the chromosome number, while fertilisation restores paired chromosomes.',
    'Variation may be genetic, environmental or both; natural selection increases advantageous inherited traits over generations.',
    'Selective breeding is human-directed, while genetic engineering directly changes DNA; both require evaluation of benefits and risks.',
  ],
  'science-b-ecology': [
    'A community contains interacting populations; distribution and abundance depend on biotic and abiotic factors.',
    'Energy and biomass decrease between trophic levels because not all material is eaten or assimilated and energy is lost in life processes.',
    'Carbon and water cycle through organisms and the environment; microorganisms decompose material faster in warm, moist, aerobic conditions.',
    'Biodiversity supports stable ecosystems, but land use, pollution and climate change can reduce it.',
  ],
  'science-c-atomic': [
    'Atoms contain protons and neutrons in a nucleus with electrons in shells; atomic number counts protons and mass number counts protons plus neutrons.',
    'Elements contain one type of atom, compounds are chemically bonded elements, and mixtures can be separated physically.',
    'Group number links to outer electrons: Group 1 loses one electron, Group 7 gains one and Group 0 has stable outer shells.',
    'Historical atomic models changed when new evidence, including scattering results, contradicted earlier explanations.',
  ],
  'science-c-bonding': [
    'Ionic bonding is electrostatic attraction between oppositely charged ions after electron transfer.',
    'Covalent bonding shares electron pairs; metallic bonding attracts positive ions to delocalised electrons.',
    'Structure determines properties: small molecules have weak intermolecular forces, while giant lattices require many strong bonds to be overcome.',
    'Electrical conduction requires mobile charged particles, such as ions in a melt or solution or delocalised electrons.',
  ],
  'science-c-quantitative': [
    'Relative formula mass is the sum of relative atomic masses; moles = mass/Mr links measurable mass to particle amount.',
    'A balanced equation gives mole ratios, which must be used before converting between moles and mass or gas volume.',
    'Concentration can be expressed as mass/volume or moles/volume; check whether volume must be converted to dm³.',
    'Percentage yield measures actual against theoretical product, while atom economy measures how much reactant becomes the desired product.',
  ],
  'science-c-changes': [
    'The reactivity series predicts displacement, extraction method and reactions with water or acids.',
    'Oxidation is loss of electrons and reduction is gain; these processes occur together in redox reactions.',
    'Acids form salts through predictable reactions, and pH measures hydrogen-ion concentration on a logarithmic scale.',
    'In electrolysis, positive ions are reduced at the cathode and negative ions are oxidised at the anode; aqueous products depend on competing ions.',
  ],
  'science-c-energy': [
    'Exothermic reactions transfer energy to the surroundings, while endothermic reactions take energy from them.',
    'Activation energy is the minimum energy for reaction and appears as the barrier on a reaction profile.',
    'Bond breaking requires energy and bond making releases it; ΔH = energy to break bonds − energy released making bonds.',
    'Chemical cells produce potential difference through redox reactions; fuel cells need continuous reactant supplies.',
  ],
  'science-c-rates': [
    'Reaction rate measures reactant used or product formed per unit time and can be found from a graph gradient.',
    'Successful collisions require sufficient energy and suitable orientation; temperature increases both collision frequency and the energetic fraction.',
    'Concentration, pressure and surface area mainly change collision frequency; a catalyst provides a lower-activation-energy pathway.',
    'At dynamic equilibrium, forward and reverse rates are equal; changing conditions shifts equilibrium to oppose the change.',
  ],
  'science-c-organic': [
    'Crude oil is a mixture of hydrocarbons separated by fractional distillation because fractions have different boiling ranges.',
    'Alkanes are saturated; shorter chains are generally more volatile, less viscous and more flammable.',
    'Cracking converts long hydrocarbons into shorter alkanes and reactive alkenes using heat and a catalyst.',
    'Alkenes contain a carbon–carbon double bond and can undergo addition polymerisation.',
  ],
  'science-c-analysis': [
    'A pure substance has a sharp melting or boiling point; a formulation is a designed mixture with useful proportions.',
    'Chromatography separates soluble substances; Rf = distance moved by substance/distance moved by solvent front.',
    'Gas tests identify hydrogen, oxygen, carbon dioxide and chlorine using characteristic observations.',
    'Flame colours and precipitation tests identify selected metal ions, halides and sulfate or carbonate ions.',
  ],
  'science-c-atmosphere': [
    'Earth\'s early atmosphere changed as the planet cooled, oceans formed and photosynthesis removed carbon dioxide and released oxygen.',
    'Greenhouse gases absorb and re-emit outgoing infrared radiation, increasing energy retained in the atmosphere.',
    'Climate evidence and models carry uncertainty, but multiple independent records support recent warming.',
    'Carbon monoxide, sulfur dioxide, nitrogen oxides and particulates have different sources and health or environmental effects.',
  ],
  'science-c-resources': [
    'Sustainable development meets present needs without preventing future generations from meeting theirs.',
    'Potable water must be safe to drink but need not be chemically pure; treatment depends on the starting water source.',
    'Life-cycle assessment compares extraction, manufacture, use and disposal, but conclusions depend on data and weighting choices.',
    'The Haber process balances yield, rate and cost; fertilisers supply mineral ions needed for plant growth.',
  ],
  'science-p-energy': [
    'Energy is stored in kinetic, thermal, chemical, gravitational, elastic, magnetic, electrostatic and nuclear stores and transferred between them.',
    'Work done and energy transferred are measured in joules; power is energy transferred per second.',
    'Efficiency = useful output/total input and may be expressed as a decimal or percentage.',
    'National energy choices balance reliability, start-up time, environmental effects, fuel availability and cost.',
  ],
  'science-p-electricity': [
    'Current is charge flow, potential difference is energy transferred per coulomb and resistance opposes current.',
    'Series circuits share current and divide potential difference; parallel branches share potential difference and divide current.',
    'Power = VI and energy = Pt; domestic energy is often billed in kilowatt-hours.',
    'The National Grid uses high potential difference to reduce current and therefore reduce heating losses in transmission cables.',
  ],
  'science-p-particles': [
    'Density = mass/volume; displacement measures the volume of an irregular solid.',
    'Heating changes internal energy by increasing particle kinetic energy or potential energy during a change of state.',
    'Specific heat capacity is energy needed per kilogram per degree; specific latent heat changes state without changing temperature.',
    'For a fixed gas volume, higher temperature means faster particles and more frequent, forceful wall collisions, increasing pressure.',
  ],
  'science-p-atomic': [
    'Isotopes have equal proton numbers but different neutron numbers; unstable nuclei decay randomly.',
    'Alpha is strongly ionising and weakly penetrating, beta is intermediate, and gamma is weakly ionising but penetrating.',
    'Half-life is the time for activity or undecayed nuclei to halve and is not the lifetime of an individual atom.',
    'Irradiation exposes an object to radiation; contamination places radioactive material on or inside it.',
  ],
  'science-p-forces': [
    'A vector has magnitude and direction; a resultant force changes motion according to F = ma.',
    'Weight = mg, work = force × distance along the force, and spring force follows F = ke within the elastic limit.',
    'Graph gradients and areas carry meaning: distance–time gradient is speed and velocity–time area is displacement.',
    'Stopping distance combines thinking and braking distances; momentum is conserved in a closed system.',
  ],
  'science-p-waves': [
    'Transverse oscillations are perpendicular to travel while longitudinal oscillations are parallel; both transfer energy without net matter transfer.',
    'Wave speed = frequency × wavelength; frequency stays fixed when a wave crosses a boundary while speed and wavelength may change.',
    'The electromagnetic spectrum has increasing frequency from radio to gamma, with uses and hazards linked to wavelength and energy.',
    'Reflection, refraction, lenses and colour can be explained by ray direction, material interaction and absorption or transmission.',
  ],
  'science-p-magnetism': [
    'Magnetic field lines run from north to south outside a magnet and closer spacing represents a stronger field.',
    'Current creates a magnetic field; coils and iron cores strengthen an electromagnet.',
    'A current-carrying wire in a magnetic field experiences the motor effect, with direction found using Fleming\'s left-hand rule.',
    'Changing magnetic flux induces potential difference; generators, transformers and microphones apply electromagnetic induction.',
  ],

  // AQA English Literature 8702
  'english-lit-macbeth-plot': [
    'The opening establishes disorder and equivocation before Macbeth chooses to turn prophecy into action by murdering Duncan.',
    'Macbeth gains the crown but not security: Banquo\'s murder, the banquet and the second prophecies show fear hardening into tyranny.',
    'Lady Macbeth moves from control to guilt and death, while Macbeth becomes emotionally numb as opposition gathers around Malcolm and Macduff.',
    'The ending restores legitimate kingship, but the tragedy makes Macbeth responsible for choices made under temptation rather than controlled by fate.',
  ],
  'english-lit-macbeth-characters': [
    'Macbeth combines courage, imagination and ambition; his awareness of evil makes his repeated decisions morally significant.',
    'Lady Macbeth initially challenges hesitation and gender expectations, but her sleepwalking later externalises suppressed guilt.',
    'Banquo acts as Macbeth\'s foil by hearing prophecy without murdering for it, while Macduff joins private grief to public resistance.',
    'Duncan and Malcolm represent legitimate kingship; the witches tempt through partial truths and equivocal promises.',
  ],
  'english-lit-macbeth-themes': [
    'Ambition becomes destructive when separated from morality, loyalty and legitimate succession.',
    'Images of blood, sleep and darkness make guilt both psychological and disruptive to the natural order.',
    'The supernatural creates temptation and uncertainty, but Macbeth interprets prophecy in ways that support what he wants to do.',
    'Kingship, violence and gender reflect Jacobean anxieties, yet context should explain the play\'s choices rather than replace textual analysis.',
  ],
  'english-lit-macbeth-methods': [
    'Soliloquies expose private debate, allowing the audience to see Macbeth understand consequences before he acts.',
    'Recurring motifs such as blood, sleep, darkness and unnatural weather connect private crime with wider disorder.',
    'Dramatic irony makes Duncan\'s trust and Macbeth\'s false appearances painfully visible to the audience.',
    'As a tragedy, the play gives Macbeth status and potential, then traces the choices, reversals and recognition that lead to his fall.',
  ],
  'english-lit-carol-plot': [
    'Stave One establishes Scrooge\'s isolation and resistance to generosity before Marley warns him that choices create consequences.',
    'The Ghost of Christmas Past reconnects Scrooge with loneliness, affection and decisions that gradually narrowed his life.',
    'The Present expands his view to the Cratchits and wider society, while the final Ghost turns social neglect into personal mortality.',
    'The fifth stave completes a credible moral transformation through changed relationships and repeated generous action.',
  ],
  'english-lit-carol-characters': [
    'Scrooge is initially emotionally and socially closed, but Dickens leaves signs that sympathy and change remain possible.',
    'Marley represents the self-made punishment of selfishness, while the Ghosts educate through memory, example and fear.',
    'Bob and Tiny Tim humanise poverty without making the Cratchits passive; their warmth contrasts with Scrooge\'s wealth and isolation.',
    'Fred, Fezziwig and Belle model generosity, humane responsibility and relationships Scrooge has rejected.',
  ],
  'english-lit-carol-themes': [
    'Redemption depends on recognising harm and changing behaviour, so the novella offers social criticism alongside hope.',
    'Dickens contrasts material wealth with emotional and communal richness to challenge selfish attitudes to poverty.',
    'Family, memory and education expand sympathy by making distant social problems personal.',
    'Victorian context includes workhouses, industrial poverty and debates about responsibility, but it should be integrated into interpretation.',
  ],
  'english-lit-carol-methods': [
    'The five-stave structure resembles a carol and turns Scrooge\'s education into a sequence of past, present and possible future.',
    'Contrasting settings, temperatures and light make isolation or fellowship visible before Scrooge explains them.',
    'The intrusive narrator mixes humour, judgement and direct address to guide the reader\'s moral response.',
    'Supernatural visitors compress time and make memories, consequences and alternative futures dramatically immediate.',
  ],
  'english-lit-inspector-plot': [
    'The opening celebration presents Birling confidence before the Inspector interrupts and links each character to Eva\'s suffering.',
    'Revelations build through shared responsibility, while Sheila and Eric increasingly accept lessons their parents resist.',
    'The Inspector\'s final warning broadens one death into a moral argument about society.',
    'The final telephone call creates a cyclical ending: whether the first Inspector was official matters less than the family\'s failed response.',
  ],
  'english-lit-inspector-characters': [
    'Inspector Goole controls pace and information, functioning as investigator, moral voice and challenge to complacency.',
    'Arthur and Sybil Birling protect status and individualism; dramatic irony undermines their confidence and authority.',
    'Sheila and Eric change because they recognise responsibility, creating a generational contrast with their parents.',
    'Gerald shows genuine concern but finally joins the desire to erase consequences; Eva remains absent yet structurally connects everyone.',
  ],
  'english-lit-inspector-themes': [
    'Responsibility is collective: separate respectable decisions combine to produce severe harm for someone with less power.',
    'Class and gender determine whose voice is believed, whose labour is valued and who can avoid consequences.',
    'The contrast between 1912 setting and post-war audience exposes capitalist certainty through hindsight and dramatic irony.',
    'Generational change offers hope, while the ending warns that lessons ignored will return.',
  ],
  'english-lit-inspector-methods': [
    'Lighting changes from comfortable to hard when the Inspector arrives, making examination both literal and moral.',
    'Entrances, exits and withheld information let the Inspector control revelations and expose relationships gradually.',
    'Dramatic irony makes Birling\'s confident predictions unreliable before his moral claims are tested.',
    'The single setting, compressed time and cyclical ending create pressure and prevent the family escaping the consequences of its actions.',
  ],
  'english-lit-poem-ozymandias': [
    'A framed account of a ruined statue distances the ruler from his own voice and lets later evidence contradict his boast.',
    'The sculptor preserves the ruler\'s arrogance more successfully than the ruler preserves political power.',
    'Ruins surrounded by an immense landscape make human authority temporary beside time, nature and art.',
  ],
  'english-lit-poem-london': [
    'A regular first-person walk through the city reveals repeated restriction, suffering and institutional control.',
    'Repetition and images of binding suggest oppression is legal, social and internalised rather than confined to one place.',
    'The poem moves across church, monarchy, family and street life to show corruption spreading through interconnected institutions.',
  ],
  'english-lit-poem-prelude': [
    'The speaker begins with confidence and pleasure before the landscape appears to acquire overwhelming scale and agency.',
    'The shift from smooth movement to repeated, dark description changes the episode into a sublime encounter with nature.',
    'The final psychological aftermath shows that natural power alters identity and imagination after the physical danger ends.',
  ],
  'english-lit-poem-duchess': [
    'The Duke controls a dramatic monologue, yet his polished account unintentionally reveals jealousy, possession and threat.',
    'Art fixes the Duchess as an object he can unveil and control, unlike the independent responses she showed while alive.',
    'The controlled verse and negotiation over marriage connect private gendered power with status, wealth and patriarchal authority.',
  ],
  'english-lit-poem-charge': [
    'Driving rhythm and repetition imitate collective movement into danger and create public commemoration.',
    'The poem acknowledges a command error but focuses on obedience, courage and sacrifice rather than individual doubt.',
    'Changes between action and final instruction turn the soldiers from participants into a remembered national example.',
  ],
  'english-lit-poem-exposure': [
    'Repeated waiting and an unresolved refrain make war seem static, futile and psychologically exhausting.',
    'Weather is personified as a more persistent enemy than direct combat, attacking bodies and hope.',
    'Half-rhyme and circular structure deny resolution, while memories of home emphasise separation and loss of faith.',
  ],
  'english-lit-poem-storm': [
    'The communal voice initially claims preparedness, but violent sound and military imagery expose continuing vulnerability.',
    'The storm is powerful despite being invisible, making fear depend on anticipation as well as physical force.',
    'Conversational blank verse moves between confidence and uncertainty, showing a community repeatedly negotiating threat.',
  ],
  'english-lit-poem-bayonet': [
    'The poem begins in immediate motion, placing one disoriented soldier inside physical sensation rather than heroic overview.',
    'Patriotic ideas become fragile under pressure as instinct, fear and bodily survival replace abstraction.',
    'Irregular movement, enjambment and disturbing natural images reproduce confusion and the loss of control.',
  ],
  'english-lit-poem-remains': [
    'Colloquial narration initially distances the speaker from violence, but uncertainty about the victim becomes an obsessive refrain.',
    'The movement from shared military action to solitary civilian memory shows trauma surviving after the event.',
    'Violent imagery invades the home and the speaker\'s mind, making guilt unresolved and impossible to contain.',
  ],
  'english-lit-poem-poppies': [
    'A parent\'s domestic memories and tactile actions connect public conflict to private separation and grief.',
    'Time shifts and symbolic images blur departure, remembrance and imagined loss rather than narrating a battle.',
    'The restrained first-person voice combines pride, tenderness and a painful attempt to release control.',
  ],
  'english-lit-poem-war-photographer': [
    'The ordered darkroom contrasts professional control with chaotic memories of suffering.',
    'Religious and photographic imagery make the work both ritualised and morally troubling.',
    'The final shift to newspaper readers criticises brief attention and distance from repeated conflict.',
  ],
  'english-lit-poem-tissue': [
    'Paper becomes a flexible symbol for maps, records, money, buildings and the systems through which people organise power.',
    'Light repeatedly passes through fragile material, suggesting openness and truth can outlast rigid control.',
    'Free verse and shifting images resist a fixed argument, ending by connecting human bodies to impermanence and creation.',
  ],
  'english-lit-poem-emigree': [
    'The speaker protects an idealised childhood city through recurring light even when later accounts describe conflict and tyranny.',
    'Memory gives identity and resistance, but personification also makes the lost place intimate and possibly unreliable.',
    'Long flowing lines and repeated assertions reproduce a voice determined to preserve belonging across exile.',
  ],
  'english-lit-poem-history': [
    'The speaker contrasts an imposed colonial curriculum with vivid recovered figures from Black history.',
    'Changes in rhythm, typography and imagery give suppressed histories energy and authority.',
    'Non-standard voice becomes deliberate resistance, and the ending presents identity as actively reconstructed rather than passively received.',
  ],
  'english-lit-poem-kamikaze': [
    'A pilot turns back after sensory memories of nature and family interrupt the pressure of national duty.',
    'The daughter\'s reported account distances the pilot, mirroring the family\'s later social rejection of him.',
    'The unresolved ending compares physical death with a lifetime of shame, questioning who defines honour.',
  ],
  'english-lit-unseen': [
    'Begin with a defensible interpretation of the poem as a whole, then select details that develop or complicate it.',
    'Analyse patterns, contrasts, voice, structure and imagery in relation to meaning rather than searching for every technique.',
    'For comparison, organise by shared or contrasting ideas and methods so both poems remain present in each section.',
  ],

  // Pearson Edexcel History 1HI0
  'history-edexcel-medieval': [
    'Medieval explanations combined the Four Humours, Galen, religion and astrology; treatments tried to restore balance or seek divine help.',
    'Care was mainly domestic or charitable, and physicians, apothecaries and barber surgeons had different training and roles.',
    'During the Black Death, responses reflected limited knowledge of infection, although authorities also attempted practical sanitation and quarantine measures.',
  ],
  'history-edexcel-renaissance': [
    'Printing, humanism and observation challenged some inherited authority, but many older explanations and treatments continued.',
    'Vesalius corrected anatomy through dissection, Harvey demonstrated circulation, and Sydenham improved observation and classification of symptoms.',
    'The Great Plague shows both continuity in supernatural or miasma explanations and stronger civic attempts at isolation and cleaning.',
  ],
  'history-edexcel-industrial': [
    'Jenner developed vaccination from observation and experiment, but opposition and limited understanding slowed acceptance.',
    'Pasteur\'s germ theory and Koch\'s identification of microbes transformed explanations and supported antiseptic and aseptic surgery.',
    'Cholera investigations, reformers and government legislation gradually expanded public-health responsibility and infrastructure.',
  ],
  'history-edexcel-modern-medicine': [
    'Magic bullets, antibiotics and pharmaceutical research made targeted treatment more effective, while resistance created new challenges.',
    'Genetics, imaging and laboratory testing improved diagnosis and supported treatments tailored to disease mechanisms.',
    'The NHS widened access, while vaccination, screening and lifestyle campaigns show prevention becoming a major state responsibility.',
  ],
  'history-edexcel-western-front': [
    'Trench conditions produced wounds, infection, gas injuries and illness on a scale that required organised evacuation through successive medical stages.',
    'X-rays, blood transfusion, the Thomas splint and specialist centres improved diagnosis, survival and treatment, though conditions limited use.',
    'Source enquiries require content, provenance and secure contextual knowledge about the sector, transport and medical organisation.',
  ],
  'history-edexcel-elizabeth-government': [
    'Elizabeth inherited financial, religious and succession problems and governed through court, Privy Council, Parliament and local officials.',
    'The 1559 settlement aimed at outward conformity and royal control, creating a Protestant church while managing opposition cautiously.',
    'Early Catholic and Puritan challenges reveal the limits of compromise and the importance of enforcement, patronage and loyalty.',
  ],
  'history-edexcel-elizabeth-challenges': [
    'Mary Queen of Scots became a focus for plots after arriving in England, linking domestic Catholic opposition with foreign threats.',
    'Relations with Spain worsened through religion, trade, privateering and English intervention in the Netherlands.',
    'The Armada failed through English tactics, Spanish planning and communication problems, weather and the difficulty of joining Parma\'s army.',
  ],
  'history-edexcel-elizabeth-society': [
    'Education and leisure reflected wealth and gender, while population growth, inflation and harvest failure increased pressure on the poor.',
    'Government responses distinguished the deserving from the idle poor and gradually made local relief more organised and compulsory.',
    'Exploration mixed trade, rivalry and ambition; Raleigh\'s Virginia failed through supply, leadership and relations with Indigenous peoples.',
  ],
  'history-edexcel-west-early': [
    'Plains peoples adapted social organisation, movement and beliefs to the buffalo and grassland environment.',
    'Migration routes, the Gold Rush and early settlement increased pressure on land and resources despite treaties.',
    'Tensions developed because Indigenous and settler ideas about land use, property, movement and authority were fundamentally different.',
  ],
  'history-edexcel-west-plains': [
    'Homesteaders faced climate, water and isolation, adapting through new crops, fencing, machinery and community cooperation.',
    'Railroads accelerated settlement and markets, while cattle trails, cow towns and ranching transformed Plains economies.',
    'Federal policy, warfare and destruction of the buffalo increasingly confined Indigenous peoples and undermined traditional life.',
  ],
  'history-edexcel-west-later': [
    'Open-range ranching declined after overstocking, extreme winters, fencing and changing markets encouraged smaller managed ranches.',
    'Conflict and reservation policy culminated in military defeat, forced assimilation and loss of land and cultural independence.',
    'By 1895 settlement, farming and federal control had closed the frontier, though change was uneven and resistance continued.',
  ],
  'history-edexcel-germany-weimar': [
    'The new republic faced the Versailles settlement, political violence, weak coalitions and the 1923 occupation, hyperinflation and uprisings.',
    'Stresemann stabilised currency and international relations, but recovery depended heavily on US loans and retained structural weakness.',
    'Culture and opportunities for women changed in cities, while conservative opposition and uneven prosperity limited the idea of a golden age.',
  ],
  'history-edexcel-germany-rise': [
    'The early Nazi Party combined nationalism, antisemitism, leadership and paramilitary methods, but the Munich Putsch showed the limits of violent seizure.',
    'After reorganisation, propaganda and local organisation expanded support, while the Depression discredited moderate governments.',
    'Hitler became chancellor through election gains and elite political deals; he did not win an outright electoral majority.',
  ],
  'history-edexcel-germany-control': [
    'The Reichstag Fire, Enabling Act and removal of rival organisations dismantled constitutional opposition during 1933.',
    'The Night of the Long Knives, army oath and Hindenburg\'s death consolidated Hitler\'s personal dictatorship.',
    'SS terror, courts, informers, propaganda and censorship combined repression with attempts to manufacture consent, while opposition survived in limited forms.',
  ],
  'history-edexcel-germany-life': [
    'Nazi policy tried to direct women towards family roles and young people towards ideological and military preparation, with uneven participation and resistance.',
    'Employment rose through rearmament, conscription and public works, but wages, hours and independent worker rights complicate claims of improved living standards.',
    'Persecution escalated through exclusion, law and violence against Jewish people and other targeted groups before the war.',
  ],

  // AQA Geography 8035
  'geo-hazards-risk': [
    'A natural event becomes a hazard where it threatens people, property or systems; risk reflects both probability and potential loss.',
    'Vulnerability rises with poverty, weak buildings, rapid urbanisation and limited planning, while capacity grows through governance, education and resources.',
    'Hazard impact therefore depends on magnitude and location as well as preparedness, exposure and ability to recover.',
  ],
  'geo-hazards-tectonic': [
    'Plate movement is driven by processes within the mantle and creates constructive, destructive and conservative margins with distinct hazards.',
    'Primary effects occur directly, while secondary effects follow; immediate and long-term responses should be linked to specific needs.',
    'Contrasting case studies should compare development, governance, building quality and access rather than assuming hazard magnitude explains every difference.',
  ],
  'geo-hazards-weather': [
    'Global atmospheric circulation creates pressure belts and prevailing winds that help explain broad climate patterns.',
    'Tropical storms require warm ocean water, rotation and low wind shear; energy from condensation drives strong winds and rain.',
    'Risk reduction combines monitoring, prediction, planning, protection and recovery, each with different costs and limitations.',
  ],
  'geo-hazards-climate': [
    'Ice cores, temperature records, pollen and other proxy evidence show climate changing over different timescales.',
    'Natural drivers include orbital change, solar output and volcanic activity; recent warming is strongly linked to enhanced greenhouse-gas concentrations.',
    'Mitigation reduces causes, while adaptation manages unavoidable effects; effective policy often requires both.',
  ],
  'geo-ecosystems': [
    'Producers, consumers and decomposers transfer energy and recycle nutrients within interdependent food webs.',
    'Climate, soil, water and organisms interact, so changing one component can create effects across the ecosystem.',
    'Global biome distribution mainly reflects temperature and precipitation, modified by altitude, soils and human action.',
  ],
  'geo-rainforests': [
    'Year-round heat and rainfall drive rapid nutrient cycling, layered vegetation and specialised adaptations, while many nutrients are stored in biomass.',
    'Commercial farming, logging, mining, roads and energy development create economic benefits alongside habitat, soil, water and carbon impacts.',
    'Sustainable management combines selective use, conservation, certification, debt arrangements and participation by local communities.',
  ],
  'geo-hot-deserts': [
    'Very low rainfall, high evaporation and temperature extremes create sparse, fragile ecosystems with specialised water-saving adaptations.',
    'Mineral extraction, energy, farming and tourism offer development but face water shortage, accessibility and environmental limits.',
    'Desertification results from climate pressure and unsustainable land use; soil, grazing and water management can reduce it.',
  ],
  'geo-cold-environments': [
    'Low temperatures, short growing seasons and permafrost slow nutrient cycling and make ecosystems vulnerable to disturbance.',
    'Energy, mineral and tourism opportunities can bring income and infrastructure but create access, spill, habitat and cultural challenges.',
    'Protection uses technology, regulation, conservation and Indigenous or local participation, with recovery often taking decades.',
  ],
  'geo-uk-overview': [
    'More resistant rocks and past glaciation contribute to many northern and western uplands; softer sedimentary rocks often underlie southern and eastern lowlands.',
    'Geology, climate and relief influence drainage patterns, river systems and the development of distinctive landscapes.',
    'Maps should be used to connect named uplands, lowlands and major rivers rather than learning isolated locations.',
  ],
  'geo-coasts': [
    'Wave energy, weathering and mass movement shape cliffs; hydraulic action, abrasion, attrition and solution drive erosion.',
    'Differential erosion forms headlands and bays, while weaknesses can develop through cave, arch, stack and stump sequences.',
    'Management choices redistribute costs and sediment, so evaluation should compare protection, sustainability and effects elsewhere along the coast.',
  ],
  'geo-rivers': [
    'Erosion dominates many upper-course processes while transport and deposition become increasingly important downstream as discharge changes.',
    'Meanders, waterfalls and floodplains form through linked erosion, transport and deposition rather than isolated definitions.',
    'Flood risk reflects rainfall, geology, relief, soil, land use and drainage; management combines hard engineering with storage and catchment approaches.',
  ],
  'geo-glacial': [
    'Glaciers erode through plucking and abrasion and transport material that is later deposited as till or sorted meltwater sediment.',
    'Corries, arêtes, pyramidal peaks and U-shaped valleys record erosion, while moraines and drumlins record deposition.',
    'Tourism and farming create income and conflict in uplands, so management must balance access, conservation and local livelihoods.',
  ],
  'geo-urban': [
    'Urbanisation is driven by natural increase and migration, with opportunities and challenges differing between cities and neighbourhoods.',
    'Case-study evidence should connect housing, services, employment, inequality, environment and governance rather than list statistics.',
    'Regeneration and sustainable transport should be judged by who benefits, cost, displacement, accessibility and long-term environmental effects.',
  ],
  'geo-economic': [
    'Development is multidimensional, so income measures should be compared with health, education, inequality and composite indicators.',
    'Investment, aid, trade, tourism, technology and debt relief may close the gap but distribute benefits unevenly.',
    'Economic change in a named NEE and the UK should link employment sectors, globalisation, infrastructure and regional inequality.',
  ],
  'geo-resources-overview': [
    'Resource security includes availability, access, affordability and reliability, not simply total physical supply.',
    'Rising population, wealth and technology change demand while climate, geology, infrastructure and politics shape supply.',
    'UK food, water and energy choices create environmental impacts and trade-offs between domestic production, imports and conservation.',
  ],
  'geo-resource-food': [
    'Food insecurity can result from climate, conflict, poverty, pests, soil degradation and weak transport or storage.',
    'Increasing supply through irrigation, biotechnology and commercial farming can raise yields but create water, cost, soil and access trade-offs.',
    'Large-scale and local sustainable schemes should be compared using productivity, affordability, resilience and who receives the benefits.',
  ],
  'geo-resource-water': [
    'Water stress depends on seasonal supply, demand, pollution, infrastructure and the ability to pay for treatment and transfer.',
    'Dams and transfer schemes can provide large reliable supplies but may displace people, damage ecosystems and create conflict.',
    'Conservation, recycling and appropriate local technology reduce demand or improve access but may not match every required scale.',
  ],
  'geo-resource-energy': [
    'Energy security depends on a diverse, affordable and reliable supply as demand and domestic reserves change.',
    'Fossil fuels offer controllable output but create emissions and extraction impacts; renewables reduce operational carbon but can be intermittent.',
    'Evaluation should consider storage, grid investment, landscape, cost, local conditions and the risks of relying on one source.',
  ],
  'geo-issue-evaluation': [
    'Read the pre-release material for provenance, scale, trend and uncertainty before accepting stakeholder claims.',
    'Connect physical and human processes, compare options against explicit criteria and distinguish short- from long-term effects.',
    'A reasoned judgement selects an option, uses evidence, acknowledges its main cost and explains why alternatives are less suitable.',
  ],
  'geo-fieldwork': [
    'An enquiry links a focused question to justified sampling, variables, equipment, risk assessment and a replicable method.',
    'Presentation and statistics must suit the data; analysis should identify patterns, anomalies and relationships using evidence.',
    'Evaluation explains how a limitation affects validity or reliability and proposes a specific feasible improvement.',
  ],
  'geo-skills': [
    'Map skills include four- and six-figure references, scale, relief, direction, distance and interpreting patterns with evidence.',
    'Graphs, photographs, GIS and numerical sources must be described accurately before processes or causes are inferred.',
    'Percentage change, mean, range, interquartile range and significance tests require correct working, units and contextual interpretation.',
  ],

  // Pearson Edexcel Business 1BS0
  'business-1-1-enterprise': [
    'Enterprise identifies and acts on an opportunity; entrepreneurs organise resources while accepting financial and personal risk.',
    'Customer needs include price, quality, choice and convenience, and satisfying them can build demand and loyalty.',
    'Added value is selling price minus input cost and can rise through branding, quality, convenience or distinctive features.',
  ],
  'business-1-2-opportunity': [
    'Primary research is collected for the business; secondary research already exists. Both can be qualitative or quantitative.',
    'Reliability depends on sample size, selection, wording, timing and whether the information matches the target market.',
    'Segmentation and market maps reveal customer groups, competition and possible gaps, but research reduces rather than removes uncertainty.',
  ],
  'business-1-3-finance': [
    'Revenue = price × quantity; total cost = fixed + variable cost; profit = revenue − total cost.',
    'Contribution per unit = price − variable cost and break-even output = fixed cost/contribution; margin of safety is actual minus break-even output.',
    'Cash flow records timing of money in and out, so a profitable firm can still become insolvent without enough cash.',
    'Finance choice depends on amount, purpose, duration, cost, risk, ownership and the firm\'s ability to repay.',
  ],
  'business-1-4-effective': [
    'Ownership affects control, liability, access to finance, continuity and how profit is distributed.',
    'Location depends on customers, labour, suppliers, competitors, infrastructure, cost and the importance of online operation.',
    'The marketing mix must be integrated: product, price, promotion and place should support the same target and positioning.',
    'A business plan supports decisions and finance applications but depends on assumptions that may quickly become outdated.',
  ],
  'business-1-5-external': [
    'Stakeholders have different objectives, creating conflict over wages, prices, dividends, growth and environmental impact.',
    'Interest rates, inflation, income, unemployment, tax and exchange rates change demand, costs, finance and competitiveness.',
    'Technology and law create costs and constraints but can also improve productivity, access, trust and differentiation.',
  ],
  'business-2-1-growth': [
    'Internal growth expands the existing business; external growth uses merger or takeover and may be faster but harder to integrate.',
    'Growth can create economies of scale and market power while increasing coordination, finance and diseconomy risks.',
    'International expansion adds markets and sourcing options but introduces exchange rates, culture, regulation, logistics and global competition.',
    'Ethical and environmental choices may raise short-term cost while protecting reputation, supply and long-term objectives.',
  ],
  'business-2-2-marketing': [
    'The design mix balances function, aesthetics and cost, while the product life cycle affects promotion, pricing and extension decisions.',
    'Price strategies should fit objectives, costs, demand, competition and positioning rather than be judged in isolation.',
    'Promotion communicates with target customers and distribution determines access; digital routes change reach, data and cost.',
    'Competitive advantage depends on an integrated mix that delivers a valued difference rivals cannot easily match.',
  ],
  'business-2-3-operations': [
    'Job production offers customisation, batch balances variety and repetition, and flow supports high volume and consistency.',
    'Productivity is output per input; technology may improve speed and quality but requires investment, training and reliable demand.',
    'Stock decisions balance availability against storage and waste; just-in-time reduces inventory but increases supply-disruption risk.',
    'Quality control inspects output, while quality assurance designs quality into processes and staff responsibility.',
  ],
  'business-2-4-finance': [
    'Gross profit = revenue − cost of sales; net profit subtracts other operating expenses from gross profit.',
    'Profit margins express gross or net profit as a percentage of revenue so businesses or periods can be compared.',
    'Average rate of return compares average annual profit with initial investment, but forecasts and non-financial effects remain uncertain.',
    'Financial and market data inform decisions only when provenance, timing, trends and limitations are considered.',
  ],
  'business-2-5-people': [
    'Tall and flat structures change spans of control, delegation, communication speed and opportunities for responsibility.',
    'Recruitment should match job needs; induction and ongoing training affect competence, safety, flexibility and retention.',
    'Financial and non-financial motivation work differently depending on employee needs, task design and fairness.',
    'Better motivation may improve retention, productivity and service, but benefits must be compared with cost and measurability.',
  ],

  // AQA Design and Technology 8552
  'dt-emerging': [
    'Automation, robotics and flexible systems can improve consistency, speed and safety while changing skills, roles and investment needs.',
    'Enterprise and crowdfunding can test demand and fund development but create delivery, intellectual-property and reputation risks.',
    'Technology should be evaluated through social, cultural, economic and environmental effects across the product life cycle.',
  ],
  'dt-energy': [
    'Fossil fuels and nuclear generation are controllable but have finite-resource, waste or emission impacts; renewables vary by location and time.',
    'Storage systems differ in capacity, energy density, response, lifespan, safety, cost and environmental impact.',
    'A justified selection matches supply and storage to power, duration, reliability, maintenance and end-of-life requirements.',
  ],
  'dt-new-materials': [
    'Smart materials change a property in response to heat, light, force or electricity and must be matched to a useful controlled function.',
    'Composites combine materials to achieve properties unavailable from one component alone, often with recycling trade-offs.',
    'Modern materials and technical textiles should be compared through performance, manufacture, cost, durability and sustainability.',
  ],
  'dt-systems': [
    'A system converts inputs through processes into outputs; feedback measures the output so control can be adjusted.',
    'Sensors produce signals, controllers apply programmed logic and output drivers operate components requiring greater power.',
    'Block diagrams clarify subsystem relationships before detailed electronic or mechanical design.',
  ],
  'dt-mechanisms': [
    'Rotary, linear, reciprocating and oscillating motion can be converted using cams, linkages, gears and pulleys.',
    'Mechanical advantage trades force against movement or speed; gear and pulley ratios depend on driver and driven sizes.',
    'Selections must consider direction, load, precision, friction, alignment, safety and maintenance.',
  ],
  'dt-materials-overview': [
    'Material categories have characteristic structures, stock forms and working properties, but selection must compare specific materials.',
    'Physical properties describe behaviour such as density or conductivity; working properties describe response to manufacture.',
    'A sound choice links property to function, process, user, cost, availability, finish and environmental impact.',
  ],
  'dt-selection-forces': [
    'Products experience tension, compression, bending, torsion and shear, often in combination and at changing loads.',
    'Section shape, ribs, folds, laminations and supports can increase stiffness without simply adding large amounts of material.',
    'Selection balances functional and aesthetic performance with cost, availability, manufacture, environment and safety.',
  ],
  'dt-footprint-origins': [
    'Life-cycle thinking follows extraction, processing, manufacture, transport, use, repair and disposal rather than judging one stage.',
    'Product miles, energy, water, pollution, labour and habitat effects may occur in different countries and supply-chain stages.',
    'The six Rs support lower impact, but the best strategy depends on lifespan, recovery systems and whether performance is maintained.',
  ],
  'dt-working-materials': [
    'Cutting, wasting, deforming, reforming and addition processes change material in different ways and suit particular stock forms.',
    'Properties may be modified through heat treatment, lamination, alloying, seasoning or finishing depending on the specialist area.',
    'Process choice should match material behaviour, tolerance, surface quality, volume, equipment, skill and safety.',
  ],
  'dt-production': [
    'Stock forms and standard sizes affect cutting plans, joining, availability, waste and cost calculations.',
    'One-off, batch, mass and continuous production use different levels of labour, tooling, automation and standardisation.',
    'Economical scale selection balances setup cost, unit cost, demand, flexibility, consistency and storage.',
  ],
  'dt-processes-quality': [
    'Templates, jigs and patterns improve repeatability; tolerances define acceptable dimensional variation.',
    'Quality control checks products at chosen stages, while quality assurance defines systems that prevent defects.',
    'Preparation and finish protect material, improve appearance or alter performance and must suit use and end-of-life plans.',
  ],
  'dt-investigation': [
    'Primary research captures direct user evidence; secondary research provides existing ergonomic, market, technical and contextual information.',
    'Representative participants, ethical handling and triangulation make research more reliable and useful.',
    'Analysis should convert evidence into genuine design opportunities rather than simply collecting photographs or opinions.',
  ],
  'dt-brief-specification': [
    'A design brief summarises the problem, user and intended outcome without predetermining the solution.',
    'Specification points should be measurable, justified by research and cover function, user, size, safety, cost and sustainability.',
    'Each criterion needs a realistic test so later evaluation can compare evidence with the original requirement.',
  ],
  'dt-ideas': [
    'Divergent strategies generate genuinely different principles before convergent evaluation selects and combines promising features.',
    'Annotated sketches, physical models and CAD communicate different information and should answer audience needs.',
    'Iteration and user feedback reduce design fixation when evidence changes the concept rather than merely decorating it.',
  ],
  'dt-development': [
    'Development resolves function, dimensions, construction, materials, components and manufacture through repeated modelling and testing.',
    'Change one variable where possible, collect comparable evidence and record why the result supports the next decision.',
    'A developed proposal should be feasible at the intended scale and address sustainability, tolerance and user feedback.',
  ],
  'dt-making': [
    'A production plan sequences operations, tools, quality checks and safety controls before irreversible work begins.',
    'Accurate datum marking, jigs, allowances, cutting plans and first-piece checks reduce cumulative error and waste.',
    'A quality prototype demonstrates appropriate skill, finish and function while documenting justified changes made during manufacture.',
  ],
  'dt-evaluation': [
    'Evaluation compares measured results with each specification criterion under realistic conditions.',
    'User and third-party feedback should be representative, specific and combined with quantitative test data.',
    'Improvements identify a failure cause, propose a feasible change and predict how retesting would demonstrate progress.',
    'A complete judgement also considers commercial viability and social and environmental effects.',
  ],
}

export function detailedTopicNotesFor(topicId: string): string[] {
  return DETAILED_TOPIC_NOTES[topicId] ?? []
}
