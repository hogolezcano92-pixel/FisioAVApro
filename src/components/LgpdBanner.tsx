import React from 'react';
import { ShieldCheck } from 'lucide-react';

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
            Privacidade Clínica e Conformidade LGPD (Dados em Memória de Sessão)
          </div>
          <p>
            Esta aplicação opera integralmente em memória local durante a sessão ativa. Nenhuma informação clínica, dado pessoal ou registro fotográfico é transmitido para servidores externos, bancos de dados, APIs ou armazenado em <code className="font-mono text-[11px] text-slate-800">localStorage</code> / <code className="font-mono text-[11px] text-slate-800">IndexedDB</code>. Após gerar e baixar o documento em PDF, o profissional responsável deve arquivá-lo em prontuário seguro conforme a Lei nº 13.709/2018 (LGPD) e resoluções do COFFITO/CREFITO.
          </p>
        </div>
      </div>
    </section>
  );
};
