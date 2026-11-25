-- Security and query hardening for the clinical schema.
-- Applied to Supabase project ojppbmtvzwrihtbtybfd.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = pg_catalog.now();
  RETURN NEW;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_assessments_patient_id ON public.assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_evolutions_patient_id ON public.evolutions(patient_id);
CREATE INDEX IF NOT EXISTS idx_reassessments_patient_id ON public.reassessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_reassessments_linked_assessment_id ON public.reassessments(linked_assessment_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient_id ON public.treatment_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_clinical_documents_patient_id ON public.clinical_documents(patient_id);

DROP POLICY IF EXISTS patients_select_own ON public.patients;
CREATE POLICY patients_select_own ON public.patients FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS patients_insert_own ON public.patients;
CREATE POLICY patients_insert_own ON public.patients FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS patients_update_own ON public.patients;
CREATE POLICY patients_update_own ON public.patients FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS patients_delete_own ON public.patients;
CREATE POLICY patients_delete_own ON public.patients FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS assessments_all_own ON public.assessments;
CREATE POLICY assessments_all_own ON public.assessments FOR ALL TO authenticated
USING ((SELECT auth.uid()) = user_id AND EXISTS (
  SELECT 1 FROM public.patients p
  WHERE p.id = assessments.patient_id AND p.user_id = (SELECT auth.uid())
))
WITH CHECK ((SELECT auth.uid()) = user_id AND EXISTS (
  SELECT 1 FROM public.patients p
  WHERE p.id = assessments.patient_id AND p.user_id = (SELECT auth.uid())
));

DROP POLICY IF EXISTS evolutions_all_own ON public.evolutions;
CREATE POLICY evolutions_all_own ON public.evolutions FOR ALL TO authenticated
USING ((SELECT auth.uid()) = user_id AND EXISTS (
  SELECT 1 FROM public.patients p
  WHERE p.id = evolutions.patient_id AND p.user_id = (SELECT auth.uid())
))
WITH CHECK ((SELECT auth.uid()) = user_id AND EXISTS (
  SELECT 1 FROM public.patients p
  WHERE p.id = evolutions.patient_id AND p.user_id = (SELECT auth.uid())
));

DROP POLICY IF EXISTS reassessments_all_own ON public.reassessments;
CREATE POLICY reassessments_all_own ON public.reassessments FOR ALL TO authenticated
USING (
  (SELECT auth.uid()) = user_id
  AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id = reassessments.patient_id AND p.user_id = (SELECT auth.uid()))
  AND (linked_assessment_id IS NULL OR EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = reassessments.linked_assessment_id
      AND a.patient_id = reassessments.patient_id
      AND a.user_id = (SELECT auth.uid())
  ))
)
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id = reassessments.patient_id AND p.user_id = (SELECT auth.uid()))
  AND (linked_assessment_id IS NULL OR EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = reassessments.linked_assessment_id
      AND a.patient_id = reassessments.patient_id
      AND a.user_id = (SELECT auth.uid())
  ))
);

DROP POLICY IF EXISTS treatment_plans_all_own ON public.treatment_plans;
CREATE POLICY treatment_plans_all_own ON public.treatment_plans FOR ALL TO authenticated
USING ((SELECT auth.uid()) = user_id AND EXISTS (
  SELECT 1 FROM public.patients p
  WHERE p.id = treatment_plans.patient_id AND p.user_id = (SELECT auth.uid())
))
WITH CHECK ((SELECT auth.uid()) = user_id AND EXISTS (
  SELECT 1 FROM public.patients p
  WHERE p.id = treatment_plans.patient_id AND p.user_id = (SELECT auth.uid())
));

DROP POLICY IF EXISTS appointments_all_own ON public.appointments;
CREATE POLICY appointments_all_own ON public.appointments FOR ALL TO authenticated
USING ((SELECT auth.uid()) = user_id AND EXISTS (
  SELECT 1 FROM public.patients p
  WHERE p.id = appointments.patient_id AND p.user_id = (SELECT auth.uid())
))
WITH CHECK ((SELECT auth.uid()) = user_id AND EXISTS (
  SELECT 1 FROM public.patients p
  WHERE p.id = appointments.patient_id AND p.user_id = (SELECT auth.uid())
));

DROP POLICY IF EXISTS clinical_documents_all_own ON public.clinical_documents;
CREATE POLICY clinical_documents_all_own ON public.clinical_documents FOR ALL TO authenticated
USING ((SELECT auth.uid()) = user_id AND EXISTS (
  SELECT 1 FROM public.patients p
  WHERE p.id = clinical_documents.patient_id AND p.user_id = (SELECT auth.uid())
))
WITH CHECK ((SELECT auth.uid()) = user_id AND EXISTS (
  SELECT 1 FROM public.patients p
  WHERE p.id = clinical_documents.patient_id AND p.user_id = (SELECT auth.uid())
));

DROP POLICY IF EXISTS clinical_docs_storage_select ON storage.objects;
CREATE POLICY clinical_docs_storage_select ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'clinical-documents'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND EXISTS (SELECT 1 FROM public.patients p
    WHERE p.id::text = (storage.foldername(name))[2] AND p.user_id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS clinical_docs_storage_insert ON storage.objects;
CREATE POLICY clinical_docs_storage_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'clinical-documents'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND EXISTS (SELECT 1 FROM public.patients p
    WHERE p.id::text = (storage.foldername(name))[2] AND p.user_id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS clinical_docs_storage_update ON storage.objects;
CREATE POLICY clinical_docs_storage_update ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'clinical-documents'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND EXISTS (SELECT 1 FROM public.patients p
    WHERE p.id::text = (storage.foldername(name))[2] AND p.user_id = (SELECT auth.uid()))
)
WITH CHECK (
  bucket_id = 'clinical-documents'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND EXISTS (SELECT 1 FROM public.patients p
    WHERE p.id::text = (storage.foldername(name))[2] AND p.user_id = (SELECT auth.uid()))
);

DROP POLICY IF EXISTS clinical_docs_storage_delete ON storage.objects;
CREATE POLICY clinical_docs_storage_delete ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'clinical-documents'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND EXISTS (SELECT 1 FROM public.patients p
    WHERE p.id::text = (storage.foldername(name))[2] AND p.user_id = (SELECT auth.uid()))
);
