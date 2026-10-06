CREATE TYPE public.payment_doc_kind AS ENUM ('cartola','gastos_comunes','agua','luz','gas');

CREATE TABLE public.payment_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by uuid NOT NULL DEFAULT auth.uid(),
  kind public.payment_doc_kind NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  file_hash text NOT NULL,
  bank text,
  account text,
  status text NOT NULL DEFAULT 'por_revisar',
  extraction_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (uploaded_by, file_hash)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_documents TO authenticated;
GRANT ALL ON public.payment_documents TO service_role;
ALTER TABLE public.payment_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY pd_own ON public.payment_documents FOR ALL TO authenticated
USING (uploaded_by = auth.uid()) WITH CHECK (uploaded_by = auth.uid());
CREATE TRIGGER pd_updated BEFORE UPDATE ON public.payment_documents FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.bank_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.payment_documents(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL DEFAULT auth.uid(),
  txn_date date,
  amount numeric NOT NULL,
  description text NOT NULL DEFAULT '',
  payer_rut text,
  payer_name text,
  bank text,
  account text,
  row_hash text NOT NULL,
  match_status text NOT NULL DEFAULT 'sin_asignar',
  suggested_contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (uploaded_by, row_hash)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_transactions TO authenticated;
GRANT ALL ON public.bank_transactions TO service_role;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY bt_own ON public.bank_transactions FOR ALL TO authenticated
USING (uploaded_by = auth.uid())
WITH CHECK (uploaded_by = auth.uid() AND (suggested_contract_id IS NULL OR EXISTS (SELECT 1 FROM public.contracts c WHERE c.id = suggested_contract_id AND public.can_access_owner(c.owner_id))));
CREATE TRIGGER bt_updated BEFORE UPDATE ON public.bank_transactions FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.utility_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL UNIQUE REFERENCES public.payment_documents(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL DEFAULT auth.uid(),
  concept public.charge_concept NOT NULL,
  unit_id uuid REFERENCES public.units(id) ON DELETE SET NULL,
  company text,
  customer_id text,
  period text,
  issue_date date,
  due_date date,
  amount numeric,
  status text NOT NULL DEFAULT 'por_revisar',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.utility_bills TO authenticated;
GRANT ALL ON public.utility_bills TO service_role;
ALTER TABLE public.utility_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY ub_own ON public.utility_bills FOR ALL TO authenticated
USING (uploaded_by = auth.uid())
WITH CHECK (uploaded_by = auth.uid() AND (unit_id IS NULL OR EXISTS (SELECT 1 FROM public.units u WHERE u.id = unit_id AND public.can_access_property(u.property_id))));
CREATE TRIGGER ub_updated BEFORE UPDATE ON public.utility_bills FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE POLICY "payment docs own read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'payment-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "payment docs own insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "payment docs own delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'payment-documents' AND (storage.foldername(name))[1] = auth.uid()::text);