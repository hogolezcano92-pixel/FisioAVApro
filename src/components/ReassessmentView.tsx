import React from 'react';
import { ArrowLeft, FileDown, GitCompare, Plus, Trash2 } from 'lucide-react';
import { SPECIALTIES, SPECIALTIES_BY_ID } from '../data/specialties';
import {
  AssessmentRecord,
  ReassessmentComparisonItem,
  ReassessmentRecord,
  SpecialtyId,
} from '../types/clinical';
import { PROFESSIONAL_INFO } from '../utils/calculations';
import { generateReassessmentPdf } from '../utils/pdfGenerator';

interface ReassessmentViewProps {
  reassessment: ReassessmentRecord;
  sessionAssessments: AssessmentRecord[];
  onChange: (next: ReassessmentRecord) => void;
  onImportFromAssessment: (assessment: AssessmentRecord) => void;
  onBackToDashboard: () => void;
  onRequestClear: () => void;
}

const DOMAINS: ReassessmentComparisonItem['domain'][] = [
  'Dor',
  'Amplitude de Movimento',
  'Força Muscular',
  'Equilíbrio',
  'Funcionalidade',
  'Escala / Teste',
  'Perimetria',
];

export const ReassessmentView: React.FC<ReassessmentViewProps> = ({
  reassessment,
  sessionAssessments,
  onChange,
  onImportFromAssessment,
  onBackToDashboard,
  onRequestClear,
}) => {
  const addComparisonRow = () => {
    onChange({
      ...reassessment,
      comparisons: [
        ...reassessment.comparisons,
        {
          id: `cmp-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          domain: 'Amplitude de Movimento',
          parameter: '',
          initialValue: '',
          currentValue: '',
          deltaNotes: '',
        },
      ],
    });
  };

  const removeComparisonRow = (id: string) => {
    onChange({
      ...reassessment,
      comparisons: reassessment.comparisons.filter((c) => c.id !== id),
    });
  };

  const evaDelta = (() => {
    const ini = parseFloat(reassessment.painInitialEva);
    const cur = parseFloat(reassessment.painCurrentEva);
    if (Number.isNaN(ini) || Number.isNaN(cur)) return null;
    const diff = cur - ini;
    return diff > 0 ? `+${diff}` : `${diff}`;
  })();

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-8 space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar ao Painel Inicial</span>
          </button>
          <div className="flex items-center gap-2.5">
            <GitCompare className="h-5 w-5 text-[#1D4ED8]" />
            <h1 className="font-display text-xl font-bold text-[#0B1F3A] sm:text-2xl">
              Reavaliação Fisioterapêutica e Relatório Comparativo
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Compare resultados iniciais e atuais fornecidos, avalie metas alcançadas e elabore o novo plano terapêutico.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => generateReassessmentPdf(reassessment, false)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 whitespace-nowrap"
          >
            <FileDown className="h-4 w-4" />
            <span>PDF Reavaliação</span>
          </button>
          <button
            type="button"
            onClick={() => generateReassessmentPdf(reassessment, true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#1E40AF] whitespace-nowrap"
          >
            <FileDown className="h-4 w-4" />
            <span>GERAR RELATÓRIO COMPARATIVO (PDF)</span>
          </button>
          <button
            type="button"
            onClick={onRequestClear}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-medium text-slate-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Limpar</span>
          </button>
        </div>
      </div>

      {/* Import from session assessment */}
      {sessionAssessments.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs text-slate-700">
            <span className="font-bold text-[#0B1F3A]">Vincular avaliação da sessão atual: </span>
            Importe dados de identificação, dor, goniometria, força e escalas preenchidas como linha de base comparativa.
          </div>
          <select
            value={reassessment.linkedAssessmentId ?? ''}
            onChange={(e) => {
              const found = sessionAssessments.find((a) => a.id === e.target.value);
              if (found) onImportFromAssessment(found);
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium"
          >
            <option value="">Selecionar avaliação da sessão...</option>
            {sessionAssessments.map((a) => (
              <option key={a.id} value={a.id}>
                {SPECIALTIES_BY_ID[a.specialtyId].name} — {a.identification.fullName || 'Paciente sem nome'}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Identification & Dates */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="font-display text-base font-bold text-[#0B1F3A]">1. Identificação e Datas Comparativas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Paciente</label>
            <input
              type="text"
              value={reassessment.patientName}
              onChange={(e) => onChange({ ...reassessment, patientName: e.target.value })}
              placeholder="Nome completo do paciente"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Especialidade</label>
            <select
              value={reassessment.specialtyId}
              onChange={(e) =>
                onChange({ ...reassessment, specialtyId: e.target.value as SpecialtyId })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {SPECIALTIES.map((s) => (
                <option key={s.id} value={s.id}>{s.code}. {s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Data da Avaliação Inicial</label>
            <input
              type="date"
              value={reassessment.initialDate}
              onChange={(e) => onChange({ ...reassessment, initialDate: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Data da Reavaliação</label>
            <input
              type="date"
              value={reassessment.evaluationDate}
              onChange={(e) => onChange({ ...reassessment, evaluationDate: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>
      </section>

      {/* Domain Comparison Notes */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-base font-bold text-[#0B1F3A]">2. Comparação Clínica por Domínio</h2>
          {evaDelta !== null && (
            <span className="font-mono text-xs font-bold text-[#1D4ED8] tabular-nums">
              Variação EVA: {evaDelta} pontos
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Dor Inicial (EVA 0–10)</label>
              <input
                type="number"
                min={0}
                max={10}
                value={reassessment.painInitialEva}
                onChange={(e) => onChange({ ...reassessment, painInitialEva: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Dor Atual (EVA 0–10)</label>
              <input
                type="number"
                min={0}
                max={10}
                value={reassessment.painCurrentEva}
                onChange={(e) => onChange({ ...reassessment, painCurrentEva: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Síntese da Evolução Clínica Geral</label>
            <textarea
              rows={2}
              value={reassessment.clinicalEvolutionSummary}
              onChange={(e) => onChange({ ...reassessment, clinicalEvolutionSummary: e.target.value })}
              placeholder="Adesão, resposta às condutas, mudanças de quadro..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Comparação de Amplitude Articular (ADM)</label>
            <textarea
              rows={2}
              value={reassessment.romComparisonNotes}
              onChange={(e) => onChange({ ...reassessment, romComparisonNotes: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Comparação de Força Muscular</label>
            <textarea
              rows={2}
              value={reassessment.strengthComparisonNotes}
              onChange={(e) => onChange({ ...reassessment, strengthComparisonNotes: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Comparação de Equilíbrio</label>
            <textarea
              rows={2}
              value={reassessment.balanceComparisonNotes}
              onChange={(e) => onChange({ ...reassessment, balanceComparisonNotes: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Comparação de Funcionalidade</label>
            <textarea
              rows={2}
              value={reassessment.functionalityComparisonNotes}
              onChange={(e) => onChange({ ...reassessment, functionalityComparisonNotes: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </section>

      {/* Comparative Parameters Table */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-base font-bold text-[#0B1F3A]">3. Quadro Comparativo de Testes, Escalas e Medidas</h2>
            <p className="text-xs text-slate-500">Registre exatamente os valores da avaliação inicial e da reavaliação atual.</p>
          </div>
          <button
            type="button"
            onClick={addComparisonRow}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B1F3A] px-3 py-2 text-xs font-semibold text-white hover:bg-[#132d52]"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Adicionar parâmetro</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
              <tr>
                <th className="px-3 py-2.5">Domínio</th>
                <th className="px-3 py-2.5">Parâmetro / Teste / Escala</th>
                <th className="px-3 py-2.5">Inicial</th>
                <th className="px-3 py-2.5">Reavaliação</th>
                <th className="px-3 py-2.5">Diferença / Evolução</th>
                <th className="px-2 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {reassessment.comparisons.map((row, idx) => (
                <tr key={row.id}>
                  <td className="px-2 py-1.5">
                    <select
                      value={row.domain}
                      onChange={(e) => {
                        const next = [...reassessment.comparisons];
                        next[idx] = { ...row, domain: e.target.value as ReassessmentComparisonItem['domain'] };
                        onChange({ ...reassessment, comparisons: next });
                      }}
                      className="rounded border border-slate-300 px-2 py-1.5 text-xs"
                    >
                      {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={row.parameter}
                      onChange={(e) => {
                        const next = [...reassessment.comparisons];
                        next[idx] = { ...row, parameter: e.target.value };
                        onChange({ ...reassessment, comparisons: next });
                      }}
                      placeholder="Ex.: Flexão ombro D / TUG / Berg"
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={row.initialValue}
                      onChange={(e) => {
                        const next = [...reassessment.comparisons];
                        next[idx] = { ...row, initialValue: e.target.value };
                        onChange({ ...reassessment, comparisons: next });
                      }}
                      placeholder="Valor inicial"
                      className="w-28 rounded border border-slate-300 px-2.5 py-1.5 font-mono text-xs"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={row.currentValue}
                      onChange={(e) => {
                        const next = [...reassessment.comparisons];
                        next[idx] = { ...row, currentValue: e.target.value };
                        onChange({ ...reassessment, comparisons: next });
                      }}
                      placeholder="Valor atual"
                      className="w-28 rounded border border-slate-300 px-2.5 py-1.5 font-mono text-xs"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={row.deltaNotes}
                      onChange={(e) => {
                        const next = [...reassessment.comparisons];
                        next[idx] = { ...row, deltaNotes: e.target.value };
                        onChange({ ...reassessment, comparisons: next });
                      }}
                      placeholder="Ex.: +30° de ganho"
                      className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <button
                      type="button"
                      onClick={() => removeComparisonRow(row.id)}
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Remover linha"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Goals & New Plan */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="font-display text-base font-bold text-[#0B1F3A]">4. Objetivos Alcançados, Pendentes e Novo Plano</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Objetivos Alcançados</label>
            <textarea
              rows={3}
              value={reassessment.achievedGoals}
              onChange={(e) => onChange({ ...reassessment, achievedGoals: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Objetivos Pendentes</label>
            <textarea
              rows={3}
              value={reassessment.pendingGoals}
              onChange={(e) => onChange({ ...reassessment, pendingGoals: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Diagnóstico Cinético-Funcional Atualizado</label>
            <textarea
              rows={3}
              value={reassessment.newKineticDiagnosis}
              onChange={(e) => onChange({ ...reassessment, newKineticDiagnosis: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Novo Plano Terapêutico (Progressão / Alta)</label>
            <textarea
              rows={3}
              value={reassessment.newTreatmentPlan}
              onChange={(e) => onChange({ ...reassessment, newTreatmentPlan: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Observações e Assinatura</label>
          <textarea
            rows={2}
            value={reassessment.observations}
            onChange={(e) => onChange({ ...reassessment, observations: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <p className="mt-2 text-[11px] text-slate-500">
            Responsável Técnico: {PROFESSIONAL_INFO.therapistName} · {PROFESSIONAL_INFO.crefito}
          </p>
        </div>
      </section>
    </div>
  );
};
