-- Permite desfazer a vinculação sem apagar a prescrição nem o histórico de execução.
alter table public.patient_exercise_prescriptions
  drop constraint if exists patient_exercise_prescriptions_status_check;

alter table public.patient_exercise_prescriptions
  add constraint patient_exercise_prescriptions_status_check
  check (status in ('ativo', 'suspenso', 'concluido', 'removido'));
