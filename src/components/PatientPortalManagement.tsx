import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, KeyRound, ShieldCheck, FileText, Activity, Users, RefreshCw, Undo2, Trash2, RotateCcw } from 'lucide-react';
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

type Share = { record_type: 'assessment' | 'document' | 'exercise' | 'evolution' | 'appointment' | 'treatment_plan' | 'reassessment'; record_id: string };
type PortalItem = { id: string; title: string; detail: string; type: Share['record_type']; status?: string };
type PortalMessage = { id: string; sender_role: 'patient' | 'professional'; body: string; created_at: string };
type PortalExerciseLog = { id: string; prescription_id: string; status: 'realizado' | 'nao_realizado'; notes: string; performed_at: string };

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
  const [portalItems, setPortalItems] = useState<Record<string, PortalItem[]>>({ exercise: [], evolution: [], appointment: [], treatment_plan: [], reassessment: [] });
  const [portalMessages, setPortalMessages] = useState<PortalMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [portalExerciseLogs, setPortalExerciseLogs] = useState<PortalExerciseLog[]>([]);
  const [reply, setReply] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
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
      const [shareRes, accessRes, exRes, evRes, apRes, planRes, reassessRes, logRes, msgRes] = await Promise.all([
        supabase.from('patient_portal_shares').select('record_type,record_id').eq('patient_id', patientId),
        supabase.from('patient_portal_access').select('id,active').eq('patient_id', patientId).eq('active', true).maybeSingle(),
        supabase.from('patient_exercise_prescriptions').select('id,exercise_name,category,frequency,status').eq('patient_id', patientId).not('status', 'in', '(removido,excluido)').order('created_at', { ascending: false }),
        supabase.from('evolutions').select('id,specialty_id,session_date,session_time').eq('patient_id', patientId).order('session_date', { ascending: false }),
        supabase.from('appointments').select('id,scheduled_date,scheduled_time,status').eq('patient_id', patientId).order('scheduled_date', { ascending: false }),
        supabase.from('treatment_plans').select('id,title,status,start_date').eq('patient_id', patientId).order('start_date', { ascending: false }),
        supabase.from('reassessments').select('id,specialty_id,evaluation_date').eq('patient_id', patientId).order('evaluation_date', { ascending: false }),
        supabase.from('patient_portal_exercise_logs').select('id,prescription_id,status,notes,performed_at').eq('patient_id', patientId).order('performed_at', { ascending: false }),
        supabase.from('patient_portal_messages').select('id,sender_role,body,created_at').eq('patient_id', patientId).order('created_at', { ascending: true }),
      ]);
      for (const result of [shareRes, accessRes, exRes, evRes, apRes, planRes, reassessRes, logRes, msgRes]) if (result.error) throw result.error;
      setShares((shareRes.data ?? []) as Share[]);
      setHasAccess(Boolean(accessRes.data));
      setPortalItems({
        exercise: (exRes.data ?? []).map((x: any) => ({ id: x.id, title: x.exercise_name, detail: [x.category, x.frequency].filter(Boolean).join(' · '), type: 'exercise' as const, status: x.status })),
        evolution: (evRes.data ?? []).map((x: any) => ({ id: x.id, title: 'Evolução fisioterapêutica', detail: [x.specialty_id, x.session_date, x.session_time].filter(Boolean).join(' · '), type: 'evolution' as const })),
        appointment: (apRes.data ?? []).map((x: any) => ({ id: x.id, title: 'Atendimento', detail: [x.scheduled_date, x.scheduled_time, x.status].filter(Boolean).join(' · '), type: 'appointment' as const })),
        treatment_plan: (planRes.data ?? []).map((x: any) => ({ id: x.id, title: x.title, detail: [x.status, x.start_date].filter(Boolean).join(' · '), type: 'treatment_plan' as const })),
        reassessment: (reassessRes.data ?? []).map((x: any) => ({ id: x.id, title: 'Reavaliação funcional', detail: [x.specialty_id, x.evaluation_date].filter(Boolean).join(' · '), type: 'reassessment' as const })),
      });
      setPortalMessages((msgRes.data ?? []) as PortalMessage[]);
      setPortalExerciseLogs((logRes.data ?? []) as PortalExerciseLog[]);
    } catch (e) { setError(describeSupabaseError(e, 'Não foi possível carregar o compartilhamento.')); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadSharing(); setInviteCode(''); setMessage(''); }, [patientId]);

  useEffect(() => {
    if (!supabase || !patientId || !hasAccess) return;
    const channel = supabase.channel('professional-patient-messages-' + patientId)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'patient_portal_messages',
        filter: 'patient_id=eq.' + patientId,
      }, payload => {
        const incoming = payload.new as PortalMessage;
        if (incoming?.id && incoming.sender_role && incoming.body) {
          setPortalMessages(current => current.some(item => item.id === incoming.id)
            ? current
            : [...current, incoming].sort((a, b) => a.created_at.localeCompare(b.created_at)));
        }
      })
      .subscribe(status => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setError('A conexão em tempo real foi interrompida. Atualize a conversa para conferir novas mensagens.');
        }
      });
    return () => { void supabase.removeChannel(channel); };
  }, [patientId, hasAccess]);

  useEffect(() => {
    if (hasAccess) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [portalMessages, hasAccess]);

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

  const updateExerciseStatus = async (id: string, status: 'ativo' | 'suspenso' | 'removido' | 'excluido') => {
    if (!supabase || !patientId) return;
    if (status === 'excluido' && !window.confirm('Apagar este exercício definitivamente desta lista? O histórico de realização será preservado.')) return;
    setBusyId(id); setError(''); setMessage('');
    try {
      if (status === 'excluido') {
        const { error: shareError } = await supabase.from('patient_portal_shares').delete()
          .eq('patient_id', patientId).eq('record_type', 'exercise').eq('record_id', id);
        if (shareError) throw shareError;
      }
      const { error: updateError } = await supabase.from('patient_exercise_prescriptions')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id).eq('patient_id', patientId);
      if (updateError) throw updateError;
      await loadSharing();
      setMessage(status === 'excluido'
        ? 'Exercício apagado desta lista. O histórico de realização foi preservado.'
        : status === 'removido' ? 'Exercício retirado da lista do paciente. O histórico foi preservado.'
        : status === 'suspenso' ? 'Exercício desfeito e ocultado do paciente.' : 'Exercício reativado.');
    } catch (e) {
      setError(describeSupabaseError(e, 'Não foi possível atualizar o exercício.'));
    } finally { setBusyId(''); }
  };

  const sendPortalReply = async () => {
    if (!supabase || !patientId || !reply.trim()) return;
    setSendingReply(true); setError(''); setMessage('');
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error('Sessão profissional expirada. Entre novamente.');
      const { error: insertError } = await supabase.from('patient_portal_messages').insert({
        patient_id: patientId, professional_user_id: userData.user.id,
        sender_user_id: userData.user.id, sender_role: 'professional', body: reply.trim(),
      });
      if (insertError) throw insertError;
      setReply('');
      await loadSharing();
      setMessage('Resposta enviada ao paciente.');
    } catch (e) { setError(describeSupabaseError(e, 'Não foi possível enviar a resposta.')); }
    finally { setSendingReply(false); }
  };

  const generateInvite = async () => {
    if (!supabase || !patientId) return;
    setBusyId('invite'); setError(''); setMessage(''); setInviteCode('');
    try {
      const { data, error: rpcError } = await supabase.rpc('create_patient_portal_invite', { p_patient_id: patientId });
      if (rpcError) throw rpcError;
      setInviteCode(String(data));
      setMessage(hasAccess ? 'Novo código de recuperação criado, sem prazo de validade. Quando utilizado, transfere o acesso para o novo aparelho e encerra o acesso do aparelho anterior.' : 'Convite criado. O código não tem prazo de validade e poderá ser usado uma única vez para ativar o acesso sem e-mail.');
    } catch (e) { setError(describeSupabaseError(e, 'Não foi possível gerar o convite.')); }
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
          <div className="flex flex-wrap items-center gap-3"><button onClick={()=>void generateInvite()} disabled={busyId==='invite'} className="inline-flex items-center gap-2 rounded-xl bg-[#1D4ED8] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"><KeyRound size={16}/>{busyId==='invite'?'Gerando...':hasAccess?'Gerar novo código de recuperação':'Gerar código de acesso'}</button><button onClick={()=>void loadSharing()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"><RefreshCw size={15}/> Atualizar</button></div>
          {inviteCode && <div className="rounded-xl border border-blue-200 bg-blue-50 p-4"><p className="text-xs font-semibold text-blue-900">Código individual — não expira e pode ser usado uma única vez</p><div className="mt-2 flex flex-wrap items-center gap-2"><code className="min-w-0 flex-1 break-all rounded-lg bg-white p-3 font-mono text-sm text-slate-900">{inviteCode}</code><button onClick={()=>void navigator.clipboard.writeText(inviteCode)} className="inline-flex items-center gap-2 rounded-lg bg-[#0B1F3A] px-3 py-3 text-xs font-semibold text-white"><Copy size={14}/> Copiar</button></div><p className="mt-2 text-xs text-blue-900">Envie o código diretamente ao paciente. Se ele já tiver acesso, o uso deste código transfere o vínculo para o novo aparelho.</p></div>}
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
        {(['exercise','evolution','appointment','treatment_plan','reassessment'] as const).map((type) => {
          const labels = { exercise: 'Exercícios domiciliares', evolution: 'Evoluções das sessões', appointment: 'Agenda de atendimentos', treatment_plan: 'Plano terapêutico', reassessment: 'Reavaliações funcionais' };
          const items = portalItems[type];
          return <section key={type} className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="mb-4"><h2 className="font-bold text-[#0B1F3A]">{labels[type]}</h2><p className="text-xs text-slate-500">Marque somente os registros que deseja disponibilizar na área do paciente.</p></div>
            {items.length===0 ? <p className="text-sm text-slate-500">Nenhum registro disponível para este paciente.</p> : <div className="divide-y divide-slate-100">{items.map(item=><div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{item.title}</span><span className="text-xs text-slate-500">{item.detail}</span>{type==='exercise' && item.status && item.status!=='ativo' && <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">{item.status==='suspenso'?'Desfeito':'Removido da lista'}</span>}</span>{type==='exercise' ? <div className="flex flex-wrap items-center gap-2">{item.status==='suspenso' ? <button type="button" onClick={()=>void updateExerciseStatus(item.id,'ativo')} disabled={busyId===item.id} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-50"><RotateCcw size={14}/> Reativar</button> : item.status==='removido' ? <button type="button" onClick={()=>void updateExerciseStatus(item.id,'ativo')} disabled={busyId===item.id} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-50"><RotateCcw size={14}/> Restaurar</button> : <><button type="button" onClick={()=>void updateExerciseStatus(item.id,'suspenso')} disabled={busyId===item.id} className="inline-flex items-center gap-1 rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-semibold text-amber-700 disabled:opacity-50"><Undo2 size={14}/> Desfazer</button><button type="button" onClick={()=>void updateExerciseStatus(item.id,'excluido')} disabled={busyId===item.id} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-semibold text-rose-700 disabled:opacity-50"><Trash2 size={14}/> Apagar</button></>}{item.status==='ativo' && <input type="checkbox" aria-label={'Compartilhar '+item.title} checked={isShared(type,item.id)} disabled={busyId===item.id} onChange={e=>void toggleShare(type,item.id,e.target.checked)} className="h-5 w-5 accent-blue-700"/>}</div> : <><input type="checkbox" aria-label={'Compartilhar '+item.title} checked={isShared(type,item.id)} disabled={busyId===item.id} onChange={e=>void toggleShare(type,item.id,e.target.checked)} className="h-5 w-5 accent-blue-700"/></>}</div>)}</div>}
          </section>;
        })}
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-4"><h2 className="font-bold text-[#0B1F3A]">Retorno dos exercícios</h2><p className="text-xs text-slate-500">Registros enviados pelo paciente ao marcar os exercícios como realizados ou não realizados.</p></div>
          {portalExerciseLogs.length===0?<p className="text-sm text-slate-500">O paciente ainda não registrou a realização de exercícios.</p>:<div className="divide-y">{portalExerciseLogs.map(log=>{const exercise=portalItems.exercise.find(x=>x.id===log.prescription_id);return <div key={log.id} className="py-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold">{exercise?.title||'Exercício prescrito'}</p><span className={`rounded-full px-2 py-1 text-xs font-semibold ${log.status==='realizado'?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-800'}`}>{log.status==='realizado'?'Realizado':'Não realizado'}</span></div><p className="text-xs text-slate-500">{new Date(log.performed_at).toLocaleString('pt-BR')}</p>{log.notes&&<p className="mt-1 text-sm text-slate-600">{log.notes}</p>}</div>})}</div>}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-4"><h2 className="font-bold text-[#0B1F3A]">Mensagens do paciente</h2><p className="text-xs text-slate-500">Conversa individual com o paciente vinculado.</p></div>
          {!hasAccess ? <p className="text-sm text-slate-500">As mensagens ficarão disponíveis após o paciente ativar o acesso.</p> : <>
            <div className="mb-4 max-h-80 space-y-3 overflow-y-auto rounded-xl bg-slate-50 p-3">
              {portalMessages.length===0?<p className="py-5 text-center text-sm text-slate-500">Nenhuma mensagem recebida.</p>:portalMessages.map(m=><div key={m.id} className={`flex ${m.sender_role==='professional'?'justify-end':'justify-start'}`}><div className={`max-w-[85%] rounded-xl p-3 ${m.sender_role==='professional'?'bg-blue-700 text-white':'border bg-white text-slate-800'}`}><p className="whitespace-pre-wrap text-sm">{m.body}</p><p className={`mt-1 text-right text-[10px] ${m.sender_role==='professional'?'text-blue-100':'text-slate-400'}`}>{m.sender_role==='professional'?'Você':'Paciente'} · {new Date(m.created_at).toLocaleString('pt-BR')}</p></div></div>)}
            </div><div ref={messagesEndRef}/>
            <textarea rows={3} maxLength={2000} value={reply} onChange={e=>setReply(e.target.value)} placeholder="Escreva uma resposta ao paciente..." className="w-full rounded-lg border border-slate-300 p-3 text-sm"/>
            <div className="mt-1 text-right text-xs text-slate-400">{reply.length}/2000</div>
            <div className="mt-2 flex justify-end"><button onClick={()=>void sendPortalReply()} disabled={sendingReply||!reply.trim()} className="rounded-lg bg-[#1D4ED8] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{sendingReply?'Enviando...':'Enviar resposta'}</button></div>
          </>}
        </section>
      </>}
    </div>
  );
};
