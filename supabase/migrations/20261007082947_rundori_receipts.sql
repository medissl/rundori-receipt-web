-- Staff provisioning is an owner-only dashboard operation; no public signup role.
create table public.staff_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 active boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.staff_members enable row level security;
revoke all on public.staff_members from anon, authenticated;
grant select on public.staff_members to authenticated;
create policy staff_self on public.staff_members for select to authenticated using (user_id=(select auth.uid()));
create table public.customers (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 120),
 phone text, email text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.receipts (
 id uuid primary key, receipt_number text not null unique default ('RND-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12))),
 customer_id uuid not null references public.customers(id), customer_name text not null, phone text, email text,
 status text not null default 'received' check(status in ('received','cleaning','ready','collected','cancelled')),
 payment_method text not null check(payment_method in ('QRIS','Cash','Transfer','Other')),
 total bigint not null default 0 check(total>=0), amount_paid bigint not null default 0 check(amount_paid>=0 and amount_paid<=total),
 notes text not null default '', internal_notes text not null default '',
 public_token_hash text unique check(public_token_hash is null or public_token_hash ~ '^[a-f0-9]{64}$'),
 token_expires_at timestamptz, confirmed_at timestamptz,
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.receipt_items (
 id uuid primary key, receipt_id uuid not null references public.receipts(id) on delete cascade,
 service_name text not null check(length(service_name) between 1 and 120), description text not null default '',
 quantity integer not null check(quantity between 1 and 100), unit_price bigint not null check(unit_price between 0 and 100000000),
 position integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.item_photos (
 id uuid primary key default gen_random_uuid(), item_id uuid not null references public.receipt_items(id) on delete cascade,
 phase text not null check(phase in ('before','after')), object_key text not null unique,
 bytes integer not null check(bytes between 1 and 800000), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.delivery_logs (
 id uuid primary key, receipt_id uuid not null references public.receipts(id) on delete cascade,
 channel text not null check(channel in ('link','email','whatsapp')),
 status text not null check(status in ('pending','sent','failed','skipped','prepared')),
 detail text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index customers_name_idx on public.customers(name);
create index receipts_customer_id_idx on public.receipts(customer_id);
create index receipts_created_by_idx on public.receipts(created_by);
create index receipts_status_created_idx on public.receipts(status,created_at desc);
create index receipts_created_idx on public.receipts(created_at desc);
create index receipt_items_receipt_idx on public.receipt_items(receipt_id,position);
create index item_photos_item_idx on public.item_photos(item_id,phase);
create index delivery_logs_receipt_idx on public.delivery_logs(receipt_id,created_at desc);
-- A live table-based allowlist takes effect immediately, independent of JWT claims.
do $$ declare t text; begin
 foreach t in array array['customers','receipts','receipt_items','item_photos','delivery_logs'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon, authenticated',t);
  execute format('grant select, insert, update, delete on public.%I to authenticated',t);
  execute format('create policy staff_only on public.%I for all to authenticated using (exists(select 1 from public.staff_members s where s.user_id=(select auth.uid()) and s.active)) with check (exists(select 1 from public.staff_members s where s.user_id=(select auth.uid()) and s.active))',t);
 end loop;
end $$;
create function public.touch_updated_at() returns trigger language plpgsql security invoker set search_path='' as $$ begin new.updated_at=clock_timestamp(); return new; end $$;
revoke all on function public.touch_updated_at() from public,anon,authenticated;
do $$ declare t text; begin
 foreach t in array array['staff_members','customers','receipts','receipt_items','item_photos','delivery_logs'] loop
  execute format('create trigger touch_updated_at before update on public.%I for each row execute function public.touch_updated_at()',t);
 end loop;
end $$;
-- One transaction: no partial customer/order writes; concurrent edits reject stale versions.
create function public.save_order(payload jsonb) returns uuid language plpgsql security invoker set search_path='' as $$
declare rid uuid:=(payload->>'id')::uuid; cid uuid; current_version timestamptz; item jsonb; pos integer:=0; calculated bigint:=0;
begin
 if not exists(select 1 from public.staff_members where user_id=auth.uid() and active) then raise exception 'ACCESS_DENIED'; end if;
 if jsonb_array_length(payload->'items') not between 1 and 20 then raise exception 'INVALID_ITEMS'; end if;
 select customer_id,updated_at into cid,current_version from public.receipts where id=rid for update;
 if cid is not null and (payload->>'version')::timestamptz is distinct from current_version then raise exception 'STALE'; end if;
 for item in select value from jsonb_array_elements(payload->'items') loop
  if exists(select 1 from public.receipt_items where id=(item->>'id')::uuid and receipt_id<>rid) then raise exception 'INVALID_ITEM'; end if;
  calculated:=calculated+(item->>'quantity')::integer*(item->>'unit_price')::bigint;
 end loop;
 if length(payload->>'customer_name') not between 1 and 120 or (coalesce(payload->>'phone','')='' and coalesce(payload->>'email','')='') then raise exception 'INVALID_CUSTOMER'; end if;
 if cid is null then
  insert into public.customers(name,phone,email) values(payload->>'customer_name',nullif(payload->>'phone',''),nullif(payload->>'email','')) returning id into cid;
 else
  update public.customers set name=payload->>'customer_name',phone=nullif(payload->>'phone',''),email=nullif(payload->>'email','') where id=cid;
 end if;
 insert into public.receipts(id,customer_id,customer_name,phone,email,status,payment_method,total,amount_paid,notes,internal_notes,created_by)
 values(rid,cid,payload->>'customer_name',nullif(payload->>'phone',''),nullif(payload->>'email',''),payload->>'status',payload->>'payment_method',calculated,(payload->>'amount_paid')::bigint,coalesce(payload->>'notes',''),coalesce(payload->>'internal_notes',''),auth.uid())
 on conflict(id) do update set customer_name=excluded.customer_name,phone=excluded.phone,email=excluded.email,status=excluded.status,payment_method=excluded.payment_method,total=excluded.total,amount_paid=excluded.amount_paid,notes=excluded.notes,internal_notes=excluded.internal_notes;
 delete from public.receipt_items where receipt_id=rid and id not in(select (value->>'id')::uuid from jsonb_array_elements(payload->'items'));
 for item in select value from jsonb_array_elements(payload->'items') loop
  insert into public.receipt_items(id,receipt_id,service_name,description,quantity,unit_price,position)
  values((item->>'id')::uuid,rid,item->>'service_name',coalesce(item->>'description',''),(item->>'quantity')::integer,(item->>'unit_price')::bigint,pos)
  on conflict(id) do update set service_name=excluded.service_name,description=excluded.description,quantity=excluded.quantity,unit_price=excluded.unit_price,position=excluded.position;
  pos:=pos+1;
 end loop;
 return rid;
end $$;
revoke all on function public.save_order(jsonb) from public,anon;
grant execute on function public.save_order(jsonb) to authenticated;
create function public.prepare_delivery(rid uuid,hash text,operation uuid,channel_name text,expected_version timestamptz) returns void language plpgsql security invoker set search_path='' as $$
declare current_version timestamptz;
begin
 if not exists(select 1 from public.staff_members where user_id=auth.uid() and active) then raise exception 'ACCESS_DENIED'; end if;
 select updated_at into current_version from public.receipts where id=rid for update;
 if current_version is null then raise exception 'NOT_FOUND'; end if;
 if current_version is distinct from expected_version then raise exception 'STALE'; end if;
 if exists(select 1 from public.delivery_logs where id=operation) then raise exception 'ALREADY_PREPARED'; end if;
 update public.receipts set public_token_hash=hash,token_expires_at=now()+interval '365 days',confirmed_at=coalesce(confirmed_at,now()) where id=rid;
 insert into public.delivery_logs(id,receipt_id,channel,status) values(operation,rid,channel_name,case when channel_name='link' then 'prepared' else 'pending' end);
end $$;
revoke all on function public.prepare_delivery(uuid,text,uuid,text,timestamptz) from public,anon;
grant execute on function public.prepare_delivery(uuid,text,uuid,text,timestamptz) to authenticated;
