import { useMemo, useState } from 'react';
import { AssessmentWorkspace } from './components/AssessmentWorkspace';
import { ConfirmModal } from './components/ConfirmModal';
import { Dashboard } from './components/Dashboard';
import { EvolutionView } from './components/EvolutionView';
import { InstrumentsLibraryView } from './components/InstrumentsLibraryView';
import { MobileNav } from './components/MobileNav';
import { ReassessmentView } from './components/ReassessmentView';
import { ActiveRoute, Sidebar } from './components/Sidebar';
import { INSTRUMENTS_BY_ID } from './data/scalesAndTests';
import { SPECIALTIES, SPECIALTIES_BY_ID } from './data/specialties';
import {
  AssessmentRecord,
  AssessmentStepId,
  DailyEvolutionRecord,
  ReassessmentComparisonItem,
  ReassessmentRecord,
  SpecialtyId,
} from './types/clinical';
import { createNewAssessment } from './utils/calculations';

function createInitialAssessmentsMap(): Record<SpecialtyId, AssessmentRecord> {
  const map = {} as Record<SpecialtyId, AssessmentRecord>;
  SPECIALTIES.forEach((s) => {
    map[s.id] = createNewAssessment(s.id);
  });
  return map;
}

function createInitialReassessment(): ReassessmentRecord {
  const today = new Date().toISOString().split('T')[0];
  return {
    id: `reav-${Date.now()}`,
    linkedAssessmentId: null,
    specialtyId: 'ortopedia',
    patientName: '',
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

function createInitialEvolution(): DailyEvolutionRecord {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const hhmm = now.toTimeString().slice(0, 5);
  return {
    id: `evo-${Date.now()}`,
    patientName: '',
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

type ClearAction =
  | { type: 'assessment'; specialtyId: SpecialtyId }
  | { type: 'reassessment' }
  | { type: 'evolution' }
  | { type: 'all' }
  | null;

export default function App() {
  const [route, setRoute] = useState<ActiveRoute>({ type: 'dashboard' });
  const [workspaceInitialStep, setWorkspaceInitialStep] = useState<AssessmentStepId>('identificacao');
  const [assessments, setAssessments] = useState<Record<SpecialtyId, AssessmentRecord>>(
    createInitialAssessmentsMap
  );
  const [activeSpecialtyIds, setActiveSpecialtyIds] = useState<SpecialtyId[]>([]);
  const [reassessment, setReassessment] = useState<ReassessmentRecord>(createInitialReassessment);
  const [evolution, setEvolution] = useState<DailyEvolutionRecord>(createInitialEvolution);
  const [pendingClear, setPendingClear] = useState<ClearAction>(null);

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

    setReassessment({
      ...createInitialReassessment(),
      linkedAssessmentId: source.id,
      specialtyId: source.specialtyId,
      patientName: source.identification.fullName,
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

  const executeClear = () => {
    if (!pendingClear) return;
    if (pendingClear.type === 'assessment') {
      const sId = pendingClear.specialtyId;
      setAssessments((prev) => ({ ...prev, [sId]: createNewAssessment(sId) }));
      setActiveSpecialtyIds((prev) => prev.filter((id) => id !== sId));
    } else if (pendingClear.type === 'reassessment') {
      setReassessment(createInitialReassessment());
    } else if (pendingClear.type === 'evolution') {
      setEvolution(createInitialEvolution());
    } else if (pendingClear.type === 'all') {
      setAssessments(createInitialAssessmentsMap());
      setActiveSpecialtyIds([]);
      setReassessment(createInitialReassessment());
      setEvolution(createInitialEvolution());
      setRoute({ type: 'dashboard' });
    }
    setPendingClear(null);
  };

  const clearModalCopy = (() => {
    if (!pendingClear) return { title: '', description: '' };
    if (pendingClear.type === 'assessment') {
      const name = SPECIALTIES_BY_ID[pendingClear.specialtyId].name;
      return {
        title: `Limpar ficha de ${name}?`,
        description:
          'Todos os dados preenchidos nesta ficha durante a sessão atual serão removidos permanentemente da memória. Certifique-se de já ter gerado e baixado o PDF se desejar arquivar o registro.',
      };
    }
    if (pendingClear.type === 'reassessment') {
      return {
        title: 'Limpar dados da reavaliação?',
        description:
          'Todos os campos comparativos, metas e novo plano desta tela serão apagados da memória da sessão.',
      };
    }
    if (pendingClear.type === 'evolution') {
      return {
        title: 'Limpar ficha de evolução diária?',
        description:
          'Todos os registros da sessão e exercícios digitados serão apagados da memória.',
      };
    }
    return {
      title: 'Limpar toda a sessão atual?',
      description:
        'Todas as avaliações, reavaliações e evoluções da sessão atual serão apagadas permanentemente da memória do navegador.',
    };
  })();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 text-slate-900">
      <Sidebar
        route={route}
        onNavigate={handleNavigate}
        sessionAssessmentsCount={activeSpecialtyIds.length}
        activeSessionSpecialtyIds={activeSet}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <MobileNav
          route={route}
          onNavigate={handleNavigate}
          activeSessionSpecialtyIds={activeSet}
        />

        <main className="flex-1 pb-12">
          {route.type === 'dashboard' && (
            <Dashboard
              assessments={assessments}
              activeSpecialtyIds={activeSpecialtyIds}
              onOpenSpecialty={(id, initialStep) => openSpecialty(id, initialStep)}
              onNavigate={handleNavigate}
              onRequestClearAssessment={(specialtyId) =>
                setPendingClear({ type: 'assessment', specialtyId })
              }
              onRequestClearAll={() => setPendingClear({ type: 'all' })}
            />
          )}

          {route.type === 'assessment' && (
            <AssessmentWorkspace
              key={`${route.specialtyId}-${workspaceInitialStep}-${assessments[route.specialtyId].id}`}
              assessment={assessments[route.specialtyId]}
              initialStep={workspaceInitialStep}
              onChange={handleUpdateAssessment}
              onBackToDashboard={() => handleNavigate({ type: 'dashboard' })}
              onRequestClear={() =>
                setPendingClear({ type: 'assessment', specialtyId: route.specialtyId })
              }
              onCreateReassessment={handleImportAssessmentToReassessment}
            />
          )}

          {route.type === 'reassessment' && (
            <ReassessmentView
              reassessment={reassessment}
              sessionAssessments={sessionAssessmentsList}
              onChange={setReassessment}
              onImportFromAssessment={handleImportAssessmentToReassessment}
              onBackToDashboard={() => handleNavigate({ type: 'dashboard' })}
              onRequestClear={() => setPendingClear({ type: 'reassessment' })}
            />
          )}

          {route.type === 'evolution' && (
            <EvolutionView
              evolution={evolution}
              onChange={setEvolution}
              onBackToDashboard={() => handleNavigate({ type: 'dashboard' })}
              onRequestClear={() => setPendingClear({ type: 'evolution' })}
            />
          )}

          {route.type === 'library' && (
            <InstrumentsLibraryView
              onBackToDashboard={() => handleNavigate({ type: 'dashboard' })}
              onOpenSpecialty={(id) => openSpecialty(id, 'testes')}
            />
          )}
        </main>
      </div>

      <ConfirmModal
        open={pendingClear !== null}
        title={clearModalCopy.title}
        description={clearModalCopy.description}
        onConfirm={executeClear}
        onCancel={() => setPendingClear(null)}
      />
    </div>
  );
}
