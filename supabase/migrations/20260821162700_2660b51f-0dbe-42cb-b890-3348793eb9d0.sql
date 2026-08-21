-- PROPZ 6.0 — Fase 3 / Núcleo de arquitectura

create type public.app_role as enum ('propietario','administrador','superadmin');
create type public.entity_status as enum ('activo','inactivo','archivado');
create type public.property_type as enum ('departamento','casa','oficina','local','estacionamiento','bodega','terreno','otro');
create type public.unit_type as enum ('departamento','casa','oficina','local','estacionamiento','bodega','terreno','otro');
create type public.unit_rental_mode as enum ('independiente','conjunta','parte_de_conjunto');
create type public.contract_status as enum ('BORRADOR','ACTIVO','FINALIZADO','CANCELADO');
create type public.contract_periodicity as enum ('mensual','bimestral','trimestral','semestral','anual');
create type public.party_type as enum ('natural','empresa');

create or replace function public.tg_set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end; $$;

create table public.profiles (
  id uuid primary key,
  first_name text not null default '',
  last_name text not null default '',
  email text not null default '',
  phone text,
  status public.entity_status not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create trigger profiles_updated_at before update on public.profiles for each row execute function public.tg_set_updated_at();

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "user_roles_select_own" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create or replace function public.set_primary_role(_role public.app_role)
returns public.app_role language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  if _role not in ('propietario','administrador') then raise exception 'Rol no permitido'; end if;
  if exists (select 1 from public.user_roles where user_id = v_uid) then
    return (select role from public.user_roles where user_id = v_uid limit 1);
  end if;
  insert into public.user_roles (user_id, role) values (v_uid, _role);
  return _role;
end; $$;
grant execute on function public.set_primary_role(public.app_role) to authenticated;

create table public.owners (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  party_type public.party_type not null default 'natural',
  display_name text not null,
  legal_name text,
  tax_id text,
  email text,
  phone text,
  notes text,
  status public.entity_status not null default 'activo',
  is_demo boolean not null default false,
  created_by uuid not null default auth.uid(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index owners_user_id_idx on public.owners(user_id);
grant select, insert, update on public.owners to authenticated;
grant all on public.owners to service_role;
alter table public.owners enable row level security;
create trigger owners_updated_at before update on public.owners for each row execute function public.tg_set_updated_at();

create table public.admin_owners (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null,
  owner_id uuid not null references public.owners(id) on delete restrict,
  status public.entity_status not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (admin_user_id, owner_id)
);
create index admin_owners_admin_idx on public.admin_owners(admin_user_id);
grant select, insert, update on public.admin_owners to authenticated;
grant all on public.admin_owners to service_role;
alter table public.admin_owners enable row level security;
create trigger admin_owners_updated_at before update on public.admin_owners for each row execute function public.tg_set_updated_at();

create or replace function public.can_access_owner(_owner_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.owners o
    where o.id = _owner_id
      and (
        o.user_id = auth.uid()
        or exists (
          select 1 from public.admin_owners ao
          where ao.owner_id = o.id
            and ao.admin_user_id = auth.uid()
            and ao.status = 'activo'
        )
      )
  );
$$;
grant execute on function public.can_access_owner(uuid) to authenticated;

create policy "owners_select" on public.owners for select to authenticated using (public.can_access_owner(id));
create policy "owners_insert" on public.owners for insert to authenticated with check (created_by = auth.uid());
create policy "owners_update" on public.owners for update to authenticated using (public.can_access_owner(id)) with check (public.can_access_owner(id));

create or replace function public.tg_owner_link_creator()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return new; end if;
  if public.has_role(v_uid, 'administrador') then
    insert into public.admin_owners (admin_user_id, owner_id)
    values (v_uid, new.id) on conflict do nothing;
  end if;
  return new;
end; $$;
create trigger owners_link_creator after insert on public.owners for each row execute function public.tg_owner_link_creator();

create policy "admin_owners_select" on public.admin_owners for select to authenticated
  using (admin_user_id = auth.uid() or public.can_access_owner(owner_id));
create policy "admin_owners_insert" on public.admin_owners for insert to authenticated
  with check (admin_user_id = auth.uid() and public.has_role(auth.uid(), 'administrador'));
create policy "admin_owners_update" on public.admin_owners for update to authenticated
  using (admin_user_id = auth.uid()) with check (admin_user_id = auth.uid());

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners(id) on delete restrict,
  property_type public.property_type not null default 'departamento',
  alias text not null,
  address text not null default '',
  comuna text,
  city text,
  region text,
  country text not null default 'Chile',
  status public.entity_status not null default 'activo',
  is_demo boolean not null default false,
  created_by uuid default auth.uid(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index properties_owner_idx on public.properties(owner_id);
grant select, insert, update on public.properties to authenticated;
grant all on public.properties to service_role;
alter table public.properties enable row level security;
create trigger properties_updated_at before update on public.properties for each row execute function public.tg_set_updated_at();
create policy "properties_select" on public.properties for select to authenticated using (public.can_access_owner(owner_id));
create policy "properties_insert" on public.properties for insert to authenticated with check (public.can_access_owner(owner_id));
create policy "properties_update" on public.properties for update to authenticated using (public.can_access_owner(owner_id)) with check (public.can_access_owner(owner_id));

create or replace function public.owner_of_property(_property_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select owner_id from public.properties where id = _property_id;
$$;

create or replace function public.can_access_property(_property_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_access_owner(public.owner_of_property(_property_id));
$$;
grant execute on function public.can_access_property(uuid) to authenticated;

create table public.units (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete restrict,
  unit_type public.unit_type not null default 'departamento',
  identifier text not null,
  alias text,
  rental_mode public.unit_rental_mode not null default 'independiente',
  parent_unit_id uuid references public.units(id) on delete set null,
  status public.entity_status not null default 'activo',
  is_demo boolean not null default false,
  created_by uuid default auth.uid(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index units_property_idx on public.units(property_id);
grant select, insert, update on public.units to authenticated;
grant all on public.units to service_role;
alter table public.units enable row level security;
create trigger units_updated_at before update on public.units for each row execute function public.tg_set_updated_at();
create policy "units_select" on public.units for select to authenticated using (public.can_access_property(property_id));
create policy "units_insert" on public.units for insert to authenticated with check (public.can_access_property(property_id));
create policy "units_update" on public.units for update to authenticated using (public.can_access_property(property_id)) with check (public.can_access_property(property_id));

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners(id) on delete restrict,
  party_type public.party_type not null default 'natural',
  first_name text not null default '',
  last_name text not null default '',
  tax_id text,
  email text,
  phone text,
  status public.entity_status not null default 'activo',
  is_demo boolean not null default false,
  created_by uuid default auth.uid(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tenants_owner_idx on public.tenants(owner_id);
grant select, insert, update on public.tenants to authenticated;
grant all on public.tenants to service_role;
alter table public.tenants enable row level security;
create trigger tenants_updated_at before update on public.tenants for each row execute function public.tg_set_updated_at();
create policy "tenants_select" on public.tenants for select to authenticated using (public.can_access_owner(owner_id));
create policy "tenants_insert" on public.tenants for insert to authenticated with check (public.can_access_owner(owner_id));
create policy "tenants_update" on public.tenants for update to authenticated using (public.can_access_owner(owner_id)) with check (public.can_access_owner(owner_id));

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.owners(id) on delete restrict,
  property_id uuid not null references public.properties(id) on delete restrict,
  unit_id uuid not null references public.units(id) on delete restrict,
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  start_date date not null,
  end_date date,
  status public.contract_status not null default 'BORRADOR',
  rent_amount numeric(14,2) not null default 0,
  currency text not null default 'CLP',
  periodicity public.contract_periodicity not null default 'mensual',
  due_day smallint not null default 5 check (due_day between 1 and 31),
  notes text,
  is_demo boolean not null default false,
  created_by uuid default auth.uid(),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index contracts_owner_idx on public.contracts(owner_id);
create index contracts_unit_idx on public.contracts(unit_id);
create index contracts_tenant_idx on public.contracts(tenant_id);
grant select, insert, update on public.contracts to authenticated;
grant all on public.contracts to service_role;
alter table public.contracts enable row level security;
create trigger contracts_updated_at before update on public.contracts for each row execute function public.tg_set_updated_at();
create policy "contracts_select" on public.contracts for select to authenticated using (public.can_access_owner(owner_id));
create policy "contracts_insert" on public.contracts for insert to authenticated with check (public.can_access_owner(owner_id));
create policy "contracts_update" on public.contracts for update to authenticated using (public.can_access_owner(owner_id)) with check (public.can_access_owner(owner_id));

create or replace function public.tg_contract_validate()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_owner uuid; v_prop uuid; v_tenant_owner uuid;
begin
  select owner_id into v_owner from public.properties where id = new.property_id;
  if v_owner is null or v_owner <> new.owner_id then
    raise exception 'La propiedad no pertenece al propietario indicado';
  end if;
  select property_id into v_prop from public.units where id = new.unit_id;
  if v_prop is null or v_prop <> new.property_id then
    raise exception 'La unidad no pertenece a la propiedad indicada';
  end if;
  select owner_id into v_tenant_owner from public.tenants where id = new.tenant_id;
  if v_tenant_owner is null or v_tenant_owner <> new.owner_id then
    raise exception 'El arrendatario no pertenece al propietario indicado';
  end if;
  if new.end_date is not null and new.end_date < new.start_date then
    raise exception 'La fecha de término no puede ser anterior al inicio';
  end if;
  return new;
end; $$;
create trigger contracts_validate before insert or update on public.contracts for each row execute function public.tg_contract_validate();

create table public.contract_units (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete restrict,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (contract_id, unit_id)
);
grant select, insert, update, delete on public.contract_units to authenticated;
grant all on public.contract_units to service_role;
alter table public.contract_units enable row level security;
create policy "contract_units_all" on public.contract_units for all to authenticated
  using (exists (select 1 from public.contracts c where c.id = contract_id and public.can_access_owner(c.owner_id)))
  with check (exists (select 1 from public.contracts c where c.id = contract_id and public.can_access_owner(c.owner_id)));

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  entity_type text not null,
  entity_id uuid,
  action text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);
grant select on public.audit_events to authenticated;
grant all on public.audit_events to service_role;
alter table public.audit_events enable row level security;
create policy "audit_select_own" on public.audit_events for select to authenticated using (actor_user_id = auth.uid());