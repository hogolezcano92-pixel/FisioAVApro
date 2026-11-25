import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { AssessmentWorkspace } from './components/AssessmentWorkspace';
import { AuthGate } from './components/AuthGate';
import { ConfirmModal } from './components/ConfirmModal';
import { Dashboard } from './components/Dashboard';
import { DocumentPreviewModal } from './components/DocumentPreviewModal';
import { DocumentsHubView } from './components/DocumentsHubView';
import { EvolutionView } from './components/EvolutionView';
import { InstrumentsLibraryView } from './components/InstrumentsLibraryView';
import { MobileNav } from './components/MobileNav';
import { PatientRecordView } from './components/PatientRecordView';
import { PatientsView } from './components/PatientsView';
import { ReassessmentView } from './components/ReassessmentView';
import { SettingsView } from './components/SettingsView';
import { ActiveRoute, Sidebar } from './components/Sidebar';
import { INSTRUMENTS_BY_ID } from './data/scalesAndTests';
import { SPECIALTIES, SPECIALTIES_BY_ID } from './data/specialties';
import { isSupabaseConfigured, supabase } from './lib/supabase';
import {
  archiveClinicalPdf,
  ClinicalStoreSnapshot,
  deleteAppointment,
  deleteAssessmentRecord,
  deleteClinicalDocument,
  deleteEvolutionRecord,
  deletePatient,
  deleteReassessmentRecord,
  deleteTreatmentPlan,
  getActiveSessionUser,
  getDocumentAccessUrl,
  loadClinicalSnapshot,
  saveAppointment,
  savePatientExerciseLog,
  savePatientExercisePrescription,
  saveAssessmentRecord,
  saveEvolutionRecord,
  savePatient,
  saveReassessmentRecord,
  saveTreatmentPlan,
  signOutClinicalSession,
} from './services/clinicalRepository';
import {
  AssessmentRecord,
  AssessmentStepId,
  AuthSessionUser,
  ClinicalDocumentRecord,
  ClinicalDocumentType,
  DailyEvolutionRecord,
  PatientRecord,
  ReassessmentComparisonItem,
  ReassessmentRecord,
  SpecialtyId,
  TreatmentStatus,
} from './types/clinical';
import { createNewAssessment, formatDatePtBr, generateUuid } from './utils/calculations';

function createInitialAssessmentsMap(): Record<SpecialtyId, AssessmentRecord> {
  const map = {} as Record<SpecialtyId, AssessmentRecord>;
  SPECIALTIES.forEach((s) => {
    map[s.id] = createNewAssessment(s.id);
  });
  return map;
}

function createInitialReassessment(patient?: PatientRecord): ReassessmentRecord {
  const today = new Date().toISOString().split('T')[0];
  return {
    id: generateUuid(),
    patientId: patient?.id,
    linkedAssessmentId: null,
    specialtyId: 'ortopedia',
    patientName: patient?.fullName ?? '',
    evaluationDate: today,
    initialDate: '',
    clinicalEvolutionSummary: '',
    painInitialEva: '',
    painCurrentEva: '',
    romComparisonNotes: '',
    strengthComparisonNotes: '',
    balanceComparisonNotes: '',
    functionalityComparisonNotes: '',
    comparisons: [
      {
        id: 'cmp-1',
        domain: 'Dor',
        parameter: 'EVA / END',
        initialValue: '',
        currentValue: '',
        deltaNotes: '',
      },
    ],
    achievedGoals: '',
    pendingGoals: '',
    newKineticDiagnosis: '',
    newTreatmentPlan: '',
    observations: '',
  };
}

function createInitialEvolution(patient?: PatientRecord): DailyEvolutionRecord {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const hhmm = now.toTimeString().slice(0, 5);
  return {
    id: generateUuid(),
    patientId: patient?.id,
    patientName: patient?.fullName ?? '',
    specialtyId: 'ortopedia',
    date: today,
    time: hhmm,
    reportedComplaint: '',
    initialClinicalCondition: '',
    vitalSignsBefore: '',
    vitalSignsAfter: '',
    proceduresPerformed: '',
    exercises: [
      { id: 'ex-1', exercise: '', sets: '', reps: '', timeOrLoad: '', intensity: '' },
    ],
    resourcesUsed: '',
    patientResponse: '',
    intercurrences: '',
    endingCondition: '',
    guidance: '',
    observations: '',
  };
}

type ConfirmAction =
  | { type: 'assessment'; specialtyId: SpecialtyId }
  | { type: 'reassessment' }
  | { type: 'evolution' }
  | { type: 'all' }
  | { type: 'delete-patient'; patient: PatientRecord }
  | {
      type: 'delete-record';
      kind:
        | 'assessment'
        | 'evolution'
        | 'reassessment'
        | 'document'
        | 'treatment_plan'
        | 'appointment';
      id: string;
      label: string;
    }
  | null;

interface ToastBanner {
  id: number;
  kind: 'success' | 'error';
  message: string;
}

export default function App() {
  const [authUser, setAuthUser] = useState<AuthSessionUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(isSupabaseConfigured);
  const [snapshot, setSnapshot] = useState<ClinicalStoreSnapshot>({
    patients: [],
    assessments: [],
    evolutions: [],
    reassessments: [],
    documents: [],
    treatmentPlans: [],
    appointments: [],
    exercisePrescriptions: [],
    exerciseLogs: [],
  });

  const [route, setRoute] = useState<ActiveRoute>({ type: 'dashboard' });
  const [workspaceInitialStep, setWorkspaceInitialStep] = useState<AssessmentStepId>('identificacao');
  const [assessments, setAssessments] = useState<Record<SpecialtyId, AssessmentRecord>>(
    createInitialAssessmentsMap
  );
  const [activeSpecialtyIds, setActiveSpecialtyIds] = useState<SpecialtyId[]>([]);
  const [reassessment, setReassessment] = useState<ReassessmentRecord>(() =>
    createInitialReassessment()
  );
  const [evolution, setEvolution] = useState<DailyEvolutionRecord>(() => createInitialEvolution());
  const [pendingConfirm, setPendingConfirm] = useState<ConfirmAction>(null);
  const [toast, setToast] = useState<ToastBanner | null>(null);

  const [previewState, setPreviewState] = useState<{
    doc: ClinicalDocumentRecord;
    url: string;
    isObjectUrl: boolean;
  } | null>(null);

  const notify = useCallback((kind: 'success' | 'error', message: string) => {
    setToast({ id: Date.now(), kind, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const refreshSnapshot = useCallback(
    async (user: AuthSessionUser) => {
      try {
        const next = await loadClinicalSnapshot(user);
        setSnapshot(next);
      } catch (err) {
        notify('error', err instanceof Error ? err.message : 'Erro ao carregar dados clínicos.');
      }
    },
    [notify]
  );

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setCheckingAuth(false);
      return;
    }
    let mounted = true;
    getActiveSessionUser()
      .then((user) => {
        if (!mounted) return;
        setAuthUser(user);
        if (user) void refreshSnapshot(user);
      })
      .finally(() => {
        if (mounted) setCheckingAuth(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setAuthUser(null);
      }
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [refreshSnapshot]);

  const handleAuthenticated = async (user: AuthSessionUser) => {
    setAuthUser(user);
    await refreshSnapshot(user);
  };

  const handleSignOut = async () => {
    await signOutClinicalSession(authUser);
    setAuthUser(null);
    setSnapshot({
      patients: [],
      assessments: [],
      evolutions: [],
      reassessments: [],
      documents: [],
      treatmentPlans: [],
      appointments: [],
      exercisePrescriptions: [],
      exerciseLogs: [],
    });
    setAssessments(createInitialAssessmentsMap());
    setActiveSpecialtyIds([]);
    setReassessment(createInitialReassessment());
    setEvolution(createInitialEvolution());
    setRoute({ type: 'dashboard' });
  };

  const activeSet = useMemo(() => new Set(activeSpecialtyIds), [activeSpecialtyIds]);

  const sessionAssessmentsList = useMemo(
    () => activeSpecialtyIds.map((id) => assessments[id]).filter(Boolean),
    [activeSpecialtyIds, assessments]
  );

  const openSpecialty = (
    specialtyId: SpecialtyId,
    initialStep: AssessmentStepId = 'identificacao'
  ) => {
    setWorkspaceInitialStep(initialStep);
    setActiveSpecialtyIds((prev) => (prev.includes(specialtyId) ? prev : [...prev, specialtyId]));
    setRoute({ type: 'assessment', specialtyId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (nextRoute: ActiveRoute) => {
    if (nextRoute.type === 'assessment') {
      openSpecialty(nextRoute.specialtyId, 'identificacao');
      return;
    }
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateAssessment = (updated: AssessmentRecord) => {
    setAssessments((prev) => ({ ...prev, [updated.specialtyId]: updated }));
    setActiveSpecialtyIds((prev) =>
      prev.includes(updated.specialtyId) ? prev : [...prev, updated.specialtyId]
    );
  };

  const handleImportAssessmentToReassessment = (source: AssessmentRecord) => {
    const compRows: ReassessmentComparisonItem[] = [];

    if (source.pain.evaScore !== null) {
      compRows.push({
        id: `cmp-pain-${Date.now()}`,
        domain: 'Dor',
        parameter: 'Escala EVA',
        initialValue: `${source.pain.evaScore}/10`,
        currentValue: '',
        deltaNotes: '',
      });
    }

    source.goniometry
      .filter((g) => g.status === 'avaliado' && (g.activeRight || g.activeLeft))
      .slice(0, 6)
      .forEach((g, idx) => {
        compRows.push({
          id: `cmp-gonio-${idx}-${Date.now()}`,
          domain: 'Amplitude de Movimento',
          parameter: `${g.joint} — ${g.movement}`,
          initialValue: `D: ${g.activeRight || '-'} / E: ${g.activeLeft || '-'}`,
          currentValue: '',
          deltaNotes: '',
        });
      });

    Object.values(source.scales)
      .filter((s) => s.status === 'avaliado' && s.score)
      .forEach((s, idx) => {
        compRows.push({
          id: `cmp-scale-${idx}-${Date.now()}`,
          domain: 'Escala / Teste',
          parameter: INSTRUMENTS_BY_ID[s.scaleId]?.name || s.scaleId,
          initialValue: s.score,
          currentValue: '',
          deltaNotes: '',
        });
      });

    if (compRows.length === 0) {
      compRows.push({
        id: `cmp-default-${Date.now()}`,
        domain: 'Funcionalidade',
        parameter: 'Parâmetro funcional principal',
        initialValue: '',
        currentValue: '',
        deltaNotes: '',
      });
    }

    const linkedPatient = snapshot.patients.find((p) => p.id === source.patientId);
    setReassessment({
      ...createInitialReassessment(linkedPatient),
      patientId: source.patientId,
      linkedAssessmentId: source.id,
      specialtyId: source.specialtyId,
      patientName: source.identification.fullName || linkedPatient?.fullName || '',
      initialDate: source.identification.evaluationDate,
      painInitialEva: source.pain.evaScore !== null ? String(source.pain.evaScore) : '',
      comparisons: compRows,
      pendingGoals: [
        source.synthesis.shortTermGoals,
        source.synthesis.mediumTermGoals,
        source.synthesis.longTermGoals,
      ]
        .filter(Boolean)
        .join('\n'),
    });
    setRoute({ type: 'reassessment' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ==================== REPOSITORY HANDLERS ====================

  const handleSaveAssessmentToRecord = async (record: AssessmentRecord) => {
    if (!authUser) return;
    try {
      await saveAssessmentRecord(authUser, record);
      await refreshSnapshot(authUser);
      notify('success', 'Avaliação salva no prontuário do paciente.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Erro ao salvar avaliação.');
    }
  };

  const handleImportAssessmentPdf = async (assessment: AssessmentRecord, file: File) => {
    if (!authUser) throw new Error('Faça login para importar uma avaliação.');
    const saved = await saveAssessmentRecord(authUser, {
      ...assessment,
      patientId: assessment.patientId,
    });
    try {
      await archiveClinicalPdf(authUser, {
        patientId: assessment.patientId || '',
        relatedRecordId: saved.id,
        documentType: 'avaliacao_inicial',
        title: `Avaliação importada — ${SPECIALTIES_BY_ID[assessment.specialtyId]?.name || 'Fisioterapia'}`,
        specialtyId: assessment.specialtyId,
        documentDate: assessment.identification.evaluationDate,
        blob: file,
        fileName: file.name,
      });
    } catch (error) {
      await refreshSnapshot(authUser);
      notify('error', `A avaliação foi salva, mas o PDF original não foi arquivado: ${error instanceof Error ? error.message : 'erro desconhecido'}`);
      return;
    }
    await refreshSnapshot(authUser);
    notify('success', 'Avaliação importada, salva e vinculada ao prontuário. O PDF original foi arquivado.');
  };

  const handleArchivePdfParams = async (params: {
    patientId: string;
    relatedRecordId?: string | null;
    documentType: ClinicalDocumentType;
    title: string;
    specialtyId?: SpecialtyId | null;
    documentDate: string;
    blob: Blob;
    fileName: string;
  }) => {
    if (!authUser) return;
    try {
      const savedDoc = await archiveClinicalPdf(authUser, params);
      await refreshSnapshot(authUser);
      notify(
        'success',
        `PDF arquivado automaticamente no prontuário (${savedDoc.title} — v${savedDoc.version}).`
      );
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Falha ao arquivar documento PDF.');
    }
  };

  const handleSaveEvolutionToRecord = async (evo: DailyEvolutionRecord) => {
    if (!authUser) return;
    try {
      const saved = await saveEvolutionRecord(authUser, evo);
      setEvolution(saved);
      await refreshSnapshot(authUser);
      notify('success', 'Evolução cronológica registrada no prontuário.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Erro ao salvar evolução.');
    }
  };

  const handleSaveReassessmentToRecord = async (reav: ReassessmentRecord) => {
    if (!authUser) return;
    try {
      const saved = await saveReassessmentRecord(authUser, reav);
      setReassessment(saved);
      await refreshSnapshot(authUser);
      notify('success', 'Reavaliação registrada no prontuário.');
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Erro ao salvar reavaliação.');
    }
  };

  const handlePreviewOrPrintDocument = async (doc: ClinicalDocumentRecord) => {
    if (!authUser) return;
    try {
      const access = await getDocumentAccessUrl(authUser, doc);
      setPreviewState({ doc, url: access.url, isObjectUrl: access.isObjectUrl });
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Não foi possível abrir o PDF.');
    }
  };

  const handleDownloadDocument = async (doc: ClinicalDocumentRecord) => {
    if (!authUser) return;
    try {
      const access = await getDocumentAccessUrl(authUser, doc);
      const a = document.createElement('a');
      a.href = access.url;
      a.download = doc.fileName;
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (access.isObjectUrl) {
        setTimeout(() => URL.revokeObjectURL(access.url), 1000);
      }
    } catch (err) {
      notify('error', err instanceof Error ? err.message : 'Não foi possível baixar o PDF.');
    }
  };

  const executeConfirmAction = async () => {
    if (!pendingConfirm) return;
    if (pendingConfirm.type === 'assessment') {
      const sId = pendingConfirm.specialtyId;
      setAssessments((prev) => ({ ...prev, [sId]: createNewAssessment(sId) }));
      setActiveSpecialtyIds((prev) => prev.filter((id) => id !== sId));
    } else if (pendingConfirm.type === 'reassessment') {
      setReassessment(createInitialReassessment());
    } else if (pendingConfirm.type === 'evolution') {
      setEvolution(createInitialEvolution());
    } else if (pendingConfirm.type === 'all') {
      setAssessments(createInitialAssessmentsMap());
      setActiveSpecialtyIds([]);
      setReassessment(createInitialReassessment());
      setEvolution(createInitialEvolution());
      setRoute({ type: 'dashboard' });
    } else if (pendingConfirm.type === 'delete-patient' && authUser) {
      try {
        await deletePatient(authUser, pendingConfirm.patient.id);
        await refreshSnapshot(authUser);
        if (
          route.type === 'patient-record' &&
          route.patientId === pendingConfirm.patient.id
        ) {
          setRoute({ type: 'patients' });
        }
        notify('success', `Paciente ${pendingConfirm.patient.fullName} removido com segurança.`);
      } catch (err) {
        notify('error', err instanceof Error ? err.message : 'Erro ao excluir paciente.');
      }
    } else if (pendingConfirm.type === 'delete-record' && authUser) {
      try {
        const { kind, id } = pendingConfirm;
        if (kind === 'assessment') await deleteAssessmentRecord(authUser, id);
        else if (kind === 'evolution') await deleteEvolutionRecord(authUser, id);
        else if (kind === 'reassessment') await deleteReassessmentRecord(authUser, id);
        else if (kind === 'treatment_plan') await deleteTreatmentPlan(authUser, id);
        else if (kind === 'appointment') await deleteAppointment(authUser, id);
        else if (kind === 'document') {
          const targetDoc = snapshot.documents.find((d) => d.id === id);
          if (targetDoc) await deleteClinicalDocument(authUser, targetDoc);
        }
        await refreshSnapshot(authUser);
        notify('success', 'Registro excluído do prontuário.');
      } catch (err) {
        notify('error', err instanceof Error ? err.message : 'Erro ao excluir registro.');
      }
    }
    setPendingConfirm(null);
  };

  const confirmModalCopy = (() => {
    if (!pendingConfirm) return { title: '', description: '', confirmLabel: 'Confirmar' };
    if (pendingConfirm.type === 'assessment') {
      const name = SPECIALTIES_BY_ID[pendingConfirm.specialtyId].name;
      return {
        title: `Limpar ficha de ${name}?`,
        description:
          'Os dados preenchidos neste formulário em edição serão limpos. Avaliações já salvas no prontuário do paciente permanecem preservadas.',
        confirmLabel: 'Confirmar limpeza',
      };
    }
    if (pendingConfirm.type === 'reassessment') {
      return {
        title: 'Limpar rascunho da reavaliação?',
        description: 'Os campos atuais desta tela serão limpos.',
        confirmLabel: 'Confirmar limpeza',
      };
    }
    if (pendingConfirm.type === 'evolution') {
      return {
        title: 'Limpar rascunho da evolução?',
        description: 'Os campos atuais desta tela serão limpos.',
        confirmLabel: 'Confirmar limpeza',
      };
    }
    if (pendingConfirm.type === 'all') {
      return {
        title: 'Limpar formulários em edição?',
        description:
          'Os formulários abertos nesta sessão serão reiniciados. Os prontuários já salvos não serão apagados.',
        confirmLabel: 'Confirmar limpeza',
      };
    }
    if (pendingConfirm.type === 'delete-patient') {
      const pid = pendingConfirm.patient.id;
      const linkedCount =
        snapshot.assessments.filter((a) => a.patientId === pid).length +
        snapshot.evolutions.filter((e) => e.patientId === pid).length +
        snapshot.reassessments.filter((r) => r.patientId === pid).length +
        snapshot.documents.filter((d) => d.patientId === pid).length;
      return {
        title: `Excluir paciente ${pendingConfirm.patient.fullName}?`,
        description:
          linkedCount > 0
            ? `Atenção: existem ${linkedCount} registro(s) vinculados (avaliações, evoluções, reavaliações ou PDFs) neste prontuário. A exclusão removerá permanentemente o paciente e todos os seus documentos vinculados.`
            : 'Deseja excluir permanentemente o cadastro deste paciente? Esta ação não pode ser desfeita.',
        confirmLabel: 'Excluir permanentemente',
      };
    }
    return {
      title: `Excluir ${pendingConfirm.label}?`,
      description: 'Esta ação removerá permanentemente o registro do prontuário e não pode ser desfeita.',
      confirmLabel: 'Excluir registro',
    };
  })();

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-600">
        Verificando sessão clínica segura...
      </div>
    );
  }

  if (!authUser) {
    return <AuthGate onAuthenticated={handleAuthenticated} />;
  }

  const activePatientRecord =
    route.type === 'patient-record'
      ? snapshot.patients.find((p) => p.id === route.patientId) ?? null
      : null;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 text-slate-900">
      <Sidebar
        route={route}
        onNavigate={handleNavigate}
        sessionAssessmentsCount={activeSpecialtyIds.length}
        activeSessionSpecialtyIds={activeSet}
        patientsCount={snapshot.patients.length}
        documentsCount={snapshot.documents.length}
        user={authUser}
        onSignOut={handleSignOut}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <MobileNav
          route={route}
          onNavigate={handleNavigate}
          activeSessionSpecialtyIds={activeSet}
          patientsCount={snapshot.patients.length}
          documentsCount={snapshot.documents.length}
          user={authUser}
          onSignOut={handleSignOut}
        />

        <main className="flex-1 pb-12">
          {route.type === 'dashboard' && (
            <Dashboard
              assessments={assessments}
              activeSpecialtyIds={activeSpecialtyIds}
              patientsCount={snapshot.patients.length}
              documentsCount={snapshot.documents.length}
              evolutionsCount={snapshot.evolutions.length}
              onOpenSpecialty={(id, initialStep) => openSpecialty(id, initialStep)}
              onNavigate={handleNavigate}
              onRequestClearAssessment={(specialtyId) =>
                setPendingConfirm({ type: 'assessment', specialtyId })
              }
              onRequestClearAll={() => setPendingConfirm({ type: 'all' })}
            />
          )}

          {route.type === 'patients' && (
            <PatientsView
              patients={snapshot.patients}
              assessments={snapshot.assessments}
              evolutions={snapshot.evolutions}
              reassessments={snapshot.reassessments}
              documents={snapshot.documents}
              onSavePatient={async (patientInput) => {
                const saved = await savePatient(authUser, patientInput);
                await refreshSnapshot(authUser);
                notify('success', `Cadastro de ${saved.fullName} salvo no sistema.`);
                return saved;
              }}
              onRequestDeletePatient={(patient) =>
                setPendingConfirm({ type: 'delete-patient', patient })
              }
              onOpenPatientRecord={(patientId) =>
                handleNavigate({ type: 'patient-record', patientId })
              }
              onBackToDashboard={() => handleNavigate({ type: 'dashboard' })}
            />
          )}

          {route.type === 'patient-record' && activePatientRecord && (
            <PatientRecordView
              patient={activePatientRecord}
              assessments={snapshot.assessments}
              evolutions={snapshot.evolutions}
              reassessments={snapshot.reassessments}
              documents={snapshot.documents}
              treatmentPlans={snapshot.treatmentPlans}
              appointments={snapshot.appointments}
              exercisePrescriptions={snapshot.exercisePrescriptions.filter((x) => x.patientId === activePatientRecord.id)}
              exerciseLogs={snapshot.exerciseLogs.filter((x) => x.patientId === activePatientRecord.id)}
              onSaveExercisePrescription={async (value) => {
                await savePatientExercisePrescription(authUser, value);
                await refreshSnapshot(authUser);
                notify('success', 'Exercício vinculado ao paciente.');
              }}
              onLogExercise={async (value) => {
                await savePatientExerciseLog(authUser, value);
                await refreshSnapshot(authUser);
                notify('success', value.status === 'realizado' ? 'Execução registrada como realizada.' : 'Registro de não realização salvo.');
              }}
              onUpdateExercisePrescription={async (value) => {
                await savePatientExercisePrescription(authUser, value);
                await refreshSnapshot(authUser);
                notify('success', 'Prescrição de exercício atualizada.');
              }}
              onBackToPatients={() => handleNavigate({ type: 'patients' })}
              onUpdatePatientStatus={async (patient: PatientRecord, status: TreatmentStatus) => {
                await savePatient(authUser, { ...patient, treatmentStatus: status });
                await refreshSnapshot(authUser);
                notify('success', 'Situação do tratamento atualizada.');
              }}
              onStartNewAssessment={(patient, specialtyId) => {
                const fresh = createNewAssessment(specialtyId, patient);
                setAssessments((prev) => ({ ...prev, [specialtyId]: fresh }));
                setActiveSpecialtyIds((prev) =>
                  prev.includes(specialtyId) ? prev : [...prev, specialtyId]
                );
                setWorkspaceInitialStep('identificacao');
                setRoute({ type: 'assessment', specialtyId });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenExistingAssessment={(asm) => {
                setAssessments((prev) => ({ ...prev, [asm.specialtyId]: asm }));
                setActiveSpecialtyIds((prev) =>
                  prev.includes(asm.specialtyId) ? prev : [...prev, asm.specialtyId]
                );
                setWorkspaceInitialStep('identificacao');
                setRoute({ type: 'assessment', specialtyId: asm.specialtyId });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onStartNewEvolution={(patient) => {
                setEvolution(createInitialEvolution(patient));
                handleNavigate({ type: 'evolution' });
              }}
              onOpenExistingEvolution={(evo) => {
                setEvolution(evo);
                handleNavigate({ type: 'evolution' });
              }}
              onStartNewReassessment={(patient, baseAssessment) => {
                if (baseAssessment) {
                  handleImportAssessmentToReassessment({
                    ...baseAssessment,
                    patientId: patient.id,
                  });
                } else {
                  setReassessment(createInitialReassessment(patient));
                  handleNavigate({ type: 'reassessment' });
                }
              }}
              onOpenExistingReassessment={(reav) => {
                setReassessment(reav);
                handleNavigate({ type: 'reassessment' });
              }}
              onArchiveGeneratedPdf={handleArchivePdfParams}
              onImportAssessment={handleImportAssessmentPdf}
              onSaveTreatmentPlan={async (plan) => {
                const saved = await saveTreatmentPlan(authUser, plan);
                await refreshSnapshot(authUser);
                notify('success', 'Plano terapêutico salvo no prontuário.');
                return saved;
              }}
              onSaveAppointment={async (appt) => {
                const saved = await saveAppointment(authUser, appt);
                await refreshSnapshot(authUser);
                notify('success', 'Atendimento registrado no prontuário.');
                return saved;
              }}
              onPreviewDocument={handlePreviewOrPrintDocument}
              onDownloadDocument={handleDownloadDocument}
              onPrintDocument={handlePreviewOrPrintDocument}
              onRequestDeleteItem={(kind, id, label) =>
                setPendingConfirm({ type: 'delete-record', kind, id, label })
              }
            />
          )}

          {route.type === 'assessment' && (
            <AssessmentWorkspace
              key={`${route.specialtyId}-${workspaceInitialStep}-${assessments[route.specialtyId].id}`}
              assessment={assessments[route.specialtyId]}
              patients={snapshot.patients}
              initialStep={workspaceInitialStep}
              onChange={handleUpdateAssessment}
              onSaveToRecord={handleSaveAssessmentToRecord}
              onArchivePdf={async (asm, blob, filename) => {
                if (!asm.patientId) return;
                const spec = SPECIALTIES_BY_ID[asm.specialtyId];
                await handleArchivePdfParams({
                  patientId: asm.patientId,
                  relatedRecordId: asm.id,
                  documentType: 'avaliacao_inicial',
                  title: `Avaliação — ${spec.name}`,
                  specialtyId: asm.specialtyId,
                  documentDate: asm.identification.evaluationDate,
                  blob,
                  fileName: filename,
                });
              }}
              onOpenPatientRecord={(patientId) =>
                handleNavigate({ type: 'patient-record', patientId })
              }
              onBackToDashboard={() => handleNavigate({ type: 'dashboard' })}
              onRequestClear={() =>
                setPendingConfirm({ type: 'assessment', specialtyId: route.specialtyId })
              }
              onCreateReassessment={handleImportAssessmentToReassessment}
            />
          )}

          {route.type === 'reassessment' && (
            <ReassessmentView
              reassessment={reassessment}
              patients={snapshot.patients}
              sessionAssessments={sessionAssessmentsList}
              savedAssessments={snapshot.assessments}
              onChange={setReassessment}
              onImportFromAssessment={handleImportAssessmentToReassessment}
              onSaveToRecord={handleSaveReassessmentToRecord}
              onArchivePdf={async (reav, isComparative, blob, filename) => {
                if (!reav.patientId) return;
                const spec = SPECIALTIES_BY_ID[reav.specialtyId];
                await handleArchivePdfParams({
                  patientId: reav.patientId,
                  relatedRecordId: reav.id,
                  documentType: isComparative
                    ? 'relatorio_comparativo'
                    : 'reavaliacao_funcional',
                  title: isComparative
                    ? `Relatório Comparativo — ${spec.shortName}`
                    : `Reavaliação Funcional — ${spec.shortName}`,
                  specialtyId: reav.specialtyId,
                  documentDate: reav.evaluationDate,
                  blob,
                  fileName: filename,
                });
              }}
              onOpenPatientRecord={(patientId) =>
                handleNavigate({ type: 'patient-record', patientId })
              }
              onBackToDashboard={() => handleNavigate({ type: 'dashboard' })}
              onRequestClear={() => setPendingConfirm({ type: 'reassessment' })}
            />
          )}

          {route.type === 'evolution' && (
            <EvolutionView
              evolution={evolution}
              patients={snapshot.patients}
              savedEvolutions={snapshot.evolutions}
              onChange={setEvolution}
              onSaveToRecord={handleSaveEvolutionToRecord}
              onArchivePdf={async (evo, blob, filename) => {
                if (!evo.patientId) return;
                await handleArchivePdfParams({
                  patientId: evo.patientId,
                  relatedRecordId: evo.id,
                  documentType: 'evolucao_clinica',
                  title: `Evolução Clínica — ${formatDatePtBr(evo.date)}`,
                  specialtyId: evo.specialtyId,
                  documentDate: evo.date,
                  blob,
                  fileName: filename,
                });
              }}
              onNewEvolutionDraft={(patient) => setEvolution(createInitialEvolution(patient))}
              onOpenPatientRecord={(patientId) =>
                handleNavigate({ type: 'patient-record', patientId })
              }
              onBackToDashboard={() => handleNavigate({ type: 'dashboard' })}
              onRequestClear={() => setPendingConfirm({ type: 'evolution' })}
            />
          )}

          {route.type === 'documents' && (
            <DocumentsHubView
              documents={snapshot.documents}
              patients={snapshot.patients}
              onPreviewDocument={handlePreviewOrPrintDocument}
              onDownloadDocument={handleDownloadDocument}
              onPrintDocument={handlePreviewOrPrintDocument}
              onRequestDeleteDocument={(doc) =>
                setPendingConfirm({
                  type: 'delete-record',
                  kind: 'document',
                  id: doc.id,
                  label: doc.title,
                })
              }
              onOpenPatientRecord={(patientId) =>
                handleNavigate({ type: 'patient-record', patientId })
              }
              onBackToDashboard={() => handleNavigate({ type: 'dashboard' })}
            />
          )}

          {route.type === 'library' && (
            <InstrumentsLibraryView
              onBackToDashboard={() => handleNavigate({ type: 'dashboard' })}
              onOpenSpecialty={(id) => openSpecialty(id, 'testes')}
            />
          )}

          {route.type === 'settings' && (
            <SettingsView
              user={authUser}
              snapshot={snapshot}
              onSignOut={handleSignOut}
              onBackToDashboard={() => handleNavigate({ type: 'dashboard' })}
            />
          )}
        </main>
      </div>

      {/* Toast Feedback */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-4 right-4 z-50 flex max-w-md items-center gap-3 rounded-xl border px-4 py-3 text-xs font-medium shadow-lg ${
            toast.kind === 'success'
              ? 'border-blue-200 bg-white text-[#0B1F3A]'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          {toast.kind === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-[#1D4ED8] shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          )}
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="rounded p-1 text-slate-400 hover:bg-slate-100"
            aria-label="Fechar aviso"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <DocumentPreviewModal
        doc={previewState?.doc ?? null}
        previewUrl={previewState?.url ?? null}
        isObjectUrl={previewState?.isObjectUrl ?? false}
        onClose={() => setPreviewState(null)}
      />

      <ConfirmModal
        open={pendingConfirm !== null}
        title={confirmModalCopy.title}
        description={confirmModalCopy.description}
        confirmLabel={confirmModalCopy.confirmLabel}
        onConfirm={executeConfirmAction}
        onCancel={() => setPendingConfirm(null)}
      />
    </div>
  );
}
