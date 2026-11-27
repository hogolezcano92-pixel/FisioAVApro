-- Marca exercícios apagados como excluídos sem apagar o registro ou o histórico de execução.
-- A tela de gerenciamento do portal deixa de listá-los; a biblioteca global e outros pacientes não são afetados.
alter table public.patient_exercise_prescriptions
  drop constraint if exists patient_exercise_prescriptions_status_check;

alter table public.patient_exercise_prescriptions
  add constraint patient_exercise_prescriptions_status_check
  check (status in ('ativo', 'suspenso', 'concluido', 'removido', 'excluido'));
