import React, { useMemo, useState } from 'react';
import {
  Accessibility,
  Activity,
  ActivitySquare,
  ArrowRight,
  Baby,
  Bone,
  BookOpen,
  Brain,
  Briefcase,
  ClipboardCheck,
  Compass,
  Droplets,
  ExternalLink,
  Eye,
  FileDown,
  FilePlus2,
  Flame,
  GitCompare,
  Hand,
  Heart,
  HeartHandshake,
  HeartPulse,
  Ribbon,
  ScanFace,
  Search,
  ShieldAlert,
  ShieldCheck,
  Smile,
  Sparkles,
  Trash2,
  Waves,
  Wind,
} from 'lucide-react';
import { SPECIALTIES, SPECIALTIES_BY_ID } from '../data/specialties';
import {
  AssessmentRecord,
  SpecialtyCategory,
  SpecialtyId,
} from '../types/clinical';
import {
  calculateAssessmentCompletion,
  formatDatePtBr,
  PROFESSIONAL_INFO,
} from '../utils/calculations';
import { generateAssessmentPdf } from '../utils/pdfGenerator';
import { LgpdBanner } from './LgpdBanner';
import { Logo } from './Logo';
import { ActiveRoute } from './Sidebar';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Bone,
  Brain,
  Smile,
  HeartHandshake,
  HeartPulse,
  Baby,
  Wind,
  Activity,
  ShieldAlert,
  Sparkles,
  ShieldCheck,
  Heart,
  Compass,
  Ribbon,
  ActivitySquare,
  Droplets,
  Accessibility,
  ScanFace,
  Hand,
  Briefcase,
  Waves,
  Flame,
};

const CATEGORIES: SpecialtyCategory[] = [
  'Todas',
  'Musculoesquelética',
  'Neurofuncional',
  'Cardiorrespiratória e Hospitalar',
  'Saúde da Mulher e Ciclos de Vida',
  'Especialidades Clínicas',
];

interface DashboardProps {
  assessments: Record<SpecialtyId, AssessmentRecord>;
  savedAssessments: AssessmentRecord[];
  activeSpecialtyIds: SpecialtyId[];
  onOpenSavedAssessment: (assessment: AssessmentRecord) => void;
  patientsCount: number;
  documentsCount: number;
  evolutionsCount: number;
  onOpenSpecialty: (specialtyId: SpecialtyId, initialStep?: 'identificacao' | 'relatorio') => void;
  onNavigate: (route: ActiveRoute) => void;
  onRequestClearAssessment: (specialtyId: SpecialtyId) => void;
  onRequestClearAll: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  assessments,
  savedAssessments,
  activeSpecialtyIds,
  onOpenSavedAssessment,
  patientsCount,
  documentsCount,
  evolutionsCount,
  onOpenSpecialty,
  onNavigate,
  onRequestClearAssessment,
  onRequestClearAll,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<SpecialtyCategory>('Todas');
  const [newAssessmentModalOpen, setNewAssessmentModalOpen] = useState(false);

  const filteredSpecialties = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return SPECIALTIES.filter((s) => {
      const matchesCat = selectedCategory === 'Todas' || s.category === selectedCategory;
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.code.includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [searchQuery, selectedCategory]);

  const activeRecords = useMemo(() => {
    return activeSpecialtyIds
      .map((id) => assessments[id])
      .filter(Boolean)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [assessments, activeSpecialtyIds]);

  const savedRecords = useMemo(
    () => [...savedAssessments].sort((a, b) =>
      (b.identification.evaluationDate || b.createdAt).localeCompare(
        a.identification.evaluationDate || a.createdAt
      )
    ),
    [savedAssessments]
  );

  return (
    <div className="mx-auto max-w-[1280px] space-y-8 px-4 py-6 sm:px-8 sm:py-8">
      {/* Top Clinical Identification Header */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-4">
            <Logo />
            <div className="space-y-1">
              <h1 className="font-display text-2xl font-bold tracking-tight text-[#0B1F3A] sm:text-3xl text-balance">
                Sistema Clínico de Avaliação Fisioterapêutica
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{PROFESSIONAL_INFO.therapistName}</span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="font-mono text-xs font-medium text-[#1D4ED8] tabular-nums">
                  {PROFESSIONAL_INFO.crefito}
                </span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <a
                  href={PROFESSIONAL_INFO.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-slate-600 hover:text-[#1D4ED8] hover:underline"
                >
                  <span>lezcanofisioterapia.com.br</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span className="text-slate-600">{PROFESSIONAL_INFO.instagram}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate({ type: 'patients' })}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0B1F3A] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#132d52] whitespace-nowrap shrink-0 min-h-[44px]"
            >
              <span>Pacientes ({patientsCount})</span>
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setNewAssessmentModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1D4ED8] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1E40AF] whitespace-nowrap shrink-0 min-h-[44px]"
            >
              <FilePlus2 className="h-4 w-4" />
              <span>Nova Avaliação</span>
            </button>
            {activeRecords.length > 0 && (
              <button
                type="button"
                onClick={onRequestClearAll}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-red-50 hover:text-red-700 hover:border-red-200 whitespace-nowrap shrink-0 min-h-[44px]"
              >
                <Trash2 className="h-4 w-4" />
                <span>Limpar Sessão</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Clinical Module Shortcuts */}
        <div className="mt-6 grid grid-cols-1 gap-3 border-t border-slate-100 pt-6 sm:grid-cols-2 xl:grid-cols-5">
          <button
            type="button"
            onClick={() => onNavigate({ type: 'patients' })}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 text-left transition-colors hover:border-[#1D4ED8]/40 hover:bg-blue-50/40"
          >
            <div className="min-w-0">
              <div className="font-display text-sm font-semibold text-slate-900 truncate">
                Prontuários ({patientsCount})
              </div>
              <div className="text-xs text-slate-500 truncate">
                Cadastro e prontuário digital
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate({ type: 'reassessment' })}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 text-left transition-colors hover:border-[#1D4ED8]/40 hover:bg-blue-50/40"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0B1F3A] text-white">
                <GitCompare className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="font-display text-sm font-semibold text-slate-900 truncate">
                  Reavaliação
                </div>
                <div className="text-xs text-slate-500 truncate">
                  Comparativo funcional
                </div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate({ type: 'evolution' })}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 text-left transition-colors hover:border-[#1D4ED8]/40 hover:bg-blue-50/40"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1D4ED8] text-white">
                <ClipboardCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="font-display text-sm font-semibold text-slate-900 truncate">
                  Evoluções ({evolutionsCount})
                </div>
                <div className="text-xs text-slate-500 truncate">
                  Histórico por sessão
                </div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate({ type: 'documents' })}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 text-left transition-colors hover:border-[#1D4ED8]/40 hover:bg-blue-50/40"
          >
            <div className="min-w-0">
              <div className="font-display text-sm font-semibold text-slate-900 truncate">
                Documentos ({documentsCount})
              </div>
              <div className="text-xs text-slate-500 truncate">
                PDFs vinculados e assinados
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => onNavigate({ type: 'library' })}
            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3.5 text-left transition-colors hover:border-[#1D4ED8]/40 hover:bg-blue-50/40"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-white">
                <BookOpen className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="font-display text-sm font-semibold text-slate-900 truncate">
                  Instrumentos (20)
                </div>
                <div className="text-xs text-slate-500 truncate">
                  Escalas e referências
                </div>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
          </button>
        </div>
      </section>

      {/* Session Assessments Section */}
      <section className="space-y-3" aria-labelledby="session-assessments-title">
        <div className="flex items-center justify-between">
          <div>
            <h2 id="session-assessments-title" className="font-display text-lg font-bold text-[#0B1F3A]">
              Avaliações Realizadas na Sessão Atual
            </h2>
            <p className="text-xs text-slate-500">
              Registros mantidos exclusivamente na memória da sessão até o encerramento ou limpeza manual.
            </p>
          </div>
          <span className="font-mono text-xs font-medium text-slate-600 tabular-nums">
            {activeRecords.length} {activeRecords.length === 1 ? 'ficha ativa' : 'fichas ativas'}
          </span>
        </div>

        {activeRecords.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center">
            <p className="text-sm font-medium text-slate-700">
              Nenhuma avaliação iniciada nesta sessão.
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Selecione uma das 22 especialidades abaixo ou clique em Nova Avaliação para começar.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Especialidade</th>
                    <th className="px-4 py-3">Paciente</th>
                    <th className="px-4 py-3">Data</th>
                    <th className="px-4 py-3">Preenchimento</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeRecords.map((rec) => {
                    const spec = SPECIALTIES_BY_ID[rec.specialtyId];
                    const pct = calculateAssessmentCompletion(rec);
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-medium text-[#0B1F3A]">
                          <span className="font-mono text-xs text-slate-400 mr-1.5 tabular-nums">{spec.code}.</span>
                          {spec.name}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {rec.identification.fullName.trim() || (
                            <span className="italic text-slate-400">Paciente não informado</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                          {formatDatePtBr(rec.identification.evaluationDate)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5 min-w-[130px]">
                            <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#1D4ED8] transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums w-9 text-right">
                              {pct}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => onOpenSpecialty(rec.specialtyId, 'identificacao')}
                              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenSpecialty(rec.specialtyId, 'relatorio')}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Pré-visualizar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => generateAssessmentPdf(rec)}
                              className="inline-flex items-center gap-1 rounded-lg bg-[#0B1F3A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#132d52] whitespace-nowrap"
                            >
                              <FileDown className="h-3.5 w-3.5" />
                              <span>PDF</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onRequestClearAssessment(rec.specialtyId)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              aria-label={`Limpar avaliação de ${spec.name}`}
                              title="Limpar avaliação"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Saved assessments loaded from the clinical record */}
      <section className="space-y-3" aria-labelledby="saved-assessments-title">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 id="saved-assessments-title" className="font-display text-lg font-bold text-[#0B1F3A]">
              Avaliações Salvas no Prontuário
            </h2>
            <p className="text-xs text-slate-500">
              Fichas registradas no banco de dados, disponíveis mesmo após sair e entrar novamente.
            </p>
          </div>
          <span className="font-mono text-xs font-medium text-slate-600 tabular-nums whitespace-nowrap">
            {savedRecords.length} {savedRecords.length === 1 ? 'avaliação salva' : 'avaliações salvas'}
          </span>
        </div>

        {savedRecords.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-6 text-center">
            <p className="text-sm font-medium text-slate-700">Nenhuma avaliação salva no prontuário.</p>
            <p className="mt-1 text-xs text-slate-500">
              Quando uma avaliação for salva e vinculada a um paciente, ela aparecerá aqui.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Especialidade</th>
                    <th className="px-4 py-3">Paciente</th>
                    <th className="px-4 py-3">Data da avaliação</th>
                    <th className="px-4 py-3">Preenchimento</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {savedRecords.map((rec) => {
                    const spec = SPECIALTIES_BY_ID[rec.specialtyId];
                    const pct = calculateAssessmentCompletion(rec);
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-4 py-3 font-medium text-[#0B1F3A]">
                          <span className="font-mono text-xs text-slate-400 mr-1.5 tabular-nums">{spec.code}.</span>
                          {spec.name}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {rec.identification.fullName.trim() || (
                            <span className="italic text-slate-400">Paciente não informado</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600 tabular-nums whitespace-nowrap">
                          {formatDatePtBr(rec.identification.evaluationDate || rec.createdAt.slice(0, 10))}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5 min-w-[130px]">
                            <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-600" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums w-9 text-right">{pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => onOpenSavedAssessment(rec)}
                              className="rounded-lg bg-[#0B1F3A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#132d52] whitespace-nowrap"
                            >
                              Abrir ficha
                            </button>
                            <button
                              type="button"
                              onClick={() => generateAssessmentPdf(rec)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                            >
                              <FileDown className="h-3.5 w-3.5" />
                              <span>PDF</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* Specialties Directory */}
      <section className="space-y-4" aria-labelledby="specialties-grid-title">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 id="specialties-grid-title" className="font-display text-xl font-bold text-[#0B1F3A]">
              Fichas Clínicas por Especialidade (22 Áreas)
            </h2>
            <p className="text-sm text-slate-600">
              Cada especialidade possui anamnese, exame físico, testes específicos e escalas próprias.
            </p>
          </div>

          <div className="relative w-full md:w-80">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Pesquisar especialidade ou área..."
              aria-label="Pesquisar especialidades"
              className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1D4ED8] focus:outline-none"
            />
          </div>
        </div>

        {/* Category Segmented Controls */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-200/70 p-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-lg px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === cat
                  ? 'bg-white text-[#0B1F3A] shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {filteredSpecialties.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <p className="text-sm font-medium text-slate-700">
              Nenhuma especialidade encontrada para &ldquo;{searchQuery}&rdquo;.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('Todas');
              }}
              className="mt-3 text-xs font-semibold text-[#1D4ED8] hover:underline"
            >
              Limpar filtros de pesquisa
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredSpecialties.map((spec) => {
              const IconComp = ICON_MAP[spec.iconName] || Activity;
              const isStarted = activeSpecialtyIds.includes(spec.id);
              const pct = isStarted ? calculateAssessmentCompletion(assessments[spec.id]) : 0;

              return (
                <div
                  key={spec.id}
                  className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-[#1D4ED8]/50"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#0B1F3A]/5 text-[#0B1F3A] group-hover:bg-[#1D4ED8] group-hover:text-white transition-colors">
                        <IconComp className="h-5 w-5" />
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <span className="font-mono font-semibold text-slate-400 tabular-nums">
                          {spec.code}
                        </span>
                        <span aria-hidden="true" className="mx-1.5">·</span>
                        <span>{spec.category}</span>
                      </div>
                    </div>

                    <h3 className="mt-4 font-display text-base font-bold text-[#0B1F3A] group-hover:text-[#1D4ED8] transition-colors">
                      {spec.name}
                    </h3>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600 line-clamp-3">
                      {spec.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                    {isStarted ? (
                      <div className="flex items-center gap-2 text-xs font-medium text-[#1D4ED8] tabular-nums">
                        <span>Em sessão · {pct}%</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Ficha independente</span>
                    )}

                    <button
                      type="button"
                      onClick={() => onOpenSpecialty(spec.id, 'identificacao')}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1D4ED8] whitespace-nowrap shrink-0"
                    >
                      <span>{isStarted ? 'Continuar' : 'Abrir Ficha'}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <LgpdBanner />

      {/* Nova Avaliação Modal */}
      {newAssessmentModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="nova-avaliacao-title"
        >
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h3 id="nova-avaliacao-title" className="font-display text-lg font-bold text-[#0B1F3A]">
                  Iniciar Nova Avaliação Fisioterapêutica
                </h3>
                <p className="text-xs text-slate-500">
                  Selecione a especialidade clínica para abrir a ficha dedicada em 9 etapas.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNewAssessmentModalOpen(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Fechar
              </button>
            </div>
            <div className="overflow-y-auto p-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {SPECIALTIES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setNewAssessmentModalOpen(false);
                    onOpenSpecialty(s.id, 'identificacao');
                  }}
                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 px-4 py-3 text-left hover:border-[#1D4ED8] hover:bg-blue-50/40 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-display text-sm font-semibold text-slate-900 truncate">
                      <span className="font-mono text-xs text-slate-400 mr-1.5">{s.code}.</span>
                      {s.name}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">{s.category}</div>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
