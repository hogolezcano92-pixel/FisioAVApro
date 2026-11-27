import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  ClipboardCheck,
  Download,
  Eye,
  FileDown,
  FilePlus2,
  FileText,
  FileUp,
  GitCompare,
  Pencil,
  Plus,
  Printer,
  Stethoscope,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { SPECIALTIES, SPECIALTIES_BY_ID } from '../data/specialties';
import { parseAssessmentPdf } from '../utils/assessmentPdfImporter';
import { ExercisesTab } from './ExercisesTab';
import { PatientExerciseLog, PatientExercisePrescription } from '../types/exercises';
import {
  AppointmentRecord,
  AppointmentStatus,
  AppointmentType,
  AssessmentRecord,
  ClinicalDocumentRecord,
  ClinicalDocumentType,
  DailyEvolutionRecord,
  PatientRecord,
  ReassessmentRecord,
  SpecialtyId,
  TimelineEvent,
  TreatmentPlanRecord,
  TreatmentPlanStatus,
  TreatmentStatus,
} from '../types/clinical';
import {
  calculateAgeFromBirthDate,
  calculateAssessmentCompletion,
  DOCUMENT_TYPE_LABELS,
  formatDatePtBr,
  TREATMENT_STATUS_LABELS,
} from '../utils/calculations';
import {
  generateAnamnesisPdf,
  generateAssessmentPdf,
  generateCompletePatientRecordPdf,
  generateClinicalReportPdf,
  generateEvolutionPdf,
  generateReassessmentPdf,
  generateTreatmentPlanPdf,
} from '../utils/pdfGenerator';

type ProntuarioTab =
  | 'resumo'
  | 'avaliacoes'
  | 'evolucoes'
  | 'reavaliacoes'
  | 'documentos'
  | 'plano'
  | 'atendimentos'
  | 'exercicios';

interface PatientRecordViewProps {
  patient: PatientRecord;
  assessments: AssessmentRecord[];
  evolutions: DailyEvolutionRecord[];
  reassessments: ReassessmentRecord[];
  documents: ClinicalDocumentRecord[];
  treatmentPlans: TreatmentPlanRecord[];
  appointments: AppointmentRecord[];
  exercisePrescriptions: PatientExercisePrescription[];
  exerciseLogs: PatientExerciseLog[];
  onSaveExercisePrescription: (value: Omit<PatientExercisePrescription, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<void>;
  onLogExercise: (value: Omit<PatientExerciseLog, 'id' | 'createdAt'> & { id?: string }) => Promise<void>;
  onUpdateExercisePrescription: (value: PatientExercisePrescription) => Promise<void>;
  onDeleteExercisePrescription: (id: string) => Promise<void>;
  onBackToPatients: () => void;
  onUpdatePatientStatus: (patient: PatientRecord, status: TreatmentStatus) => Promise<void>;
  onStartNewAssessment: (patient: PatientRecord, specialtyId: SpecialtyId) => void;
  onOpenExistingAssessment: (assessment: AssessmentRecord) => void;
  onStartNewEvolution: (patient: PatientRecord) => void;
  onOpenExistingEvolution: (evolution: DailyEvolutionRecord) => void;
  onStartNewReassessment: (patient: PatientRecord, baseAssessment?: AssessmentRecord) => void;
  onOpenExistingReassessment: (reassessment: ReassessmentRecord) => void;
  onImportAssessment: (assessment: AssessmentRecord, file: File) => Promise<void>;
  onArchiveGeneratedPdf: (params: {
    patientId: string;
    relatedRecordId?: string | null;
    documentType: ClinicalDocumentType;
    title: string;
    specialtyId?: SpecialtyId | null;
    documentDate: string;
    blob: Blob;
    fileName: string;
  }) => Promise<void>;
  onSaveTreatmentPlan: (
    plan: Omit<TreatmentPlanRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => Promise<TreatmentPlanRecord>;
  onSaveAppointment: (
    appt: Omit<AppointmentRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => Promise<AppointmentRecord>;
  onPreviewDocument: (doc: ClinicalDocumentRecord) => void;
  onDownloadDocument: (doc: ClinicalDocumentRecord) => void;
  onPrintDocument: (doc: ClinicalDocumentRecord) => void;
  onRequestDeleteItem: (
    kind: 'assessment' | 'evolution' | 'reassessment' | 'document' | 'treatment_plan' | 'appointment',
    id: string,
    label: string
  ) => void;
}

const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  agendado: 'Agendado',
  realizado: 'Realizado',
  falta: 'Falta',
  cancelado: 'Cancelado',
  remarcado: 'Remarcado',
};

const PLAN_STATUS_LABELS: Record<TreatmentPlanStatus, string> = {
  ativo: 'Ativo',
  revisado: 'Revisado',
  concluido: 'Concluído',
  suspenso: 'Suspenso',
};

export const PatientRecordView: React.FC<PatientRecordViewProps> = ({
  patient,
  assessments,
  evolutions,
  reassessments,
  documents,
  treatmentPlans,
  appointments,
  exercisePrescriptions,
  exerciseLogs,
  onSaveExercisePrescription,
  onLogExercise,
  onUpdateExercisePrescription,
  onDeleteExercisePrescription,
  onBackToPatients,
  onUpdatePatientStatus,
  onStartNewAssessment,
  onOpenExistingAssessment,
  onStartNewEvolution,
  onOpenExistingEvolution,
  onStartNewReassessment,
  onOpenExistingReassessment,
  onArchiveGeneratedPdf,
  onImportAssessment,
  onSaveTreatmentPlan,
  onSaveAppointment,
  onPreviewDocument,
  onDownloadDocument,
  onPrintDocument,
  onRequestDeleteItem,
}) => {
  const [activeTab, setActiveTab] = useState<ProntuarioTab>('resumo');
  const [newAssessmentSpecModal, setNewAssessmentSpecModal] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importedPdf, setImportedPdf] = useState<File | null>(null);
  const [importedAssessment, setImportedAssessment] = useState<AssessmentRecord | null>(null);
  const [importPdfError, setImportPdfError] = useState('');
  const [importPdfLoading, setImportPdfLoading] = useState(false);
  const [importPdfSaving, setImportPdfSaving] = useState(false);
  const [confirmPatientMismatch, setConfirmPatientMismatch] = useState(false);
  const importPdfInputRef = useRef<HTMLInputElement>(null);

  // Treatment Plan Modal
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [planForm, setPlanForm] = useState<{
    id?: string;
    specialtyId: SpecialtyId;
    title: string;
    kineticDiagnosis: string;
    shortTermGoals: string;
    mediumTermGoals: string;
    longTermGoals: string;
    interventions: string;
    frequency: string;
    precautions: string;
    status: TreatmentPlanStatus;
    startDate: string;
    expectedEndDate: string;
  }>({
    specialtyId: 'ortopedia',
    title: 'Plano Terapêutico Fisioterapêutico',
    kineticDiagnosis: patient.physiotherapyDiagnosis || '',
    shortTermGoals: '',
    mediumTermGoals: '',
    longTermGoals: '',
    interventions: '',
    frequency: '',
    precautions: '',
    status: 'ativo',
    startDate: new Date().toISOString().split('T')[0],
    expectedEndDate: '',
  });

  // Appointment Modal
  const [apptModalOpen, setApptModalOpen] = useState(false);
  const [apptForm, setApptForm] = useState<{
    id?: string;
    appointmentType: AppointmentType;
    specialtyId: SpecialtyId;
    scheduledDate: string;
    scheduledTime: string;
    durationMinutes: number;
    attendanceMode: string;
    status: AppointmentStatus;
    notes: string;
  }>({
    appointmentType: 'sessao',
    specialtyId: 'ortopedia',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: new Date().toTimeString().slice(0, 5),
    durationMinutes: 50,
    attendanceMode: 'Consultório / Clínica',
    status: 'realizado',
    notes: '',
  });

  // Standalone Clinical Document Modal
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docForm, setDocForm] = useState<{
    docType:
      | 'ficha_anamnese'
      | 'relatorio_fisioterapeutico'
      | 'relatorio_alta'
      | 'encaminhamento'
      | 'declaracao_outros';
    title: string;
    specialtyId: SpecialtyId;
    reportDate: string;
    recipientOrPurpose: string;
    clinicalSummary: string;
    findingsOrEvolution: string;
    recommendations: string;
  }>({
    docType: 'relatorio_fisioterapeutico',
    title: 'Relatório Fisioterapêutico',
    specialtyId: 'ortopedia',
    reportDate: new Date().toISOString().split('T')[0],
    recipientOrPurpose: '',
    clinicalSummary: '',
    findingsOrEvolution: '',
    recommendations: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const patientAssessments = useMemo(
    () =>
      assessments
        .filter((a) => a.patientId === patient.id)
        .sort((a, b) => b.identification.evaluationDate.localeCompare(a.identification.evaluationDate)),
    [assessments, patient.id]
  );

  const patientEvolutions = useMemo(
    () =>
      evolutions
        .filter((e) => e.patientId === patient.id)
        .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`)),
    [evolutions, patient.id]
  );

  const patientReassessments = useMemo(
    () =>
      reassessments
        .filter((r) => r.patientId === patient.id)
        .sort((a, b) => b.evaluationDate.localeCompare(a.evaluationDate)),
    [reassessments, patient.id]
  );

  const patientDocuments = useMemo(
    () =>
      documents
        .filter((d) => d.patientId === patient.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [documents, patient.id]
  );

  const patientPlans = useMemo(
    () =>
      treatmentPlans
        .filter((p) => p.patientId === patient.id)
        .sort((a, b) => b.startDate.localeCompare(a.startDate)),
    [treatmentPlans, patient.id]
  );

  const patientAppointments = useMemo(
    () =>
      appointments
        .filter((ap) => ap.patientId === patient.id)
        .sort((a, b) => `${b.scheduledDate}T${b.scheduledTime}`.localeCompare(`${a.scheduledDate}T${a.scheduledTime}`)),
    [appointments, patient.id]
  );

  const timelineEvents: TimelineEvent[] = useMemo(() => {
    const events: TimelineEvent[] = [];
    patientAssessments.forEach((a) => {
      events.push({
        id: `tl-a-${a.id}`,
        date: a.identification.evaluationDate || a.createdAt.split('T')[0],
        category: 'avaliacao',
        title: `Avaliação — ${SPECIALTIES_BY_ID[a.specialtyId]?.name}`,
        subtitle: a.synthesis.kineticFunctionalDiagnosis || a.baseAnamnesis.chiefComplaint || 'Avaliação fisioterapêutica registrada',
        recordId: a.id,
      });
    });
    patientEvolutions.forEach((e) => {
      events.push({
        id: `tl-e-${e.id}`,
        date: e.date,
        time: e.time,
        category: 'evolucao',
        title: `Evolução de Sessão — ${SPECIALTIES_BY_ID[e.specialtyId]?.shortName}`,
        subtitle: e.proceduresPerformed || e.reportedComplaint || 'Atendimento registrado',
        recordId: e.id,
      });
    });
    patientReassessments.forEach((r) => {
      events.push({
        id: `tl-r-${r.id}`,
        date: r.evaluationDate,
        category: 'reavaliacao',
        title: `Reavaliação — ${SPECIALTIES_BY_ID[r.specialtyId]?.shortName}`,
        subtitle: r.clinicalEvolutionSummary || 'Reavaliação comparativa registrada',
        recordId: r.id,
      });
    });
    patientPlans.forEach((p) => {
      events.push({
        id: `tl-p-${p.id}`,
        date: p.startDate,
        category: 'plano',
        title: `Plano Terapêutico — ${p.title}`,
        subtitle: `${PLAN_STATUS_LABELS[p.status]} · ${p.frequency || 'Frequência não informada'}`,
        recordId: p.id,
      });
    });
    patientAppointments.forEach((ap) => {
      events.push({
        id: `tl-ap-${ap.id}`,
        date: ap.scheduledDate,
        time: ap.scheduledTime,
        category: 'atendimento',
        title: `Atendimento (${APPOINTMENT_STATUS_LABELS[ap.status]})`,
        subtitle: `${ap.appointmentType === 'avaliacao' ? 'Avaliação fisioterapêutica' : 'Sessão de fisioterapia'} · ${SPECIALTIES_BY_ID[ap.specialtyId]?.shortName} · ${ap.attendanceMode}`,
        recordId: ap.id,
      });
    });
    patientDocuments.forEach((d) => {
      events.push({
        id: `tl-d-${d.id}`,
        date: d.documentDate,
        category: 'documento',
        title: `PDF Arquivado (v${d.version}) — ${d.title}`,
        subtitle: DOCUMENT_TYPE_LABELS[d.documentType],
        recordId: d.id,
      });
    });

    return events.sort((a, b) => `${b.date} ${b.time ?? ''}`.localeCompare(`${a.date} ${a.time ?? ''}`));
  }, [
    patientAssessments,
    patientEvolutions,
    patientReassessments,
    patientPlans,
    patientAppointments,
    patientDocuments,
  ]);

  const ageDisplay = calculateAgeFromBirthDate(patient.birthDate);
  const lastEvolutionDate = patientEvolutions[0]?.date ? formatDatePtBr(patientEvolutions[0].date) : 'Nenhuma';
  const lastReassessmentDate = patientReassessments[0]?.evaluationDate
    ? formatDatePtBr(patientReassessments[0].evaluationDate)
    : 'Nenhuma';

  const handleSavePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.title.trim()) return;
    setSubmitting(true);
    try {
      await onSaveTreatmentPlan({
        ...planForm,
        patientId: patient.id,
      });
      setPlanModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveApptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSaveAppointment({
        ...apptForm,
        patientId: patient.id,
      });
      setApptModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateStandaloneDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let generated: { blob: Blob; filename: string };
      if (docForm.docType === 'ficha_anamnese') {
        const latestAssessment = patientAssessments[0];
        generated = generateAnamnesisPdf(patient, latestAssessment);
      } else {
        generated = generateClinicalReportPdf({
          patient,
          documentType: docForm.docType,
          title: docForm.title.trim() || DOCUMENT_TYPE_LABELS[docForm.docType],
          specialtyId: docForm.specialtyId,
          recipientOrPurpose: docForm.recipientOrPurpose,
          clinicalSummary: docForm.clinicalSummary,
          findingsOrEvolution: docForm.findingsOrEvolution,
          recommendations: docForm.recommendations,
          reportDate: docForm.reportDate,
        });
      }

      await onArchiveGeneratedPdf({
        patientId: patient.id,
        documentType: docForm.docType,
        title: docForm.title.trim() || DOCUMENT_TYPE_LABELS[docForm.docType],
        specialtyId: docForm.specialtyId,
        documentDate: docForm.reportDate,
        blob: generated.blob,
        fileName: generated.filename,
      });
      setDocModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  };


  const handleGenerateCompletePatientRecordPdf = async () => {
    setSubmitting(true);
    try {
      const generated = generateCompletePatientRecordPdf({
        patient,
        assessments: patientAssessments,
        evolutions: patientEvolutions,
        reassessments: patientReassessments,
        treatmentPlans: patientPlans,
        appointments: patientAppointments,
      });
      const reportDate = new Date().toISOString().split('T')[0];
      await onArchiveGeneratedPdf({
        patientId: patient.id,
        documentType: 'prontuario_completo',
        title: 'Prontuário Fisioterapêutico Completo',
        documentDate: reportDate,
        blob: generated.blob,
        fileName: generated.filename,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const TABS: Array<{ id: ProntuarioTab; label: string; count?: number }> = [
    { id: 'resumo', label: '1. Resumo Clínico' },
    { id: 'avaliacoes', label: '2. Avaliações', count: patientAssessments.length },
    { id: 'evolucoes', label: '3. Evoluções', count: patientEvolutions.length },
    { id: 'reavaliacoes', label: '4. Reavaliações', count: patientReassessments.length },
    { id: 'documentos', label: '5. Documentos e PDFs', count: patientDocuments.length },
    { id: 'plano', label: '6. Plano Terapêutico', count: patientPlans.length },
    { id: 'atendimentos', label: '7. Histórico de Atendimentos', count: patientAppointments.length },
    { id: 'exercicios', label: '8. Exercícios', count: exercisePrescriptions.length },
  ];

  return (
    <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-8">
      {/* Top Patient Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1.5">
            <button
              type="button"
              onClick={onBackToPatients}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8] hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Voltar para Lista de Pacientes</span>
            </button>
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="font-display text-2xl font-bold text-[#0B1F3A]">
                {patient.fullName}
              </h1>
              <span className="font-mono text-xs text-slate-400 tabular-nums">
                ID: {patient.id}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
              <span>{ageDisplay || 'Idade não informada'}</span>
              {patient.sex && (
                <>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span>{patient.sex}</span>
                </>
              )}
              {patient.phone && (
                <>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="font-mono tabular-nums">{patient.phone}</span>
                </>
              )}
              {patient.cpf && (
                <>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="font-mono tabular-nums">CPF: {patient.cpf}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-2">
              <label htmlFor="prontuario-status-select" className="text-xs font-semibold text-slate-600">
                Situação:
              </label>
              <select
                id="prontuario-status-select"
                value={patient.treatmentStatus}
                onChange={(e) =>
                  onUpdatePatientStatus(patient, e.target.value as TreatmentStatus)
                }
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-[#0B1F3A]"
              >
                {(Object.keys(TREATMENT_STATUS_LABELS) as TreatmentStatus[]).map((st) => (
                  <option key={st} value={st}>
                    {TREATMENT_STATUS_LABELS[st]}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => { setImportModalOpen(true); setImportPdfError(''); }}
              aria-label="Importar avaliação por PDF"
              title="Importar avaliação por PDF"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#1D4ED8] bg-white px-4 py-2.5 text-xs font-semibold text-[#1D4ED8] hover:bg-blue-50 whitespace-nowrap"
            >
              <FileUp className="h-4 w-4" />
              <span>Importar PDF</span>
            </button>
            <button
              type="button"
              onClick={() => setNewAssessmentSpecModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1D4ED8] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#1E40AF] whitespace-nowrap"
            >
              <FilePlus2 className="h-4 w-4" />
              <span>Nova Avaliação</span>
            </button>
            <button
              type="button"
              onClick={() => onStartNewEvolution(patient)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#0B1F3A] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#132d52] whitespace-nowrap"
            >
              <ClipboardCheck className="h-4 w-4" />
              <span>Nova Evolução</span>
            </button>
          </div>
        </div>

        {/* 6 Clinical Summary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 border-t border-slate-100 pt-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="text-[11px] font-medium text-slate-500">Total de avaliações</div>
            <div className="mt-1 font-mono text-lg font-bold text-[#0B1F3A] tabular-nums">
              {patientAssessments.length}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="text-[11px] font-medium text-slate-500">Total de sessões</div>
            <div className="mt-1 font-mono text-lg font-bold text-[#0B1F3A] tabular-nums">
              {patientEvolutions.length}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="text-[11px] font-medium text-slate-500">Última evolução</div>
            <div className="mt-1 font-mono text-xs font-bold text-[#0B1F3A] tabular-nums">
              {lastEvolutionDate}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="text-[11px] font-medium text-slate-500">Última reavaliação</div>
            <div className="mt-1 font-mono text-xs font-bold text-[#0B1F3A] tabular-nums">
              {lastReassessmentDate}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="text-[11px] font-medium text-slate-500">Documentos disponíveis</div>
            <div className="mt-1 font-mono text-lg font-bold text-[#1D4ED8] tabular-nums">
              {patientDocuments.length}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
            <div className="text-[11px] font-medium text-slate-500">Situação do tratamento</div>
            <div className="mt-1 text-xs font-bold text-[#0B1F3A] truncate">
              {TREATMENT_STATUS_LABELS[patient.treatmentStatus]}
            </div>
          </div>
        </div>

        {/* 7 Tabs Navigation */}
        <nav aria-label="Abas do prontuário" className="border-t border-slate-100 pt-4 overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            {TABS.map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#1D4ED8] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  <span>{t.label}</span>
                  {typeof t.count === 'number' && (
                    <span className={`ml-1.5 font-mono tabular-nums ${active ? 'text-blue-100' : 'text-slate-400'}`}>
                      ({t.count})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* ==================== TAB 1: RESUMO CLÍNICO & LINHA DO TEMPO ==================== */}
      {activeTab === 'resumo' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {patient.allergies.trim() && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-900 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Alerta de Alergias / Restrições: </span>
                  {patient.allergies}
                </div>
              </div>
            )}

            <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <h2 className="font-display text-base font-bold text-[#0B1F3A]">
                Quadro Clínico e Dados Cadastrais
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="font-semibold text-slate-500">Diagnóstico Médico</div>
                  <div className="mt-1 text-slate-900">{patient.medicalDiagnosis || 'Não informado'}</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-500">Diagnóstico Fisioterapêutico</div>
                  <div className="mt-1 text-slate-900">{patient.physiotherapyDiagnosis || 'Não informado'}</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-500">Comorbidades</div>
                  <div className="mt-1 text-slate-800 whitespace-pre-line">{patient.comorbidities || 'Nenhuma informada'}</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-500">Medicamentos em Uso</div>
                  <div className="mt-1 text-slate-800">{patient.medications || 'Nenhum informado'}</div>
                </div>
                <div className="sm:col-span-2">
                  <div className="font-semibold text-slate-500">Histórico Clínico</div>
                  <div className="mt-1 text-slate-800 whitespace-pre-line">{patient.clinicalHistory || 'Sem registro'}</div>
                </div>
                <div>
                  <div className="font-semibold text-slate-500">Endereço / E-mail</div>
                  <div className="mt-1 text-slate-700">
                    {[patient.address, patient.email].filter(Boolean).join(' · ') || 'Não informado'}
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-slate-500">Contato de Emergência</div>
                  <div className="mt-1 text-slate-700">{patient.emergencyContact || 'Não informado'}</div>
                </div>
                {patient.clinicalNotes && (
                  <div className="sm:col-span-2">
                    <div className="font-semibold text-slate-500">Observações Clínicas</div>
                    <div className="mt-1 text-slate-800 whitespace-pre-line">{patient.clinicalNotes}</div>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Timeline Clínica */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-[#0B1F3A]">
                Linha do Tempo Clínica
              </h2>
              <span className="font-mono text-xs text-slate-400 tabular-nums">
                {timelineEvents.length} evento(s)
              </span>
            </div>

            {timelineEvents.length === 0 ? (
              <p className="text-xs text-slate-500">
                Nenhum evento clínico registrado para este paciente ainda.
              </p>
            ) : (
              <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
                {timelineEvents.map((ev) => (
                  <div key={ev.id} className="rounded-lg border border-slate-200 bg-slate-50/70 p-3 space-y-1">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="font-mono font-semibold text-[#1D4ED8] tabular-nums">
                        {formatDatePtBr(ev.date)} {ev.time ? `· ${ev.time}` : ''}
                      </span>
                      <span className="uppercase tracking-wide font-semibold text-slate-400 text-[10px]">
                        {ev.category}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-[#0B1F3A]">{ev.title}</div>
                    <div className="text-xs text-slate-600 line-clamp-2">{ev.subtitle}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ==================== TAB 2: AVALIAÇÕES ==================== */}
      {activeTab === 'avaliacoes' && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-[#0B1F3A]">
                Avaliações Fisioterapêuticas do Paciente
              </h2>
              <p className="text-xs text-slate-500">
                Múltiplas avaliações por especialidade preservando o histórico inicial.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => { setImportModalOpen(true); setImportPdfError(''); }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#1D4ED8] bg-white px-4 py-2 text-xs font-semibold text-[#1D4ED8] hover:bg-blue-50"
              >
                <FileUp className="h-3.5 w-3.5" />
                <span>Importar PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setNewAssessmentSpecModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E40AF]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Nova Avaliação</span>
              </button>
            </div>
          </div>

          {patientAssessments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-xs text-slate-500">
              Nenhuma avaliação vinculada a este paciente. Clique em &ldquo;Nova Avaliação&rdquo; para escolher qualquer uma das 22 especialidades.
            </div>
          ) : (
            <div className="space-y-3">
              {patientAssessments.map((asm) => {
                const spec = SPECIALTIES_BY_ID[asm.specialtyId];
                const pct = calculateAssessmentCompletion(asm);
                return (
                  <div
                    key={asm.id}
                    className="rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-[#1D4ED8]" />
                        <span className="font-display text-sm font-bold text-[#0B1F3A]">
                          {spec.code}. {spec.name}
                        </span>
                        <span className="font-mono text-xs text-slate-500 tabular-nums">
                          {formatDatePtBr(asm.identification.evaluationDate)}
                        </span>
                        <span className="font-mono text-xs font-semibold text-[#1D4ED8] tabular-nums">
                          {pct}% preenchido
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {asm.synthesis.kineticFunctionalDiagnosis ||
                          asm.baseAnamnesis.chiefComplaint ||
                          'Sem resumo diagnóstico registrado.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenExistingAssessment(asm)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                      >
                        Abrir Ficha
                      </button>
                      <button
                        type="button"
                        onClick={() => onStartNewReassessment(patient, asm)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Reavaliar
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const res = generateAssessmentPdf(asm);
                          await onArchiveGeneratedPdf({
                            patientId: patient.id,
                            relatedRecordId: asm.id,
                            documentType: 'avaliacao_inicial',
                            title: `Avaliação — ${spec.name}`,
                            specialtyId: asm.specialtyId,
                            documentDate: asm.identification.evaluationDate,
                            blob: res.blob,
                            fileName: res.filename,
                          });
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#0B1F3A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1D4ED8]"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        <span>PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onRequestDeleteItem('assessment', asm.id, `Avaliação de ${spec.name}`)
                        }
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Excluir avaliação"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {importModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-3 sm:p-6">
          <section className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold text-[#0B1F3A]">Importar avaliação por PDF</h2>
                <p className="mt-1 text-xs text-slate-500">Paciente selecionado: {patient.fullName}</p>
              </div>
              <button type="button" onClick={() => { setImportModalOpen(false); setImportedPdf(null); setImportedAssessment(null); }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">
              A leitura é feita localmente no navegador, sem IA e sem enviar o PDF para serviços externos. PDFs digitalizados como imagem não são reconhecidos nesta versão.
            </div>

            <input
              ref={importPdfInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                setImportPdfLoading(true);
                setImportPdfError('');
                setImportedPdf(null);
                setImportedAssessment(null);
                setConfirmPatientMismatch(false);
                try {
                  const result = await parseAssessmentPdf(file, patient);
                  if (patientAssessments.some((item) =>
                    item.specialtyId === result.assessment.specialtyId &&
                    item.identification.evaluationDate === result.assessment.identification.evaluationDate
                  )) {
                    throw new Error('Já existe uma avaliação desta especialidade registrada nesta data para este paciente. Confira a aba Avaliações antes de importar novamente.');
                  }
                  setImportedPdf(file);
                  setImportedAssessment(result.assessment);
                  if (result.mode === 'leitura_textual') {
                    setImportPdfError('PDF antigo reconhecido por leitura textual. Campos e tabelas que não puderam ser identificados permanecerão vazios; confira a ficha antes de confirmar.');
                  }
                } catch (error) {
                  setImportPdfError(error instanceof Error ? error.message : 'Não foi possível ler o PDF.');
                } finally {
                  setImportPdfLoading(false);
                }
              }}
            />

            {!importedAssessment && (
              <button type="button" onClick={() => importPdfInputRef.current?.click()} disabled={importPdfLoading} className="w-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-7 text-center text-sm font-semibold text-[#1D4ED8] hover:border-blue-400 hover:bg-blue-50 disabled:opacity-60">
                <FileUp className="mx-auto mb-2 h-7 w-7" />
                {importPdfLoading ? 'Lendo PDF...' : 'Selecionar avaliação em PDF'}
                <span className="mt-1 block text-[11px] font-normal text-slate-500">Arquivo PDF de até 25 MB</span>
              </button>
            )}

            {importPdfError && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">{importPdfError}</div>
            )}

            {importedAssessment && importedPdf && (
              <div className="space-y-3">
                <div className="rounded-lg border border-slate-200 p-3 text-xs">
                  <div className="font-semibold text-[#0B1F3A]">{importedPdf.name}</div>
                  <div className="mt-1 text-slate-500">{SPECIALTIES_BY_ID[importedAssessment.specialtyId]?.name} · {formatDatePtBr(importedAssessment.identification.evaluationDate)} · {(importedPdf.size / 1024).toFixed(0)} KB</div>
                </div>
                {importedAssessment.identification.fullName.trim().toLocaleLowerCase('pt-BR') !== patient.fullName.trim().toLocaleLowerCase('pt-BR') && (
                  <label className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    <input type="checkbox" checked={confirmPatientMismatch} onChange={(event) => setConfirmPatientMismatch(event.target.checked)} className="mt-0.5" />
                    O nome encontrado no PDF é diferente do paciente selecionado. Confirmo que este documento pertence a {patient.fullName}.
                  </label>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="text-xs font-semibold text-slate-700">Nome no documento
                    <input value={importedAssessment.identification.fullName} onChange={(event) => setImportedAssessment((prev) => prev ? ({ ...prev, identification: { ...prev.identification, fullName: event.target.value } }) : prev)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />
                  </label>
                  <label className="text-xs font-semibold text-slate-700">Data da avaliação
                    <input type="date" value={importedAssessment.identification.evaluationDate} onChange={(event) => setImportedAssessment((prev) => prev ? ({ ...prev, identification: { ...prev.identification, evaluationDate: event.target.value } }) : prev)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />
                  </label>
                </div>
                <label className="block text-xs font-semibold text-slate-700">Queixa principal
                  <textarea value={importedAssessment.baseAnamnesis.chiefComplaint} onChange={(event) => setImportedAssessment((prev) => prev ? ({ ...prev, baseAnamnesis: { ...prev.baseAnamnesis, chiefComplaint: event.target.value } }) : prev)} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />
                </label>
                <label className="block text-xs font-semibold text-slate-700">História da doença atual
                  <textarea value={importedAssessment.baseAnamnesis.hma} onChange={(event) => setImportedAssessment((prev) => prev ? ({ ...prev, baseAnamnesis: { ...prev.baseAnamnesis, hma: event.target.value } }) : prev)} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />
                </label>
                <label className="block text-xs font-semibold text-slate-700">Diagnóstico médico informado
                  <textarea value={importedAssessment.baseAnamnesis.medicalDiagnosis} onChange={(event) => setImportedAssessment((prev) => prev ? ({ ...prev, baseAnamnesis: { ...prev.baseAnamnesis, medicalDiagnosis: event.target.value } }) : prev)} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />
                </label>
                <label className="block text-xs font-semibold text-slate-700">Diagnóstico cinético-funcional
                  <textarea value={importedAssessment.synthesis.kineticFunctionalDiagnosis} onChange={(event) => setImportedAssessment((prev) => prev ? ({ ...prev, synthesis: { ...prev.synthesis, kineticFunctionalDiagnosis: event.target.value } }) : prev)} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />
                </label>
                <label className="block text-xs font-semibold text-slate-700">Achados clínicos relevantes
                  <textarea value={importedAssessment.synthesis.clinicalFindings} onChange={(event) => setImportedAssessment((prev) => prev ? ({ ...prev, synthesis: { ...prev.synthesis, clinicalFindings: event.target.value } }) : prev)} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />
                </label>
                <label className="block text-xs font-semibold text-slate-700">Plano de tratamento e condutas
                  <textarea value={importedAssessment.synthesis.treatmentPlan} onChange={(event) => setImportedAssessment((prev) => prev ? ({ ...prev, synthesis: { ...prev.synthesis, treatmentPlan: event.target.value } }) : prev)} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-normal" />
                </label>
                <p className="text-[11px] leading-relaxed text-slate-500">A avaliação será vinculada ao paciente atual e o PDF original será arquivado. Revise os dados importados; nenhum dado clínico ausente será criado automaticamente.</p>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3">
              <button type="button" onClick={() => { setImportModalOpen(false); setImportedPdf(null); setImportedAssessment(null); setImportPdfError(''); }} className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">Cancelar</button>
              {importedAssessment && importedPdf && (
                <button
                  type="button"
                  disabled={importPdfSaving || (importedAssessment.identification.fullName.trim().toLocaleLowerCase('pt-BR') !== patient.fullName.trim().toLocaleLowerCase('pt-BR') && !confirmPatientMismatch)}
                  onClick={async () => {
                    setImportPdfSaving(true);
                    try {
                      await onImportAssessment({ ...importedAssessment, patientId: patient.id }, importedPdf);
                      setImportModalOpen(false);
                      setImportedPdf(null);
                      setImportedAssessment(null);
                    } catch (error) {
                      setImportPdfError(error instanceof Error ? error.message : 'Falha ao salvar a avaliação importada.');
                    } finally {
                      setImportPdfSaving(false);
                    }
                  }}
                  className="rounded-lg bg-[#1D4ED8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E40AF] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {importPdfSaving ? 'Salvando...' : 'Confirmar e vincular ao paciente'}
                </button>
              )}
            </div>
          </section>
        </div>
      )}

      {/* ==================== TAB 3: EVOLUÇÕES DAS SESSÕES ==================== */}
      {activeTab === 'evolucoes' && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-[#0B1F3A]">
                Histórico Cronológico de Evoluções
              </h2>
              <p className="text-xs text-slate-500">
                Cada sessão permanece preservada longitudinalmente sem sobrescrever evoluções anteriores.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onStartNewEvolution(patient)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E40AF]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Registrar Nova Evolução</span>
            </button>
          </div>

          {patientEvolutions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-xs text-slate-500">
              Nenhuma evolução diária registrada para este paciente ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {patientEvolutions.map((evo, index) => {
                const spec = SPECIALTIES_BY_ID[evo.specialtyId];
                return (
                  <div key={evo.id} className="rounded-xl border border-slate-200 p-4 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-[#0B1F3A] tabular-nums">
                          Sessão #{patientEvolutions.length - index} · {formatDatePtBr(evo.date)} {evo.time}
                        </span>
                        <span className="text-slate-400">·</span>
                        <span className="font-semibold text-[#1D4ED8]">{spec.name}</span>
                        {evo.professionalName && (
                          <>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-600">{evo.professionalName}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenExistingEvolution(evo)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Abrir
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const res = generateEvolutionPdf(evo);
                            await onArchiveGeneratedPdf({
                              patientId: patient.id,
                              relatedRecordId: evo.id,
                              documentType: 'evolucao_clinica',
                              title: `Evolução Clínica — ${formatDatePtBr(evo.date)}`,
                              specialtyId: evo.specialtyId,
                              documentDate: evo.date,
                              blob: res.blob,
                              fileName: res.filename,
                            });
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#0B1F3A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1D4ED8]"
                        >
                          <FileDown className="h-3.5 w-3.5" />
                          <span>PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onRequestDeleteItem('evolution', evo.id, `Evolução de ${formatDatePtBr(evo.date)}`)
                          }
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          aria-label="Excluir evolução"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                      {evo.reportedComplaint && (
                        <p><span className="font-semibold">Queixa:</span> {evo.reportedComplaint}</p>
                      )}
                      {evo.proceduresPerformed && (
                        <p><span className="font-semibold">Condutas:</span> {evo.proceduresPerformed}</p>
                      )}
                      {evo.patientResponse && (
                        <p><span className="font-semibold">Resposta:</span> {evo.patientResponse}</p>
                      )}
                      {evo.intercurrences && (
                        <p><span className="font-semibold">Intercorrências:</span> {evo.intercurrences}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ==================== TAB 4: REAVALIAÇÕES ==================== */}
      {activeTab === 'reavaliacoes' && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-[#0B1F3A]">
                Reavaliações Funcionais e Relatórios Comparativos
              </h2>
              <p className="text-xs text-slate-500">
                Compare dor, força, ADM, equilíbrio, funcionalidade e escalas validadas ao longo do tratamento.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onStartNewReassessment(patient, patientAssessments[0])}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E40AF]"
            >
              <GitCompare className="h-3.5 w-3.5" />
              <span>Nova Reavaliação</span>
            </button>
          </div>

          {patientReassessments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-xs text-slate-500">
              Nenhuma reavaliação registrada para este paciente ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {patientReassessments.map((reav) => {
                const spec = SPECIALTIES_BY_ID[reav.specialtyId];
                return (
                  <div
                    key={reav.id}
                    className="rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-display text-sm font-bold text-[#0B1F3A]">
                          {spec.name}
                        </span>
                        <span className="font-mono text-slate-500 tabular-nums">
                          Reavaliação: {formatDatePtBr(reav.evaluationDate)}
                        </span>
                        {(reav.painInitialEva || reav.painCurrentEva) && (
                          <span className="font-mono font-semibold text-[#1D4ED8] tabular-nums">
                            EVA: {reav.painInitialEva || '-'} → {reav.painCurrentEva || '-'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {reav.clinicalEvolutionSummary || reav.newKineticDiagnosis || 'Sem resumo clínico'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenExistingReassessment(reav)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                      >
                        Abrir
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const res = generateReassessmentPdf(reav, true);
                          await onArchiveGeneratedPdf({
                            patientId: patient.id,
                            relatedRecordId: reav.id,
                            documentType: 'relatorio_comparativo',
                            title: `Relatório Comparativo — ${formatDatePtBr(reav.evaluationDate)}`,
                            specialtyId: reav.specialtyId,
                            documentDate: reav.evaluationDate,
                            blob: res.blob,
                            fileName: res.filename,
                          });
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#0B1F3A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1D4ED8]"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        <span>Relatório PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onRequestDeleteItem(
                            'reassessment',
                            reav.id,
                            `Reavaliação de ${formatDatePtBr(reav.evaluationDate)}`
                          )
                        }
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Excluir reavaliação"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ==================== TAB 5: DOCUMENTOS E PDFs ==================== */}
      {activeTab === 'documentos' && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-[#0B1F3A]">
                Documentos e PDFs Vinculados ao Prontuário
              </h2>
              <p className="text-xs text-slate-500">
                Arquivamento automático de avaliações, anamnese, evoluções, relatórios, alta, encaminhamentos e declarações.
              </p>
            </div>
            <button
              type="button"
              onClick={handleGenerateCompletePatientRecordPdf}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#1D4ED8] bg-white px-4 py-2 text-xs font-semibold text-[#1D4ED8] hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span>{submitting ? 'Gerando...' : 'Gerar Prontuário Completo PDF'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setDocForm({
                  docType: 'relatorio_fisioterapeutico',
                  title: 'Relatório Fisioterapêutico',
                  specialtyId: patientAssessments[0]?.specialtyId ?? 'ortopedia',
                  reportDate: new Date().toISOString().split('T')[0],
                  recipientOrPurpose: '',
                  clinicalSummary: patient.clinicalHistory || '',
                  findingsOrEvolution: '',
                  recommendations: '',
                });
                setDocModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E40AF]"
            >
              <FilePlus2 className="h-3.5 w-3.5" />
              <span>Emitir Documento Clínico (PDF)</span>
            </button>
          </div>

          {patientDocuments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-xs text-slate-500">
              Nenhum PDF arquivado neste prontuário ainda. Gere qualquer avaliação, evolução, reavaliação ou clique em &ldquo;Emitir Documento Clínico&rdquo;.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Título</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Versão / Data</th>
                    <th className="px-4 py-3">Profissional</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patientDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[#0B1F3A]">{doc.title}</div>
                        <div className="font-mono text-[11px] text-slate-400">{doc.fileName}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {DOCUMENT_TYPE_LABELS[doc.documentType]}
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 tabular-nums">
                        v{doc.version} · {formatDatePtBr(doc.documentDate)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {doc.professionalName}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => onPreviewDocument(doc)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Abrir</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDownloadDocument(doc)}
                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 hover:bg-slate-50"
                            title="Baixar PDF"
                            aria-label="Baixar PDF"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onPrintDocument(doc)}
                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-700 hover:bg-slate-50"
                            title="Imprimir PDF"
                            aria-label="Imprimir PDF"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRequestDeleteItem('document', doc.id, doc.title)}
                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title="Excluir documento"
                            aria-label="Excluir documento"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* ==================== TAB 6: PLANO TERAPÊUTICO ==================== */}
      {activeTab === 'plano' && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-[#0B1F3A]">
                Planos Terapêuticos Fisioterapêuticos
              </h2>
              <p className="text-xs text-slate-500">
                Objetivos, condutas propostas, frequência semanal e emissão de PDF vinculado.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setPlanForm({
                  specialtyId: patientAssessments[0]?.specialtyId ?? 'ortopedia',
                  title: 'Plano Terapêutico Fisioterapêutico',
                  kineticDiagnosis: patient.physiotherapyDiagnosis || '',
                  shortTermGoals: '',
                  mediumTermGoals: '',
                  longTermGoals: '',
                  interventions: '',
                  frequency: '',
                  precautions: '',
                  status: 'ativo',
                  startDate: new Date().toISOString().split('T')[0],
                  expectedEndDate: '',
                });
                setPlanModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E40AF]"
            >
              <Target className="h-3.5 w-3.5" />
              <span>Novo Plano Terapêutico</span>
            </button>
          </div>

          {patientPlans.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-xs text-slate-500">
              Nenhum plano terapêutico cadastrado para este paciente.
            </div>
          ) : (
            <div className="space-y-3">
              {patientPlans.map((pl) => (
                <div key={pl.id} className="rounded-xl border border-slate-200 p-4 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-display text-sm font-bold text-[#0B1F3A]">
                        {pl.title}
                      </div>
                      <div className="text-xs text-slate-500">
                        {SPECIALTIES_BY_ID[pl.specialtyId]?.name} · {PLAN_STATUS_LABELS[pl.status]} · Início: {formatDatePtBr(pl.startDate)}
                        {pl.frequency ? ` · ${pl.frequency}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setPlanForm({
                            id: pl.id,
                            specialtyId: pl.specialtyId,
                            title: pl.title,
                            kineticDiagnosis: pl.kineticDiagnosis,
                            shortTermGoals: pl.shortTermGoals,
                            mediumTermGoals: pl.mediumTermGoals,
                            longTermGoals: pl.longTermGoals,
                            interventions: pl.interventions,
                            frequency: pl.frequency,
                            precautions: pl.precautions,
                            status: pl.status,
                            startDate: pl.startDate,
                            expectedEndDate: pl.expectedEndDate,
                          });
                          setPlanModalOpen(true);
                        }}
                        className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
                        title="Editar plano"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const res = generateTreatmentPlanPdf(patient, pl);
                          await onArchiveGeneratedPdf({
                            patientId: patient.id,
                            relatedRecordId: pl.id,
                            documentType: 'plano_terapeutico',
                            title: pl.title,
                            specialtyId: pl.specialtyId,
                            documentDate: pl.startDate,
                            blob: res.blob,
                            fileName: res.filename,
                          });
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#0B1F3A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1D4ED8]"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        <span>PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onRequestDeleteItem('treatment_plan', pl.id, pl.title)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="Excluir plano"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                    {pl.kineticDiagnosis && <p><span className="font-semibold">Diagnóstico:</span> {pl.kineticDiagnosis}</p>}
                    {pl.shortTermGoals && <p><span className="font-semibold">Curto Prazo:</span> {pl.shortTermGoals}</p>}
                    {pl.interventions && <p className="sm:col-span-2"><span className="font-semibold">Condutas:</span> {pl.interventions}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ==================== TAB 7: HISTÓRICO DE ATENDIMENTOS ==================== */}
      {activeTab === 'atendimentos' && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-[#0B1F3A]">
                Histórico de Atendimentos e Agendamentos
              </h2>
              <p className="text-xs text-slate-500">
                Controle de sessões agendadas, realizadas, faltas, cancelamentos e modalidade de atendimento.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setApptForm({
                  appointmentType: 'sessao',
                  specialtyId: patientAssessments[0]?.specialtyId ?? 'ortopedia',
                  scheduledDate: new Date().toISOString().split('T')[0],
                  scheduledTime: new Date().toTimeString().slice(0, 5),
                  durationMinutes: 50,
                  attendanceMode: 'Consultório / Clínica',
                  status: 'realizado',
                  notes: '',
                });
                setApptModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E40AF]"
            >
              <Calendar className="h-3.5 w-3.5" />
              <span>Registrar Atendimento</span>
            </button>
          </div>

          {patientAppointments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-xs text-slate-500">
              Nenhum atendimento registrado para este paciente.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Data / Horário</th>
                    <th className="px-4 py-3">Tipo</th>
                    <th className="px-4 py-3">Especialidade / Modalidade</th>
                    <th className="px-4 py-3">Situação</th>
                    <th className="px-4 py-3">Observações</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {patientAppointments.map((ap) => (
                    <tr key={ap.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono tabular-nums text-slate-800">
                        {formatDatePtBr(ap.scheduledDate)} {ap.scheduledTime} ({ap.durationMinutes} min)
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700">
                        {ap.appointmentType === 'avaliacao' ? 'Avaliação' : 'Sessão'}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="font-semibold text-[#0B1F3A]">
                          {SPECIALTIES_BY_ID[ap.specialtyId]?.name}
                        </div>
                        <div className="text-[11px] text-slate-500">{ap.attendanceMode}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-[#1D4ED8]">
                        {APPOINTMENT_STATUS_LABELS[ap.status]}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                        {ap.notes || '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setApptForm({
                                id: ap.id,
                                appointmentType: ap.appointmentType ?? 'sessao',
                                specialtyId: ap.specialtyId,
                                scheduledDate: ap.scheduledDate,
                                scheduledTime: ap.scheduledTime,
                                durationMinutes: ap.durationMinutes,
                                attendanceMode: ap.attendanceMode,
                                status: ap.status,
                                notes: ap.notes,
                              });
                              setApptModalOpen(true);
                            }}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50"
                            title="Editar"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onRequestDeleteItem(
                                'appointment',
                                ap.id,
                                `Atendimento de ${formatDatePtBr(ap.scheduledDate)}`
                              )
                            }
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* MODAL: Escolher Especialidade para Nova Avaliação */}
      {newAssessmentSpecModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 className="font-display text-base font-bold text-[#0B1F3A]">
                  Nova Avaliação para {patient.fullName}
                </h3>
                <p className="text-xs text-slate-500">
                  A ficha abrirá vinculada ao ID do paciente com dados cadastrais preenchidos automaticamente.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNewAssessmentSpecModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SPECIALTIES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setNewAssessmentSpecModal(false);
                    onStartNewAssessment(patient, s.id);
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-left hover:border-[#1D4ED8] hover:bg-blue-50/40 transition-colors"
                >
                  <div className="font-display text-sm font-semibold text-slate-900 truncate">
                    <span className="font-mono text-xs text-slate-400 mr-1.5">{s.code}.</span>
                    {s.name}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{s.category}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Plano Terapêutico */}
      {planModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="font-display text-base font-bold text-[#0B1F3A]">
                {planForm.id ? 'Editar Plano Terapêutico' : 'Novo Plano Terapêutico'}
              </h3>
              <button
                type="button"
                onClick={() => setPlanModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSavePlanSubmit} className="overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Título do Plano *</label>
                  <input
                    type="text"
                    required
                    value={planForm.title}
                    onChange={(e) => setPlanForm({ ...planForm, title: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Especialidade</label>
                  <select
                    value={planForm.specialtyId}
                    onChange={(e) => setPlanForm({ ...planForm, specialtyId: e.target.value as SpecialtyId })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {SPECIALTIES.map((s) => (
                      <option key={s.id} value={s.id}>{s.code}. {s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={planForm.status}
                    onChange={(e) => setPlanForm({ ...planForm, status: e.target.value as TreatmentPlanStatus })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {(Object.keys(PLAN_STATUS_LABELS) as TreatmentPlanStatus[]).map((st) => (
                      <option key={st} value={st}>{PLAN_STATUS_LABELS[st]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Data de Início</label>
                  <input
                    type="date"
                    value={planForm.startDate}
                    onChange={(e) => setPlanForm({ ...planForm, startDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Previsão de Término</label>
                  <input
                    type="date"
                    value={planForm.expectedEndDate}
                    onChange={(e) => setPlanForm({ ...planForm, expectedEndDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Diagnóstico Cinético-Funcional</label>
                <textarea
                  rows={2}
                  value={planForm.kineticDiagnosis}
                  onChange={(e) => setPlanForm({ ...planForm, kineticDiagnosis: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Objetivos Curto Prazo</label>
                  <textarea
                    rows={2}
                    value={planForm.shortTermGoals}
                    onChange={(e) => setPlanForm({ ...planForm, shortTermGoals: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Objetivos Médio Prazo</label>
                  <textarea
                    rows={2}
                    value={planForm.mediumTermGoals}
                    onChange={(e) => setPlanForm({ ...planForm, mediumTermGoals: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Objetivos Longo Prazo</label>
                  <textarea
                    rows={2}
                    value={planForm.longTermGoals}
                    onChange={(e) => setPlanForm({ ...planForm, longTermGoals: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Condutas e Intervenções</label>
                <textarea
                  rows={3}
                  value={planForm.interventions}
                  onChange={(e) => setPlanForm({ ...planForm, interventions: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Frequência Semanal</label>
                  <input
                    type="text"
                    value={planForm.frequency}
                    onChange={(e) => setPlanForm({ ...planForm, frequency: e.target.value })}
                    placeholder="Ex.: 2x/semana"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Precauções</label>
                  <input
                    type="text"
                    value={planForm.precautions}
                    onChange={(e) => setPlanForm({ ...planForm, precautions: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPlanModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#1D4ED8] px-5 py-2 font-semibold text-white hover:bg-[#1E40AF] disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : 'Salvar Plano'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Atendimento */}
      {apptModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h3 className="font-display text-base font-bold text-[#0B1F3A]">
                {apptForm.id ? 'Editar Atendimento' : 'Registrar Atendimento'}
              </h3>
              <button
                type="button"
                onClick={() => setApptModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveApptSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipo de Atendimento</label>
                  <select
                    required
                    value={apptForm.appointmentType}
                    onChange={(e) => setApptForm({ ...apptForm, appointmentType: e.target.value as AppointmentType })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="avaliacao">Avaliação fisioterapêutica</option>
                    <option value="sessao">Sessão de fisioterapia</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={apptForm.scheduledDate}
                    onChange={(e) => setApptForm({ ...apptForm, scheduledDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Horário</label>
                  <input
                    type="time"
                    value={apptForm.scheduledTime}
                    onChange={(e) => setApptForm({ ...apptForm, scheduledTime: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Especialidade</label>
                  <select
                    value={apptForm.specialtyId}
                    onChange={(e) => setApptForm({ ...apptForm, specialtyId: e.target.value as SpecialtyId })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {SPECIALTIES.map((s) => (
                      <option key={s.id} value={s.id}>{s.code}. {s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Situação</label>
                  <select
                    value={apptForm.status}
                    onChange={(e) => setApptForm({ ...apptForm, status: e.target.value as AppointmentStatus })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {(Object.keys(APPOINTMENT_STATUS_LABELS) as AppointmentStatus[]).map((st) => (
                      <option key={st} value={st}>{APPOINTMENT_STATUS_LABELS[st]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Modalidade</label>
                  <select
                    value={apptForm.attendanceMode}
                    onChange={(e) => setApptForm({ ...apptForm, attendanceMode: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="Consultório / Clínica">Consultório / Clínica</option>
                    <option value="Domiciliar">Domiciliar</option>
                    <option value="Hospitalar / UTI">Hospitalar / UTI</option>
                    <option value="Aquático">Aquático</option>
                    <option value="Telemonitoramento">Telemonitoramento</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Duração (min)</label>
                  <input
                    type="number"
                    min={10}
                    max={480}
                    value={apptForm.durationMinutes}
                    onChange={(e) =>
                      setApptForm({ ...apptForm, durationMinutes: Number(e.target.value) || 50 })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Observações</label>
                <textarea
                  rows={2}
                  value={apptForm.notes}
                  onChange={(e) => setApptForm({ ...apptForm, notes: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setApptModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#1D4ED8] px-5 py-2 font-semibold text-white hover:bg-[#1E40AF] disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : 'Salvar Atendimento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'exercicios' && (
        <ExercisesTab
          patientId={patient.id}
          prescriptions={exercisePrescriptions}
          logs={exerciseLogs}
          onSavePrescription={onSaveExercisePrescription}
          onLogExercise={onLogExercise}
          onUpdatePrescription={onUpdateExercisePrescription}
          onDeletePrescription={onDeleteExercisePrescription}
        />
      )}

      {/* MODAL: Emitir Documento Clínico (Anamnese, Relatório, Alta, Encaminhamento, Declaração) */}
      {docModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-[#1D4ED8]" />
                <h3 className="font-display text-base font-bold text-[#0B1F3A]">
                  Emitir e Arquivar Documento Clínico (PDF)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDocModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleGenerateStandaloneDoc} className="overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tipo de Documento</label>
                  <select
                    value={docForm.docType}
                    onChange={(e) => {
                      const nextType = e.target.value as typeof docForm.docType;
                      setDocForm({
                        ...docForm,
                        docType: nextType,
                        title: DOCUMENT_TYPE_LABELS[nextType],
                      });
                    }}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="ficha_anamnese">Ficha de Anamnese</option>
                    <option value="relatorio_fisioterapeutico">Relatório Fisioterapêutico</option>
                    <option value="relatorio_alta">Relatório de Alta</option>
                    <option value="encaminhamento">Encaminhamento</option>
                    <option value="declaracao_outros">Declaração / Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Data de Emissão</label>
                  <input
                    type="date"
                    required
                    value={docForm.reportDate}
                    onChange={(e) => setDocForm({ ...docForm, reportDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Título do Documento</label>
                  <input
                    type="text"
                    required
                    value={docForm.title}
                    onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Especialidade</label>
                  <select
                    value={docForm.specialtyId}
                    onChange={(e) => setDocForm({ ...docForm, specialtyId: e.target.value as SpecialtyId })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {SPECIALTIES.map((s) => (
                      <option key={s.id} value={s.id}>{s.code}. {s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {docForm.docType !== 'ficha_anamnese' ? (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Destinatário / Finalidade (opcional)
                    </label>
                    <input
                      type="text"
                      value={docForm.recipientOrPurpose}
                      onChange={(e) => setDocForm({ ...docForm, recipientOrPurpose: e.target.value })}
                      placeholder="Ex.: Médico assistente, perícia, atividade laboral, academia..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Síntese Clínica / Descrição *
                    </label>
                    <textarea
                      rows={4}
                      required
                      value={docForm.clinicalSummary}
                      onChange={(e) => setDocForm({ ...docForm, clinicalSummary: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Achados Objetivos / Evolução Funcional
                    </label>
                    <textarea
                      rows={3}
                      value={docForm.findingsOrEvolution}
                      onChange={(e) => setDocForm({ ...docForm, findingsOrEvolution: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Recomendações / Condutas / Orientações
                    </label>
                    <textarea
                      rows={2}
                      value={docForm.recommendations}
                      onChange={(e) => setDocForm({ ...docForm, recommendations: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 text-slate-700">
                  A Ficha de Anamnese será gerada automaticamente com os dados cadastrais, diagnósticos, histórico clínico, comorbidades, medicamentos e alergias de <strong>{patient.fullName}</strong> (incluindo queixa principal e HDA da avaliação mais recente, caso exista).
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDocModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-5 py-2 font-semibold text-white hover:bg-[#1E40AF] disabled:opacity-50"
                >
                  <FileDown className="h-4 w-4" />
                  <span>{submitting ? 'Gerando e Arquivando...' : 'Gerar PDF e Arquivar'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
