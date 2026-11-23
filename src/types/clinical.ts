export type SpecialtyId =
  | 'ortopedia'
  | 'neurologia-adulto'
  | 'paralisia-facial'
  | 'geriatria'
  | 'cardiorrespiratoria'
  | 'pediatria'
  | 'respiratoria-pediatrica'
  | 'esportiva'
  | 'reumatologia'
  | 'dermatofuncional'
  | 'pelvica'
  | 'saude-mulher'
  | 'vestibular'
  | 'oncologica'
  | 'uti-hospitalar'
  | 'vascular-linfatica'
  | 'amputados'
  | 'bucomaxilofacial-atm'
  | 'mao'
  | 'trabalho-ergonomia'
  | 'aquatica'
  | 'dor-reabilitacao';

export type SpecialtyCategory =
  | 'Todas'
  | 'Musculoesquelética'
  | 'Neurofuncional'
  | 'Cardiorrespiratória e Hospitalar'
  | 'Saúde da Mulher e Ciclos de Vida'
  | 'Especialidades Clínicas';

export type EvaluationStatus = 'avaliado' | 'nao_avaliado' | 'nao_aplicavel';

export type AssessmentStepId =
  | 'identificacao'
  | 'anamnese'
  | 'avaliacao'
  | 'testes'
  | 'resultados'
  | 'diagnostico'
  | 'objetivos'
  | 'plano'
  | 'relatorio';

export type OrthopedicRegionId =
  | 'cervical'
  | 'toracica'
  | 'lombar'
  | 'ombro'
  | 'cotovelo'
  | 'punho-mao'
  | 'quadril'
  | 'joelho'
  | 'tornozelo-pe';

export interface FieldDefinition {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'number' | 'date' | 'checkbox-group' | 'boolean';
  placeholder?: string;
  options?: string[];
  unit?: string;
  section?: string;
  helperText?: string;
}

export interface GoniometryMovementTemplate {
  id: string;
  joint: string;
  movement: string;
  normalRange: string;
  region?: OrthopedicRegionId;
}

export interface StrengthMuscleTemplate {
  id: string;
  muscleOrGroup: string;
  nerveRoot?: string;
  region?: OrthopedicRegionId;
}

export interface SpecialTestTemplate {
  id: string;
  name: string;
  objective: string;
  region?: OrthopedicRegionId;
  bilateral?: boolean;
}

export interface SpecialtyDefinition {
  id: SpecialtyId;
  code: string;
  name: string;
  shortName: string;
  category: Exclude<SpecialtyCategory, 'Todas'>;
  description: string;
  iconName: string;
  includeAnthropometrics: boolean;
  includePainScale: boolean;
  includeVitalSigns: boolean;
  includeGoniometry: boolean;
  includeStrength: boolean;
  includePerimetry: boolean;
  includeOrthopedicRegions?: boolean;
  anamnesisFields: FieldDefinition[];
  physicalExamFields: FieldDefinition[];
  goniometryTemplates: GoniometryMovementTemplate[];
  strengthTemplates: StrengthMuscleTemplate[];
  perimetryPoints: string[];
  specialTests: SpecialTestTemplate[];
  recommendedScaleIds: string[];
  clinicalAlerts?: string[];
}

export interface PatientIdentification {
  fullName: string;
  birthDate: string;
  age: string;
  sex: 'Masculino' | 'Feminino' | 'Outro' | 'Não informado' | '';
  documentId: string;
  phone: string;
  occupation: string;
  guardianName?: string;
  guardianRelation?: string;
  evaluationDate: string;
  attendanceMode: 'Consultório / Clínica' | 'Domiciliar' | 'Hospitalar / UTI' | 'Aquático' | 'Laboral / In Loco' | '';
  weightKg: string;
  heightCm: string;
  dominance: 'Destro' | 'Canhoto' | 'Ambidestro' | 'Não avaliado' | '';
  photoConsent: 'Autorizado' | 'Não autorizado' | 'Não aplicável' | '';
  lgpdAcknowledged: boolean;
}

export interface ClinicalBaseAnamnesis {
  chiefComplaint: string;
  hma: string;
  clinicalHistory: string;
  medicalDiagnosis: string;
  medications: string;
  complementaryExams: string;
  surgicalTraumaticHistory: string;
}

export interface PainData {
  status: EvaluationStatus;
  evaScore: number | null;
  endScore: number | null;
  location: string;
  characteristic: string[];
  frequency: string;
  duration: string;
  aggravatingFactors: string;
  relievingFactors: string;
  sleepImpact: string;
  functionalImpact: string;
}

export interface VitalSignsData {
  status: EvaluationStatus;
  heartRateBpm: string;
  bloodPressureMmHg: string;
  respiratoryRateRpm: string;
  spo2Percent: string;
  temperatureC: string;
  borgDispnea: string;
  borgEffort: string;
}

export interface GoniometryEntry {
  id: string;
  joint: string;
  movement: string;
  normalRange: string;
  activeRight: string;
  activeLeft: string;
  passiveRight: string;
  passiveLeft: string;
  status: EvaluationStatus;
  notes: string;
}

export interface StrengthEntry {
  id: string;
  muscleOrGroup: string;
  mrcRight: string;
  mrcLeft: string;
  status: EvaluationStatus;
  notes: string;
}

export interface PerimetryEntry {
  id: string;
  point: string;
  rightCm: string;
  leftCm: string;
  status: EvaluationStatus;
  notes: string;
}

export interface SpecialTestResult {
  id: string;
  name: string;
  resultRight: 'Positivo' | 'Negativo' | 'Inconclusivo' | 'Não avaliado' | 'Não aplicável' | '';
  resultLeft?: 'Positivo' | 'Negativo' | 'Inconclusivo' | 'Não avaliado' | 'Não aplicável' | '';
  resultSingle?: 'Positivo' | 'Negativo' | 'Inconclusivo' | 'Não avaliado' | 'Não aplicável' | '';
  notes: string;
}

export interface ScaleEntry {
  scaleId: string;
  status: EvaluationStatus;
  score: string;
  interpretation: string;
  subScores: Record<string, string | number>;
  notes: string;
}

export interface FacialItemEntry {
  id: string;
  label: string;
  rightStatus: string;
  leftStatus: string;
  notes: string;
}

export interface FacialPalsyData {
  onsetDate: string;
  affectedSide: 'Direita' | 'Esquerda' | 'Bilateral' | 'Não definido' | '';
  evolution: string;
  medicalDiagnosis: string;
  treatmentsAndMeds: string;
  infectionHistory: string;
  retroauricularPain: string;
  tasteChanges: string;
  lacrimation: string;
  salivationChanges: string;
  functionalDifficulties: string;
  previousEpisodes: string;
  incompleteEyeClosure: boolean;
  absentBellPhenomenon: boolean;
  cornealPainOrDryness: boolean;
  centralNeuroFlags: boolean;
  cornealAlertNotes: string;
  restingSymmetry: string;
  eyeProtection: string;
  selectiveControl: string;
  synkinesisNotes: string;
  contracturesNotes: string;
  facialSensitivity: string;
  speechArticulation: string;
  chewingLipSeal: string;
  photoRecordNotes: string;
  items: FacialItemEntry[];
  sunnybrookResting: {
    eye: number;
    cheek: number;
    mouth: number;
  };
  sunnybrookVoluntary: {
    forehead: number;
    eyeClosure: number;
    openMouthSmile: number;
    snarl: number;
    lipPucker: number;
  };
  sunnybrookSynkinesis: {
    forehead: number;
    eyeClosure: number;
    openMouthSmile: number;
    snarl: number;
    lipPucker: number;
  };
}

export interface PelvicConsentData {
  intimateAssessmentStatus:
    | 'Realizada com consentimento específico'
    | 'Não realizada - sem consentimento'
    | 'Não indicada - avaliação externa apenas'
    | 'Não avaliada'
    | '';
  consentSignedByPatient: boolean;
  consentNotes: string;
  oxfordGrade: string;
  perfectP: string;
  perfectE: string;
  perfectR: string;
  perfectF: string;
  perfectECT: string;
  coordination: string;
  relaxationCapacity: string;
}

export interface CardiorespiratoryMonitoringData {
  contraindications: string;
  interruptionCriteria: string;
  intercurrences: string;
  tc6mDistanceM: string;
  tc6mPredictedM: string;
  tc6mPreVitals: string;
  tc6mPeakVitals: string;
  tc6mPostVitals: string;
  sitToStandReps: string;
  sitToStandPreVitals: string;
  sitToStandPostVitals: string;
  pimaxCmH2O: string;
  pemaxCmH2O: string;
  peakFlowLMin: string;
}

export interface UtiClinicalData {
  glasgowEye: number;
  glasgowVerbal: number;
  glasgowMotor: number;
  ventMode: string;
  fio2Percent: string;
  peepCmH2O: string;
  pressureSupportOrVt: string;
  abgPh: string;
  abgPao2: string;
  abgPaco2: string;
  abgHco3: string;
  abgLactato: string;
  mrcGroups: Record<string, { right: number | null; left: number | null }>;
  imsScore: string;
  safetyCriteriaMet: string;
}

export interface AssessmentSynthesis {
  clinicalFindings: string;
  functionalLimitations: string;
  kineticFunctionalDiagnosis: string;
  shortTermGoals: string;
  mediumTermGoals: string;
  longTermGoals: string;
  treatmentPlan: string;
  frequencyAndDuration: string;
  precautionsAndContraindications: string;
  functionalPrognosis: string;
  patientGuidance: string;
  observations: string;
}

export interface AssessmentRecord {
  id: string;
  specialtyId: SpecialtyId;
  createdAt: string;
  updatedAt: string;
  selectedOrthopedicRegions: OrthopedicRegionId[];
  identification: PatientIdentification;
  baseAnamnesis: ClinicalBaseAnamnesis;
  customAnamnesis: Record<string, string | string[] | boolean>;
  pain: PainData;
  vitalSigns: VitalSignsData;
  customPhysicalExam: Record<string, string | string[] | boolean>;
  goniometry: GoniometryEntry[];
  strength: StrengthEntry[];
  perimetry: PerimetryEntry[];
  specialTests: Record<string, SpecialTestResult>;
  scales: Record<string, ScaleEntry>;
  facialPalsy?: FacialPalsyData;
  pelvicConsent?: PelvicConsentData;
  cardioMonitoring?: CardiorespiratoryMonitoringData;
  utiData?: UtiClinicalData;
  synthesis: AssessmentSynthesis;
}

export interface ReassessmentComparisonItem {
  id: string;
  domain: 'Dor' | 'Amplitude de Movimento' | 'Força Muscular' | 'Equilíbrio' | 'Funcionalidade' | 'Escala / Teste' | 'Perimetria';
  parameter: string;
  initialValue: string;
  currentValue: string;
  deltaNotes: string;
}

export interface ReassessmentRecord {
  id: string;
  linkedAssessmentId: string | null;
  specialtyId: SpecialtyId;
  patientName: string;
  evaluationDate: string;
  initialDate: string;
  clinicalEvolutionSummary: string;
  painInitialEva: string;
  painCurrentEva: string;
  romComparisonNotes: string;
  strengthComparisonNotes: string;
  balanceComparisonNotes: string;
  functionalityComparisonNotes: string;
  comparisons: ReassessmentComparisonItem[];
  achievedGoals: string;
  pendingGoals: string;
  newKineticDiagnosis: string;
  newTreatmentPlan: string;
  observations: string;
}

export interface EvolutionExerciseEntry {
  id: string;
  exercise: string;
  sets: string;
  reps: string;
  timeOrLoad: string;
  intensity: string;
}

export interface DailyEvolutionRecord {
  id: string;
  patientName: string;
  specialtyId: SpecialtyId;
  date: string;
  time: string;
  reportedComplaint: string;
  initialClinicalCondition: string;
  vitalSignsBefore: string;
  vitalSignsAfter: string;
  proceduresPerformed: string;
  exercises: EvolutionExerciseEntry[];
  resourcesUsed: string;
  patientResponse: string;
  intercurrences: string;
  endingCondition: string;
  guidance: string;
  observations: string;
}

export interface InstrumentItem {
  id: string;
  name: string;
  specialtyArea: string;
  applicableSpecialtyIds: SpecialtyId[];
  objective: string;
  instructions: string;
  scoringGuide: string;
  interpretation: string;
  reference: string;
  licensingNote?: string;
  calculatorType?:
    | 'eva-end'
    | 'mrc'
    | 'ashworth'
    | 'house-brackmann'
    | 'sunnybrook'
    | 'barthel'
    | 'berg'
    | 'tug'
    | 'sppb'
    | 'lawton-brody'
    | 'borg'
    | 'mmrc'
    | 'glasgow'
    | 'ims'
    | 'oxford'
    | 'dhi'
    | 'direct-score';
}
