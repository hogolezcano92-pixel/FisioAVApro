import React, { useState } from 'react';
import {
  BookOpen,
  ClipboardCheck,
  GitCompare,
  LayoutDashboard,
  Menu,
  X,
} from 'lucide-react';
import { SPECIALTIES } from '../data/specialties';
import { SpecialtyId } from '../types/clinical';
import { PROFESSIONAL_INFO } from '../utils/calculations';
import { Logo } from './Logo';
import { ActiveRoute } from './Sidebar';

interface MobileNavProps {
  route: ActiveRoute;
  onNavigate: (route: ActiveRoute) => void;
  activeSessionSpecialtyIds: Set<SpecialtyId>;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  route,
  onNavigate,
  activeSessionSpecialtyIds,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const navigateAndClose = (target: ActiveRoute) => {
    onNavigate(target);
    setDrawerOpen(false);
  };

  return (
    <>
      <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between bg-[#0B1F3A] text-white px-4 py-3 border-b border-white/10">
        <button
          type="button"
          onClick={() => navigateAndClose({ type: 'dashboard' })}
          className="text-left focus-visible:outline-blue-400 rounded-md"
        >
          <Logo compact darkSurface />
        </button>

        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-white hover:bg-white/20 min-h-[40px]"
          aria-label="Abrir menu de navegação"
        >
          <Menu className="h-4 w-4" />
          <span>Menu</span>
        </button>
      </header>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 flex w-[85vw] max-w-xs flex-col bg-[#0B1F3A] text-white h-full shadow-2xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
              <div>
                <div className="font-display text-sm font-bold">{PROFESSIONAL_INFO.appName}</div>
                <div className="text-[11px] text-slate-300">{PROFESSIONAL_INFO.crefito}</div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 space-y-1 border-b border-white/10">
              <button
                type="button"
                onClick={() => navigateAndClose({ type: 'dashboard' })}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium ${
                  route.type === 'dashboard' ? 'bg-[#1D4ED8] text-white' : 'text-slate-200 hover:bg-white/10'
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                Painel Inicial
              </button>
              <button
                type="button"
                onClick={() => navigateAndClose({ type: 'reassessment' })}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium ${
                  route.type === 'reassessment' ? 'bg-[#1D4ED8] text-white' : 'text-slate-200 hover:bg-white/10'
                }`}
              >
                <GitCompare className="h-4 w-4" />
                Reavaliação Comparativa
              </button>
              <button
                type="button"
                onClick={() => navigateAndClose({ type: 'evolution' })}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium ${
                  route.type === 'evolution' ? 'bg-[#1D4ED8] text-white' : 'text-slate-200 hover:bg-white/10'
                }`}
              >
                <ClipboardCheck className="h-4 w-4" />
                Evolução Diária
              </button>
              <button
                type="button"
                onClick={() => navigateAndClose({ type: 'library' })}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium ${
                  route.type === 'library' ? 'bg-[#1D4ED8] text-white' : 'text-slate-200 hover:bg-white/10'
                }`}
              >
                <BookOpen className="h-4 w-4" />
                Escalas e Instrumentos
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              <div className="px-2 pb-1 text-xs font-semibold text-slate-400">
                Especialidades Clínicas (22)
              </div>
              {SPECIALTIES.map((spec) => {
                const isActive = route.type === 'assessment' && route.specialtyId === spec.id;
                const hasData = activeSessionSpecialtyIds.has(spec.id);
                return (
                  <button
                    key={spec.id}
                    type="button"
                    onClick={() => navigateAndClose({ type: 'assessment', specialtyId: spec.id })}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left text-xs ${
                      isActive ? 'bg-[#2563EB] text-white font-semibold' : 'text-slate-200 hover:bg-white/10'
                    }`}
                  >
                    <span className="truncate">
                      <span className="font-mono opacity-75 mr-1.5">{spec.code}.</span>
                      {spec.name}
                    </span>
                    {hasData && <span className="text-[10px] text-blue-200 ml-2 shrink-0">Em sessão</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
