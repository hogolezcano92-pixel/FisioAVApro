import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { INSTRUMENTS_BY_ID } from '../data/scalesAndTests';
import { EvaluationStatus, ScaleEntry } from '../types/clinical';

interface ScaleRunnerProps {
  scaleId: string;
  entry: ScaleEntry;
  onChange: (updated: ScaleEntry) => void;
}

const BERG_ITEMS = [
  '1. Sentado para em pé',
  '2. Em pé sem apoio',
  '3. Sentado sem apoio',
  '4. Em pé para sentado',
  '5. Transferências',
  '6. Em pé com os olhos fechados',
  '7. Em pé com os pés juntos',
  '8. Alcançar à frente com o braço estendido',
  '9. Pegar objeto do chão',
  '10. Virar-se para olhar para trás',
  '11. Girar 360 graus',
  '12. Posicionar os pés alternadamente no degrau',
  '13. Em pé com um pé à frente (Tandem)',
  '14. Em pé sobre uma perna (Unipodal)',
];

const BARTHEL_ITEMS = [
  { key: 'b_alim', label: 'Alimentação', options: [0, 5, 10] },
  { key: 'b_banho', label: 'Banho', options: [0, 5] },
  { key: 'b_higiene', label: 'Higiene pessoal', options: [0, 5] },
  { key: 'b_vestir', label: 'Vestir-se', options: [0, 5, 10] },
  { key: 'b_intest', label: 'Controle intestinal', options: [0, 5, 10] },
  { key: 'b_vesic', label: 'Controle vesical', options: [0, 5, 10] },
  { key: 'b_vaso', label: 'Uso do vaso sanitário', options: [0, 5, 10] },
  { key: 'b_transf', label: 'Transferência cadeira-leito', options: [0, 5, 10, 15] },
  { key: 'b_deamb', label: 'Deambulação', options: [0, 5, 10, 15] },
  { key: 'b_escadas', label: 'Subir/descer escadas', options: [0, 5, 10] },
];

const LAWTON_ITEMS = [
  '1. Uso do telefone',
  '2. Viagens / Transporte',
  '3. Fazer compras',
  '4. Preparo de refeições',
  '5. Trabalho doméstico',
  '6. Uso de medicações',
  '7. Manejo de finanças',
];

export const ScaleRunner: React.FC<ScaleRunnerProps> = ({ scaleId, entry, onChange }) => {
  const [expanded, setExpanded] = useState(false);
  const instrument = INSTRUMENTS_BY_ID[scaleId];
  if (!instrument) return null;

  const setStatus = (status: EvaluationStatus) => {
    onChange({ ...entry, status });
  };

  const updateSubScore = (key: string, val: number | string) => {
    const nextSubs = { ...entry.subScores, [key]: val };
    let score = entry.score;
    let interpretation = entry.interpretation;

    if (scaleId === 'berg-scale') {
      const total = BERG_ITEMS.reduce((acc, _, idx) => acc + Number(nextSubs[`berg_${idx}`] ?? 0), 0);
      score = `${total} / 56`;
      interpretation = total < 45 ? 'Pontuação < 45 (maior risco de quedas na literatura geriátrica)' : 'Pontuação ≥ 45 (melhor estabilidade funcional)';
    } else if (scaleId === 'barthel-index') {
      const total = BARTHEL_ITEMS.reduce((acc, item) => acc + Number(nextSubs[item.key] ?? 0), 0);
      score = `${total} / 100`;
      if (total === 100) interpretation = 'Independência nas atividades avaliadas';
      else if (total >= 60) interpretation = 'Dependência leve (60–95)';
      else if (total >= 40) interpretation = 'Dependência moderada (40–55)';
      else if (total >= 20) interpretation = 'Dependência grave (20–35)';
      else interpretation = 'Dependência total (< 20)';
    } else if (scaleId === 'sppb') {
      const eq = Number(nextSubs.sppb_eq ?? 0);
      const mar = Number(nextSubs.sppb_mar ?? 0);
      const cad = Number(nextSubs.sppb_cad ?? 0);
      const total = eq + mar + cad;
      score = `${total} / 12`;
      if (total <= 3) interpretation = 'Incapacidade ou desempenho muito baixo (0–3)';
      else if (total <= 6) interpretation = 'Baixo desempenho (4–6)';
      else if (total <= 9) interpretation = 'Desempenho moderado (7–9)';
      else interpretation = 'Bom desempenho físico (10–12)';
    } else if (scaleId === 'lawton-brody') {
      const total = LAWTON_ITEMS.reduce((acc, _, idx) => acc + Number(nextSubs[`law_${idx}`] ?? 1), 0);
      score = `${total} / 21`;
      interpretation = total >= 20 ? 'Independência para AIVDs' : total >= 14 ? 'Dependência parcial para AIVDs' : 'Dependência importante para AIVDs';
    } else if (scaleId === 'dhi-vestibular') {
      const f = Number(nextSubs.dhi_fis ?? 0);
      const e = Number(nextSubs.dhi_emo ?? 0);
      const fu = Number(nextSubs.dhi_fun ?? 0);
      const total = f + e + fu;
      score = `${total} / 100 (F:${f} E:${e} Fu:${fu})`;
      if (total <= 30) interpretation = 'Impacto leve (0–30)';
      else if (total <= 60) interpretation = 'Impacto moderado (31–60)';
      else interpretation = 'Impacto severo (61–100)';
    }

    onChange({
      ...entry,
      status: 'avaliado',
      subScores: nextSubs,
      score,
      interpretation,
    });
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-display text-sm font-bold text-[#0B1F3A]">{instrument.name}</h4>
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-[#1D4ED8] hover:bg-blue-50"
            >
              <Info className="h-3.5 w-3.5" />
              <span>{expanded ? 'Ocultar guia' : 'Instruções e referência'}</span>
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>
          <p className="text-xs text-slate-600">{instrument.objective}</p>
        </div>

        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 shrink-0 self-start">
          {(['avaliado', 'nao_avaliado', 'nao_aplicavel'] as EvaluationStatus[]).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatus(st)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors whitespace-nowrap ${
                entry.status === st
                  ? 'bg-white text-[#0B1F3A] shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {st === 'avaliado' ? 'Avaliado' : st === 'nao_avaliado' ? 'Não avaliado' : 'Não aplicável'}
            </button>
          ))}
        </div>
      </div>

      {expanded && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-1.5 text-slate-700">
          <div><span className="font-semibold text-[#0B1F3A]">Instruções:</span> {instrument.instructions}</div>
          <div><span className="font-semibold text-[#0B1F3A]">Pontuação:</span> {instrument.scoringGuide}</div>
          <div><span className="font-semibold text-[#0B1F3A]">Interpretação validada:</span> {instrument.interpretation}</div>
          <div><span className="font-semibold text-[#0B1F3A]">Referência:</span> {instrument.reference}</div>
          {instrument.licensingNote && (
            <div className="text-amber-800 font-medium">Nota: {instrument.licensingNote}</div>
          )}
        </div>
      )}

      {entry.status === 'avaliado' && (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-3">
          {/* Interactive calculators for specific scales */}
          {scaleId === 'house-brackmann' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Graduação House-Brackmann</label>
              <select
                value={entry.score}
                onChange={(e) => {
                  const val = e.target.value;
                  onChange({
                    ...entry,
                    score: val,
                    interpretation:
                      val.includes('IV') || val.includes('V') || val.includes('VI')
                        ? 'Fechamento ocular incompleto / risco corneano — priorizar proteção ocular'
                        : val
                        ? 'Função facial com fechamento ocular preservado'
                        : '',
                  });
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Selecionar grau...</option>
                <option value="Grau I — Normal">Grau I — Função facial normal em todas as áreas</option>
                <option value="Grau II — Disfunção leve">Grau II — Disfunção leve (leve fraqueza, fechamento ocular completo)</option>
                <option value="Grau III — Disfunção moderada">Grau III — Disfunção moderada (assimetria óbvia, fechamento ocular com esforço)</option>
                <option value="Grau IV — Disfunção moderadamente grave">Grau IV — Disfunção moderadamente grave (fechamento ocular incompleto)</option>
                <option value="Grau V — Disfunção grave">Grau V — Disfunção grave (movimento quase imperceptível, fechamento incompleto)</option>
                <option value="Grau VI — Paralisia total">Grau VI — Paralisia total (ausência de movimento)</option>
              </select>
            </div>
          )}

          {scaleId === 'mmrc-dispneia' && (
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">Grau de Dispneia (mMRC)</label>
              <select
                value={entry.score}
                onChange={(e) => {
                  const val = e.target.value;
                  onChange({
                    ...entry,
                    score: val,
                    interpretation: val.startsWith('Grau 0') || val.startsWith('Grau 1') ? 'Dispneia leve aos grandes esforços' : val ? 'Dispneia funcionalmente limitante (≥ Grau 2)' : '',
                  });
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="">Selecionar grau mMRC...</option>
                <option value="Grau 0">Grau 0 — Falta de ar apenas com exercícios intensos</option>
                <option value="Grau 1">Grau 1 — Falta de ar ao andar rápido ou subir ladeira leve</option>
                <option value="Grau 2">Grau 2 — Anda mais devagar que pessoas da mesma idade por falta de ar</option>
                <option value="Grau 3">Grau 3 — Para para respirar após caminhar cerca de 100 metros</option>
                <option value="Grau 4">Grau 4 — Muita falta de ar para sair de casa ou ao vestir-se</option>
              </select>
            </div>
          )}

          {scaleId === 'berg-scale' && (
            <details className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
              <summary className="cursor-pointer text-xs font-semibold text-[#1D4ED8]">
                Pontuar os 14 itens da Escala de Berg (0–4 cada)
              </summary>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {BERG_ITEMS.map((item, idx) => (
                  <div key={item} className="flex items-center justify-between gap-2 bg-white rounded-md border border-slate-200 px-2.5 py-1.5">
                    <span className="text-xs text-slate-700 truncate">{item}</span>
                    <select
                      value={entry.subScores[`berg_${idx}`] ?? 0}
                      onChange={(e) => updateSubScore(`berg_${idx}`, Number(e.target.value))}
                      className="rounded border border-slate-300 px-2 py-1 text-xs font-mono"
                    >
                      {[0, 1, 2, 3, 4].map((v) => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </details>
          )}

          {scaleId === 'barthel-index' && (
            <details className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
              <summary className="cursor-pointer text-xs font-semibold text-[#1D4ED8]">
                Pontuar os 10 domínios do Índice de Barthel (0–100)
              </summary>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {BARTHEL_ITEMS.map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-2 bg-white rounded-md border border-slate-200 px-2.5 py-1.5">
                    <span className="text-xs text-slate-700">{item.label}</span>
                    <select
                      value={entry.subScores[item.key] ?? 0}
                      onChange={(e) => updateSubScore(item.key, Number(e.target.value))}
                      className="rounded border border-slate-300 px-2 py-1 text-xs font-mono"
                    >
                      {item.options.map((v) => (
                        <option key={v} value={v}>{v} pts</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </details>
          )}

          {scaleId === 'sppb' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Equilíbrio (0–4)</label>
                <select
                  value={entry.subScores.sppb_eq ?? 0}
                  onChange={(e) => updateSubScore('sppb_eq', Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono"
                >
                  {[0, 1, 2, 3, 4].map((v) => <option key={v} value={v}>{v} pontos</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Velocidade Marcha (0–4)</label>
                <select
                  value={entry.subScores.sppb_mar ?? 0}
                  onChange={(e) => updateSubScore('sppb_mar', Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono"
                >
                  {[0, 1, 2, 3, 4].map((v) => <option key={v} value={v}>{v} pontos</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Sentar/Levantar 5x (0–4)</label>
                <select
                  value={entry.subScores.sppb_cad ?? 0}
                  onChange={(e) => updateSubScore('sppb_cad', Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono"
                >
                  {[0, 1, 2, 3, 4].map((v) => <option key={v} value={v}>{v} pontos</option>)}
                </select>
              </div>
            </div>
          )}

          {scaleId === 'lawton-brody' && (
            <details className="rounded-lg border border-slate-200 bg-slate-50/70 p-3">
              <summary className="cursor-pointer text-xs font-semibold text-[#1D4ED8]">
                Pontuar os 7 itens de Lawton e Brody (1 = dependente, 2 = auxílio, 3 = independente)
              </summary>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {LAWTON_ITEMS.map((item, idx) => (
                  <div key={item} className="flex items-center justify-between gap-2 bg-white rounded-md border border-slate-200 px-2.5 py-1.5">
                    <span className="text-xs text-slate-700">{item}</span>
                    <select
                      value={entry.subScores[`law_${idx}`] ?? 1}
                      onChange={(e) => updateSubScore(`law_${idx}`, Number(e.target.value))}
                      className="rounded border border-slate-300 px-2 py-1 text-xs font-mono"
                    >
                      <option value={1}>1 (Incapaz)</option>
                      <option value={2}>2 (Auxílio parcial)</option>
                      <option value={3}>3 (Independente)</option>
                    </select>
                  </div>
                ))}
              </div>
            </details>
          )}

          {scaleId === 'dhi-vestibular' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Domínio Físico (0–28)</label>
                <input
                  type="number"
                  min={0}
                  max={28}
                  value={entry.subScores.dhi_fis ?? ''}
                  onChange={(e) => updateSubScore('dhi_fis', Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Domínio Emocional (0–36)</label>
                <input
                  type="number"
                  min={0}
                  max={36}
                  value={entry.subScores.dhi_emo ?? ''}
                  onChange={(e) => updateSubScore('dhi_emo', Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Domínio Funcional (0–36)</label>
                <input
                  type="number"
                  min={0}
                  max={36}
                  value={entry.subScores.dhi_fun ?? ''}
                  onChange={(e) => updateSubScore('dhi_fun', Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono"
                />
              </div>
            </div>
          )}

          {/* Universal score + interpretation + notes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Pontuação / Resultado
              </label>
              <input
                type="text"
                value={entry.score}
                onChange={(e) => onChange({ ...entry, score: e.target.value })}
                placeholder="Ex.: 48/56 ou 11,4 seg"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono tabular-nums"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Interpretação Clínica (quando validada)
              </label>
              <input
                type="text"
                value={entry.interpretation}
                onChange={(e) => onChange({ ...entry, interpretation: e.target.value })}
                placeholder="Interpretação compatível com a escala..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Observações de Aplicação
            </label>
            <input
              type="text"
              value={entry.notes}
              onChange={(e) => onChange({ ...entry, notes: e.target.value })}
              placeholder="Uso de dispositivo auxiliar, intercorrências, condições do teste..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
};
