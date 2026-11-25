import React from 'react';
import {
  ArrowLeft,
  Database,
  Download,
  LogOut,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  buildClinicalBackupPayload,
  ClinicalStoreSnapshot,
} from '../services/clinicalRepository';
import { AuthSessionUser } from '../types/clinical';
import { PROFESSIONAL_INFO } from '../utils/calculations';

interface SettingsViewProps {
  user: AuthSessionUser;
  snapshot: ClinicalStoreSnapshot;
  onSignOut: () => void;
  onBackToDashboard: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  snapshot,
  onSignOut,
  onBackToDashboard,
}) => {
  const handleExportBackup = () => {
    const json = buildClinicalBackupPayload(user, snapshot);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FisioAssessmentPro_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-[1000px] space-y-6 px-4 py-6 sm:px-8">
      <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1D4ED8] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Voltar ao Painel Inicial</span>
          </button>
          <h1 className="font-display text-xl font-bold text-[#0B1F3A] sm:text-2xl">
            Configurações, Segurança e LGPD
          </h1>
          <p className="text-xs text-slate-500">
            Identificação profissional, status de persistência segura, exportação de backup e controle de sessão.
          </p>
        </div>

        <button
          type="button"
          onClick={onSignOut}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 hover:bg-red-50 hover:text-red-700 hover:border-red-200 whitespace-nowrap"
        >
          <LogOut className="h-4 w-4" />
          <span>Encerrar Sessão</span>
        </button>
      </div>

      {/* Professional Account */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <UserCheck className="h-5 w-5 text-[#1D4ED8]" />
          <h2 className="font-display text-base font-bold text-[#0B1F3A]">
            Responsável Técnico Autenticado
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
            <div className="text-slate-500">Nome Profissional</div>
            <div className="mt-1 font-semibold text-slate-900">{user.fullName}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
            <div className="text-slate-500">Registro CREFITO</div>
            <div className="mt-1 font-mono font-semibold text-[#0B1F3A]">{user.crefito}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
            <div className="text-slate-500">E-mail de Acesso</div>
            <div className="mt-1 font-mono text-slate-800">{user.email}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
            <div className="text-slate-500">Site / Contato Institucional</div>
            <div className="mt-1 text-slate-800">
              {PROFESSIONAL_INFO.website} · {PROFESSIONAL_INFO.instagram}
            </div>
          </div>
        </div>
      </section>

      {/* Supabase Persistence Status */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center gap-2.5">
          <Database className="h-5 w-5 text-[#1D4ED8]" />
          <h2 className="font-display text-base font-bold text-[#0B1F3A]">
            Banco de Dados Clínico e Armazenamento de PDFs
          </h2>
        </div>

        <div
          className={`rounded-xl border p-4 text-xs leading-relaxed ${
            isSupabaseConfigured
              ? 'border-blue-200 bg-blue-50/50 text-slate-800'
              : 'border-amber-200 bg-amber-50/70 text-amber-950'
          }`}
        >
          <div className="font-bold text-sm mb-1">
            {isSupabaseConfigured
              ? 'Conectado ao Supabase (PostgreSQL + RLS + Storage Privado)'
              : 'Modo de Sessão Ativa (Supabase pendente de configuração no ambiente)'}
          </div>
          {isSupabaseConfigured ? (
            <p>
              Todos os pacientes, avaliações, evoluções, reavaliações, planos terapêuticos, atendimentos e documentos em PDF estão vinculados ao seu usuário autenticado com Row-Level Security (RLS) e URLs assinadas temporárias.
            </p>
          ) : (
            <p>
              Para ativar a persistência permanente em banco de dados e Storage privado de PDFs, configure as variáveis de ambiente <code className="font-mono">VITE_SUPABASE_URL</code> e <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> nos segredos do projeto e execute a migração SQL <code className="font-mono">supabase/migrations/001_clinical_schema.sql</code> no Supabase. Nenhum dado clínico é gravado em <code className="font-mono">localStorage</code>.
            </p>
          )}
        </div>
      </section>

      {/* LGPD & Backup Export */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-[#1D4ED8]" />
            <div>
              <h2 className="font-display text-base font-bold text-[#0B1F3A]">
                Política de Segurança, LGPD e Exportação de Backup
              </h2>
              <p className="text-xs text-slate-500">
                Exporte uma cópia estruturada em JSON dos prontuários e metadados vinculados à sua conta.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportBackup}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0B1F3A] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#1D4ED8] whitespace-nowrap"
          >
            <Download className="h-4 w-4" />
            <span>Exportar Backup Clínico (JSON)</span>
          </button>
        </div>

        <ul className="space-y-2 text-xs text-slate-600 list-disc pl-5">
          <li>Relacionamento estrito por UUID do paciente (<code className="font-mono">patient_id</code>), nunca por nome.</li>
          <li>Exclusões de pacientes, fichas ou documentos exigem confirmação explícita para prevenir perda acidental.</li>
          <li>Arquivos PDF são mantidos em bucket privado (<code className="font-mono">clinical-documents</code>) sem conversão em Base64 no banco de dados.</li>
          <li>Registros possuem carimbos temporais auditáveis (<code className="font-mono">created_at</code> e <code className="font-mono">updated_at</code>) e identificação do profissional responsável.</li>
        </ul>
      </section>
    </div>
  );
};
