-- ============================================================================
-- AGRO-DELIVERIES KENYA — UNIFIED BUSINESS OPERATING SYSTEM (BOS)
-- PRODUCTION POSTGRESQL SCHEMA & SUPABASE ROW LEVEL SECURITY (RLS)
-- ============================================================================

create extension if not exists "uuid-ossp";

-- 01. ROLES & PERMISSIONS (RBAC FOUNDATION)
create table if not exists public.roles (
  id text primary key,
  name text not null unique,
  description text not null,
  is_system boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.permissions (
  key text primary key,
  module text not null,
  action text not null,
  description text not null
);

create table if not exists public.role_permissions (
  role_id text not null references public.roles(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  primary key (role_id, permission_key)
);

-- 02. INTERNAL USERS (NO PUBLIC SIGN-UP; ADMIN-INVITED ONLY)
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role_id text not null references public.roles(id),
  status text not null check (status in ('Invited', 'Active', 'Suspended', 'Disabled')) default 'Invited',
  department text not null,
  branch text not null default 'Nairobi Central Hub',
  phone text,
  invited_by uuid references public.users(id),
  last_active_at timestamptz,
  created_at timestamptz not null default now()
);

-- Helper function for Supabase Row Level Security (RLS)
create or replace function public.has_permission(required_permission text)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.users u
    join public.role_permissions rp on rp.role_id = u.role_id
    where u.id = auth.uid()
      and u.status = 'Active'
      and rp.permission_key = required_permission
  );
$$;

-- 03. CUSTOMERS & INSTITUTIONS
create table if not exists public.customers (
  id text primary key,
  name text not null,
  segment text not null check (segment in ('School', 'Hospital', 'Hotel', 'Restaurant', 'Corporate', 'Retail')),
  is_institutional boolean not null default true,
  contact_person text not null,
  email text not null,
  phone text not null,
  county text not null default 'Nairobi',
  delivery_zone text not null,
  payment_terms text not null default 'Net 30',
  credit_limit_kes numeric(14,2) not null default 0,
  outstanding_balance_kes numeric(14,2) not null default 0,
  contract_status text not null default 'Active',
  tender_reference text,
  recurring_cadence text default 'Weekly',
  status text not null default 'Active',
  created_at timestamptz not null default now()
);

-- 04. SUPPLIERS
create table if not exists public.suppliers (
  id text primary key,
  name text not null,
  category text not null,
  region text not null,
  contact_person text not null,
  phone text not null,
  email text not null,
  lead_time_days integer not null default 2,
  payment_terms text not null default 'Net 14',
  payable_balance_kes numeric(14,2) not null default 0,
  reliability_score numeric(5,2) not null default 96.0,
  status text not null default 'Active',
  created_at timestamptz not null default now()
);

-- 05. PRODUCTS & MULTI-TIER PRICING
create table if not exists public.products (
  id text primary key,
  sku text not null unique,
  name text not null,
  category text not null,
  unit text not null check (unit in ('kilograms', 'pieces', 'bunches', 'dozens', 'packs', 'bags')),
  description text,
  image_url text,
  batch_tracked boolean not null default true,
  expiry_tracked boolean not null default true,
  reorder_point numeric(12,2) not null default 50,
  retail_price_kes numeric(12,2) not null,
  online_price_kes numeric(12,2) not null,
  wholesale_price_kes numeric(12,2) not null,
  institutional_price_kes numeric(12,2) not null,
  last_supplier_cost_kes numeric(12,2) not null,
  status text not null default 'Active',
  created_at timestamptz not null default now()
);

-- 06. WAREHOUSES & FEFO STOCK BATCHES
create table if not exists public.warehouses (
  id text primary key,
  name text not null,
  code text not null unique,
  zone_type text not null,
  temperature_range text,
  capacity_utilization numeric(5,2) not null default 72.0
);

create table if not exists public.stock_batches (
  id text primary key,
  batch_number text not null unique,
  product_id text not null references public.products(id),
  warehouse_id text not null references public.warehouses(id),
  bin_code text not null,
  supplier_id text references public.suppliers(id),
  received_date date not null,
  expiry_date date,
  available_qty numeric(12,2) not null default 0,
  reserved_qty numeric(12,2) not null default 0,
  unit_cost_kes numeric(12,2) not null,
  quality_status text not null default 'Approved',
  fefo_rank integer not null default 1
);

-- 07. ORDERS, FULFILLMENT & DELIVERIES
create table if not exists public.orders (
  id text primary key,
  order_number text not null unique,
  customer_id text not null references public.customers(id),
  channel text not null check (channel in ('Institutional Contract', 'Recurring Schedule', 'Walk-In Retail', 'Manual Desk')),
  status text not null check (status in ('Draft', 'Pending Payment', 'Confirmed', 'Picking', 'Packed', 'Dispatched', 'Delivered', 'Closed', 'On Hold', 'Partially Fulfilled', 'Cancelled')),
  total_kes numeric(14,2) not null,
  payment_status text not null default 'Unpaid',
  requested_delivery_date date not null,
  warehouse_id text not null references public.warehouses(id),
  requires_approval boolean not null default false,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now()
);

-- 08. AUDIT LOGS (IMMUTABLE GOVERNANCE TRAIL)
create table if not exists public.audit_logs (
  id text primary key,
  actor_id text not null,
  actor_name text not null,
  actor_role text not null,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);

-- Enable RLS across all tables
alter table public.roles enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.users enable row level security;
alter table public.customers enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.warehouses enable row level security;
alter table public.stock_batches enable row level security;
alter table public.orders enable row level security;
alter table public.audit_logs enable row level security;

-- Representative RLS policies enforcing permission-based authorization
create policy "Users can view products with products.view"
  on public.products for select
  using (public.has_permission('products.view'));

create policy "Users can modify products with products.edit"
  on public.products for all
  using (public.has_permission('products.edit'));

create policy "Users can view orders with orders.view"
  on public.orders for select
  using (public.has_permission('orders.view'));

create policy "Users can view audit logs with audit.view"
  on public.audit_logs for select
  using (public.has_permission('audit.view'));
