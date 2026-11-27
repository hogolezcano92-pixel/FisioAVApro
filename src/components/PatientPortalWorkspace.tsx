import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Activity, CalendarDays, CheckCircle2, ClipboardList, FileText, MessageCircle, Send, ShieldCheck, Clock3, Dumbbell, Home, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EXERCISE_ATLAS } from '../assets/exerciseAtlas';
import { BELL_EXERCISE_IMAGES } from '../assets/bellExerciseImages';
import { BELL_SMILE_IMAGE } from '../assets/bellSmileImage';

type Assessment = { id:string; specialty_id:string; evaluation_date:string; data:any };
type Document = { id:string; title:string; document_type:string; document_date:string; professional_name:string; professional_crefito:string; storage_bucket:string; storage_path:string; file_name:string };
type Exercise = { id:string; exercise_id:string; exercise_name:string; category:string; objective:string; instructions:string; precautions:string; sets:number; reps:string; hold_seconds:number; frequency:string };
type ExerciseLog = { id:string; prescription_id:string; performed_at:string; status:'realizado'|'nao_realizado'; notes:string };
type Evolution = { id:string; specialty_id:string; session_date:string; session_time:string; professional_name:string; data:any };
type Appointment = { id:string; scheduled_date:string; scheduled_time:string; duration_minutes:number; attendance_mode:string; appointment_type:string; status:string; specialty_id:string };
type Reassessment = { id:string; specialty_id:string; evaluation_date:string; data:any };
type Plan = { id:string; title:string; kinetic_diagnosis:string; short_term_goals:string; medium_term_goals:string; long_term_goals:string; interventions:string; frequency:string; precautions:string; status:string; start_date:string; expected_end_date:string|null };
type Message = { id:string; sender_role:'patient'|'professional'; body:string; created_at:string };
type Tab = 'inicio'|'evolucao'|'exercicios'|'agenda'|'documentos'|'mensagens';

const specialties:Record<string,string> = { ortopedia:'Ortopedia e Traumatologia','neurologia-adulto':'Neurologia Adulto','paralisia-facial':'Paralisia Facial',geriatria:'Fisioterapia em Geriatria',cardiorrespiratoria:'Cardiorrespiratória',pediatria:'Fisioterapia Pediátrica' };
const datePt=(v?:string|null)=>v?new Date(v+'T12:00:00').toLocaleDateString('pt-BR'):'—';
const dateTimePt=(v:string)=>new Date(v).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
const exerciseImagePositions:Record<string,{col:number;row:number}>={'ankle-pumps':{col:0,row:0},'sit-to-stand':{col:1,row:0},'heel-raises':{col:2,row:0},'knee-extension':{col:3,row:0},'seated-march':{col:0,row:1},'shoulder-flexion':{col:1,row:1},'scapular-retraction':{col:2,row:1},bridging:{col:3,row:1},'seated-weight-shift':{col:0,row:2},'diaphragmatic-breathing':{col:1,row:2},'facial-smile':{col:2,row:2},'clamshell-hip-abduction':{col:3,row:1},'heel-slide-knee-flexion':{col:3,row:0},'supported-mini-squat':{col:1,row:0},'low-step-up':{col:2,row:0},'seated-target-reaching':{col:0,row:2},'supported-lateral-weight-shift':{col:0,row:2},'thoracic-expansion-seated':{col:1,row:2},'supported-step-tap':{col:2,row:0}};
const PortalCard:React.FC<{title:string;children:React.ReactNode;icon?:React.ReactNode}> = ({title,children,icon})=><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-2 text-[#0B1F3A]">{icon}<h2 className="font-bold">{title}</h2></div>{children}</section>;

const ExerciseThumbnail:React.FC<{id:string;name:string}> = ({id,name})=>{const p=exerciseImagePositions[id];const facialImage=id==='facial-smile'?BELL_SMILE_IMAGE:BELL_EXERCISE_IMAGES[id];if(facialImage)return <div className="h-28 w-32 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50"><img src={facialImage} alt={'Ilustração de '+name} className="h-full w-full object-cover" loading="lazy"/></div>;return p?<div role="img" aria-label={'Ilustração de '+name} className="h-28 w-32 shrink-0 rounded-xl border border-slate-100 bg-slate-50" style={{backgroundImage:'url('+EXERCISE_ATLAS+')',backgroundRepeat:'no-repeat',backgroundSize:'400% 300%',backgroundPosition:((p.col/3)*100)+'% '+((p.row/2)*100)+'%'}}/>:<div className="flex h-28 w-32 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600"><Dumbbell size={30}/></div>};
const lines=(v:string)=>String(v||'').split(/\n|\r/).map(x=>x.replace(/^\s*[-•]\s*/, '').trim()).filter(Boolean);

export const PatientPortalWorkspace:React.FC<{patientId:string;patientName:string;assessments:Assessment[];documents:Document[];onOpenDocument:(doc:Document)=>void}> = ({patientId,patientName,assessments,documents,onOpenDocument})=>{
  const [tab,setTab]=useState<Tab>('inicio');
  const [exercises,setExercises]=useState<Exercise[]>([]);
  const [logs,setLogs]=useState<ExerciseLog[]>([]);
  const [evolutions,setEvolutions]=useState<Evolution[]>([]);
  const [appointments,setAppointments]=useState<Appointment[]>([]);
  const [plans,setPlans]=useState<Plan[]>([]);
  const [reassessments,setReassessments]=useState<Reassessment[]>([]);
  const [messages,setMessages]=useState<Message[]>([]);
  const messagesListRef=useRef<HTMLDivElement|null>(null);
  const [professionalId,setProfessionalId]=useState('');
  const [draft,setDraft]=useState('');
  const [logNotes,setLogNotes]=useState<Record<string,string>>({});
  const [loading,setLoading]=useState(true);
  const [sending,setSending]=useState(false);
  const [busyExercise,setBusyExercise]=useState('');
  const [error,setError]=useState('');

  const load=useCallback(async()=>{
    if(!supabase)return;
    setLoading(true);setError('');
    try{
      const access=await supabase.from('patient_portal_access').select('professional_user_id').eq('patient_id',patientId).eq('active',true).maybeSingle();
      if(access.error)throw access.error;
      if(!access.data)throw new Error('Vínculo de acesso não encontrado. Entre novamente com seu código.');
      setProfessionalId(access.data.professional_user_id);
      const [ex,lg,ev,ap,tp,ra,msg]=await Promise.all([
        supabase.from('patient_exercise_prescriptions').select('id,exercise_id,exercise_name,category,objective,instructions,precautions,sets,reps,hold_seconds,frequency').eq('patient_id',patientId).eq('status','ativo').order('created_at',{ascending:false}),
        supabase.from('patient_portal_exercise_logs').select('id,prescription_id,performed_at,status,notes').eq('patient_id',patientId).order('performed_at',{ascending:false}),
        supabase.from('evolutions').select('id,specialty_id,session_date,session_time,professional_name,data').eq('patient_id',patientId).order('session_date',{ascending:false}),
        supabase.from('appointments').select('id,scheduled_date,scheduled_time,duration_minutes,attendance_mode,appointment_type,status,specialty_id').eq('patient_id',patientId).order('scheduled_date',{ascending:true}),
        supabase.from('treatment_plans').select('id,title,kinetic_diagnosis,short_term_goals,medium_term_goals,long_term_goals,interventions,frequency,precautions,status,start_date,expected_end_date').eq('patient_id',patientId).order('start_date',{ascending:false}),
        supabase.from('reassessments').select('id,specialty_id,evaluation_date,data').eq('patient_id',patientId).order('evaluation_date',{ascending:false}),
        supabase.from('patient_portal_messages').select('id,sender_role,body,created_at').eq('patient_id',patientId).order('created_at',{ascending:true}),
      ]);
      for(const result of [ex,lg,ev,ap,tp,ra,msg])if(result.error)throw result.error;
      setExercises((ex.data||[]) as Exercise[]);setLogs((lg.data||[]) as ExerciseLog[]);
      setEvolutions((ev.data||[]) as Evolution[]);setAppointments((ap.data||[]) as Appointment[]);
      setPlans((tp.data||[]) as Plan[]);setReassessments((ra.data||[]) as Reassessment[]);setMessages((msg.data||[]) as Message[]);
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar as informações.');}
    finally{setLoading(false);}
  },[patientId]);

  useEffect(()=>{void load();},[load]);

  useEffect(()=>{
    if(!supabase||!patientId||!professionalId)return;
    const channel=supabase.channel('patient-portal-messages-'+patientId)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'patient_portal_messages',filter:'patient_id=eq.'+patientId},payload=>{
        const incoming=payload.new as Message;
        if(incoming?.id&&incoming.sender_role&&incoming.body){
          setMessages(current=>current.some(item=>item.id===incoming.id)?current:[...current,incoming].sort((a,b)=>a.created_at.localeCompare(b.created_at)));
        }
      })
      .subscribe();
    return ()=>{void supabase.removeChannel(channel);};
  },[patientId,professionalId]);

  // Rola apenas a lista interna quando chega uma mensagem.
  // Evita scrollIntoView na página inteira, que pode tirar o foco do textarea
  // e fechar o teclado virtual no Safari/iOS.
  useEffect(()=>{
    if(tab==='mensagens' && messagesListRef.current){
      messagesListRef.current.scrollTop=messagesListRef.current.scrollHeight;
    }
  },[messages]);
  const nextAppointment=useMemo(()=>appointments.filter(a=>a.status==='agendado'&&a.scheduled_date>=new Date().toISOString().slice(0,10)).sort((a,b)=>a.scheduled_date.localeCompare(b.scheduled_date))[0],[appointments]);
  const doneCount=logs.filter(l=>l.status==='realizado').length;
  const latestLogByExercise=(id:string)=>logs.find(l=>l.prescription_id===id);

  const markExercise=async(ex:Exercise,status:'realizado'|'nao_realizado')=>{
    if(!supabase)return;setBusyExercise(ex.id);setError('');
    try{
      const {data:userData,error:userError}=await supabase.auth.getUser();if(userError)throw userError;
      if(!userData.user)throw new Error('Sua sessão expirou. Entre novamente.');
      const {error:insertError}=await supabase.from('patient_portal_exercise_logs').insert({patient_id:patientId,prescription_id:ex.id,patient_user_id:userData.user.id,status,notes:logNotes[ex.id]||''});
      if(insertError)throw insertError;
      setLogNotes(v=>({...v,[ex.id]:''}));await load();
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível registrar o exercício.');}
    finally{setBusyExercise('');}
  };

  const sendMessage=async(e:React.FormEvent)=>{
    e.preventDefault();if(!supabase||!draft.trim()||!professionalId)return;
    setSending(true);setError('');
    try{
      const {data:userData,error:userError}=await supabase.auth.getUser();if(userError)throw userError;
      if(!userData.user)throw new Error('Sua sessão expirou. Entre novamente.');
      const {error:insertError}=await supabase.from('patient_portal_messages').insert({patient_id:patientId,professional_user_id:professionalId,sender_user_id:userData.user.id,sender_role:'patient',body:draft.trim()});
      if(insertError)throw insertError;setDraft('');await load();
    }catch(e){setError(e instanceof Error?e.message:'Não foi possível enviar sua mensagem.');}
    finally{setSending(false);}
  };

  const tabs:[Tab,string,React.ReactNode][]=[
    ['inicio','Início',<Home size={16}/>],['evolucao','Minha evolução',<Activity size={16}/>],['exercicios','Meus exercícios',<Dumbbell size={16}/>],['agenda','Agenda',<CalendarDays size={16}/>],['documentos','Avaliações e docs.',<FileText size={16}/>],['mensagens','Mensagens',<MessageCircle size={16}/>]
  ];
  return <div className="space-y-5">
    <section className="relative isolate overflow-hidden rounded-[28px] bg-gradient-to-br from-[#07182D] via-[#0B2B50] to-[#1D4ED8] p-6 text-white shadow-xl shadow-blue-950/10 sm:p-8"><div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full border-[28px] border-white/5"/><div className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-cyan-300/10 blur-3xl"/><div className="relative flex flex-wrap items-center justify-between gap-4"><div><div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-semibold tracking-wide text-blue-100"><ShieldCheck size={14}/> ACOMPANHAMENTO INDIVIDUAL</div><p className="text-sm text-blue-100">Olá, seja bem-vindo(a)!</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{patientName}</h1><p className="mt-2 max-w-xl text-sm leading-relaxed text-blue-100/90">Aqui você acompanha sua evolução, consulta seus exercícios e encontra as informações compartilhadas pelo seu fisioterapeuta.</p></div><div className="hidden h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-inner sm:flex"><Activity className="h-8 w-8 text-cyan-100"/></div></div></section>
    <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-3 shadow-[0_12px_35px_-25px_rgba(15,35,65,0.35)] sm:p-4">
      <div className="mb-3 flex items-center justify-between px-1"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-600">Seu espaço</p><h2 className="mt-0.5 text-base font-bold text-[#0B1F3A]">O que deseja consultar?</h2></div><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">Menu do paciente</span></div>
      <nav className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Navegação da área do paciente">{tabs.map(([id,label,icon])=><button key={id} type="button" aria-current={tab===id?'page':undefined} onClick={()=>setTab(id)} className={`group flex min-h-[82px] flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-center transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${tab===id?'border-[#0B1F3A] bg-gradient-to-br from-[#0B1F3A] to-[#17447A] text-white shadow-lg shadow-blue-950/15':'border-slate-100 bg-slate-50/70 text-slate-600 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50 hover:text-[#0B1F3A]'}`}><span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tab===id?'bg-white/15 text-white':'bg-white text-blue-700 shadow-sm group-hover:bg-blue-100'}`}>{icon}</span><span className="text-[11px] font-bold leading-tight sm:text-xs">{label}</span></button>)}</nav>
    </section>
    {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div>}
    {loading?<div className="rounded-xl bg-white p-8 text-center text-slate-500"><RefreshCw className="mx-auto mb-2 animate-spin"/>Carregando seu acompanhamento...</div>:<>
      {tab==='inicio'&&<div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[['Avaliações',assessments.length],['Exercícios ativos',exercises.length],['Sessões registradas',evolutions.length],['Reavaliações',reassessments.length]].map(([label,value])=><div key={String(label)} className="rounded-xl border bg-white p-4"><p className="text-2xl font-bold text-[#0B1F3A]">{value}</p><p className="text-xs text-slate-500">{label}</p></div>)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <PortalCard title="Próxima sessão" icon={<CalendarDays className="text-blue-700"/>}>{nextAppointment?<><p className="text-lg font-bold">{datePt(nextAppointment.scheduled_date)} · {nextAppointment.scheduled_time||'Horário a confirmar'}</p><p className="mt-1 text-sm text-slate-600">{specialties[nextAppointment.specialty_id]||nextAppointment.specialty_id} · {nextAppointment.duration_minutes} min</p><p className="text-xs text-slate-500">{nextAppointment.attendance_mode}</p></>:<p className="text-sm text-slate-500">Nenhuma sessão futura foi liberada na agenda.</p>}</PortalCard>
          <PortalCard title="Plano de tratamento" icon={<ClipboardList className="text-blue-700"/>}>{plans.length?plans.slice(0,1).map(p=><div key={p.id}><p className="font-semibold">{p.title}</p><p className="mt-1 text-sm text-slate-600">{p.kinetic_diagnosis}</p><p className="mt-2 text-xs text-slate-500">Frequência: {p.frequency||'A combinar'}</p></div>):<p className="text-sm text-slate-500">Nenhum plano foi compartilhado.</p>}</PortalCard>
        </div>
        <PortalCard title="Últimas atualizações" icon={<Clock3 className="text-blue-700"/>}>{evolutions.slice(0,3).length?evolutions.slice(0,3).map(e=><div key={e.id} className="border-b py-2 last:border-0"><p className="text-sm font-semibold">{specialties[e.specialty_id]||e.specialty_id} · {datePt(e.session_date)}</p><p className="text-xs text-slate-500">{e.data?.patientResponse||e.data?.endingCondition||'Atendimento registrado pelo fisioterapeuta'}</p></div>):<p className="text-sm text-slate-500">Nenhuma evolução foi liberada ainda.</p>}</PortalCard>
      </div>}
      {tab==='evolucao'&&<div className="space-y-5">
        <PortalCard title="Minha evolução funcional" icon={<Activity className="text-emerald-600"/>}>{assessments.length===0&&evolutions.length===0&&plans.length===0&&reassessments.length===0?<p className="text-sm text-slate-500">Seu fisioterapeuta ainda não compartilhou registros de evolução.</p>:<>
          {assessments.map(a=><article key={a.id} className="mb-3 rounded-xl border p-4"><p className="font-semibold">{specialties[a.specialty_id]||a.specialty_id} · Avaliação de {datePt(a.evaluation_date)}</p>{a.data?.synthesis?.kineticFunctionalDiagnosis&&<p className="mt-2 text-sm"><strong>Diagnóstico funcional:</strong> {a.data.synthesis.kineticFunctionalDiagnosis}</p>}{a.data?.synthesis?.shortTermGoals&&<p className="mt-2 text-sm"><strong>Objetivos iniciais:</strong> {a.data.synthesis.shortTermGoals}</p>}{a.data?.synthesis?.functionalPrognosis&&<p className="mt-2 text-sm"><strong>Prognóstico:</strong> {a.data.synthesis.functionalPrognosis}</p>}</article>)}
          {plans.map(p=><article key={p.id} className="mb-3 rounded-xl border p-4"><p className="font-semibold">{p.title}</p>{p.short_term_goals&&<p className="mt-2 text-sm"><strong>Curto prazo:</strong> {p.short_term_goals}</p>}{p.medium_term_goals&&<p className="mt-2 text-sm"><strong>Médio prazo:</strong> {p.medium_term_goals}</p>}{p.long_term_goals&&<p className="mt-2 text-sm"><strong>Longo prazo:</strong> {p.long_term_goals}</p>}{p.interventions&&<p className="mt-2 text-sm"><strong>Condutas:</strong> {p.interventions}</p>}</article>)}
          {reassessments.map(r=><article key={r.id} className="mb-3 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4"><p className="font-semibold">Reavaliação · {specialties[r.specialty_id]||r.specialty_id} · {datePt(r.evaluation_date)}</p>{r.data?.clinicalEvolutionSummary&&<p className="mt-2 text-sm">{r.data.clinicalEvolutionSummary}</p>}{r.data?.achievedGoals&&<p className="mt-2 text-sm"><strong>Metas alcançadas:</strong> {r.data.achievedGoals}</p>}{r.data?.pendingGoals&&<p className="mt-2 text-sm"><strong>Metas em andamento:</strong> {r.data.pendingGoals}</p>}{r.data?.newTreatmentPlan&&<p className="mt-2 text-sm"><strong>Plano atualizado:</strong> {r.data.newTreatmentPlan}</p>}</article>)}
          {evolutions.map(e=><article key={e.id} className="mb-3 rounded-xl border p-4"><p className="font-semibold">{datePt(e.session_date)} · {e.session_time||''}</p>{e.data?.patientResponse&&<p className="mt-2 text-sm"><strong>Resposta ao atendimento:</strong> {e.data.patientResponse}</p>}{e.data?.guidance&&<p className="mt-2 text-sm"><strong>Orientações:</strong> {e.data.guidance}</p>}{e.data?.proceduresPerformed&&<p className="mt-2 text-sm"><strong>Procedimentos:</strong> {e.data.proceduresPerformed}</p>}</article>)}
        </>}</PortalCard>
      </div>}
      {tab==='exercicios'&&<div className="space-y-4">{exercises.length===0?<PortalCard title="Meus exercícios" icon={<Dumbbell className="text-blue-700"/>}><p className="text-sm text-slate-500">Nenhum exercício domiciliar foi liberado ainda. Quando seu fisioterapeuta prescrever e compartilhar, ele aparecerá aqui.</p></PortalCard>:exercises.map(ex=><article key={ex.id} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-2"><div className="flex min-w-0 items-start gap-3"><ExerciseThumbnail id={ex.exercise_id} name={ex.exercise_name}/><div><span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">{ex.category}</span><h2 className="mt-2 text-lg font-bold text-[#0B1F3A]">{ex.exercise_name}</h2></div></div><span className="text-xs text-slate-500">{ex.frequency||'Frequência a combinar'}</span></div>{ex.objective&&<p className="mt-2 text-sm text-slate-600">{ex.objective}</p>}<div className="mt-3 grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Séries</p><p className="font-semibold">{ex.sets}</p></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Repetições</p><p className="font-semibold">{ex.reps}</p></div><div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Sustentação</p><p className="font-semibold">{ex.hold_seconds?ex.hold_seconds+' s':'Não se aplica'}</p></div></div><div className="mt-4"><p className="text-sm font-semibold">Como realizar</p><ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-700">{lines(ex.instructions).map((step,i)=><li key={i}>{step}</li>)}</ol></div>{ex.precautions&&<p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-900"><strong>Atenção:</strong> {ex.precautions}</p>}<div className="mt-4 border-t pt-3"><label className="block text-xs font-medium text-slate-600">Observação (opcional)<textarea value={logNotes[ex.id]||''} onChange={e=>setLogNotes(v=>({...v,[ex.id]:e.target.value}))} maxLength={1000} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" placeholder="Conte como foi a realização..."/></label><div className="mt-3 flex flex-wrap gap-2"><button disabled={busyExercise===ex.id} onClick={()=>void markExercise(ex,'realizado')} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><CheckCircle2 className="mr-1 inline" size={15}/>Consegui realizar</button><button disabled={busyExercise===ex.id} onClick={()=>void markExercise(ex,'nao_realizado')} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Não consegui realizar</button></div>{latestLogByExercise(ex.id)&&<p className="mt-2 text-xs text-slate-500">Último registro: {dateTimePt(latestLogByExercise(ex.id)!.performed_at)} · {latestLogByExercise(ex.id)!.status==='realizado'?'Realizado':'Não realizado'}</p>}</div></article>)}</div>}
      {tab==='agenda'&&<PortalCard title="Minha agenda" icon={<CalendarDays className="text-blue-700"/>}>{appointments.length===0?<p className="text-sm text-slate-500">Nenhum atendimento foi compartilhado.</p>:<div className="divide-y">{appointments.map(a=><div key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-semibold">{datePt(a.scheduled_date)} · {a.scheduled_time||'Horário a confirmar'}</p><p className="text-sm text-slate-600">{specialties[a.specialty_id]||a.specialty_id} · {a.appointment_type==='avaliacao'?'Avaliação':'Sessão'} · {a.duration_minutes} min</p><p className="text-xs text-slate-500">{a.attendance_mode}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${a.status==='agendado'?'bg-blue-50 text-blue-700':a.status==='realizado'?'bg-emerald-50 text-emerald-700':'bg-slate-100 text-slate-600'}`}>{a.status}</span></div>)}</div>}</PortalCard>}
      {tab==='documentos'&&<div className="space-y-5">
        <PortalCard title="Minhas avaliações" icon={<Activity className="text-blue-700"/>}>{assessments.length===0?<p className="text-sm text-slate-500">Nenhuma avaliação compartilhada.</p>:assessments.map(a=><article key={a.id} className="border-b py-3 last:border-0"><p className="font-semibold">{specialties[a.specialty_id]||a.specialty_id}</p><p className="text-xs text-slate-500">Avaliação de {datePt(a.evaluation_date)}</p>{a.data?.synthesis?.kineticFunctionalDiagnosis&&<p className="mt-2 text-sm">{a.data.synthesis.kineticFunctionalDiagnosis}</p>}</article>)}</PortalCard>
        <PortalCard title="Meus documentos PDF" icon={<FileText className="text-blue-700"/>}>{documents.length===0?<p className="text-sm text-slate-500">Nenhum documento foi compartilhado.</p>:documents.map(d=><div key={d.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3 last:border-0"><div><p className="font-semibold">{d.title}</p><p className="text-xs text-slate-500">{datePt(d.document_date)} · {d.professional_name} · {d.professional_crefito}</p></div><button onClick={()=>onOpenDocument(d)} className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700"><FileText className="mr-1 inline" size={15}/>Abrir PDF</button></div>)}</PortalCard>
      </div>}
      {tab==='mensagens'&&<PortalCard title="Fale com seu fisioterapeuta" icon={<MessageCircle className="text-blue-700"/>}><p className="mb-3 text-sm text-slate-500">Use este espaço para dúvidas sobre orientações e exercícios. Em caso de urgência, procure atendimento imediato.</p><div ref={messagesListRef} className="mb-4 max-h-[420px] space-y-3 overflow-y-auto overscroll-contain rounded-xl bg-slate-50 p-3">{messages.length===0?<p className="py-6 text-center text-sm text-slate-500">Ainda não há mensagens nesta conversa.</p>:messages.map(m=><div key={m.id} className={`flex ${m.sender_role==='patient'?'justify-end':'justify-start'}`}><div className={`max-w-[85%] rounded-xl p-3 ${m.sender_role==='patient'?'bg-blue-700 text-white':'border bg-white text-slate-800'}`}><p className="whitespace-pre-wrap text-sm">{m.body}</p><p className={`mt-1 text-right text-[10px] ${m.sender_role==='patient'?'text-blue-100':'text-slate-400'}`}>{m.sender_role==='patient'?'Você':'Fisioterapeuta'} · {dateTimePt(m.created_at)}</p></div></div>)}</div><form onSubmit={sendMessage} className="space-y-2"><textarea required maxLength={2000} rows={3} value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Digite sua mensagem..." className="w-full rounded-xl border border-slate-300 p-3 text-sm"/><div className="flex items-center justify-between gap-2"><span className="text-xs text-slate-400">{draft.length}/2000</span><button disabled={sending||!draft.trim()} className="rounded-xl bg-[#1D4ED8] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Send className="mr-2 inline" size={15}/>{sending?'Enviando...':'Enviar mensagem'}</button></div></form></PortalCard>}
    </>}
    <p className="flex items-start gap-2 text-xs text-slate-400"><ShieldCheck size={15} className="shrink-0"/> Conteúdo individual e protegido. As informações exibidas foram liberadas pelo seu fisioterapeuta.</p>
  </div>;
};
