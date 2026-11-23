import {
  GoniometryMovementTemplate,
  OrthopedicRegionId,
  SpecialTestTemplate,
  StrengthMuscleTemplate,
} from '../types/clinical';

export interface OrthopedicRegionDefinition {
  id: OrthopedicRegionId;
  name: string;
  goniometry: GoniometryMovementTemplate[];
  strength: StrengthMuscleTemplate[];
  specialTests: SpecialTestTemplate[];
}

export const ORTHOPEDIC_REGIONS: Record<OrthopedicRegionId, OrthopedicRegionDefinition> = {
  cervical: {
    id: 'cervical',
    name: 'Coluna Cervical',
    goniometry: [
      { id: 'cerv-flex', joint: 'Coluna Cervical', movement: 'Flexão', normalRange: '0–45° / 65°', region: 'cervical' },
      { id: 'cerv-ext', joint: 'Coluna Cervical', movement: 'Extensão', normalRange: '0–45° / 55°', region: 'cervical' },
      { id: 'cerv-incl', joint: 'Coluna Cervical', movement: 'Inclinação Lateral (D/E)', normalRange: '0–45°', region: 'cervical' },
      { id: 'cerv-rot', joint: 'Coluna Cervical', movement: 'Rotação (D/E)', normalRange: '0–70° / 80°', region: 'cervical' },
    ],
    strength: [
      { id: 'cerv-flex-prof', muscleOrGroup: 'Flexores cervicais profundos (teste de resistência)', nerveRoot: 'C1–C3', region: 'cervical' },
      { id: 'cerv-c4', muscleOrGroup: 'Elevadores da escápula / Trapézio superior', nerveRoot: 'C4', region: 'cervical' },
      { id: 'cerv-c5', muscleOrGroup: 'Abdutores de ombro (Miótomo C5)', nerveRoot: 'C5', region: 'cervical' },
      { id: 'cerv-c6', muscleOrGroup: 'Flexores de cotovelo / Extensores de punho', nerveRoot: 'C6', region: 'cervical' },
      { id: 'cerv-c7', muscleOrGroup: 'Extensores de cotovelo / Flexores de punho', nerveRoot: 'C7', region: 'cervical' },
      { id: 'cerv-c8', muscleOrGroup: 'Flexores profundos dos dedos', nerveRoot: 'C8', region: 'cervical' },
    ],
    specialTests: [
      { id: 'cerv-spurling', name: 'Teste de Spurling (Compressão Foraminal)', objective: 'Investigar radiculopatia cervical por compressão radicular', region: 'cervical', bilateral: true },
      { id: 'cerv-distracao', name: 'Teste de Distração Cervical', objective: 'Avaliar alívio de sintomas radiculares ou facetários por descompressão', region: 'cervical', bilateral: false },
      { id: 'cerv-ultt1', name: 'ULTT-A (Tensão Neural do Nervo Mediano)', objective: 'Avaliar mecanossensibilidade do plexo braquial / nervo mediano', region: 'cervical', bilateral: true },
      { id: 'cerv-adson', name: 'Teste de Adson', objective: 'Investigar síndrome do desfiladeiro torácico (escalenos)', region: 'cervical', bilateral: true },
      { id: 'cerv-sharp-purser', name: 'Teste de Sharp-Purser (Cuidado clínico)', objective: 'Avaliar instabilidade atlantoaxial (realizar apenas se indicado e seguro)', region: 'cervical', bilateral: false },
      { id: 'cerv-flex-rot', name: 'Teste de Flexão-Rotação Cervical', objective: 'Avaliar disfunção articular C1–C2 (cefaleia cervicogênica)', region: 'cervical', bilateral: true },
    ],
  },
  toracica: {
    id: 'toracica',
    name: 'Coluna Torácica',
    goniometry: [
      { id: 'tor-rot', joint: 'Coluna Torácica', movement: 'Rotação Torácica (D/E)', normalRange: '0–35° / 45°', region: 'toracica' },
      { id: 'tor-flex', joint: 'Coluna Torácica', movement: 'Flexão Toracolombar (Ott / Fita)', normalRange: '+3 a 4 cm', region: 'toracica' },
      { id: 'tor-ext', joint: 'Coluna Torácica', movement: 'Extensão Torácica', normalRange: '0–25°', region: 'toracica' },
    ],
    strength: [
      { id: 'tor-trap-med', muscleOrGroup: 'Trapézio Médio e Romboides', region: 'toracica' },
      { id: 'tor-trap-inf', muscleOrGroup: 'Trapézio Inferior', region: 'toracica' },
      { id: 'tor-serr', muscleOrGroup: 'Serrátil Anterior', region: 'toracica' },
      { id: 'tor-eret', muscleOrGroup: 'Eretores da espinha torácica', region: 'toracica' },
    ],
    specialTests: [
      { id: 'tor-adams', name: 'Teste de Adams (Flexão Anterior)', objective: 'Avaliar presença de gibosidade costal / escoliose estrutural', region: 'toracica', bilateral: false },
      { id: 'tor-slump', name: 'Slump Test (Tensão Neural)', objective: 'Avaliar mecanossensibilidade neural dural', region: 'toracica', bilateral: true },
      { id: 'tor-spring', name: 'Spring Test Torácico (PA)', objective: 'Avaliar mobilidade segmentar e reprodução de dor local', region: 'toracica', bilateral: false },
      { id: 'tor-expansibilidade', name: 'Cirtometria / Expansibilidade Torácica', objective: 'Quantificar mobilidade da caixa torácica na inspiração máxima', region: 'toracica', bilateral: false },
    ],
  },
  lombar: {
    id: 'lombar',
    name: 'Coluna Lombar',
    goniometry: [
      { id: 'lomb-flex', joint: 'Coluna Lombar', movement: 'Flexão Lombar', normalRange: '0–60° / 90°', region: 'lombar' },
      { id: 'lomb-ext', joint: 'Coluna Lombar', movement: 'Extensão Lombar', normalRange: '0–25° / 35°', region: 'lombar' },
      { id: 'lomb-incl', joint: 'Coluna Lombar', movement: 'Inclinação Lateral (D/E)', normalRange: '0–25°', region: 'lombar' },
      { id: 'lomb-rot', joint: 'Coluna Lombar', movement: 'Rotação Lombar', normalRange: '0–30°', region: 'lombar' },
    ],
    strength: [
      { id: 'lomb-l2', muscleOrGroup: 'Flexores de quadril (Iliopsoas - L2)', nerveRoot: 'L2', region: 'lombar' },
      { id: 'lomb-l3', muscleOrGroup: 'Extensores de joelho (Quadríceps - L3)', nerveRoot: 'L3', region: 'lombar' },
      { id: 'lomb-l4', muscleOrGroup: 'Dorsiflexores (Tibial Anterior - L4)', nerveRoot: 'L4', region: 'lombar' },
      { id: 'lomb-l5', muscleOrGroup: 'Extensor longo do hálux (L5)', nerveRoot: 'L5', region: 'lombar' },
      { id: 'lomb-s1', muscleOrGroup: 'Flexores plantares / Eversores (S1)', nerveRoot: 'S1', region: 'lombar' },
      { id: 'lomb-core', muscleOrGroup: 'Estabilizadores lombo-pélvicos (Transverso/Multífidos)', region: 'lombar' },
    ],
    specialTests: [
      { id: 'lomb-lasegue', name: 'Teste de Lasègue (Elevação da Perna Reta - SLR)', objective: 'Investigar irritação radicular lombossacral (L4–S1)', region: 'lombar', bilateral: true },
      { id: 'lomb-bragard', name: 'Teste de Bragard', objective: 'Confirmar componente neural do SLR com dorsiflexão', region: 'lombar', bilateral: true },
      { id: 'lomb-slump', name: 'Slump Test', objective: 'Avaliar tensão neural do neuroeixo', region: 'lombar', bilateral: true },
      { id: 'lomb-schober', name: 'Teste de Schober Modificado', objective: 'Mensurar mobilidade de flexão lombar (cm)', region: 'lombar', bilateral: false },
      { id: 'lomb-kemp', name: 'Teste de Kemp (Quadrante Lombar)', objective: 'Avaliar dor facetária ou estenose foraminal', region: 'lombar', bilateral: true },
      { id: 'lomb-prono-instab', name: 'Teste de Instabilidade em Prono', objective: 'Avaliar instabilidade segmentar lombar', region: 'lombar', bilateral: false },
      { id: 'lomb-faber', name: 'Teste de Patrick / FABER (Sacroilíaca)', objective: 'Diferenciar dor sacroilíaca e coxofemoral', region: 'lombar', bilateral: true },
    ],
  },
  ombro: {
    id: 'ombro',
    name: 'Ombro',
    goniometry: [
      { id: 'omb-flex', joint: 'Ombro', movement: 'Flexão', normalRange: '0–180°', region: 'ombro' },
      { id: 'omb-ext', joint: 'Ombro', movement: 'Extensão', normalRange: '0–45° / 60°', region: 'ombro' },
      { id: 'omb-abd', joint: 'Ombro', movement: 'Abdução', normalRange: '0–180°', region: 'ombro' },
      { id: 'omb-rot-ext', joint: 'Ombro', movement: 'Rotação Externa (90° abd ou neutro)', normalRange: '0–90°', region: 'ombro' },
      { id: 'omb-rot-int', joint: 'Ombro', movement: 'Rotação Interna', normalRange: '0–70° / 90°', region: 'ombro' },
    ],
    strength: [
      { id: 'omb-supra', muscleOrGroup: 'Supraespinal / Deltoide médio', region: 'ombro' },
      { id: 'omb-infra', muscleOrGroup: 'Infraespinal / Redondo menor (Rotadores externos)', region: 'ombro' },
      { id: 'omb-subesc', muscleOrGroup: 'Subescapular (Rotador interno)', region: 'ombro' },
      { id: 'omb-delt-ant', muscleOrGroup: 'Deltoide anterior / Coracobraquial', region: 'ombro' },
      { id: 'omb-serr', muscleOrGroup: 'Serrátil anterior e Trapézio (Discinese escapular)', region: 'ombro' },
    ],
    specialTests: [
      { id: 'omb-neer', name: 'Teste de Neer', objective: 'Investigar impacto subacromial', region: 'ombro', bilateral: true },
      { id: 'omb-hawkins', name: 'Teste de Hawkins-Kennedy', objective: 'Investigar impacto subacromial / tendão do supraespinal', region: 'ombro', bilateral: true },
      { id: 'omb-jobe', name: 'Teste de Jobe (Empty Can)', objective: 'Avaliar integridade e força do supraespinal', region: 'ombro', bilateral: true },
      { id: 'omb-patte', name: 'Teste de Patte / Lag Sign Rot. Externa', objective: 'Avaliar infraespinal e redondo menor', region: 'ombro', bilateral: true },
      { id: 'omb-gerber', name: 'Teste de Gerber (Lift-Off) / Belly Press', objective: 'Avaliar integridade do subescapular', region: 'ombro', bilateral: true },
      { id: 'omb-speed', name: 'Teste de Speed (Palm-Up)', objective: 'Avaliar tendinopatia da cabeça longa do bíceps', region: 'ombro', bilateral: true },
      { id: 'omb-apreensao', name: 'Teste de Apreensão e Recolocação', objective: 'Investigar instabilidade glenoumeral anterior', region: 'ombro', bilateral: true },
      { id: 'omb-sulco', name: 'Teste do Sulco', objective: 'Avaliar frouxidão capsuloligamentar inferior', region: 'ombro', bilateral: true },
    ],
  },
  cotovelo: {
    id: 'cotovelo',
    name: 'Cotovelo',
    goniometry: [
      { id: 'cot-flex', joint: 'Cotovelo', movement: 'Flexão', normalRange: '0–145° / 150°', region: 'cotovelo' },
      { id: 'cot-ext', joint: 'Cotovelo', movement: 'Extensão', normalRange: '0° (hiperext. até 10°)', region: 'cotovelo' },
      { id: 'cot-pron', joint: 'Antebraço', movement: 'Pronação', normalRange: '0–80° / 90°', region: 'cotovelo' },
      { id: 'cot-sup', joint: 'Antebraço', movement: 'Supinação', normalRange: '0–85° / 90°', region: 'cotovelo' },
    ],
    strength: [
      { id: 'cot-flex-m', muscleOrGroup: 'Bíceps braquial / Braquial / Braquiorradial', region: 'cotovelo' },
      { id: 'cot-ext-m', muscleOrGroup: 'Tríceps braquial', region: 'cotovelo' },
      { id: 'cot-pron-m', muscleOrGroup: 'Pronadores (Redondo / Quadrado)', region: 'cotovelo' },
      { id: 'cot-sup-m', muscleOrGroup: 'Supinador / Bíceps', region: 'cotovelo' },
    ],
    specialTests: [
      { id: 'cot-cozen', name: 'Teste de Cozen', objective: 'Investigar epicondilite lateral (extensores de punho)', region: 'cotovelo', bilateral: true },
      { id: 'cot-mill', name: 'Teste de Mill', objective: 'Avaliar estiramento na epicondilite lateral', region: 'cotovelo', bilateral: true },
      { id: 'cot-maudsley', name: 'Teste de Maudsley (Dedo Médio)', objective: 'Avaliar extensor radial curto do carpo', region: 'cotovelo', bilateral: true },
      { id: 'cot-epic-med', name: 'Teste para Epicondilite Medial (Golfista)', objective: 'Reproduzir dor na origem dos flexores/pronadores', region: 'cotovelo', bilateral: true },
      { id: 'cot-valgo', name: 'Estresse em Valgo e Varo do Cotovelo', objective: 'Avaliar integridade dos ligamentos colaterais ulnar e radial', region: 'cotovelo', bilateral: true },
      { id: 'cot-tinel', name: 'Sinal de Tinel no Túnel Cubital', objective: 'Investigar neuropatia do nervo ulnar no cotovelo', region: 'cotovelo', bilateral: true },
    ],
  },
  'punho-mao': {
    id: 'punho-mao',
    name: 'Punho e Mão',
    goniometry: [
      { id: 'pun-flex', joint: 'Punho', movement: 'Flexão Palmar', normalRange: '0–80° / 90°', region: 'punho-mao' },
      { id: 'pun-ext', joint: 'Punho', movement: 'Extensão Dorsal', normalRange: '0–70°', region: 'punho-mao' },
      { id: 'pun-rad', joint: 'Punho', movement: 'Desvio Radial', normalRange: '0–20°', region: 'punho-mao' },
      { id: 'pun-uln', joint: 'Punho', movement: 'Desvio Ulnar', normalRange: '0–35° / 45°', region: 'punho-mao' },
      { id: 'mao-mcp', joint: 'Dedos (MCF / IFP)', movement: 'Flexão MCF / IFP (Dedo acometido)', normalRange: 'MCF 0–90° / IFP 0–100°', region: 'punho-mao' },
    ],
    strength: [
      { id: 'pun-flex-m', muscleOrGroup: 'Flexores do carpo (Radial e Ulnar)', region: 'punho-mao' },
      { id: 'pun-ext-m', muscleOrGroup: 'Extensores do carpo', region: 'punho-mao' },
      { id: 'mao-preensao', muscleOrGroup: 'Preensão palmar / Flexores dos dedos', region: 'punho-mao' },
      { id: 'mao-intrinsecos', muscleOrGroup: 'Intrínsecos / Interósseos / Oponência do polegar', region: 'punho-mao' },
    ],
    specialTests: [
      { id: 'pun-phalen', name: 'Teste de Phalen e Phalen Invertido', objective: 'Investigar síndrome do túnel do carpo (nervo mediano)', region: 'punho-mao', bilateral: true },
      { id: 'pun-tinel', name: 'Sinal de Tinel no Punho', objective: 'Investigar compressão do nervo mediano no túnel do carpo', region: 'punho-mao', bilateral: true },
      { id: 'pun-finkelstein', name: 'Teste de Finkelstein / Eichhoff', objective: 'Investigar tenossinovite de De Quervain', region: 'punho-mao', bilateral: true },
      { id: 'pun-watson', name: 'Teste de Watson (Shift Escafolunar)', objective: 'Avaliar instabilidade escafolunar', region: 'punho-mao', bilateral: true },
      { id: 'pun-froment', name: 'Sinal de Froment', objective: 'Investigar fraqueza do adutor do polegar (nervo ulnar)', region: 'punho-mao', bilateral: true },
      { id: 'pun-allen', name: 'Teste de Allen', objective: 'Avaliar permeabilidade das artérias radial e ulnar', region: 'punho-mao', bilateral: true },
    ],
  },
  quadril: {
    id: 'quadril',
    name: 'Quadril',
    goniometry: [
      { id: 'quad-flex', joint: 'Quadril', movement: 'Flexão', normalRange: '0–120° / 125°', region: 'quadril' },
      { id: 'quad-ext', joint: 'Quadril', movement: 'Extensão', normalRange: '0–10° / 30°', region: 'quadril' },
      { id: 'quad-abd', joint: 'Quadril', movement: 'Abdução', normalRange: '0–45°', region: 'quadril' },
      { id: 'quad-ad', joint: 'Quadril', movement: 'Adução', normalRange: '0–20° / 30°', region: 'quadril' },
      { id: 'quad-re', joint: 'Quadril', movement: 'Rotação Externa', normalRange: '0–45°', region: 'quadril' },
      { id: 'quad-ri', joint: 'Quadril', movement: 'Rotação Interna', normalRange: '0–35° / 45°', region: 'quadril' },
    ],
    strength: [
      { id: 'quad-flex-m', muscleOrGroup: 'Iliopsoas / Reto femoral (Flexores)', region: 'quadril' },
      { id: 'quad-ext-m', muscleOrGroup: 'Glúteo máximo / Isquiotibiais (Extensores)', region: 'quadril' },
      { id: 'quad-abd-m', muscleOrGroup: 'Glúteo médio e mínimo (Abdutores)', region: 'quadril' },
      { id: 'quad-ad-m', muscleOrGroup: 'Adutores do quadril', region: 'quadril' },
      { id: 'quad-rot-m', muscleOrGroup: 'Rotadores externos profundos (Piriforme / Gêmeos)', region: 'quadril' },
    ],
    specialTests: [
      { id: 'quad-fadir', name: 'Teste FADIR (Flexão, Adução e Rotação Interna)', objective: 'Investigar impacto femoroacetabular / lesão labral anterior', region: 'quadril', bilateral: true },
      { id: 'quad-faber', name: 'Teste FABER (Patrick)', objective: 'Avaliar dor intra-articular coxofemoral ou sacroilíaca', region: 'quadril', bilateral: true },
      { id: 'quad-thomas', name: 'Teste de Thomas', objective: 'Avaliar contratura/encurtamento de flexores do quadril (iliopsoas/reto femoral)', region: 'quadril', bilateral: true },
      { id: 'quad-ober', name: 'Teste de Ober', objective: 'Avaliar encurtamento do trato iliotibial / tensor da fáscia lata', region: 'quadril', bilateral: true },
      { id: 'quad-trendelenburg', name: 'Teste de Trendelenburg', objective: 'Avaliar insuficiência dos abdutores do quadril (glúteo médio)', region: 'quadril', bilateral: true },
      { id: 'quad-ely', name: 'Teste de Ely', objective: 'Avaliar encurtamento do músculo reto femoral', region: 'quadril', bilateral: true },
    ],
  },
  joelho: {
    id: 'joelho',
    name: 'Joelho',
    goniometry: [
      { id: 'joe-flex', joint: 'Joelho', movement: 'Flexão', normalRange: '0–135° / 140°', region: 'joelho' },
      { id: 'joe-ext', joint: 'Joelho', movement: 'Extensão', normalRange: '0°', region: 'joelho' },
    ],
    strength: [
      { id: 'joe-quad', muscleOrGroup: 'Quadríceps femoral (Extensores)', region: 'joelho' },
      { id: 'joe-isq', muscleOrGroup: 'Isquiotibiais (Flexores)', region: 'joelho' },
      { id: 'joe-gluteo-med', muscleOrGroup: 'Controle proximal: Abdutores/Rotadores ext. de quadril', region: 'joelho' },
    ],
    specialTests: [
      { id: 'joe-lachman', name: 'Teste de Lachman', objective: 'Avaliar integridade do Ligamento Cruzado Anterior (LCA)', region: 'joelho', bilateral: true },
      { id: 'joe-gav-ant', name: 'Teste da Gaveta Anterior', objective: 'Avaliar integridade do LCA', region: 'joelho', bilateral: true },
      { id: 'joe-gav-post', name: 'Teste da Gaveta Posterior / Godfrey', objective: 'Avaliar integridade do Ligamento Cruzado Posterior (LCP)', region: 'joelho', bilateral: true },
      { id: 'joe-valgo', name: 'Estresse em Valgo (0° e 30°)', objective: 'Avaliar Ligamento Colateral Medial (LCM)', region: 'joelho', bilateral: true },
      { id: 'joe-varo', name: 'Estresse em Varo (0° e 30°)', objective: 'Avaliar Ligamento Colateral Lateral (LCL)', region: 'joelho', bilateral: true },
      { id: 'joe-mcmurray', name: 'Teste de McMurray', objective: 'Investigar lesão meniscal medial e lateral', region: 'joelho', bilateral: true },
      { id: 'joe-apley', name: 'Teste de Compressão e Tração de Apley', objective: 'Diferenciar lesão meniscal de lesão ligamentar', region: 'joelho', bilateral: true },
      { id: 'joe-apreensao-pat', name: 'Teste de Apreensão Patelar (Fairbank)', objective: 'Avaliar instabilidade patelofemoral', region: 'joelho', bilateral: true },
      { id: 'joe-tecla', name: 'Sinal da Tecla / Flutuação Patelar', objective: 'Detectar derrame articular intra-articular', region: 'joelho', bilateral: true },
    ],
  },
  'tornozelo-pe': {
    id: 'tornozelo-pe',
    name: 'Tornozelo e Pé',
    goniometry: [
      { id: 'tor-dorsi', joint: 'Tornozelo', movement: 'Dorsiflexão', normalRange: '0–20°', region: 'tornozelo-pe' },
      { id: 'tor-plant', joint: 'Tornozelo', movement: 'Flexão Plantar', normalRange: '0–45° / 50°', region: 'tornozelo-pe' },
      { id: 'pe-inv', joint: 'Subtalar', movement: 'Inversão', normalRange: '0–35°', region: 'tornozelo-pe' },
      { id: 'pe-ever', joint: 'Subtalar', movement: 'Eversão', normalRange: '0–15° / 20°', region: 'tornozelo-pe' },
      { id: 'pe-halux', joint: '1ª MTF', movement: 'Extensão do Hálux', normalRange: '0–70°', region: 'tornozelo-pe' },
    ],
    strength: [
      { id: 'tor-tib-ant', muscleOrGroup: 'Tibial anterior (Dorsiflexores)', region: 'tornozelo-pe' },
      { id: 'tor-triceps', muscleOrGroup: 'Tríceps sural (Gastrocnêmio / Sóleo)', region: 'tornozelo-pe' },
      { id: 'tor-tib-post', muscleOrGroup: 'Tibial posterior (Inversores)', region: 'tornozelo-pe' },
      { id: 'tor-fibulares', muscleOrGroup: 'Fibulares longo e curto (Eversores)', region: 'tornozelo-pe' },
      { id: 'pe-intrinsecos', muscleOrGroup: 'Intrínsecos do pé (Short Foot)', region: 'tornozelo-pe' },
    ],
    specialTests: [
      { id: 'tor-gav-ant', name: 'Gaveta Anterior do Tornozelo', objective: 'Avaliar integridade do ligamento talofibular anterior (LTFA)', region: 'tornozelo-pe', bilateral: true },
      { id: 'tor-talar-tilt', name: 'Teste de Inclinação Talar (Talar Tilt)', objective: 'Avaliar integridade do ligamento calcaneofibular', region: 'tornozelo-pe', bilateral: true },
      { id: 'tor-thompson', name: 'Teste de Thompson', objective: 'Avaliar integridade do tendão calcâneo (Aquiles)', region: 'tornozelo-pe', bilateral: true },
      { id: 'tor-squeeze', name: 'Squeeze Test / Kleiger (Sindesmose)', objective: 'Investigar lesão da sindesmose tibiofibular distal', region: 'tornozelo-pe', bilateral: true },
      { id: 'pe-windlass', name: 'Teste de Windlass', objective: 'Investigar fascite plantar', region: 'tornozelo-pe', bilateral: true },
      { id: 'pe-tinel', name: 'Sinal de Tinel no Túnel do Tarso', objective: 'Investigar compressão do nervo tibial posterior', region: 'tornozelo-pe', bilateral: true },
    ],
  },
};

export const ORTHOPEDIC_REGION_LIST = Object.values(ORTHOPEDIC_REGIONS);
