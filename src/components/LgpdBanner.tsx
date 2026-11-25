import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

export const LgpdBanner: React.FC = () => {
  return (
    <section
      aria-label="Aviso de Privacidade e LGPD"
      className="rounded-xl border border-slate-200 bg-white px-5 py-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0B1F3A]/5 text-[#0B1F3A]">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="space-y-1 text-xs leading-relaxed text-slate-600">
          <div className="font-display text-sm font-semibold text-[#0B1F3A]">
            {isSupabaseConfigured
              ? 'Privacidade Clínica, Segurança RLS e Conformidade LGPD'
              : 'Privacidade Clínica e Conformidade LGPD (Sessão em Memória — Supabase Pendente)'}
          </div>
          <p>
            {isSupabaseConfigured
              ? 'Os prontuários digitais, avaliações e documentos PDF estão protegidos por autenticação profissional, controle de acesso por conta (Row-Level Security), vínculo por UUID do paciente e URLs assinadas temporárias, em conformidade com a Lei nº 13.709/2018 (LGPD) e resoluções do COFFITO/CREFITO.'
              : 'Nenhum dado clínico é gravado em localStorage ou IndexedDB. Enquanto as credenciais VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não estiverem configuradas neste ambiente, os prontuários e PDFs gerados permanecem exclusivamente na memória da sessão ativa; baixe ou exporte o backup antes de encerrar.'}
          </p>
        </div>
      </div>
    </section>
  );
};
