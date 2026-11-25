import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  FileDown,
  FolderOpen,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { ORTHOPEDIC_REGIONS, ORTHOPEDIC_REGION_LIST } from '../data/orthopedicRegions';
import { CLINICAL_INSTRUMENTS, INSTRUMENTS_BY_ID } from '../data/scalesAndTests';
import { SPECIALTIES_BY_ID } from '../data/specialties';
import {
  AssessmentRecord,
  AssessmentStepId,
  EvaluationStatus,
  FieldDefinition,
  OrthopedicRegionId,
  PatientRecord,
  SpecialTestResult,
  SpecialTestTemplate,
} from '../types/clinical';
import {
  calculateAgeFromBirthDate,
  calculateAssessmentCompletion,
  calculateIMC,
  calculateLsi,
  calculateMrcSumScore,
  calculatePerimetryDiff,
  calculateSunnybrookScore,
  formatDatePtBr,
  PROFESSIONAL_INFO,
  syncOrthopedicRegions,
} from '../utils/calculations';
import { generateAssessmentPdf } from '../utils/pdfGenerator';
import { ScaleRunner } from './ScaleRunner';
import {
  CardioMonitoringSection,
  FacialPalsySection,
  PelvicSection,
  UtiClinicalSection,
} from './SpecialtySpecificSections';

const STEPS: Array<{ id: AssessmentStepId; label: string; shortLabel: string }> = [
  { id: 'identificacao', label: '1. Identificação', shortLabel: '1. Identif.' },
  { id: 'anamnese', label: '2. Anamnese', shortLabel: '2. Anamnese' },
  { id: 'avaliacao', label: '3. Avaliação', shortLabel: '3. Avaliação' },
  { id: 'testes', label: '4. Testes e Escalas', shortLabel: '4. Testes' },
  { id: 'resultados', label: '5. Resultados', shortLabel: '5. Result.' },
  { id: 'diagnostico', label: '6. Diagnóstico', shortLabel: '6. Diagnóst.' },
  { id: 'objetivos', label: '7. Objetivos', shortLabel: '7. Objetivos' },
  { id: 'plano', label: '8. Plano Terapêutico', shortLabel: '8. Plano' },
  { id: 'relatorio', label: '9. Relatório e PDF', shortLabel: '9. Relatório' },
];

const PAIN_CHARACTERISTICS = [
  'Aguda / Pontada',
  'Latejante',
  'Queimação / Ardência',
  'Choque / Irradiada',
  'Peso / Cansada',
  'Mecânica (ao movimento)',
  'Inflamatória / Noturna',
];

interface AssessmentWorkspaceProps {
  assessment: AssessmentRecord;
  patients: PatientRecord[];
  initialStep?: AssessmentStepId;
  onChange: (updated: AssessmentRecord) => void;
  onSaveToRecord: (assessment: AssessmentRecord) => Promise<void>;
  onArchivePdf: (assessment: AssessmentRecord, blob: Blob, filename: string) => Promise<void>;
  onOpenPatientRecord: (patientId: string) => void;
  onBackToDashboard: () => void;
  onRequestClear: () => void;
  onCreateReassessment: (assessment: AssessmentRecord) => void;
}

export const AssessmentWorkspace: React.FC<AssessmentWorkspaceProps> = ({
  assessment,
  patients,
  initialStep = 'identificacao',
  onChange,
  onSaveToRecord,
  onArchivePdf,
  onOpenPatientRecord,
  onBackToDashboard,
  onRequestClear,
  onCreateReassessment,
}) => {
  const [step, setStep] = useState<AssessmentStepId>(initialStep);
  const [savingRecord, setSavingRecord] = useState(false);
  const [extraScaleToAdd, setExtraScaleToAdd] = useState('');
  const [customGonioJoint, setCustomGonioJoint] = useState('');
  const [customGonioMove, setCustomGonioMove] = useState('');
  const [customStrengthName, setCustomStrengthName] = useState('');
  const [customPeriPoint, setCustomPeriPoint] = useState('');
  const [hopAffected, setHopAffected] = useState('');
  const [hopUnaffected, setHopUnaffected] = useState('');

  const spec = SPECIALTIES_BY_ID[assessment.specialtyId];
  const completionPct = calculateAssessmentCompletion(assessment);
  const currentStepIdx = STEPS.findIndex((s) => s.id === step);

  const imc = useMemo(
    () => calculateIMC(assessment.identification.weightKg, assessment.identification.heightCm),
    [assessment.identification.weightKg, assessment.identification.heightCm]
  );

  const activeSpecialTests: SpecialTestTemplate[] = useMemo(() => {
    if (spec.id === 'ortopedia') {
      return assessment.selectedOrthopedicRegions.flatMap(
        (rId) => ORTHOPEDIC_REGIONS[rId]?.specialTests ?? []
      );
    }
    return spec.specialTests;
  }, [spec, assessment.selectedOrthopedicRegions]);

  const touchUpdate = (patch: Partial<AssessmentRecord>) => {
    onChange({
      ...assessment,
      ...patch,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSelectPatient = (patientId: string) => {
    if (!patientId) {
      touchUpdate({ patientId: undefined });
      return;
    }
    const found = patients.find((p) => p.id === patientId);
    if (!found) return;
    touchUpdate({
      patientId: found.id,
      identification: {
        ...assessment.identification,
        fullName: found.fullName,
        birthDate: found.birthDate || assessment.identification.birthDate,
        age: found.birthDate
          ? calculateAgeFromBirthDate(found.birthDate)
          : assessment.identification.age,
        sex: found.sex || assessment.identification.sex,
        documentId: found.cpf || assessment.identification.documentId,
        phone: found.phone || assessment.identification.phone,
        lgpdAcknowledged: found.lgpdConsent,
      },
      baseAnamnesis: {
        ...assessment.baseAnamnesis,
        medicalDiagnosis:
          assessment.baseAnamnesis.medicalDiagnosis || found.medicalDiagnosis,
        medications: assessment.baseAnamnesis.medications || found.medications,
        clinicalHistory:
          assessment.baseAnamnesis.clinicalHistory ||
          [found.clinicalHistory, found.comorbidities].filter(Boolean).join('\n'),
      },
      synthesis: {
        ...assessment.synthesis,
        kineticFunctionalDiagnosis:
          assessment.synthesis.kineticFunctionalDiagnosis || found.physiotherapyDiagnosis,
      },
    });
  };

  const handleSaveAssessment = async () => {
    if (!assessment.patientId) return;
    setSavingRecord(true);
    try {
      await onSaveToRecord(assessment);
    } finally {
      setSavingRecord(false);
    }
  };

  const handleGenerateAndArchivePdf = async () => {
    const res = generateAssessmentPdf(assessment);
    if (assessment.patientId) {
      setSavingRecord(true);
      try {
        await onSaveToRecord(assessment);
        await onArchivePdf(assessment, res.blob, res.filename);
      } finally {
        setSavingRecord(false);
      }
    }
  };

  const toggleOrthopedicRegion = (regionId: OrthopedicRegionId) => {
    const exists = assessment.selectedOrthopedicRegions.includes(regionId);
    const nextRegions = exists
      ? assessment.selectedOrthopedicRegions.filter((r) => r !== regionId)
      : [...assessment.selectedOrthopedicRegions, regionId];
    onChange({
      ...syncOrthopedicRegions(assessment, nextRegions),
      updatedAt: new Date().toISOString(),
    });
  };

  const renderCustomField = (
    field: FieldDefinition,
    bag: Record<string, string | string[] | boolean>,
    onUpdateBag: (next: Record<string, string | string[] | boolean>) => void
  ) => {
    const val = bag[field.id];

    if (field.type === 'textarea') {
      return (
        <div key={field.id} className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 mb-1">{field.label}</label>
          <textarea
            rows={2}
            value={String(val ?? '')}
            onChange={(e) => onUpdateBag({ ...bag, [field.id]: e.target.value })}
            placeholder={field.placeholder || 'Registrar achados objetivos...'}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
          />
        </div>
      );
    }

    if (field.type === 'select') {
      return (
        <div key={field.id}>
          <label className="block text-xs font-semibold text-slate-700 mb-1">{field.label}</label>
          <select
            value={String(val ?? '')}
            onChange={(e) => onUpdateBag({ ...bag, [field.id]: e.target.value })}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
          >
            <option value="">Selecionar...</option>
            {(field.options ?? []).map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      );
    }

    if (field.type === 'checkbox-group') {
      const selected = Array.isArray(val) ? val : [];
      return (
        <div key={field.id} className="sm:col-span-2">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">{field.label}</label>
          <div className="flex flex-wrap gap-2">
            {(field.options ?? []).map((opt) => {
              const checked = selected.includes(opt);
              return (
                <label
                  key={opt}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs cursor-pointer transition-colors ${
                    checked
                      ? 'border-[#1D4ED8] bg-blue-50 text-[#0B1F3A] font-medium'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = checked ? selected.filter((i) => i !== opt) : [...selected, opt];
                      onUpdateBag({ ...bag, [field.id]: next });
                    }}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-[#1D4ED8]"
                  />
                  <span>{opt}</span>
                </label>
              );
            })}
          </div>
        </div>
      );
    }

    return (
      <div key={field.id}>
        <label className="block text-xs font-semibold text-slate-700 mb-1">{field.label}</label>
        <input
          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
          value={String(val ?? '')}
          onChange={(e) => onUpdateBag({ ...bag, [field.id]: e.target.value })}
          placeholder={field.placeholder || ''}
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[#1D4ED8] focus:outline-none"
        />
      </div>
    );
  };

  const updateSpecialTest = (test: SpecialTestTemplate, patch: Partial<SpecialTestResult>) => {
    const prev: SpecialTestResult = assessment.specialTests[test.id] ?? {
      id: test.id,
      name: test.name,
      resultRight: '',
      resultLeft: '',
      resultSingle: '',
      notes: '',
    };
    touchUpdate({
      specialTests: {
        ...assessment.specialTests,
        [test.id]: { ...prev, ...patch },
      },
    });
  };

  const handleAddCustomGoniometry = () => {
    if (!customGonioJoint.trim() || !customGonioMove.trim()) return;
    touchUpdate({
      goniometry: [
        ...assessment.goniometry,
        {
          id: `custom-g-${Date.now()}`,
          joint: customGonioJoint.trim(),
          movement: customGonioMove.trim(),
          normalRange: 'Conforme referência',
          activeRight: '',
          activeLeft: '',
          passiveRight: '',
          passiveLeft: '',
          status: 'avaliado',
          notes: '',
        },
      ],
    });
    setCustomGonioJoint('');
    setCustomGonioMove('');
  };

  const handleAddCustomStrength = () => {
    if (!customStrengthName.trim()) return;
    touchUpdate({
      strength: [
        ...assessment.strength,
        {
          id: `custom-s-${Date.now()}`,
          muscleOrGroup: customStrengthName.trim(),
          mrcRight: '',
          mrcLeft: '',
          status: 'avaliado',
          notes: '',
        },
      ],
    });
    setCustomStrengthName('');
  };

  const handleAddCustomPerimetry = () => {
    if (!customPeriPoint.trim()) return;
    touchUpdate({
      perimetry: [
        ...assessment.perimetry,
        {
          id: `custom-p-${Date.now()}`,
          point: customPeriPoint.trim(),
          rightCm: '',
          leftCm: '',
          status: 'avaliado',
          notes: '',
        },
      ],
    });
    setCustomPeriPoint('');
  };

  const handleAddExtraScale = () => {
    if (!extraScaleToAdd || assessment.scales[extraScaleToAdd]) return;
    touchUpdate({
      scales: {
        ...assessment.scales,
        [extraScaleToAdd]: {
          scaleId: extraScaleToAdd,
          status: 'avaliado',
          score: '',
          interpretation: '',
          subScores: {},
          notes: '',
        },
      },
    });
    setExtraScaleToAdd('');
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-5 sm:px-8 sm:py-6 space-y-6">
      {/* Top Workspace Context Bar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onBackToDashboard}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8] hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Voltar ao Painel Inicial</span>
              </button>
              {assessment.patientId && (
                <button
                  type="button"
                  onClick={() => onOpenPatientRecord(assessment.patientId!)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B1F3A] hover:underline"
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  <span>Abrir Prontuário</span>
                </button>
              )}
            </div>
            <h1 className="font-display text-xl font-bold text-[#0B1F3A] sm:text-2xl">
              <span className="font-mono text-base text-slate-400 mr-2 tabular-nums">{spec.code}.</span>
              {spec.name}
            </h1>
            <p className="text-xs text-slate-500">
              {assessment.identification.fullName.trim()
                ? `Paciente: ${assessment.identification.fullName} · Data: ${formatDatePtBr(assessment.identification.evaluationDate)}`
                : 'Vincule um paciente cadastrado para salvar no prontuário e arquivar PDFs automaticamente'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <span className="text-[11px] font-medium text-slate-500">Preenchimento</span>
              <span className="font-mono text-xs font-bold text-[#0B1F3A] tabular-nums">{completionPct}%</span>
            </div>
            <button
              type="button"
              onClick={handleSaveAssessment}
              disabled={!assessment.patientId || savingRecord}
              title={
                assessment.patientId
                  ? 'Salvar ficha no prontuário do paciente'
                  : 'Vincule um paciente abaixo para salvar no prontuário'
              }
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#1D4ED8] bg-blue-50 px-3.5 py-2 text-xs font-semibold text-[#1D4ED8] hover:bg-blue-100 disabled:opacity-40 whitespace-nowrap"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{savingRecord ? 'Salvando...' : 'Salvar no Prontuário'}</span>
            </button>
            <button
              type="button"
              onClick={() => setStep('relatorio')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Pré-visualizar</span>
            </button>
            <button
              type="button"
              onClick={handleGenerateAndArchivePdf}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B1F3A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#132d52] whitespace-nowrap"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span>Gerar PDF</span>
            </button>
            <button
              type="button"
              onClick={onRequestClear}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200 whitespace-nowrap"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Limpar</span>
            </button>
          </div>
        </div>

        {/* Patient UUID Binding Bar */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
          <div className="text-xs text-slate-700">
            <span className="font-semibold text-[#0B1F3A]">Vínculo com Prontuário (ID Único): </span>
            {assessment.patientId
              ? 'Ficha vinculada. Ao gerar PDF, uma cópia será arquivada automaticamente no prontuário.'
              : 'Selecione um paciente cadastrado para vincular e arquivar esta avaliação.'}
          </div>
          <select
            value={assessment.patientId ?? ''}
            onChange={(e) => handleSelectPatient(e.target.value)}
            aria-label="Vincular paciente cadastrado"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 sm:min-w-[260px]"
          >
            <option value="">Sem vínculo (apenas preenchimento avulso)</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName} {p.cpf ? `(${p.cpf})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* 9-Step Stepper Navigation */}
        <nav aria-label="Etapas da avaliação" className="mt-5 border-t border-slate-100 pt-4 overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            {STEPS.map((st) => {
              const active = step === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStep(st.id)}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#1D4ED8] text-white font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  <span className="hidden xl:inline">{st.label}</span>
                  <span className="xl:hidden">{st.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Specialty Clinical Alerts */}
      {spec.clinicalAlerts && spec.clinicalAlerts.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-950 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            {spec.clinicalAlerts.map((al, i) => (
              <p key={i}>{al}</p>
            ))}
          </div>
        </div>
      )}

      {/* ==================== STEP 1: IDENTIFICAÇÃO ==================== */}
      {step === 'identificacao' && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-6">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0B1F3A]">1. Identificação do Paciente</h2>
            <p className="text-xs text-slate-500">Dados demográficos, contato, antropometria e autorizações da sessão.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nome Completo do Paciente</label>
              <input
                type="text"
                value={assessment.identification.fullName}
                onChange={(e) =>
                  touchUpdate({
                    identification: { ...assessment.identification, fullName: e.target.value },
                  })
                }
                placeholder="Nome completo (utilizado na nomeação do PDF)"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Data da Avaliação</label>
              <input
                type="date"
                value={assessment.identification.evaluationDate}
                onChange={(e) =>
                  touchUpdate({
                    identification: { ...assessment.identification, evaluationDate: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Data de Nascimento</label>
              <input
                type="date"
                value={assessment.identification.birthDate}
                onChange={(e) =>
                  touchUpdate({
                    identification: { ...assessment.identification, birthDate: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Idade</label>
              <input
                type="text"
                value={assessment.identification.age}
                onChange={(e) =>
                  touchUpdate({
                    identification: { ...assessment.identification, age: e.target.value },
                  })
                }
                placeholder="Ex.: 42 anos / 8 meses"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sexo</label>
              <select
                value={assessment.identification.sex}
                onChange={(e) =>
                  touchUpdate({
                    identification: {
                      ...assessment.identification,
                      sex: e.target.value as AssessmentRecord['identification']['sex'],
                    },
                  })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Selecionar...</option>
                <option value="Feminino">Feminino</option>
                <option value="Masculino">Masculino</option>
                <option value="Outro">Outro</option>
                <option value="Não informado">Não informado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Documento (opcional)</label>
              <input
                type="text"
                value={assessment.identification.documentId}
                onChange={(e) =>
                  touchUpdate({
                    identification: { ...assessment.identification, documentId: e.target.value },
                  })
                }
                placeholder="CPF ou prontuário interno"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone / Contato</label>
              <input
                type="text"
                value={assessment.identification.phone}
                onChange={(e) =>
                  touchUpdate({
                    identification: { ...assessment.identification, phone: e.target.value },
                  })
                }
                placeholder="(00) 00000-0000"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ocupação / Profissão</label>
              <input
                type="text"
                value={assessment.identification.occupation}
                onChange={(e) =>
                  touchUpdate({
                    identification: { ...assessment.identification, occupation: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Local / Modalidade de Atendimento</label>
              <select
                value={assessment.identification.attendanceMode}
                onChange={(e) =>
                  touchUpdate({
                    identification: {
                      ...assessment.identification,
                      attendanceMode: e.target.value as AssessmentRecord['identification']['attendanceMode'],
                    },
                  })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="Consultório / Clínica">Consultório / Clínica</option>
                <option value="Domiciliar">Domiciliar</option>
                <option value="Hospitalar / UTI">Hospitalar / UTI</option>
                <option value="Aquático">Aquático (Piscina Terapêutica)</option>
                <option value="Laboral / In Loco">Laboral / In Loco</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Dominância Lateral</label>
              <select
                value={assessment.identification.dominance}
                onChange={(e) =>
                  touchUpdate({
                    identification: {
                      ...assessment.identification,
                      dominance: e.target.value as AssessmentRecord['identification']['dominance'],
                    },
                  })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Selecionar...</option>
                <option value="Destro">Destro</option>
                <option value="Canhoto">Canhoto</option>
                <option value="Ambidestro">Ambidestro</option>
                <option value="Não avaliado">Não avaliado</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Autorização para Registro Fotográfico</label>
              <select
                value={assessment.identification.photoConsent}
                onChange={(e) =>
                  touchUpdate({
                    identification: {
                      ...assessment.identification,
                      photoConsent: e.target.value as AssessmentRecord['identification']['photoConsent'],
                    },
                  })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="Não aplicável">Não aplicável</option>
                <option value="Autorizado">Autorizado pelo paciente/responsável</option>
                <option value="Não autorizado">Não autorizado</option>
              </select>
            </div>
          </div>

          {/* Guardian fields (especially relevant for Pediatrics / Geriatrics) */}
          {(spec.id === 'pediatria' || spec.id === 'respiratoria-pediatrica' || spec.id === 'geriatria' || spec.id === 'uti-hospitalar') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome do Responsável / Acompanhante</label>
                <input
                  type="text"
                  value={assessment.identification.guardianName ?? ''}
                  onChange={(e) =>
                    touchUpdate({
                      identification: { ...assessment.identification, guardianName: e.target.value },
                    })
                  }
                  placeholder="Obrigatório em pediatria ou quando aplicável"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Vínculo / Parentesco</label>
                <input
                  type="text"
                  value={assessment.identification.guardianRelation ?? ''}
                  onChange={(e) =>
                    touchUpdate({
                      identification: { ...assessment.identification, guardianRelation: e.target.value },
                    })
                  }
                  placeholder="Ex.: Mãe, Pai, Filho(a), Cuidador"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {/* Anthropometrics with Auto IMC */}
          {spec.includeAnthropometrics && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
              <div className="font-display text-xs font-bold text-[#0B1F3A]">
                Dados Antropométricos e Cálculo Automático de IMC
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Peso Corporal (kg)</label>
                  <input
                    type="text"
                    value={assessment.identification.weightKg}
                    onChange={(e) =>
                      touchUpdate({
                        identification: { ...assessment.identification, weightKg: e.target.value },
                      })
                    }
                    placeholder="Ex.: 72.5"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estatura (cm)</label>
                  <input
                    type="text"
                    value={assessment.identification.heightCm}
                    onChange={(e) =>
                      touchUpdate({
                        identification: { ...assessment.identification, heightCm: e.target.value },
                      })
                    }
                    placeholder="Ex.: 174"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-2">
                  <div className="text-[11px] text-slate-500">IMC Calculado</div>
                  {imc ? (
                    <div className="font-mono text-sm font-bold text-[#0B1F3A] tabular-nums">
                      {imc.value} kg/m² <span className="font-sans text-xs font-normal text-slate-600">({imc.classification})</span>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400">Informe peso e altura</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ==================== STEP 2: ANAMNESE ==================== */}
      {step === 'anamnese' && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-6">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0B1F3A]">2. Anamnese e História Clínica</h2>
            <p className="text-xs text-slate-500">Coleta clínica estruturada e campos específicos de {spec.name}.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Queixa Principal (nas palavras do paciente/responsável)</label>
              <textarea
                rows={2}
                value={assessment.baseAnamnesis.chiefComplaint}
                onChange={(e) =>
                  touchUpdate({
                    baseAnamnesis: { ...assessment.baseAnamnesis, chiefComplaint: e.target.value },
                  })
                }
                placeholder="Descreva a queixa funcional principal..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">História da Doença Atual (HDA)</label>
              <textarea
                rows={3}
                value={assessment.baseAnamnesis.hma}
                onChange={(e) =>
                  touchUpdate({
                    baseAnamnesis: { ...assessment.baseAnamnesis, hma: e.target.value },
                  })
                }
                placeholder="Início, evolução temporal, tratamentos prévios e resposta..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Diagnóstico Médico Informado</label>
              <input
                type="text"
                value={assessment.baseAnamnesis.medicalDiagnosis}
                onChange={(e) =>
                  touchUpdate({
                    baseAnamnesis: { ...assessment.baseAnamnesis, medicalDiagnosis: e.target.value },
                  })
                }
                placeholder="Ex.: CID / laudo médico trazido pelo paciente"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Medicamentos em Uso</label>
              <input
                type="text"
                value={assessment.baseAnamnesis.medications}
                onChange={(e) =>
                  touchUpdate({
                    baseAnamnesis: { ...assessment.baseAnamnesis, medications: e.target.value },
                  })
                }
                placeholder="Nome, posologia ou classe medicamentosa informada"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">História Clínica / Comorbidades</label>
              <textarea
                rows={2}
                value={assessment.baseAnamnesis.clinicalHistory}
                onChange={(e) =>
                  touchUpdate({
                    baseAnamnesis: { ...assessment.baseAnamnesis, clinicalHistory: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Histórico Cirúrgico e Traumático</label>
              <textarea
                rows={2}
                value={assessment.baseAnamnesis.surgicalTraumaticHistory}
                onChange={(e) =>
                  touchUpdate({
                    baseAnamnesis: { ...assessment.baseAnamnesis, surgicalTraumaticHistory: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Exames Complementares (Rx, RM, TC, US, Espirometria, Lab.)</label>
              <textarea
                rows={2}
                value={assessment.baseAnamnesis.complementaryExams}
                onChange={(e) =>
                  touchUpdate({
                    baseAnamnesis: { ...assessment.baseAnamnesis, complementaryExams: e.target.value },
                  })
                }
                placeholder="Datas e laudos objetivos dos exames apresentados..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          {spec.anamnesisFields.length > 0 && (
            <div className="border-t border-slate-200 pt-5 space-y-4">
              <h3 className="font-display text-sm font-bold text-[#0B1F3A]">
                Anamnese Específica — {spec.name}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {spec.anamnesisFields.map((field) =>
                  renderCustomField(field, assessment.customAnamnesis, (next) =>
                    touchUpdate({ customAnamnesis: next })
                  )
                )}
              </div>
            </div>
          )}

          {assessment.facialPalsy && (
            <div className="border-t border-slate-200 pt-5 space-y-4">
              <h3 className="font-display text-sm font-bold text-[#0B1F3A]">
                Anamnese Específica — Paralisia Facial
              </h3>
              <FacialPalsySection
                data={assessment.facialPalsy}
                section="anamnese"
                onChange={(next) => touchUpdate({ facialPalsy: next })}
              />
            </div>
          )}
        </section>
      )}

      {/* ==================== STEP 3: AVALIAÇÃO FÍSICA ==================== */}
      {step === 'avaliacao' && (
        <section className="space-y-6">
          {/* Orthopedic Region Selector */}
          {spec.includeOrthopedicRegions && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <div>
                <h2 className="font-display text-base font-bold text-[#0B1F3A]">
                  Subcategorias Anatômicas de Ortopedia e Traumatologia
                </h2>
                <p className="text-xs text-slate-500">
                  Selecione as regiões acometidas. Os campos de goniometria, força muscular e testes ortopédicos especiais serão exibidos especificamente por articulação, sem misturar articulações diferentes.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {ORTHOPEDIC_REGION_LIST.map((reg) => {
                  const selected = assessment.selectedOrthopedicRegions.includes(reg.id);
                  return (
                    <button
                      key={reg.id}
                      type="button"
                      onClick={() => toggleOrthopedicRegion(reg.id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-semibold transition-colors ${
                        selected
                          ? 'border-[#1D4ED8] bg-[#1D4ED8] text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {selected && <Check className="h-3.5 w-3.5" />}
                      <span>{reg.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Vital Signs */}
          {spec.includeVitalSigns && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-base font-bold text-[#0B1F3A]">Sinais Vitais</h3>
                <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                  {(['avaliado', 'nao_avaliado', 'nao_aplicavel'] as EvaluationStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() =>
                        touchUpdate({ vitalSigns: { ...assessment.vitalSigns, status: st } })
                      }
                      className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
                        assessment.vitalSigns.status === st
                          ? 'bg-white text-[#0B1F3A] shadow-sm font-semibold'
                          : 'text-slate-600'
                      }`}
                    >
                      {st === 'avaliado' ? 'Avaliado' : st === 'nao_avaliado' ? 'Não avaliado' : 'Não aplicável'}
                    </button>
                  ))}
                </div>
              </div>

              {assessment.vitalSigns.status === 'avaliado' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">FC (bpm)</label>
                    <input
                      type="text"
                      value={assessment.vitalSigns.heartRateBpm}
                      onChange={(e) =>
                        touchUpdate({ vitalSigns: { ...assessment.vitalSigns, heartRateBpm: e.target.value } })
                      }
                      placeholder="78"
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">PA (mmHg)</label>
                    <input
                      type="text"
                      value={assessment.vitalSigns.bloodPressureMmHg}
                      onChange={(e) =>
                        touchUpdate({ vitalSigns: { ...assessment.vitalSigns, bloodPressureMmHg: e.target.value } })
                      }
                      placeholder="120/80"
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">FR (irpm)</label>
                    <input
                      type="text"
                      value={assessment.vitalSigns.respiratoryRateRpm}
                      onChange={(e) =>
                        touchUpdate({ vitalSigns: { ...assessment.vitalSigns, respiratoryRateRpm: e.target.value } })
                      }
                      placeholder="16"
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">SpO2 (%)</label>
                    <input
                      type="text"
                      value={assessment.vitalSigns.spo2Percent}
                      onChange={(e) =>
                        touchUpdate({ vitalSigns: { ...assessment.vitalSigns, spo2Percent: e.target.value } })
                      }
                      placeholder="98"
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Temp (°C)</label>
                    <input
                      type="text"
                      value={assessment.vitalSigns.temperatureC}
                      onChange={(e) =>
                        touchUpdate({ vitalSigns: { ...assessment.vitalSigns, temperatureC: e.target.value } })
                      }
                      placeholder="36.5"
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Borg Dispneia</label>
                    <input
                      type="text"
                      value={assessment.vitalSigns.borgDispnea}
                      onChange={(e) =>
                        touchUpdate({ vitalSigns: { ...assessment.vitalSigns, borgDispnea: e.target.value } })
                      }
                      placeholder="0–10"
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Borg Esforço</label>
                    <input
                      type="text"
                      value={assessment.vitalSigns.borgEffort}
                      onChange={(e) =>
                        touchUpdate({ vitalSigns: { ...assessment.vitalSigns, borgEffort: e.target.value } })
                      }
                      placeholder="0–10"
                      className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pain Scale (EVA / END) */}
          {spec.includePainScale && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-base font-bold text-[#0B1F3A]">Avaliação da Dor (EVA e END)</h3>
                <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                  {(['avaliado', 'nao_avaliado', 'nao_aplicavel'] as EvaluationStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => touchUpdate({ pain: { ...assessment.pain, status: st } })}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
                        assessment.pain.status === st
                          ? 'bg-white text-[#0B1F3A] shadow-sm font-semibold'
                          : 'text-slate-600'
                      }`}
                    >
                      {st === 'avaliado' ? 'Avaliado' : st === 'nao_avaliado' ? 'Não avaliado' : 'Não aplicável'}
                    </button>
                  ))}
                </div>
              </div>

              {assessment.pain.status === 'avaliado' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-700">Escala Visual Analógica (EVA 0–10)</span>
                        <span className="font-mono text-sm font-bold text-[#1D4ED8] tabular-nums">
                          {assessment.pain.evaScore !== null ? `${assessment.pain.evaScore}/10` : 'Não marcado'}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={10}
                        value={assessment.pain.evaScore ?? 0}
                        onChange={(e) =>
                          touchUpdate({ pain: { ...assessment.pain, evaScore: Number(e.target.value) } })
                        }
                        className="w-full accent-[#1D4ED8]"
                      />
                      <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                        <span>0 Sem dor</span>
                        <span>5 Moderada</span>
                        <span>10 Pior dor</span>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-700">Escala Numérica de Dor (END 0–10)</span>
                        <span className="font-mono text-sm font-bold text-[#1D4ED8] tabular-nums">
                          {assessment.pain.endScore !== null ? `${assessment.pain.endScore}/10` : 'Não marcado'}
                        </span>
                      </div>
                      <div className="grid grid-cols-11 gap-1">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() =>
                              touchUpdate({ pain: { ...assessment.pain, endScore: num } })
                            }
                            className={`rounded py-1.5 font-mono text-xs font-semibold transition-colors ${
                              assessment.pain.endScore === num
                                ? 'bg-[#1D4ED8] text-white'
                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Localização da dor</label>
                      <input
                        type="text"
                        value={assessment.pain.location}
                        onChange={(e) =>
                          touchUpdate({ pain: { ...assessment.pain, location: e.target.value } })
                        }
                        placeholder="Ex.: Região anterior do ombro D"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Frequência</label>
                      <input
                        type="text"
                        value={assessment.pain.frequency}
                        onChange={(e) =>
                          touchUpdate({ pain: { ...assessment.pain, frequency: e.target.value } })
                        }
                        placeholder="Contínua / Intermitente / Aos esforços"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Duração</label>
                      <input
                        type="text"
                        value={assessment.pain.duration}
                        onChange={(e) =>
                          touchUpdate({ pain: { ...assessment.pain, duration: e.target.value } })
                        }
                        placeholder="Ex.: 3 meses"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Características da dor</label>
                    <div className="flex flex-wrap gap-2">
                      {PAIN_CHARACTERISTICS.map((ch) => {
                        const active = assessment.pain.characteristic.includes(ch);
                        return (
                          <button
                            key={ch}
                            type="button"
                            onClick={() => {
                              const next = active
                                ? assessment.pain.characteristic.filter((x) => x !== ch)
                                : [...assessment.pain.characteristic, ch];
                              touchUpdate({ pain: { ...assessment.pain, characteristic: next } });
                            }}
                            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                              active
                                ? 'border-[#1D4ED8] bg-blue-50 text-[#0B1F3A]'
                                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {ch}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Fatores agravantes</label>
                      <input
                        type="text"
                        value={assessment.pain.aggravatingFactors}
                        onChange={(e) =>
                          touchUpdate({ pain: { ...assessment.pain, aggravatingFactors: e.target.value } })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Fatores de alívio</label>
                      <input
                        type="text"
                        value={assessment.pain.relievingFactors}
                        onChange={(e) =>
                          touchUpdate({ pain: { ...assessment.pain, relievingFactors: e.target.value } })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Impacto no sono</label>
                      <input
                        type="text"
                        value={assessment.pain.sleepImpact}
                        onChange={(e) =>
                          touchUpdate({ pain: { ...assessment.pain, sleepImpact: e.target.value } })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">Impacto funcional</label>
                      <input
                        type="text"
                        value={assessment.pain.functionalImpact}
                        onChange={(e) =>
                          touchUpdate({ pain: { ...assessment.pain, functionalImpact: e.target.value } })
                        }
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Specialty Custom Physical Exam */}
          {spec.physicalExamFields.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <h3 className="font-display text-base font-bold text-[#0B1F3A]">
                Exame Físico Específico — {spec.name}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {spec.physicalExamFields.map((field) =>
                  renderCustomField(field, assessment.customPhysicalExam, (next) =>
                    touchUpdate({ customPhysicalExam: next })
                  )
                )}
              </div>
            </div>
          )}

          {/* Sports Hop Test LSI Calculator */}
          {spec.id === 'esportiva' && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
              <h3 className="font-display text-sm font-bold text-[#0B1F3A]">
                Calculadora de Índice de Simetria de Membros (LSI — Testes de Salto / Desempenho)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Membro Acometido (cm)</label>
                  <input
                    type="text"
                    value={hopAffected}
                    onChange={(e) => setHopAffected(e.target.value)}
                    placeholder="Ex.: 165"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Membro Contralateral (cm)</label>
                  <input
                    type="text"
                    value={hopUnaffected}
                    onChange={(e) => setHopUnaffected(e.target.value)}
                    placeholder="Ex.: 180"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2">
                  <div className="text-[11px] text-slate-500">LSI Calculado</div>
                  <div className="font-mono text-sm font-bold text-[#0B1F3A] tabular-nums">
                    {calculateLsi(hopAffected, hopUnaffected) ?? 'Informe ambos os lados'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Facial Palsy Exam */}
          {assessment.facialPalsy && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <FacialPalsySection
                data={assessment.facialPalsy}
                section="avaliacao"
                onChange={(next) => touchUpdate({ facialPalsy: next })}
              />
            </div>
          )}

          {/* Pelvic Consent & Oxford */}
          {assessment.pelvicConsent && (
            <PelvicSection
              data={assessment.pelvicConsent}
              onChange={(next) => touchUpdate({ pelvicConsent: next })}
            />
          )}

          {/* UTI Clinical Section */}
          {assessment.utiData && (
            <UtiClinicalSection
              data={assessment.utiData}
              onChange={(next) => touchUpdate({ utiData: next })}
            />
          )}

          {/* Goniometry Table */}
          {spec.includeGoniometry && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div>
                <h3 className="font-display text-base font-bold text-[#0B1F3A]">
                  Goniometria e Amplitude de Movimento (Ativa e Passiva)
                </h3>
                <p className="text-xs text-slate-500">
                  Registre valores em graus (°) comparando os lados Direito e Esquerdo, ou marque Não avaliado / Não aplicável.
                </p>
              </div>

              {assessment.goniometry.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-600">
                  {spec.id === 'ortopedia'
                    ? 'Selecione ao menos uma região anatômica acima para carregar os movimentos goniométricos específicos.'
                    : 'Adicione um movimento articular abaixo para registrar a goniometria.'}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                      <tr>
                        <th className="px-3 py-2.5">Articulação / Movimento</th>
                        <th className="px-3 py-2.5">Referência</th>
                        <th className="px-3 py-2.5">Ativa D</th>
                        <th className="px-3 py-2.5">Ativa E</th>
                        <th className="px-3 py-2.5">Passiva D</th>
                        <th className="px-3 py-2.5">Passiva E</th>
                        <th className="px-3 py-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {assessment.goniometry.map((g, idx) => (
                        <tr key={g.id}>
                          <td className="px-3 py-2 font-medium text-slate-800">
                            {g.joint} — {g.movement}
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-500 whitespace-nowrap">{g.normalRange}</td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              disabled={g.status !== 'avaliado'}
                              value={g.activeRight}
                              onChange={(e) => {
                                const next = [...assessment.goniometry];
                                next[idx] = { ...g, activeRight: e.target.value };
                                touchUpdate({ goniometry: next });
                              }}
                              placeholder="°"
                              className="w-16 rounded border border-slate-300 px-2 py-1 font-mono text-xs disabled:bg-slate-100"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              disabled={g.status !== 'avaliado'}
                              value={g.activeLeft}
                              onChange={(e) => {
                                const next = [...assessment.goniometry];
                                next[idx] = { ...g, activeLeft: e.target.value };
                                touchUpdate({ goniometry: next });
                              }}
                              placeholder="°"
                              className="w-16 rounded border border-slate-300 px-2 py-1 font-mono text-xs disabled:bg-slate-100"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              disabled={g.status !== 'avaliado'}
                              value={g.passiveRight}
                              onChange={(e) => {
                                const next = [...assessment.goniometry];
                                next[idx] = { ...g, passiveRight: e.target.value };
                                touchUpdate({ goniometry: next });
                              }}
                              placeholder="°"
                              className="w-16 rounded border border-slate-300 px-2 py-1 font-mono text-xs disabled:bg-slate-100"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              disabled={g.status !== 'avaliado'}
                              value={g.passiveLeft}
                              onChange={(e) => {
                                const next = [...assessment.goniometry];
                                next[idx] = { ...g, passiveLeft: e.target.value };
                                touchUpdate({ goniometry: next });
                              }}
                              placeholder="°"
                              className="w-16 rounded border border-slate-300 px-2 py-1 font-mono text-xs disabled:bg-slate-100"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <select
                              value={g.status}
                              onChange={(e) => {
                                const next = [...assessment.goniometry];
                                next[idx] = { ...g, status: e.target.value as EvaluationStatus };
                                touchUpdate({ goniometry: next });
                              }}
                              className="rounded border border-slate-300 px-2 py-1 text-xs"
                            >
                              <option value="avaliado">Avaliado</option>
                              <option value="nao_avaliado">Não avaliado</option>
                              <option value="nao_aplicavel">Não aplicável</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <input
                  type="text"
                  value={customGonioJoint}
                  onChange={(e) => setCustomGonioJoint(e.target.value)}
                  placeholder="Articulação (ex.: Tornozelo)"
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                />
                <input
                  type="text"
                  value={customGonioMove}
                  onChange={(e) => setCustomGonioMove(e.target.value)}
                  placeholder="Movimento (ex.: Dorsiflexão)"
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddCustomGoniometry}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Adicionar movimento</span>
                </button>
              </div>
            </div>
          )}

          {/* Strength MRC Table */}
          {spec.includeStrength && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div>
                <h3 className="font-display text-base font-bold text-[#0B1F3A]">
                  Força Muscular — Escala MRC (0 a 5)
                </h3>
                <p className="text-xs text-slate-500">
                  Comparação bilateral (Direito vs Esquerdo) pela graduação do Medical Research Council.
                </p>
              </div>

              {assessment.strength.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-600">
                  {spec.id === 'ortopedia'
                    ? 'Selecione ao menos uma região anatômica acima para carregar os grupos musculares/miótomos específicos.'
                    : 'Adicione um grupo muscular abaixo para registrar força MRC.'}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                      <tr>
                        <th className="px-3 py-2.5">Grupo Muscular / Miótomo</th>
                        <th className="px-3 py-2.5">MRC Direito</th>
                        <th className="px-3 py-2.5">MRC Esquerdo</th>
                        <th className="px-3 py-2.5">Status</th>
                        <th className="px-3 py-2.5">Observações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {assessment.strength.map((s, idx) => (
                        <tr key={s.id}>
                          <td className="px-3 py-2 font-medium text-slate-800">{s.muscleOrGroup}</td>
                          <td className="px-2 py-1.5">
                            <select
                              disabled={s.status !== 'avaliado'}
                              value={s.mrcRight}
                              onChange={(e) => {
                                const next = [...assessment.strength];
                                next[idx] = { ...s, mrcRight: e.target.value };
                                touchUpdate({ strength: next });
                              }}
                              className="rounded border border-slate-300 px-2 py-1 font-mono text-xs disabled:bg-slate-100"
                            >
                              <option value="">-</option>
                              {['0', '1', '2', '3', '4', '4-', '4+', '5'].map((g) => (
                                <option key={g} value={g}>{g}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-1.5">
                            <select
                              disabled={s.status !== 'avaliado'}
                              value={s.mrcLeft}
                              onChange={(e) => {
                                const next = [...assessment.strength];
                                next[idx] = { ...s, mrcLeft: e.target.value };
                                touchUpdate({ strength: next });
                              }}
                              className="rounded border border-slate-300 px-2 py-1 font-mono text-xs disabled:bg-slate-100"
                            >
                              <option value="">-</option>
                              {['0', '1', '2', '3', '4', '4-', '4+', '5'].map((g) => (
                                <option key={g} value={g}>{g}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-2 py-1.5">
                            <select
                              value={s.status}
                              onChange={(e) => {
                                const next = [...assessment.strength];
                                next[idx] = { ...s, status: e.target.value as EvaluationStatus };
                                touchUpdate({ strength: next });
                              }}
                              className="rounded border border-slate-300 px-2 py-1 text-xs"
                            >
                              <option value="avaliado">Avaliado</option>
                              <option value="nao_avaliado">Não avaliado</option>
                              <option value="nao_aplicavel">Não aplicável</option>
                            </select>
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              value={s.notes}
                              onChange={(e) => {
                                const next = [...assessment.strength];
                                next[idx] = { ...s, notes: e.target.value };
                                touchUpdate({ strength: next });
                              }}
                              placeholder="Dor ao teste, inibição..."
                              className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <input
                  type="text"
                  value={customStrengthName}
                  onChange={(e) => setCustomStrengthName(e.target.value)}
                  placeholder="Adicionar grupo muscular..."
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddCustomStrength}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Adicionar músculo</span>
                </button>
              </div>
            </div>
          )}

          {/* Perimetry Table */}
          {spec.includePerimetry && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
              <div>
                <h3 className="font-display text-base font-bold text-[#0B1F3A]">
                  Perimetria Bilateral (Cálculo Automático de Diferença)
                </h3>
                <p className="text-xs text-slate-500">
                  Mensuração em centímetros para controle de trofismo muscular, edema ou linfedema.
                </p>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                    <tr>
                      <th className="px-3 py-2.5">Ponto Anatômico de Referência</th>
                      <th className="px-3 py-2.5">Direito (cm)</th>
                      <th className="px-3 py-2.5">Esquerdo (cm)</th>
                      <th className="px-3 py-2.5">Diferença (D − E)</th>
                      <th className="px-3 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {assessment.perimetry.map((p, idx) => {
                      const diff = calculatePerimetryDiff(p.rightCm, p.leftCm);
                      return (
                        <tr key={p.id}>
                          <td className="px-3 py-2 font-medium text-slate-800">{p.point}</td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              disabled={p.status !== 'avaliado'}
                              value={p.rightCm}
                              onChange={(e) => {
                                const next = [...assessment.perimetry];
                                next[idx] = { ...p, rightCm: e.target.value };
                                touchUpdate({ perimetry: next });
                              }}
                              placeholder="cm"
                              className="w-20 rounded border border-slate-300 px-2 py-1 font-mono text-xs disabled:bg-slate-100"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="text"
                              disabled={p.status !== 'avaliado'}
                              value={p.leftCm}
                              onChange={(e) => {
                                const next = [...assessment.perimetry];
                                next[idx] = { ...p, leftCm: e.target.value };
                                touchUpdate({ perimetry: next });
                              }}
                              placeholder="cm"
                              className="w-20 rounded border border-slate-300 px-2 py-1 font-mono text-xs disabled:bg-slate-100"
                            />
                          </td>
                          <td className="px-3 py-2 font-mono font-semibold text-[#0B1F3A] tabular-nums">
                            {diff ? diff.diff : '-'}
                          </td>
                          <td className="px-2 py-1.5">
                            <select
                              value={p.status}
                              onChange={(e) => {
                                const next = [...assessment.perimetry];
                                next[idx] = { ...p, status: e.target.value as EvaluationStatus };
                                touchUpdate({ perimetry: next });
                              }}
                              className="rounded border border-slate-300 px-2 py-1 text-xs"
                            >
                              <option value="avaliado">Avaliado</option>
                              <option value="nao_avaliado">Não avaliado</option>
                              <option value="nao_aplicavel">Não aplicável</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <input
                  type="text"
                  value={customPeriPoint}
                  onChange={(e) => setCustomPeriPoint(e.target.value)}
                  placeholder="Novo ponto de referência (ex.: +15 cm)"
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddCustomPerimetry}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Adicionar ponto</span>
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ==================== STEP 4: TESTES E ESCALAS ==================== */}
      {step === 'testes' && (
        <section className="space-y-6">
          {/* Cardiorespiratory Monitoring & Functional Tests */}
          {assessment.cardioMonitoring && (
            <CardioMonitoringSection
              data={assessment.cardioMonitoring}
              onChange={(next) => touchUpdate({ cardioMonitoring: next })}
            />
          )}

          {/* Sunnybrook in Facial Palsy */}
          {assessment.facialPalsy && (
            <FacialPalsySection
              data={assessment.facialPalsy}
              section="testes"
              onChange={(next) => touchUpdate({ facialPalsy: next })}
            />
          )}

          {/* Special Tests */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <div>
              <h2 className="font-display text-lg font-bold text-[#0B1F3A]">
                4. Testes Específicos — {spec.name}
              </h2>
              <p className="text-xs text-slate-500">
                Aplique somente os testes clinicamente pertinentes ao paciente. Os demais podem permanecer como Não avaliado ou Não aplicável.
              </p>
            </div>

            {activeSpecialTests.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-xs text-slate-600">
                {spec.id === 'ortopedia'
                  ? 'Nenhuma região anatômica selecionada na etapa 3 (Avaliação). Volte à etapa 3 para selecionar a articulação e visualizar seus testes ortopédicos específicos.'
                  : 'Nenhum teste especial adicional cadastrado nesta ficha; utilize as escalas padronizadas abaixo.'}
              </div>
            ) : (
              <div className="space-y-3">
                {activeSpecialTests.map((t) => {
                  const res = assessment.specialTests[t.id] ?? {
                    id: t.id,
                    name: t.name,
                    resultRight: '',
                    resultLeft: '',
                    resultSingle: '',
                    notes: '',
                  };
                  return (
                    <div key={t.id} className="rounded-lg border border-slate-200 p-4 space-y-2.5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <div className="text-sm font-bold text-[#0B1F3A]">{t.name}</div>
                          <div className="text-xs text-slate-500">{t.objective}</div>
                        </div>
                        {t.region && (
                          <span className="text-[11px] font-medium text-[#1D4ED8] shrink-0">
                            {ORTHOPEDIC_REGIONS[t.region]?.name}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {t.bilateral ? (
                          <>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Resultado Direito</label>
                              <select
                                value={res.resultRight}
                                onChange={(e) =>
                                  updateSpecialTest(t, {
                                    resultRight: e.target.value as SpecialTestResult['resultRight'],
                                  })
                                }
                                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                              >
                                <option value="">Não avaliado</option>
                                <option value="Positivo">Positivo</option>
                                <option value="Negativo">Negativo</option>
                                <option value="Inconclusivo">Inconclusivo</option>
                                <option value="Não aplicável">Não aplicável</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Resultado Esquerdo</label>
                              <select
                                value={res.resultLeft ?? ''}
                                onChange={(e) =>
                                  updateSpecialTest(t, {
                                    resultLeft: e.target.value as SpecialTestResult['resultLeft'],
                                  })
                                }
                                className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                              >
                                <option value="">Não avaliado</option>
                                <option value="Positivo">Positivo</option>
                                <option value="Negativo">Negativo</option>
                                <option value="Inconclusivo">Inconclusivo</option>
                                <option value="Não aplicável">Não aplicável</option>
                              </select>
                            </div>
                          </>
                        ) : (
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Resultado</label>
                            <select
                              value={res.resultSingle ?? ''}
                              onChange={(e) =>
                                updateSpecialTest(t, {
                                  resultSingle: e.target.value as SpecialTestResult['resultSingle'],
                                })
                              }
                              className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                            >
                              <option value="">Não avaliado</option>
                              <option value="Positivo">Positivo</option>
                              <option value="Negativo">Negativo</option>
                              <option value="Inconclusivo">Inconclusivo</option>
                              <option value="Não aplicável">Não aplicável</option>
                            </select>
                          </div>
                        )}
                        <div className={t.bilateral ? '' : 'sm:col-span-2'}>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Observações clínicas</label>
                          <input
                            type="text"
                            value={res.notes}
                            onChange={(e) => updateSpecialTest(t, { notes: e.target.value })}
                            placeholder="Reprodução de sintomas, grau, latência..."
                            className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Validated Scales */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-bold text-[#0B1F3A]">
                  Escalas e Instrumentos Padronizados
                </h3>
                <p className="text-xs text-slate-500">
                  Selecione &ldquo;Avaliado&rdquo; nos instrumentos pertinentes ao caso clínico.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={extraScaleToAdd}
                  onChange={(e) => setExtraScaleToAdd(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs"
                >
                  <option value="">Adicionar outro instrumento...</option>
                  {CLINICAL_INSTRUMENTS.filter((ins) => !assessment.scales[ins.id]).map((ins) => (
                    <option key={ins.id} value={ins.id}>{ins.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddExtraScale}
                  disabled={!extraScaleToAdd}
                  className="rounded-lg bg-[#0B1F3A] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                >
                  Incluir
                </button>
              </div>
            </div>

            {Object.keys(assessment.scales).length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-xs text-slate-500">
                Utilize o seletor acima caso deseje incluir alguma escala validada adicional nesta ficha.
              </div>
            ) : (
              Object.entries(assessment.scales).map(([scaleId, entry]) => (
                <ScaleRunner
                  key={scaleId}
                  scaleId={scaleId}
                  entry={entry}
                  onChange={(updated) =>
                    touchUpdate({
                      scales: { ...assessment.scales, [scaleId]: updated },
                    })
                  }
                />
              ))
            )}
          </div>
        </section>
      )}

      {/* ==================== STEP 5: RESULTADOS ==================== */}
      {step === 'resultados' && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-6">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0B1F3A]">5. Síntese de Resultados e Achados Clínicos</h2>
            <p className="text-xs text-slate-500">
              Consolidação objetiva dos parâmetros mensurados (sem geração automática de diagnósticos).
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
              <div className="text-[11px] font-medium text-slate-500">IMC</div>
              <div className="mt-1 font-mono text-sm font-bold text-[#0B1F3A] tabular-nums">
                {imc ? `${imc.value} kg/m² (${imc.classification})` : 'Não informado'}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
              <div className="text-[11px] font-medium text-slate-500">Dor (EVA / END)</div>
              <div className="mt-1 font-mono text-sm font-bold text-[#0B1F3A] tabular-nums">
                {assessment.pain.status === 'avaliado'
                  ? `EVA: ${assessment.pain.evaScore ?? '-'} | END: ${assessment.pain.endScore ?? '-'}`
                  : 'Não avaliado / N/A'}
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
              <div className="text-[11px] font-medium text-slate-500">Escalas Avaliadas</div>
              <div className="mt-1 font-mono text-sm font-bold text-[#0B1F3A] tabular-nums">
                {Object.values(assessment.scales).filter((s) => s.status === 'avaliado').length} instrumento(s)
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
              <div className="text-[11px] font-medium text-slate-500">Testes Especiais Positivos</div>
              <div className="mt-1 font-mono text-sm font-bold text-[#0B1F3A] tabular-nums">
                {
                  Object.values(assessment.specialTests).filter(
                    (t) =>
                      t.resultRight === 'Positivo' ||
                      t.resultLeft === 'Positivo' ||
                      t.resultSingle === 'Positivo'
                  ).length
                }{' '}
                achado(s)
              </div>
            </div>
          </div>

          {assessment.facialPalsy && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 text-xs text-slate-800">
              <span className="font-bold text-[#0B1F3A]">Resumo Paralisia Facial: </span>
              Lado afetado: {assessment.facialPalsy.affectedSide || 'Não informado'} · Sunnybrook Composto:{' '}
              <span className="font-mono font-bold">{calculateSunnybrookScore(assessment.facialPalsy).composite}/100</span>
            </div>
          )}

          {assessment.utiData && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 text-xs text-slate-800">
              <span className="font-bold text-[#0B1F3A]">Resumo UTI: </span>
              Glasgow {assessment.utiData.glasgowEye + assessment.utiData.glasgowVerbal + assessment.utiData.glasgowMotor}/15 · MRC Sum Score:{' '}
              <span className="font-mono font-bold">
                {calculateMrcSumScore(assessment.utiData.mrcGroups).total}/60
              </span>
              {assessment.utiData.imsScore && ` · IMS Nível ${assessment.utiData.imsScore}/10`}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Achados Clínicos Relevantes</label>
              <textarea
                rows={4}
                value={assessment.synthesis.clinicalFindings}
                onChange={(e) =>
                  touchUpdate({
                    synthesis: { ...assessment.synthesis, clinicalFindings: e.target.value },
                  })
                }
                placeholder="Sintetize os principais déficits de estrutura e função corporal identificados na avaliação..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Limitações Funcionais e Restrições de Participação (CIF)
              </label>
              <textarea
                rows={3}
                value={assessment.synthesis.functionalLimitations}
                onChange={(e) =>
                  touchUpdate({
                    synthesis: { ...assessment.synthesis, functionalLimitations: e.target.value },
                  })
                }
                placeholder="Descreva atividades e participações comprometidas (marcha, autocuidado, trabalho, esporte)..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>
      )}

      {/* ==================== STEP 6: DIAGNÓSTICO CINÉTICO-FUNCIONAL ==================== */}
      {step === 'diagnostico' && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0B1F3A]">
              6. Diagnóstico Cinético-Funcional e Prognóstico
            </h2>
            <p className="text-xs text-slate-500">
              Redação exclusiva do fisioterapeuta responsável com base nos achados objetivos desta avaliação.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Diagnóstico Cinético-Funcional
            </label>
            <textarea
              rows={5}
              value={assessment.synthesis.kineticFunctionalDiagnosis}
              onChange={(e) =>
                touchUpdate({
                  synthesis: { ...assessment.synthesis, kineticFunctionalDiagnosis: e.target.value },
                })
              }
              placeholder="Ex.: Disfunção cinético-funcional caracterizada por redução de ADM..., déficit de força muscular..., comprometendo atividades de..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Prognóstico Funcional
            </label>
            <textarea
              rows={3}
              value={assessment.synthesis.functionalPrognosis}
              onChange={(e) =>
                touchUpdate({
                  synthesis: { ...assessment.synthesis, functionalPrognosis: e.target.value },
                })
              }
              placeholder="Estimativa clínica de recuperação funcional, fatores moduladores e tempo esperado..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </section>
      )}

      {/* ==================== STEP 7: OBJETIVOS ==================== */}
      {step === 'objetivos' && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0B1F3A]">7. Objetivos Terapêuticos</h2>
            <p className="text-xs text-slate-500">Metas clínicas mensuráveis em curto, médio e longo prazo.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Objetivos de Curto Prazo</label>
              <textarea
                rows={3}
                value={assessment.synthesis.shortTermGoals}
                onChange={(e) =>
                  touchUpdate({
                    synthesis: { ...assessment.synthesis, shortTermGoals: e.target.value },
                  })
                }
                placeholder="Ex.: Controle álgico, proteção tecidual/ocular, ganho inicial de mobilidade..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Objetivos de Médio Prazo</label>
              <textarea
                rows={3}
                value={assessment.synthesis.mediumTermGoals}
                onChange={(e) =>
                  touchUpdate({
                    synthesis: { ...assessment.synthesis, mediumTermGoals: e.target.value },
                  })
                }
                placeholder="Ex.: Ganho de força muscular, controle motor, equilíbrio dinâmico e autonomia nas AVDs..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Objetivos de Longo Prazo</label>
              <textarea
                rows={3}
                value={assessment.synthesis.longTermGoals}
                onChange={(e) =>
                  touchUpdate({
                    synthesis: { ...assessment.synthesis, longTermGoals: e.target.value },
                  })
                }
                placeholder="Ex.: Retorno pleno às atividades laborais/esportivas, prevenção de recidivas e alta fisioterapêutica..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>
      )}

      {/* ==================== STEP 8: PLANO TERAPÊUTICO ==================== */}
      {step === 'plano' && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 space-y-5">
          <div>
            <h2 className="font-display text-lg font-bold text-[#0B1F3A]">8. Plano de Tratamento e Orientações</h2>
            <p className="text-xs text-slate-500">Condutas propostas, dosagem semanal, precauções e orientações ao paciente.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Plano de Tratamento e Condutas Fisioterapêuticas
              </label>
              <textarea
                rows={5}
                value={assessment.synthesis.treatmentPlan}
                onChange={(e) =>
                  touchUpdate({
                    synthesis: { ...assessment.synthesis, treatmentPlan: e.target.value },
                  })
                }
                placeholder="Descreva recursos cinesioterapêuticos, terapia manual, eletrotermofototerapia, treino funcional, reabilitação respiratória..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Frequência Semanal e Duração Prevista</label>
                <input
                  type="text"
                  value={assessment.synthesis.frequencyAndDuration}
                  onChange={(e) =>
                    touchUpdate({
                      synthesis: { ...assessment.synthesis, frequencyAndDuration: e.target.value },
                    })
                  }
                  placeholder="Ex.: 2x a 3x por semana, reavaliação após 10 sessões"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Precauções e Contraindicações</label>
                <input
                  type="text"
                  value={assessment.synthesis.precautionsAndContraindications}
                  onChange={(e) =>
                    touchUpdate({
                      synthesis: { ...assessment.synthesis, precautionsAndContraindications: e.target.value },
                    })
                  }
                  placeholder="Restrições de carga, sinais de alerta para suspensão..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Orientações ao Paciente / Cuidador / Família</label>
              <textarea
                rows={3}
                value={assessment.synthesis.patientGuidance}
                onChange={(e) =>
                  touchUpdate({
                    synthesis: { ...assessment.synthesis, patientGuidance: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Observações Gerais</label>
              <textarea
                rows={2}
                value={assessment.synthesis.observations}
                onChange={(e) =>
                  touchUpdate({
                    synthesis: { ...assessment.synthesis, observations: e.target.value },
                  })
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </section>
      )}

      {/* ==================== STEP 9: RELATÓRIO E PRÉ-VISUALIZAÇÃO PDF ==================== */}
      {step === 'relatorio' && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5">
            <div>
              <h2 className="font-display text-lg font-bold text-[#0B1F3A]">
                9. Pré-Visualização do Documento Clínico e Exportação PDF
              </h2>
              <p className="text-xs text-slate-500">
                Revise os dados preenchidos abaixo antes de gerar o arquivo A4 paginado.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onCreateReassessment(assessment)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                Usar como Base de Reavaliação
              </button>
              <button
                type="button"
                onClick={handleGenerateAndArchivePdf}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#1E40AF] whitespace-nowrap shadow-sm"
              >
                <FileDown className="h-4 w-4" />
                <span>GERAR E BAIXAR PDF</span>
              </button>
            </div>
          </div>

          {/* A4 Preview Sheet */}
          <div className="mx-auto max-w-[820px] rounded-xl border border-slate-300 bg-white shadow-sm overflow-hidden">
            {/* Simulated PDF Header */}
            <div className="bg-[#0B1F3A] px-8 py-5 text-white border-b-4 border-[#1D4ED8] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="font-display text-base font-bold tracking-tight">{PROFESSIONAL_INFO.appName}</div>
                <div className="text-xs text-slate-300">
                  {PROFESSIONAL_INFO.therapistName} · {PROFESSIONAL_INFO.crefito}
                </div>
                <div className="text-xs text-blue-200 font-medium mt-0.5">
                  AVALIAÇÃO FISIOTERAPÊUTICA — {spec.code}. {spec.name}
                </div>
              </div>
              <div className="sm:text-right text-xs">
                <div className="font-semibold text-white">
                  {assessment.identification.fullName || 'Paciente não informado'}
                </div>
                <div className="font-mono text-slate-300 tabular-nums">
                  Data: {formatDatePtBr(assessment.identification.evaluationDate)}
                </div>
              </div>
            </div>

            <div className="p-8 space-y-6 text-xs text-slate-800">
              {/* Preview Section 1 */}
              <div>
                <h3 className="font-display text-xs font-bold uppercase tracking-wide text-[#0B1F3A] border-b border-slate-200 pb-1.5 mb-2.5">
                  1. Identificação do Paciente
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                  <div><span className="font-semibold">Paciente:</span> {assessment.identification.fullName || 'Não informado'}</div>
                  <div><span className="font-semibold">Data:</span> {formatDatePtBr(assessment.identification.evaluationDate)}</div>
                  {assessment.identification.age && <div><span className="font-semibold">Idade:</span> {assessment.identification.age}</div>}
                  {assessment.identification.sex && <div><span className="font-semibold">Sexo:</span> {assessment.identification.sex}</div>}
                  {assessment.identification.occupation && <div><span className="font-semibold">Ocupação:</span> {assessment.identification.occupation}</div>}
                  {assessment.identification.attendanceMode && <div><span className="font-semibold">Modalidade:</span> {assessment.identification.attendanceMode}</div>}
                  {imc && <div><span className="font-semibold">IMC:</span> {imc.value} kg/m² ({imc.classification})</div>}
                </div>
              </div>

              {/* Preview Section 2 */}
              <div>
                <h3 className="font-display text-xs font-bold uppercase tracking-wide text-[#0B1F3A] border-b border-slate-200 pb-1.5 mb-2.5">
                  2. Anamnese e História Clínica
                </h3>
                <div className="space-y-1.5">
                  {assessment.baseAnamnesis.chiefComplaint && <p><span className="font-semibold">Queixa Principal:</span> {assessment.baseAnamnesis.chiefComplaint}</p>}
                  {assessment.baseAnamnesis.hma && <p><span className="font-semibold">HDA:</span> {assessment.baseAnamnesis.hma}</p>}
                  {assessment.baseAnamnesis.medicalDiagnosis && <p><span className="font-semibold">Diagnóstico Médico Informado:</span> {assessment.baseAnamnesis.medicalDiagnosis}</p>}
                  {assessment.baseAnamnesis.medications && <p><span className="font-semibold">Medicamentos:</span> {assessment.baseAnamnesis.medications}</p>}
                  {assessment.baseAnamnesis.complementaryExams && <p><span className="font-semibold">Exames Complementares:</span> {assessment.baseAnamnesis.complementaryExams}</p>}
                </div>
              </div>

              {/* Preview Scales */}
              {Object.values(assessment.scales).some((s) => s.status === 'avaliado' && s.score) && (
                <div>
                  <h3 className="font-display text-xs font-bold uppercase tracking-wide text-[#0B1F3A] border-b border-slate-200 pb-1.5 mb-2.5">
                    3. Escalas e Instrumentos Aplicados
                  </h3>
                  <ul className="space-y-1">
                    {Object.values(assessment.scales)
                      .filter((s) => s.status === 'avaliado' && s.score)
                      .map((s) => (
                        <li key={s.scaleId}>
                          <span className="font-semibold">{INSTRUMENTS_BY_ID[s.scaleId]?.name || s.scaleId}:</span>{' '}
                          <span className="font-mono">{s.score}</span>
                          {s.interpretation && ` — ${s.interpretation}`}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              {/* Preview Synthesis */}
              <div>
                <h3 className="font-display text-xs font-bold uppercase tracking-wide text-[#0B1F3A] border-b border-slate-200 pb-1.5 mb-2.5">
                  4. Diagnóstico Cinético-Funcional, Objetivos e Plano
                </h3>
                <div className="space-y-2">
                  {assessment.synthesis.clinicalFindings && <p><span className="font-semibold">Achados Clínicos:</span> {assessment.synthesis.clinicalFindings}</p>}
                  {assessment.synthesis.functionalLimitations && <p><span className="font-semibold">Limitações Funcionais:</span> {assessment.synthesis.functionalLimitations}</p>}
                  {assessment.synthesis.kineticFunctionalDiagnosis && <p><span className="font-semibold">Diagnóstico Cinético-Funcional:</span> {assessment.synthesis.kineticFunctionalDiagnosis}</p>}
                  {assessment.synthesis.shortTermGoals && <p><span className="font-semibold">Objetivos (Curto Prazo):</span> {assessment.synthesis.shortTermGoals}</p>}
                  {assessment.synthesis.mediumTermGoals && <p><span className="font-semibold">Objetivos (Médio Prazo):</span> {assessment.synthesis.mediumTermGoals}</p>}
                  {assessment.synthesis.longTermGoals && <p><span className="font-semibold">Objetivos (Longo Prazo):</span> {assessment.synthesis.longTermGoals}</p>}
                  {assessment.synthesis.treatmentPlan && <p><span className="font-semibold">Plano de Tratamento:</span> {assessment.synthesis.treatmentPlan}</p>}
                  {assessment.synthesis.functionalPrognosis && <p><span className="font-semibold">Prognóstico Funcional:</span> {assessment.synthesis.functionalPrognosis}</p>}
                  {assessment.synthesis.patientGuidance && <p><span className="font-semibold">Orientações:</span> {assessment.synthesis.patientGuidance}</p>}
                </div>
              </div>

              {/* Signature Block */}
              <div className="pt-8 border-t border-slate-200 text-center space-y-1">
                <div className="mx-auto w-64 border-b border-slate-800 pb-4" />
                <div className="font-display font-bold text-[#0B1F3A]">{PROFESSIONAL_INFO.therapistName}</div>
                <div className="text-slate-600">Fisioterapeuta · {PROFESSIONAL_INFO.crefito}</div>
                <div className="text-[11px] text-slate-400 pt-2">
                  {PROFESSIONAL_INFO.website} · {PROFESSIONAL_INFO.instagram}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Bottom Step Navigation Footer */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3.5">
        <button
          type="button"
          disabled={currentStepIdx <= 0}
          onClick={() => setStep(STEPS[currentStepIdx - 1].id)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 whitespace-nowrap"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Etapa Anterior</span>
        </button>

        <div className="text-xs font-medium text-slate-500 hidden sm:block">
          {STEPS[currentStepIdx].label} de {STEPS.length}
        </div>

        {currentStepIdx < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep(STEPS[currentStepIdx + 1].id)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1D4ED8] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1E40AF] whitespace-nowrap"
          >
            <span>Próxima Etapa</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleGenerateAndArchivePdf}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0B1F3A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#132d52] whitespace-nowrap"
          >
            <FileDown className="h-3.5 w-3.5" />
            <span>Baixar PDF</span>
          </button>
        )}
      </div>
    </div>
  );
};
