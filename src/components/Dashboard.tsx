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
  Users,
  FileText,
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


const CATEGORY_STYLE: Record<string, { icon: string; badge: string; border: string }> = {
  'Musculoesquelética': { icon: 'bg-sky-100 text-sky-700', badge: 'bg-sky-50 text-sky-700', border: 'hover:border-sky-300' },
  'Neurofuncional': { icon: 'bg-violet-100 text-violet-700', badge: 'bg-violet-50 text-violet-700', border: 'hover:border-violet-300' },
  'Cardiorrespiratória e Hospitalar': { icon: 'bg-emerald-100 text-emerald-700', badge: 'bg-emerald-50 text-emerald-700', border: 'hover:border-emerald-300' },
  'Saúde da Mulher e Ciclos de Vida': { icon: 'bg-pink-100 text-pink-700', badge: 'bg-pink-50 text-pink-700', border: 'hover:border-pink-300' },
  'Especialidades Clínicas': { icon: 'bg-amber-100 text-amber-700', badge: 'bg-amber-50 text-amber-700', border: 'hover:border-amber-300' },
};

const SPECIALTY_ICON_STYLE: Record<string, string> = {
  Bone: 'bg-sky-100 text-sky-700 group-hover:bg-sky-600 group-hover:text-white',
  Brain: 'bg-violet-100 text-violet-700 group-hover:bg-violet-600 group-hover:text-white',
  Smile: 'bg-rose-100 text-rose-700 group-hover:bg-rose-600 group-hover:text-white',
  HeartHandshake: 'bg-pink-100 text-pink-700 group-hover:bg-pink-600 group-hover:text-white',
  HeartPulse: 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white',
  Baby: 'bg-fuchsia-100 text-fuchsia-700 group-hover:bg-fuchsia-600 group-hover:text-white',
  Wind: 'bg-cyan-100 text-cyan-700 group-hover:bg-cyan-600 group-hover:text-white',
  Activity: 'bg-teal-100 text-teal-700 group-hover:bg-teal-600 group-hover:text-white',
  ShieldAlert: 'bg-orange-100 text-orange-700 group-hover:bg-orange-600 group-hover:text-white',
  Sparkles: 'bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white',
  ShieldCheck: 'bg-lime-100 text-lime-700 group-hover:bg-lime-600 group-hover:text-white',
  Heart: 'bg-red-100 text-red-700 group-hover:bg-red-600 group-hover:text-white',
  Compass: 'bg-indigo-100 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white',
  Ribbon: 'bg-purple-100 text-purple-700 group-hover:bg-purple-600 group-hover:text-white',
  ActivitySquare: 'bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white',
  Droplets: 'bg-sky-100 text-sky-700 group-hover:bg-sky-600 group-hover:text-white',
  Accessibility: 'bg-cyan-100 text-cyan-700 group-hover:bg-cyan-600 group-hover:text-white',
  ScanFace: 'bg-fuchsia-100 text-fuchsia-700 group-hover:bg-fuchsia-600 group-hover:text-white',
  Hand: 'bg-orange-100 text-orange-700 group-hover:bg-orange-600 group-hover:text-white',
  Briefcase: 'bg-slate-100 text-slate-700 group-hover:bg-slate-700 group-hover:text-white',
  Waves: 'bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white',
  Flame: 'bg-orange-100 text-orange-700 group-hover:bg-orange-600 group-hover:text-white',
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
  const [expandedCategories, setExpandedCategories] = useState<SpecialtyCategory[]>([]);
  const [newAssessmentModalOpen, setNewAssessmentModalOpen] = useState(false);
  const [savedSearch, setSavedSearch] = useState('');

  const filteredSpecialties = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return SPECIALTIES.filter((s) =>
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.code.includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const specialtyGroups = useMemo(
    () => CATEGORIES.filter((category) => category !== 'Todas').map((category) => ({
      category,
      specialties: filteredSpecialties.filter((specialty) => specialty.category === category),
    })).filter((group) => group.specialties.length > 0),
    [filteredSpecialties]
  );

  const toggleCategory = (category: SpecialtyCategory) => {
    setExpandedCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category]
    );
  };

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

  const filteredSavedRecords = useMemo(() => {
    const query = savedSearch.trim().toLowerCase();
    if (!query) return savedRecords;
    return savedRecords.filter((record) => {
      const specialty = SPECIALTIES_BY_ID[record.specialtyId];
      return record.identification.fullName.toLowerCase().includes(query) || specialty.name.toLowerCase().includes(query) || specialty.code.toLowerCase().includes(query);
    });
  }, [savedRecords, savedSearch]);

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

      {/* Interactive clinical overview */}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Resumo clínico">
        <button type="button" onClick={() => onNavigate({ type: 'patients' })} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md sm:p-5">
          <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pacientes</span><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Users className="h-4 w-4" /></span></div>
          <div className="mt-3 flex items-end justify-between"><strong className="font-display text-3xl text-[#0B1F3A] tabular-nums">{patientsCount}</strong><span className="text-xs font-semibold text-blue-700 group-hover:underline">Ver pacientes <ArrowRight className="ml-1 inline h-3 w-3" /></span></div>
        </button>
        <button type="button" onClick={() => document.getElementById('session-assessments')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md sm:p-5">
          <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Em andamento</span><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><Activity className="h-4 w-4" /></span></div>
          <div className="mt-3 flex items-end justify-between"><strong className="font-display text-3xl text-[#0B1F3A] tabular-nums">{activeRecords.length}</strong><span className="text-xs font-semibold text-blue-700 group-hover:underline">Ver fichas <ArrowRight className="ml-1 inline h-3 w-3" /></span></div>
        </button>
        <button type="button" onClick={() => document.getElementById('saved-assessments')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md sm:p-5">
          <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Avaliações salvas</span><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><ClipboardCheck className="h-4 w-4" /></span></div>
          <div className="mt-3 flex items-end justify-between"><strong className="font-display text-3xl text-[#0B1F3A] tabular-nums">{savedRecords.length}</strong><span className="text-xs font-semibold text-blue-700 group-hover:underline">Ver prontuário <ArrowRight className="ml-1 inline h-3 w-3" /></span></div>
        </button>
        <button type="button" onClick={() => onNavigate({ type: 'documents' })} className="group rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md sm:p-5">
          <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Documentos</span><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><FileText className="h-4 w-4" /></span></div>
          <div className="mt-3 flex items-end justify-between"><strong className="font-display text-3xl text-[#0B1F3A] tabular-nums">{documentsCount}</strong><span className="text-xs font-semibold text-blue-700 group-hover:underline">Abrir arquivos <ArrowRight className="ml-1 inline h-3 w-3" /></span></div>
        </button>
      </section>

      {/* Session Assessments Section */}
      <section id="session-assessments" className="scroll-mt-6 space-y-3" aria-labelledby="session-assessments-title">
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
          <div className="overflow-hidden bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-emerald-100 bg-emerald-50/70 text-xs font-semibold text-emerald-900">
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
                              className="inline-flex items-center gap-1 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800 transition-colors hover:border-cyan-300 hover:bg-cyan-100 whitespace-nowrap"
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
      <section id="saved-assessments" className="scroll-mt-6 overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md" aria-labelledby="saved-assessments-title">
        <div className="flex flex-col gap-4 border-b border-emerald-100 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-200 transition-transform duration-200 hover:scale-105"><ClipboardCheck className="h-6 w-6" /></span>
            <div>
            <h2 id="saved-assessments-title" className="font-display text-lg font-bold text-[#0B1F3A]">
              Avaliações Salvas no Prontuário
            </h2>
            <p className="text-xs text-slate-500">
              Fichas registradas no prontuário, disponíveis mesmo após sair e entrar novamente.
            </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
            <label className="relative block w-full sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input type="search" value={savedSearch} onChange={(event) => setSavedSearch(event.target.value)} placeholder="Buscar paciente ou área..." aria-label="Buscar avaliações salvas" className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100" />
            </label>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white/80 px-3 py-2 text-xs font-bold text-emerald-800 shadow-sm tabular-nums whitespace-nowrap"><ClipboardCheck className="h-3.5 w-3.5" />{savedRecords.length} {savedRecords.length === 1 ? 'avaliação salva' : 'avaliações salvas'}</span>
          </div>
        </div>

        {savedRecords.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-6 text-center">
            <p className="text-sm font-medium text-slate-700">Nenhuma avaliação salva no prontuário.</p>
            <p className="mt-1 text-xs text-slate-500">
              Quando uma avaliação for salva e vinculada a um paciente, ela aparecerá aqui.
            </p>
          </div>
        ) : filteredSavedRecords.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-6 text-center">
            <p className="text-sm font-medium text-slate-700">Nenhuma avaliação corresponde à busca.</p>
            <button type="button" onClick={() => setSavedSearch('')} className="mt-2 text-xs font-semibold text-blue-700 hover:underline">Limpar pesquisa</button>
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
                  {filteredSavedRecords.map((rec) => {
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
                              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums w-9 text-right">{pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => onOpenSavedAssessment(rec)}
                              className="rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:from-emerald-700 hover:to-teal-700 hover:shadow-md whitespace-nowrap"
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

        {/* Specialties grouped by clinical area */}
        {specialtyGroups.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <p className="text-sm font-medium text-slate-700">Nenhuma especialidade encontrada para &ldquo;{searchQuery}&rdquo;.</p>
            <button type="button" onClick={() => setSearchQuery('')} className="mt-3 text-xs font-semibold text-[#1D4ED8] hover:underline">Limpar pesquisa</button>
          </div>
        ) : (
          <div className="space-y-3">
            {specialtyGroups.map(({ category, specialties }) => {
              const isExpanded = searchQuery.trim().length > 0 || expandedCategories.includes(category);
              return (
                <section key={category} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    aria-expanded={isExpanded}
                    className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-slate-50 sm:px-5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 hover:scale-110 ${CATEGORY_STYLE[category]?.icon || 'bg-slate-100 text-slate-700'}`}><Activity className="h-5 w-5" /></span>
                      <span className="min-w-0">
                        <span className="block font-display text-sm font-bold text-[#0B1F3A] sm:text-base">{category}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">{specialties.length} {specialties.length === 1 ? 'especialidade' : 'especialidades'}</span>
                      </span>
                    </div>
                    <span className="flex shrink-0 items-center gap-2 text-xs font-semibold text-slate-500">
                      {isExpanded ? 'Recolher' : 'Ver áreas'}
                      <span className={`flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 transition-transform ${isExpanded ? 'rotate-180' : ''}`}><ArrowRight className="h-4 w-4 rotate-90" /></span>
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="grid grid-cols-1 gap-3 border-t border-slate-100 bg-slate-50/50 p-3 sm:grid-cols-2 sm:p-4 xl:grid-cols-3">
                      {specialties.map((spec) => {
                        const IconComp = ICON_MAP[spec.iconName] || Activity;
                        const isStarted = activeSpecialtyIds.includes(spec.id);
                        const pct = isStarted ? calculateAssessmentCompletion(assessments[spec.id]) : 0;
                        return (
                          <article key={spec.id} className="group flex min-w-0 flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg focus-within:ring-2 focus-within:ring-blue-200">
                            <div>
                              <div className="flex items-start justify-between gap-3">
                                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm transition-all duration-200 group-hover:scale-110 ${SPECIALTY_ICON_STYLE[spec.iconName] || 'bg-slate-100 text-slate-700'}`}><IconComp className="h-5 w-5" /></span>
                                <span className="font-mono text-xs font-semibold text-slate-400">{spec.code}</span>
                              </div>
                              <h3 className="mt-3 font-display text-sm font-bold text-[#0B1F3A]">{spec.name}</h3>
                              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-600">{spec.description}</p>
                            </div>
                            <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                              {isStarted ? <span className="text-xs font-semibold text-[#1D4ED8]">Em sessão · {pct}%</span> : <span className="text-xs text-slate-400">Ficha clínica</span>}
                              <button type="button" onClick={() => onOpenSpecialty(spec.id, 'identificacao')} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#1D4ED8]">
                                {isStarted ? 'Continuar' : 'Abrir ficha'} <ArrowRight className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
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
