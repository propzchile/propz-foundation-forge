ALTER TABLE public.bank_transactions ADD COLUMN assigned_contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL;

DROP POLICY bt_own ON public.bank_transactions;
CREATE POLICY bt_own ON public.bank_transactions FOR ALL TO authenticated
USING (uploaded_by = auth.uid())
WITH CHECK (uploaded_by = auth.uid()
  AND (suggested_contract_id IS NULL OR EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = suggested_contract_id AND public.can_access_owner(c.owner_id)))
  AND (assigned_contract_id IS NULL OR EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = assigned_contract_id AND public.can_access_owner(c.owner_id))));

CREATE TABLE public.contract_payer_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  payer_rut text,
  payer_name text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (payer_rut IS NOT NULL OR payer_name IS NOT NULL)
);
CREATE UNIQUE INDEX contract_payer_aliases_uniq ON public.contract_payer_aliases (contract_id, coalesce(payer_rut,''), coalesce(payer_name,''));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contract_payer_aliases TO authenticated;
GRANT ALL ON public.contract_payer_aliases TO service_role;
ALTER TABLE public.contract_payer_aliases ENABLE ROW LEVEL SECURITY;
CREATE POLICY cpa_all ON public.contract_payer_aliases FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND public.can_access_owner(c.owner_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = contract_id AND public.can_access_owner(c.owner_id)));
CREATE TRIGGER cpa_updated BEFORE UPDATE ON public.contract_payer_aliases FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();