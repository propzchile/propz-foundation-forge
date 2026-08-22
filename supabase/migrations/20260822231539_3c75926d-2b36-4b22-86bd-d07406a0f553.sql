-- 1. Revocar permisos amplios y aplicar mínimos necesarios
do $$
declare t text;
begin
  foreach t in array array['admin_owners','audit_events','contract_units','contracts','owners','profiles','properties','tenants','units','user_roles']
  loop
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;

grant select, insert, update on public.admin_owners to authenticated;
grant select, insert, update on public.owners to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.properties to authenticated;
grant select, insert, update on public.tenants to authenticated;
grant select, insert, update on public.units to authenticated;
grant select, insert, update on public.contracts to authenticated;
grant select, insert, update, delete on public.contract_units to authenticated;
grant select, insert on public.audit_events to authenticated;
grant select on public.user_roles to authenticated;

-- 2. Auditoría: insertar solo eventos propios; sin update/delete
drop policy if exists audit_insert_own on public.audit_events;
create policy audit_insert_own on public.audit_events
  for insert to authenticated
  with check (actor_user_id = auth.uid());

-- 3. contract_units: validar que la unidad pertenezca a la propiedad del contrato
create or replace function public.tg_contract_unit_validate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare v_prop uuid; v_unit_prop uuid;
begin
  select property_id into v_prop from public.contracts where id = new.contract_id;
  select property_id into v_unit_prop from public.units where id = new.unit_id;
  if v_prop is null or v_unit_prop is null or v_prop <> v_unit_prop then
    raise exception 'La unidad no pertenece a la propiedad del contrato';
  end if;
  return new;
end; $$;

drop trigger if exists contract_units_validate on public.contract_units;
create trigger contract_units_validate
  before insert or update on public.contract_units
  for each row execute function public.tg_contract_unit_validate();

-- 4. owners: creación coherente con el contexto del usuario
drop policy if exists owners_insert on public.owners;
create policy owners_insert on public.owners
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      user_id = auth.uid()
      or (user_id is null and public.has_role(auth.uid(), 'administrador'))
    )
  );