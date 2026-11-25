import React, { useMemo, useState } from 'react';
import { Activity, Check, Clock3, Dumbbell, PauseCircle, PlayCircle, Plus, Search, ShieldAlert } from 'lucide-react';
import { PatientExerciseLog, PatientExercisePrescription } from '../types/exercises';
import { EXERCISE_ATLAS } from '../assets/exerciseAtlas';

interface ExerciseDefinition {
  id: string; name: string; category: string; objective: string; instructions: string[];
  precautions: string; defaultSets: number; defaultReps: string; holdSeconds: number;
  equipment: string;
}
const EXERCISES: ExerciseDefinition[] = [
  { id:'ankle-pumps', name:'Bombeamento de tornozelo', category:'Mobilidade', objective:'Estimular mobilidade ativa do tornozelo e ativação da musculatura da perna.', instructions:['Posicione-se sentado ou deitado, com a perna apoiada.','Leve a ponta do pé em direção ao corpo e depois aponte para longe.','Faça o movimento de forma lenta, sem forçar a amplitude.'], precautions:'Interromper se houver dor, câimbra intensa ou aumento incomum de edema. Em suspeita de trombose, não executar e encaminhar para avaliação.', defaultSets:2, defaultReps:'15 repetições', holdSeconds:0, equipment:'Sem equipamento' },
  { id:'sit-to-stand', name:'Sentar e levantar da cadeira', category:'Funcional / Fortalecimento', objective:'Treinar transferência, força de membros inferiores e independência funcional.', instructions:['Use cadeira firme, encostada na parede.','Posicione os pés afastados na largura do quadril.','Incline levemente o tronco à frente e levante; sente devagar, com controle.'], precautions:'Supervisão e apoio próximo quando houver risco de queda. Ajustar altura e assistência conforme capacidade; interromper diante de tontura, dor torácica ou dispneia desproporcional.', defaultSets:2, defaultReps:'8 repetições', holdSeconds:0, equipment:'Cadeira firme' },
  { id:'heel-raises', name:'Elevação de calcanhares', category:'Fortalecimento', objective:'Fortalecer flexores plantares e trabalhar controle postural.', instructions:['Fique em pé diante de um apoio estável.','Eleve os calcanhares, mantendo o peso distribuído no antepé.','Desça lentamente até apoiar toda a planta do pé.'], precautions:'Manter apoio e supervisão se houver instabilidade. Respeitar dor e amplitude disponível.', defaultSets:2, defaultReps:'10 repetições', holdSeconds:0, equipment:'Apoio estável' },
  { id:'knee-extension', name:'Extensão de joelho sentado', category:'Fortalecimento', objective:'Ativar quadríceps e melhorar controle do joelho.', instructions:['Sente-se com o tronco apoiado e os pés no chão.','Estenda um joelho até a amplitude confortável.','Retorne devagar e repita do outro lado, se indicado.'], precautions:'Evitar compensações do tronco e não insistir em dor aguda ou bloqueio articular.', defaultSets:2, defaultReps:'10 repetições por lado', holdSeconds:0, equipment:'Cadeira' },
  { id:'seated-march', name:'Marcha estacionária sentada', category:'Ativação / Coordenação', objective:'Treinar alternância de membros inferiores e coordenação.', instructions:['Sente-se com os pés apoiados.','Eleve um joelho de cada vez, alternando os lados.','Mantenha o tronco estável e respire normalmente.'], precautions:'Adequar amplitude e ritmo à tolerância. Monitorar sintomas em pacientes cardiopulmonares.', defaultSets:2, defaultReps:'20 alternâncias', holdSeconds:0, equipment:'Cadeira' },
  { id:'shoulder-flexion', name:'Elevação dos braços', category:'Mobilidade', objective:'Trabalhar mobilidade ativa de ombros e controle escapular.', instructions:['Sente-se ou fique em pé com postura confortável.','Eleve os braços à frente até a amplitude tolerada.','Retorne lentamente, sem elevar excessivamente os ombros.'], precautions:'Respeitar limitações pós-operatórias e restrições médicas. Não forçar arco doloroso.', defaultSets:2, defaultReps:'10 repetições', holdSeconds:0, equipment:'Sem equipamento' },
  { id:'scapular-retraction', name:'Retração escapular', category:'Postura / Controle motor', objective:'Treinar controle escapular e percepção postural.', instructions:['Sente-se ou fique em pé com os braços relaxados.','Aproxime suavemente as escápulas, sem elevar os ombros.','Sustente brevemente e relaxe.'], precautions:'Evitar compensar com extensão lombar ou tensão cervical.', defaultSets:2, defaultReps:'10 repetições', holdSeconds:3, equipment:'Sem equipamento' },
  { id:'bridging', name:'Ponte (elevação pélvica)', category:'Fortalecimento', objective:'Fortalecer extensores de quadril e trabalhar estabilidade lombo-pélvica.', instructions:['Deite-se de barriga para cima, joelhos flexionados e pés apoiados.','Ative suavemente o abdome e eleve a pelve.','Desça devagar, mantendo o movimento controlado.'], precautions:'Não executar se houver restrição de posicionamento, dor aguda ou contraindicação pós-operatória. Evitar hiperextensão lombar.', defaultSets:2, defaultReps:'8 repetições', holdSeconds:0, equipment:'Colchonete' },
  { id:'seated-weight-shift', name:'Transferência de peso sentado', category:'Equilíbrio / Neurologia', objective:'Treinar controle de tronco e transferência de peso.', instructions:['Sente-se em superfície firme, com os pés apoiados e supervisão.','Desloque suavemente o tronco para um lado, sem perder o alinhamento.','Retorne ao centro e repita para o outro lado.'], precautions:'Garantir proteção contra quedas. Adaptar amplitude e assistência ao controle de tronco e à capacidade cognitiva.', defaultSets:2, defaultReps:'8 movimentos por lado', holdSeconds:0, equipment:'Cadeira firme' },
  { id:'diaphragmatic-breathing', name:'Respiração diafragmática', category:'Respiratória', objective:'Favorecer percepção ventilatória e controle do padrão respiratório.', instructions:['Adote posição confortável, preferencialmente sentado ou semi-reclinado.','Apoie uma mão sobre o abdome.','Inspire suavemente pelo nariz, percebendo expansão abdominal, e solte o ar sem esforço.'], precautions:'Não realizar inspirações forçadas nem apneias. Monitorar sintomas e sinais vitais quando indicado; interromper se houver tontura ou piora da dispneia.', defaultSets:1, defaultReps:'5 a 10 ciclos', holdSeconds:0, equipment:'Sem equipamento' },
  { id:'facial-smile', name:'Sorriso suave diante do espelho', category:'Paralisia facial', objective:'Facilitar consciência e controle motor facial com movimento suave e simétrico.', instructions:['Posicione-se diante de um espelho, com o rosto relaxado.','Tente esboçar um sorriso pequeno e confortável.','Observe o movimento sem fazer força excessiva; relaxe entre tentativas.'], precautions:'Evitar esforço máximo, repetição até fadiga e movimentos associados exagerados. Individualizar conforme avaliação facial e proteção ocular.', defaultSets:1, defaultReps:'5 tentativas suaves', holdSeconds:0, equipment:'Espelho' },
];
const CATEGORIES = ['Todas', ...Array.from(new Set(EXERCISES.map((e) => e.category)))];

const EXERCISE_IMAGE_POSITIONS: Record<string, { col: number; row: number }> = {
  'ankle-pumps': { col: 0, row: 0 },
  'sit-to-stand': { col: 1, row: 0 },
  'heel-raises': { col: 2, row: 0 },
  'knee-extension': { col: 3, row: 0 },
  'seated-march': { col: 0, row: 1 },
  'shoulder-flexion': { col: 1, row: 1 },
  'scapular-retraction': { col: 2, row: 1 },
  bridging: { col: 3, row: 1 },
  'seated-weight-shift': { col: 0, row: 2 },
  'diaphragmatic-breathing': { col: 1, row: 2 },
  'facial-smile': { col: 2, row: 2 },
};

function ExerciseIllustration({ variant, label }: { variant: string; label: string }) {
  const position = EXERCISE_IMAGE_POSITIONS[variant] ?? { col: 0, row: 0 };
  return (
    <div
      role="img"
      aria-label={`Demonstração ilustrativa em 3D de ${label}, com posição inicial e execução`}
      className="h-28 w-32 shrink-0 rounded-xl border border-slate-100 bg-slate-50"
      style={{
        backgroundImage: `url(${EXERCISE_ATLAS})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: '400% 300%',
        backgroundPosition: `${(position.col / 3) * 100}% ${(position.row / 2) * 100}%`,
      }}
    />
  );
}

interface Props {
  patientId: string;
  prescriptions: PatientExercisePrescription[];
  logs: PatientExerciseLog[];
  onSavePrescription: (value: Omit<PatientExercisePrescription,'id'|'createdAt'|'updatedAt'> & {id?:string}) => Promise<void>;
  onLogExercise: (value: Omit<PatientExerciseLog,'id'|'createdAt'> & {id?:string}) => Promise<void>;
  onUpdatePrescription: (value: PatientExercisePrescription) => Promise<void>;
}
export const ExercisesTab: React.FC<Props> = ({ patientId, prescriptions, logs, onSavePrescription, onLogExercise, onUpdatePrescription }) => {
  const [category, setCategory] = useState('Todas');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ExerciseDefinition | null>(null);
  const [sets, setSets] = useState(2);
  const [reps, setReps] = useState('10 repetições');
  const [frequency, setFrequency] = useState('Conforme orientação em sessão');
  const [saving, setSaving] = useState(false);
  const [notesById, setNotesById] = useState<Record<string,string>>({});
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const filtered = useMemo(() => EXERCISES.filter(e => (category === 'Todas' || e.category === category) && (e.name+' '+e.category+' '+e.objective).toLowerCase().includes(search.toLowerCase())), [category,search]);
  const active = prescriptions.filter(p => p.status === 'ativo');
  const today = new Date().toISOString().slice(0,10);
  const mark = async (p: PatientExercisePrescription, status: 'realizado'|'nao_realizado') => {
    setBusyId(p.id); setError('');
    try { await onLogExercise({ userId: undefined, patientId, prescriptionId:p.id, performedAt:new Date().toISOString(), status, performedSets:p.sets, performedReps:p.reps, notes:notesById[p.id]||'' }); setNotesById(v=>({...v,[p.id]:''})); }
    catch(e){setError(e instanceof Error?e.message:'Não foi possível registrar.');}
    finally{setBusyId('');}
  };
  const add = async () => {
    if(!selected) return;
    setSaving(true); setError('');
    try {
      await onSavePrescription({patientId,userId:undefined,exerciseId:selected.id,exerciseName:selected.name,category:selected.category,objective:selected.objective,instructions:selected.instructions.join('\n'),precautions:selected.precautions,sets,reps,holdSeconds:selected.holdSeconds,frequency,status:'ativo'});
      setSelected(null);
    } catch(e){setError(e instanceof Error?e.message:'Não foi possível vincular o exercício.');}
    finally{setSaving(false);}
  };
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-4">
        <div className="flex items-start gap-3"><Activity className="mt-0.5 h-5 w-5 text-blue-700"/><div><h2 className="font-display text-base font-bold text-[#0B1F3A]">Exercícios do paciente</h2><p className="mt-1 text-xs text-slate-600">Selecione exercícios da biblioteca, ajuste a prescrição e registre a execução durante cada atendimento.</p></div></div>
        <div className="mt-3 flex flex-wrap gap-3 text-xs"><span><b>{active.length}</b> ativos</span><span><b>{logs.filter(l=>l.performedAt.slice(0,10)===today).length}</b> registros hoje</span><span><b>{prescriptions.length}</b> no histórico</span></div>
      </div>
      <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><h3 className="font-bold text-sm text-[#0B1F3A]">Biblioteca de exercícios</h3><p className="text-xs text-slate-500 mt-1">Conteúdo educativo para seleção e adaptação profissional.</p></div><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar exercício..." className="w-full sm:w-64 rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm"/></div></div>
        <div className="flex gap-2 overflow-x-auto pb-1">{CATEGORIES.map(c=><button key={c} onClick={()=>setCategory(c)} className={`rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap ${category===c?'bg-[#1D4ED8] text-white':'bg-slate-100 text-slate-600'}`}>{c}</button>)}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(e=><article key={e.id} className="rounded-xl border border-slate-200 p-3 space-y-3"><div className="flex items-start gap-3"><ExerciseIllustration variant={e.id} label={e.name}/><div className="min-w-0"><div className="text-[10px] font-semibold uppercase tracking-wide text-blue-700">{e.category}</div><h4 className="mt-1 text-sm font-bold text-slate-900">{e.name}</h4><p className="mt-1 text-xs text-slate-600">{e.objective}</p></div></div><details className="text-xs"><summary className="cursor-pointer font-semibold text-blue-700">Como realizar e cuidados</summary><ol className="mt-2 list-decimal pl-4 space-y-1 text-slate-600">{e.instructions.map((step,i)=><li key={i}>{step}</li>)}</ol><p className="mt-2 text-amber-800"><b>Atenção:</b> {e.precautions}</p><p className="mt-1 text-slate-500">Material: {e.equipment}</p></details><button type="button" onClick={()=>{setSelected(e);setSets(e.defaultSets);setReps(e.defaultReps);setFrequency('Conforme orientação em sessão');}} className="inline-flex items-center gap-2 rounded-lg bg-[#1D4ED8] px-3 py-2 text-xs font-semibold text-white"><Plus className="h-3.5 w-3.5"/>Vincular ao paciente</button></article>)}
        </div>
        {filtered.length===0&&<p className="text-sm text-slate-500">Nenhum exercício encontrado.</p>}
      </section>
      {selected&&<div className="rounded-xl border border-blue-200 bg-white p-4 sm:p-5 space-y-3"><div className="flex items-center justify-between"><h3 className="font-bold text-sm">Prescrever: {selected.name}</h3><button onClick={()=>setSelected(null)} className="text-xs text-slate-500">Cancelar</button></div><p className="text-xs text-slate-600">{selected.objective}</p><div className="grid grid-cols-1 sm:grid-cols-3 gap-3"><div className="text-xs font-semibold"><label htmlFor="exercise-sets">Séries</label><div className="mt-1 flex items-center gap-2"><button type="button" aria-label="Diminuir séries" disabled={sets<=1} onClick={()=>setSets(v=>Math.max(1,v-1))} className="h-10 w-10 rounded-lg border border-slate-300 text-lg disabled:opacity-40">−</button><input id="exercise-sets" type="number" inputMode="numeric" min="1" max="50" step="1" value={sets} onChange={e=>{const value=e.currentTarget.valueAsNumber;if(Number.isFinite(value))setSets(Math.min(50,Math.max(1,Math.trunc(value))));}} className="mt-1 min-w-0 flex-1 rounded-lg border p-2 text-center" /><button type="button" aria-label="Aumentar séries" disabled={sets>=50} onClick={()=>setSets(v=>Math.min(50,v+1))} className="h-10 w-10 rounded-lg border border-slate-300 text-lg disabled:opacity-40">+</button></div><p className="mt-1 text-[10px] font-normal text-slate-500">De 1 a 50 séries</p></div><label className="text-xs font-semibold">Repetições / duração<input value={reps} onChange={e=>setReps(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label><label className="text-xs font-semibold">Frequência<input value={frequency} onChange={e=>setFrequency(e.target.value)} className="mt-1 w-full rounded-lg border p-2"/></label></div><button disabled={saving} onClick={add} className="rounded-lg bg-[#1D4ED8] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{saving?'Salvando...':'Adicionar ao prontuário'}</button></div>}
      <section className="space-y-3"><h3 className="font-display text-base font-bold text-[#0B1F3A]">Prescrição vinculada</h3>{prescriptions.length===0?<div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">Ainda não há exercícios vinculados a este paciente.</div>:prescriptions.map(p=>{const history=logs.filter(l=>l.prescriptionId===p.id).sort((a,b)=>b.performedAt.localeCompare(a.performedAt));return <article key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"><div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2"><div><div className="text-[10px] font-semibold uppercase text-blue-700">{p.category} · {p.status}</div><h4 className="font-bold text-sm text-[#0B1F3A]">{p.exerciseName}</h4><p className="mt-1 text-xs text-slate-600">{p.objective}</p></div><div className="text-xs text-slate-600">{p.sets} séries · {p.reps} {p.holdSeconds? `· sustentar ${p.holdSeconds}s`:''}</div></div><details className="text-xs"><summary className="cursor-pointer font-semibold text-blue-700">Instruções e precauções</summary><ol className="list-decimal pl-4 mt-2 space-y-1">{p.instructions.split('\n').map((s,i)=><li key={i}>{s}</li>)}</ol><p className="mt-2 text-amber-800">{p.precautions}</p></details>{p.status==='ativo'?<div className="space-y-2"><input value={notesById[p.id]||''} onChange={e=>setNotesById(v=>({...v,[p.id]:e.target.value}))} placeholder="Observação da execução (opcional)" className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"/><div className="flex flex-wrap gap-2"><button disabled={busyId===p.id} onClick={()=>void mark(p,'realizado')} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"><Check className="h-3.5 w-3.5"/>Marcar realizado</button><button disabled={busyId===p.id} onClick={()=>void mark(p,'nao_realizado')} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">Não realizado</button><button onClick={()=>void onUpdatePrescription({...p,status:'suspenso'})} className="inline-flex items-center gap-1 rounded-lg border border-amber-300 px-3 py-2 text-xs text-amber-800"><PauseCircle className="h-3.5 w-3.5"/>Suspender</button><button onClick={()=>void onUpdatePrescription({...p,status:'concluido'})} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-700">Concluir</button></div></div>:<button onClick={()=>void onUpdatePrescription({...p,status:'ativo'})} className="inline-flex items-center gap-1 rounded-lg border border-blue-200 px-3 py-2 text-xs text-blue-700"><PlayCircle className="h-3.5 w-3.5"/>Reativar exercício</button>}{history.length>0&&<div className="border-t pt-3"><h5 className="text-xs font-semibold text-slate-700 mb-2">Histórico de execução</h5><div className="space-y-2">{history.slice(0,6).map(log=><div key={log.id} className="flex flex-wrap items-center justify-between gap-2 text-xs"><span className={log.status==='realizado'?'text-emerald-700':'text-amber-800'}>{log.status==='realizado'?'✓ Realizado':'Não realizado'} · {new Date(log.performedAt).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'})}</span><span className="text-slate-500">{log.performedSets} séries · {log.performedReps}</span>{log.notes&&<p className="w-full text-slate-500">{log.notes}</p>}</div>)}</div></div>}</article>})}</section>
      <div className="flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900"><ShieldAlert className="h-4 w-4 shrink-0"/><p>As imagens em 3D são ilustrativas e as orientações são gerais. A escolha, dose, progressão e contraindicações devem ser individualizadas após avaliação fisioterapêutica. Não substituem protocolos específicos nem avaliação clínica.</p></div>
      {error&&<p role="alert" className="text-xs text-red-700">{error}</p>}
    </div>
  );
};
