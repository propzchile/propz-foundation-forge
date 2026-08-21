create or replace function public.seed_demo_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.app_role;
  v_owner uuid;
  v_prop uuid;
  v_unit uuid;
  v_unit2 uuid;
  v_tenant uuid;
  v_created int := 0;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  select role into v_role from public.user_roles where user_id = v_uid limit 1;
  if v_role is null then raise exception 'El usuario no tiene rol asignado'; end if;

  if v_role = 'propietario' then
    if exists (select 1 from public.owners where user_id = v_uid and is_demo) then
      return jsonb_build_object('created', 0, 'message', 'Los datos demo ya existen');
    end if;

    insert into public.owners (user_id, party_type, display_name, tax_id, email, phone, is_demo, created_by)
    values (v_uid, 'natural', 'Juan Pérez (demo)', '12.345.678-9', 'juan.perez@demo.propz.cl', '+56 9 1111 1111', true, v_uid)
    returning id into v_owner;

    insert into public.properties (owner_id, property_type, alias, address, comuna, city, region, is_demo, created_by)
    values (v_owner, 'departamento', 'Depto Providencia', 'Av. Providencia 1234, Depto 802', 'Providencia', 'Santiago', 'Metropolitana', true, v_uid)
    returning id into v_prop;

    insert into public.units (property_id, unit_type, identifier, alias, rental_mode, is_demo, created_by)
    values (v_prop, 'departamento', '802', 'Depto 802', 'conjunta', true, v_uid) returning id into v_unit;
    insert into public.units (property_id, unit_type, identifier, alias, rental_mode, is_demo, created_by)
    values (v_prop, 'estacionamiento', 'E-45', 'Estacionamiento 45', 'parte_de_conjunto', true, v_uid);
    insert into public.units (property_id, unit_type, identifier, alias, rental_mode, is_demo, created_by)
    values (v_prop, 'bodega', 'B-12', 'Bodega 12', 'parte_de_conjunto', true, v_uid);

    insert into public.tenants (owner_id, party_type, first_name, last_name, tax_id, email, phone, is_demo, created_by)
    values (v_owner, 'natural', 'Camila', 'Rojas', '15.222.333-4', 'camila.rojas@demo.propz.cl', '+56 9 2222 2222', true, v_uid)
    returning id into v_tenant;

    insert into public.contracts (owner_id, property_id, unit_id, tenant_id, start_date, end_date, status, rent_amount, currency, periodicity, due_day, is_demo, created_by)
    values (v_owner, v_prop, v_unit, v_tenant, current_date - interval '10 months', current_date + interval '2 months', 'ACTIVO', 650000, 'CLP', 'mensual', 5, true, v_uid);

    insert into public.properties (owner_id, property_type, alias, address, comuna, city, region, is_demo, created_by)
    values (v_owner, 'casa', 'Casa Ñuñoa', 'Los Alerces 456', 'Ñuñoa', 'Santiago', 'Metropolitana', true, v_uid)
    returning id into v_prop;
    insert into public.units (property_id, unit_type, identifier, alias, rental_mode, is_demo, created_by)
    values (v_prop, 'casa', 'CASA', 'Casa principal', 'independiente', true, v_uid) returning id into v_unit;

    insert into public.tenants (owner_id, party_type, first_name, last_name, tax_id, email, phone, is_demo, created_by)
    values (v_owner, 'empresa', '', 'Consultora Andes SpA', '76.888.999-0', 'contacto@andes-demo.cl', '+56 2 2333 4444', true, v_uid)
    returning id into v_tenant;

    insert into public.contracts (owner_id, property_id, unit_id, tenant_id, start_date, end_date, status, rent_amount, currency, periodicity, due_day, is_demo, created_by)
    values (v_owner, v_prop, v_unit, v_tenant, current_date - interval '26 months', current_date - interval '2 months', 'FINALIZADO', 900000, 'CLP', 'mensual', 1, true, v_uid);

    v_created := 1;
    return jsonb_build_object('created', v_created, 'message', 'Cartera demo creada');
  end if;

  -- ADMINISTRADOR
  if exists (select 1 from public.admin_owners ao join public.owners o on o.id = ao.owner_id
             where ao.admin_user_id = v_uid and o.is_demo) then
    return jsonb_build_object('created', 0, 'message', 'Los datos demo ya existen');
  end if;

  -- Cliente 1: Juan Pérez
  insert into public.owners (party_type, display_name, tax_id, email, phone, is_demo, created_by)
  values ('natural', 'Juan Pérez (demo)', '12.345.678-9', 'juan.perez@demo.propz.cl', '+56 9 1111 1111', true, v_uid)
  returning id into v_owner;
  insert into public.admin_owners (admin_user_id, owner_id) values (v_uid, v_owner) on conflict do nothing;

  insert into public.properties (owner_id, property_type, alias, address, comuna, city, region, is_demo, created_by)
  values (v_owner, 'departamento', 'Depto Providencia', 'Av. Providencia 1234, Depto 802', 'Providencia', 'Santiago', 'Metropolitana', true, v_uid)
  returning id into v_prop;
  insert into public.units (property_id, unit_type, identifier, alias, rental_mode, is_demo, created_by)
  values (v_prop, 'departamento', '802', 'Depto 802', 'conjunta', true, v_uid) returning id into v_unit;
  insert into public.units (property_id, unit_type, identifier, alias, rental_mode, is_demo, created_by)
  values (v_prop, 'estacionamiento', 'E-45', 'Estacionamiento 45', 'parte_de_conjunto', true, v_uid);
  insert into public.tenants (owner_id, party_type, first_name, last_name, tax_id, email, phone, is_demo, created_by)
  values (v_owner, 'natural', 'Camila', 'Rojas', '15.222.333-4', 'camila.rojas@demo.propz.cl', '+56 9 2222 2222', true, v_uid)
  returning id into v_tenant;
  insert into public.contracts (owner_id, property_id, unit_id, tenant_id, start_date, end_date, status, rent_amount, periodicity, due_day, is_demo, created_by)
  values (v_owner, v_prop, v_unit, v_tenant, current_date - interval '10 months', current_date + interval '2 months', 'ACTIVO', 650000, 'mensual', 5, true, v_uid);

  insert into public.properties (owner_id, property_type, alias, address, comuna, city, region, is_demo, created_by)
  values (v_owner, 'casa', 'Casa Ñuñoa', 'Los Alerces 456', 'Ñuñoa', 'Santiago', 'Metropolitana', true, v_uid)
  returning id into v_prop;
  insert into public.units (property_id, unit_type, identifier, alias, rental_mode, is_demo, created_by)
  values (v_prop, 'casa', 'CASA', 'Casa principal', 'independiente', true, v_uid) returning id into v_unit;
  insert into public.contracts (owner_id, property_id, unit_id, tenant_id, start_date, end_date, status, rent_amount, periodicity, due_day, is_demo, created_by)
  values (v_owner, v_prop, v_unit, v_tenant, current_date - interval '30 months', current_date - interval '12 months', 'FINALIZADO', 850000, 'mensual', 1, true, v_uid);

  -- Cliente 2: María González
  insert into public.owners (party_type, display_name, tax_id, email, phone, is_demo, created_by)
  values ('natural', 'María González (demo)', '9.876.543-2', 'maria.gonzalez@demo.propz.cl', '+56 9 3333 3333', true, v_uid)
  returning id into v_owner;
  insert into public.admin_owners (admin_user_id, owner_id) values (v_uid, v_owner) on conflict do nothing;

  insert into public.properties (owner_id, property_type, alias, address, comuna, city, region, is_demo, created_by)
  values (v_owner, 'oficina', 'Oficina Las Condes', 'Apoquindo 3000, Of. 1204', 'Las Condes', 'Santiago', 'Metropolitana', true, v_uid)
  returning id into v_prop;
  insert into public.units (property_id, unit_type, identifier, alias, rental_mode, is_demo, created_by)
  values (v_prop, 'oficina', '1204', 'Oficina 1204', 'conjunta', true, v_uid) returning id into v_unit;
  insert into public.units (property_id, unit_type, identifier, alias, rental_mode, is_demo, created_by)
  values (v_prop, 'estacionamiento', 'E-11', 'Estacionamiento 11', 'parte_de_conjunto', true, v_uid) returning id into v_unit2;
  insert into public.tenants (owner_id, party_type, first_name, last_name, tax_id, email, phone, is_demo, created_by)
  values (v_owner, 'empresa', '', 'Estudio Jurídico Vega Ltda.', '77.111.222-3', 'contacto@vega-demo.cl', '+56 2 2555 6666', true, v_uid)
  returning id into v_tenant;
  insert into public.contracts (owner_id, property_id, unit_id, tenant_id, start_date, end_date, status, rent_amount, periodicity, due_day, is_demo, created_by)
  values (v_owner, v_prop, v_unit, v_tenant, current_date - interval '5 months', current_date + interval '19 months', 'ACTIVO', 1200000, 'mensual', 10, true, v_uid);

  insert into public.properties (owner_id, property_type, alias, address, comuna, city, region, is_demo, created_by)
  values (v_owner, 'local', 'Local Maipú', 'Av. Pajaritos 2100, Local 3', 'Maipú', 'Santiago', 'Metropolitana', true, v_uid)
  returning id into v_prop;
  insert into public.units (property_id, unit_type, identifier, alias, rental_mode, is_demo, created_by)
  values (v_prop, 'local', 'L-3', 'Local 3', 'independiente', true, v_uid) returning id into v_unit;
  insert into public.contracts (owner_id, property_id, unit_id, tenant_id, start_date, status, rent_amount, periodicity, due_day, is_demo, created_by)
  values (v_owner, v_prop, v_unit, v_tenant, current_date + interval '1 month', 'BORRADOR', 700000, 'mensual', 5, true, v_uid);

  -- Cliente 3: Inversiones ABC
  insert into public.owners (party_type, display_name, legal_name, tax_id, email, phone, is_demo, created_by)
  values ('empresa', 'Inversiones ABC (demo)', 'Inversiones ABC SpA', '76.555.444-1', 'contacto@abc-demo.cl', '+56 2 2777 8888', true, v_uid)
  returning id into v_owner;
  insert into public.admin_owners (admin_user_id, owner_id) values (v_uid, v_owner) on conflict do nothing;

  insert into public.properties (owner_id, property_type, alias, address, comuna, city, region, is_demo, created_by)
  values (v_owner, 'departamento', 'Edificio Centro — Depto 501', 'Huérfanos 800, Depto 501', 'Santiago', 'Santiago', 'Metropolitana', true, v_uid)
  returning id into v_prop;
  insert into public.units (property_id, unit_type, identifier, alias, rental_mode, is_demo, created_by)
  values (v_prop, 'departamento', '501', 'Depto 501', 'conjunta', true, v_uid) returning id into v_unit;
  insert into public.units (property_id, unit_type, identifier, alias, rental_mode, is_demo, created_by)
  values (v_prop, 'bodega', 'B-7', 'Bodega 7', 'parte_de_conjunto', true, v_uid);
  insert into public.tenants (owner_id, party_type, first_name, last_name, tax_id, email, phone, is_demo, created_by)
  values (v_owner, 'natural', 'Pedro', 'Muñoz', '17.444.555-6', 'pedro.munoz@demo.propz.cl', '+56 9 4444 5555', true, v_uid)
  returning id into v_tenant;
  insert into public.contracts (owner_id, property_id, unit_id, tenant_id, start_date, end_date, status, rent_amount, periodicity, due_day, is_demo, created_by)
  values (v_owner, v_prop, v_unit, v_tenant, current_date - interval '20 months', current_date - interval '8 months', 'FINALIZADO', 550000, 'mensual', 5, true, v_uid);

  insert into public.tenants (owner_id, party_type, first_name, last_name, tax_id, email, phone, is_demo, created_by)
  values (v_owner, 'natural', 'Valentina', 'Soto', '18.777.888-9', 'valentina.soto@demo.propz.cl', '+56 9 5555 6666', true, v_uid)
  returning id into v_tenant;
  insert into public.contracts (owner_id, property_id, unit_id, tenant_id, start_date, end_date, status, rent_amount, periodicity, due_day, is_demo, created_by)
  values (v_owner, v_prop, v_unit, v_tenant, current_date - interval '6 months', current_date + interval '6 months', 'ACTIVO', 600000, 'mensual', 5, true, v_uid);

  insert into public.properties (owner_id, property_type, alias, address, comuna, city, region, is_demo, created_by)
  values (v_owner, 'bodega', 'Bodega Quilicura', 'Camino Lo Boza 950', 'Quilicura', 'Santiago', 'Metropolitana', true, v_uid)
  returning id into v_prop;
  insert into public.units (property_id, unit_type, identifier, alias, rental_mode, is_demo, created_by)
  values (v_prop, 'bodega', 'BOD-A', 'Bodega A', 'independiente', true, v_uid);
  insert into public.units (property_id, unit_type, identifier, alias, rental_mode, is_demo, created_by)
  values (v_prop, 'bodega', 'BOD-B', 'Bodega B', 'independiente', true, v_uid);

  return jsonb_build_object('created', 3, 'message', 'Cartera demo de administración creada');
end;
$$;
revoke all on function public.seed_demo_data() from public, anon;
grant execute on function public.seed_demo_data() to authenticated;