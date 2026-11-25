import React, { useEffect, useMemo, useState } from 'react';
import { Copy, KeyRound, ShieldCheck, FileText, Activity, Users, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AssessmentRecord, ClinicalDocumentRecord, PatientRecord } from '../types/clinical';
import { formatDatePtBr, DOCUMENT_TYPE_LABELS } from '../utils/calculations';
import { SPECIALTIES_BY_ID } from '../data/specialties';

interface Props {
  patients: PatientRecord[];
  assessments: AssessmentRecord[];
  documents: ClinicalDocumentRecord[];
  onBack: () => void;
}

type Share = { record_type: 'assessment' | 'document'; record_id: string };

function describeSupabaseError(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const e = error as { message?: unknown; code?: unknown; details?: unknown; hint?: unknown };
    const parts = [
      typeof e.message === 'string' ? e.message : '',
      typeof e.code === 'string' ? `Código: ${e.code}` : '',
      typeof e.details === 'string' ? `Detalhes: ${e.details}` : '',
      typeof e.hint === 'string' ? `Orientação: ${e.hint}` : '',
    ].filter(Boolean);
    if (parts.length) return parts.join(' · ');
  }
  return error instanceof Error ? error.message : fallback;
}

export const PatientPortalManagement: React.FC<Props> = ({ patients, assessments, documents, onBack }) => {
  const [patientId, setPatientId] = useState(patients[0]?.id ?? '');
  const [shares, setShares] = useState<Share[]>([]);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const patient = patients.find(p => p.id === patientId);
  const patientAssessments = useMemo(() => assessments.filter(a => a.patientId === patientId), [assessments, patientId]);
  const patientDocuments = useMemo(() => documents.filter(d => d.patientId === patientId), [documents, patientId]);

  const loadSharing = async () => {
    if (!supabase || !patientId) { setShares([]); setHasAccess(false); return; }
    setLoading(true); setError('');
    try {
      const [shareRes, accessRes] = await Promise.all([
        supabase.from('patient_portal_shares').select('record_type,record_id').eq('patient_id', patientId),
        supabase.from('patient_portal_access').select('id,active').eq('patient_id', patientId).eq('active', true).maybeSingle(),
      ]);
      if (shareRes.error) throw shareRes.error;
      if (accessRes.error) throw accessRes.error;
      setShares((shareRes.data ?? []) as Share[]);
      setHasAccess(Boolean(accessRes.data));
    } catch (e) { setError(describeSupabaseError(e, 'Não foi possível carregar o compartilhamento.')); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadSharing(); setInviteCode(''); setMessage(''); }, [patientId]);

  const isShared = (type: Share['record_type'], id: string) => shares.some(s => s.record_type === type && s.record_id === id);

  const toggleShare = async (type: Share['record_type'], id: string, checked: boolean) => {
    if (!supabase || !patientId) return;
    setBusyId(id); setError(''); setMessage('');
    try {
      if (checked) {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData.user) throw new Error('Sessão profissional expirada. Entre novamente.');
        const { error: insertError } = await supabase.from('patient_portal_shares').insert({
          patient_id: patientId, professional_user_id: userData.user.id, record_type: type, record_id: id,
        });
        if (insertError) throw insertError;
      } else {
        const { error: deleteError } = await supabase.from('patient_portal_shares').delete()
          .eq('patient_id', patientId).eq('record_type', type).eq('record_id', id);
        if (deleteError) throw deleteError;
      }
      await loadSharing();
      setMessage(checked ? 'Registro compartilhado com o paciente.' : 'Compartilhamento removido.');
    } catch (e) { setError(describeSupabaseError(e, 'Não foi possível atualizar o compartilhamento.')); }
    finally { setBusyId(''); }
  };

  const generateInvite = async () => {
    if (!supabase || !patientId) return;
    setBusyId('invite'); setError(''); setMessage(''); setInviteCode('');
    try {
      const { data, error: rpcError } = await supabase.rpc('create_patient_portal_invite', { p_patient_id: patientId });
      if (rpcError) throw rpcError;
      setInviteCode(String(data));
      setMessage('Convite criado. Copie o código e envie ao paciente. Ele poderá ativar o acesso sem informar e-mail, usando este código neste aparelho.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Não foi possível gerar o convite.'); }
    finally { setBusyId(''); }
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-6 px-4 py-6 sm:px-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <button onClick={onBack} className="mb-3 text-xs font-semibold text-blue-700 hover:underline">← Voltar ao painel</button>
        <div className="flex items-start gap-3"><div className="rounded-xl bg-blue-50 p-3 text-blue-700"><Users/></div><div><h1 className="text-xl font-bold text-[#0B1F3A] sm:text-2xl">Área do Paciente</h1><p className="mt-1 text-sm text-slate-600">Gerencie convites e escolha exatamente quais avaliações e PDFs cada paciente poderá consultar.</p></div></div>
      </section>
      {patients.length === 0 ? <div className="rounded-xl border bg-white p-6 text-sm text-slate-600">Cadastre um paciente antes de configurar o portal.</div> : <>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
          <label className="block text-sm font-semibold text-slate-700">Selecionar paciente<select value={patientId} onChange={e=>setPatientId(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm">{patients.map(p=><option key={p.id} value={p.id}>{p.fullName} — {p.email || 'sem e-mail cadastrado'}</option>)}</select></label>
          {patient && <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4"><div><p className="font-semibold text-[#0B1F3A]">{patient.fullName}</p><p className="text-xs text-slate-500">{patient.email || 'Este paciente poderá acessar sem e-mail.'}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${hasAccess?'bg-emerald-100 text-emerald-800':'bg-slate-200 text-slate-700'}`}>{hasAccess?'Acesso ativo':'Sem acesso ativo'}</span></div>}
          <div className="flex flex-wrap items-center gap-3"><button onClick={()=>void generateInvite()} disabled={busyId==='invite'||hasAccess} className="inline-flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><KeyRound size={16}/>{busyId==='invite'?'Gerando...':hasAccess?'Paciente já vinculado':'Gerar convite de acesso'}</button><button onClick={()=>void loadSharing()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"><RefreshCw size={15}/> Atualizar</button></div>
          {inviteCode && <div className="rounded-xl border border-blue-200 bg-blue-50 p-4"><p className="text-xs font-semibold text-blue-900">Código individual — válido por 7 dias e para um único uso</p><div className="mt-2 flex flex-wrap items-center gap-2"><code className="min-w-0 flex-1 break-all rounded-lg bg-white p-3 font-mono text-sm text-slate-900">{inviteCode}</code><button onClick={()=>void navigator.clipboard.writeText(inviteCode)} className="inline-flex items-center gap-2 rounded-lg bg-[#0B1F3A] px-3 py-3 text-xs font-semibold text-white"><Copy size={14}/> Copiar</button></div><p className="mt-2 text-xs text-blue-900">Envie o código diretamente ao paciente. Ele acessará o portal sem e-mail, pelo código individual, neste aparelho.</p></div>}
          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {message && <p role="status" className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2"><Activity className="text-blue-700"/><div><h2 className="font-bold text-[#0B1F3A]">Avaliações compartilhadas</h2><p className="text-xs text-slate-500">O paciente verá apenas os registros marcados abaixo.</p></div></div>
          {patientAssessments.length===0?<p className="text-sm text-slate-500">Nenhuma avaliação cadastrada para este paciente.</p>:<div className="divide-y divide-slate-100">{patientAssessments.map(a=><label key={a.id} className="flex cursor-pointer items-center justify-between gap-3 py-3"><span className="min-w-0"><span className="block text-sm font-semibold">{SPECIALTIES_BY_ID[a.specialtyId]?.name||a.specialtyId}</span><span className="text-xs text-slate-500">{formatDatePtBr(a.identification.evaluationDate)}</span></span><input type="checkbox" checked={isShared('assessment',a.id)} disabled={busyId===a.id} onChange={e=>void toggleShare('assessment',a.id,e.target.checked)} className="h-5 w-5 accent-blue-700"/><span className="sr-only">Compartilhar avaliação</span></label>)}</div>}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex items-center gap-2"><FileText className="text-blue-700"/><div><h2 className="font-bold text-[#0B1F3A]">Documentos PDF</h2><p className="text-xs text-slate-500">A liberação de um PDF não libera os demais documentos do prontuário.</p></div></div>
          {patientDocuments.length===0?<p className="text-sm text-slate-500">Nenhum PDF arquivado para este paciente.</p>:<div className="divide-y divide-slate-100">{patientDocuments.map(d=><label key={d.id} className="flex cursor-pointer items-center justify-between gap-3 py-3"><span className="min-w-0"><span className="block text-sm font-semibold">{d.title}</span><span className="text-xs text-slate-500">{DOCUMENT_TYPE_LABELS[d.documentType]} · {formatDatePtBr(d.documentDate)} · v{d.version}</span></span><input type="checkbox" checked={isShared('document',d.id)} disabled={busyId===d.id} onChange={e=>void toggleShare('document',d.id,e.target.checked)} className="h-5 w-5 accent-blue-700"/><span className="sr-only">Compartilhar documento</span></label>)}</div>}
        </section>
        <p className="flex items-start gap-2 text-xs leading-relaxed text-slate-500"><ShieldCheck size={16} className="shrink-0 text-emerald-600"/> Compartilhamento desativado por padrão. O paciente não tem permissão para editar registros clínicos. A remoção da seleção revoga imediatamente a visualização daquele registro.</p>
      </>}
    </div>
  );
};
