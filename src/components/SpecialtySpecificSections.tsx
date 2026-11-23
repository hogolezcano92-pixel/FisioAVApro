import React from 'react';
import { AlertTriangle, Camera, Eye, ShieldAlert } from 'lucide-react';
import {
  CardiorespiratoryMonitoringData,
  FacialPalsyData,
  PelvicConsentData,
  UtiClinicalData,
} from '../types/clinical';
import { calculateMrcSumScore, calculateSunnybrookScore } from '../utils/calculations';

/* ======================== PARALISIA FACIAL ======================== */
interface FacialPalsySectionProps {
  data: FacialPalsyData;
  section: 'anamnese' | 'avaliacao' | 'testes';
  onChange: (next: FacialPalsyData) => void;
}

export const FacialPalsySection: React.FC<FacialPalsySectionProps> = ({ data, section, onChange }) => {
  const sb = calculateSunnybrookScore(data);
  const showCornealAlert = data.incompleteEyeClosure || data.absentBellPhenomenon || data.cornealPainOrDryness;

  if (section === 'anamnese') {
    return (
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Data de início dos sintomas</label>
            <input
              type="date"
              value={data.onsetDate}
              onChange={(e) => onChange({ ...data, onsetDate: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Lado afetado</label>
            <select
              value={data.affectedSide}
              onChange={(e) => onChange({ ...data, affectedSide: e.target.value as FacialPalsyData['affectedSide'] })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Selecionar...</option>
              <option value="Direita">Hemiface Direita</option>
              <option value="Esquerda">Hemiface Esquerda</option>
              <option value="Bilateral">Bilateral</option>
              <option value="Não definido">Não definido</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Histórico de episódios anteriores</label>
            <input
              type="text"
              value={data.previousEpisodes}
              onChange={(e) => onChange({ ...data, previousEpisodes: e.target.value })}
              placeholder="Ex.: Primeiro episódio ou recidiva"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Evolução clínica (súbita, progressiva, recuperação parcial)</label>
            <textarea
              rows={2}
              value={data.evolution}
              onChange={(e) => onChange({ ...data, evolution: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Diagnóstico médico informado (ex.: Paralisia de Bell, Ramsay Hunt, pós-cirúrgica)</label>
            <textarea
              rows={2}
              value={data.medicalDiagnosis}
              onChange={(e) => onChange({ ...data, medicalDiagnosis: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tratamentos e medicamentos (corticoide, antiviral, colírios, pomada)</label>
            <textarea
              rows={2}
              value={data.treatmentsAndMeds}
              onChange={(e) => onChange({ ...data, treatmentsAndMeds: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Histórico de infecção prévia (viral, otite, herpes zoster)</label>
            <textarea
              rows={2}
              value={data.infectionHistory}
              onChange={(e) => onChange({ ...data, infectionHistory: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Dor retroauricular</label>
            <input
              type="text"
              value={data.retroauricularPain}
              onChange={(e) => onChange({ ...data, retroauricularPain: e.target.value })}
              placeholder="Ausente / Presente (intensidade)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Alterações de paladar</label>
            <input
              type="text"
              value={data.tasteChanges}
              onChange={(e) => onChange({ ...data, tasteChanges: e.target.value })}
              placeholder="Normogeusia / Hipogeusia / Ageusia"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Lacrimejamento</label>
            <input
              type="text"
              value={data.lacrimation}
              onChange={(e) => onChange({ ...data, lacrimation: e.target.value })}
              placeholder="Normal / Diminuído / Epífora"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Alterações de salivação</label>
            <input
              type="text"
              value={data.salivationChanges}
              onChange={(e) => onChange({ ...data, salivationChanges: e.target.value })}
              placeholder="Normal / Sialorreia / Xerostomia"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Dificuldade para mastigar, falar ou beber (escape alimentar/líquido, retenção em vestíbulo)
          </label>
          <textarea
            rows={2}
            value={data.functionalDifficulties}
            onChange={(e) => onChange({ ...data, functionalDifficulties: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
    );
  }

  if (section === 'avaliacao') {
    return (
      <div className="space-y-6">
        {/* Corneal & Neurological Red Flag Alert Panel */}
        <div className={`rounded-xl border p-4 ${showCornealAlert || data.centralNeuroFlags ? 'border-red-300 bg-red-50' : 'border-amber-200 bg-amber-50/70'}`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${showCornealAlert || data.centralNeuroFlags ? 'text-red-700' : 'text-amber-700'}`} />
            <div className="flex-1 space-y-3">
              <div>
                <h4 className="font-display text-sm font-bold text-slate-900">
                  Triagem de Proteção Corneana e Sinais Neurológicos de Alerta
                </h4>
                <p className="text-xs text-slate-700 mt-0.5">
                  Marque os achados presentes para ativar o alerta clínico de proteção ocular e encaminhamento médico no relatório.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <label className="flex items-center gap-2 rounded-lg bg-white/80 border border-slate-200 px-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.incompleteEyeClosure}
                    onChange={(e) => onChange({ ...data, incompleteEyeClosure: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-red-600"
                  />
                  <span>Fechamento ocular incompleto (Lagoftalmo)</span>
                </label>
                <label className="flex items-center gap-2 rounded-lg bg-white/80 border border-slate-200 px-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.absentBellPhenomenon}
                    onChange={(e) => onChange({ ...data, absentBellPhenomenon: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-red-600"
                  />
                  <span>Fenômeno de Bell ausente ou insuficiente</span>
                </label>
                <label className="flex items-center gap-2 rounded-lg bg-white/80 border border-slate-200 px-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.cornealPainOrDryness}
                    onChange={(e) => onChange({ ...data, cornealPainOrDryness: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-red-600"
                  />
                  <span>Dor ocular, hiperemia, ardor ou ressecamento corneano</span>
                </label>
                <label className="flex items-center gap-2 rounded-lg bg-white/80 border border-slate-200 px-3 py-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.centralNeuroFlags}
                    onChange={(e) => onChange({ ...data, centralNeuroFlags: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-red-600"
                  />
                  <span>Sinais neurológicos centrais (poupança frontal, déficit em membros, diplopia)</span>
                </label>
              </div>
              {(showCornealAlert || data.centralNeuroFlags) && (
                <div className="rounded-lg bg-red-100/90 border border-red-300 px-3 py-2 text-xs font-medium text-red-900">
                  ALERTA ATIVO: {showCornealAlert ? 'Risco de exposição/úlcera de córnea — orientar lubrificação ocular prescrita, oclusão noturna segura e avaliação médica/oftalmológica. ' : ''}
                  {data.centralNeuroFlags ? 'Sinais de alerta neurológico central — encaminhamento médico imediato.' : ''}
                </div>
              )}
              <input
                type="text"
                value={data.cornealAlertNotes}
                onChange={(e) => onChange({ ...data, cornealAlertNotes: e.target.value })}
                placeholder="Condutas de proteção ocular orientadas / encaminhamento médico..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Bilateral Hemiface Comparison Table */}
        <div>
          <h4 className="font-display text-sm font-bold text-[#0B1F3A] mb-2">
            Avaliação Comparativa entre Hemiface Direita e Esquerda
          </h4>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700">
                <tr>
                  <th className="px-3 py-2.5">Função / Movimento Facial</th>
                  <th className="px-3 py-2.5">Hemiface Direita</th>
                  <th className="px-3 py-2.5">Hemiface Esquerda</th>
                  <th className="px-3 py-2.5">Observações / Assimetria</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {data.items.map((item, idx) => (
                  <tr key={item.id}>
                    <td className="px-3 py-2 font-medium text-slate-800">{item.label}</td>
                    <td className="px-3 py-2">
                      <select
                        value={item.rightStatus}
                        onChange={(e) => {
                          const next = [...data.items];
                          next[idx] = { ...item, rightStatus: e.target.value };
                          onChange({ ...data, items: next });
                        }}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                      >
                        <option value="">Selecionar...</option>
                        <option value="Normal / Simétrico">Normal / Simétrico</option>
                        <option value="Movimento parcial">Movimento parcial</option>
                        <option value="Esboço de contração">Esboço de contração</option>
                        <option value="Ausente">Ausente</option>
                        <option value="Hipertonia / Sincinesia">Hipertonia / Sincinesia</option>
                        <option value="Não avaliado">Não avaliado</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={item.leftStatus}
                        onChange={(e) => {
                          const next = [...data.items];
                          next[idx] = { ...item, leftStatus: e.target.value };
                          onChange({ ...data, items: next });
                        }}
                        className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                      >
                        <option value="">Selecionar...</option>
                        <option value="Normal / Simétrico">Normal / Simétrico</option>
                        <option value="Movimento parcial">Movimento parcial</option>
                        <option value="Esboço de contração">Esboço de contração</option>
                        <option value="Ausente">Ausente</option>
                        <option value="Hipertonia / Sincinesia">Hipertonia / Sincinesia</option>
                        <option value="Não avaliado">Não avaliado</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) => {
                          const next = [...data.items];
                          next[idx] = { ...item, notes: e.target.value };
                          onChange({ ...data, items: next });
                        }}
                        placeholder="Detalhes..."
                        className="w-full rounded border border-slate-300 px-2 py-1.5 text-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Simetria em repouso e controle motor seletivo</label>
            <textarea
              rows={2}
              value={data.restingSymmetry}
              onChange={(e) => onChange({ ...data, restingSymmetry: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Avaliação de proteção ocular e piscar</label>
            <textarea
              rows={2}
              value={data.eyeProtection}
              onChange={(e) => onChange({ ...data, eyeProtection: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Sincinesias observadas</label>
            <textarea
              rows={2}
              value={data.synkinesisNotes}
              onChange={(e) => onChange({ ...data, synkinesisNotes: e.target.value })}
              placeholder="Ex.: Oculo-oral, oro-ocular, platisma..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Contraturas e hipertonia muscular</label>
            <textarea
              rows={2}
              value={data.contracturesNotes}
              onChange={(e) => onChange({ ...data, contracturesNotes: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Sensibilidade facial e controle seletivo</label>
            <textarea
              rows={2}
              value={data.facialSensitivity}
              onChange={(e) => onChange({ ...data, facialSensitivity: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Fala, articulação, mastigação e vedamento labial</label>
            <textarea
              rows={2}
              value={data.chewingLipSeal}
              onChange={(e) => onChange({ ...data, chewingLipSeal: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-[#0B1F3A] mb-2">
            <Camera className="h-4 w-4 text-[#1D4ED8]" />
            <span>Registro Fotográfico Padronizado (Mediante Autorização na Etapa 1)</span>
          </div>
          <input
            type="text"
            value={data.photoRecordNotes}
            onChange={(e) => onChange({ ...data, photoRecordNotes: e.target.value })}
            placeholder="Ex.: Sequência padronizada realizada (repouso, sobrancelha, fechamento ocular suave/forçado, sorriso, bico, bochechas)..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
          />
        </div>
      </div>
    );
  }

  // Section 'testes' -> Sunnybrook Facial Grading System Interactive Calculator
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h4 className="font-display text-sm font-bold text-[#0B1F3A]">
            Sunnybrook Facial Grading System (Cálculo Automático)
          </h4>
          <p className="text-xs text-slate-500">
            Escore Composto = Movimento Voluntário (×4) − Simetria em Repouso (×5) − Sincinesia (0–100)
          </p>
        </div>
        <div className="rounded-lg bg-[#0B1F3A] px-4 py-2 text-right text-white">
          <div className="text-[10px] text-slate-300">Escore Composto</div>
          <div className="font-mono text-lg font-bold tabular-nums">{sb.composite} / 100</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
        {/* Resting Symmetry */}
        <div className="rounded-lg border border-slate-200 p-3 space-y-2">
          <div className="font-semibold text-[#0B1F3A]">A. Simetria em Repouso (Total ×5 = {sb.restingTotal})</div>
          <div>
            <label className="block text-slate-600 mb-1">Olho (fenda palpebral)</label>
            <select
              value={data.sunnybrookResting.eye}
              onChange={(e) => onChange({ ...data, sunnybrookResting: { ...data.sunnybrookResting, eye: Number(e.target.value) } })}
              className="w-full rounded border border-slate-300 px-2 py-1.5"
            >
              <option value={0}>0 — Normal</option>
              <option value={1}>1 — Estreito ou alargado</option>
              <option value={2}>2 — Cirurgia palpebral / ectrópio</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-600 mb-1">Bochecha (sulco nasolabial)</label>
            <select
              value={data.sunnybrookResting.cheek}
              onChange={(e) => onChange({ ...data, sunnybrookResting: { ...data.sunnybrookResting, cheek: Number(e.target.value) } })}
              className="w-full rounded border border-slate-300 px-2 py-1.5"
            >
              <option value={0}>0 — Normal</option>
              <option value={1}>1 — Ausente ou menos pronunciado</option>
              <option value={2}>2 — Mais pronunciado</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-600 mb-1">Boca (comissura labial)</label>
            <select
              value={data.sunnybrookResting.mouth}
              onChange={(e) => onChange({ ...data, sunnybrookResting: { ...data.sunnybrookResting, mouth: Number(e.target.value) } })}
              className="w-full rounded border border-slate-300 px-2 py-1.5"
            >
              <option value={0}>0 — Normal</option>
              <option value={1}>1 — Comissura caída ou repuxada</option>
            </select>
          </div>
        </div>

        {/* Voluntary Movement */}
        <div className="rounded-lg border border-slate-200 p-3 space-y-2">
          <div className="font-semibold text-[#0B1F3A]">B. Movimento Voluntário (Total ×4 = {sb.voluntaryTotal})</div>
          {(
            [
              ['forehead', 'Elevar sobrancelha (Frontal)'],
              ['eyeClosure', 'Fechamento ocular suave'],
              ['openMouthSmile', 'Sorriso aberto'],
              ['snarl', 'Elevar lábio superior (Snarl)'],
              ['lipPucker', 'Bico (Protrusão labial)'],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-2">
              <span className="text-slate-700">{label}</span>
              <select
                value={data.sunnybrookVoluntary[key]}
                onChange={(e) =>
                  onChange({
                    ...data,
                    sunnybrookVoluntary: { ...data.sunnybrookVoluntary, [key]: Number(e.target.value) },
                  })
                }
                className="rounded border border-slate-300 px-2 py-1 font-mono"
              >
                <option value={1}>1 (Sem mov.)</option>
                <option value={2}>2 (Início leve)</option>
                <option value={3}>3 (Mov. leve)</option>
                <option value={4}>4 (Quase completo)</option>
                <option value={5}>5 (Completo)</option>
              </select>
            </div>
          ))}
        </div>

        {/* Synkinesis */}
        <div className="rounded-lg border border-slate-200 p-3 space-y-2">
          <div className="font-semibold text-[#0B1F3A]">C. Sincinesia (Total = {sb.synkinesisTotal})</div>
          {(
            [
              ['forehead', 'Ao elevar sobrancelha'],
              ['eyeClosure', 'Ao fechar os olhos'],
              ['openMouthSmile', 'Ao sorrir aberto'],
              ['snarl', 'Ao elevar lábio superior'],
              ['lipPucker', 'Ao fazer bico'],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between gap-2">
              <span className="text-slate-700">{label}</span>
              <select
                value={data.sunnybrookSynkinesis[key]}
                onChange={(e) =>
                  onChange({
                    ...data,
                    sunnybrookSynkinesis: { ...data.sunnybrookSynkinesis, [key]: Number(e.target.value) },
                  })
                }
                className="rounded border border-slate-300 px-2 py-1 font-mono"
              >
                <option value={0}>0 (Nenhuma)</option>
                <option value={1}>1 (Leve)</option>
                <option value={2}>2 (Moderada)</option>
                <option value={3}>3 (Severa)</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ======================== PÉLVICA CONSENTIMENTO & OXFORD ======================== */
interface PelvicSectionProps {
  data: PelvicConsentData;
  onChange: (next: PelvicConsentData) => void;
}

export const PelvicSection: React.FC<PelvicSectionProps> = ({ data, onChange }) => {
  const canRecordIntimate =
    data.intimateAssessmentStatus === 'Realizada com consentimento específico' &&
    data.consentSignedByPatient;

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50/70 p-3.5">
        <ShieldAlert className="h-5 w-5 text-[#1D4ED8] shrink-0 mt-0.5" />
        <div className="text-xs text-slate-700 space-y-1">
          <div className="font-bold text-[#0B1F3A]">Termo de Consentimento para Avaliação do Assoalho Pélvico</div>
          <p>
            Avaliações íntimas (palpação vaginal ou anal) somente devem ser realizadas mediante explicação prévia, consentimento livre e esclarecido e registro explícito de realização ou não realização.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Registro da realização da avaliação íntima</label>
          <select
            value={data.intimateAssessmentStatus}
            onChange={(e) =>
              onChange({
                ...data,
                intimateAssessmentStatus: e.target.value as PelvicConsentData['intimateAssessmentStatus'],
              })
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Selecionar status...</option>
            <option value="Realizada com consentimento específico">Realizada com consentimento específico</option>
            <option value="Não realizada - sem consentimento">Não realizada — sem consentimento do paciente</option>
            <option value="Não indicada - avaliação externa apenas">Não indicada — avaliação externa / funcional apenas</option>
            <option value="Não avaliada">Não avaliada nesta sessão</option>
          </select>
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2.5 rounded-lg border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs font-medium text-slate-800 cursor-pointer w-full">
            <input
              type="checkbox"
              checked={data.consentSignedByPatient}
              onChange={(e) => onChange({ ...data, consentSignedByPatient: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-[#1D4ED8]"
            />
            <span>Confirmo consentimento específico do paciente registrado</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1">Observações sobre consentimento / recusa / presença de acompanhante</label>
        <input
          type="text"
          value={data.consentNotes}
          onChange={(e) => onChange({ ...data, consentNotes: e.target.value })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </div>

      {canRecordIntimate ? (
        <div className="space-y-4 border-t border-slate-200 pt-4">
          <h4 className="font-display text-sm font-bold text-[#0B1F3A]">
            Avaliação Muscular do Assoalho Pélvico (Oxford Modificada & Esquema PERFECT)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Escala Oxford Modificada (0–5)</label>
              <select
                value={data.oxfordGrade}
                onChange={(e) => onChange({ ...data, oxfordGrade: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Selecionar...</option>
                <option value="0 — Ausência de contração">0 — Ausência de contração</option>
                <option value="1 — Tremor / esboço">1 — Tremor / esboço</option>
                <option value="2 — Fraca sem elevação">2 — Fraca sem elevação</option>
                <option value="3 — Moderada com leve elevação">3 — Moderada com leve elevação</option>
                <option value="4 — Boa contra resistência leve">4 — Boa contra resistência leve</option>
                <option value="5 — Forte contra resistência">5 — Forte contra resistência</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">P (Power) / E (Endurance em seg)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={data.perfectP}
                  onChange={(e) => onChange({ ...data, perfectP: e.target.value })}
                  placeholder="P (0-5)"
                  className="rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-mono"
                />
                <input
                  type="text"
                  value={data.perfectE}
                  onChange={(e) => onChange({ ...data, perfectE: e.target.value })}
                  placeholder="E (seg)"
                  className="rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">R (Repetições) / F (Fibras rápidas)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={data.perfectR}
                  onChange={(e) => onChange({ ...data, perfectR: e.target.value })}
                  placeholder="R (reps)"
                  className="rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-mono"
                />
                <input
                  type="text"
                  value={data.perfectF}
                  onChange={(e) => onChange({ ...data, perfectF: e.target.value })}
                  placeholder="F (reps)"
                  className="rounded-lg border border-slate-300 px-2.5 py-2 text-xs font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Coordenação motora / Sinergia acessória</label>
              <input
                type="text"
                value={data.coordination}
                onChange={(e) => onChange({ ...data, coordination: e.target.value })}
                placeholder="Ex.: Coordenação preservada / co-contração de glúteos/adutores"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Capacidade de relaxamento pós-contração</label>
              <input
                type="text"
                value={data.relaxationCapacity}
                onChange={(e) => onChange({ ...data, relaxationCapacity: e.target.value })}
                placeholder="Ex.: Completo / parcial / hipertonia"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-xs text-slate-600">
          Os campos de palpação íntima (Oxford / PERFECT) permanecem bloqueados até que o status &ldquo;Realizada com consentimento específico&rdquo; e a confirmação do consentimento estejam marcados.
        </div>
      )}
    </div>
  );
};

/* ======================== CARDIORRESPIRATÓRIA MONITORAMENTO ======================== */
interface CardioMonitoringProps {
  data: CardiorespiratoryMonitoringData;
  onChange: (next: CardiorespiratoryMonitoringData) => void;
}

export const CardioMonitoringSection: React.FC<CardioMonitoringProps> = ({ data, onChange }) => {
  return (
    <div className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
      <h4 className="font-display text-sm font-bold text-[#0B1F3A]">
        Segurança, Função Muscular Respiratória e Monitoramento em Testes Funcionais
      </h4>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">PImáx (cmH2O - Manovacuometria)</label>
          <input
            type="text"
            value={data.pimaxCmH2O}
            onChange={(e) => onChange({ ...data, pimaxCmH2O: e.target.value })}
            placeholder="Ex.: -75 cmH2O ou Não disponível"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">PEmáx (cmH2O - Manovacuometria)</label>
          <input
            type="text"
            value={data.pemaxCmH2O}
            onChange={(e) => onChange({ ...data, pemaxCmH2O: e.target.value })}
            placeholder="Ex.: +95 cmH2O ou Não disponível"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Pico de Fluxo Expiratório (L/min)</label>
          <input
            type="text"
            value={data.peakFlowLMin}
            onChange={(e) => onChange({ ...data, peakFlowLMin: e.target.value })}
            placeholder="Ex.: 420 L/min ou Não indicado"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
          />
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-3">
        <div className="text-xs font-bold text-[#0B1F3A]">Teste de Caminhada de 6 Minutos (TC6M) — Antes, Durante e Depois</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Distância percorrida (m)</label>
            <input
              type="text"
              value={data.tc6mDistanceM}
              onChange={(e) => onChange({ ...data, tc6mDistanceM: e.target.value })}
              placeholder="Ex.: 410 m"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Distância prevista (% do previsto)</label>
            <input
              type="text"
              value={data.tc6mPredictedM}
              onChange={(e) => onChange({ ...data, tc6mPredictedM: e.target.value })}
              placeholder="Ex.: 520 m (78,8%)"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-mono"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Pré-teste (FC, PA, SpO2, Borg)</label>
            <input
              type="text"
              value={data.tc6mPreVitals}
              onChange={(e) => onChange({ ...data, tc6mPreVitals: e.target.value })}
              placeholder="FC 76 | PA 120/80 | SpO2 97% | Borg 0"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Durante / Pico (FC, SpO2 nadir, Borg)</label>
            <input
              type="text"
              value={data.tc6mPeakVitals}
              onChange={(e) => onChange({ ...data, tc6mPeakVitals: e.target.value })}
              placeholder="FC 118 | SpO2 93% | Borg 4"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Recuperação 2 min pós (FC, PA, SpO2, Borg)</label>
            <input
              type="text"
              value={data.tc6mPostVitals}
              onChange={(e) => onChange({ ...data, tc6mPostVitals: e.target.value })}
              placeholder="FC 84 | PA 124/80 | SpO2 96% | Borg 1"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Sentar e Levantar (repetições)</label>
          <input
            type="text"
            value={data.sitToStandReps}
            onChange={(e) => onChange({ ...data, sitToStandReps: e.target.value })}
            placeholder="Ex.: 22 reps em 1 min"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Sinais vitais pré (Sentar/Levantar)</label>
          <input
            type="text"
            value={data.sitToStandPreVitals}
            onChange={(e) => onChange({ ...data, sitToStandPreVitals: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Sinais vitais pós (Sentar/Levantar)</label>
          <input
            type="text"
            value={data.sitToStandPostVitals}
            onChange={(e) => onChange({ ...data, sitToStandPostVitals: e.target.value })}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
        <div>
          <label className="block text-xs font-semibold text-red-800 mb-1">Contraindicações identificadas</label>
          <textarea
            rows={2}
            value={data.contraindications}
            onChange={(e) => onChange({ ...data, contraindications: e.target.value })}
            placeholder="Ex.: Angina instável, arritmia grave, hipertensão pulmonar descompensada..."
            className="w-full rounded-lg border border-red-200 bg-red-50/30 px-3 py-2 text-xs"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-amber-800 mb-1">Critérios de interrupção estabelecidos</label>
          <textarea
            rows={2}
            value={data.interruptionCriteria}
            onChange={(e) => onChange({ ...data, interruptionCriteria: e.target.value })}
            placeholder="Ex.: SpO2 < 88%, dor torácica, tontura, sudorese fria, queda pressórica..."
            className="w-full rounded-lg border border-amber-200 bg-amber-50/30 px-3 py-2 text-xs"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Intercorrências durante testes e exercícios</label>
          <textarea
            rows={2}
            value={data.intercurrences}
            onChange={(e) => onChange({ ...data, intercurrences: e.target.value })}
            placeholder="Sem intercorrências ou descrever evento e conduta adotada..."
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
          />
        </div>
      </div>
    </div>
  );
};

/* ======================== UTI E HOSPITALAR ======================== */
interface UtiSectionProps {
  data: UtiClinicalData;
  onChange: (next: UtiClinicalData) => void;
}

export const UtiClinicalSection: React.FC<UtiSectionProps> = ({ data, onChange }) => {
  const glasgowTotal = data.glasgowEye + data.glasgowVerbal + data.glasgowMotor;
  const mrcSum = calculateMrcSumScore(data.mrcGroups);

  return (
    <div className="space-y-5">
      {/* Glasgow + Ventilator + ABG */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h4 className="font-display text-sm font-bold text-[#0B1F3A]">
            Nível de Consciência (Glasgow), Ventilação Mecânica e Gasometria
          </h4>
          <div className="rounded-lg bg-[#0B1F3A] px-3 py-1.5 text-xs font-mono font-bold text-white tabular-nums">
            Glasgow: {glasgowTotal}/15
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Abertura Ocular (1–4)</label>
            <select
              value={data.glasgowEye}
              onChange={(e) => onChange({ ...data, glasgowEye: Number(e.target.value) })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            >
              <option value={4}>4 — Espontânea</option>
              <option value={3}>3 — Ao estímulo verbal</option>
              <option value={2}>2 — À pressão / dor</option>
              <option value={1}>1 — Ausente</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Resposta Verbal (1–5)</label>
            <select
              value={data.glasgowVerbal}
              onChange={(e) => onChange({ ...data, glasgowVerbal: Number(e.target.value) })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            >
              <option value={5}>5 — Orientada</option>
              <option value={4}>4 — Confusa</option>
              <option value={3}>3 — Palavras inapropriadas</option>
              <option value={2}>2 — Sons incompreensíveis</option>
              <option value={1}>1 — Ausente / Intubado (registrar em obs.)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Resposta Motora (1–6)</label>
            <select
              value={data.glasgowMotor}
              onChange={(e) => onChange({ ...data, glasgowMotor: Number(e.target.value) })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            >
              <option value={6}>6 — Obedece a comandos</option>
              <option value={5}>5 — Localiza estímulo</option>
              <option value={4}>4 — Flexão normal / Retirada</option>
              <option value={3}>3 — Flexão anormal (decorticação)</option>
              <option value={2}>2 — Extensão anormal (descerebração)</option>
              <option value={1}>1 — Ausente</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Suporte / Modo Ventilatório</label>
            <input
              type="text"
              value={data.ventMode}
              onChange={(e) => onChange({ ...data, ventMode: e.target.value })}
              placeholder="Ex.: VCV, PCV, PSV, Ar ambiente"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">FiO2 (%)</label>
            <input
              type="text"
              value={data.fio2Percent}
              onChange={(e) => onChange({ ...data, fio2Percent: e.target.value })}
              placeholder="Ex.: 40%"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">PEEP (cmH2O)</label>
            <input
              type="text"
              value={data.peepCmH2O}
              onChange={(e) => onChange({ ...data, peepCmH2O: e.target.value })}
              placeholder="Ex.: 6"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">PS / Vt / FR</label>
            <input
              type="text"
              value={data.pressureSupportOrVt}
              onChange={(e) => onChange({ ...data, pressureSupportOrVt: e.target.value })}
              placeholder="Ex.: PS 10 / Vt 440 mL"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Gasometria: pH</label>
            <input type="text" value={data.abgPh} onChange={(e) => onChange({ ...data, abgPh: e.target.value })} placeholder="7.40" className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">PaO2 (mmHg)</label>
            <input type="text" value={data.abgPao2} onChange={(e) => onChange({ ...data, abgPao2: e.target.value })} placeholder="90" className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">PaCO2 (mmHg)</label>
            <input type="text" value={data.abgPaco2} onChange={(e) => onChange({ ...data, abgPaco2: e.target.value })} placeholder="40" className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">HCO3 (mEq/L)</label>
            <input type="text" value={data.abgHco3} onChange={(e) => onChange({ ...data, abgHco3: e.target.value })} placeholder="24" className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Lactato</label>
            <input type="text" value={data.abgLactato} onChange={(e) => onChange({ ...data, abgLactato: e.target.value })} placeholder="1.2" className="w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-mono" />
          </div>
        </div>
      </div>

      {/* MRC Sum Score */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h4 className="font-display text-sm font-bold text-[#0B1F3A]">
              MRC Sum Score (Força Muscular Periférica Bilateral — 0 a 60)
            </h4>
            <p className="text-xs text-slate-500">
              Avaliar quando paciente colaborativo e desperto. Escore &lt; 48/60 sugere fraqueza muscular adquirida na UTI.
            </p>
          </div>
          <div className={`rounded-lg px-3.5 py-1.5 font-mono text-xs font-bold tabular-nums ${mrcSum.evaluatedCount === 12 && mrcSum.total < 48 ? 'bg-amber-100 text-amber-900' : 'bg-[#0B1F3A] text-white'}`}>
            Total: {mrcSum.total}/60 ({mrcSum.evaluatedCount}/12)
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Object.entries(data.mrcGroups).map(([groupName, pair]) => (
            <div key={groupName} className="rounded-lg border border-slate-200 p-3 space-y-2">
              <div className="text-xs font-semibold text-slate-800">{groupName}</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Direito</label>
                  <select
                    value={pair.right ?? ''}
                    onChange={(e) =>
                      onChange({
                        ...data,
                        mrcGroups: {
                          ...data.mrcGroups,
                          [groupName]: { ...pair, right: e.target.value === '' ? null : Number(e.target.value) },
                        },
                      })
                    }
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-mono"
                  >
                    <option value="">N/A</option>
                    {[0, 1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Esquerdo</label>
                  <select
                    value={pair.left ?? ''}
                    onChange={(e) =>
                      onChange({
                        ...data,
                        mrcGroups: {
                          ...data.mrcGroups,
                          [groupName]: { ...pair, left: e.target.value === '' ? null : Number(e.target.value) },
                        },
                      })
                    }
                    className="w-full rounded border border-slate-300 px-2 py-1 text-xs font-mono"
                  >
                    <option value="">N/A</option>
                    {[0, 1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">ICU Mobility Scale (IMS — 0 a 10)</label>
            <select
              value={data.imsScore}
              onChange={(e) => onChange({ ...data, imsScore: e.target.value })}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            >
              <option value="">Selecionar nível IMS...</option>
              <option value="0">0 — Deitado / exercícios passivos no leito</option>
              <option value="1">1 — Sentado no leito / exercícios ativos no leito</option>
              <option value="2">2 — Transferência passiva para cadeira/poltrona</option>
              <option value="3">3 — Sentado à beira do leito</option>
              <option value="4">4 — Ortostatismo (com ou sem auxílio)</option>
              <option value="5">5 — Transferência ativa do leito para cadeira</option>
              <option value="6">6 — Marcha estacionária à beira do leito</option>
              <option value="7">7 — Deambulação com auxílio de 2 ou mais pessoas</option>
              <option value="8">8 — Deambulação com auxílio de 1 pessoa</option>
              <option value="9">9 — Deambulação independente com dispositivo auxiliar</option>
              <option value="10">10 — Deambulação independente sem dispositivo auxiliar</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Critérios de segurança para mobilização precoce</label>
            <input
              type="text"
              value={data.safetyCriteriaMet}
              onChange={(e) => onChange({ ...data, safetyCriteriaMet: e.target.value })}
              placeholder="Ex.: Estabilidade hemodinâmica e respiratória verificadas (sinal verde)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Keep Eye import used if needed in future or remove unused
void Eye;
