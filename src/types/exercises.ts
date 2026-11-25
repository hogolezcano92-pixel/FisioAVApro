export type PatientExerciseStatus = 'ativo' | 'suspenso' | 'concluido';
export type PatientExerciseLogStatus = 'realizado' | 'nao_realizado';

export interface PatientExercisePrescription {
  id: string;
  userId?: string;
  patientId: string;
  exerciseId: string;
  exerciseName: string;
  category: string;
  objective: string;
  instructions: string;
  precautions: string;
  sets: number;
  reps: string;
  holdSeconds: number;
  frequency: string;
  status: PatientExerciseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PatientExerciseLog {
  id: string;
  userId?: string;
  patientId: string;
  prescriptionId: string;
  performedAt: string;
  status: PatientExerciseLogStatus;
  performedSets: number;
  performedReps: string;
  notes: string;
  createdAt: string;
}
