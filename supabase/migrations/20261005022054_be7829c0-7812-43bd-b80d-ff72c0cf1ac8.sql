CREATE TYPE public.charge_concept AS ENUM ('gastos_comunes','agua','luz','gas');

CREATE TABLE public.unit_reference_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  concept public.charge_concept NOT NULL,
  monthly_amount numeric NOT NULL DEFAULT 0 CHECK (monthly_amount >= 0),
  currency text NOT NULL DEFAULT 'CLP',
  effective_from date NOT NULL DEFAULT current_date,
  source text NOT NULL DEFAULT 'manual',
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.unit_reference_charges(unit_id, concept, effective_from DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.unit_reference_charges TO authenticated;
GRANT ALL ON public.unit_reference_charges TO service_role;
ALTER TABLE public.unit_reference_charges ENABLE ROW LEVEL SECURITY;
CREATE POLICY urc_all ON public.unit_reference_charges FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.units u WHERE u.id = unit_id AND public.can_access_property(u.property_id)))
WITH CHECK (EXISTS (SELECT 1 FROM public.units u WHERE u.id = unit_id AND public.can_access_property(u.property_id)));
CREATE TRIGGER urc_updated BEFORE UPDATE ON public.unit_reference_charges FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TABLE public.dashboard_thresholds (
  user_id uuid PRIMARY KEY DEFAULT auth.uid(),
  rent_days smallint NOT NULL DEFAULT 15 CHECK (rent_days >= 0),
  common_months smallint NOT NULL DEFAULT 2 CHECK (common_months >= 0),
  utilities_months smallint NOT NULL DEFAULT 2 CHECK (utilities_months >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.dashboard_thresholds TO authenticated;
GRANT ALL ON public.dashboard_thresholds TO service_role;
ALTER TABLE public.dashboard_thresholds ENABLE ROW LEVEL SECURITY;
CREATE POLICY dt_all ON public.dashboard_thresholds FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER dt_updated BEFORE UPDATE ON public.dashboard_thresholds FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();