import { CLINICAL_DOCUMENTS_BUCKET, isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  AppointmentRecord,
  AssessmentRecord,
  AuthSessionUser,
  ClinicalDocumentRecord,
  ClinicalDocumentType,
  DailyEvolutionRecord,
  PatientRecord,
  ReassessmentRecord,
  SpecialtyId,
  TreatmentPlanRecord,
} from '../types/clinical';
import {
  calculateAssessmentCompletion,
  generateUuid,
  PROFESSIONAL_INFO,
  sanitizeFilePart,
} from '../utils/calculations';

// ============================================================================
// REPOSITÓRIO CLÍNICO (Supabase Auth + Postgres + Private Storage, com fallback
// estritamente em memória de sessão quando credenciais Supabase não estão definidas)
// ============================================================================

export interface ClinicalStoreSnapshot {
  patients: PatientRecord[];
  assessments: AssessmentRecord[];
  evolutions: DailyEvolutionRecord[];
  reassessments: ReassessmentRecord[];
  documents: ClinicalDocumentRecord[];
  treatmentPlans: TreatmentPlanRecord[];
  appointments: AppointmentRecord[];
}

const emptySnapshot = (): ClinicalStoreSnapshot => ({
  patients: [],
  assessments: [],
  evolutions: [],
  reassessments: [],
  documents: [],
  treatmentPlans: [],
  appointments: [],
});

// Armazenamento apenas em memória ativa da aba quando Supabase não está configurado
// (Nunca utiliza localStorage/IndexedDB para dados clínicos).
let sessionMemoryStore: ClinicalStoreSnapshot = emptySnapshot();

export function resetSessionMemoryStore() {
  sessionMemoryStore = emptySnapshot();
}

function mapPatientFromDb(row: Record<string, unknown>): PatientRecord {
  return {
    id: String(row.id),
    userId: row.user_id ? String(row.user_id) : undefined,
    fullName: String(row.full_name ?? ''),
    birthDate: row.birth_date ? String(row.birth_date) : '',
    sex: (row.sex as PatientRecord['sex']) || '',
    phone: String(row.phone ?? ''),
    email: String(row.email ?? ''),
    cpf: String(row.cpf ?? ''),
    address: String(row.address ?? ''),
    emergencyContact: String(row.emergency_contact ?? ''),
    medicalDiagnosis: String(row.medical_diagnosis ?? ''),
    physiotherapyDiagnosis: String(row.physiotherapy_diagnosis ?? ''),
    clinicalHistory: String(row.clinical_history ?? ''),
    comorbidities: String(row.comorbidities ?? ''),
    medications: String(row.medications ?? ''),
    allergies: String(row.allergies ?? ''),
    clinicalNotes: String(row.clinical_notes ?? ''),
    treatmentStatus: (row.treatment_status as PatientRecord['treatmentStatus']) || 'em_acompanhamento',
    lgpdConsent: Boolean(row.lgpd_consent ?? true),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

function mapDocumentFromDb(row: Record<string, unknown>): ClinicalDocumentRecord {
  return {
    id: String(row.id),
    userId: row.user_id ? String(row.user_id) : undefined,
    patientId: String(row.patient_id),
    relatedRecordId: row.related_record_id ? String(row.related_record_id) : null,
    documentType: row.document_type as ClinicalDocumentType,
    title: String(row.title ?? ''),
    specialtyId: (row.specialty_id as SpecialtyId | null) ?? null,
    documentDate: String(row.document_date ?? ''),
    professionalName: String(row.professional_name ?? PROFESSIONAL_INFO.therapistName),
    professionalCrefito: String(row.professional_crefito ?? PROFESSIONAL_INFO.crefito),
    version: Number(row.version ?? 1),
    storageBucket: String(row.storage_bucket ?? CLINICAL_DOCUMENTS_BUCKET),
    storagePath: String(row.storage_path ?? ''),
    fileName: String(row.file_name ?? 'documento.pdf'),
    fileSizeBytes: Number(row.file_size_bytes ?? 0),
    mimeType: String(row.mime_type ?? 'application/pdf'),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

function mapTreatmentPlanFromDb(row: Record<string, unknown>): TreatmentPlanRecord {
  return {
    id: String(row.id),
    userId: row.user_id ? String(row.user_id) : undefined,
    patientId: String(row.patient_id),
    specialtyId: row.specialty_id as SpecialtyId,
    title: String(row.title ?? ''),
    kineticDiagnosis: String(row.kinetic_diagnosis ?? ''),
    shortTermGoals: String(row.short_term_goals ?? ''),
    mediumTermGoals: String(row.medium_term_goals ?? ''),
    longTermGoals: String(row.long_term_goals ?? ''),
    interventions: String(row.interventions ?? ''),
    frequency: String(row.frequency ?? ''),
    precautions: String(row.precautions ?? ''),
    status: (row.status as TreatmentPlanRecord['status']) || 'ativo',
    startDate: String(row.start_date ?? ''),
    expectedEndDate: row.expected_end_date ? String(row.expected_end_date) : '',
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

function mapAppointmentFromDb(row: Record<string, unknown>): AppointmentRecord {
  return {
    id: String(row.id),
    userId: row.user_id ? String(row.user_id) : undefined,
    patientId: String(row.patient_id),
    specialtyId: row.specialty_id as SpecialtyId,
    scheduledDate: String(row.scheduled_date ?? ''),
    scheduledTime: String(row.scheduled_time ?? ''),
    durationMinutes: Number(row.duration_minutes ?? 50),
    attendanceMode: String(row.attendance_mode ?? 'Consultório / Clínica'),
    status: (row.status as AppointmentRecord['status']) || 'realizado',
    notes: String(row.notes ?? ''),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

// ============================================================================
// AUTENTICAÇÃO
// ============================================================================

export async function getActiveSessionUser(): Promise<AuthSessionUser | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user) return null;
  const u = data.session.user;
  return {
    id: u.id,
    email: u.email ?? '',
    fullName: (u.user_metadata?.full_name as string | undefined) || PROFESSIONAL_INFO.therapistName,
    crefito: (u.user_metadata?.crefito as string | undefined) || PROFESSIONAL_INFO.crefito,
    mode: 'supabase',
  };
}

export async function signInWithSupabase(email: string, password: string): Promise<AuthSessionUser> {
  if (!supabase) throw new Error('Supabase não está configurado neste ambiente.');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    throw new Error(error?.message || 'Não foi possível autenticar.');
  }
  return {
    id: data.user.id,
    email: data.user.email ?? email,
    fullName:
      (data.user.user_metadata?.full_name as string | undefined) || PROFESSIONAL_INFO.therapistName,
    crefito: (data.user.user_metadata?.crefito as string | undefined) || PROFESSIONAL_INFO.crefito,
    mode: 'supabase',
  };
}

export async function signUpWithSupabase(
  email: string,
  password: string,
  fullName: string,
  crefito: string
): Promise<{ user: AuthSessionUser | null; needsEmailConfirmation: boolean }> {
  if (!supabase) throw new Error('Supabase não está configurado neste ambiente.');
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName.trim() || PROFESSIONAL_INFO.therapistName,
        crefito: crefito.trim() || PROFESSIONAL_INFO.crefito,
      },
    },
  });
  if (error) throw new Error(error.message);
  if (!data.session || !data.user) {
    return { user: null, needsEmailConfirmation: true };
  }
  return {
    needsEmailConfirmation: false,
    user: {
      id: data.user.id,
      email: data.user.email ?? email,
      fullName: fullName.trim() || PROFESSIONAL_INFO.therapistName,
      crefito: crefito.trim() || PROFESSIONAL_INFO.crefito,
      mode: 'supabase',
    },
  };
}

export async function signOutClinicalSession(user: AuthSessionUser | null): Promise<void> {
  if (user?.mode === 'supabase' && supabase) {
    await supabase.auth.signOut();
  }
  resetSessionMemoryStore();
}

export function createSessionModeUser(email: string, fullName: string, crefito: string): AuthSessionUser {
  return {
    id: generateUuid(),
    email: email.trim() || 'profissional@clinica.local',
    fullName: fullName.trim() || PROFESSIONAL_INFO.therapistName,
    crefito: crefito.trim() || PROFESSIONAL_INFO.crefito,
    mode: 'session',
  };
}

// ============================================================================
// CARREGAMENTO COMPLETO DO PRONTUÁRIO
// ============================================================================

export async function loadClinicalSnapshot(user: AuthSessionUser): Promise<ClinicalStoreSnapshot> {
  if (user.mode !== 'supabase' || !supabase) {
    return {
      patients: [...sessionMemoryStore.patients],
      assessments: [...sessionMemoryStore.assessments],
      evolutions: [...sessionMemoryStore.evolutions],
      reassessments: [...sessionMemoryStore.reassessments],
      documents: [...sessionMemoryStore.documents],
      treatmentPlans: [...sessionMemoryStore.treatmentPlans],
      appointments: [...sessionMemoryStore.appointments],
    };
  }

  const [pRes, aRes, eRes, rRes, dRes, tpRes, apRes] = await Promise.all([
    supabase.from('patients').select('*').order('full_name', { ascending: true }),
    supabase.from('assessments').select('*').order('evaluation_date', { ascending: false }),
    supabase.from('evolutions').select('*').order('session_date', { ascending: false }),
    supabase.from('reassessments').select('*').order('evaluation_date', { ascending: false }),
    supabase.from('clinical_documents').select('*').order('created_at', { ascending: false }),
    supabase.from('treatment_plans').select('*').order('start_date', { ascending: false }),
    supabase.from('appointments').select('*').order('scheduled_date', { ascending: false }),
  ]);

  const firstError =
    pRes.error || aRes.error || eRes.error || rRes.error || dRes.error || tpRes.error || apRes.error;
  if (firstError) {
    throw new Error(`Erro ao carregar prontuários: ${firstError.message}`);
  }

  return {
    patients: (pRes.data ?? []).map((r) => mapPatientFromDb(r as Record<string, unknown>)),
    assessments: (aRes.data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      const payload = (row.data ?? {}) as AssessmentRecord;
      return {
        ...payload,
        id: String(row.id),
        patientId: String(row.patient_id),
        isInitial: Boolean(row.is_initial),
        specialtyId: row.specialty_id as SpecialtyId,
        createdAt: String(row.created_at ?? payload.createdAt),
        updatedAt: String(row.updated_at ?? payload.updatedAt),
      };
    }),
    evolutions: (eRes.data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      const payload = (row.data ?? {}) as DailyEvolutionRecord;
      return {
        ...payload,
        id: String(row.id),
        patientId: String(row.patient_id),
        specialtyId: row.specialty_id as SpecialtyId,
        professionalName: String(row.professional_name ?? payload.professionalName ?? PROFESSIONAL_INFO.therapistName),
        createdAt: String(row.created_at ?? ''),
        updatedAt: String(row.updated_at ?? ''),
      };
    }),
    reassessments: (rRes.data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      const payload = (row.data ?? {}) as ReassessmentRecord;
      return {
        ...payload,
        id: String(row.id),
        patientId: String(row.patient_id),
        linkedAssessmentId: row.linked_assessment_id ? String(row.linked_assessment_id) : null,
        specialtyId: row.specialty_id as SpecialtyId,
        createdAt: String(row.created_at ?? ''),
        updatedAt: String(row.updated_at ?? ''),
      };
    }),
    documents: (dRes.data ?? []).map((r) => mapDocumentFromDb(r as Record<string, unknown>)),
    treatmentPlans: (tpRes.data ?? []).map((r) => mapTreatmentPlanFromDb(r as Record<string, unknown>)),
    appointments: (apRes.data ?? []).map((r) => mapAppointmentFromDb(r as Record<string, unknown>)),
  };
}

// ============================================================================
// CRUD PACIENTES
// ============================================================================

export async function savePatient(
  user: AuthSessionUser,
  patient: Omit<PatientRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<PatientRecord> {
  if (!patient.fullName.trim()) {
    throw new Error('O nome completo do paciente é obrigatório.');
  }
  const now = new Date().toISOString();
  const id = patient.id || generateUuid();

  if (user.mode !== 'supabase' || !supabase) {
    const existing = sessionMemoryStore.patients.find((p) => p.id === id);
    const saved: PatientRecord = {
      ...patient,
      id,
      userId: user.id,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    sessionMemoryStore = {
      ...sessionMemoryStore,
      patients: existing
        ? sessionMemoryStore.patients.map((p) => (p.id === id ? saved : p))
        : [saved, ...sessionMemoryStore.patients],
    };
    return saved;
  }

  const dbPayload = {
    id,
    user_id: user.id,
    full_name: patient.fullName.trim(),
    birth_date: patient.birthDate || null,
    sex: patient.sex,
    phone: patient.phone.trim(),
    email: patient.email.trim(),
    cpf: patient.cpf.trim(),
    address: patient.address.trim(),
    emergency_contact: patient.emergencyContact.trim(),
    medical_diagnosis: patient.medicalDiagnosis.trim(),
    physiotherapy_diagnosis: patient.physiotherapyDiagnosis.trim(),
    clinical_history: patient.clinicalHistory.trim(),
    comorbidities: patient.comorbidities.trim(),
    medications: patient.medications.trim(),
    allergies: patient.allergies.trim(),
    clinical_notes: patient.clinicalNotes.trim(),
    treatment_status: patient.treatmentStatus,
    lgpd_consent: patient.lgpdConsent,
  };

  const { data, error } = await supabase
    .from('patients')
    .upsert(dbPayload, { onConflict: 'id' })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Erro ao salvar paciente: ${error?.message || 'resposta vazia'}`);
  }
  return mapPatientFromDb(data as Record<string, unknown>);
}

export async function deletePatient(user: AuthSessionUser, patientId: string): Promise<void> {
  if (user.mode !== 'supabase' || !supabase) {
    sessionMemoryStore = {
      patients: sessionMemoryStore.patients.filter((p) => p.id !== patientId),
      assessments: sessionMemoryStore.assessments.filter((a) => a.patientId !== patientId),
      evolutions: sessionMemoryStore.evolutions.filter((e) => e.patientId !== patientId),
      reassessments: sessionMemoryStore.reassessments.filter((r) => r.patientId !== patientId),
      documents: sessionMemoryStore.documents.filter((d) => d.patientId !== patientId),
      treatmentPlans: sessionMemoryStore.treatmentPlans.filter((t) => t.patientId !== patientId),
      appointments: sessionMemoryStore.appointments.filter((ap) => ap.patientId !== patientId),
    };
    return;
  }

  // Remove associated PDF objects from private Storage first
  const { data: docs } = await supabase
    .from('clinical_documents')
    .select('storage_bucket, storage_path')
    .eq('patient_id', patientId);
  if (docs && docs.length > 0) {
    const paths = docs.map((d) => String(d.storage_path)).filter(Boolean);
    if (paths.length > 0) {
      await supabase.storage.from(CLINICAL_DOCUMENTS_BUCKET).remove(paths);
    }
  }

  const { error } = await supabase.from('patients').delete().eq('id', patientId);
  if (error) {
    throw new Error(`Erro ao excluir paciente: ${error.message}`);
  }
}

// ============================================================================
// CRUD AVALIAÇÕES, EVOLUÇÕES E REAVALIAÇÕES
// ============================================================================

export async function saveAssessmentRecord(
  user: AuthSessionUser,
  assessment: AssessmentRecord
): Promise<AssessmentRecord> {
  if (!assessment.patientId) {
    throw new Error('Selecione ou vincule um paciente antes de salvar no prontuário.');
  }
  const now = new Date().toISOString();
  const id = assessment.id && assessment.id.length === 36 ? assessment.id : generateUuid();
  const completionPct = calculateAssessmentCompletion(assessment);
  const normalized: AssessmentRecord = {
    ...assessment,
    id,
    updatedAt: now,
  };

  if (user.mode !== 'supabase' || !supabase) {
    const exists = sessionMemoryStore.assessments.some((a) => a.id === id);
    sessionMemoryStore = {
      ...sessionMemoryStore,
      assessments: exists
        ? sessionMemoryStore.assessments.map((a) => (a.id === id ? normalized : a))
        : [normalized, ...sessionMemoryStore.assessments],
    };
    return normalized;
  }

  const { data, error } = await supabase
    .from('assessments')
    .upsert(
      {
        id,
        user_id: user.id,
        patient_id: assessment.patientId,
        specialty_id: assessment.specialtyId,
        evaluation_date: assessment.identification.evaluationDate || now.split('T')[0],
        is_initial: assessment.isInitial ?? true,
        completion_pct: completionPct,
        data: normalized,
      },
      { onConflict: 'id' }
    )
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`Erro ao salvar avaliação: ${error?.message || 'falha desconhecida'}`);
  }
  return normalized;
}

export async function deleteAssessmentRecord(user: AuthSessionUser, id: string): Promise<void> {
  if (user.mode !== 'supabase' || !supabase) {
    sessionMemoryStore = {
      ...sessionMemoryStore,
      assessments: sessionMemoryStore.assessments.filter((a) => a.id !== id),
    };
    return;
  }
  const { error } = await supabase.from('assessments').delete().eq('id', id);
  if (error) throw new Error(`Erro ao excluir avaliação: ${error.message}`);
}

export async function saveEvolutionRecord(
  user: AuthSessionUser,
  evolution: DailyEvolutionRecord
): Promise<DailyEvolutionRecord> {
  if (!evolution.patientId) {
    throw new Error('Selecione ou vincule um paciente antes de registrar a evolução.');
  }
  const now = new Date().toISOString();
  const id = evolution.id && evolution.id.length === 36 ? evolution.id : generateUuid();
  const normalized: DailyEvolutionRecord = {
    ...evolution,
    id,
    professionalName: evolution.professionalName || user.fullName || PROFESSIONAL_INFO.therapistName,
    createdAt: evolution.createdAt || now,
    updatedAt: now,
  };

  if (user.mode !== 'supabase' || !supabase) {
    const exists = sessionMemoryStore.evolutions.some((e) => e.id === id);
    sessionMemoryStore = {
      ...sessionMemoryStore,
      evolutions: exists
        ? sessionMemoryStore.evolutions.map((e) => (e.id === id ? normalized : e))
        : [normalized, ...sessionMemoryStore.evolutions],
    };
    return normalized;
  }

  const { error } = await supabase.from('evolutions').upsert(
    {
      id,
      user_id: user.id,
      patient_id: evolution.patientId,
      specialty_id: evolution.specialtyId,
      session_date: evolution.date || now.split('T')[0],
      session_time: evolution.time || '',
      professional_name: normalized.professionalName,
      data: normalized,
    },
    { onConflict: 'id' }
  );

  if (error) throw new Error(`Erro ao salvar evolução: ${error.message}`);
  return normalized;
}

export async function deleteEvolutionRecord(user: AuthSessionUser, id: string): Promise<void> {
  if (user.mode !== 'supabase' || !supabase) {
    sessionMemoryStore = {
      ...sessionMemoryStore,
      evolutions: sessionMemoryStore.evolutions.filter((e) => e.id !== id),
    };
    return;
  }
  const { error } = await supabase.from('evolutions').delete().eq('id', id);
  if (error) throw new Error(`Erro ao excluir evolução: ${error.message}`);
}

export async function saveReassessmentRecord(
  user: AuthSessionUser,
  reassessment: ReassessmentRecord
): Promise<ReassessmentRecord> {
  if (!reassessment.patientId) {
    throw new Error('Selecione ou vincule um paciente antes de salvar a reavaliação.');
  }
  const now = new Date().toISOString();
  const id = reassessment.id && reassessment.id.length === 36 ? reassessment.id : generateUuid();
  const normalized: ReassessmentRecord = {
    ...reassessment,
    id,
    createdAt: reassessment.createdAt || now,
    updatedAt: now,
  };

  if (user.mode !== 'supabase' || !supabase) {
    const exists = sessionMemoryStore.reassessments.some((r) => r.id === id);
    sessionMemoryStore = {
      ...sessionMemoryStore,
      reassessments: exists
        ? sessionMemoryStore.reassessments.map((r) => (r.id === id ? normalized : r))
        : [normalized, ...sessionMemoryStore.reassessments],
    };
    return normalized;
  }

  const { error } = await supabase.from('reassessments').upsert(
    {
      id,
      user_id: user.id,
      patient_id: reassessment.patientId,
      linked_assessment_id:
        reassessment.linkedAssessmentId && reassessment.linkedAssessmentId.length === 36
          ? reassessment.linkedAssessmentId
          : null,
      specialty_id: reassessment.specialtyId,
      initial_date: reassessment.initialDate || null,
      evaluation_date: reassessment.evaluationDate || now.split('T')[0],
      data: normalized,
    },
    { onConflict: 'id' }
  );

  if (error) throw new Error(`Erro ao salvar reavaliação: ${error.message}`);
  return normalized;
}

export async function deleteReassessmentRecord(user: AuthSessionUser, id: string): Promise<void> {
  if (user.mode !== 'supabase' || !supabase) {
    sessionMemoryStore = {
      ...sessionMemoryStore,
      reassessments: sessionMemoryStore.reassessments.filter((r) => r.id !== id),
    };
    return;
  }
  const { error } = await supabase.from('reassessments').delete().eq('id', id);
  if (error) throw new Error(`Erro ao excluir reavaliação: ${error.message}`);
}

// ============================================================================
// PLANOS TERAPÊUTICOS E HISTÓRICO DE ATENDIMENTOS
// ============================================================================

export async function saveTreatmentPlan(
  user: AuthSessionUser,
  plan: Omit<TreatmentPlanRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<TreatmentPlanRecord> {
  if (!plan.patientId) throw new Error('Paciente não vinculado.');
  const now = new Date().toISOString();
  const id = plan.id || generateUuid();

  if (user.mode !== 'supabase' || !supabase) {
    const existing = sessionMemoryStore.treatmentPlans.find((p) => p.id === id);
    const saved: TreatmentPlanRecord = {
      ...plan,
      id,
      userId: user.id,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    sessionMemoryStore = {
      ...sessionMemoryStore,
      treatmentPlans: existing
        ? sessionMemoryStore.treatmentPlans.map((p) => (p.id === id ? saved : p))
        : [saved, ...sessionMemoryStore.treatmentPlans],
    };
    return saved;
  }

  const { data, error } = await supabase
    .from('treatment_plans')
    .upsert(
      {
        id,
        user_id: user.id,
        patient_id: plan.patientId,
        specialty_id: plan.specialtyId,
        title: plan.title.trim(),
        kinetic_diagnosis: plan.kineticDiagnosis.trim(),
        short_term_goals: plan.shortTermGoals.trim(),
        medium_term_goals: plan.mediumTermGoals.trim(),
        long_term_goals: plan.longTermGoals.trim(),
        interventions: plan.interventions.trim(),
        frequency: plan.frequency.trim(),
        precautions: plan.precautions.trim(),
        status: plan.status,
        start_date: plan.startDate || now.split('T')[0],
        expected_end_date: plan.expectedEndDate || null,
      },
      { onConflict: 'id' }
    )
    .select('*')
    .single();

  if (error || !data) throw new Error(`Erro ao salvar plano terapêutico: ${error?.message}`);
  return mapTreatmentPlanFromDb(data as Record<string, unknown>);
}

export async function deleteTreatmentPlan(user: AuthSessionUser, id: string): Promise<void> {
  if (user.mode !== 'supabase' || !supabase) {
    sessionMemoryStore = {
      ...sessionMemoryStore,
      treatmentPlans: sessionMemoryStore.treatmentPlans.filter((p) => p.id !== id),
    };
    return;
  }
  const { error } = await supabase.from('treatment_plans').delete().eq('id', id);
  if (error) throw new Error(`Erro ao excluir plano terapêutico: ${error.message}`);
}

export async function saveAppointment(
  user: AuthSessionUser,
  appt: Omit<AppointmentRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
): Promise<AppointmentRecord> {
  if (!appt.patientId) throw new Error('Paciente não vinculado.');
  const now = new Date().toISOString();
  const id = appt.id || generateUuid();

  if (user.mode !== 'supabase' || !supabase) {
    const existing = sessionMemoryStore.appointments.find((a) => a.id === id);
    const saved: AppointmentRecord = {
      ...appt,
      id,
      userId: user.id,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    sessionMemoryStore = {
      ...sessionMemoryStore,
      appointments: existing
        ? sessionMemoryStore.appointments.map((a) => (a.id === id ? saved : a))
        : [saved, ...sessionMemoryStore.appointments],
    };
    return saved;
  }

  const { data, error } = await supabase
    .from('appointments')
    .upsert(
      {
        id,
        user_id: user.id,
        patient_id: appt.patientId,
        specialty_id: appt.specialtyId,
        scheduled_date: appt.scheduledDate,
        scheduled_time: appt.scheduledTime,
        duration_minutes: appt.durationMinutes,
        attendance_mode: appt.attendanceMode,
        status: appt.status,
        notes: appt.notes.trim(),
      },
      { onConflict: 'id' }
    )
    .select('*')
    .single();

  if (error || !data) throw new Error(`Erro ao salvar atendimento: ${error?.message}`);
  return mapAppointmentFromDb(data as Record<string, unknown>);
}

export async function deleteAppointment(user: AuthSessionUser, id: string): Promise<void> {
  if (user.mode !== 'supabase' || !supabase) {
    sessionMemoryStore = {
      ...sessionMemoryStore,
      appointments: sessionMemoryStore.appointments.filter((a) => a.id !== id),
    };
    return;
  }
  const { error } = await supabase.from('appointments').delete().eq('id', id);
  if (error) throw new Error(`Erro ao excluir atendimento: ${error.message}`);
}

// ============================================================================
// ARQUIVAMENTO AUTOMÁTICO DE PDFs (Storage privado + metadados no banco)
// ============================================================================

export async function archiveClinicalPdf(
  user: AuthSessionUser,
  params: {
    patientId: string;
    relatedRecordId?: string | null;
    documentType: ClinicalDocumentType;
    title: string;
    specialtyId?: SpecialtyId | null;
    documentDate: string;
    blob: Blob;
    fileName: string;
  }
): Promise<ClinicalDocumentRecord> {
  if (!params.patientId) {
    throw new Error('Documento não pode ser arquivado sem vínculo com o ID do paciente.');
  }
  if (!params.blob || params.blob.size === 0) {
    throw new Error('Arquivo PDF inválido ou vazio.');
  }

  const now = new Date().toISOString();
  const id = generateUuid();
  const safeFile = `${sanitizeFilePart(params.fileName.replace(/\.pdf$/i, ''), 'Documento')}.pdf`;
  const storagePath = `${user.id}/${params.patientId}/${params.documentType}/${Date.now()}_${safeFile}`;

  if (user.mode !== 'supabase' || !supabase) {
    const existingVersions = sessionMemoryStore.documents.filter(
      (d) => d.patientId === params.patientId && d.documentType === params.documentType
    );
    const nextVersion =
      existingVersions.length > 0
        ? Math.max(...existingVersions.map((d) => d.version)) + 1
        : 1;

    const record: ClinicalDocumentRecord = {
      id,
      userId: user.id,
      patientId: params.patientId,
      relatedRecordId: params.relatedRecordId ?? null,
      documentType: params.documentType,
      title: params.title,
      specialtyId: params.specialtyId ?? null,
      documentDate: params.documentDate || now.split('T')[0],
      professionalName: user.fullName || PROFESSIONAL_INFO.therapistName,
      professionalCrefito: user.crefito || PROFESSIONAL_INFO.crefito,
      version: nextVersion,
      storageBucket: CLINICAL_DOCUMENTS_BUCKET,
      storagePath,
      fileName: params.fileName,
      fileSizeBytes: params.blob.size,
      mimeType: 'application/pdf',
      createdAt: now,
      updatedAt: now,
      localBlob: params.blob,
    };

    sessionMemoryStore = {
      ...sessionMemoryStore,
      documents: [record, ...sessionMemoryStore.documents],
    };
    return record;
  }

  // 1. Upload binário para Supabase Storage privado (falha aqui impede registro órfão no banco)
  const { error: uploadError } = await supabase.storage
    .from(CLINICAL_DOCUMENTS_BUCKET)
    .upload(storagePath, params.blob, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (uploadError) {
    throw new Error(`Falha ao enviar PDF para o Storage: ${uploadError.message}`);
  }

  // 2. Calcular próxima versão do tipo de documento para este paciente
  const { data: existingRows } = await supabase
    .from('clinical_documents')
    .select('version')
    .eq('patient_id', params.patientId)
    .eq('document_type', params.documentType)
    .order('version', { ascending: false })
    .limit(1);

  const nextVersion = existingRows && existingRows.length > 0 ? Number(existingRows[0].version) + 1 : 1;

  // 3. Inserir metadados confirmados no PostgreSQL (sem Base64!)
  const { data: inserted, error: dbError } = await supabase
    .from('clinical_documents')
    .insert({
      id,
      user_id: user.id,
      patient_id: params.patientId,
      related_record_id:
        params.relatedRecordId && params.relatedRecordId.length === 36
          ? params.relatedRecordId
          : null,
      document_type: params.documentType,
      title: params.title,
      specialty_id: params.specialtyId ?? null,
      document_date: params.documentDate || now.split('T')[0],
      professional_name: user.fullName || PROFESSIONAL_INFO.therapistName,
      professional_crefito: user.crefito || PROFESSIONAL_INFO.crefito,
      version: nextVersion,
      storage_bucket: CLINICAL_DOCUMENTS_BUCKET,
      storage_path: storagePath,
      file_name: params.fileName,
      file_size_bytes: params.blob.size,
      mime_type: 'application/pdf',
    })
    .select('*')
    .single();

  if (dbError || !inserted) {
    // Rollback do arquivo no Storage para manter integridade transacional
    await supabase.storage.from(CLINICAL_DOCUMENTS_BUCKET).remove([storagePath]);
    throw new Error(`Falha ao registrar metadados do documento: ${dbError?.message || 'erro desconhecido'}`);
  }

  return mapDocumentFromDb(inserted as Record<string, unknown>);
}

export async function getDocumentAccessUrl(
  user: AuthSessionUser,
  doc: ClinicalDocumentRecord
): Promise<{ url: string; isObjectUrl: boolean }> {
  if (user.mode !== 'supabase' || !supabase) {
    if (!doc.localBlob) {
      throw new Error('Arquivo PDF disponível apenas durante a sessão em que foi gerado (configure o Supabase para armazenamento permanente).');
    }
    return {
      url: URL.createObjectURL(doc.localBlob),
      isObjectUrl: true,
    };
  }

  const { data, error } = await supabase.storage
    .from(doc.storageBucket || CLINICAL_DOCUMENTS_BUCKET)
    .createSignedUrl(doc.storagePath, 120);

  if (error || !data?.signedUrl) {
    throw new Error(`Não foi possível gerar URL assinada temporária: ${error?.message || 'arquivo indisponível'}`);
  }

  return {
    url: data.signedUrl,
    isObjectUrl: false,
  };
}

export async function deleteClinicalDocument(
  user: AuthSessionUser,
  doc: ClinicalDocumentRecord
): Promise<void> {
  if (user.mode !== 'supabase' || !supabase) {
    sessionMemoryStore = {
      ...sessionMemoryStore,
      documents: sessionMemoryStore.documents.filter((d) => d.id !== doc.id),
    };
    return;
  }

  if (doc.storagePath) {
    await supabase.storage
      .from(doc.storageBucket || CLINICAL_DOCUMENTS_BUCKET)
      .remove([doc.storagePath]);
  }

  const { error } = await supabase.from('clinical_documents').delete().eq('id', doc.id);
  if (error) {
    throw new Error(`Erro ao excluir documento: ${error.message}`);
  }
}

export function buildClinicalBackupPayload(
  user: AuthSessionUser,
  snapshot: ClinicalStoreSnapshot
): string {
  const sanitizedDocs = snapshot.documents.map(({ localBlob: _omit, ...rest }) => rest);
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      application: PROFESSIONAL_INFO.appName,
      responsibleProfessional: user.fullName,
      crefito: user.crefito,
      dataMode: user.mode,
      counts: {
        patients: snapshot.patients.length,
        assessments: snapshot.assessments.length,
        evolutions: snapshot.evolutions.length,
        reassessments: snapshot.reassessments.length,
        treatmentPlans: snapshot.treatmentPlans.length,
        appointments: snapshot.appointments.length,
        documents: sanitizedDocs.length,
      },
      records: {
        ...snapshot,
        documents: sanitizedDocs,
      },
    },
    null,
    2
  );
}
