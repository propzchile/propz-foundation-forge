CREATE OR REPLACE FUNCTION public.create_contract_with_units(
  _owner_id uuid, _property_id uuid, _unit_id uuid, _tenant_id uuid,
  _start_date date, _end_date date, _status public.contract_status,
  _rent_amount numeric, _currency text, _periodicity public.contract_periodicity,
  _due_day smallint, _unit_ids uuid[]
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE v_id uuid; v_units uuid[];
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'No autenticado'; END IF;
  SELECT array_agg(DISTINCT u) INTO v_units
  FROM unnest(array_append(coalesce(_unit_ids, '{}'::uuid[]), _unit_id)) AS u;

  INSERT INTO public.contracts(owner_id, property_id, unit_id, tenant_id, start_date, end_date,
    status, rent_amount, currency, periodicity, due_day)
  VALUES (_owner_id, _property_id, _unit_id, _tenant_id, _start_date, _end_date,
    _status, _rent_amount, _currency, _periodicity, _due_day)
  RETURNING id INTO v_id;

  INSERT INTO public.contract_units(contract_id, unit_id, is_primary)
  SELECT v_id, u, u = _unit_id FROM unnest(v_units) AS u;

  RETURN v_id;
END; $$;

REVOKE ALL ON FUNCTION public.create_contract_with_units(uuid,uuid,uuid,uuid,date,date,public.contract_status,numeric,text,public.contract_periodicity,smallint,uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_contract_with_units(uuid,uuid,uuid,uuid,date,date,public.contract_status,numeric,text,public.contract_periodicity,smallint,uuid[]) TO authenticated;