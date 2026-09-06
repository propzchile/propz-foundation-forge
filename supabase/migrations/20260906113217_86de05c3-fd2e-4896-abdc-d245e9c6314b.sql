DROP POLICY IF EXISTS owners_insert ON public.owners;

CREATE POLICY owners_insert
ON public.owners
FOR INSERT
TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND (
    user_id = auth.uid()
    OR (
      user_id IS NULL
      AND public.has_role(auth.uid(), 'administrador'::public.app_role)
    )
  )
);