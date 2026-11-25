-- ============================================================================
-- FISIO ASSESSMENT PRO — Schema Clínico, Storage Privado e Políticas RLS
-- Conformidade LGPD (Lei nº 13.709/2018) e Prontuário Fisioterapêutico Digital
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Função padrão para atualização automática de updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 1. PACIENTES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  birth_date DATE,
  sex TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  cpf TEXT DEFAULT '',
  address TEXT DEFAULT '',
  emergency_contact TEXT DEFAULT '',
  medical_diagnosis TEXT DEFAULT '',
  physiotherapy_diagnosis TEXT DEFAULT '',
  clinical_history TEXT DEFAULT '',
  comorbidities TEXT DEFAULT '',
  medications TEXT DEFAULT '',
  allergies TEXT DEFAULT '',
  clinical_notes TEXT DEFAULT '',
  treatment_status TEXT NOT NULL DEFAULT 'em_acompanhamento'
    CHECK (treatment_status IN ('em_avaliacao', 'em_acompanhamento', 'alta', 'pausado', 'encaminhado')),
  lgpd_consent BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patients_user_name ON public.patients(user_id, full_name);
CREATE INDEX IF NOT EXISTS idx_patients_user_status ON public.patients(user_id, treatment_status);

DROP TRIGGER IF EXISTS trg_patients_updated_at ON public.patients;
CREATE TRIGGER trg_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 2. AVALIAÇÕES FISIOTERAPÊUTICAS (Múltiplas por paciente por especialidade)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  specialty_id TEXT NOT NULL,
  evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_initial BOOLEAN NOT NULL DEFAULT TRUE,
  completion_pct INTEGER NOT NULL DEFAULT 0 CHECK (completion_pct >= 0 AND completion_pct <= 100),
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessments_user_patient ON public.assessments(user_id, patient_id, evaluation_date DESC);

DROP TRIGGER IF EXISTS trg_assessments_updated_at ON public.assessments;
CREATE TRIGGER trg_assessments_updated_at
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 3. EVOLUÇÕES DAS SESSÕES (Histórico longitudinal cronológico)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.evolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  specialty_id TEXT NOT NULL,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  session_time TEXT DEFAULT '',
  professional_name TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evolutions_user_patient ON public.evolutions(user_id, patient_id, session_date DESC, session_time DESC);

DROP TRIGGER IF EXISTS trg_evolutions_updated_at ON public.evolutions;
CREATE TRIGGER trg_evolutions_updated_at
  BEFORE UPDATE ON public.evolutions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 4. REAVALIAÇÕES FUNCIONAIS E COMPARATIVAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.reassessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  linked_assessment_id UUID REFERENCES public.assessments(id) ON DELETE SET NULL,
  specialty_id TEXT NOT NULL,
  initial_date DATE,
  evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reassessments_user_patient ON public.reassessments(user_id, patient_id, evaluation_date DESC);

DROP TRIGGER IF EXISTS trg_reassessments_updated_at ON public.reassessments;
CREATE TRIGGER trg_reassessments_updated_at
  BEFORE UPDATE ON public.reassessments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 5. PLANOS TERAPÊUTICOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.treatment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  specialty_id TEXT NOT NULL,
  title TEXT NOT NULL,
  kinetic_diagnosis TEXT DEFAULT '',
  short_term_goals TEXT DEFAULT '',
  medium_term_goals TEXT DEFAULT '',
  long_term_goals TEXT DEFAULT '',
  interventions TEXT DEFAULT '',
  frequency TEXT DEFAULT '',
  precautions TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'ativo'
    CHECK (status IN ('ativo', 'concluido', 'revisado', 'suspenso')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treatment_plans_user_patient ON public.treatment_plans(user_id, patient_id, start_date DESC);

DROP TRIGGER IF EXISTS trg_treatment_plans_updated_at ON public.treatment_plans;
CREATE TRIGGER trg_treatment_plans_updated_at
  BEFORE UPDATE ON public.treatment_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 6. HISTÓRICO DE ATENDIMENTOS / AGENDA CLÍNICA
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  specialty_id TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TEXT DEFAULT '',
  duration_minutes INTEGER NOT NULL DEFAULT 50 CHECK (duration_minutes > 0 AND duration_minutes <= 480),
  attendance_mode TEXT NOT NULL DEFAULT 'Consultório / Clínica',
  status TEXT NOT NULL DEFAULT 'realizado'
    CHECK (status IN ('agendado', 'realizado', 'falta', 'cancelado', 'remarcado')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_user_patient ON public.appointments(user_id, patient_id, scheduled_date DESC, scheduled_time DESC);

DROP TRIGGER IF EXISTS trg_appointments_updated_at ON public.appointments;
CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 7. DOCUMENTOS CLÍNICOS E PDFs VINCULADOS (Metadados — binário no Storage)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.clinical_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  related_record_id UUID,
  document_type TEXT NOT NULL CHECK (
    document_type IN (
      'avaliacao_inicial',
      'ficha_anamnese',
      'relatorio_fisioterapeutico',
      'evolucao_clinica',
      'reavaliacao_funcional',
      'relatorio_comparativo',
      'plano_terapeutico',
      'relatorio_alta',
      'encaminhamento',
      'declaracao_outros'
    )
  ),
  title TEXT NOT NULL,
  specialty_id TEXT,
  document_date DATE NOT NULL DEFAULT CURRENT_DATE,
  professional_name TEXT NOT NULL,
  professional_crefito TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  storage_bucket TEXT NOT NULL DEFAULT 'clinical-documents',
  storage_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes > 0),
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinical_documents_user_patient ON public.clinical_documents(user_id, patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clinical_documents_type ON public.clinical_documents(user_id, document_type);

DROP TRIGGER IF EXISTS trg_clinical_documents_updated_at ON public.clinical_documents;
CREATE TRIGGER trg_clinical_documents_updated_at
  BEFORE UPDATE ON public.clinical_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) ESTRITO POR auth.uid()
-- ============================================================================
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reassessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_documents ENABLE ROW LEVEL SECURITY;

-- Patients RLS
DROP POLICY IF EXISTS patients_select_own ON public.patients;
CREATE POLICY patients_select_own ON public.patients
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS patients_insert_own ON public.patients;
CREATE POLICY patients_insert_own ON public.patients
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS patients_update_own ON public.patients;
CREATE POLICY patients_update_own ON public.patients
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS patients_delete_own ON public.patients;
CREATE POLICY patients_delete_own ON public.patients
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Helper check: patient belongs to authenticated user
-- Assessments RLS
DROP POLICY IF EXISTS assessments_all_own ON public.assessments;
CREATE POLICY assessments_all_own ON public.assessments
  FOR ALL TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
  );

-- Evolutions RLS
DROP POLICY IF EXISTS evolutions_all_own ON public.evolutions;
CREATE POLICY evolutions_all_own ON public.evolutions
  FOR ALL TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
  );

-- Reassessments RLS
DROP POLICY IF EXISTS reassessments_all_own ON public.reassessments;
CREATE POLICY reassessments_all_own ON public.reassessments
  FOR ALL TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
  );

-- Treatment Plans RLS
DROP POLICY IF EXISTS treatment_plans_all_own ON public.treatment_plans;
CREATE POLICY treatment_plans_all_own ON public.treatment_plans
  FOR ALL TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
  );

-- Appointments RLS
DROP POLICY IF EXISTS appointments_all_own ON public.appointments;
CREATE POLICY appointments_all_own ON public.appointments
  FOR ALL TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
  );

-- Clinical Documents RLS
DROP POLICY IF EXISTS clinical_documents_all_own ON public.clinical_documents;
CREATE POLICY clinical_documents_all_own ON public.clinical_documents
  FOR ALL TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
  )
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id = patient_id AND p.user_id = auth.uid())
  );

-- ============================================================================
-- STORAGE BUCKET PRIVADO (clinical-documents) E POLÍTICAS DE ACESSO
-- Caminho obrigatório dos objetos: {user_id}/{patient_id}/{document_type}/{arquivo}.pdf
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clinical-documents',
  'clinical-documents',
  FALSE,
  20971520,
  ARRAY['application/pdf']::TEXT[]
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 20971520,
  allowed_mime_types = ARRAY['application/pdf']::TEXT[];

DROP POLICY IF EXISTS clinical_docs_storage_select ON storage.objects;
CREATE POLICY clinical_docs_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'clinical-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS clinical_docs_storage_insert ON storage.objects;
CREATE POLICY clinical_docs_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'clinical-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS clinical_docs_storage_update ON storage.objects;
CREATE POLICY clinical_docs_storage_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'clinical-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'clinical-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS clinical_docs_storage_delete ON storage.objects;
CREATE POLICY clinical_docs_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'clinical-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
