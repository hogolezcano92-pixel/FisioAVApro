import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  FolderOpen,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import {
  AssessmentRecord,
  ClinicalDocumentRecord,
  DailyEvolutionRecord,
  PatientRecord,
  ReassessmentRecord,
  TreatmentStatus,
} from '../types/clinical';
import {
  calculateAgeFromBirthDate,
  formatDatePtBr,
  TREATMENT_STATUS_LABELS,
} from '../utils/calculations';

interface PatientsViewProps {
  patients: PatientRecord[];
  assessments: AssessmentRecord[];
  evolutions: DailyEvolutionRecord[];
  reassessments: ReassessmentRecord[];
  documents: ClinicalDocumentRecord[];
  onSavePatient: (
    patient: Omit<PatientRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => Promise<PatientRecord>;
  onRequestDeletePatient: (patient: PatientRecord) => void;
  onOpenPatientRecord: (patientId: string) => void;
  onBackToDashboard: () => void;
}

type PatientFormState = Omit<PatientRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };

const createEmptyForm = (): PatientFormState => ({
  fullName: '',
  birthDate: '',
  sex: '',
  phone: '',
  email: '',
  cpf: '',
  address: '',
  emergencyContact: '',
  medicalDiagnosis: '',
  physiotherapyDiagnosis: '',
  clinicalHistory: '',
  comorbidities: '',
  medications: '',
  allergies: '',
  clinicalNotes: '',
  treatmentStatus: 'em_acompanhamento',
  lgpdConsent: true,
});

export const PatientsView: React.FC<PatientsViewProps> = ({
  patients,
  assessments,
  evolutions,
  reassessments,
  documents,
  onSavePatient,
  onRequestDeletePatient,
  onOpenPatientRecord,
  onBackToDashboard,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | TreatmentStatus>('todos');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<PatientFormState>(createEmptyForm);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const filteredPatients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return patients.filter((p) => {
      const matchesStatus = statusFilter === 'todos' || p.treatmentStatus === statusFilter;
      const matchesSearch =
        !q ||
        p.fullName.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q) ||
        p.cpf.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.medicalDiagnosis.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [patients, searchQuery, statusFilter]);

  const countsByPatient = useMemo(() => {
    const map = new Map<
      string,
      { assessments: number; evolutions: number; reassessments: number; documents: number }
    >();
    const ensure = (pid: string) => {
      let cur = map.get(pid);
      if (!cur) {
        cur = { assessments: 0, evolutions: 0, reassessments: 0, documents: 0 };
        map.set(pid, cur);
      }
      return cur;
    };
    assessments.forEach((a) => {
      if (a.patientId) ensure(a.patientId).assessments++;
    });
    evolutions.forEach((e) => {
      if (e.patientId) ensure(e.patientId).evolutions++;
    });
    reassessments.forEach((r) => {
      if (r.patientId) ensure(r.patientId).reassessments++;
    });
    documents.forEach((d) => {
      if (d.patientId) ensure(d.patientId).documents++;
    });
    return map;
  }, [assessments, evolutions, reassessments, documents]);

  const openCreateModal = () => {
    setForm(createEmptyForm());
    setErrorMsg('');
    setModalOpen(true);
  };

  const openEditModal = (p: PatientRecord) => {
    setForm({
      id: p.id,
      userId: p.userId,
      fullName: p.fullName,
      birthDate: p.birthDate,
      sex: p.sex,
      phone: p.phone,
      email: p.email,
      cpf: p.cpf,
      address: p.address,
      emergencyContact: p.emergencyContact,
      medicalDiagnosis: p.medicalDiagnosis,
      physiotherapyDiagnosis: p.physiotherapyDiagnosis,
      clinicalHistory: p.clinicalHistory,
      comorbidities: p.comorbidities,
      medications: p.medications,
      allergies: p.allergies,
      clinicalNotes: p.clinicalNotes,
      treatmentStatus: p.treatmentStatus,
      lgpdConsent: p.lgpdConsent,
    });
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      setErrorMsg('Informe o nome completo do paciente.');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      await onSavePatient(form);
      setModalOpen(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao salvar cadastro.');
    } finally {
      setSaving(false);
    }
  };

  const computedAge = calculateAgeFromBirthDate(form.birthDate);

  return (
    <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-8">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
            Pacientes e Prontuários Digitais
          </h1>
          <p className="text-xs text-slate-500">
            Cadastro completo vinculado por ID único (UUID), busca rápida, filtros clínicos e acesso individual ao prontuário.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1D4ED8] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1E40AF] whitespace-nowrap shrink-0 min-h-[44px]"
        >
          <UserPlus className="h-4 w-4" />
          <span>Novo Paciente</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, telefone, CPF ou ID..."
            aria-label="Buscar pacientes"
            className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#1D4ED8] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="patient-status-filter" className="text-xs font-semibold text-slate-600">
            Situação:
          </label>
          <select
            id="patient-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'todos' | TreatmentStatus)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800"
          >
            <option value="todos">Todos ({patients.length})</option>
            {(Object.keys(TREATMENT_STATUS_LABELS) as TreatmentStatus[]).map((st) => (
              <option key={st} value={st}>
                {TREATMENT_STATUS_LABELS[st]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Patient List */}
      {filteredPatients.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-700">
            {patients.length === 0
              ? 'Nenhum paciente cadastrado até o momento.'
              : 'Nenhum paciente encontrado para os filtros aplicados.'}
          </p>
          <p className="text-xs text-slate-500">
            {patients.length === 0
              ? 'Cadastre o primeiro paciente para vincular avaliações, evoluções, planos terapêuticos e documentos em PDF.'
              : 'Ajuste os termos de pesquisa ou filtro de situação.'}
          </p>
          {patients.length === 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B1F3A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1D4ED8]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Cadastrar Primeiro Paciente</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Paciente</th>
                  <th className="px-4 py-3">Idade / Contato</th>
                  <th className="px-4 py-3">Diagnóstico / Situação</th>
                  <th className="px-4 py-3">Registros Vinculados</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPatients.map((p) => {
                  const ageStr = calculateAgeFromBirthDate(p.birthDate);
                  const stats = countsByPatient.get(p.id) ?? {
                    assessments: 0,
                    evolutions: 0,
                    reassessments: 0,
                    documents: 0,
                  };
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() => onOpenPatientRecord(p.id)}
                          className="text-left font-display font-bold text-[#0B1F3A] hover:text-[#1D4ED8] hover:underline"
                        >
                          {p.fullName}
                        </button>
                        <div className="mt-0.5 font-mono text-[11px] text-slate-400 tabular-nums">
                          ID: {p.id.slice(0, 8)} · Cadastro: {formatDatePtBr(p.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-700">
                        <div>{ageStr || 'Idade não informada'}</div>
                        <div className="font-mono text-slate-500 tabular-nums">
                          {p.phone || p.email || 'Sem contato'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        <div className="font-medium text-slate-800 line-clamp-1">
                          {p.physiotherapyDiagnosis || p.medicalDiagnosis || 'Sem diagnóstico informado'}
                        </div>
                        <div className="text-[11px] font-semibold text-[#1D4ED8] mt-0.5">
                          {TREATMENT_STATUS_LABELS[p.treatmentStatus]}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 tabular-nums">
                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                          <span>{stats.assessments} aval.</span>
                          <span>{stats.evolutions} evol.</span>
                          <span>{stats.reassessments} reav.</span>
                          <span className="font-semibold text-[#0B1F3A]">{stats.documents} PDFs</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenPatientRecord(p.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B1F3A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1D4ED8] whitespace-nowrap"
                          >
                            <FolderOpen className="h-3.5 w-3.5" />
                            <span>Prontuário</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(p)}
                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50"
                            aria-label={`Editar cadastro de ${p.fullName}`}
                            title="Editar cadastro"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onRequestDeletePatient(p)}
                            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            aria-label={`Excluir paciente ${p.fullName}`}
                            title="Excluir paciente"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Patient Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="patient-modal-title"
        >
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 id="patient-modal-title" className="font-display text-lg font-bold text-[#0B1F3A]">
                  {form.id ? 'Editar Cadastro do Paciente' : 'Cadastrar Novo Paciente'}
                </h2>
                <p className="text-xs text-slate-500">
                  Identificador único (UUID) e dados clínicos protegidos conforme LGPD.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Fechar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Situação do Tratamento
                  </label>
                  <select
                    value={form.treatmentStatus}
                    onChange={(e) =>
                      setForm({ ...form, treatmentStatus: e.target.value as TreatmentStatus })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {(Object.keys(TREATMENT_STATUS_LABELS) as TreatmentStatus[]).map((st) => (
                      <option key={st} value={st}>
                        {TREATMENT_STATUS_LABELS[st]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data de Nascimento
                  </label>
                  <input
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Idade Calculada
                  </label>
                  <input
                    type="text"
                    readOnly
                    value={computedAge || 'Informe a data'}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Sexo (quando clinicamente pertinente)
                  </label>
                  <select
                    value={form.sex}
                    onChange={(e) =>
                      setForm({ ...form, sex: e.target.value as PatientRecord['sex'] })
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Selecionar...</option>
                    <option value="Feminino">Feminino</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Outro">Outro</option>
                    <option value="Não informado">Não informado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Telefone</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    CPF (quando necessário)
                  </label>
                  <input
                    type="text"
                    value={form.cpf}
                    onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Endereço</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contato de Emergência
                  </label>
                  <input
                    type="text"
                    value={form.emergencyContact}
                    onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })}
                    placeholder="Nome e telefone"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Diagnóstico Médico
                  </label>
                  <input
                    type="text"
                    value={form.medicalDiagnosis}
                    onChange={(e) => setForm({ ...form, medicalDiagnosis: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Diagnóstico Fisioterapêutico
                  </label>
                  <input
                    type="text"
                    value={form.physiotherapyDiagnosis}
                    onChange={(e) => setForm({ ...form, physiotherapyDiagnosis: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Histórico Clínico
                  </label>
                  <textarea
                    rows={2}
                    value={form.clinicalHistory}
                    onChange={(e) => setForm({ ...form, clinicalHistory: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Comorbidades
                  </label>
                  <textarea
                    rows={2}
                    value={form.comorbidities}
                    onChange={(e) => setForm({ ...form, comorbidities: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Medicamentos Informados
                  </label>
                  <input
                    type="text"
                    value={form.medications}
                    onChange={(e) => setForm({ ...form, medications: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Alergias
                  </label>
                  <input
                    type="text"
                    value={form.allergies}
                    onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Observações Clínicas
                  </label>
                  <textarea
                    rows={2}
                    value={form.clinicalNotes}
                    onChange={(e) => setForm({ ...form, clinicalNotes: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <label className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.lgpdConsent}
                  onChange={(e) => setForm({ ...form, lgpdConsent: e.target.checked })}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#1D4ED8]"
                />
                <span>
                  Consentimento LGPD registrado: paciente ou responsável legal informado sobre o tratamento de dados clínicos para fins exclusivamente assistenciais e de prontuário fisioterapêutico (Lei nº 13.709/2018).
                </span>
              </label>

              {errorMsg && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs text-red-800">
                  {errorMsg}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-[#1D4ED8] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1E40AF] disabled:opacity-50"
                >
                  {saving ? 'Salvando...' : form.id ? 'Atualizar Paciente' : 'Salvar Paciente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
