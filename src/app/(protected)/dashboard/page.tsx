'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle, ArrowRight, Boxes, CheckCircle2, ClipboardCheck, CreditCard,
  Package, Plus, ShieldCheck, Sparkles, Truck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Card, PageHeader } from '@/components/ui/primitives';
import { useBos } from '@/lib/services/bos-context';
import { canAccessDeliveryRun, hasDeliveryRunException, isOpenPODDiscrepancy, isPendingPOD } from '@/lib/services/delivery-workflow';
import { getOrderSourcingLines } from '@/lib/services/procurement-rules';
import { getNairobiDate, getOpenPayables, offsetBusinessDate } from '@/lib/services/workspace-metrics';

type Queue = {
  id: string;
  title: string;
  action: string;
  href: string;
  icon: LucideIcon;
  visible: boolean;
  rows: { id: string; title: string; detail: string; href?: string }[];
};

const rolePriorities: Record<string, string[]> = {
  delivery_driver: ['dispatch', 'on-route', 'exceptions'],
  procurement_officer: ['sourcing', 'collections', 'stock', 'approvals'],
  storekeeper: ['stock', 'collections', 'packing'],
  sales_rep: ['orders', 'exceptions'],
  accounts_clerk: ['receivables', 'payables', 'approvals'],
  finance_manager: ['approvals', 'payables', 'receivables'],
};

const formatKes = (amount: number) => 'KES ' + amount.toLocaleString('en-KE');
const byDate = <T,>(records: T[], date: (record: T) => string) =>
  [...records].sort((a, b) => date(a).localeCompare(date(b)));

export default function DashboardPage() {
  const {
    currentUser, can, orders, procurementOrders, deliveries, drivers, podRecords,
    approvals, supplierPayables, invoices, stockBatches,
  } = useBos();
  const [brief, setBrief] = useState<{ headline: string; priorities: string[]; riskAlert: string }>();
  const [briefStatus, setBriefStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const today = getNairobiDate();
  const comingWeek = offsetBusinessDate(today, 7);
  const stockCutoff = offsetBusinessDate(today, 3);
  const isDriver = currentUser?.roleId === 'delivery_driver';
  const activeOrders = byDate(orders.filter((order) =>
    !['Draft', 'Delivered', 'Closed', 'Cancelled'].includes(order.status)
  ), (order) => order.deliveryDate);
  const sourcingOrders = can('procurement.view') ? activeOrders.filter((order) =>
    ['Confirmed', 'Picking', 'Partially Fulfilled'].includes(order.status) &&
    getOrderSourcingLines(order, procurementOrders).some((line) => line.outstanding > 0)
  ) : [];
  const runs = deliveries.filter((run) => canAccessDeliveryRun(run, currentUser, drivers));
  const ordersByIdentifier = new Map(orders.flatMap((order) => [[order.orderNumber, order], [order.id, order]] as const));
  const dispatchRuns = runs.filter((run) => run.status === 'Planned' || run.status === 'Loaded');
  const pendingPods = podRecords.filter((pod) => isPendingPOD(pod) || isOpenPODDiscrepancy(pod));
  const pendingApprovals = approvals.filter((approval) => approval.status === 'Pending');
  const duePayables = getOpenPayables(supplierPayables, comingWeek);
  const overdueInvoices = byDate(invoices.filter((invoice) =>
    invoice.balanceKes > 0 && invoice.dueDate && invoice.dueDate < today
  ), (invoice) => invoice.dueDate);
  const expiringBatches = byDate(stockBatches.filter((batch) =>
    batch.availableQty > 0 && batch.status !== 'Quarantined' &&
    batch.expiryDate && batch.expiryDate <= stockCutoff
  ), (batch) => batch.expiryDate);
  const openCollections = byDate(procurementOrders.filter((po) =>
    ['PO Issued', 'Receiving (GRN)', 'Quality Check', 'Partially Received'].includes(po.stage) && !po.goodsCollected
  ), (po) => po.expectedDate);
  const deliveryRows = (entries: typeof deliveries) => entries.map((run) => {
    const dates = (run.orderNumbers ?? run.ordersIncluded)
      .map((identifier) => ordersByIdentifier.get(identifier)?.deliveryDate)
      .filter(Boolean)
      .sort();
    return {
      id: run.id,
      title: run.runNumber + ' · ' + run.routeZone,
      detail: [run.scheduledDate ?? dates[0], run.departureTime, run.status].filter(Boolean).join(' · '),
    };
  });
  const orderRows = (entries: typeof orders) => entries.map((order) => ({
    id: order.id,
    title: order.orderNumber + ' · ' + order.customerName,
    detail: order.deliveryDate + ' · ' + order.status,
    href: '/orders?orderNumber=' + encodeURIComponent(order.orderNumber),
  }));

  const queues: Queue[] = [
    {
      id: 'sourcing', title: 'Orders awaiting sourcing', action: 'Open procurement', href: '/procurement',
      icon: Package, visible: can('procurement.view'),
      rows: sourcingOrders.map((order) => ({
        id: order.id,
        title: order.orderNumber + ' · ' + order.customerName,
        detail: 'Requested delivery ' + order.deliveryDate,
        href: '/procurement?order=' + encodeURIComponent(order.id),
      })),
    },
    {
      id: 'collections', title: 'Supplier collections and receipts', action: 'View purchase orders', href: '/procurement',
      icon: Boxes, visible: can('procurement.view'),
      rows: openCollections.map((po) => ({
        id: po.id, title: po.poNumber + ' · ' + po.supplierName,
        detail: 'Expected ' + po.expectedDate + ' · ' + (po.purpose ?? po.stage),
      })),
    },
    {
      id: 'dispatch', title: isDriver ? 'Your scheduled dispatches' : 'Scheduled dispatches',
      action: 'Open deliveries', href: '/deliveries?filter=dispatch', icon: Truck, visible: can('deliveries.view'),
      rows: deliveryRows(dispatchRuns),
    },
    {
      id: 'pod', title: 'Proofs of delivery to review', action: 'Review proofs of delivery', href: '/fulfillment#pod-queue',
      icon: ClipboardCheck, visible: can('fulfillment.view') && can('orders.approve'),
      rows: pendingPods.map((pod) => ({
        id: pod.id, title: pod.orderNumber + ' · ' + pod.customerName,
        detail: isPendingPOD(pod) ? 'Awaiting quantity verification' : 'Discrepancy needs resolution',
        href: '/fulfillment?receipt=' + encodeURIComponent(pod.id) + '#pod-queue',
      })),
    },
    {
      id: 'on-route', title: 'Your active delivery runs', action: 'View active routes', href: '/deliveries?status=Dispatched',
      icon: Truck, visible: isDriver && can('deliveries.view'),
      rows: deliveryRows(runs.filter((run) => run.status === 'Dispatched' || run.status === 'Partially Delivered')),
    },
    {
      id: 'approvals', title: 'Approval requests', action: 'Open approvals', href: '/approvals?status=pending',
      icon: ShieldCheck, visible: can('approvals.view'),
      rows: pendingApprovals.map((approval) => ({
        id: approval.id, title: approval.reference + ' · ' + approval.category,
        detail: approval.entityTitle + ' · ' + formatKes(approval.valueKes),
      })),
    },
    {
      id: 'payables', title: 'Supplier payments due', action: 'View supplier payables', href: '/finance?tab=payables',
      icon: CreditCard, visible: can('finance.view'),
      rows: duePayables.map((payable) => ({
        id: payable.id, title: payable.supplierName + ' · ' + payable.poNumber,
        detail: formatKes(payable.balanceKes) + (payable.dueDate < today ? ' · Overdue since ' : ' · Due ') + payable.dueDate,
      })),
    },
    {
      id: 'exceptions', title: 'Delivery exceptions', action: 'Review exceptions', href: '/deliveries?filter=exceptions',
      icon: AlertTriangle, visible: can('deliveries.view'),
      rows: deliveryRows(runs.filter((run) => hasDeliveryRunException(run, orders, podRecords))),
    },
    {
      id: 'stock', title: 'Stock nearing expiry or expired', action: 'Review inventory', href: '/inventory?filter=expiring',
      icon: AlertTriangle, visible: can('inventory.view'),
      rows: expiringBatches.map((batch) => ({
        id: batch.id, title: batch.productName + ' · ' + batch.batchNumber,
        detail: batch.availableQty + ' ' + batch.unit + ' · ' + (batch.expiryDate < today ? 'Expired ' : 'Expires ') + batch.expiryDate,
      })),
    },
    {
      id: 'receivables', title: 'Overdue customer invoices', action: 'Open receivables', href: '/finance?status=overdue',
      icon: CreditCard, visible: can('finance.view'),
      rows: overdueInvoices.map((invoice) => ({
        id: invoice.id, title: invoice.invoiceNumber + ' · ' + invoice.customerName,
        detail: formatKes(invoice.balanceKes) + ' · Due ' + invoice.dueDate,
      })),
    },
    {
      id: 'orders', title: 'Active customer orders', action: 'Open orders', href: '/orders',
      icon: Package, visible: can('orders.view') && !isDriver, rows: orderRows(activeOrders),
    },
    {
      id: 'packing', title: 'Picking and packing', action: 'Open fulfillment', href: '/fulfillment',
      icon: Boxes, visible: can('fulfillment.manage'),
      rows: orderRows(activeOrders.filter((order) => order.status === 'Picking' || order.status === 'Packed'))
        .map((row) => ({ ...row, href: can('orders.view') ? row.href : undefined })),
    },
  ];
  const priorities = rolePriorities[currentUser?.roleId ?? ''];
  const relevantQueues = (priorities
    ? priorities.map((id) => queues.find((queue) => queue.id === id))
    : queues
  ).filter((queue): queue is Queue => queue?.visible === true);
  const activeQueues = relevantQueues.filter((queue) => queue.rows.length > 0);

  const loadBrief = async () => {
    setBriefStatus('loading');
    try {
      const response = await fetch('/api/ai/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          openOrdersCount: can('orders.view') ? activeOrders.length : 0,
          expiringBatchesCount: can('inventory.view') ? expiringBatches.length : 0,
          pendingApprovalsCount: can('approvals.view') ? pendingApprovals.length : 0,
          overdueReceivablesKes: can('finance.view') ? overdueInvoices.reduce((sum, invoice) => sum + invoice.balanceKes, 0) : 0,
          upcomingPayablesKes: can('finance.view') ? duePayables.reduce((sum, payable) => sum + payable.balanceKes, 0) : 0,
        }),
      });
      if (!response.ok) throw new Error('Brief unavailable');
      setBrief(await response.json());
      setBriefStatus('idle');
    } catch {
      setBriefStatus('error');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isDriver ? 'Delivery workspace' : 'Operations overview'}
        description={new Intl.DateTimeFormat('en-KE', { dateStyle: 'full', timeZone: 'Africa/Nairobi' }).format(new Date())}
        actions={can('orders.create') && (
          <Link href="/orders?action=new" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#1F6A37] px-4 text-sm font-semibold text-white hover:bg-[#12512C]">
            <Plus className="size-4" aria-hidden="true" />
            New order
          </Link>
        )}
      />

      <section aria-labelledby="dashboard-attention" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="dashboard-attention" className="font-heading text-xl font-semibold">Needs your attention</h2>
          {can('reports.view') && (
            <Link href="/reports" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-[var(--brand-accent)] hover:underline">
              View reports <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          )}
        </div>
        {!activeQueues.length && (
          <Card padding="p-4" className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
            <CheckCircle2 className="size-5 shrink-0 text-[var(--brand-accent)]" aria-hidden="true" />
            Your work queues are clear.
          </Card>
        )}
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {activeQueues.map(({ id, title, action, href, icon: Icon, rows }) => (
            <Card key={id} padding="p-4 sm:p-5" className="min-w-0 flex flex-col">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--bg-subtle)] text-[var(--brand-accent)]">
                  <Icon className="size-[18px]" aria-hidden="true" />
                </span>
                <h3 className="flex-1 self-center font-heading text-base font-semibold">{title}</h3>
                <span className="self-center font-mono-tabular text-xl font-semibold">{rows.length}</span>
              </div>
              {rows.length > 0 && (
                <ul className="mt-3 flex-1 divide-y divide-[var(--border-subtle)]">
                  {rows.slice(0, 3).map((row) => (
                    <li key={row.id} className="py-2.5">
                      {row.href ? <Link href={row.href} className="text-sm font-medium hover:underline">{row.title}</Link>
                        : <p className="text-sm font-medium">{row.title}</p>}
                      <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{row.detail}</p>
                    </li>
                  ))}
                </ul>
              )}
              <Link href={href} className="mt-auto inline-flex min-h-11 items-center gap-1.5 self-start text-sm font-semibold text-[var(--brand-accent)] hover:underline">
                {action} <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Card>
          ))}
        </div>
      </section>

      {!isDriver && relevantQueues.length > 0 && (
        <Card padding="p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-heading text-base font-semibold">
              <Sparkles className="size-4 text-[var(--brand-accent)]" aria-hidden="true" /> Shift brief
            </h2>
            <button type="button" onClick={loadBrief} disabled={briefStatus === 'loading'} className="min-h-11 rounded-lg border border-[var(--border-subtle)] px-3 text-sm font-medium hover:bg-[var(--bg-subtle)] disabled:opacity-60">
              {briefStatus === 'loading' ? 'Generating…' : brief ? 'Refresh brief' : 'Generate brief'}
            </button>
          </div>
          {briefStatus === 'error' && <p role="alert" className="mt-2 text-sm">The shift brief could not be loaded. Try again.</p>}
          {brief && (
            <div className="mt-3 space-y-2 border-t border-[var(--border-subtle)] pt-3 text-sm" aria-live="polite">
              <p className="font-medium">{brief.headline}</p>
              <ul className="list-disc space-y-1 pl-5 text-[var(--text-secondary)]">
                {brief.priorities.map((priority, index) => <li key={index}>{priority}</li>)}
              </ul>
              <p>{brief.riskAlert}</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
