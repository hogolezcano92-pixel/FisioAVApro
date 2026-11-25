import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url';
import { SPECIALTIES } from '../data/specialties';
import { AssessmentRecord, PatientRecord, SpecialtyId } from '../types/clinical';
import { createNewAssessment, generateUuid } from './calculations';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const FIELD_LABELS = [
  'Paciente', 'Data da Avaliação', 'Data de Nascimento', 'Idade', 'Sexo', 'Documento', 'Telefone',
  'Ocupação', 'Modalidade', 'Dominância', 'Peso / Altura', 'Queixa Principal',
  'História da Doença Atual (HDA)', 'História Clínica e Comorbidades',
  'Diagnóstico Médico Informado', 'Histórico Cirúrgico e Traumático', 'Medicamentos em Uso',
  'Exames Complementares', 'Achados Clínicos Relevantes',
  'Limitações Funcionais e Restrições de Participação', 'Diagnóstico Cinético-Funcional',
  'Objetivos Terapêuticos — Curto Prazo', 'Objetivos Terapêuticos — Médio Prazo',
  'Objetivos Terapêuticos — Longo Prazo', 'Plano de Tratamento e Condutas Fisioterapêuticas',
  'Frequência e Duração Prevista', 'Precauções e Contraindicações', 'Prognóstico Funcional',
  'Orientações ao Paciente / Família', 'Observações Gerais', 'Simetria em Repouso',
  'Avaliação de Proteção Ocular', 'Controle Motor Seletivo', 'Sincinesias e Contraturas',
  'Sensibilidade Facial, Fala e Mastigação', 'Data de Início', 'Lado Afetado',
  'Evolução', 'Diagnóstico Médico', 'Episódios Anteriores', 'Dor Retroauricular',
  'Alterações de Paladar', 'Lacrimejamento / Salivação', 'Frequência Cardíaca', 'Pressão Arterial',
  'Frequência Respiratória', 'SpO2', 'Temperatura', 'Borg Dispneia / Esforço',
  'EVA (0–10)', 'END (0–10)', 'Localização', 'Frequência / Duração', 'Características',
  'Fatores Agravantes / Alívio', 'Impacto no Sono e Funcionalidade',
];

const normalize = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

function decodeBase64Utf8(value: string): string {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeDate(value: string): string {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value.trim();
}

function readField(lines: string[], label: string, boundaries: string[]): string {
  const target = normalize(label);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    const normalizedLine = normalize(line);
    const inlinePrefix = `${target}:`;
    if (normalizedLine.startsWith(inlinePrefix)) {
      return line.slice(line.indexOf(':') + 1).trim();
    }
    if (normalizedLine === target) {
      const values: string[] = [];
      for (let next = index + 1; next < lines.length; next += 1) {
        const candidate = lines[next].trim();
        if (!candidate) continue;
        const normalizedCandidate = normalize(candidate);
        if (
          boundaries.some((boundary) => normalizedCandidate === normalize(boundary) ||
            normalizedCandidate.startsWith(`${normalize(boundary)}:`)) ||
          /^\d+\s*[.)-]\s/.test(candidate) ||
          /^(avaliação fisioterapêutica|diagnóstico cinético-funcional)/i.test(candidate)
        ) break;
        values.push(candidate);
      }
      return values.join('\n').trim();
    }
  }
  return '';
}

function isAssessmentPayload(value: unknown): value is AssessmentRecord {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<AssessmentRecord>;
  return Boolean(
    item.identification && item.baseAnamnesis && item.synthesis &&
    item.specialtyId && item.pain && item.vitalSigns &&
    Array.isArray(item.goniometry) && Array.isArray(item.strength)
  );
}

export interface AssessmentPdfImportResult {
  assessment: AssessmentRecord;
  extractedText: string;
  mode: 'dados_estruturados' | 'leitura_textual';
  recognizedFields: number;
}

export async function parseAssessmentPdf(
  file: File,
  patient: PatientRecord
): Promise<AssessmentPdfImportResult> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Selecione um arquivo PDF válido.');
  }
  if (file.size > 25 * 1024 * 1024) {
    throw new Error('O PDF ultrapassa o limite de 25 MB.');
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const metadata = await pdf.getMetadata().catch(() => null);
  const keywords = String(metadata?.info?.Keywords ?? '');
  const payloadMatch = keywords.match(/FISIOAVAPRO_ASSESSMENT_V1:([A-Za-z0-9+/=]+)/);

  if (payloadMatch?.[1]) {
    try {
      const parsed: unknown = JSON.parse(decodeBase64Utf8(payloadMatch[1]));
      if (isAssessmentPayload(parsed)) {
        const assessment: AssessmentRecord = {
          ...parsed,
          id: generateUuid(),
          patientId: patient.id,
          identification: { ...parsed.identification, fullName: parsed.identification.fullName || patient.fullName },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        return {
          assessment,
          extractedText: '',
          mode: 'dados_estruturados',
          recognizedFields: Object.values(assessment).filter((value) => value !== null && value !== '').length,
        };
      }
    } catch {
      // An invalid or edited metadata payload falls back to text extraction below.
    }
  }

  const pageLines: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const items = content.items as Array<{ str?: string }>;
    items.forEach((item) => {
      const text = String(item.str ?? '').trim();
      if (text) pageLines.push(text);
    });
  }
  const extractedText = pageLines.join('\n');
  if (extractedText.replace(/\s/g, '').length < 40) {
    throw new Error('Este PDF parece ser digitalizado como imagem ou não contém texto selecionável. É necessário OCR; esta versão não utiliza IA e ainda não processa PDFs escaneados.');
  }

  const specialty = SPECIALTIES.find((item) =>
    normalize(extractedText).includes(normalize(`${item.code}. ${item.name}`))
  );
  if (!specialty) {
    throw new Error('Não foi possível identificar a especialidade. Importe um PDF de avaliação gerado pelo FisioAVApro.');
  }

  const assessment = createNewAssessment(specialty.id as SpecialtyId, patient);
  const allLabels = [...FIELD_LABELS, ...specialty.anamnesisFields.map((field) => field.label), ...specialty.physicalExamFields.map((field) => field.label)];
  const get = (label: string) => readField(pageLines, label, allLabels);
  const identification = assessment.identification;
  const fields: Array<[keyof typeof identification, string]> = [
    ['fullName', get('Paciente')],
    ['birthDate', encodeDate(get('Data de Nascimento'))],
    ['age', get('Idade').replace(/\s*anos?/i, '')],
    ['sex', get('Sexo')],
    ['documentId', get('Documento')],
    ['phone', get('Telefone')],
    ['occupation', get('Ocupação')],
    ['evaluationDate', encodeDate(get('Data da Avaliação'))],
    ['attendanceMode', get('Modalidade')],
    ['dominance', get('Dominância')],
  ];
  fields.forEach(([key, value]) => {
    if (value) (identification as unknown as Record<string, unknown>)[key] = value;
  });
  const weightHeight = get('Peso / Altura').match(/([\d,.]+)\s*kg\s*\/\s*([\d,.]+)\s*cm/i);
  if (weightHeight) {
    identification.weightKg = weightHeight[1].replace(',', '.');
    identification.heightCm = weightHeight[2].replace(',', '.');
  }

  assessment.baseAnamnesis.chiefComplaint = get('Queixa Principal');
  assessment.baseAnamnesis.hma = get('História da Doença Atual (HDA)');
  assessment.baseAnamnesis.clinicalHistory = get('História Clínica e Comorbidades');
  assessment.baseAnamnesis.medicalDiagnosis = get('Diagnóstico Médico Informado');
  assessment.baseAnamnesis.surgicalTraumaticHistory = get('Histórico Cirúrgico e Traumático');
  assessment.baseAnamnesis.medications = get('Medicamentos em Uso');
  assessment.baseAnamnesis.complementaryExams = get('Exames Complementares');

  assessment.synthesis.clinicalFindings = get('Achados Clínicos Relevantes');
  assessment.synthesis.functionalLimitations = get('Limitações Funcionais e Restrições de Participação');
  assessment.synthesis.kineticFunctionalDiagnosis = get('Diagnóstico Cinético-Funcional');
  assessment.synthesis.shortTermGoals = get('Objetivos Terapêuticos — Curto Prazo');
  assessment.synthesis.mediumTermGoals = get('Objetivos Terapêuticos — Médio Prazo');
  assessment.synthesis.longTermGoals = get('Objetivos Terapêuticos — Longo Prazo');
  assessment.synthesis.treatmentPlan = get('Plano de Tratamento e Condutas Fisioterapêuticas');
  assessment.synthesis.frequencyAndDuration = get('Frequência e Duração Prevista');
  assessment.synthesis.precautionsAndContraindications = get('Precauções e Contraindicações');
  assessment.synthesis.functionalPrognosis = get('Prognóstico Funcional');
  assessment.synthesis.patientGuidance = get('Orientações ao Paciente / Família');
  assessment.synthesis.observations = get('Observações Gerais');

  const vitalMap: Array<[keyof typeof assessment.vitalSigns, string]> = [
    ['heartRateBpm', get('Frequência Cardíaca').replace(/\s*bpm/i, '')],
    ['bloodPressureMmHg', get('Pressão Arterial').replace(/\s*mmHg/i, '')],
    ['respiratoryRateRpm', get('Frequência Respiratória').replace(/\s*irpm/i, '')],
    ['spo2Percent', get('SpO2').replace(/\s*%/i, '')],
    ['temperatureC', get('Temperatura').replace(/\s*°?C/i, '')],
  ];
  vitalMap.forEach(([key, value]) => {
    if (value) assessment.vitalSigns[key] = value;
  });
  const eva = get('EVA (0–10)').match(/[\d,.]+/);
  const end = get('END (0–10)').match(/[\d,.]+/);
  if (eva) assessment.pain.evaScore = Number(eva[0].replace(',', '.'));
  if (end) assessment.pain.endScore = Number(end[0].replace(',', '.'));
  assessment.pain.location = get('Localização');
  assessment.pain.frequency = get('Frequência / Duração');
  assessment.pain.characteristic = get('Características').split(',').map((item) => item.trim()).filter(Boolean);
  assessment.pain.aggravatingFactors = get('Fatores Agravantes / Alívio');
  assessment.pain.functionalImpact = get('Impacto no Sono e Funcionalidade');

  specialty.anamnesisFields.forEach((field) => {
    const value = get(field.label);
    if (value) assessment.customAnamnesis[field.id] = value;
  });
  specialty.physicalExamFields.forEach((field) => {
    const value = get(field.label);
    if (value) assessment.customPhysicalExam[field.id] = value;
  });

  if (assessment.facialPalsy) {
    assessment.facialPalsy.restingSymmetry = get('Simetria em Repouso');
    assessment.facialPalsy.eyeProtection = get('Avaliação de Proteção Ocular');
    assessment.facialPalsy.selectiveControl = get('Controle Motor Seletivo');
    assessment.facialPalsy.synkinesisNotes = get('Sincinesias e Contraturas');
    assessment.facialPalsy.facialSensitivity = get('Sensibilidade Facial, Fala e Mastigação');
  }

  const recognizedFields = [
    ...Object.values(identification),
    ...Object.values(assessment.baseAnamnesis),
    ...Object.values(assessment.synthesis),
    ...Object.values(assessment.customAnamnesis),
    ...Object.values(assessment.customPhysicalExam),
  ].filter((value) => typeof value === 'string' && value.trim().length > 0).length;

  if (!identification.fullName) identification.fullName = patient.fullName;
  if (!identification.evaluationDate) identification.evaluationDate = new Date().toISOString().slice(0, 10);
  return { assessment, extractedText, mode: 'leitura_textual', recognizedFields };
}
