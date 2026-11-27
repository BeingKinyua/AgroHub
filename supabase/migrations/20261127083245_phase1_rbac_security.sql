-- ============================================================================
-- AGRO-DELIVERIES KE — PHASE 1: CANONICAL RBAC AND DATABASE SECURITY
-- Migration: 20261127083245_phase1_rbac_security
--
-- Replaces the exposed public.has_permission(text) helper with a private,
-- search_path-pinned helper; canonicalises roles; and applies least-privilege
-- grants and explicit RLS policies to the existing Phase 0 schema.
-- ============================================================================

begin;

-- 1. Private schema: keep security-definer helpers outside the exposed API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

-- 2. Remove all existing public-table policies before replacing the old
--    helper. This also removes the overly broad products FOR ALL policy.
do $$
declare
  t text;
  p record;
begin
  foreach t in array array[
    'roles','permissions','role_permissions','users','customers','suppliers',
    'products','warehouses','stock_batches','orders','audit_logs'
  ] loop
    for p in
      select pol.policyname
      from pg_policies pol
      where pol.schemaname = 'public'
        and pol.tablename = t
    loop
      execute format('drop policy if exists %I on public.%I', p.policyname, t);
    end loop;
  end loop;
end
$$;

-- 3. Remove the old RPC-exposed SECURITY DEFINER function.
revoke all on function public.has_permission(text) from public, anon, authenticated, service_role;
drop function if exists public.has_permission(text);

-- 4. Canonical permission catalogue. Keys and metadata are aligned with
--    src/lib/permissions/rbac.ts (49 permissions).
insert into public.permissions (key, module, action, description)
values
  ('dashboard.view','Dashboard','View','Access operational command center'),
  ('orders.view','Orders','View','View institutional and retail orders'),
  ('orders.create','Orders','Create','Create new customer orders'),
  ('orders.edit','Orders','Edit','Modify order quantities and schedules'),
  ('orders.approve','Orders','Approve','Approve institutional credit or price overrides'),
  ('orders.export','Orders','Export','Export order manifests and schedules'),
  ('fulfillment.view','Fulfillment','View','View picking, packing, and staging queues'),
  ('fulfillment.manage','Fulfillment','Edit','Advance orders through picking and packing'),
  ('customers.view','Customers','View','View customers and institutional contracts'),
  ('customers.create','Customers','Create','Onboard new customers and institutions'),
  ('customers.edit','Customers','Edit','Update customer terms and contacts'),
  ('products.view','Products','View','View product catalog and pricing tiers'),
  ('products.create','Products','Create','Add new SKUs to the catalog'),
  ('products.edit','Products','Edit','Edit multi-tier product prices and units'),
  ('inventory.view','Inventory','View','View warehouse stock, FEFO batches, and expiry'),
  ('inventory.receive','Inventory','Create','Receive goods and post stock batches'),
  ('inventory.adjust','Inventory','Edit','Record stock counts, wastage, and adjustments'),
  ('inventory.transfer','Inventory','Edit','Transfer stock across warehouse zones'),
  ('procurement.view','Procurement','View','View purchase requests, POs, and GRNs'),
  ('procurement.create','Procurement','Create','Raise purchase requests and purchase orders'),
  ('procurement.approve','Procurement','Approve','Approve purchase orders and supplier spend'),
  ('suppliers.view','Suppliers','View','View supplier directory and price history'),
  ('suppliers.create','Suppliers','Create','Register new farm cooperatives and vendors'),
  ('suppliers.edit','Suppliers','Edit','Update supplier lead times and price lists'),
  ('suppliers.approve','Suppliers','Approve','Approve new suppliers, price revisions, and contracts'),
  ('suppliers.suspend','Suppliers','Edit','Suspend or reactivate vendor accounts'),
  ('deliveries.view','Deliveries','View','View delivery runs, routes, and POD status'),
  ('deliveries.assign','Deliveries','Edit','Assign drivers and vehicles to routes'),
  ('deliveries.dispatch','Deliveries','Approve','Confirm dispatch and capture Proof of Delivery'),
  ('fleet.view','Fleet','View','View vehicles, drivers, and delivery assets'),
  ('fleet.manage','Fleet','Edit','Register, assign, and maintain fleet vehicles and drivers'),
  ('finance.view','Finance','View','View AR, AP, invoices, and financial ledgers'),
  ('finance.record_payment','Finance','Create','Record customer receipts and supplier payments'),
  ('finance.allocate_payment','Finance','Edit','Allocate payments against open invoices'),
  ('finance.reconcile','Finance','Approve','Reconcile M-Pesa and bank statements'),
  ('crm.view','CRM','View','View institutional contacts, tickets, and renewals'),
  ('crm.manage','CRM','Edit','Log follow-ups, resolve complaints, manage contracts'),
  ('reports.view','Reports','View','View operational and financial analytics'),
  ('reports.export','Reports','Export','Export analytical reports to CSV'),
  ('approvals.view','Approvals','View','Access centralized approval inbox'),
  ('approvals.approve','Approvals','Approve','Approve or reject governed operational requests'),
  ('documents.view','Documents','View','View invoices, GRNs, PODs, and certificates'),
  ('documents.manage','Documents','Create','Upload and verify operational documents'),
  ('administration.users.view','Administration','View','View internal employee directory'),
  ('administration.users.create','Administration','Create','Invite new internal members'),
  ('administration.users.edit','Administration','Edit','Activate, suspend, or disable user accounts'),
  ('administration.roles.view','Administration','View','View RBAC roles and permission mappings'),
  ('administration.roles.manage','Administration','Edit','Modify role permissions and create roles'),
  ('audit.view','Audit Logs','View','Inspect immutable system audit trail')
on conflict (key) do update set
  module = excluded.module,
  action = excluded.action,
  description = excluded.description;

-- 5. Seed the nine canonical system roles.
insert into public.roles (id, name, description, is_system)
values
  ('administrator','Administrator','System governance, employee onboarding, role and permission administration, and security oversight.',true),
  ('business_owner','Business Owner / Executive','Business-wide visibility, financial oversight, approvals, and governance reporting.',true),
  ('manager','Manager','Cross-functional operational leadership across orders, procurement, inventory, fulfillment, logistics, and approvals.',true),
  ('sales_representative','Sales Representative','Customer accounts, institutional orders, contracts, and CRM follow-ups.',true),
  ('procurement_officer','Procurement Officer','Supplier relationships, sourcing, purchase requests, purchasing, and supplier pricing.',true),
  ('storekeeper','Storekeeper','Goods receiving, stock batches, inventory controls, picking, and fulfillment.',true),
  ('logistics_officer','Logistics Officer','Fleet, drivers, dispatch assignments, delivery execution, and proof of delivery.',true),
  ('finance_officer','Finance Officer','Receivables, payables, payment recording, allocations, reconciliation, and financial reporting.',true),
  ('viewer','Viewer','Explicit read-only access to core business information; no create, edit, approve, export, or administration privileges.',true)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  is_system = true;

-- 6. Preserve existing assignments and permission mappings while translating
--    legacy role IDs to the canonical IDs. Custom role IDs are untouched.
insert into public.role_permissions (role_id, permission_key)
select
  case rp.role_id
    when 'executive' then 'business_owner'
    when 'operations_manager' then 'manager'
    when 'sales_rep' then 'sales_representative'
    when 'accounts_clerk' then 'finance_officer'
    when 'finance_manager' then 'finance_officer'
    when 'delivery_driver' then 'logistics_officer'
  end,
  rp.permission_key
from public.role_permissions rp
where rp.role_id in (
  'executive','operations_manager','sales_rep',
  'accounts_clerk','finance_manager','delivery_driver'
)
on conflict do nothing;

update public.users
set role_id = case role_id
  when 'executive' then 'business_owner'
  when 'operations_manager' then 'manager'
  when 'sales_rep' then 'sales_representative'
  when 'accounts_clerk' then 'finance_officer'
  when 'finance_manager' then 'finance_officer'
  when 'delivery_driver' then 'logistics_officer'
  else role_id
end
where role_id in (
  'executive','operations_manager','sales_rep',
  'accounts_clerk','finance_manager','delivery_driver'
);

delete from public.role_permissions
where role_id in (
  'executive','operations_manager','sales_rep',
  'accounts_clerk','finance_manager','delivery_driver'
);
delete from public.roles
where id in (
  'executive','operations_manager','sales_rep',
  'accounts_clerk','finance_manager','delivery_driver'
);

-- 7. Canonical role-to-permission matrix. Finance Officer consolidates the
--    former Accounts Clerk and Finance Manager grants. Viewer is read-only.
delete from public.role_permissions
where role_id in (
  'administrator','business_owner','manager','sales_representative',
  'procurement_officer','storekeeper','logistics_officer','finance_officer','viewer'
);

with role_grants(role_id, permission_keys) as (
  values
  ('business_owner', array[
    'dashboard.view','orders.view','orders.approve','orders.export',
    'fulfillment.view','customers.view','products.view','inventory.view',
    'procurement.view','procurement.approve','suppliers.view','suppliers.approve',
    'suppliers.suspend','deliveries.view','fleet.view','fleet.manage',
    'finance.view','finance.reconcile','crm.view','reports.view','reports.export',
    'approvals.view','approvals.approve','documents.view',
    'administration.users.view','administration.roles.view','audit.view'
  ]::text[]),
  ('manager', array[
    'dashboard.view','orders.view','orders.create','orders.edit','orders.approve',
    'orders.export','fulfillment.view','fulfillment.manage','customers.view',
    'products.view','products.edit','inventory.view','inventory.receive',
    'inventory.adjust','inventory.transfer','procurement.view','procurement.create',
    'procurement.approve','suppliers.view','suppliers.edit','suppliers.approve',
    'suppliers.suspend','deliveries.view','deliveries.assign','deliveries.dispatch',
    'fleet.view','fleet.manage','crm.view','crm.manage','reports.view','reports.export',
    'approvals.view','approvals.approve','documents.view','documents.manage'
  ]::text[]),
  ('sales_representative', array[
    'dashboard.view','orders.view','orders.create','orders.edit','orders.export',
    'fulfillment.view','customers.view','customers.create','customers.edit',
    'products.view','inventory.view','deliveries.view','crm.view','crm.manage',
    'documents.view'
  ]::text[]),
  ('procurement_officer', array[
    'dashboard.view','products.view','products.create','products.edit','inventory.view',
    'inventory.receive','procurement.view','procurement.create','suppliers.view',
    'suppliers.create','suppliers.edit','suppliers.approve','suppliers.suspend',
    'reports.view','documents.view','documents.manage'
  ]::text[]),
  ('storekeeper', array[
    'dashboard.view','orders.view','fulfillment.view','fulfillment.manage',
    'products.view','inventory.view','inventory.receive','inventory.adjust',
    'inventory.transfer','procurement.view','deliveries.view','documents.view',
    'documents.manage'
  ]::text[]),
  ('logistics_officer', array[
    'dashboard.view','orders.view','fulfillment.view','deliveries.view',
    'deliveries.dispatch','fleet.view','documents.view','documents.manage'
  ]::text[]),
  ('finance_officer', array[
    'dashboard.view','orders.view','orders.approve','customers.view','customers.edit',
    'suppliers.view','products.view','inventory.view','procurement.view',
    'procurement.approve','finance.view','finance.record_payment',
    'finance.allocate_payment','finance.reconcile','reports.view','reports.export',
    'approvals.view','approvals.approve','documents.view','documents.manage','audit.view'
  ]::text[]),
  ('viewer', array[
    'dashboard.view','orders.view','fulfillment.view','customers.view','products.view',
    'inventory.view','procurement.view','suppliers.view','deliveries.view','fleet.view',
    'finance.view','crm.view','reports.view','approvals.view','documents.view'
  ]::text[])
)
insert into public.role_permissions (role_id, permission_key)
select rg.role_id, unnest(rg.permission_keys)
from role_grants rg
on conflict do nothing;

-- Administrator receives the complete current permission catalogue.
insert into public.role_permissions (role_id, permission_key)
select 'administrator', p.key
from public.permissions p
on conflict do nothing;

-- 8. Private, hardened authorization helpers. SECURITY DEFINER is necessary
--    because users/role_permissions are themselves protected by RLS.
create or replace function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users as u
    where u.id = (select auth.uid())
      and u.status = 'Active'
  );
$$;

create or replace function private.has_permission(required_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select auth.uid()) is not null
    and exists (
      select 1
      from public.users as u
      join public.role_permissions as rp on rp.role_id = u.role_id
      where u.id = (select auth.uid())
        and u.status = 'Active'
        and rp.permission_key = required_permission
    );
$$;

revoke all on function private.is_active_user() from public, anon, authenticated;
revoke all on function private.has_permission(text) from public, anon, authenticated;
grant execute on function private.is_active_user() to authenticated;
grant execute on function private.has_permission(text) to authenticated;

-- 9. Explicit table privileges. RLS controls rows; SQL grants control which
--    operations the API role can attempt. No direct deletes are granted.
revoke all on table
  public.roles, public.permissions, public.role_permissions, public.users,
  public.customers, public.suppliers, public.products, public.warehouses,
  public.stock_batches, public.orders, public.audit_logs
from anon, authenticated;

grant select on table
  public.roles, public.permissions, public.role_permissions, public.users,
  public.customers, public.suppliers, public.products, public.warehouses,
  public.stock_batches, public.orders, public.audit_logs
to authenticated;

grant insert, update on table
  public.customers, public.suppliers, public.products, public.stock_batches,
  public.orders
to authenticated;

-- 10. Explicit RLS policies for all eleven existing business tables.
create policy "rbac_active_users_read_roles"
on public.roles for select to authenticated
using ((select private.is_active_user()));

create policy "rbac_active_users_read_permissions"
on public.permissions for select to authenticated
using ((select private.is_active_user()));

create policy "rbac_active_users_read_role_permissions"
on public.role_permissions for select to authenticated
using ((select private.is_active_user()));

create policy "rbac_users_read_self_or_admin"
on public.users for select to authenticated
using (
  id = (select auth.uid())
  or (select private.has_permission('administration.users.view'))
);

create policy "rbac_customers_select"
on public.customers for select to authenticated
using ((select private.has_permission('customers.view')));

create policy "rbac_customers_insert"
on public.customers for insert to authenticated
with check ((select private.has_permission('customers.create')));

create policy "rbac_customers_update"
on public.customers for update to authenticated
using ((select private.has_permission('customers.edit')))
with check ((select private.has_permission('customers.edit')));

create policy "rbac_suppliers_select"
on public.suppliers for select to authenticated
using ((select private.has_permission('suppliers.view')));

create policy "rbac_suppliers_insert"
on public.suppliers for insert to authenticated
with check ((select private.has_permission('suppliers.create')));

create policy "rbac_suppliers_update"
on public.suppliers for update to authenticated
using ((select private.has_permission('suppliers.edit')))
with check ((select private.has_permission('suppliers.edit')));

create policy "rbac_products_select"
on public.products for select to authenticated
using ((select private.has_permission('products.view')));

create policy "rbac_products_insert"
on public.products for insert to authenticated
with check ((select private.has_permission('products.create')));

create policy "rbac_products_update"
on public.products for update to authenticated
using ((select private.has_permission('products.edit')))
with check ((select private.has_permission('products.edit')));

create policy "rbac_warehouses_select"
on public.warehouses for select to authenticated
using ((select private.has_permission('inventory.view')));

create policy "rbac_stock_batches_select"
on public.stock_batches for select to authenticated
using ((select private.has_permission('inventory.view')));

create policy "rbac_stock_batches_insert"
on public.stock_batches for insert to authenticated
with check ((select private.has_permission('inventory.receive')));

create policy "rbac_stock_batches_update"
on public.stock_batches for update to authenticated
using (
  (select private.has_permission('inventory.adjust'))
  or (select private.has_permission('inventory.transfer'))
)
with check (
  (select private.has_permission('inventory.adjust'))
  or (select private.has_permission('inventory.transfer'))
);

create policy "rbac_orders_select"
on public.orders for select to authenticated
using ((select private.has_permission('orders.view')));

create policy "rbac_orders_insert"
on public.orders for insert to authenticated
with check ((select private.has_permission('orders.create')));

create policy "rbac_orders_update"
on public.orders for update to authenticated
using (
  (select private.has_permission('orders.edit'))
  or (select private.has_permission('fulfillment.manage'))
  or (select private.has_permission('deliveries.assign'))
  or (select private.has_permission('deliveries.dispatch'))
)
with check (
  (select private.has_permission('orders.edit'))
  or (select private.has_permission('fulfillment.manage'))
  or (select private.has_permission('deliveries.assign'))
  or (select private.has_permission('deliveries.dispatch'))
);

create policy "rbac_audit_logs_select"
on public.audit_logs for select to authenticated
using ((select private.has_permission('audit.view')));

-- Intentionally absent: client-side INSERT/UPDATE/DELETE policies for users,
-- roles, permissions, role_permissions, warehouses, and audit_logs; DELETE
-- policies for business records; and all write policies for anon.
-- Trusted server-side Admin APIs will perform identity/role changes using
-- the service role after independently validating the caller's session and
-- administration permissions.

commit;
