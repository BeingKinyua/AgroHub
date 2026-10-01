'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  SlidersHorizontal,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import {
  Card,
  ChartCard,
  FeedbackBanner,
  KPI,
  Modal,
  PageHeader,
  StatusBadge,
} from '@/components/ui/primitives';
import { PermissionKey } from '@/types/domain/bos';

const REVENUE_TREND_DATA = [
  { week: 'Wk 34', revenueKes: 1940000, procurementKes: 1210000, deliveries: 42 },
  { week: 'Wk 35', revenueKes: 2180000, procurementKes: 1340000, deliveries: 48 },
  { week: 'Wk 36', revenueKes: 2090000, procurementKes: 1190000, deliveries: 46 },
  { week: 'Wk 37', revenueKes: 2450000, procurementKes: 1480000, deliveries: 53 },
  { week: 'Wk 38', revenueKes: 2620000, procurementKes: 1510000, deliveries: 58 },
  { week: 'Wk 39', revenueKes: 2890000, procurementKes: 1620000, deliveries: 64 },
];

const SEGMENT_MIX_DATA = [
  { segment: 'Boarding Schools', volumeKg: 14200, revenueKes: 1180000 },
  { segment: 'Hospitals', volumeKg: 8900, revenueKes: 840000 },
  { segment: 'Hotels & Lodges', volumeKg: 6400, revenueKes: 590000 },
  { segment: 'Restaurants', volumeKg: 3800, revenueKes: 280000 },
];

const WIDGET_REGISTRY: {
  id: string;
  label: string;
  permission: PermissionKey;
}[] = [
  { id: 'kpi_row', label: 'Role-Aware KPI Summary Row', permission: 'dashboard.view' },
  {
    id: 'operational_intelligence',
    label: 'Operational Shift Intelligence Brief',
    permission: 'dashboard.view',
  },
  {
    id: 'revenue_fulfillment_chart',
    label: 'Revenue, Procurement & Segment Analytics',
    permission: 'dashboard.view',
  },
  {
    id: 'fefo_expiry_radar',
    label: 'FEFO Perishable Stock & Expiry Radar',
    permission: 'inventory.view',
  },
  {
    id: 'pending_approvals',
    label: 'Governance Approval Queue',
    permission: 'approvals.view',
  },
  {
    id: 'recent_orders_table',
    label: 'Active Institutional Order Pipeline',
    permission: 'orders.view',
  },
];

export default function DashboardPage() {
  const {
    currentUser,
    can,
    orders,
    products,
    stockBatches,
    customers,
    suppliers,
    deliveries,
    approvals,
    users,
    enabledWidgets,
    toggleDashboardWidget,
    moveDashboardWidget,
    resetDashboardWidgets,
    resolveApproval,
  } = useBos();

  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [aiBrief, setAiBrief] = useState<{
    headline: string;
    priorities: string[];
    riskAlert: string;
  } | null>(null);

  // Derived real metrics from operational store
  const totalOrderValueKes = useMemo(
    () => orders.reduce((acc, o) => acc + o.totalKes, 0),
    [orders]
  );
  const openOrdersCount = useMemo(
    () =>
      orders.filter((o) => o.status !== 'Delivered' && o.status !== 'Closed')
        .length,
    [orders]
  );
  const inventoryValueKes = useMemo(
    () =>
      products.reduce(
        (acc, p) => acc + p.availableQty * p.pricing.supplierCostKes,
        0
      ),
    [products]
  );
  const totalReceivablesKes = useMemo(
    () => customers.reduce((acc, c) => acc + c.outstandingBalanceKes, 0),
    [customers]
  );
  const overdueReceivablesKes = useMemo(
    () => customers.reduce((acc, c) => acc + c.overdueBalanceKes, 0),
    [customers]
  );
  const totalPayablesKes = useMemo(
    () => suppliers.reduce((acc, s) => acc + s.payableBalanceKes, 0),
    [suppliers]
  );
  const expiringBatches = useMemo(
    () => stockBatches.filter((b) => b.daysToExpiry <= 7),
    [stockBatches]
  );
  const pendingApprovals = useMemo(
    () => approvals.filter((a) => a.status === 'Pending'),
    [approvals]
  );

  // Fetch RBAC-safe operational intelligence brief
  useEffect(() => {
    if (!currentUser) return;
    let active = true;
    fetch('/api/ai/brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: currentUser.id,
        openOrdersCount,
        expiringBatchesCount: expiringBatches.length,
        pendingApprovalsCount: pendingApprovals.length,
        overdueReceivablesKes,
        upcomingPayablesKes: totalPayablesKes,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (active && data.headline) setAiBrief(data);
      })
      .catch(() => {
        // fallback handled
      });
    return () => {
      active = false;
    };
  }, [
    currentUser,
    openOrdersCount,
    expiringBatches.length,
    pendingApprovals.length,
    overdueReceivablesKes,
    totalPayablesKes,
  ]);

  // Role-specific KPI configuration (Section 22)
  const roleKpis = useMemo(() => {
    const roleId = currentUser?.roleId || 'executive';

    if (roleId === 'storekeeper') {
      return [
        {
          label: 'Total Warehouse Inventory Value',
          value: `KES ${(inventoryValueKes / 1000000).toFixed(2)}M`,
          sublabel: 'Across 3 Nairobi cold & dry bulk hubs',
          delta: '98.4% Bin Accuracy',
          tone: 'positive' as const,
        },
        {
          label: 'FEFO Batches Expiring <= 7d',
          value: `${expiringBatches.length} Batches`,
          sublabel: 'LOT-2609-SKM-C1 & LOT-2609-TOM-A1 priority',
          delta: 'Action Required',
          tone: 'warning' as const,
        },
        {
          label: 'Orders in Picking / Packing',
          value: `${
            orders.filter(
              (o) => o.status === 'Picking' || o.status === 'Confirmed'
            ).length
          } Orders`,
          sublabel: 'Nairobi West Hospital & Alliance High',
          delta: '06:30 EAT Cutoff',
          tone: 'neutral' as const,
        },
        {
          label: 'Recorded Shift Wastage',
          value: '18 kg',
          sublabel: '0.32% of cold-chain throughput (below 1.0% cap)',
          delta: '-0.4% vs Wk 38',
          tone: 'positive' as const,
        },
      ];
    }

    if (roleId === 'finance_manager' || roleId === 'accounts_clerk') {
      return [
        {
          label: 'Institutional Accounts Receivable',
          value: `KES ${totalReceivablesKes.toLocaleString()}`,
          sublabel: `KES ${overdueReceivablesKes.toLocaleString()} overdue (>45d)`,
          delta: '1 Overdue Account',
          tone: 'warning' as const,
        },
        {
          label: 'Cooperative & Miller Payables',
          value: `KES ${totalPayablesKes.toLocaleString()}`,
          sublabel: 'Kinangop Growers & Mwea Rice Millers',
          delta: 'Net 14 / Net 30',
          tone: 'neutral' as const,
        },
        {
          label: 'Active Order Pipeline Value',
          value: `KES ${totalOrderValueKes.toLocaleString()}`,
          sublabel: `${orders.length} active institutional & retail orders`,
          delta: '+14.2% MoM',
          tone: 'positive' as const,
        },
        {
          label: 'Unreconciled M-Pesa / EFTs',
          value: '1 Receipt',
          sublabel: 'MPESA-B2B-994012A (KES 185,000)',
          delta: 'Ready to Match',
          tone: 'warning' as const,
        },
      ];
    }

    if (roleId === 'procurement_officer') {
      return [
        {
          label: 'Active Farm & Miller Suppliers',
          value: `${suppliers.length} Vendors`,
          sublabel: '97.6% average QC acceptance score',
          delta: '1 Price Alert (+6%)',
          tone: 'warning' as const,
        },
        {
          label: 'Pending PO Approvals',
          value: 'KES 910,000',
          sublabel: 'PO-2026-515 (100 bags Mwea Pishori Rice)',
          delta: 'Awaiting Sign-Off',
          tone: 'warning' as const,
        },
        {
          label: 'Incoming GRN Shipments',
          value: '3,800 Units',
          sublabel: 'Tomatoes, Potatoes & Export Avocados',
          delta: 'Arriving Today',
          tone: 'positive' as const,
        },
        {
          label: 'Current Stock Coverage',
          value: `KES ${(inventoryValueKes / 1000000).toFixed(2)}M`,
          sublabel: 'Zero stockouts on contracted school items',
          delta: 'Nominal',
          tone: 'positive' as const,
        },
      ];
    }

    if (roleId === 'delivery_driver') {
      return [
        {
          label: 'Active / Scheduled Route Runs',
          value: `${deliveries.length} Runs`,
          sublabel: 'Pangani, CBD/Westlands, Kikuyu Schools',
          delta: '1 In Transit',
          tone: 'positive' as const,
        },
        {
          label: 'Total Payload Dispatched',
          value: '7,640 kg',
          sublabel: 'Refrigerated 5T + Dry Bulk 10T Fleet',
          delta: '96% Capacity',
          tone: 'positive' as const,
        },
        {
          label: 'Pending Electronic PODs',
          value: `${deliveries.filter((d) => !d.podCaptured).length} Runs`,
          sublabel: 'Capture recipient signature on arrival',
          delta: 'Action Required',
          tone: 'warning' as const,
        },
        {
          label: 'On-Time Institutional SLA',
          value: '98.2%',
          sublabel: 'Before 06:30 EAT kitchen receiving cutoff',
          delta: '+1.4% vs Aug',
          tone: 'positive' as const,
        },
      ];
    }

    if (roleId === 'administrator') {
      return [
        {
          label: 'Internal Operator Accounts',
          value: `${users.length} Members`,
          sublabel: `${users.filter((u) => u.status === 'Active').length} Active · ${
            users.filter((u) => u.status !== 'Active').length
          } Restricted/Invited`,
          delta: 'Strict Internal Auth',
          tone: 'positive' as const,
        },
        {
          label: 'Governed RBAC Roles',
          value: '9 Roles',
          sublabel: '37 granular module.action permissions',
          delta: 'RLS Enforced',
          tone: 'positive' as const,
        },
        {
          label: 'Pending Governance Approvals',
          value: `${pendingApprovals.length} Requests`,
          sublabel: 'PO-2026-515 & Credit Release OVR-2026-042',
          delta: 'Monitored',
          tone: 'warning' as const,
        },
        {
          label: 'Open Operational Orders',
          value: `${openOrdersCount} Orders`,
          sublabel: `KES ${totalOrderValueKes.toLocaleString()} pipeline`,
          delta: 'All Hubs Nominal',
          tone: 'positive' as const,
        },
      ];
    }

    // Default: Executive / Operations Manager / Sales Representative
    return [
      {
        label: 'Active Order Pipeline (KES)',
        value: `KES ${totalOrderValueKes.toLocaleString()}`,
        sublabel: `${openOrdersCount} open institutional & tender orders`,
        delta: '+16.4% vs Wk 38',
        tone: 'positive' as const,
      },
      {
        label: 'Warehouse Inventory Value',
        value: `KES ${inventoryValueKes.toLocaleString()}`,
        sublabel: `${expiringBatches.length} FEFO batches expiring within 7 days`,
        delta: `${expiringBatches.length} FEFO Priority`,
        tone: 'warning' as const,
      },
      {
        label: 'Accounts Receivable (AR)',
        value: `KES ${totalReceivablesKes.toLocaleString()}`,
        sublabel: `KES ${overdueReceivablesKes.toLocaleString()} overdue (>45 days)`,
        delta: '90.6% Current',
        tone: 'positive' as const,
      },
      {
        label: 'Supplier Payables (AP)',
        value: `KES ${totalPayablesKes.toLocaleString()}`,
        sublabel: `${pendingApprovals.length} governance approvals awaiting sign-off`,
        delta: 'Net 14 / 30',
        tone: 'neutral' as const,
      },
    ];
  }, [
    currentUser?.roleId,
    inventoryValueKes,
    expiringBatches.length,
    orders,
    totalReceivablesKes,
    overdueReceivablesKes,
    totalPayablesKes,
    totalOrderValueKes,
    suppliers.length,
    deliveries,
    users,
    pendingApprovals.length,
    openOrdersCount,
  ]);

  const handleQuickApprove = async (id: string) => {
    const res = await resolveApproval(
      id,
      'Approved',
      'Approved from Executive Command Center'
    );
    setFeedback(res.message);
  };

  return (
    <div>
      <PageHeader
        kicker={`OPERATIONAL COMMAND CENTER · ${currentUser?.roleName.toUpperCase()}`}
        title="Agro-Deliveries Kenya Workspace"
        description="Real-time visibility into institutional supply orders, cold-chain FEFO stock batches, cooperative procurement, delivery runs, and KES receivables."
        actions={
          <>
            <button
              type="button"
              onClick={() => setCustomizeOpen(true)}
              className="h-10 px-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-primary)] inline-flex items-center gap-2 hover:border-[#4EB462] transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#1F6A37] dark:text-[#4EB462]" />
              <span>Customize Dashboard</span>
            </button>
            {can('orders.create') && (
              <Link
                href="/orders?action=new"
                className="h-10 px-4 rounded-xl bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-medium inline-flex items-center gap-2 transition-colors"
              >
                <span>New Institutional Order</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </>
        }
      />

      <FeedbackBanner
        message={feedback}
        onDismiss={() => setFeedback(null)}
      />

      {/* Render Customizable Role-Aware Widgets in User's Order */}
      <div className="space-y-6">
        {enabledWidgets.map((widgetId) => {
          const reg = WIDGET_REGISTRY.find((w) => w.id === widgetId);
          if (!reg || !can(reg.permission)) return null;

          if (widgetId === 'kpi_row') {
            return (
              <section
                key="kpi_row"
                aria-label="Key Performance Indicators"
                className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
              >
                {roleKpis.map((kpi, idx) => (
                  <KPI
                    key={idx}
                    label={kpi.label}
                    value={kpi.value}
                    sublabel={kpi.sublabel}
                    delta={kpi.delta}
                    tone={kpi.tone}
                  />
                ))}
              </section>
            );
          }

          if (widgetId === 'operational_intelligence' && aiBrief) {
            return (
              <Card
                key="operational_intelligence"
                className="bg-gradient-to-r from-[#08190C] via-[#12512C] to-[#1F6A37] text-[#F4F6F3] border-none"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="space-y-2 max-w-3xl">
                    <div className="inline-flex items-center gap-2 text-xs font-medium text-[#4EB462]">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{aiBrief.headline}</span>
                    </div>
                    <ul className="space-y-1.5 text-xs sm:text-sm text-[#E5EFE6]">
                      {aiBrief.priorities.map((item, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="font-mono-tabular text-[#4EB462] font-semibold">
                            0{i + 1}.
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="lg:w-80 shrink-0 p-4 rounded-2xl bg-[#08190C]/55 border border-white/12">
                    <div className="text-[11px] font-semibold text-[#4EB462] uppercase tracking-wider">
                      Immediate Shift Directive
                    </div>
                    <p className="text-xs text-[#E5EFE6] mt-1 leading-relaxed">
                      {aiBrief.riskAlert}
                    </p>
                  </div>
                </div>
              </Card>
            );
          }

          if (widgetId === 'revenue_fulfillment_chart') {
            return (
              <section
                key="revenue_fulfillment_chart"
                className="grid grid-cols-1 lg:grid-cols-12 gap-6"
              >
                <ChartCard
                  title="Institutional Revenue vs. Cooperative Procurement Spend (KES)"
                  subtitle="Weekly cash-flow velocity across schools, hospitals, and hospitality contracts"
                  className="lg:col-span-7"
                >
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={REVENUE_TREND_DATA}
                        margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient
                            id="agroRevGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#1F6A37"
                              stopOpacity={0.35}
                            />
                            <stop
                              offset="95%"
                              stopColor="#1F6A37"
                              stopOpacity={0.0}
                            />
                          </linearGradient>
                          <linearGradient
                            id="agroProcGrad"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="#4EB462"
                              stopOpacity={0.25}
                            />
                            <stop
                              offset="95%"
                              stopColor="#4EB462"
                              stopOpacity={0.0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(61, 105, 74, 0.15)"
                        />
                        <XAxis
                          dataKey="week"
                          tick={{ fontSize: 12, fill: '#3D694A' }}
                        />
                        <YAxis
                          tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                          tick={{ fontSize: 12, fill: '#3D694A' }}
                        />
                        <Tooltip
                          formatter={(val: number) => [
                            `KES ${val.toLocaleString()}`,
                            '',
                          ]}
                          contentStyle={{
                            borderRadius: '12px',
                            border: '1px solid rgba(78,180,98,0.3)',
                            backgroundColor: '#08190C',
                            color: '#F4F6F3',
                            fontSize: '12px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="revenueKes"
                          name="Institutional Revenue"
                          stroke="#1F6A37"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#agroRevGrad)"
                        />
                        <Area
                          type="monotone"
                          dataKey="procurementKes"
                          name="Supplier Procurement"
                          stroke="#4EB462"
                          strokeWidth={2}
                          fillOpacity={1}
                          fill="url(#agroProcGrad)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                <ChartCard
                  title="Institutional Demand by Sector (KES)"
                  subtitle="Current month volume distribution across customer segments"
                  className="lg:col-span-5"
                >
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={SEGMENT_MIX_DATA}
                        layout="vertical"
                        margin={{ top: 5, right: 16, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(61, 105, 74, 0.15)"
                        />
                        <XAxis
                          type="number"
                          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                          tick={{ fontSize: 11, fill: '#3D694A' }}
                        />
                        <YAxis
                          type="category"
                          dataKey="segment"
                          width={110}
                          tick={{ fontSize: 11, fill: '#3D694A' }}
                        />
                        <Tooltip
                          formatter={(val: number) => [
                            `KES ${val.toLocaleString()}`,
                            'Revenue',
                          ]}
                          contentStyle={{
                            borderRadius: '12px',
                            backgroundColor: '#08190C',
                            color: '#F4F6F3',
                            fontSize: '12px',
                          }}
                        />
                        <Bar
                          dataKey="revenueKes"
                          fill="#1F6A37"
                          radius={[0, 8, 8, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              </section>
            );
          }

          if (widgetId === 'fefo_expiry_radar') {
            return (
              <section
                key="fefo_expiry_radar"
                className="grid grid-cols-1 lg:grid-cols-12 gap-6"
              >
                <ChartCard
                  title="FEFO Perishable Stock & Expiry Radar"
                  subtitle="First-Expired, First-Out allocation priority across Nairobi Cold Hub A & Cross-Dock C"
                  className="lg:col-span-7"
                  action={
                    <Link
                      href="/inventory"
                      className="text-xs font-medium text-[#1F6A37] dark:text-[#4EB462] hover:underline inline-flex items-center gap-1"
                    >
                      <span>Manage Batches</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  }
                >
                  <div className="space-y-2.5">
                    {stockBatches.slice(0, 4).map((batch) => (
                      <div
                        key={batch.id}
                        className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono-tabular text-xs font-semibold text-[#1F6A37] dark:text-[#4EB462]">
                              {batch.batchNumber}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="text-xs font-medium text-[var(--text-primary)]">
                              {batch.productName}
                            </span>
                          </div>
                          <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                            {batch.warehouseName} ({batch.binCode}) · Available:{' '}
                            <strong className="tabular-nums text-[var(--text-primary)]">
                              {batch.availableQty.toLocaleString()} {batch.unit}
                            </strong>{' '}
                            · Expires {batch.expiryDate} ({batch.daysToExpiry}d left)
                          </div>
                        </div>
                        <StatusBadge status={batch.status} />
                      </div>
                    ))}
                  </div>
                </ChartCard>

                {/* Pending Governance Approvals Widget */}
                {can('approvals.view') && (
                  <ChartCard
                    title="Pending Governance Approvals"
                    subtitle="Purchase orders, credit releases, and price overrides"
                    className="lg:col-span-5"
                    action={
                      <Link
                        href="/approvals"
                        className="text-xs font-medium text-[#1F6A37] dark:text-[#4EB462] hover:underline"
                      >
                        Open Inbox ({pendingApprovals.length})
                      </Link>
                    }
                  >
                    {pendingApprovals.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[var(--text-secondary)]">
                        All governance approvals are cleared.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {pendingApprovals.map((apr) => (
                          <div
                            key={apr.id}
                            className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono-tabular text-xs font-semibold text-[var(--text-primary)]">
                                {apr.reference} · {apr.category}
                              </span>
                              <span className="font-mono-tabular text-xs font-semibold text-[#1F6A37] dark:text-[#4EB462]">
                                KES {apr.valueKes.toLocaleString()}
                              </span>
                            </div>
                            <div className="text-xs font-medium text-[var(--text-primary)]">
                              {apr.entityTitle}
                            </div>
                            <p className="text-[11px] text-[var(--text-secondary)]">
                              Requested by {apr.requesterName} ({apr.requesterRole}) —{' '}
                              {apr.reason}
                            </p>
                            {can('approvals.approve') && (
                              <div className="pt-1 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleQuickApprove(apr.id)}
                                  className="px-3 py-1.5 rounded-lg bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Approve Request</span>
                                </button>
                                <Link
                                  href="/approvals"
                                  className="px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                >
                                  Inspect
                                </Link>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ChartCard>
                )}
              </section>
            );
          }

          if (widgetId === 'recent_orders_table') {
            return (
              <ChartCard
                key="recent_orders_table"
                title="Active Institutional & Contract Order Pipeline"
                subtitle="Live fulfillment state from order confirmation through picking, packing, and route dispatch"
                action={
                  <Link
                    href="/orders"
                    className="text-xs font-medium text-[#1F6A37] dark:text-[#4EB462] hover:underline inline-flex items-center gap-1"
                  >
                    <span>View All Orders</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                }
              >
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)] text-[11px] font-semibold text-[var(--text-secondary)]">
                        <th className="py-2.5 px-3">Order Ref</th>
                        <th className="py-2.5 px-3">Institution / Customer</th>
                        <th className="py-2.5 px-3">Channel</th>
                        <th className="py-2.5 px-3">Dispatch Hub</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Next Operational Step</th>
                        <th className="py-2.5 px-3 text-right">Value (KES)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
                      {orders.map((ord) => (
                        <tr
                          key={ord.id}
                          className="hover:bg-[var(--bg-canvas)]/60 transition-colors"
                        >
                          <td className="py-3 px-3 font-mono-tabular font-semibold text-[var(--text-primary)]">
                            {ord.orderNumber}
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-medium text-[var(--text-primary)]">
                              {ord.customerName}
                            </div>
                            <div className="text-[11px] text-[var(--text-secondary)]">
                              {ord.customerSegment} · Delivery {ord.deliveryDate}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-[var(--text-secondary)]">
                            {ord.channel}
                          </td>
                          <td className="py-3 px-3 text-[var(--text-secondary)]">
                            {ord.warehouseName}
                          </td>
                          <td className="py-3 px-3">
                            <StatusBadge status={ord.status} />
                          </td>
                          <td className="py-3 px-3 text-[var(--text-secondary)]">
                            {ord.nextStepLabel}
                          </td>
                          <td className="py-3 px-3 text-right font-mono-tabular font-semibold text-[var(--text-primary)]">
                            {ord.totalKes.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Compact Record Cards */}
                <div className="md:hidden space-y-2.5">
                  {orders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono-tabular text-xs font-semibold">
                          {ord.orderNumber}
                        </span>
                        <StatusBadge status={ord.status} />
                      </div>
                      <div className="text-xs font-semibold text-[var(--text-primary)]">
                        {ord.customerName}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
                        <span>{ord.warehouseName}</span>
                        <span className="font-mono-tabular font-semibold text-[var(--text-primary)]">
                          KES {ord.totalKes.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </ChartCard>
            );
          }

          return null;
        })}
      </div>

      {/* Dashboard Widget Customization Modal */}
      <Modal
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        title="Customize Command Center Widgets"
        subtitle="Toggle visibility or reorder operational widgets permitted for your role."
      >
        <div className="space-y-2.5">
          {WIDGET_REGISTRY.filter((w) => can(w.permission)).map((widget) => {
            const enabled = enabledWidgets.includes(widget.id);
            return (
              <div
                key={widget.id}
                className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-between gap-3"
              >
                <label className="flex items-center gap-2.5 text-xs font-medium text-[var(--text-primary)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => toggleDashboardWidget(widget.id)}
                    className="rounded accent-[#1F6A37]"
                  />
                  <span>{widget.label}</span>
                </label>
                {enabled && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveDashboardWidget(widget.id, 'up')}
                      className="p-1 rounded hover:bg-[var(--bg-card)] text-[var(--text-secondary)] cursor-pointer"
                      title="Move widget up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDashboardWidget(widget.id, 'down')}
                      className="p-1 rounded hover:bg-[var(--bg-card)] text-[var(--text-secondary)] cursor-pointer"
                      title="Move widget down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
          <button
            type="button"
            onClick={resetDashboardWidgets}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to default layout</span>
          </button>
          <button
            type="button"
            onClick={() => setCustomizeOpen(false)}
            className="px-4 py-2 rounded-xl bg-[#1F6A37] text-white text-xs font-medium cursor-pointer"
          >
            Done
          </button>
        </div>
      </Modal>
    </div>
  );
}
