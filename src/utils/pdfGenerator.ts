import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ORTHOPEDIC_REGIONS } from '../data/orthopedicRegions';
import { INSTRUMENTS_BY_ID } from '../data/scalesAndTests';
import { SPECIALTIES_BY_ID } from '../data/specialties';
import {
  AssessmentRecord,
  AppointmentRecord,
  DailyEvolutionRecord,
  PatientRecord,
  ReassessmentRecord,
  SpecialtyId,
  TreatmentPlanRecord,
} from '../types/clinical';
import {
  buildPdfFileName,
  calculateIMC,
  calculateMrcSumScore,
  calculatePerimetryDiff,
  calculateSunnybrookScore,
  formatDatePtBr,
  PROFESSIONAL_INFO,
} from './calculations';

const NAVY: [number, number, number] = [11, 31, 58];
const ROYAL: [number, number, number] = [29, 78, 216];
const SLATE_TEXT: [number, number, number] = [30, 41, 59];
const MUTED_TEXT: [number, number, number] = [100, 116, 139];
const BORDER_GRAY: [number, number, number] = [203, 213, 225];
const LIGHT_BG: [number, number, number] = [248, 250, 252];

class ClinicalPdfBuilder {
  doc: jsPDF;
  pageWidth: number;
  pageHeight: number;
  marginX = 15;
  topY = 36;
  bottomLimit = 272;
  y = 36;
  docTitle: string;
  specialtyLabel: string;
  patientName: string;
  evalDate: string;

  constructor(docTitle: string, specialtyLabel: string, patientName: string, evalDate: string) {
    this.doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.docTitle = docTitle;
    this.specialtyLabel = specialtyLabel;
    this.patientName = patientName || 'Paciente não identificado';
    this.evalDate = formatDatePtBr(evalDate);
  }

  setStructuredAssessmentPayload(assessment: AssessmentRecord) {
    const bytes = new TextEncoder().encode(JSON.stringify(assessment));
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    const encoded = btoa(binary);
    this.doc.setProperties({
      title: this.docTitle,
      subject: 'Avaliação fisioterapêutica estruturada — FisioAVApro',
      keywords: `FISIOAVAPRO_ASSESSMENT_V1:${encoded}`,
      creator: 'FisioAVApro',
    });
  }

  ensureSpace(neededMm: number) {
    if (this.y + neededMm > this.bottomLimit) {
      this.doc.addPage();
      this.y = this.topY;
    }
  }

  addSectionTitle(title: string) {
    this.ensureSpace(16);
    this.doc.setFillColor(...NAVY);
    this.doc.rect(this.marginX, this.y, 2.5, 5.5, 'F');
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10.5);
    this.doc.setTextColor(...NAVY);
    this.doc.text(title.toUpperCase(), this.marginX + 5, this.y + 4.3);
    this.doc.setDrawColor(...BORDER_GRAY);
    this.doc.setLineWidth(0.3);
    this.doc.line(this.marginX, this.y + 7, this.pageWidth - this.marginX, this.y + 7);
    this.y += 10.5;
  }

  addKeyValueGrid(pairs: Array<{ label: string; value: string }>) {
    const filtered = pairs.filter((p) => p.value && p.value.trim().length > 0);
    if (filtered.length === 0) return;

    const rows: string[][] = [];
    for (let i = 0; i < filtered.length; i += 2) {
      const a = filtered[i];
      const b = filtered[i + 1];
      rows.push([
        `${a.label}: ${a.value}`,
        b ? `${b.label}: ${b.value}` : '',
      ]);
    }

    autoTable(this.doc, {
      startY: this.y,
      margin: { left: this.marginX, right: this.marginX, top: this.topY, bottom: 24 },
      body: rows,
      theme: 'plain',
      styles: {
        fontSize: 8.8,
        textColor: SLATE_TEXT,
        cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 },
        lineColor: BORDER_GRAY,
        lineWidth: 0.15,
      },
      alternateRowStyles: { fillColor: LIGHT_BG },
      rowPageBreak: 'avoid',
      didParseCell: (data) => {
        if (data.cell.raw && typeof data.cell.raw === 'string') {
          data.cell.styles.fontStyle = 'normal';
        }
      },
    });
    this.y = (this.doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;
  }

  addTextBlock(label: string, value?: string) {
    if (!value || !value.trim()) return;
    const contentWidth = this.pageWidth - this.marginX * 2;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8.8);
    const labelLines = this.doc.splitTextToSize(label, contentWidth);
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    const valLines = this.doc.splitTextToSize(value.trim(), contentWidth - 4);
    const estHeight = labelLines.length * 4 + valLines.length * 4.3 + 5;

    if (estHeight < 70) {
      this.ensureSpace(estHeight);
    } else {
      this.ensureSpace(18);
    }

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8.8);
    this.doc.setTextColor(...ROYAL);
    this.doc.text(labelLines, this.marginX, this.y);
    this.y += labelLines.length * 4 + 1;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    this.doc.setTextColor(...SLATE_TEXT);
    for (const line of valLines) {
      this.ensureSpace(6);
      this.doc.text(line, this.marginX + 2, this.y);
      this.y += 4.3;
    }
    this.y += 3.2;
  }

  addAlertBox(title: string, items: string[]) {
    if (items.length === 0) return;
    const contentWidth = this.pageWidth - this.marginX * 2;
    const text = items.map((i) => `• ${i}`).join('\n');
    const lines = this.doc.splitTextToSize(text, contentWidth - 8);
    const boxHeight = 9 + lines.length * 4.2;
    this.ensureSpace(boxHeight + 4);

    this.doc.setFillColor(254, 242, 242);
    this.doc.setDrawColor(220, 38, 38);
    this.doc.setLineWidth(0.4);
    this.doc.roundedRect(this.marginX, this.y, contentWidth, boxHeight, 1.5, 1.5, 'FD');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.doc.setTextColor(185, 28, 28);
    this.doc.text(title, this.marginX + 4, this.y + 5.2);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8.5);
    this.doc.setTextColor(127, 29, 29);
    this.doc.text(lines, this.marginX + 4, this.y + 9.5);
    this.y += boxHeight + 5;
  }

  addTable(head: string[], body: string[][]) {
    if (body.length === 0) return;
    this.ensureSpace(18);
    autoTable(this.doc, {
      startY: this.y,
      margin: { left: this.marginX, right: this.marginX, top: this.topY, bottom: 24 },
      head: [head],
      body,
      theme: 'grid',
      showHead: 'everyPage',
      rowPageBreak: 'avoid',
      headStyles: {
        fillColor: NAVY,
        textColor: [255, 255, 255],
        fontSize: 8.2,
        fontStyle: 'bold',
        cellPadding: 2.5,
      },
      styles: {
        fontSize: 8.2,
        textColor: SLATE_TEXT,
        cellPadding: 2.3,
        lineColor: BORDER_GRAY,
        lineWidth: 0.2,
      },
      alternateRowStyles: {
        fillColor: LIGHT_BG,
      },
    });
    this.y = (this.doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5.5;
  }

  addSignatureBlock() {
    this.ensureSpace(34);
    this.y += 4;
    this.doc.setDrawColor(...BORDER_GRAY);
    this.doc.setLineWidth(0.3);
    this.doc.line(this.marginX, this.y, this.pageWidth - this.marginX, this.y);
    this.y += 6;

    const sigCenter = this.pageWidth / 2;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8.5);
    this.doc.setTextColor(...MUTED_TEXT);
    this.doc.text(`Data da emissão: ${this.evalDate}`, this.marginX, this.y);

    this.y += 13;
    this.doc.setDrawColor(...NAVY);
    this.doc.setLineWidth(0.4);
    this.doc.line(sigCenter - 45, this.y, sigCenter + 45, this.y);

    this.y += 4.5;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9.5);
    this.doc.setTextColor(...NAVY);
    this.doc.text(PROFESSIONAL_INFO.therapistName, sigCenter, this.y, { align: 'center' });

    this.y += 4.2;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8.5);
    this.doc.setTextColor(...SLATE_TEXT);
    this.doc.text(`Fisioterapeuta · ${PROFESSIONAL_INFO.crefito}`, sigCenter, this.y, { align: 'center' });
  }

  finalizeAndSave(
    filename: string,
    options?: { download?: boolean }
  ): { blob: Blob; filename: string } {
    const totalPages = this.doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i);
      // Top navy header bar
      this.doc.setFillColor(...NAVY);
      this.doc.rect(0, 0, this.pageWidth, 24, 'F');
      this.doc.setFillColor(...ROYAL);
      this.doc.rect(0, 24, this.pageWidth, 1.2, 'F');

      // Left header: Brand + Therapist
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(11.5);
      this.doc.setTextColor(255, 255, 255);
      this.doc.text(PROFESSIONAL_INFO.appName, this.marginX, 9.5);

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8.2);
      this.doc.setTextColor(203, 213, 225);
      this.doc.text(
        `${PROFESSIONAL_INFO.therapistName}  |  ${PROFESSIONAL_INFO.crefito}`,
        this.marginX,
        15.2
      );
      this.doc.text(
        `${this.docTitle} — ${this.specialtyLabel}`,
        this.marginX,
        20.2
      );

      // Right header: Patient + Date
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(8.5);
      this.doc.setTextColor(255, 255, 255);
      this.doc.text(this.patientName, this.pageWidth - this.marginX, 11.5, { align: 'right', maxWidth: 72 });
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8);
      this.doc.setTextColor(203, 213, 225);
      this.doc.text(`Data: ${this.evalDate}`, this.pageWidth - this.marginX, 17.5, { align: 'right' });

      // Footer
      const footerY = this.pageHeight - 13;
      this.doc.setDrawColor(...BORDER_GRAY);
      this.doc.setLineWidth(0.25);
      this.doc.line(this.marginX, footerY - 3.5, this.pageWidth - this.marginX, footerY - 3.5);

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7.5);
      this.doc.setTextColor(...MUTED_TEXT);
      this.doc.text(
        `${PROFESSIONAL_INFO.website}  ·  Instagram: ${PROFESSIONAL_INFO.instagram}`,
        this.marginX,
        footerY
      );
      this.doc.text(
        `Documento clínico confidencial (LGPD) — Prontuário Fisioterapêutico Digital`,
        this.marginX,
        footerY + 4.2
      );
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(...NAVY);
      this.doc.text(`Página ${i} de ${totalPages}`, this.pageWidth - this.marginX, footerY + 2, {
        align: 'right',
      });
    }

    const blob = this.doc.output('blob');
    if (options?.download !== false) {
      this.doc.save(filename);
    }
    return { blob, filename };
  }
}

export function generateAssessmentPdf(assessment: AssessmentRecord) {
  const spec = SPECIALTIES_BY_ID[assessment.specialtyId];
  const pdf = new ClinicalPdfBuilder(
    'AVALIAÇÃO FISIOTERAPÊUTICA',
    `${spec.code}. ${spec.name}`,
    assessment.identification.fullName,
    assessment.identification.evaluationDate
  );
  pdf.setStructuredAssessmentPayload(assessment);

  // 1. Identificação e Antropometria
  pdf.addSectionTitle('1. Identificação do Paciente e Dados Gerais');
  const id = assessment.identification;
  const imc = calculateIMC(id.weightKg, id.heightCm);
  const idPairs: Array<{ label: string; value: string }> = [
    { label: 'Paciente', value: id.fullName },
    { label: 'Data da Avaliação', value: formatDatePtBr(id.evaluationDate) },
    { label: 'Data de Nascimento', value: formatDatePtBr(id.birthDate) },
    { label: 'Idade', value: id.age ? `${id.age} anos` : '' },
    { label: 'Sexo', value: id.sex },
    { label: 'Documento', value: id.documentId },
    { label: 'Telefone', value: id.phone },
    { label: 'Ocupação', value: id.occupation },
    { label: 'Modalidade', value: id.attendanceMode },
    { label: 'Dominância', value: id.dominance },
    { label: 'Autorização Fotográfica', value: id.photoConsent },
  ];
  if (id.guardianName) {
    idPairs.push({ label: 'Responsável Legal', value: `${id.guardianName} (${id.guardianRelation || 'Responsável'})` });
  }
  if (spec.includeAnthropometrics && (id.weightKg || id.heightCm)) {
    idPairs.push({ label: 'Peso / Altura', value: `${id.weightKg || '-'} kg / ${id.heightCm || '-'} cm` });
    if (imc) {
      idPairs.push({ label: 'IMC Calculado', value: `${imc.value} kg/m² (${imc.classification})` });
    }
  }
  if (spec.id === 'ortopedia' && assessment.selectedOrthopedicRegions.length > 0) {
    idPairs.push({
      label: 'Regiões Avaliadas',
      value: assessment.selectedOrthopedicRegions.map((r) => ORTHOPEDIC_REGIONS[r]?.name || r).join(', '),
    });
  }
  pdf.addKeyValueGrid(idPairs);

  // 2. Anamnese e História Clínica
  pdf.addSectionTitle('2. Anamnese e História Clínica');
  const base = assessment.baseAnamnesis;
  pdf.addTextBlock('Queixa Principal', base.chiefComplaint);
  pdf.addTextBlock('História da Doença Atual (HDA)', base.hma);
  pdf.addTextBlock('História Clínica e Comorbidades', base.clinicalHistory);
  pdf.addTextBlock('Diagnóstico Médico Informado', base.medicalDiagnosis);
  pdf.addTextBlock('Histórico Cirúrgico e Traumático', base.surgicalTraumaticHistory);
  pdf.addTextBlock('Medicamentos em Uso', base.medications);
  pdf.addTextBlock('Exames Complementares', base.complementaryExams);

  spec.anamnesisFields.forEach((field) => {
    const val = assessment.customAnamnesis[field.id];
    const str = Array.isArray(val) ? val.join(', ') : typeof val === 'boolean' ? (val ? 'Sim' : 'Não') : String(val ?? '');
    pdf.addTextBlock(field.label, str);
  });

  // Paralisia Facial Anamnesis
  if (assessment.facialPalsy) {
    const fp = assessment.facialPalsy;
    pdf.addKeyValueGrid([
      { label: 'Data de Início', value: formatDatePtBr(fp.onsetDate) },
      { label: 'Lado Afetado', value: fp.affectedSide },
      { label: 'Evolução', value: fp.evolution },
      { label: 'Diagnóstico Médico', value: fp.medicalDiagnosis },
      { label: 'Episódios Anteriores', value: fp.previousEpisodes },
      { label: 'Dor Retroauricular', value: fp.retroauricularPain },
      { label: 'Alterações de Paladar', value: fp.tasteChanges },
      { label: 'Lacrimejamento / Salivação', value: [fp.lacrimation, fp.salivationChanges].filter(Boolean).join(' / ') },
    ]);
    pdf.addTextBlock('Tratamentos e Medicamentos Faciais', fp.treatmentsAndMeds);
    pdf.addTextBlock('Histórico de Infecção', fp.infectionHistory);
    pdf.addTextBlock('Dificuldades para Mastigar, Falar ou Beber', fp.functionalDifficulties);

    const activeAlerts: string[] = [];
    if (fp.incompleteEyeClosure || fp.absentBellPhenomenon || fp.cornealPainOrDryness) {
      activeAlerts.push('ALERTA DE PROTEÇÃO CORNEANA: Comprometimento de fechamento ocular / risco de exposição corneana. Priorizar lubrificação, proteção ocular e encaminhamento oftalmológico.');
    }
    if (fp.centralNeuroFlags) {
      activeAlerts.push('ALERTA NEUROLÓGICO CENTRAL: Sinais neurológicos de alerta identificados — encaminhamento médico imediato.');
    }
    if (fp.cornealAlertNotes) {
      activeAlerts.push(`Conduta de alerta: ${fp.cornealAlertNotes}`);
    }
    if (activeAlerts.length > 0) {
      pdf.addAlertBox('ALERTAS CLÍNICOS — PROTEÇÃO OCULAR / ENCAMINHAMENTO', activeAlerts);
    }
  }

  // 3. Sinais Vitais & Dor
  if (spec.includeVitalSigns && assessment.vitalSigns.status === 'avaliado') {
    const vs = assessment.vitalSigns;
    const hasVitals = vs.heartRateBpm || vs.bloodPressureMmHg || vs.respiratoryRateRpm || vs.spo2Percent || vs.temperatureC;
    if (hasVitals) {
      pdf.addSectionTitle('3. Sinais Vitais e Monitoramento Basal');
      pdf.addKeyValueGrid([
        { label: 'Frequência Cardíaca', value: vs.heartRateBpm ? `${vs.heartRateBpm} bpm` : '' },
        { label: 'Pressão Arterial', value: vs.bloodPressureMmHg ? `${vs.bloodPressureMmHg} mmHg` : '' },
        { label: 'Frequência Respiratória', value: vs.respiratoryRateRpm ? `${vs.respiratoryRateRpm} irpm` : '' },
        { label: 'SpO2', value: vs.spo2Percent ? `${vs.spo2Percent}%` : '' },
        { label: 'Temperatura', value: vs.temperatureC ? `${vs.temperatureC} °C` : '' },
        { label: 'Borg Dispneia / Esforço', value: [vs.borgDispnea, vs.borgEffort].filter(Boolean).join(' / ') },
      ]);
    }
  }

  if (spec.includePainScale && assessment.pain.status === 'avaliado') {
    const p = assessment.pain;
    if (p.evaScore !== null || p.endScore !== null || p.location) {
      pdf.addSectionTitle('Avaliação da Dor (EVA / END)');
      pdf.addKeyValueGrid([
        { label: 'EVA (0–10)', value: p.evaScore !== null ? `${p.evaScore}/10` : 'Não avaliado' },
        { label: 'END (0–10)', value: p.endScore !== null ? `${p.endScore}/10` : 'Não avaliado' },
        { label: 'Localização', value: p.location },
        { label: 'Frequência / Duração', value: [p.frequency, p.duration].filter(Boolean).join(' · ') },
        { label: 'Características', value: p.characteristic.join(', ') },
        { label: 'Fatores Agravantes / Alívio', value: [p.aggravatingFactors, p.relievingFactors].filter(Boolean).join(' | ') },
      ]);
      pdf.addTextBlock('Impacto no Sono e Funcionalidade', [p.sleepImpact, p.functionalImpact].filter(Boolean).join(' · '));
    }
  }

  // 4. Avaliação Física Específica
  pdf.addSectionTitle('Avaliação Física Específica da Especialidade');
  spec.physicalExamFields.forEach((field) => {
    const val = assessment.customPhysicalExam[field.id];
    const str = Array.isArray(val) ? val.join(', ') : typeof val === 'boolean' ? (val ? 'Sim' : 'Não') : String(val ?? '');
    pdf.addTextBlock(field.label, str);
  });

  // Paralisia Facial Detailed Exam
  if (assessment.facialPalsy) {
    const fp = assessment.facialPalsy;
    const facialRows = fp.items
      .filter((i) => i.rightStatus || i.leftStatus || i.notes)
      .map((i) => [i.label, i.rightStatus || '-', i.leftStatus || '-', i.notes || '-']);
    if (facialRows.length > 0) {
      pdf.addTable(['Função / Movimento Facial', 'Hemiface Direita', 'Hemiface Esquerda', 'Observações'], facialRows);
    }
    pdf.addTextBlock('Simetria em Repouso', fp.restingSymmetry);
    pdf.addTextBlock('Avaliação de Proteção Ocular', fp.eyeProtection);
    pdf.addTextBlock('Controle Motor Seletivo', fp.selectiveControl);
    pdf.addTextBlock('Sincinesias e Contraturas', [fp.synkinesisNotes, fp.contracturesNotes].filter(Boolean).join(' | '));
    pdf.addTextBlock('Sensibilidade Facial, Fala e Mastigação', [fp.facialSensitivity, fp.speechArticulation, fp.chewingLipSeal].filter(Boolean).join(' | '));
    if (fp.photoRecordNotes) pdf.addTextBlock('Registro Fotográfico Padronizado', fp.photoRecordNotes);

    const sb = calculateSunnybrookScore(fp);
    pdf.addKeyValueGrid([
      { label: 'Sunnybrook — Repouso', value: `${sb.restingTotal}` },
      { label: 'Sunnybrook — Movimento Voluntário', value: `${sb.voluntaryTotal}` },
      { label: 'Sunnybrook — Sincinesia', value: `${sb.synkinesisTotal}` },
      { label: 'Sunnybrook — Escore Composto', value: `${sb.composite}/100` },
    ]);
  }

  // Pélvica
  if (assessment.pelvicConsent) {
    const pc = assessment.pelvicConsent;
    pdf.addKeyValueGrid([
      { label: 'Status da Avaliação Íntima', value: pc.intimateAssessmentStatus || 'Não registrado' },
      { label: 'Consentimento Específico Registrado', value: pc.consentSignedByPatient ? 'Sim' : 'Não' },
      { label: 'Escala Oxford Modificada', value: pc.oxfordGrade },
      { label: 'Esquema PERFECT', value: [pc.perfectP && `P:${pc.perfectP}`, pc.perfectE && `E:${pc.perfectE}`, pc.perfectR && `R:${pc.perfectR}`, pc.perfectF && `F:${pc.perfectF}`].filter(Boolean).join(' | ') },
      { label: 'Coordenação / Relaxamento', value: [pc.coordination, pc.relaxationCapacity].filter(Boolean).join(' | ') },
    ]);
    pdf.addTextBlock('Observações de Consentimento / Avaliação Pélvica', pc.consentNotes);
  }

  // Cardiorrespiratória
  if (assessment.cardioMonitoring) {
    const cm = assessment.cardioMonitoring;
    pdf.addKeyValueGrid([
      { label: 'Manovacuometria (PImáx / PEmáx)', value: [cm.pimaxCmH2O && `PI: ${cm.pimaxCmH2O} cmH2O`, cm.pemaxCmH2O && `PE: ${cm.pemaxCmH2O} cmH2O`].filter(Boolean).join(' | ') },
      { label: 'Pico de Fluxo Expiratório', value: cm.peakFlowLMin ? `${cm.peakFlowLMin} L/min` : '' },
      { label: 'TC6M (Distância / Previsto)', value: [cm.tc6mDistanceM && `${cm.tc6mDistanceM} m`, cm.tc6mPredictedM && `Prev: ${cm.tc6mPredictedM} m`].filter(Boolean).join(' | ') },
      { label: 'TC6M Pré / Pico / Pós', value: [cm.tc6mPreVitals, cm.tc6mPeakVitals, cm.tc6mPostVitals].filter(Boolean).join(' → ') },
      { label: 'Teste Sentar e Levantar', value: cm.sitToStandReps ? `${cm.sitToStandReps} reps (${cm.sitToStandPreVitals} → ${cm.sitToStandPostVitals})` : '' },
    ]);
    pdf.addTextBlock('Contraindicações Clínicas', cm.contraindications);
    pdf.addTextBlock('Critérios de Interrupção', cm.interruptionCriteria);
    pdf.addTextBlock('Intercorrências Durante Testes/Exercícios', cm.intercurrences);
  }

  // UTI
  if (assessment.utiData) {
    const u = assessment.utiData;
    const glasgowTotal = u.glasgowEye + u.glasgowVerbal + u.glasgowMotor;
    const mrcSum = calculateMrcSumScore(u.mrcGroups);
    pdf.addKeyValueGrid([
      { label: 'Escala de Glasgow', value: `${glasgowTotal}/15 (O:${u.glasgowEye} V:${u.glasgowVerbal} M:${u.glasgowMotor})` },
      { label: 'Ventilação Mecânica', value: [u.ventMode, u.fio2Percent && `FiO2 ${u.fio2Percent}%`, u.peepCmH2O && `PEEP ${u.peepCmH2O}`, u.pressureSupportOrVt].filter(Boolean).join(' · ') },
      { label: 'Gasometria Arterial', value: [u.abgPh && `pH ${u.abgPh}`, u.abgPao2 && `PaO2 ${u.abgPao2}`, u.abgPaco2 && `PaCO2 ${u.abgPaco2}`, u.abgHco3 && `HCO3 ${u.abgHco3}`, u.abgLactato && `Lac ${u.abgLactato}`].filter(Boolean).join(' | ') },
      { label: 'MRC Sum Score', value: mrcSum.evaluatedCount > 0 ? `${mrcSum.total}/60 (${mrcSum.evaluatedCount} grupos)` : 'Não avaliado' },
      { label: 'ICU Mobility Scale (IMS)', value: u.imsScore ? `Nível ${u.imsScore}/10` : '' },
      { label: 'Critérios de Segurança', value: u.safetyCriteriaMet },
    ]);
  }

  // Goniometria Table
  const gonioRows = assessment.goniometry
    .filter((g) => g.status !== 'nao_aplicavel' && (g.activeRight || g.activeLeft || g.passiveRight || g.passiveLeft || g.status === 'nao_avaliado'))
    .map((g) => [
      `${g.joint} — ${g.movement}`,
      g.normalRange,
      g.status === 'nao_avaliado' ? 'Não avaliado' : `${g.activeRight || '-'} / ${g.activeLeft || '-'}`,
      g.status === 'nao_avaliado' ? 'Não avaliado' : `${g.passiveRight || '-'} / ${g.passiveLeft || '-'}`,
    ]);
  if (gonioRows.length > 0) {
    pdf.addSectionTitle('Goniometria e Amplitude de Movimento (Ativa / Passiva)');
    pdf.addTable(['Articulação / Movimento', 'Referência', 'Ativa (D / E)', 'Passiva (D / E)'], gonioRows);
  }

  // Força Muscular Table
  const strengthRows = assessment.strength
    .filter((s) => s.status !== 'nao_aplicavel' && (s.mrcRight || s.mrcLeft || s.status === 'nao_avaliado'))
    .map((s) => [
      s.muscleOrGroup,
      s.status === 'nao_avaliado' ? 'Não avaliado' : s.mrcRight || '-',
      s.status === 'nao_avaliado' ? 'Não avaliado' : s.mrcLeft || '-',
      s.notes || '-',
    ]);
  if (strengthRows.length > 0) {
    pdf.addSectionTitle('Avaliação de Força Muscular (Escala MRC 0–5)');
    pdf.addTable(['Grupo Muscular / Miótomo', 'Direito', 'Esquerdo', 'Observações'], strengthRows);
  }

  // Perimetria Table
  const periRows = assessment.perimetry
    .filter((p) => p.status !== 'nao_aplicavel' && (p.rightCm || p.leftCm))
    .map((p) => {
      const diff = calculatePerimetryDiff(p.rightCm, p.leftCm);
      return [p.point, p.rightCm ? `${p.rightCm} cm` : '-', p.leftCm ? `${p.leftCm} cm` : '-', diff ? diff.diff : '-'];
    });
  if (periRows.length > 0) {
    pdf.addSectionTitle('Perimetria e Diferença Bilateral');
    pdf.addTable(['Ponto Anatômico', 'Direito (cm)', 'Esquerdo (cm)', 'Diferença (D - E)'], periRows);
  }

  // Testes Especiais
  const testRows = Object.values(assessment.specialTests)
    .filter((t) => t.resultRight || t.resultLeft || t.resultSingle)
    .map((t) => [
      t.name,
      t.resultSingle ? t.resultSingle : `D: ${t.resultRight || '-'} | E: ${t.resultLeft || '-'}`,
      t.notes || '-',
    ]);
  if (testRows.length > 0) {
    pdf.addSectionTitle('Testes Específicos Aplicados');
    pdf.addTable(['Teste', 'Resultado', 'Observações'], testRows);
  }

  // Escalas Validadas
  const scaleRows = Object.values(assessment.scales)
    .filter((s) => s.status === 'avaliado' && (s.score || s.interpretation || s.notes))
    .map((s) => {
      const meta = INSTRUMENTS_BY_ID[s.scaleId];
      return [meta?.name || s.scaleId, s.score || '-', s.interpretation || '-', s.notes || '-'];
    });
  if (scaleRows.length > 0) {
    pdf.addSectionTitle('Escalas e Instrumentos Padronizados');
    pdf.addTable(['Instrumento', 'Pontuação', 'Interpretação Clínica', 'Observações'], scaleRows);
  }

  // Síntese, Diagnóstico Cinético-Funcional, Objetivos e Plano
  pdf.addSectionTitle('Diagnóstico Cinético-Funcional, Objetivos e Plano Terapêutico');
  const syn = assessment.synthesis;
  pdf.addTextBlock('Achados Clínicos Relevantes', syn.clinicalFindings);
  pdf.addTextBlock('Limitações Funcionais e Restrições de Participação', syn.functionalLimitations);
  pdf.addTextBlock('Diagnóstico Cinético-Funcional', syn.kineticFunctionalDiagnosis);
  pdf.addTextBlock('Objetivos Terapêuticos — Curto Prazo', syn.shortTermGoals);
  pdf.addTextBlock('Objetivos Terapêuticos — Médio Prazo', syn.mediumTermGoals);
  pdf.addTextBlock('Objetivos Terapêuticos — Longo Prazo', syn.longTermGoals);
  pdf.addTextBlock('Plano de Tratamento e Condutas Fisioterapêuticas', syn.treatmentPlan);
  pdf.addTextBlock('Frequência e Duração Prevista', syn.frequencyAndDuration);
  pdf.addTextBlock('Precauções e Contraindicações', syn.precautionsAndContraindications);
  pdf.addTextBlock('Prognóstico Funcional', syn.functionalPrognosis);
  pdf.addTextBlock('Orientações ao Paciente / Família', syn.patientGuidance);
  pdf.addTextBlock('Observações Gerais', syn.observations);

  pdf.addSignatureBlock();
  const filename = buildPdfFileName('Avaliacao', id.fullName, spec.shortName, id.evaluationDate);
  return pdf.finalizeAndSave(filename);
}

export function generateReassessmentPdf(reassessment: ReassessmentRecord, isComparative: boolean) {
  const spec = SPECIALTIES_BY_ID[reassessment.specialtyId];
  const title = isComparative ? 'RELATÓRIO COMPARATIVO DE REAVALIAÇÃO' : 'FICHA DE REAVALIAÇÃO FISIOTERAPÊUTICA';
  const pdf = new ClinicalPdfBuilder(title, spec.name, reassessment.patientName, reassessment.evaluationDate);

  pdf.addSectionTitle('1. Dados da Reavaliação');
  pdf.addKeyValueGrid([
    { label: 'Paciente', value: reassessment.patientName },
    { label: 'Especialidade', value: spec.name },
    { label: 'Data da Avaliação Inicial', value: formatDatePtBr(reassessment.initialDate) },
    { label: 'Data da Reavaliação', value: formatDatePtBr(reassessment.evaluationDate) },
    { label: 'EVA Inicial vs Atual', value: reassessment.painInitialEva || reassessment.painCurrentEva ? `${reassessment.painInitialEva || '-'} → ${reassessment.painCurrentEva || '-'}` : '' },
  ]);

  pdf.addSectionTitle('2. Evolução Clínica e Comparação Funcional');
  pdf.addTextBlock('Síntese da Evolução Clínica', reassessment.clinicalEvolutionSummary);
  pdf.addTextBlock('Comparação de Amplitude Articular (ADM)', reassessment.romComparisonNotes);
  pdf.addTextBlock('Comparação de Força Muscular', reassessment.strengthComparisonNotes);
  pdf.addTextBlock('Comparação de Equilíbrio', reassessment.balanceComparisonNotes);
  pdf.addTextBlock('Comparação de Funcionalidade', reassessment.functionalityComparisonNotes);

  const compRows = reassessment.comparisons
    .filter((c) => c.parameter || c.initialValue || c.currentValue)
    .map((c) => [c.domain, c.parameter || '-', c.initialValue || '-', c.currentValue || '-', c.deltaNotes || '-']);
  if (compRows.length > 0) {
    pdf.addSectionTitle('3. Quadro Comparativo de Parâmetros e Testes');
    pdf.addTable(['Domínio', 'Parâmetro / Teste', 'Inicial', 'Atual', 'Evolução / Delta'], compRows);
  }

  pdf.addSectionTitle('4. Balanço de Objetivos e Novo Plano Terapêutico');
  pdf.addTextBlock('Objetivos Terapêuticos Alcançados', reassessment.achievedGoals);
  pdf.addTextBlock('Objetivos Terapêuticos Pendentes', reassessment.pendingGoals);
  pdf.addTextBlock('Diagnóstico Cinético-Funcional Atualizado', reassessment.newKineticDiagnosis);
  pdf.addTextBlock('Novo Plano Terapêutico', reassessment.newTreatmentPlan);
  pdf.addTextBlock('Observações', reassessment.observations);

  pdf.addSignatureBlock();
  const prefix = isComparative ? 'Relatorio_Comparativo' : 'Reavaliacao';
  return pdf.finalizeAndSave(buildPdfFileName(prefix, reassessment.patientName, spec.shortName, reassessment.evaluationDate));
}

export function generateEvolutionPdf(evolution: DailyEvolutionRecord) {
  const spec = SPECIALTIES_BY_ID[evolution.specialtyId];
  const pdf = new ClinicalPdfBuilder('EVOLUÇÃO FISIOTERAPÊUTICA DIÁRIA', spec.name, evolution.patientName, evolution.date);

  pdf.addSectionTitle('1. Registro da Sessão');
  pdf.addKeyValueGrid([
    { label: 'Paciente', value: evolution.patientName },
    { label: 'Especialidade', value: spec.name },
    { label: 'Data', value: formatDatePtBr(evolution.date) },
    { label: 'Horário', value: evolution.time },
    { label: 'Sinais Vitais Iniciais', value: evolution.vitalSignsBefore },
    { label: 'Sinais Vitais Finais', value: evolution.vitalSignsAfter },
  ]);

  pdf.addTextBlock('Queixa Relatada', evolution.reportedComplaint);
  pdf.addTextBlock('Condição Clínica Inicial', evolution.initialClinicalCondition);
  pdf.addTextBlock('Condutas Realizadas', evolution.proceduresPerformed);
  pdf.addTextBlock('Recursos Terapêuticos Utilizados', evolution.resourcesUsed);

  const exRows = evolution.exercises
    .filter((e) => e.exercise.trim())
    .map((e) => [e.exercise, e.sets || '-', e.reps || '-', e.timeOrLoad || '-', e.intensity || '-']);
  if (exRows.length > 0) {
    pdf.addSectionTitle('2. Exercícios Terapêuticos Executados');
    pdf.addTable(['Exercício', 'Séries', 'Repetições', 'Tempo / Carga', 'Intensidade'], exRows);
  }

  pdf.addSectionTitle('3. Resposta, Intercorrências e Condição Final');
  pdf.addTextBlock('Resposta do Paciente', evolution.patientResponse);
  pdf.addTextBlock('Intercorrências', evolution.intercurrences);
  pdf.addTextBlock('Condição ao Término', evolution.endingCondition);
  pdf.addTextBlock('Orientações Domiciliares', evolution.guidance);
  pdf.addTextBlock('Observações', evolution.observations);

  pdf.addSignatureBlock();
  return pdf.finalizeAndSave(buildPdfFileName('Evolucao', evolution.patientName, spec.shortName, evolution.date));
}

export function generateAnamnesisPdf(patient: PatientRecord, assessment?: AssessmentRecord) {
  const spec = assessment ? SPECIALTIES_BY_ID[assessment.specialtyId] : null;
  const docDate = assessment?.identification.evaluationDate || new Date().toISOString().split('T')[0];
  const pdf = new ClinicalPdfBuilder(
    'FICHA DE ANAMNESE CLÍNICA',
    spec ? `${spec.code}. ${spec.name}` : 'Prontuário Fisioterapêutico',
    patient.fullName,
    docDate
  );

  pdf.addSectionTitle('1. Identificação do Paciente');
  pdf.addKeyValueGrid([
    { label: 'Paciente', value: patient.fullName },
    { label: 'Data de Nascimento', value: formatDatePtBr(patient.birthDate) },
    { label: 'Sexo', value: patient.sex },
    { label: 'CPF', value: patient.cpf },
    { label: 'Telefone', value: patient.phone },
    { label: 'E-mail', value: patient.email },
    { label: 'Endereço', value: patient.address },
    { label: 'Contato de Emergência', value: patient.emergencyContact },
  ]);

  pdf.addSectionTitle('2. Anamnese e Antecedentes Clínicos');
  pdf.addTextBlock('Diagnóstico Médico Informado', assessment?.baseAnamnesis.medicalDiagnosis || patient.medicalDiagnosis);
  pdf.addTextBlock('Diagnóstico Fisioterapêutico', patient.physiotherapyDiagnosis);
  if (assessment) {
    pdf.addTextBlock('Queixa Principal', assessment.baseAnamnesis.chiefComplaint);
    pdf.addTextBlock('História da Doença Atual (HDA)', assessment.baseAnamnesis.hma);
    pdf.addTextBlock('Histórico Cirúrgico e Traumático', assessment.baseAnamnesis.surgicalTraumaticHistory);
    pdf.addTextBlock('Exames Complementares', assessment.baseAnamnesis.complementaryExams);
  }
  pdf.addTextBlock('Histórico Clínico', patient.clinicalHistory);
  pdf.addTextBlock('Comorbidades', patient.comorbidities);
  pdf.addTextBlock('Medicamentos Informados', assessment?.baseAnamnesis.medications || patient.medications);
  pdf.addTextBlock('Alergias / Restrições', patient.allergies);
  pdf.addTextBlock('Observações Clínicas', patient.clinicalNotes);

  pdf.addSignatureBlock();
  return pdf.finalizeAndSave(
    buildPdfFileName('Anamnese', patient.fullName, spec?.shortName || 'Clinica', docDate)
  );
}

export function generateTreatmentPlanPdf(patient: PatientRecord, plan: TreatmentPlanRecord) {
  const spec = SPECIALTIES_BY_ID[plan.specialtyId];
  const pdf = new ClinicalPdfBuilder(
    'PLANO TERAPÊUTICO FISIOTERAPÊUTICO',
    `${spec.code}. ${spec.name}`,
    patient.fullName,
    plan.startDate
  );

  pdf.addSectionTitle('1. Identificação e Enquadramento Clínico');
  pdf.addKeyValueGrid([
    { label: 'Paciente', value: patient.fullName },
    { label: 'Título do Plano', value: plan.title },
    { label: 'Especialidade', value: spec.name },
    { label: 'Início Previsto', value: formatDatePtBr(plan.startDate) },
    { label: 'Término Estimado', value: plan.expectedEndDate ? formatDatePtBr(plan.expectedEndDate) : 'A definir' },
    { label: 'Frequência', value: plan.frequency },
  ]);

  pdf.addSectionTitle('2. Diagnóstico, Metas e Condutas');
  pdf.addTextBlock('Diagnóstico Cinético-Funcional', plan.kineticDiagnosis);
  pdf.addTextBlock('Objetivos de Curto Prazo', plan.shortTermGoals);
  pdf.addTextBlock('Objetivos de Médio Prazo', plan.mediumTermGoals);
  pdf.addTextBlock('Objetivos de Longo Prazo', plan.longTermGoals);
  pdf.addTextBlock('Intervenções e Recursos Propostos', plan.interventions);
  pdf.addTextBlock('Precauções e Contraindicações', plan.precautions);

  pdf.addSignatureBlock();
  return pdf.finalizeAndSave(
    buildPdfFileName('Plano_Terapeutico', patient.fullName, spec.shortName, plan.startDate)
  );
}


function addProntuarioFields(pdf: ClinicalPdfBuilder, value: unknown, title: string, depth = 0): void {
  if (value === null || value === undefined || depth > 5) return;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value).trim();
    if (text) pdf.addTextBlock(title, text);
    return;
  }
  if (Array.isArray(value)) {
    const items = value.filter((item) => item !== null && item !== undefined && item !== '');
    if (!items.length) return;
    if (items.every((item) => ['string', 'number', 'boolean'].includes(typeof item))) {
      pdf.addTextBlock(title, items.map(String).join(', '));
      return;
    }
    items.forEach((item, index) => {
      pdf.addSectionTitle(`${title} — Registro ${index + 1}`);
      addProntuarioFields(pdf, item, title, depth + 1);
    });
    return;
  }
  if (typeof value === 'object') {
    const excluded = new Set(['id', 'patientId', 'userId', 'createdAt', 'updatedAt', 'linkedAssessmentId']);
    Object.entries(value as Record<string, unknown>).forEach(([key, child]) => {
      if (excluded.has(key) || child === null || child === undefined || child === '') return;
      const label = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/^./, (x) => x.toUpperCase());
      addProntuarioFields(pdf, child, label, depth + 1);
    });
  }
}

export function generateCompletePatientRecordPdf(params: {
  patient: PatientRecord;
  assessments: AssessmentRecord[];
  evolutions: DailyEvolutionRecord[];
  reassessments: ReassessmentRecord[];
  treatmentPlans: TreatmentPlanRecord[];
  appointments: AppointmentRecord[];
}) {
  const { patient } = params;
  const reportDate = new Date().toISOString().split('T')[0];
  const pdf = new ClinicalPdfBuilder(
    'PRONTUÁRIO FISIOTERAPÊUTICO COMPLETO',
    'Histórico Clínico Consolidado',
    patient.fullName,
    reportDate
  );

  pdf.addSectionTitle('1. Identificação e Dados Clínicos');
  pdf.addKeyValueGrid([
    { label: 'Paciente', value: patient.fullName },
    { label: 'Nascimento', value: formatDatePtBr(patient.birthDate) },
    { label: 'Sexo', value: patient.sex },
    { label: 'CPF', value: patient.cpf },
    { label: 'Telefone', value: patient.phone },
    { label: 'E-mail', value: patient.email },
    { label: 'Endereço', value: patient.address },
    { label: 'Contato de Emergência', value: patient.emergencyContact },
    { label: 'Situação do Tratamento', value: patient.treatmentStatus },
  ]);
  pdf.addTextBlock('Diagnóstico Médico', patient.medicalDiagnosis);
  pdf.addTextBlock('Diagnóstico Fisioterapêutico', patient.physiotherapyDiagnosis);
  pdf.addTextBlock('Histórico Clínico', patient.clinicalHistory);
  pdf.addTextBlock('Comorbidades', patient.comorbidities);
  pdf.addTextBlock('Medicamentos', patient.medications);
  pdf.addTextBlock('Alergias / Restrições', patient.allergies);
  pdf.addTextBlock('Observações Clínicas', patient.clinicalNotes);

  const assessments = [...params.assessments].sort((a, b) => a.identification.evaluationDate.localeCompare(b.identification.evaluationDate));
  pdf.addSectionTitle(`2. Avaliações Fisioterapêuticas (${assessments.length})`);
  if (!assessments.length) pdf.addTextBlock('Avaliações', 'Nenhuma avaliação registrada.');
  assessments.forEach((assessment, index) => {
    const spec = SPECIALTIES_BY_ID[assessment.specialtyId];
    pdf.addSectionTitle(`Avaliação ${index + 1} — ${spec?.name || assessment.specialtyId}`);
    pdf.addKeyValueGrid([
      { label: 'Data', value: formatDatePtBr(assessment.identification.evaluationDate) },
      { label: 'Diagnóstico Cinético-Funcional', value: assessment.synthesis.kineticFunctionalDiagnosis },
      { label: 'Prognóstico', value: assessment.synthesis.functionalPrognosis },
    ]);
    addProntuarioFields(pdf, assessment.identification, 'Identificação');
    addProntuarioFields(pdf, assessment.baseAnamnesis, 'Anamnese');
    if (spec) {
      spec.anamnesisFields.forEach((field) => addProntuarioFields(pdf, assessment.customAnamnesis[field.id], field.label));
      spec.physicalExamFields.forEach((field) => addProntuarioFields(pdf, assessment.customPhysicalExam[field.id], field.label));
    }
    addProntuarioFields(pdf, assessment.vitalSigns, 'Sinais Vitais');
    addProntuarioFields(pdf, assessment.pain, 'Avaliação da Dor');
    addProntuarioFields(pdf, assessment.goniometry, 'Goniometria');
    addProntuarioFields(pdf, assessment.strength, 'Força Muscular');
    addProntuarioFields(pdf, assessment.perimetry, 'Perimetria');
    addProntuarioFields(pdf, assessment.specialTests, 'Testes Especiais');
    addProntuarioFields(pdf, assessment.scales, 'Escalas Funcionais');
    if (assessment.facialPalsy) addProntuarioFields(pdf, assessment.facialPalsy, 'Avaliação de Paralisia Facial');
    if (assessment.pelvicConsent) addProntuarioFields(pdf, assessment.pelvicConsent, 'Avaliação Pélvica');
    if (assessment.cardioMonitoring) addProntuarioFields(pdf, assessment.cardioMonitoring, 'Monitoramento Cardiorrespiratório');
    if (assessment.utiData) addProntuarioFields(pdf, assessment.utiData, 'Dados de UTI');
    addProntuarioFields(pdf, assessment.synthesis, 'Síntese e Conduta');
  });

  const reassessments = [...params.reassessments].sort((a, b) => a.evaluationDate.localeCompare(b.evaluationDate));
  pdf.addSectionTitle(`3. Reavaliações Funcionais (${reassessments.length})`);
  if (!reassessments.length) pdf.addTextBlock('Reavaliações', 'Nenhuma reavaliação registrada.');
  reassessments.forEach((record, index) => {
    pdf.addSectionTitle(`Reavaliação ${index + 1} — ${formatDatePtBr(record.evaluationDate)}`);
    addProntuarioFields(pdf, record, 'Dados da Reavaliação');
  });

  const plans = [...params.treatmentPlans].sort((a, b) => a.startDate.localeCompare(b.startDate));
  pdf.addSectionTitle(`4. Planos Terapêuticos (${plans.length})`);
  if (!plans.length) pdf.addTextBlock('Planos Terapêuticos', 'Nenhum plano terapêutico registrado.');
  plans.forEach((plan, index) => {
    pdf.addSectionTitle(`Plano ${index + 1} — ${plan.title}`);
    addProntuarioFields(pdf, plan, 'Plano Terapêutico');
  });

  const evolutions = [...params.evolutions].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  pdf.addSectionTitle(`5. Evoluções Clínicas (${evolutions.length})`);
  if (!evolutions.length) pdf.addTextBlock('Evoluções', 'Nenhuma evolução registrada.');
  evolutions.forEach((evolution, index) => {
    const spec = SPECIALTIES_BY_ID[evolution.specialtyId];
    pdf.addSectionTitle(`Evolução ${index + 1} — ${formatDatePtBr(evolution.date)} ${evolution.time}`);
    pdf.addTextBlock('Especialidade', spec?.name || evolution.specialtyId);
    addProntuarioFields(pdf, evolution, 'Dados da Evolução');
  });

  const appointments = [...params.appointments].sort((a, b) => `${a.scheduledDate}T${a.scheduledTime}`.localeCompare(`${b.scheduledDate}T${b.scheduledTime}`));
  pdf.addSectionTitle(`6. Histórico de Atendimentos e Agendamentos (${appointments.length})`);
  if (appointments.length) {
    pdf.addTable(
      ['Data', 'Hora', 'Tipo', 'Duração', 'Situação', 'Especialidade', 'Modalidade / Observações'],
      appointments.map((item) => [
        formatDatePtBr(item.scheduledDate),
        item.scheduledTime || '-',
        item.appointmentType === 'avaliacao' ? 'Avaliação' : 'Sessão',
        `${item.durationMinutes} min`,
        item.status,
        SPECIALTIES_BY_ID[item.specialtyId]?.name || item.specialtyId,
        [item.attendanceMode, item.notes].filter(Boolean).join(' — ') || '-',
      ])
    );
  } else {
    pdf.addTextBlock('Atendimentos', 'Nenhum atendimento registrado.');
  }

  pdf.addSignatureBlock();
  return pdf.finalizeAndSave(buildPdfFileName('Prontuario_Completo', patient.fullName, 'Clinico', reportDate));
}

export function generateClinicalReportPdf(params: {
  patient: PatientRecord;
  documentType:
    | 'relatorio_fisioterapeutico'
    | 'relatorio_alta'
    | 'encaminhamento'
    | 'declaracao_outros';
  title: string;
  specialtyId?: SpecialtyId;
  recipientOrPurpose?: string;
  clinicalSummary: string;
  findingsOrEvolution?: string;
  recommendations?: string;
  reportDate: string;
}) {
  const spec = params.specialtyId ? SPECIALTIES_BY_ID[params.specialtyId] : null;
  const headerMap: Record<typeof params.documentType, string> = {
    relatorio_fisioterapeutico: 'RELATÓRIO FISIOTERAPÊUTICO',
    relatorio_alta: 'RELATÓRIO DE ALTA FISIOTERAPÊUTICA',
    encaminhamento: 'ENCAMINHAMENTO CLÍNICO',
    declaracao_outros: 'DECLARAÇÃO / DOCUMENTO CLÍNICO',
  };
  const prefixMap: Record<typeof params.documentType, 'Relatorio_Fisioterapeutico' | 'Relatorio_Alta' | 'Encaminhamento' | 'Declaracao'> = {
    relatorio_fisioterapeutico: 'Relatorio_Fisioterapeutico',
    relatorio_alta: 'Relatorio_Alta',
    encaminhamento: 'Encaminhamento',
    declaracao_outros: 'Declaracao',
  };

  const pdf = new ClinicalPdfBuilder(
    headerMap[params.documentType],
    spec ? `${spec.code}. ${spec.name}` : 'Fisioterapia',
    params.patient.fullName,
    params.reportDate
  );

  pdf.addSectionTitle('1. Identificação');
  pdf.addKeyValueGrid([
    { label: 'Paciente', value: params.patient.fullName },
    { label: 'Data de Nascimento', value: formatDatePtBr(params.patient.birthDate) },
    { label: 'CPF / Documento', value: params.patient.cpf },
    { label: 'Data de Emissão', value: formatDatePtBr(params.reportDate) },
    { label: 'Diagnóstico Médico', value: params.patient.medicalDiagnosis },
    { label: 'Diagnóstico Fisioterapêutico', value: params.patient.physiotherapyDiagnosis },
  ]);

  if (params.recipientOrPurpose?.trim()) {
    pdf.addTextBlock('Destinatário / Finalidade', params.recipientOrPurpose);
  }

  pdf.addSectionTitle(`2. ${params.title}`);
  pdf.addTextBlock('Síntese Clínica / Descrição', params.clinicalSummary);
  pdf.addTextBlock('Achados Objetivos / Evolução Funcional', params.findingsOrEvolution);
  pdf.addTextBlock('Condutas, Recomendações e Orientações', params.recommendations);

  pdf.addSignatureBlock();
  return pdf.finalizeAndSave(
    buildPdfFileName(
      prefixMap[params.documentType],
      params.patient.fullName,
      spec?.shortName || 'Clinica',
      params.reportDate
    )
  );
}
