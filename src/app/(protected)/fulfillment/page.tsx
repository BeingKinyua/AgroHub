'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  Layers,
  MapPin,
  Package,
  PackageCheck,
  Search,
  Truck,
  User,
  X,
} from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import {
  Card,
  FeedbackBanner,
  KPI,
  Modal,
  PageHeader,
  StatusBadge,
} from '@/components/ui/primitives';
import { OrderLifecycleStatus, OrderRecord, PODEvidenceRecord } from '@/types/domain/bos';
import { calculateInvoiceEligibility } from '@/lib/services/business-rules';

interface StageDefinition {
  status: OrderLifecycleStatus;
  stepNumber: string;
  name: string;
  shortLabel: string;
  actor: string;
  description: string;
  nextStatus?: OrderLifecycleStatus;
  nextActionLabel?: string;
}

const STAGES: StageDefinition[] = [
  {
    status: 'Confirmed',
    stepNumber: '01',
    name: 'Confirmed & Stock Reserved',
    shortLabel: 'Confirmed',
    actor: 'Procurement / Storekeeper',
    description: 'FEFO stock batch locked in cold hub storage',
    nextStatus: 'Picking',
    nextActionLabel: 'Start Picking',
  },
  {
    status: 'Picking',
    stepNumber: '02',
    name: 'Warehouse Picking',
    shortLabel: 'Picking',
    actor: 'Storekeeper (Samuel Mutua)',
    description: 'Picking from cold rooms & dry storage bins',
    nextStatus: 'Packed',
    nextActionLabel: 'Mark Packed',
  },
  {
    status: 'Packed',
    stepNumber: '03',
    name: 'Crates Packed & Staged',
    shortLabel: 'Packed',
    actor: 'Dispatch Coordinator',
    description: 'Crates weighed, QC inspected & staged at cross-dock',
    nextStatus: 'Dispatched',
    nextActionLabel: 'Dispatch Route',
  },
  {
    status: 'Dispatched',
    stepNumber: '04',
    name: 'Fleet In Transit',
    shortLabel: 'In Transit',
    actor: 'Route Driver (Joseph Omondi)',
    description: 'Refrigerated van en-route to client institution',
    nextStatus: 'Delivered',
    nextActionLabel: 'Record Arrival',
  },
  {
    status: 'Delivered',
    stepNumber: '05',
    name: 'Delivered — POD Pending',
    shortLabel: 'POD Pending',
    actor: 'Receiving Officer / Driver',
    description: 'Physical offload complete, awaiting verified POD sign-off',
    nextStatus: 'Closed',
    nextActionLabel: 'Verify POD',
  },
  {
    status: 'Closed',
    stepNumber: '06',
    name: 'POD Verified & Invoiced',
    shortLabel: 'Completed',
    actor: 'Finance & Operations Ledger',
    description: 'Receiving sign-off verified, commercial eTIMS invoice posted',
  },
];

export default function FulfillmentPage() {
  const { orders, deliveries, podRecords, can, advanceOrderStatus, verifyPOD, reconcilePODDiscrepancy } = useBos();
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);
  const [activeStageFilter, setActiveStageFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [reconcileModalPod, setReconcileModalPod] = useState<PODEvidenceRecord | null>(null);
  const [reconciliationNotes, setReconciliationNotes] = useState('');
  const [feedback, setFeedback] = useState<{
    msg: string;
    type: 'success' | 'error';
  } | null>(null);

  // Quick metrics
  const activeOrders = useMemo(
    () => orders.filter((o) => o.status !== 'Cancelled'),
    [orders]
  );

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    STAGES.forEach((st) => {
      counts[st.status] = activeOrders.filter((o) => o.status === st.status).length;
    });
    return counts;
  }, [activeOrders]);

  const totalPipelineKes = useMemo(
    () => activeOrders.reduce((acc, o) => acc + o.totalKes, 0),
    [activeOrders]
  );

  const pendingVerificationCount = useMemo(
    () => activeOrders.filter((o) => o.status === 'Delivered' && o.podStatus !== 'Verified').length,
    [activeOrders]
  );

  const discrepancyCount = useMemo(
    () => podRecords.filter((p) => p.hasDiscrepancies && p.reconciliationStatus !== 'Fully Reconciled').length,
    [podRecords]
  );

  const handleAdvanceStage = async (orderId: string, nextStatus: OrderLifecycleStatus) => {
    const res = await advanceOrderStatus(orderId, nextStatus);
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
    if (res.ok && selectedOrder?.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, status: nextStatus } : null));
    }
  };

  const handleVerifyPodWithInvoice = async (podId: string) => {
    const res = await verifyPOD(podId, {
      createInvoice: true,
      notes: 'Verified by Warehouse Supervisor with automated customer invoice creation',
    });
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
    if (res.ok && selectedOrder) {
      setSelectedOrder((prev) => (prev ? { ...prev, podStatus: 'Verified', status: 'Closed' } : null));
    }
  };

  const handleVerifyPodWithoutInvoice = async (podId: string) => {
    const res = await verifyPOD(podId, {
      createInvoice: false,
      notes: 'Verified arrival only (invoicing deferred for consolidation)',
    });
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
    if (res.ok && selectedOrder) {
      setSelectedOrder((prev) => (prev ? { ...prev, podStatus: 'Verified' } : null));
    }
  };

  const handleRejectPod = async (podId: string) => {
    const res = await verifyPOD(podId, {
      reject: true,
      notes: 'Rejected POD sign-off due to unresolved produce spoilage or missing stamp',
    });
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
  };

  const handleConfirmReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reconcileModalPod) return;
    const res = await reconcilePODDiscrepancy(
      reconcileModalPod.id,
      {
        action: 'Accept Shortage',
        notes: reconciliationNotes.trim() || 'Credit note adjustment authorized after QC inspection.',
      }
    );
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
    if (res.ok) {
      setReconcileModalPod(null);
      setReconciliationNotes('');
    }
  };

  const handleQuickVerifyPod = async (ord: OrderRecord) => {
    const podId = ord.podEvidenceId || podRecords.find((p) => p.orderId === ord.id || p.orderNumber === ord.orderNumber)?.id;
    if (podId) {
      await handleVerifyPodWithInvoice(podId);
    } else {
      setSelectedOrder(ord);
    }
  };

  // Filtered orders for mobile / segmented view
  const displayedOrders = useMemo(() => {
    return activeOrders.filter((ord) => {
      const matchStage = activeStageFilter === 'All' || ord.status === activeStageFilter;
      const q = search.trim().toLowerCase();
      const matchQuery =
        !q ||
        ord.orderNumber.toLowerCase().includes(q) ||
        ord.customerName.toLowerCase().includes(q) ||
        ord.warehouseName.toLowerCase().includes(q);
      return matchStage && matchQuery;
    });
  }, [activeOrders, activeStageFilter, search]);

  // Find linked delivery and POD record for currently inspected order
  const inspectedDelivery = useMemo(() => {
    if (!selectedOrder) return null;
    return deliveries.find(
      (d) =>
        d.ordersIncluded.includes(selectedOrder.orderNumber) ||
        d.institutionsServed.includes(selectedOrder.customerName)
    );
  }, [selectedOrder, deliveries]);

  const inspectedPod = useMemo(() => {
    if (!selectedOrder) return null;
    return podRecords.find(
      (p) => p.orderId === selectedOrder.id || p.orderNumber === selectedOrder.orderNumber
    );
  }, [selectedOrder, podRecords]);

  return (
    <div className="space-y-6">
      {/* Header (Section 5.1 & 31) */}
      <PageHeader
        kicker="WAREHOUSE & LAST-MILE PIPELINE"
        title="Fulfillment & Dispatch Pipeline"
        description="Comprehensive 6-stage operational pipeline: FEFO batch picking, crate packing, fleet dispatch, electronic POD verification, and automated commercial billing."
      />

      <FeedbackBanner
        message={feedback?.msg || null}
        type={feedback?.type}
        onDismiss={() => setFeedback(null)}
      />

      {/* Decision Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KPI
          label="Active Pipeline Orders"
          value={`${activeOrders.length} Orders`}
          sublabel={`Total KES ${totalPipelineKes.toLocaleString()}`}
          tone="positive"
        />
        <KPI
          label="Warehouse Picking / Packing"
          value={`${(stageCounts['Confirmed'] || 0) + (stageCounts['Picking'] || 0) + (stageCounts['Packed'] || 0)}`}
          sublabel="Staging & FEFO fulfillment"
          tone="neutral"
        />
        <KPI
          label="Fleet In Transit"
          value={`${stageCounts['Dispatched'] || 0} Vans`}
          sublabel="Route dispatch on schedule"
          tone="neutral"
        />
        <KPI
          label="Delivered (POD Pending)"
          value={`${pendingVerificationCount}`}
          sublabel="Awaiting supervisor sign-off"
          tone={pendingVerificationCount > 0 ? 'warning' : 'positive'}
        />
        <KPI
          label="Discrepancy / Disputes"
          value={`${discrepancyCount} Flagged`}
          sublabel="Requires quantity reconciliation"
          tone={discrepancyCount > 0 ? 'danger' : 'neutral'}
        />
      </div>

      {/* Search and Responsive Stage Tabs for Mobile/Tablet */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-[var(--text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order #, client, or hub..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs text-[var(--text-primary)]"
          />
        </div>

        {/* Mobile/Tablet Stage Pill Selector */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          <button
            type="button"
            onClick={() => setActiveStageFilter('All')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors shrink-0 ${
              activeStageFilter === 'All'
                ? 'bg-[#1F6A37] text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
            }`}
          >
            All Stages ({activeOrders.length})
          </button>
          {STAGES.map((stage) => {
            const count = stageCounts[stage.status] || 0;
            return (
              <button
                key={stage.status}
                type="button"
                onClick={() => setActiveStageFilter(stage.status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors shrink-0 ${
                  activeStageFilter === stage.status
                    ? 'bg-[#1F6A37] text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
                }`}
              >
                {stage.shortLabel} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Multi-Column Pipeline & Mobile Card View */}
      {activeStageFilter === 'All' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5 items-start">
          {STAGES.map((stage) => {
            const stageOrders = activeOrders.filter((o) => {
              const matchesStage = o.status === stage.status;
              const q = search.trim().toLowerCase();
              const matchesQuery =
                !q ||
                o.orderNumber.toLowerCase().includes(q) ||
                o.customerName.toLowerCase().includes(q) ||
                o.warehouseName.toLowerCase().includes(q);
              return matchesStage && matchesQuery;
            });

            return (
              <div
                key={stage.status}
                className="flex flex-col rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] p-3 min-h-[500px]"
              >
                {/* Stage Header */}
                <div className="pb-2.5 mb-2.5 border-b border-[var(--border-subtle)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono-tabular font-bold text-[#1F6A37] dark:text-[#4EB462]">
                      STAGE {stage.stepNumber}
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] font-mono-tabular">
                      {stageOrders.length}
                    </span>
                  </div>
                  <h3 className="text-xs font-semibold text-[var(--text-primary)] mt-1">
                    {stage.shortLabel}
                  </h3>
                  <div className="text-[10px] text-[var(--text-secondary)] truncate" title={stage.actor}>
                    {stage.actor}
                  </div>
                </div>

                {/* Orders list in this stage */}
                <div className="space-y-2.5 flex-1 overflow-y-auto pr-0.5">
                  {stageOrders.length === 0 ? (
                    <div className="py-8 text-center text-[11px] text-[var(--text-secondary)]/70">
                      Empty stage
                    </div>
                  ) : (
                    stageOrders.map((ord) => (
                      <div
                        key={ord.id}
                        className="p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[#1F6A37]/50 shadow-xs space-y-2 cursor-pointer transition-all"
                        onClick={() => setSelectedOrder(ord)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-mono-tabular font-semibold text-[#1F6A37] dark:text-[#4EB462]">
                            {ord.orderNumber}
                          </span>
                          <span className="text-[10px] text-[var(--text-secondary)]">
                            {ord.itemsCount} {ord.itemsCount === 1 ? 'item' : 'items'}
                          </span>
                        </div>

                        <div>
                          <div className="text-xs font-medium text-[var(--text-primary)] line-clamp-1">
                            {ord.customerName}
                          </div>
                          <div className="text-[10px] text-[var(--text-secondary)] truncate">
                            {ord.warehouseName}
                          </div>
                        </div>

                        {/* Order value */}
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--border-subtle)]">
                          <span className="font-mono-tabular font-semibold text-[var(--text-primary)]">
                            KES {ord.totalKes.toLocaleString()}
                          </span>
                          <span className="text-[10px] text-[var(--text-secondary)]">
                            {ord.deliveryDate.split('-').slice(1).join('/')}
                          </span>
                        </div>

                        {/* Stage transition action button */}
                        <div className="pt-1">
                          {stage.nextStatus && (can('fulfillment.manage') || can('deliveries.dispatch')) ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAdvanceStage(ord.id, stage.nextStatus!);
                              }}
                              className="w-full h-7 rounded-md bg-[#1F6A37] hover:bg-[#12512C] text-white text-[10px] font-medium inline-flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
                            >
                              <span>{stage.nextActionLabel}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          ) : stage.status === 'Delivered' && ord.podStatus !== 'Verified' ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleQuickVerifyPod(ord);
                              }}
                              className="w-full h-7 rounded-md bg-[#12512C] hover:bg-[#1F6A37] text-white text-[10px] font-semibold inline-flex items-center justify-center gap-1 cursor-pointer transition-colors"
                            >
                              <FileCheck2 className="w-3 h-3" />
                              <span>Verify POD</span>
                            </button>
                          ) : (
                            <div className="text-center text-[10px] text-[var(--text-secondary)] py-0.5">
                              {stage.status === 'Closed' ? 'Completed & Invoiced' : 'Stage in progress'}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Single-Stage Filtered List */
        <div className="space-y-3">
          {displayedOrders.length === 0 ? (
            <Card padding="p-8">
              <div className="text-center text-xs text-[var(--text-secondary)]">
                No orders currently in {activeStageFilter} stage matching your query.
              </div>
            </Card>
          ) : (
            displayedOrders.map((ord) => (
              <div
                key={ord.id}
                onClick={() => setSelectedOrder(ord)}
                className="cursor-pointer"
              >
                <Card
                  padding="p-4"
                  className="hover:border-[#1F6A37]/50 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-tabular font-semibold text-xs text-[#1F6A37] dark:text-[#4EB462]">
                          {ord.orderNumber}
                        </span>
                        <StatusBadge status={ord.status} />
                        <span className="text-[11px] text-[var(--text-secondary)]">
                          Due: {ord.deliveryDate}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-[var(--text-primary)]">
                        {ord.customerName} ({ord.customerSegment})
                      </div>
                      <div className="text-xs text-[var(--text-secondary)]">
                        Fulfillment Hub: {ord.warehouseName} · Channel: {ord.channel}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 self-end sm:self-center">
                      <div className="text-right">
                        <div className="text-[10px] text-[var(--text-secondary)]">Order Total</div>
                        <div className="font-mono-tabular font-bold text-sm text-[var(--text-primary)]">
                          KES {ord.totalKes.toLocaleString()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOrder(ord);
                        }}
                        className="h-9 px-3.5 rounded-lg border border-[var(--border-subtle)] text-xs font-medium hover:bg-[var(--bg-canvas)] inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Details</span>
                      </button>
                    </div>
                  </div>
                </Card>
              </div>
            ))
          )}
        </div>
      )}

      {/* Detailed Order Inspection Modal (Section 5.4) */}
      <Modal
        open={Boolean(selectedOrder)}
        onClose={() => setSelectedOrder(null)}
        size="2xl"
        title={`Order Fulfillment Inspector · ${selectedOrder?.orderNumber}`}
        subtitle={`Client: ${selectedOrder?.customerName} (${selectedOrder?.customerSegment}) · Hub: ${selectedOrder?.warehouseName}`}
      >
        {selectedOrder && (
          <div className="space-y-5 text-xs">
            {/* Status & Lifecycle Banner */}
            <div className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">
                  Operational Stage
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <StatusBadge status={selectedOrder.status} />
                  {selectedOrder.podStatus && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E5EFE6] dark:bg-[#122719] text-[#1F6A37] dark:text-[#4EB462] font-medium">
                      POD: {selectedOrder.podStatus}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider">
                  Target Delivery
                </div>
                <div className="text-xs font-semibold text-[var(--text-primary)] mt-0.5">
                  {selectedOrder.deliveryDate}
                </div>
              </div>
            </div>

            {/* Destination & Logistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
              <div>
                <div className="text-[11px] font-semibold text-[var(--text-primary)] mb-1">
                  Delivery Destination
                </div>
                <div className="text-[var(--text-secondary)]">
                  {selectedOrder.deliveryAddress || 'Standard Receiving Bay'}
                </div>
                <div className="text-[10px] text-[var(--text-secondary)] mt-1 font-mono-tabular">
                  PO Reference: {selectedOrder.orderReference || 'N/A'}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-[var(--text-primary)] mb-1">
                  Route & Driver Assignment
                </div>
                {inspectedDelivery ? (
                  <div className="text-[var(--text-secondary)] space-y-0.5">
                    <div>Route: {inspectedDelivery.runNumber} ({inspectedDelivery.routeZone})</div>
                    <div>Driver: {inspectedDelivery.driverName} ({inspectedDelivery.vehiclePlate})</div>
                  </div>
                ) : (
                  <div className="text-[var(--text-secondary)] italic">
                    Unassigned route. Awaiting dispatch staging.
                  </div>
                )}
              </div>
            </div>

            {/* Allocated FEFO Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-xs text-[var(--text-primary)] inline-flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#1F6A37] dark:text-[#4EB462]" />
                  <span>Allocated FEFO Line Items ({selectedOrder.items.length})</span>
                </div>
                <span className="font-mono-tabular font-bold text-xs text-[#1F6A37] dark:text-[#4EB462]">
                  Total: KES {selectedOrder.totalKes.toLocaleString()}
                </span>
              </div>

              <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[var(--bg-canvas)] border-b border-[var(--border-subtle)] text-[10px] font-semibold text-[var(--text-secondary)]">
                      <th className="py-2 px-3">Product Name</th>
                      <th className="py-2 px-3">FEFO Batch</th>
                      <th className="py-2 px-3 text-right">Quantity</th>
                      <th className="py-2 px-3">Tier</th>
                      <th className="py-2 px-3 text-right">Price</th>
                      <th className="py-2 px-3 text-right">Total (KES)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {selectedOrder.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-[var(--bg-canvas)]/50">
                        <td className="py-2.5 px-3">
                          <div className="font-medium text-[var(--text-primary)]">{item.productName}</div>
                          <div className="text-[10px] text-[var(--text-secondary)] font-mono-tabular">
                            {item.sku}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono-tabular text-[11px] text-[#1F6A37] dark:text-[#4EB462]">
                          {item.allocatedBatch}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-tabular font-medium">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
                            {item.pricingTier}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-tabular">
                          KES {item.unitPriceKes.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-tabular font-semibold">
                          KES {item.lineTotalKes.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Proof of Delivery and Invoice Status Section */}
            {inspectedPod && (() => {
              const billableCalc = calculateInvoiceEligibility(inspectedPod);
              const totalDispatchedKes = (inspectedPod.deliveredItems || []).reduce(
                (sum, it) => sum + (it.dispatchedQty || it.requestedQty || 0) * (it.unitPriceKes || 0),
                0
              );
              const discrepancyDeductionKes = Math.max(0, totalDispatchedKes - billableCalc.totalInvoiceKes);

              return (
                <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2.5">
                    <div>
                      <div className="font-semibold text-xs text-[var(--text-primary)] inline-flex items-center gap-1.5">
                        <FileCheck2 className="w-4 h-4 text-[#1F6A37] dark:text-[#4EB462]" />
                        <span>Electronic Proof of Delivery (POD) Evidence</span>
                      </div>
                      <div className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                        Recipient: <strong className="text-[var(--text-primary)]">{inspectedPod.recipientName}</strong>
                        {inspectedPod.recipientRole ? ` (${inspectedPod.recipientRole})` : ''} · Dept: {inspectedPod.receivingDepartment || 'Receiving Dock'} · {inspectedPod.submittedAt}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          inspectedPod.status === 'Verified'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : inspectedPod.status === 'Rejected'
                            ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                        }`}
                      >
                        POD: {inspectedPod.status}
                      </span>

                      {inspectedPod.hasDiscrepancies && (
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            inspectedPod.reconciliationStatus === 'Fully Reconciled'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                          }`}
                        >
                          {inspectedPod.reconciliationStatus || 'Discrepancy Flagged'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Line Items Discrepancy Breakdown Table */}
                  <div className="border border-[var(--border-subtle)] rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[var(--bg-card)] border-b border-[var(--border-subtle)] text-[10px] font-semibold text-[var(--text-secondary)]">
                        <tr>
                          <th className="py-2 px-2.5">Produce Item</th>
                          <th className="py-2 px-2 text-right">Dispatched</th>
                          <th className="py-2 px-2 text-right">Received</th>
                          <th className="py-2 px-2 text-right text-emerald-700 dark:text-emerald-400 font-bold">Accepted</th>
                          <th className="py-2 px-2 text-right text-red-600 dark:text-red-400">Rejected</th>
                          <th className="py-2 px-2.5">Discrepancy Note / Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-subtle)]">
                        {(inspectedPod.deliveredItems || []).map((it, idx) => (
                          <tr key={it.productId || idx} className="hover:bg-[var(--bg-card)]/50">
                            <td className="py-2 px-2.5 font-medium text-[var(--text-primary)]">
                              {it.productName}
                              <div className="text-[10px] text-[var(--text-secondary)] font-mono">{it.sku}</div>
                            </td>
                            <td className="py-2 px-2 text-right font-mono">
                              {it.dispatchedQty || it.requestedQty} {it.unit}
                            </td>
                            <td className="py-2 px-2 text-right font-mono">
                              {it.receivedQty ?? it.deliveredQty} {it.unit}
                            </td>
                            <td className="py-2 px-2 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">
                              {it.acceptedQty ?? it.deliveredQty} {it.unit}
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-red-600 dark:text-red-400">
                              {it.rejectedQty > 0 ? `${it.rejectedQty} ${it.unit}` : '—'}
                            </td>
                            <td className="py-2 px-2.5 text-[11px]">
                              {it.discrepancyReason ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                                  {it.discrepancyReason}
                                </span>
                              ) : (
                                <span className="text-emerald-600 dark:text-emerald-400 text-[10px]">Fully Accepted</span>
                              )}
                              {it.discrepancyExplanation && (
                                <div className="text-[10px] text-[var(--text-secondary)] italic">
                                  {it.discrepancyExplanation}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Financial Billable Summary */}
                  <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs">
                    <div>
                      <span className="text-[10px] text-[var(--text-secondary)]">Dispatched Total Value</span>
                      <div className="font-mono font-semibold text-[var(--text-primary)] mt-0.5">
                        KES {totalDispatchedKes.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-secondary)]">Deducted Discrepancies</span>
                      <div className="font-mono font-semibold text-red-600 dark:text-red-400 mt-0.5">
                        - KES {discrepancyDeductionKes.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-secondary)]">Billable Verified Total</span>
                      <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-0.5 text-sm">
                        KES {billableCalc.totalInvoiceKes.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Linked Invoice status or Reconciliation Action */}
                  {inspectedPod.status === 'Verified' && inspectedPod.invoiceCreated ? (
                    <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
                      <span className="text-xs text-[#1F6A37] dark:text-[#4EB462] font-semibold inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Commercial Tax Invoice Created ({inspectedPod.invoiceNumber || 'Linked'})</span>
                      </span>
                      <Link
                        href="/invoices"
                        className="text-xs text-[#1F6A37] dark:text-[#4EB462] hover:underline inline-flex items-center gap-1"
                      >
                        <span>View Invoices Ledger</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]">
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        {inspectedPod.hasDiscrepancies && inspectedPod.reconciliationStatus !== 'Fully Reconciled' ? (
                          <span className="text-amber-700 dark:text-amber-400 font-medium">
                            Discrepancies recorded. You can reconcile disputes or verify billable accepted quantity.
                          </span>
                        ) : (
                          <span>Quantities fully verified against receiving sign-off.</span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {inspectedPod.hasDiscrepancies && inspectedPod.reconciliationStatus !== 'Fully Reconciled' && (
                          <button
                            type="button"
                            onClick={() => {
                              setReconcileModalPod(inspectedPod);
                              setReconciliationNotes('');
                            }}
                            className="h-8 px-3 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-xs font-semibold cursor-pointer"
                          >
                            Resolve Discrepancy
                          </button>
                        )}

                        {inspectedPod.status !== 'Verified' && can('fulfillment.manage') && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleRejectPod(inspectedPod.id)}
                              className="h-8 px-3 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-medium cursor-pointer"
                            >
                              Reject POD
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVerifyPodWithoutInvoice(inspectedPod.id)}
                              className="h-8 px-3 rounded-md border border-[var(--border-subtle)] text-xs font-medium hover:bg-[var(--bg-card)] cursor-pointer"
                            >
                              Verify without Invoicing
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVerifyPodWithInvoice(inspectedPod.id)}
                              className="h-8 px-4 rounded-md bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Verify & Generate Invoice (KES {billableCalc.totalInvoiceKes.toLocaleString()})</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Contextual Operational Action Buttons */}
            <div className="pt-3 border-t border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-2">
              <div className="text-[11px] text-[var(--text-secondary)]">
                Next recommended step: <span className="font-semibold text-[var(--text-primary)]">{selectedOrder.nextStepLabel}</span>
              </div>

              <div className="flex items-center gap-2">
                {selectedOrder.status === 'Confirmed' && can('fulfillment.manage') && (
                  <button
                    type="button"
                    onClick={() => handleAdvanceStage(selectedOrder.id, 'Picking')}
                    className="h-9 px-4 rounded-md bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Start Warehouse Picking</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
                {selectedOrder.status === 'Picking' && can('fulfillment.manage') && (
                  <button
                    type="button"
                    onClick={() => handleAdvanceStage(selectedOrder.id, 'Packed')}
                    className="h-9 px-4 rounded-md bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Confirm Packing & Staging</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
                {selectedOrder.status === 'Packed' && (can('fulfillment.manage') || can('deliveries.dispatch')) && (
                  <button
                    type="button"
                    onClick={() => handleAdvanceStage(selectedOrder.id, 'Dispatched')}
                    className="h-9 px-4 rounded-md bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Dispatch to Delivery Fleet</span>
                    <Truck className="w-3.5 h-3.5" />
                  </button>
                )}
                {selectedOrder.status === 'Dispatched' && (
                  <Link
                    href="/deliveries"
                    className="h-9 px-4 rounded-md bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Record Arrival & Capture POD</span>
                    <FileCheck2 className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Discrepancy Dispute & Reconciliation Modal */}
      <Modal
        open={Boolean(reconcileModalPod)}
        onClose={() => setReconcileModalPod(null)}
        title={reconcileModalPod ? `Reconcile POD Discrepancy · Order ${reconcileModalPod.orderNumber}` : ''}
        subtitle="Authorize credit note deductions, damaged produce write-offs, or customer acceptance sign-off."
      >
        {reconcileModalPod && (
          <form onSubmit={handleConfirmReconciliation} className="space-y-4">
            <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/25 text-xs text-amber-800 dark:text-amber-300">
              <strong>Audit Ledger Update:</strong> Reconciling marks this delivery evidence as <strong>Fully Reconciled</strong> and releases the order for accurate invoicing of accepted produce quantities.
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Supervisor Reconciliation & Resolution Note *
              </label>
              <textarea
                required
                rows={3}
                value={reconciliationNotes}
                onChange={(e) => setReconciliationNotes(e.target.value)}
                placeholder="e.g. 5kg damaged spinach inspected and written off. Credit note CN-2026-042 issued to St. Jude Hospital. Invoicing authorized for accepted 95kg."
                className="w-full p-2.5 rounded-md text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
              />
            </div>

            <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReconcileModalPod(null)}
                className="h-9 px-4 rounded-md border border-[var(--border-subtle)] text-xs font-medium hover:bg-[var(--bg-canvas)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-9 px-5 rounded-md bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold cursor-pointer shadow-xs inline-flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Dispute Reconciliation</span>
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
