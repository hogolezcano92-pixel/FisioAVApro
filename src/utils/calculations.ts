import { ORTHOPEDIC_REGIONS } from '../data/orthopedicRegions';
import { SPECIALTIES_BY_ID } from '../data/specialties';
import {
  AssessmentRecord,
  FacialPalsyData,
  GoniometryEntry,
  OrthopedicRegionId,
  PerimetryEntry,
  ScaleEntry,
  SpecialtyId,
  StrengthEntry,
} from '../types/clinical';

export const PROFESSIONAL_INFO = {
  appName: 'FISIO ASSESSMENT PRO',
  therapistName: 'Hugo Armando Lezcano Gonzalez',
  crefito: 'CREFITO-3 461983-F',
  website: 'https://lezcanofisioterapia.com.br',
  instagram: '@oficial_hugolezcano.fisio',
};

export function calculateIMC(weightKg: string, heightCm: string): { value: string; classification: string } | null {
  const w = parseFloat(weightKg.replace(',', '.'));
  const hCm = parseFloat(heightCm.replace(',', '.'));
  if (!w || !hCm || w <= 0 || hCm <= 0) return null;
  const hM = hCm > 3 ? hCm / 100 : hCm;
  if (hM <= 0) return null;
  const imc = w / (hM * hM);
  const rounded = imc.toFixed(1);
  let classification = '';
  if (imc < 18.5) classification = 'Baixo peso';
  else if (imc < 25) classification = 'Eutrofia (faixa de referência)';
  else if (imc < 30) classification = 'Sobrepeso';
  else if (imc < 35) classification = 'Obesidade grau I';
  else if (imc < 40) classification = 'Obesidade grau II';
  else classification = 'Obesidade grau III';
  return { value: rounded, classification };
}

export function calculatePerimetryDiff(rightCm: string, leftCm: string): { diff: string; absDiff: number } | null {
  const r = parseFloat(rightCm.replace(',', '.'));
  const l = parseFloat(leftCm.replace(',', '.'));
  if (Number.isNaN(r) || Number.isNaN(l)) return null;
  const d = r - l;
  const sign = d > 0 ? '+' : '';
  return { diff: `${sign}${d.toFixed(1)} cm`, absDiff: Math.abs(d) };
}

export function calculateSunnybrookScore(fp: FacialPalsyData): {
  restingTotal: number;
  voluntaryTotal: number;
  synkinesisTotal: number;
  composite: number;
} {
  const restingSum = fp.sunnybrookResting.eye + fp.sunnybrookResting.cheek + fp.sunnybrookResting.mouth;
  const restingTotal = restingSum * 5;

  const voluntarySum =
    fp.sunnybrookVoluntary.forehead +
    fp.sunnybrookVoluntary.eyeClosure +
    fp.sunnybrookVoluntary.openMouthSmile +
    fp.sunnybrookVoluntary.snarl +
    fp.sunnybrookVoluntary.lipPucker;
  const voluntaryTotal = voluntarySum * 4;

  const synkinesisTotal =
    fp.sunnybrookSynkinesis.forehead +
    fp.sunnybrookSynkinesis.eyeClosure +
    fp.sunnybrookSynkinesis.openMouthSmile +
    fp.sunnybrookSynkinesis.snarl +
    fp.sunnybrookSynkinesis.lipPucker;

  const composite = Math.max(0, Math.min(100, voluntaryTotal - restingTotal - synkinesisTotal));
  return { restingTotal, voluntaryTotal, synkinesisTotal, composite };
}

export function calculateMrcSumScore(
  mrcGroups: Record<string, { right: number | null; left: number | null }>
): { total: number; evaluatedCount: number } {
  let total = 0;
  let evaluatedCount = 0;
  Object.values(mrcGroups).forEach((pair) => {
    if (pair.right !== null && pair.right !== undefined) {
      total += pair.right;
      evaluatedCount++;
    }
    if (pair.left !== null && pair.left !== undefined) {
      total += pair.left;
      evaluatedCount++;
    }
  });
  return { total, evaluatedCount };
}

export function calculateLsi(affectedStr: string, unaffectedStr: string): string | null {
  const a = parseFloat(affectedStr.replace(',', '.'));
  const u = parseFloat(unaffectedStr.replace(',', '.'));
  if (!a || !u || u <= 0) return null;
  return `${((a / u) * 100).toFixed(1)}%`;
}

export function createInitialFacialPalsyData(): FacialPalsyData {
  return {
    onsetDate: '',
    affectedSide: '',
    evolution: '',
    medicalDiagnosis: '',
    treatmentsAndMeds: '',
    infectionHistory: '',
    retroauricularPain: '',
    tasteChanges: '',
    lacrimation: '',
    salivationChanges: '',
    functionalDifficulties: '',
    previousEpisodes: '',
    incompleteEyeClosure: false,
    absentBellPhenomenon: false,
    cornealPainOrDryness: false,
    centralNeuroFlags: false,
    cornealAlertNotes: '',
    restingSymmetry: '',
    eyeProtection: '',
    selectiveControl: '',
    synkinesisNotes: '',
    contracturesNotes: '',
    facialSensitivity: '',
    speechArticulation: '',
    chewingLipSeal: '',
    photoRecordNotes: '',
    items: [
      { id: 'fp-repouso', label: 'Simetria em repouso (fenda palpebral, sulco nasolabial, comissura)', rightStatus: '', leftStatus: '', notes: '' },
      { id: 'fp-sobrancelha', label: 'Elevação das sobrancelhas / Franzimento da testa (Frontal)', rightStatus: '', leftStatus: '', notes: '' },
      { id: 'fp-olho-suave', label: 'Fechamento ocular suave (Orbicular dos olhos)', rightStatus: '', leftStatus: '', notes: '' },
      { id: 'fp-olho-forcado', label: 'Fechamento ocular forçado e piscar espontâneo', rightStatus: '', leftStatus: '', notes: '' },
      { id: 'fp-sorriso-esp', label: 'Sorriso espontâneo e sorriso voluntário (Zigomáticos / Risório)', rightStatus: '', leftStatus: '', notes: '' },
      { id: 'fp-exposicao-dent', label: 'Exposição dentária e elevação do lábio superior (Levantador do lábio)', rightStatus: '', leftStatus: '', notes: '' },
      { id: 'fp-bico', label: 'Protrusão labial / Bico (Orbicular da boca)', rightStatus: '', leftStatus: '', notes: '' },
      { id: 'fp-bochechas', label: 'Insuflação das bochechas e retenção de ar (Bucinador)', rightStatus: '', leftStatus: '', notes: '' },
      { id: 'fp-labios-bochechas', label: 'Movimentação combinada de lábios e bochechas', rightStatus: '', leftStatus: '', notes: '' },
    ],
    sunnybrookResting: { eye: 0, cheek: 0, mouth: 0 },
    sunnybrookVoluntary: { forehead: 5, eyeClosure: 5, openMouthSmile: 5, snarl: 5, lipPucker: 5 },
    sunnybrookSynkinesis: { forehead: 0, eyeClosure: 0, openMouthSmile: 0, snarl: 0, lipPucker: 0 },
  };
}

export function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function calculateAgeFromBirthDate(birthDate: string): string {
  if (!birthDate) return '';
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return '';
  const today = new Date();
  let years = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    years--;
  }
  if (years < 0) return '';
  if (years === 0) {
    let months =
      (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
    if (today.getDate() < birth.getDate()) months--;
    return `${Math.max(0, months)} ${months === 1 ? 'mês' : 'meses'}`;
  }
  return `${years} ${years === 1 ? 'ano' : 'anos'}`;
}

export const TREATMENT_STATUS_LABELS: Record<
  import('../types/clinical').TreatmentStatus,
  string
> = {
  em_avaliacao: 'Em avaliação',
  em_acompanhamento: 'Em acompanhamento',
  alta: 'Alta fisioterapêutica',
  pausado: 'Pausado / Suspenso',
  encaminhado: 'Encaminhado',
};

export const DOCUMENT_TYPE_LABELS: Record<
  import('../types/clinical').ClinicalDocumentType,
  string
> = {
  avaliacao_inicial: 'Avaliação Fisioterapêutica',
  ficha_anamnese: 'Ficha de Anamnese',
  relatorio_fisioterapeutico: 'Relatório Fisioterapêutico',
  evolucao_clinica: 'Evolução Clínica',
  reavaliacao_funcional: 'Reavaliação Funcional',
  relatorio_comparativo: 'Relatório Comparativo',
  plano_terapeutico: 'Plano Terapêutico',
  relatorio_alta: 'Relatório de Alta',
  encaminhamento: 'Encaminhamento',
  declaracao_outros: 'Declaração / Outros',
};

export function createNewAssessment(
  specialtyId: SpecialtyId,
  patient?: import('../types/clinical').PatientRecord
): AssessmentRecord {
  const spec = SPECIALTIES_BY_ID[specialtyId];
  const today = new Date().toISOString().split('T')[0];

  const goniometry: GoniometryEntry[] = spec.goniometryTemplates.map((t) => ({
    id: t.id,
    joint: t.joint,
    movement: t.movement,
    normalRange: t.normalRange,
    activeRight: '',
    activeLeft: '',
    passiveRight: '',
    passiveLeft: '',
    status: 'avaliado',
    notes: '',
  }));

  const strength: StrengthEntry[] = spec.strengthTemplates.map((t) => ({
    id: t.id,
    muscleOrGroup: t.muscleOrGroup,
    mrcRight: '',
    mrcLeft: '',
    status: 'avaliado',
    notes: '',
  }));

  const perimetry: PerimetryEntry[] = spec.perimetryPoints.map((pt, idx) => ({
    id: `peri-${idx}`,
    point: pt,
    rightCm: '',
    leftCm: '',
    status: 'avaliado',
    notes: '',
  }));

  const scales: Record<string, ScaleEntry> = {};
  spec.recommendedScaleIds.forEach((sId) => {
    scales[sId] = {
      scaleId: sId,
      status: 'nao_avaliado',
      score: '',
      interpretation: '',
      subScores: {},
      notes: '',
    };
  });

  return {
    id: generateUuid(),
    patientId: patient?.id,
    isInitial: true,
    specialtyId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    selectedOrthopedicRegions: [],
    identification: {
      fullName: patient?.fullName ?? '',
      birthDate: patient?.birthDate ?? '',
      age: patient?.birthDate ? calculateAgeFromBirthDate(patient.birthDate) : '',
      sex: patient?.sex ?? '',
      documentId: patient?.cpf ?? '',
      phone: patient?.phone ?? '',
      occupation: '',
      guardianName: '',
      guardianRelation: '',
      evaluationDate: today,
      attendanceMode: 'Consultório / Clínica',
      weightKg: '',
      heightCm: '',
      dominance: '',
      photoConsent: 'Não aplicável',
      lgpdAcknowledged: patient?.lgpdConsent ?? true,
    },
    baseAnamnesis: {
      chiefComplaint: '',
      hma: '',
      clinicalHistory: [patient?.clinicalHistory, patient?.comorbidities].filter(Boolean).join('\n'),
      medicalDiagnosis: patient?.medicalDiagnosis ?? '',
      medications: patient?.medications ?? '',
      complementaryExams: '',
      surgicalTraumaticHistory: '',
    },
    customAnamnesis: {},
    pain: {
      status: spec.includePainScale ? 'avaliado' : 'nao_aplicavel',
      evaScore: null,
      endScore: null,
      location: '',
      characteristic: [],
      frequency: '',
      duration: '',
      aggravatingFactors: '',
      relievingFactors: '',
      sleepImpact: '',
      functionalImpact: '',
    },
    vitalSigns: {
      status: spec.includeVitalSigns ? 'avaliado' : 'nao_aplicavel',
      heartRateBpm: '',
      bloodPressureMmHg: '',
      respiratoryRateRpm: '',
      spo2Percent: '',
      temperatureC: '',
      borgDispnea: '',
      borgEffort: '',
    },
    customPhysicalExam: {},
    goniometry,
    strength,
    perimetry,
    specialTests: {},
    scales,
    facialPalsy: specialtyId === 'paralisia-facial' ? createInitialFacialPalsyData() : undefined,
    pelvicConsent:
      specialtyId === 'pelvica'
        ? {
            intimateAssessmentStatus: '',
            consentSignedByPatient: false,
            consentNotes: '',
            oxfordGrade: '',
            perfectP: '',
            perfectE: '',
            perfectR: '',
            perfectF: '',
            perfectECT: '',
            coordination: '',
            relaxationCapacity: '',
          }
        : undefined,
    cardioMonitoring:
      specialtyId === 'cardiorrespiratoria'
        ? {
            contraindications: '',
            interruptionCriteria: '',
            intercurrences: '',
            tc6mDistanceM: '',
            tc6mPredictedM: '',
            tc6mPreVitals: '',
            tc6mPeakVitals: '',
            tc6mPostVitals: '',
            sitToStandReps: '',
            sitToStandPreVitals: '',
            sitToStandPostVitals: '',
            pimaxCmH2O: '',
            pemaxCmH2O: '',
            peakFlowLMin: '',
          }
        : undefined,
    utiData:
      specialtyId === 'uti-hospitalar'
        ? {
            glasgowEye: 4,
            glasgowVerbal: 5,
            glasgowMotor: 6,
            ventMode: '',
            fio2Percent: '',
            peepCmH2O: '',
            pressureSupportOrVt: '',
            abgPh: '',
            abgPao2: '',
            abgPaco2: '',
            abgHco3: '',
            abgLactato: '',
            mrcGroups: {
              'Abdução de ombro': { right: null, left: null },
              'Flexão de cotovelo': { right: null, left: null },
              'Extensão de punho': { right: null, left: null },
              'Flexão de quadril': { right: null, left: null },
              'Extensão de joelho': { right: null, left: null },
              'Dorsiflexão de tornozelo': { right: null, left: null },
            },
            imsScore: '',
            safetyCriteriaMet: '',
          }
        : undefined,
    synthesis: {
      clinicalFindings: '',
      functionalLimitations: '',
      kineticFunctionalDiagnosis: patient?.physiotherapyDiagnosis ?? '',
      shortTermGoals: '',
      mediumTermGoals: '',
      longTermGoals: '',
      treatmentPlan: '',
      frequencyAndDuration: '',
      precautionsAndContraindications: '',
      functionalPrognosis: '',
      patientGuidance: '',
      observations: '',
    },
  };
}

export function syncOrthopedicRegions(
  assessment: AssessmentRecord,
  regions: OrthopedicRegionId[]
): AssessmentRecord {
  const existingGonioMap = new Map(assessment.goniometry.map((g) => [g.id, g]));
  const existingStrengthMap = new Map(assessment.strength.map((s) => [s.id, s]));

  const goniometry: GoniometryEntry[] = [];
  const strength: StrengthEntry[] = [];

  regions.forEach((regionId) => {
    const reg = ORTHOPEDIC_REGIONS[regionId];
    if (!reg) return;
    reg.goniometry.forEach((t) => {
      const prev = existingGonioMap.get(t.id);
      goniometry.push(
        prev ?? {
          id: t.id,
          joint: t.joint,
          movement: t.movement,
          normalRange: t.normalRange,
          activeRight: '',
          activeLeft: '',
          passiveRight: '',
          passiveLeft: '',
          status: 'avaliado',
          notes: '',
        }
      );
    });
    reg.strength.forEach((t) => {
      const prev = existingStrengthMap.get(t.id);
      strength.push(
        prev ?? {
          id: t.id,
          muscleOrGroup: t.muscleOrGroup,
          mrcRight: '',
          mrcLeft: '',
          status: 'avaliado',
          notes: '',
        }
      );
    });
  });

  // Preserve custom entries added manually
  assessment.goniometry.forEach((g) => {
    if (g.id.startsWith('custom-')) goniometry.push(g);
  });
  assessment.strength.forEach((s) => {
    if (s.id.startsWith('custom-')) strength.push(s);
  });

  return {
    ...assessment,
    selectedOrthopedicRegions: regions,
    goniometry,
    strength,
  };
}

export function calculateAssessmentCompletion(assessment: AssessmentRecord): number {
  const checks: boolean[] = [
    assessment.identification.fullName.trim().length > 0,
    assessment.identification.evaluationDate.trim().length > 0,
    assessment.baseAnamnesis.chiefComplaint.trim().length > 0,
    assessment.baseAnamnesis.hma.trim().length > 0 || assessment.baseAnamnesis.clinicalHistory.trim().length > 0,
    Object.values(assessment.customPhysicalExam).some((v) =>
      Array.isArray(v) ? v.length > 0 : String(v ?? '').trim().length > 0
    ) ||
      Boolean(assessment.facialPalsy?.restingSymmetry || assessment.facialPalsy?.items.some((i) => i.rightStatus || i.leftStatus)) ||
      Boolean(assessment.utiData?.ventMode || assessment.utiData?.imsScore),
    assessment.synthesis.clinicalFindings.trim().length > 0 || assessment.synthesis.functionalLimitations.trim().length > 0,
    assessment.synthesis.kineticFunctionalDiagnosis.trim().length > 0,
    assessment.synthesis.shortTermGoals.trim().length > 0 || assessment.synthesis.longTermGoals.trim().length > 0,
    assessment.synthesis.treatmentPlan.trim().length > 0,
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

export function sanitizeFilePart(value: string, fallback: string): string {
  const clean = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return clean || fallback;
}

export function buildPdfFileName(
  prefix:
    | 'Avaliacao'
    | 'Reavaliacao'
    | 'Relatorio_Comparativo'
    | 'Evolucao'
    | 'Anamnese'
    | 'Plano_Terapeutico'
    | 'Relatorio_Fisioterapeutico'
    | 'Relatorio_Alta'
    | 'Encaminhamento'
    | 'Declaracao',
  patientName: string,
  specialtyName: string,
  dateStr: string
): string {
  const p = sanitizeFilePart(patientName, 'Paciente');
  const s = sanitizeFilePart(specialtyName, 'Fisioterapia');
  const d = sanitizeFilePart(dateStr || new Date().toISOString().split('T')[0], 'Data');
  return `${prefix}_${p}_${s}_${d}.pdf`;
}

export function formatDatePtBr(dateStr: string): string {
  if (!dateStr) return 'Não informada';
  const clean = dateStr.split('T')[0];
  const parts = clean.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

