import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ClipboardCheck,
  FileDown,
  FolderOpen,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { SPECIALTIES, SPECIALTIES_BY_ID } from '../data/specialties';
import { DailyEvolutionRecord, PatientRecord, SpecialtyId } from '../types/clinical';
import { formatDatePtBr, PROFESSIONAL_INFO } from '../utils/calculations';
import { generateEvolutionPdf } from '../utils/pdfGenerator';

interface EvolutionViewProps {
  evolution: DailyEvolutionRecord;
  patients: PatientRecord[];
  savedEvolutions: DailyEvolutionRecord[];
  onChange: (next: DailyEvolutionRecord) => void;
  onSaveToRecord: (evolution: DailyEvolutionRecord) => Promise<void>;
  onArchivePdf: (evolution: DailyEvolutionRecord, blob: Blob, filename: string) => Promise<void>;
  onNewEvolutionDraft: (patient?: PatientRecord) => void;
  onOpenPatientRecord: (patientId: string) => void;
  onBackToDashboard: () => void;
  onRequestClear: () => void;
}

export const EvolutionView: React.FC<EvolutionViewProps> = ({
  evolution,
  patients,
  savedEvolutions,
  onChange,
  onSaveToRecord,
  onArchivePdf,
  onNewEvolutionDraft,
  onOpenPatientRecord,
  onBackToDashboard,
  onRequestClear,
}) => {
  const [saving, setSaving] = useState(false);

  const patientHistory = useMemo(() => {
    if (!evolution.patientId) return savedEvolutions.slice(0, 8);
    return savedEvolutions
      .filter((e) => e.patientId === evolution.patientId)
      .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`));
  }, [savedEvolutions, evolution.patientId]);

  const handleSelectPatient = (patientId: string) => {
    const found = patients.find((p) => p.id === patientId);
    if (!found) {
      onChange({ ...evolution, patientId: undefined });
      return;
    }
    onChange({
      ...evolution,
      patientId: found.id,
      patientName: found.fullName,
    });
  };

  const handleSave = async () => {
    if (!evolution.patientId) return;
    setSaving(true);
    try {
      await onSaveToRecord(evolution);
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePdfAndArchive = async () => {
    const res = generateEvolutionPdf(evolution);
    if (evolution.patientId) {
      setSaving(true);
      try {
        await onSaveToRecord(evolution);
        await onArchivePdf(evolution, res.blob, res.filename);
      } finally {
        setSaving(false);
      }
    }
  };

  const addExerciseRow = () => {
    onChange({
      ...evolution,
      exercises: [
        ...evolution.exercises,
        {
          id: `ex-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          exercise: '',
          sets: '',
          reps: '',
          timeOrLoad: '',
          intensity: '',
        },
      ],
    });
  };

  const removeExerciseRow = (id: string) => {
    onChange({
      ...evolution,
      exercises: evolution.exercises.filter((e) => e.id !== id),
    });
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-8 space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
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
              {evolution.patientId && (
                <button
                  type="button"
                  onClick={() => onOpenPatientRecord(evolution.patientId!)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B1F3A] hover:underline"
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  <span>Abrir Prontuário</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              <ClipboardCheck className="h-5 w-5 text-[#1D4ED8]" />
              <h1 className="font-display text-xl font-bold text-[#0B1F3A] sm:text-2xl">
                Evolução Fisioterapêutica por Sessão
              </h1>
            </div>
            <p className="text-xs text-slate-500">
              Registro clínico cronológico preservando todas as evoluções anteriores no prontuário do paciente.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                const p = patients.find((pt) => pt.id === evolution.patientId);
                onNewEvolutionDraft(p);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Nova Sessão</span>
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!evolution.patientId || saving}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#1D4ED8] bg-blue-50 px-3.5 py-2.5 text-xs font-semibold text-[#1D4ED8] hover:bg-blue-100 disabled:opacity-40 whitespace-nowrap"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{saving ? 'Salvando...' : 'Salvar Evolução'}</span>
            </button>
            <button
              type="button"
              onClick={handleGeneratePdfAndArchive}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D4ED8] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#1E40AF] whitespace-nowrap"
            >
              <FileDown className="h-4 w-4" />
              <span>GERAR PDF DE EVOLUÇÃO</span>
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

        {/* Patient Link Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3">
          <div className="text-xs text-slate-700">
            <span className="font-semibold text-[#0B1F3A]">Paciente Vinculado (UUID): </span>
            {evolution.patientId
              ? 'Cada evolução salva cria um registro histórico cronológico independente.'
              : 'Selecione um paciente cadastrado para gravar no prontuário.'}
          </div>
          <select
            value={evolution.patientId ?? ''}
            onChange={(e) => handleSelectPatient(e.target.value)}
            aria-label="Selecionar paciente para evolução"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 sm:min-w-[260px]"
          >
            <option value="">Selecionar paciente cadastrado...</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Session Context */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="font-display text-base font-bold text-[#0B1F3A]">1. Identificação e Condição Inicial da Sessão</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nome do Paciente</label>
            <input
              type="text"
              value={evolution.patientName}
              onChange={(e) => onChange({ ...evolution, patientName: e.target.value })}
              placeholder="Nome completo"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Especialidade</label>
            <select
              value={evolution.specialtyId}
              onChange={(e) => onChange({ ...evolution, specialtyId: e.target.value as SpecialtyId })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {SPECIALTIES.map((s) => (
                <option key={s.id} value={s.id}>{s.code}. {s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Data</label>
            <input
              type="date"
              value={evolution.date}
              onChange={(e) => onChange({ ...evolution, date: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Horário</label>
            <input
              type="time"
              value={evolution.time}
              onChange={(e) => onChange({ ...evolution, time: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Queixa Relatada na Sessão</label>
            <textarea
              rows={2}
              value={evolution.reportedComplaint}
              onChange={(e) => onChange({ ...evolution, reportedComplaint: e.target.value })}
              placeholder="Relato subjetivo antes do atendimento..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Condição Clínica Inicial</label>
            <textarea
              rows={2}
              value={evolution.initialClinicalCondition}
              onChange={(e) => onChange({ ...evolution, initialClinicalCondition: e.target.value })}
              placeholder="Estado geral, edema, dor EVA inicial, humor, colaboração..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Sinais Vitais Iniciais (quando pertinentes)</label>
            <input
              type="text"
              value={evolution.vitalSignsBefore}
              onChange={(e) => onChange({ ...evolution, vitalSignsBefore: e.target.value })}
              placeholder="FC, PA, FR, SpO2, Borg..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Sinais Vitais Finais (quando pertinentes)</label>
            <input
              type="text"
              value={evolution.vitalSignsAfter}
              onChange={(e) => onChange({ ...evolution, vitalSignsAfter: e.target.value })}
              placeholder="FC, PA, FR, SpO2, Borg..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>
      </section>

      {/* Procedures & Exercises */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="font-display text-base font-bold text-[#0B1F3A]">2. Condutas, Recursos e Exercícios Executados</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Condutas Realizadas</label>
            <textarea
              rows={3}
              value={evolution.proceduresPerformed}
              onChange={(e) => onChange({ ...evolution, proceduresPerformed: e.target.value })}
              placeholder="Descreva técnicas manuais, mobilizações, treino respiratório, treino de marcha..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Recursos Terapêuticos Utilizados</label>
            <textarea
              rows={3}
              value={evolution.resourcesUsed}
              onChange={(e) => onChange({ ...evolution, resourcesUsed: e.target.value })}
              placeholder="Halteres, faixas elásticas, TENS, ultrassom, laser, cicloergômetro, VNI..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-[#0B1F3A]">Tabela de Exercícios</h3>
            <button
              type="button"
              onClick={addExerciseRow}
              className="inline-flex items-center gap-1 rounded-lg bg-[#0B1F3A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#132d52]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Adicionar exercício</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                <tr>
                  <th className="px-3 py-2.5">Exercício</th>
                  <th className="px-3 py-2.5">Séries</th>
                  <th className="px-3 py-2.5">Repetições</th>
                  <th className="px-3 py-2.5">Tempo / Carga</th>
                  <th className="px-3 py-2.5">Intensidade (Borg / RPE)</th>
                  <th className="px-2 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {evolution.exercises.map((ex, idx) => (
                  <tr key={ex.id}>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={ex.exercise}
                        onChange={(e) => {
                          const next = [...evolution.exercises];
                          next[idx] = { ...ex, exercise: e.target.value };
                          onChange({ ...evolution, exercises: next });
                        }}
                        placeholder="Ex.: Agachamento isométrico / Elevação de perna reta"
                        className="w-full rounded border border-slate-300 px-2.5 py-1.5 text-xs"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={ex.sets}
                        onChange={(e) => {
                          const next = [...evolution.exercises];
                          next[idx] = { ...ex, sets: e.target.value };
                          onChange({ ...evolution, exercises: next });
                        }}
                        placeholder="3"
                        className="w-16 rounded border border-slate-300 px-2 py-1.5 font-mono text-xs"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={ex.reps}
                        onChange={(e) => {
                          const next = [...evolution.exercises];
                          next[idx] = { ...ex, reps: e.target.value };
                          onChange({ ...evolution, exercises: next });
                        }}
                        placeholder="12"
                        className="w-20 rounded border border-slate-300 px-2 py-1.5 font-mono text-xs"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={ex.timeOrLoad}
                        onChange={(e) => {
                          const next = [...evolution.exercises];
                          next[idx] = { ...ex, timeOrLoad: e.target.value };
                          onChange({ ...evolution, exercises: next });
                        }}
                        placeholder="4 kg / 30 seg"
                        className="w-28 rounded border border-slate-300 px-2 py-1.5 font-mono text-xs"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={ex.intensity}
                        onChange={(e) => {
                          const next = [...evolution.exercises];
                          next[idx] = { ...ex, intensity: e.target.value };
                          onChange({ ...evolution, exercises: next });
                        }}
                        placeholder="Moderada (Borg 4)"
                        className="w-32 rounded border border-slate-300 px-2 py-1.5 text-xs"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      <button
                        type="button"
                        onClick={() => removeExerciseRow(ex.id)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Remover exercício"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Response & Closing */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="font-display text-base font-bold text-[#0B1F3A]">3. Resposta, Intercorrências e Condição ao Término</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Resposta do Paciente</label>
            <textarea
              rows={2}
              value={evolution.patientResponse}
              onChange={(e) => onChange({ ...evolution, patientResponse: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Intercorrências</label>
            <textarea
              rows={2}
              value={evolution.intercurrences}
              onChange={(e) => onChange({ ...evolution, intercurrences: e.target.value })}
              placeholder="Sem intercorrências ou registrar ocorrência..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Condição ao Término</label>
            <textarea
              rows={2}
              value={evolution.endingCondition}
              onChange={(e) => onChange({ ...evolution, endingCondition: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Orientações</label>
            <textarea
              rows={2}
              value={evolution.guidance}
              onChange={(e) => onChange({ ...evolution, guidance: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-500">
          <span>Assinatura Profissional: {PROFESSIONAL_INFO.therapistName} · {PROFESSIONAL_INFO.crefito}</span>
          <span className="font-mono">{PROFESSIONAL_INFO.website}</span>
        </div>
      </section>

      {patientHistory.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
          <h2 className="font-display text-sm font-bold text-[#0B1F3A]">
            Histórico Recente de Evoluções Registradas ({patientHistory.length})
          </h2>
          <div className="space-y-2">
            {patientHistory.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-[#0B1F3A]">
                    <span className="font-mono tabular-nums mr-2">{formatDatePtBr(item.date)} {item.time}</span>
                    {item.patientName} · {SPECIALTIES_BY_ID[item.specialtyId]?.shortName}
                  </div>
                  <div className="text-slate-600 truncate">
                    {item.proceduresPerformed || item.reportedComplaint || 'Sem descrição'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onChange(item)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 shrink-0"
                >
                  Carregar
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
