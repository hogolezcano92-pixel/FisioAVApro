import React, { useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Search } from 'lucide-react';
import { CLINICAL_INSTRUMENTS } from '../data/scalesAndTests';
import { SPECIALTIES } from '../data/specialties';
import { SpecialtyId } from '../types/clinical';

interface InstrumentsLibraryViewProps {
  onBackToDashboard: () => void;
  onOpenSpecialty: (specialtyId: SpecialtyId) => void;
}

export const InstrumentsLibraryView: React.FC<InstrumentsLibraryViewProps> = ({
  onBackToDashboard,
  onOpenSpecialty,
}) => {
  const [query, setQuery] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('todas');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CLINICAL_INSTRUMENTS.filter((item) => {
      const matchSpec =
        specialtyFilter === 'todas' ||
        item.applicableSpecialtyIds.includes(specialtyFilter as SpecialtyId);
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.specialtyArea.toLowerCase().includes(q) ||
        item.objective.toLowerCase().includes(q);
      return matchSpec && matchSearch;
    });
  }, [query, specialtyFilter]);

  return (
    <div className="mx-auto max-w-[1200px] px-4 py-6 sm:px-8 space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
              <BookOpen className="h-5 w-5 text-[#1D4ED8]" />
              <h1 className="font-display text-xl font-bold text-[#0B1F3A] sm:text-2xl">
                Biblioteca de Instrumentos, Escalas e Testes
              </h1>
            </div>
            <p className="text-xs text-slate-500">
              Consulta padronizada de objetivos, instruções de aplicação, pontuação, interpretação validada e referências técnicas.
            </p>
          </div>
          <span className="font-mono text-xs font-semibold text-slate-500 tabular-nums shrink-0">
            {filtered.length} instrumento(s)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar escala, teste ou objetivo..."
              className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm"
            />
          </div>
          <select
            value={specialtyFilter}
            onChange={(e) => setSpecialtyFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            <option value="todas">Todas as especialidades</option>
            {SPECIALTIES.map((s) => (
              <option key={s.id} value={s.id}>{s.code}. {s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((item) => (
          <article
            key={item.id}
            className="rounded-xl border border-slate-200 bg-white p-5 space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="font-display text-base font-bold text-[#0B1F3A]">{item.name}</h2>
                <div className="text-xs font-medium text-[#1D4ED8] mt-0.5">{item.specialtyArea}</div>
              </div>
              {item.applicableSpecialtyIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => onOpenSpecialty(item.applicableSpecialtyIds[0])}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 self-start"
                >
                  Abrir ficha relacionada
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-slate-700">
              <div className="space-y-2">
                <div>
                  <span className="font-bold text-[#0B1F3A]">Objetivo: </span>
                  {item.objective}
                </div>
                <div>
                  <span className="font-bold text-[#0B1F3A]">Instruções padronizadas: </span>
                  {item.instructions}
                </div>
              </div>
              <div className="space-y-2">
                <div>
                  <span className="font-bold text-[#0B1F3A]">Pontuação: </span>
                  {item.scoringGuide}
                </div>
                <div>
                  <span className="font-bold text-[#0B1F3A]">Interpretação (quando validada): </span>
                  {item.interpretation}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] text-slate-500">
              <span><strong className="text-slate-700">Referência técnica:</strong> {item.reference}</span>
              {item.licensingNote && (
                <span className="text-amber-800 font-medium">{item.licensingNote}</span>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
