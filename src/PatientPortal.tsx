import React, { useCallback, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { Logo } from './components/Logo';
import { PatientPortalWorkspace } from './components/PatientPortalWorkspace';
import { FileText, Activity, LogOut, Lock, Download, ShieldCheck, UserRound, CalendarDays, AlertCircle, LoaderCircle } from 'lucide-react';

type PortalAssessment = {
  id: string; specialty_id: string; evaluation_date: string;
  data: { identification?: { fullName?: string; evaluationDate?: string }; synthesis?: { clinicalFindings?: string; functionalLimitations?: string; kineticFunctionalDiagnosis?: string; shortTermGoals?: string; mediumTermGoals?: string; longTermGoals?: string; treatmentPlan?: string; functionalPrognosis?: string } };
};
type PortalDocument = {
  id: string; title: string; document_type: string; document_date: string;
  professional_name: string; professional_crefito: string; storage_bucket: string;
  storage_path: string; file_name: string;
};
type PortalData = { patientId: string; patientName: string; assessments: PortalAssessment[]; documents: PortalDocument[] };

function getPortalErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = String((error as { message?: unknown }).message ?? '').trim();
    if (message) return message;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

const specialtyNames: Record<string, string> = {
  ortopedia: 'Ortopedia e Traumatologia', 'neurologia-adulto': 'Neurologia Adulto',
  'paralisia-facial': 'Paralisia Facial', geriatria: 'Fisioterapia em Geriatria',
  cardiorrespiratoria: 'Cardiorrespiratória', pediatria: 'Fisioterapia Pediátrica',
};

export default function PatientPortal() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [pendingCode, setPendingCode] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [portalData, setPortalData] = useState<PortalData | null>(null);
  const [needsInvite, setNeedsInvite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadPortal = useCallback(async (id: string) => {
    if (!supabase) return;
    setLoading(true); setError('');
    try {
      const { data: access, error: accessError } = await supabase
        .from('patient_portal_access').select('patient_id').eq('patient_user_id', id).eq('active', true).maybeSingle();
      if (accessError) throw accessError;
      if (!access) { setPortalData(null); setNeedsInvite(true); return; }
      const patientId = access.patient_id as string;
      const [{ data: patient, error: patientError }, { data: shares, error: sharesError }] = await Promise.all([
        supabase.rpc('patient_portal_profile').then(({ data, error }) => ({ data: (data ?? []).find((row: { id: string }) => row.id === patientId) ?? null, error })),
        supabase.from('patient_portal_shares').select('record_type,record_id').eq('patient_id', patientId),
      ]);
      if (patientError) throw patientError;
      if (sharesError) throw sharesError;
      const assessmentIds = (shares ?? []).filter(x => x.record_type === 'assessment').map(x => x.record_id);
      const documentIds = (shares ?? []).filter(x => x.record_type === 'document').map(x => x.record_id);
      const [aRes, dRes] = await Promise.all([
        assessmentIds.length ? supabase.from('assessments').select('id,specialty_id,evaluation_date,data').in('id', assessmentIds).order('evaluation_date', { ascending: false }) : Promise.resolve({ data: [], error: null }),
        documentIds.length ? supabase.from('clinical_documents').select('id,title,document_type,document_date,professional_name,professional_crefito,storage_bucket,storage_path,file_name').in('id', documentIds).order('document_date', { ascending: false }) : Promise.resolve({ data: [], error: null }),
      ]);
      if (aRes.error) throw aRes.error;
      if (dRes.error) throw dRes.error;
      setPortalData({ patientId, patientName: patient.full_name, assessments: (aRes.data ?? []) as PortalAssessment[], documents: (dRes.data ?? []) as PortalDocument[] });
      setNeedsInvite(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível carregar o portal.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => {
      const id = data.session?.user.id ?? null; setUserId(id);
      if (id) void loadPortal(id); else setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id ?? null; setUserId(id);
      if (id) void loadPortal(id); else { setPortalData(null); setNeedsInvite(false); setLoading(false); }
    });
    return () => listener.subscription.unsubscribe();
  }, [loadPortal]);

  const handleAuth = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if (!supabase) throw new Error('O portal ainda não está conectado ao Supabase.');
      if (mode === 'signup') {
        const { data, error: authError } = await supabase.auth.signUp({ email: email.trim(), password });
        if (authError) throw authError;
        setPendingCode('');
        setInviteCode('');
        if (data.session?.user) {
          setUserId(data.session.user.id);
          setNeedsInvite(true);
          setMessage('Cadastro realizado. Agora informe o código individual enviado pelo fisioterapeuta para vincular seu prontuário.');
        } else {
          setMode('login');
          setMessage('Cadastro realizado. Confirme seu e-mail e depois entre com sua senha. Em seguida, informe o código enviado pelo fisioterapeuta para acessar seu prontuário.');
        }
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        if (data.user && (pendingCode || inviteCode.trim())) {
          const { error: claimError } = await supabase.rpc('claim_patient_portal_invite', { p_code: (pendingCode || inviteCode).trim() });
          if (claimError) throw claimError;
        }
        if (data.user) await loadPortal(data.user.id);
      }
    } catch (e) { setError(getPortalErrorMessage(e, 'Não foi possível autenticar.')); }
    finally { setBusy(false); }
  };

  const handleAnonymousAccess = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      if (!supabase) throw new Error('O portal ainda não está conectado ao Supabase.');
      if (!inviteCode.trim()) throw new Error('Informe o código enviado pelo fisioterapeuta.');
      const { data, error: signInError } = await supabase.auth.signInAnonymously();
      if (signInError) {
        if (/anonymous|disabled|not enabled/i.test(signInError.message)) {
          throw new Error('O acesso sem e-mail ainda precisa ser habilitado nas configurações de autenticação do Supabase. Avise o fisioterapeuta.');
        }
        throw signInError;
      }
      if (!data.user) throw new Error('Não foi possível iniciar o acesso.');
      setUserId(data.user.id);
      const { error: claimError } = await supabase.rpc('claim_patient_portal_invite', { p_code: inviteCode.trim() });
      if (claimError) throw claimError;
      setInviteCode('');
      await loadPortal(data.user.id);
      setMessage('Acesso ativado neste aparelho. Guarde este aparelho para continuar acessando.');
    } catch (e) { setError(getPortalErrorMessage(e, 'Não foi possível ativar o acesso sem e-mail.')); }
    finally { setBusy(false); }
  };

  const handleClaim = async (event: React.FormEvent) => {
    event.preventDefault(); if (!supabase) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const { error: claimError } = await supabase.rpc('claim_patient_portal_invite', { p_code: inviteCode.trim() });
      if (claimError) throw claimError;
      if (userId) await loadPortal(userId);
      setInviteCode(''); setPendingCode('');
      setMessage('Acesso vinculado com sucesso.');
    } catch (e) { setError(getPortalErrorMessage(e, 'Não foi possível ativar o convite.')); }
    finally { setBusy(false); }
  };

  const openDocument = async (doc: PortalDocument) => {
    if (!supabase) return;
    setError('');
    try {
      const { data, error: urlError } = await supabase.storage.from(doc.storage_bucket || 'clinical-documents').createSignedUrl(doc.storage_path, 90);
      if (urlError || !data?.signedUrl) throw urlError || new Error('Arquivo indisponível.');
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (e) { setError(getPortalErrorMessage(e, 'Não foi possível abrir o documento.')); }
  };

  const signOut = async () => { if (supabase) await supabase.auth.signOut(); setPortalData(null); setUserId(null); };

  if (loading) return <div className="min-h-screen grid place-items-center bg-slate-50 text-slate-600"><LoaderCircle className="animate-spin mr-2 inline" /> Carregando área do paciente...</div>;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-[#0B1F3A] text-white px-5 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4"><Logo compact darkSurface />{userId && <button onClick={signOut} className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm hover:bg-white/20"><LogOut size={16}/> Sair</button>}</div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"><AlertCircle className="mr-2 inline" size={16}/>{error}</div>}
        {message && <div role="status" className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">{message}</div>}
        {!userId ? (
          <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="mb-6"><h1 className="text-2xl font-bold text-[#0B1F3A]">Área do Paciente</h1><p className="mt-2 text-sm text-slate-600">Acesse avaliações e documentos que seu fisioterapeuta compartilhou com você.</p></div>
            {!isSupabaseConfigured ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">O acesso online ainda não está configurado.</p> : <>
              <section className="rounded-xl border border-slate-200 bg-white p-4">
                <h2 className="font-semibold text-[#0B1F3A]">Acesso com e-mail e senha</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">Entre com sua conta ou faça seu cadastro gratuito. Para visualizar o prontuário, será necessário vincular o código enviado pelo fisioterapeuta.</p>
                <div className="my-4 flex rounded-lg bg-slate-100 p-1">
                  <button type="button" onClick={()=>{setMode('login');setError('');setMessage('');}} className={`flex-1 rounded-md py-2 text-sm font-semibold ${mode==='login'?'bg-white shadow text-[#0B1F3A]':'text-slate-600'}`}>Entrar</button>
                  <button type="button" onClick={()=>{setMode('signup');setError('');setMessage('');}} className={`flex-1 rounded-md py-2 text-sm font-semibold ${mode==='signup'?'bg-white shadow text-[#0B1F3A]':'text-slate-600'}`}>Criar cadastro</button>
                </div>
                <form onSubmit={handleAuth} className="space-y-4">
                  <label className="block text-sm font-medium">E-mail<input required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="seuemail@exemplo.com" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5"/></label>
                  <label className="block text-sm font-medium">Senha<input required type="password" minLength={8} autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==='login'?'Sua senha':'Crie uma senha com pelo menos 8 caracteres'} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5"/></label>
                  <button disabled={busy} className="w-full rounded-xl bg-[#1D4ED8] px-4 py-3 font-semibold text-white disabled:opacity-60">{busy?'Aguarde...':mode==='login'?'Entrar com e-mail e senha':'Criar minha conta'}</button>
                </form>
              </section>
              <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-slate-400"><span className="h-px flex-1 bg-slate-200"/><span>ou</span><span className="h-px flex-1 bg-slate-200"/></div>
              <section className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <h2 className="font-semibold text-[#0B1F3A]">Entrar com código de acesso</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">Recebeu um código do fisioterapeuta? Use esta opção para acessar sem e-mail e senha.</p>
                <form onSubmit={handleAnonymousAccess} className="mt-3 space-y-3">
                  <input required value={inviteCode} onChange={e=>setInviteCode(e.target.value)} placeholder="Digite seu código de acesso" autoComplete="one-time-code" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 font-mono text-sm"/>
                  <button disabled={busy} className="w-full rounded-xl bg-[#1D4ED8] px-4 py-3 font-semibold text-white disabled:opacity-60">{busy?'Validando...':'Entrar com código'}</button>
                </form>
              </section>
            </>}
            <p className="mt-6 flex items-start gap-2 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500"><ShieldCheck size={16} className="shrink-0 text-emerald-600"/> Seus dados só ficam disponíveis após autenticação e vínculo confirmado pelo convite individual.</p>
          </div>
        ) : portalData ? (
          <PatientPortalWorkspace
            patientId={portalData.patientId}
            patientName={portalData.patientName}
            assessments={portalData.assessments}
            documents={portalData.documents}
            onOpenDocument={openDocument}
          />
        ) : needsInvite ? (
          <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700"><Lock/></div><h1 className="text-xl font-bold text-[#0B1F3A]">Ative seu acesso</h1><p className="mt-2 text-sm text-slate-600">Sua conta está autenticada, mas ainda não foi vinculada a um prontuário. Informe o código individual fornecido pelo fisioterapeuta.</p><form onSubmit={handleClaim} className="mt-5 space-y-3"><input required value={inviteCode} onChange={e=>setInviteCode(e.target.value)} placeholder="Código de convite" className="w-full rounded-lg border border-slate-300 px-3 py-3 font-mono"/><button disabled={busy} className="w-full rounded-xl bg-[#1D4ED8] px-4 py-3 font-semibold text-white disabled:opacity-60">{busy?'Validando...':'Vincular meu prontuário'}</button></form><button onClick={signOut} className="mt-4 text-sm text-slate-500 hover:underline">Sair da conta</button></div>
        ) : null}
        <footer className="mt-10 text-center text-xs text-slate-400"><UserRound className="mr-1 inline" size={13}/> FisioAvaPro · Portal de acesso individual e protegido</footer>
      </main>
    </div>
  );
}
