-- admin_owners es una tabla puente: al eliminar el propietario, el vínculo se va con él.
alter table public.admin_owners drop constraint admin_owners_owner_id_fkey;
alter table public.admin_owners add constraint admin_owners_owner_id_fkey
  foreign key (owner_id) references public.owners(id) on delete cascade;

grant delete on public.owners to authenticated;
grant delete on public.properties to authenticated;
grant delete on public.units to authenticated;
grant delete on public.tenants to authenticated;
grant delete on public.contracts to authenticated;
grant delete on public.contract_units to authenticated;

create policy owners_delete on public.owners
  for delete to authenticated using (public.can_access_owner(id));

create policy properties_delete on public.properties
  for delete to authenticated using (public.can_access_owner(owner_id));

create policy units_delete on public.units
  for delete to authenticated using (public.can_access_property(property_id));

create policy tenants_delete on public.tenants
  for delete to authenticated using (public.can_access_owner(owner_id));

create policy contracts_delete on public.contracts
  for delete to authenticated using (public.can_access_owner(owner_id) and status <> 'ACTIVO');