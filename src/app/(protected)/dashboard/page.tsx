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
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import {
  ActionableMetricCard,
  Card,
  ChartCard,
  FeedbackBanner,
  Modal,
  OperationalPulse,
  OperationalPulseItem,
  PageHeader,
  StatusBadge,
  WorkQueue,
  WorkQueueItem,
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

const FEFO_RISK_DATA = [
  { category: 'Leafy Greens', atRiskKg: 420, batches: 2 },
  { category: 'Salad Produce', atRiskKg: 380, batches: 1 },
  { category: 'Root Crops', atRiskKg: 150, batches: 1 },
  { category: 'Culinary Herbs', atRiskKg: 65, batches: 1 },
];

const WIDGET_REGISTRY: {
  id: string;
  label: string;
  permission: PermissionKey;
}[] = [
  { id: 'operational_pulse', label: 'Operational Pulse & Immediate Attention', permission: 'dashboard.view' },
  { id: 'role_kpis', label: 'Role-Specific Decision KPIs', permission: 'dashboard.view' },
  { id: 'ai_brief', label: 'Shift Operational AI Intelligence', permission: 'dashboard.view' },
  { id: 'primary_visualizations', label: 'Primary Trend & Cash/FEFO Visualizations', permission: 'dashboard.view' },
  { id: 'work_queues', label: 'Operational Work Queues (Approvals & Fulfillment)', permission: 'dashboard.view' },
  { id: 'recent_orders_table', label: 'Active Order Pipeline Workbench', permission: 'orders.view' },
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
    enabledWidgets,
    toggleDashboardWidget,
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

  // Derived operational data
  const totalOrderValueKes = useMemo(
    () => orders.reduce((acc, o) => acc + o.totalKes, 0),
    [orders]
  );
  const openOrdersCount = useMemo(
    () => orders.filter((o) => o.status !== 'Delivered' && o.status !== 'Closed').length,
    [orders]
  );
  const inventoryValueKes = useMemo(
    () => products.reduce((acc, p) => acc + p.availableQty * p.pricing.supplierCostKes, 0),
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

  // Fetch operational intelligence brief
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
        // Fallback gracefully handled
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

  // Operational Pulse items (Section 5)
  const operationalPulseItems: OperationalPulseItem[] = useMemo(() => {
    const items: OperationalPulseItem[] = [];

    // 1. Perishable batch expiring soon
    if (expiringBatches.length > 0) {
      items.push({
        id: 'pulse-fefo',
        severity: 'critical',
        title: `${expiringBatches.length} Perishable Batches Expiring <= 72h`,
        detail: 'Roma Tomatoes (420 kg) & Sukuma Wiki (180 kg) at Nairobi Cold Hub A require urgent FIFO dispatch or discounted bulk promotion.',
        value: `${expiringBatches.length} Batches`,
        timestamp: 'As of 07:45 EAT',
        actionLabel: 'Review Inventory',
        actionHref: '/inventory?filter=expiring',
      });
    }

    // 2. High-value PO awaiting approval
    const highValuePo = pendingApprovals.find((a) => a.category === 'Purchase Order');
    if (highValuePo) {
      items.push({
        id: 'pulse-po',
        severity: 'critical',
        title: `PO Awaiting Authorization: ${highValuePo.reference}`,
        detail: `${highValuePo.entityTitle} for KES ${highValuePo.valueKes.toLocaleString()}. Supplier delivery waiting for formal sign-off.`,
        value: `KES ${(highValuePo.valueKes / 1000).toFixed(0)}K`,
        timestamp: 'As of 07:30 EAT',
        actionLabel: 'Review & Approve',
        actionHref: '/approvals?status=pending',
      });
    }

    // 3. Overdue customer invoice
    if (overdueReceivablesKes > 0) {
      items.push({
        id: 'pulse-ar',
        severity: 'warning',
        title: 'Overdue Institutional Receivables (>45 Days)',
        detail: 'Alliance High School invoice balance of KES 295,000 is past contracted Net 30 terms. Termly delivery hold may apply.',
        value: `KES ${(overdueReceivablesKes / 1000).toFixed(0)}K`,
        timestamp: 'As of 07:15 EAT',
        actionLabel: 'Open Collections',
        actionHref: '/finance?status=overdue',
      });
    }

    // 4. Delivery delay / fleet exception
    items.push({
      id: 'pulse-delivery',
      severity: 'warning',
      title: 'Delivery Run DR-2026-081 Traffic Delay',
      detail: 'Refrigerated Van KDC-304L delayed by +35 min on Waiyaki Way. Hospital commissary receiving window closes at 11:00 EAT.',
      value: '+35 min Delay',
      timestamp: 'As of 07:40 EAT',
      actionLabel: 'Resolve Fleet',
      actionHref: '/deliveries?filter=exceptions',
    });

    // 5. Critical low-stock item
    items.push({
      id: 'pulse-reorder',
      severity: 'warning',
      title: 'Safety Buffer Deficit on Contracted Staples',
      detail: 'Fresh Spinach and Red Onions are at 65% of minimum contracted buffer stock across Nairobi hubs.',
      value: '2 SKUs Low',
      timestamp: 'As of 07:20 EAT',
      actionLabel: 'Create Reorder',
      actionHref: '/procurement?filter=reorder',
    });

    return items.slice(0, 3); // Keep top 3 most critical items
  }, [expiringBatches, pendingApprovals, overdueReceivablesKes]);

  // Role-Specific Actionable Decision KPIs (Sections 7, 10, 11, 13)
  const roleDecisionKpis = useMemo(() => {
    const roleId = currentUser?.roleId || 'executive';

    if (roleId === 'storekeeper') {
      return [
        {
          metric: 'Expiring Batches (<= 72h)',
          value: `${expiringBatches.length} Batches`,
          context: '600 kg produce at Cold Hub A',
          delta: 'FEFO Picking Priority',
          status: 'critical' as const,
          description: 'Allocate to today’s school orders first',
          actionLabel: 'Pick First',
          actionHref: '/inventory?filter=expiring',
        },
        {
          metric: 'Orders in Picking Queue',
          value: `${orders.filter((o) => o.status === 'Picking' || o.status === 'Confirmed').length} Orders`,
          context: 'Alliance High & Nairobi West',
          delta: '09:00 EAT Cutoff',
          status: 'warning' as const,
          description: 'Staged at cold packing line 2',
          actionLabel: 'Fulfill Orders',
          actionHref: '/orders?filter=needs-action',
        },
        {
          metric: 'Cold Hub A Bin Utilization',
          value: '88.4%',
          context: '185 of 210 bins allocated',
          delta: '+4.2% vs Wk 38',
          status: 'warning' as const,
          description: 'Transfer non-chilled stock to Dry Hub B',
          actionLabel: 'Transfer Stock',
          actionHref: '/inventory?tab=warehouses',
        },
        {
          metric: 'Shift Spoilage Wastage',
          value: '18 kg',
          context: '0.32% of cold throughput (cap 1.0%)',
          delta: 'Well Below Cap',
          status: 'healthy' as const,
          description: 'Quarantine and compost logged',
          actionLabel: 'Log Wastage',
          actionHref: '/inventory?tab=movements',
        },
      ];
    }

    if (roleId === 'finance_manager' || roleId === 'accounts_clerk') {
      return [
        {
          metric: 'Institutional Receivables',
          value: `KES ${(totalReceivablesKes / 1000000).toFixed(2)}M`,
          context: `KES ${(overdueReceivablesKes / 1000).toFixed(0)}K overdue (>45d)`,
          delta: '1 Overdue Account',
          status: 'warning' as const,
          description: 'Alliance High School termly invoice pending',
          actionLabel: 'Open Collections',
          actionHref: '/finance?status=overdue',
        },
        {
          metric: 'Cooperative & Miller Payables',
          value: `KES ${(totalPayablesKes / 1000000).toFixed(2)}M`,
          context: 'KES 607K due this Friday',
          delta: 'Net 14 / Net 30 Terms',
          status: 'neutral' as const,
          description: 'Kinangop Growers & Mwea Millers scheduled',
          actionLabel: 'Review Payables',
          actionHref: '/finance?tab=payables',
        },
        {
          metric: 'Unreconciled M-Pesa / EFT',
          value: '1 Receipt',
          context: 'MPESA-B2B-994012A (KES 185,000)',
          delta: 'Awaiting Match',
          status: 'warning' as const,
          description: 'Verify school deposit against invoice #INV-2026-891',
          actionLabel: 'Reconcile Receipt',
          actionHref: '/finance?tab=payments',
        },
        {
          metric: 'Net Working Capital Spread',
          value: `+KES ${((totalReceivablesKes - totalPayablesKes) / 1000).toFixed(0)}K`,
          context: 'Receivables exceed Payables by 39.8%',
          delta: '+12.4% MoM',
          status: 'healthy' as const,
          description: 'Positive operational liquidity balance',
          actionLabel: 'Treasury Ledger',
          actionHref: '/finance',
        },
      ];
    }

    if (roleId === 'procurement_officer') {
      return [
        {
          metric: 'Critical Reorder Deficits',
          value: '3 SKUs Low',
          context: 'Spinach, Onions & Potatoes below buffer',
          delta: 'Action Required',
          status: 'critical' as const,
          description: 'Replenishment needed before 14:00 EAT',
          actionLabel: 'Create PO',
          actionHref: '/procurement?filter=reorder',
        },
        {
          metric: 'POs Awaiting Authorization',
          value: 'KES 910,000',
          context: '1 PO awaiting executive sign-off',
          delta: 'PO-2026-515',
          status: 'warning' as const,
          description: '100 bags Mwea Pishori Rice from Kirinyaga',
          actionLabel: 'Track Approval',
          actionHref: '/approvals?status=pending',
        },
        {
          metric: 'Incoming GRN Shipments Today',
          value: '3,800 Units',
          context: 'Tomatoes & Avocados arriving 11:30 EAT',
          delta: 'Naivasha & Kinangop',
          status: 'healthy' as const,
          description: 'Cold dock receiving bay 1 reserved',
          actionLabel: 'Inspect Shipments',
          actionHref: '/procurement',
        },
        {
          metric: 'Farmgate Price Variance',
          value: '1 Alert',
          context: 'Limuru Sukuma Wiki +6.2% variance',
          delta: 'Above Benchmark',
          status: 'warning' as const,
          description: 'Compare with Naivasha cooperative pricing',
          actionLabel: 'Compare Sourcing',
          actionHref: '/suppliers',
        },
      ];
    }

    if (roleId === 'sales_rep' || roleId === 'sales_representative') {
      return [
        {
          metric: 'Active Institutional Orders',
          value: `${orders.length} Orders`,
          context: `Pipeline value KES ${(totalOrderValueKes / 1000000).toFixed(2)}M`,
          delta: '+14.2% MoM',
          status: 'healthy' as const,
          description: 'Schools, hospitals & corporate accounts',
          actionLabel: 'View Orders',
          actionHref: '/orders',
        },
        {
          metric: 'Tender Contracts Expiring <= 14d',
          value: '2 Tenders',
          context: 'St. Mary’s School & Strathmore University',
          delta: 'Renewal Due',
          status: 'warning' as const,
          description: 'Prepare termly vegetable supply proposals',
          actionLabel: 'Review Tenders',
          actionHref: '/crm?filter=contracts',
        },
        {
          metric: 'Overdue Customer Accounts',
          value: '1 Account',
          context: 'Alliance High School (KES 295,000 overdue)',
          delta: 'Delivery Hold Notice',
          status: 'warning' as const,
          description: 'Contact Bursar regarding installment payment',
          actionLabel: 'Follow Up Account',
          actionHref: '/crm?filter=overdue',
        },
        {
          metric: 'New Customer Opportunities',
          value: '3 Inquiries',
          context: 'Kenyatta National Hosp special dietary order',
          delta: 'High Priority',
          status: 'healthy' as const,
          description: 'Organic spinach & pumpkin puree supply',
          actionLabel: 'Open CRM Leads',
          actionHref: '/crm',
        },
      ];
    }

    if (roleId === 'delivery_driver') {
      return [
        {
          metric: 'Today’s Assigned Route Runs',
          value: `${deliveries.length} Runs`,
          context: 'Refrigerated Van KDC-304L (Westlands / Parklands)',
          delta: '8 Delivery Stops',
          status: 'healthy' as const,
          description: 'First departure scheduled 08:30 EAT',
          actionLabel: 'View Route Map',
          actionHref: '/deliveries',
        },
        {
          metric: 'Pending Loading & Dispatch',
          value: '1 Run',
          context: 'Alliance High & St. Austin’s Academy order',
          delta: 'Bay 2 Ready',
          status: 'warning' as const,
          description: 'Verify crate counts before sealing vehicle',
          actionLabel: 'Confirm Dispatch',
          actionHref: '/deliveries',
        },
        {
          metric: 'Route Transit Status',
          value: 'In Transit',
          context: 'Stop 2 of 4 (Nairobi West Hospital)',
          delta: '+15 min Delay',
          status: 'warning' as const,
          description: 'Slight congestion along Lang’ata Road',
          actionLabel: 'Update ETA',
          actionHref: '/deliveries?filter=exceptions',
        },
        {
          metric: 'Electronic POD Sign-offs',
          value: '2 Pending',
          context: 'Receiving officer digital signature required',
          delta: '2 / 4 Completed',
          status: 'healthy' as const,
          description: 'Upload signed delivery note on arrival',
          actionLabel: 'Record POD',
          actionHref: '/deliveries',
        },
      ];
    }

    if (roleId === 'administrator') {
      return [
        {
          metric: 'Governed Operator Accounts',
          value: '9 Operators',
          context: '8 Active · 1 Pending Invitation',
          delta: 'Zero Lockouts',
          status: 'healthy' as const,
          description: 'All users authenticated via enterprise RBAC',
          actionLabel: 'Manage Users',
          actionHref: '/administration/users',
        },
        {
          metric: 'Enterprise Role Coverage',
          value: '9 Roles',
          context: '48 system permissions mapped',
          delta: '100% Compliant',
          status: 'healthy' as const,
          description: 'Strict separation of operational duties',
          actionLabel: 'Audit Roles',
          actionHref: '/administration/roles',
        },
        {
          metric: 'Security & Audit Events',
          value: '128 Entries',
          context: '3 price overrides & 1 role change today',
          delta: 'Append-Only Ledger',
          status: 'neutral' as const,
          description: 'PostgreSQL governance audit trail',
          actionLabel: 'Review Audit Trail',
          actionHref: '/administration/audit-logs',
        },
        {
          metric: 'Data Integrity & SLA Posture',
          value: '100% Operational',
          context: 'All cross-dock sync services healthy',
          delta: '0 System Alerts',
          status: 'healthy' as const,
          description: 'Automated backup & RLS policy active',
          actionLabel: 'System Settings',
          actionHref: '/settings',
        },
      ];
    }

    if (roleId === 'operations_manager') {
      return [
        {
          metric: 'Orders Requiring Action',
          value: `${orders.filter((o) => o.status === 'Confirmed' || o.status === 'Picking' || o.status === 'On Hold').length} Orders`,
          context: 'Picking, staging & on-hold exceptions',
          delta: 'Fulfillment Backlog',
          status: 'warning' as const,
          description: 'Active pipeline orders requiring immediate warehouse action',
          actionLabel: 'Fulfill Backlog',
          actionHref: '/orders?filter=needs-action',
        },
        {
          metric: "Today's Delivery Runs",
          value: `${deliveries.length} Runs`,
          context: '1 Dispatched · 1 Planned · 1 Exception',
          delta: 'Waiyaki Way Delay (+35m)',
          status: 'warning' as const,
          description: 'Refrigerated route coverage & hospital arrival windows',
          actionLabel: 'Dispatch Desk',
          actionHref: '/deliveries?filter=exceptions',
        },
        {
          metric: 'Perishable Stock at Risk',
          value: `${expiringBatches.length} Batches`,
          context: '600 kg produce expiring in <= 72h',
          delta: 'FEFO Protocol',
          status: 'critical' as const,
          description: 'Cold Hub A Roma Tomatoes & Sukuma Wiki priority dispatch',
          actionLabel: 'Review Inventory',
          actionHref: '/inventory?filter=expiring',
        },
        {
          metric: 'Governance Approvals Pending',
          value: `${pendingApprovals.length} Actions`,
          context: '1 Purchase Order · 1 Price Override',
          delta: '≥ KES 250K Threshold',
          status: 'warning' as const,
          description: 'PO-2026-515 & school contract override await review',
          actionLabel: 'Resolve Approvals',
          actionHref: '/approvals?status=pending',
        },
      ];
    }

    // Default: Executive overview (Revenue, Gross Margin, Cash/Receivables, Stock Risk)
    return [
      {
        metric: 'Institutional Order Revenue',
        value: `KES ${(totalOrderValueKes / 1000000).toFixed(2)}M`,
        context: `${openOrdersCount} active orders across schools & hospitals`,
        delta: '+14.2% MoM',
        status: 'healthy' as const,
        description: 'Gross demand pacing 8.5% above weekly quota',
        actionLabel: 'Review Orders',
        actionHref: '/orders',
      },
      {
        metric: 'Gross Margin Spread',
        value: '28.4%',
        context: 'Contract revenue vs farmgate procurement cost',
        delta: '+1.8% vs Target',
        status: 'healthy' as const,
        description: 'Direct cooperative sourcing savings realized',
        actionLabel: 'Analyze Margins',
        actionHref: '/finance',
      },
      {
        metric: 'Receivables at Risk',
        value: `KES ${(totalReceivablesKes / 1000000).toFixed(2)}M`,
        context: `KES ${(overdueReceivablesKes / 1000).toFixed(0)}K overdue (>45d)`,
        delta: '1 Account Escalated',
        status: 'warning' as const,
        description: 'Alliance High School bursar follow-up needed',
        actionLabel: 'Open Collections',
        actionHref: '/finance?status=overdue',
      },
      {
        metric: 'Perishable Inventory Value',
        value: `KES ${(inventoryValueKes / 1000000).toFixed(2)}M`,
        context: `${expiringBatches.length} batches expire in <= 72h (600 kg)`,
        delta: 'FEFO Priority Active',
        status: 'critical' as const,
        description: 'Tomatoes & greens require immediate dispatch',
        actionLabel: 'Review Stock Risk',
        actionHref: '/inventory?filter=expiring',
      },
    ];
  }, [
    currentUser,
    orders,
    products,
    stockBatches,
    totalOrderValueKes,
    openOrdersCount,
    inventoryValueKes,
    totalReceivablesKes,
    overdueReceivablesKes,
    totalPayablesKes,
    expiringBatches,
    deliveries,
    pendingApprovals,
  ]);

  // Work Queue items for Governance Approvals (Section 12)
  const approvalWorkQueueItems: WorkQueueItem[] = useMemo(() => {
    return pendingApprovals.map((apr) => ({
      id: apr.id,
      title: `${apr.reference} · ${apr.category}`,
      subtitle: `${apr.entityTitle} (${apr.reason})`,
      tag: `KES ${apr.valueKes.toLocaleString()}`,
      severity: apr.valueKes > 500000 ? ('critical' as const) : ('warning' as const),
      actionLabel: can('approvals.approve') ? 'Approve' : 'Review',
      actionHref: '/approvals?status=pending',
      metadata: `Req: ${apr.requesterName}`,
    }));
  }, [pendingApprovals, can]);

  // Work Queue items for Immediate Operational Actions
  const operationalWorkQueueItems: WorkQueueItem[] = useMemo(() => {
    const items: WorkQueueItem[] = [];

    // Expiring produce batches
    expiringBatches.forEach((b) => {
      items.push({
        id: `act-batch-${b.id}`,
        title: `FEFO Expiring: ${b.productName} (${b.batchNumber})`,
        subtitle: `${b.warehouseName} · ${b.availableQty} ${b.unit} available`,
        tag: `${b.daysToExpiry}d left`,
        severity: 'critical' as const,
        actionLabel: 'Fulfill First',
        actionHref: '/inventory?filter=expiring',
        metadata: `Bin: ${b.binCode}`,
      });
    });

    // Orders in Picking
    orders
      .filter((o) => o.status === 'Picking' || o.status === 'Confirmed')
      .slice(0, 2)
      .forEach((o) => {
        items.push({
          id: `act-ord-${o.id}`,
          title: `Fulfill Order: ${o.orderNumber} (${o.customerName})`,
          subtitle: `${o.customerSegment} · Delivery ${o.deliveryDate}`,
          tag: o.status,
          severity: 'warning' as const,
          actionLabel: 'Advance Order',
          actionHref: '/orders?filter=needs-action',
          metadata: `KES ${o.totalKes.toLocaleString()}`,
        });
      });

    return items;
  }, [expiringBatches, orders]);

  return (
    <div className="space-y-6">
      {/* 1. PAGE HEADER (Section 31 & Master Order) */}
      <PageHeader
        kicker="AGRO-DELIVERIES KENYA · BOS COMMAND CENTER"
        title="Operational Decision System"
        description="Monitor business health, resolve operational bottlenecks, evaluate critical risks, and drive supply execution across Kenya's food network."
        actions={
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] font-mono-tabular">
              <Clock className="w-3.5 h-3.5 text-[#1F6A37] dark:text-[#4EB462]" />
              <span>As of 07:45 EAT · Updated 4m ago</span>
            </span>

            {can('orders.create') && (
              <Link
                href="/orders"
                className="h-10 px-4 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>New Order</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => setCustomizeOpen(true)}
              className="h-10 px-3.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] hover:bg-[var(--bg-canvas)] text-xs font-medium inline-flex items-center gap-1.5 text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#1F6A37] dark:text-[#4EB462]" />
              <span className="hidden sm:inline">Customize View</span>
            </button>
          </div>
        }
      />

      <FeedbackBanner
        message={feedback}
        type="success"
        onDismiss={() => setFeedback(null)}
      />

      {/* 2. OPERATIONAL PULSE / NEEDS ATTENTION (Section 4 & 5) */}
      {enabledWidgets.includes('operational_pulse') && (
        <OperationalPulse
          items={operationalPulseItems}
          title="Operational Pulse · Immediate Business Decisions Required"
          freshness="Live Hub Telemetry · As of 07:45 EAT"
        />
      )}

      {/* 3. ROLE-SPECIFIC ACTIONABLE DECISION KPIS (Section 6, 7, 10, 11, 13) */}
      {enabledWidgets.includes('role_kpis') && (
        <section aria-label="Role Decision Metrics">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="font-heading text-sm font-semibold tracking-wide text-[var(--text-primary)] uppercase">
                {currentUser?.roleName || 'Operator'} Decision Metrics
              </h2>
              <span className="text-[11px] text-[var(--text-secondary)]">
                · Direct Actions Linked
              </span>
            </div>
            <span className="text-xs font-mono-tabular text-[var(--text-secondary)]">
              Target: 4 High-Leverage Units
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {roleDecisionKpis.map((kpi, idx) => (
              <ActionableMetricCard
                key={`${kpi.metric}-${idx}`}
                metric={kpi.metric}
                value={kpi.value}
                context={kpi.context}
                delta={kpi.delta}
                status={kpi.status}
                description={kpi.description}
                actionLabel={kpi.actionLabel}
                actionHref={kpi.actionHref}
              />
            ))}
          </div>
        </section>
      )}

      {/* 4. AI OPERATIONAL SHIFT BRIEF (Section 38: "What should I know right now?") */}
      {enabledWidgets.includes('ai_brief') && aiBrief && (
        <Card
          padding="p-5"
          variant="raised"
          className="bg-gradient-to-r from-[#0C2212] via-[#0E2916] to-[#0A1C0E] border-[#4EB462]/35 text-[#F4F6F3]"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-full bg-[#1F6A37] text-white">
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
                <span className="text-xs font-semibold tracking-wider text-[#A9BEAE] uppercase">
                  Shift Intelligence Brief · What Should I Know Right Now?
                </span>
              </div>
              <h3 className="font-heading text-base sm:text-lg font-semibold text-white">
                {aiBrief.headline}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs text-[#E5EFE6]">
                {aiBrief.priorities.slice(0, 3).map((p, idx) => (
                  <div key={idx} className="flex items-start gap-2 bg-white/5 p-2 rounded-lg">
                    <span className="text-[#4EB462] font-bold">0{idx + 1}.</span>
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:w-80 shrink-0 p-3.5 rounded-xl bg-black/40 border border-amber-500/30 flex flex-col justify-between">
              <div>
                <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-amber-400" />
                  <span>Immediate Risk Alert</span>
                </div>
                <p className="text-xs text-[#E5EFE6] mt-1 leading-relaxed">
                  {aiBrief.riskAlert}
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-white/10 flex justify-end">
                <Link
                  href="/inventory?filter=expiring"
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-[#1F6A37] hover:bg-[#12512C] text-white transition-colors"
                >
                  <span>Resolve Risk</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* 5. PRIMARY TREND & OPERATIONAL VISUALIZATIONS (Sections 16, 17, 18) */}
      {enabledWidgets.includes('primary_visualizations') && (
        <section aria-label="Visual Analytics" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Revenue vs Sourcing Cash Trend */}
          <ChartCard
            title="Institutional Revenue vs. Procurement Sourcing (KES)"
            subtitle="Answering: Is revenue expansion sustaining healthy gross margin over cooperative sourcing spend?"
            className="lg:col-span-7"
            action={
              <Link
                href="/finance"
                className="text-xs font-medium text-[#1F6A37] dark:text-[#4EB462] hover:underline inline-flex items-center gap-1"
              >
                <span>Financial Ledger</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            }
          >
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={REVENUE_TREND_DATA}
                  margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1F6A37" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#1F6A37" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="procGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4EB462" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#4EB462" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(61, 105, 74, 0.15)" />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#3D694A' }} />
                  <YAxis
                    tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`}
                    tick={{ fontSize: 11, fill: '#3D694A' }}
                  />
                  <Tooltip
                    formatter={(val: number) => [`KES ${val.toLocaleString()}`, '']}
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
                    fill="url(#revGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="procurementKes"
                    name="Cooperative Sourcing"
                    stroke="#4EB462"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#procGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Institutional Segment Demand */}
          <ChartCard
            title="Institutional Demand by Sector (KES)"
            subtitle="Answering: Where is commercial volume concentrated this month?"
            className="lg:col-span-5"
            action={
              <Link
                href="/institutions"
                className="text-xs font-medium text-[#1F6A37] dark:text-[#4EB462] hover:underline inline-flex items-center gap-1"
              >
                <span>Institutions</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            }
          >
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={SEGMENT_MIX_DATA}
                  layout="vertical"
                  margin={{ top: 5, right: 16, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(61, 105, 74, 0.15)" />
                  <XAxis
                    type="number"
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    tick={{ fontSize: 10, fill: '#3D694A' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="segment"
                    width={110}
                    tick={{ fontSize: 10, fill: '#3D694A' }}
                  />
                  <Tooltip
                    formatter={(val: number) => [`KES ${val.toLocaleString()}`, 'Revenue']}
                    contentStyle={{
                      borderRadius: '12px',
                      backgroundColor: '#08190C',
                      color: '#F4F6F3',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="revenueKes" fill="#1F6A37" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </section>
      )}

      {/* 6. OPERATIONAL WORK QUEUES (Section 12: Reusable Work Queue Pattern) */}
      {enabledWidgets.includes('work_queues') && (
        <section aria-label="Operational Work Queues" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WorkQueue
            title="Pending Governance Approvals"
            subtitle="Decisions requiring manager or executive sign-off"
            badgeCount={approvalWorkQueueItems.length}
            items={approvalWorkQueueItems}
            emptyMessage="All approval requests have been cleared."
            viewAllHref="/approvals"
            viewAllLabel="Open Approvals Center"
          />

          <WorkQueue
            title="Immediate Operational Fulfillment Queue"
            subtitle="Perishable FEFO countdowns and active warehouse picking"
            badgeCount={operationalWorkQueueItems.length}
            items={operationalWorkQueueItems}
            emptyMessage="All active orders and warehouse batches are current."
            viewAllHref="/orders"
            viewAllLabel="Open Orders Workbench"
          />
        </section>
      )}

      {/* 7. ACTIVE INSTITUTIONAL ORDER PIPELINE WORKBENCH (Section 22 & 34) */}
      {enabledWidgets.includes('recent_orders_table') && (
        <ChartCard
          title="Active Institutional Order Workbench"
          subtitle="Real-time order state from confirmation through picking, packing, route dispatch, and invoicing"
          action={
            <Link
              href="/orders"
              className="text-xs font-semibold text-[#1F6A37] dark:text-[#4EB462] hover:underline inline-flex items-center gap-1"
            >
              <span>Full Order Workbench</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          {/* Desktop Workbench Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[11px] font-semibold text-[var(--text-secondary)]">
                  <th className="py-2.5 px-3">Order Ref</th>
                  <th className="py-2.5 px-3">Customer / Institution</th>
                  <th className="py-2.5 px-3">Dispatch Hub</th>
                  <th className="py-2.5 px-3">Delivery Date</th>
                  <th className="py-2.5 px-3">Lifecycle Status</th>
                  <th className="py-2.5 px-3 text-right">Value (KES)</th>
                  <th className="py-2.5 px-3 text-right">Decision Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-[var(--bg-canvas)]/60 transition-colors">
                    <td className="py-3 px-3 font-mono-tabular font-semibold text-[var(--text-primary)]">
                      {ord.orderNumber}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-[var(--text-primary)]">
                        {ord.customerName}
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        {ord.customerSegment} · {ord.channel}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-[var(--text-secondary)]">
                      {ord.warehouseName}
                    </td>
                    <td className="py-3 px-3 font-mono-tabular text-[var(--text-secondary)]">
                      {ord.deliveryDate}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={ord.status} />
                    </td>
                    <td className="py-3 px-3 text-right font-mono-tabular font-semibold text-[var(--text-primary)]">
                      KES {ord.totalKes.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        href={`/orders?orderNumber=${ord.orderNumber}`}
                        className="h-7 px-3 rounded-full bg-[#E5EFE6] dark:bg-[#142B1B] text-[#12512C] dark:text-[#4EB462] hover:bg-[#1F6A37] hover:text-white dark:hover:bg-[#1F6A37] text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>Inspect</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
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
                <div className="pt-2 border-t border-[var(--border-subtle)] flex justify-end">
                  <Link
                    href={`/orders?orderNumber=${ord.orderNumber}`}
                    className="h-7 px-3 rounded-full bg-[#1F6A37] text-white text-xs font-semibold inline-flex items-center gap-1"
                  >
                    <span>Fulfill</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      )}

      {/* DASHBOARD WIDGET CUSTOMIZATION MODAL (Section 37) */}
      <Modal
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        title="Customize Command Center Decision View"
        subtitle="Configure operational widget order and role-specific visibility."
      >
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-secondary)]">
            AgroHub enforces role-optimized decision layouts. You may tailor which sections are displayed or restore default governance order.
          </p>

          <div className="space-y-2 pt-2">
            {WIDGET_REGISTRY.map((w, index) => {
              const active = enabledWidgets.includes(w.id);
              return (
                <div
                  key={w.id}
                  className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono-tabular text-[11px] text-[var(--text-secondary)]">
                      {index + 1}.
                    </span>
                    <span className="font-medium text-[var(--text-primary)]">
                      {w.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleDashboardWidget(w.id)}
                      className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                        active
                          ? 'bg-[#1F6A37] text-white'
                          : 'bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-secondary)]'
                      }`}
                    >
                      {active ? 'Visible' : 'Hidden'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                resetDashboardWidgets();
                setFeedback('Default role-optimized decision layout restored.');
                setCustomizeOpen(false);
              }}
              className="px-3.5 py-1.5 rounded-full border border-[var(--border-subtle)] hover:bg-[var(--bg-canvas)] text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Role Defaults</span>
            </button>

            <button
              type="button"
              onClick={() => setCustomizeOpen(false)}
              className="px-4 py-1.5 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
