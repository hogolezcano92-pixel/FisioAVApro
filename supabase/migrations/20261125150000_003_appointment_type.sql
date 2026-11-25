-- Classifica os registros de atendimento como avaliação ou sessão.
-- Os registros existentes recebem sessão para manter compatibilidade com o histórico.
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS appointment_type text NOT NULL DEFAULT 'sessao';

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_appointment_type_check;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_appointment_type_check
  CHECK (appointment_type IN ('avaliacao', 'sessao'));
