import React, { useState } from 'react';
import {
  BookOpen,
  ClipboardCheck,
  FilePlus2,
  GitCompare,
  LayoutDashboard,
  Search,
} from 'lucide-react';
import { SPECIALTIES } from '../data/specialties';
import { SpecialtyId } from '../types/clinical';
import { PROFESSIONAL_INFO } from '../utils/calculations';
import { Logo } from './Logo';

export type ActiveRoute =
  | { type: 'dashboard' }
  | { type: 'assessment'; specialtyId: SpecialtyId }
  | { type: 'reassessment' }
  | { type: 'evolution' }
  | { type: 'library' };

interface SidebarProps {
  route: ActiveRoute;
  onNavigate: (route: ActiveRoute) => void;
  sessionAssessmentsCount: number;
  activeSessionSpecialtyIds: Set<SpecialtyId>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  route,
  onNavigate,
  activeSessionSpecialtyIds,
}) => {
  const [sidebarSearch, setSidebarSearch] = useState('');

  const filteredSpecs = SPECIALTIES.filter((s) =>
    `${s.code} ${s.name} ${s.category}`.toLowerCase().includes(sidebarSearch.toLowerCase())
  );

  return (
    <aside className="hidden lg:flex lg:w-[280px] lg:shrink-0 lg:flex-col bg-[#0B1F3A] text-slate-100 border-r border-slate-800 h-screen sticky top-0">
      <div className="px-5 py-5 border-b border-white/10">
        <button
          type="button"
          onClick={() => onNavigate({ type: 'dashboard' })}
          className="text-left w-full focus-visible:outline-blue-400 rounded-lg"
        >
          <Logo compact darkSurface />
        </button>
        <div className="mt-3 text-[11px] text-slate-300 leading-snug">
          <div className="font-medium text-white truncate">{PROFESSIONAL_INFO.therapistName}</div>
          <div className="font-mono text-slate-300 tabular-nums">{PROFESSIONAL_INFO.crefito}</div>
        </div>
      </div>

      <nav className="px-3 py-3 space-y-1 border-b border-white/10" aria-label="Navegação principal">
        <button
          type="button"
          onClick={() => onNavigate({ type: 'dashboard' })}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            route.type === 'dashboard'
              ? 'bg-[#1D4ED8] text-white'
              : 'text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          <span className="truncate">Painel Inicial</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate({ type: 'reassessment' })}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            route.type === 'reassessment'
              ? 'bg-[#1D4ED8] text-white'
              : 'text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          <GitCompare className="h-4 w-4 shrink-0" />
          <span className="truncate">Reavaliação Comparativa</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate({ type: 'evolution' })}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            route.type === 'evolution'
              ? 'bg-[#1D4ED8] text-white'
              : 'text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          <ClipboardCheck className="h-4 w-4 shrink-0" />
          <span className="truncate">Evolução Diária</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate({ type: 'library' })}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            route.type === 'library'
              ? 'bg-[#1D4ED8] text-white'
              : 'text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
        >
          <BookOpen className="h-4 w-4 shrink-0" />
          <span className="truncate">Escalas e Instrumentos</span>
        </button>
      </nav>

      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
          <span>22 Especialidades</span>
          <FilePlus2 className="h-3.5 w-3.5 text-slate-400" />
        </div>
        <div className="relative">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={sidebarSearch}
            onChange={(e) => setSidebarSearch(e.target.value)}
            placeholder="Filtrar especialidade..."
            className="w-full rounded-lg bg-white/10 border border-white/10 pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-400 focus:bg-white/15 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
        {filteredSpecs.map((spec) => {
          const isActive = route.type === 'assessment' && route.specialtyId === spec.id;
          const hasData = activeSessionSpecialtyIds.has(spec.id);
          return (
            <button
              key={spec.id}
              type="button"
              onClick={() => onNavigate({ type: 'assessment', specialtyId: spec.id })}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                isActive
                  ? 'bg-[#2563EB] text-white font-semibold'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="truncate">
                <span className="font-mono text-[11px] opacity-75 mr-1.5 tabular-nums">{spec.code}.</span>
                {spec.shortName}
              </span>
              {hasData && (
                <span className="text-[10px] font-medium text-blue-200 shrink-0">Em sessão</span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
};
