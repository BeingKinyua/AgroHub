'use client';

import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  DollarSign,
  FileCheck,
  FileText,
  Filter,
  Package,
  Plus,
  Search,
  ShieldCheck,
  Truck,
  Users,
} from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import {
  Card,
  FeedbackBanner,
  KPI,
  Modal,
  PageHeader,
  StatusBadge,
  WorkQueue,
  WorkQueueItem,
} from '@/components/ui/primitives';
import { ProcurementOrderRecord } from '@/types/domain/bos';

type ProcurementStage = ProcurementOrderRecord['stage'];

const PIPELINE_STAGES: ProcurementStage[] = [
  'Purchase Request',
  'Pending Approval',
  'PO Issued',
  'Receiving (GRN)',
  'Quality Check',
  'Stock Posted',
];

function ProcurementContent() {
  const searchParams = useSearchParams();
  const {
    procurementOrders,
    suppliers,
    warehouses,
    can,
    createPurchaseOrder,
    advanceProcurementStage,
  } = useBos();

  const [activeTab, setActiveTab] = useState<'pipeline' | 'suppliers' | 'exceptions'>('pipeline');
  const [createOpen, setCreateOpen] = useState(false);
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [warehouseName, setWarehouseName] = useState(warehouses[0]?.name || 'Nairobi Cold Hub A');
  const [itemsSummary, setItemsSummary] = useState('800 kg Kinangop Roma Tomatoes · 1,500 kg Shangi Potatoes');
  const [totalKes, setTotalKes] = useState(131400);
  const [expectedDate, setExpectedDate] = useState('2026-10-02');
  const [feedback, setFeedback] = useState<{
    msg: string;
    type: 'success' | 'error';
  } | null>(null);

  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam === 'reorder' || filterParam === 'pending-approval') {
      setActiveTab('pipeline');
    }
  }, [searchParams]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createPurchaseOrder({
      supplierId,
      warehouseName,
      itemsSummary,
      totalKes: Number(totalKes),
      expectedDate,
    });
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
    if (res.ok) setCreateOpen(false);
  };

  const handleAdvance = async (poId: string) => {
    const res = await advanceProcurementStage(poId);
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
  };

  // Top Work Queues (Section 24: Pending Requests, Pending Approvals, Supplier Exceptions, Price Changes)
  const pendingRequestsQueue: WorkQueueItem[] = useMemo(() => {
    return procurementOrders
      .filter((p) => p.stage === 'Purchase Request')
      .map((p) => ({
        id: p.id,
        title: `${p.prNumber} · ${p.supplierName}`,
        subtitle: p.itemsSummary,
        tag: `KES ${p.totalKes.toLocaleString()}`,
        severity: 'warning' as const,
        actionLabel: 'Review PR',
        onAction: () => handleAdvance(p.id),
        metadata: `Requested by ${p.requestedBy}`,
      }));
  }, [procurementOrders]);

  const pendingApprovalsQueue: WorkQueueItem[] = useMemo(() => {
    return procurementOrders
      .filter((p) => p.stage === 'Pending Approval')
      .map((p) => ({
        id: p.id,
        title: `${p.poNumber} · Sourcing Sign-Off`,
        subtitle: `${p.supplierName} (${p.itemsSummary})`,
        tag: `KES ${p.totalKes.toLocaleString()}`,
        severity: 'critical' as const,
        actionLabel: 'Issue PO',
        onAction: () => handleAdvance(p.id),
        metadata: `Due: ${p.expectedDate}`,
      }));
  }, [procurementOrders]);

  const supplierExceptionsQueue: WorkQueueItem[] = useMemo(() => {
    return suppliers
      .filter((s) => s.recentPriceTrend.includes('+') || s.qualityScorePct < 98)
      .map((s) => ({
        id: s.id,
        title: `${s.name} · Price / QC Notice`,
        subtitle: `${s.category} · ${s.region}`,
        tag: s.recentPriceTrend,
        severity: s.recentPriceTrend.includes('+') ? ('warning' as const) : ('neutral' as const),
        actionLabel: 'Inspect Terms',
        actionHref: '/suppliers',
        metadata: `QC: ${s.qualityScorePct}% · ${s.paymentTerms}`,
      }));
  }, [suppliers]);

  return (
    <div className="space-y-6">
      {/* Page Header (Section 24 & 31) */}
      <PageHeader
        kicker="DIRECT FARM SOURCING & INBOUND QUALITY CONTROL"
        title="Procurement Command & Sourcing Pipeline"
        description="Convert demand into authorized cooperative purchasing: Purchase Requests, Governance Approvals, PO issuance, and receiving dock QC."
        actions={
          can('procurement.create') && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="h-10 px-4 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Requisition</span>
            </button>
          )
        }
      />

      <FeedbackBanner
        message={feedback?.msg || null}
        type={feedback?.type}
        onDismiss={() => setFeedback(null)}
      />

      {/* Top Workflow Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KPI
          label="Active Sourcing Commitments"
          value={`KES ${(procurementOrders.reduce((s, p) => s + p.totalKes, 0) / 1000).toFixed(0)}K`}
          sublabel={`${procurementOrders.length} POs across Kenya cooperatives`}
          tone="positive"
        />
        <KPI
          label="Awaiting Governance Approval"
          value={`${procurementOrders.filter((p) => p.stage === 'Pending Approval').length} POs`}
          sublabel="≥ KES 250k require executive sign-off"
          tone="warning"
        />
        <KPI
          label="Receiving Dock Inbound"
          value="3,800 Units"
          sublabel="2 shipments scheduled before 11:30"
          tone="positive"
        />
        <KPI
          label="Cooperative QC Benchmark"
          value="98.2%"
          sublabel="Avg acceptance score at cold docks"
          tone="positive"
        />
      </div>

      {/* Top Work Queues Section (Section 24: Pending Requests, Approvals, Supplier Exceptions) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <WorkQueue
          title="Pending Purchase Requests"
          subtitle="Buffer replenishment & customer requests"
          badgeCount={pendingRequestsQueue.length}
          items={pendingRequestsQueue}
          emptyMessage="No pending requests."
        />
        <WorkQueue
          title="POs Awaiting Approval"
          subtitle="Manager authority required to issue to farm"
          badgeCount={pendingApprovalsQueue.length}
          items={pendingApprovalsQueue}
          emptyMessage="No POs awaiting sign-off."
        />
        <WorkQueue
          title="Supplier Price & QC Alerts"
          subtitle="Farmgate variance and reliability tracking"
          badgeCount={supplierExceptionsQueue.length}
          items={supplierExceptionsQueue}
          emptyMessage="All vendor metrics nominal."
        />
      </div>

      {/* View Switcher */}
      <div className="flex items-center gap-1 p-1 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('pipeline')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
            activeTab === 'pipeline'
              ? 'bg-[#1F6A37] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Procurement Lifecycle Pipeline ({procurementOrders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('suppliers')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold cursor-pointer transition-colors ${
            activeTab === 'suppliers'
              ? 'bg-[#1F6A37] text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          Cooperative Vendor Comparison ({suppliers.length})
        </button>
      </div>

      {/* Tab 1: Workflow / Pipeline Presentation (Section 24: Request -> Review -> Approval -> PO -> Supplier -> Receiving) */}
      {activeTab === 'pipeline' && (
        <div className="space-y-4">
          {procurementOrders.map((po) => {
            const currentStageIndex = PIPELINE_STAGES.indexOf(po.stage);

            return (
              <Card key={po.id} padding="p-5" variant="raised">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono-tabular text-sm font-semibold text-[#1F6A37] dark:text-[#4EB462]">
                        {po.poNumber}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">({po.prNumber})</span>
                      <StatusBadge status={po.stage} />
                    </div>
                    <h3 className="font-heading text-base font-semibold text-[var(--text-primary)]">
                      {po.supplierName}
                    </h3>
                    <p className="text-xs text-[var(--text-secondary)]">{po.itemsSummary}</p>
                    <div className="text-[11px] text-[var(--text-secondary)] flex flex-wrap items-center gap-2 pt-1">
                      <span>Delivery Hub: {po.warehouseName}</span>
                      <span>·</span>
                      <span>Expected: {po.expectedDate}</span>
                      <span>·</span>
                      <span>Requester: {po.requestedBy}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="font-mono-tabular text-base font-bold text-[var(--text-primary)]">
                      KES {po.totalKes.toLocaleString()}
                    </span>
                    {po.stage !== 'Stock Posted' && (
                      <button
                        type="button"
                        onClick={() => handleAdvance(po.id)}
                        className="h-8 px-4 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>Advance to Next Stage</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Visual Pipeline Stepper (Section 24) */}
                <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                  <div className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    Procurement Workflow Pipeline
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                    {PIPELINE_STAGES.map((st, idx) => {
                      const isComplete = idx < currentStageIndex;
                      const isCurrent = idx === currentStageIndex;

                      return (
                        <div
                          key={st}
                          className={`p-2 rounded-xl border text-center transition-all ${
                            isCurrent
                              ? 'bg-[#1F6A37]/10 border-[#4EB462] font-semibold text-[#1F6A37] dark:text-[#4EB462]'
                              : isComplete
                              ? 'bg-[var(--bg-canvas)] border-[#4EB462]/30 text-[var(--text-secondary)]'
                              : 'bg-[var(--bg-canvas)]/50 border-[var(--border-subtle)] opacity-60 text-[var(--text-secondary)]'
                          }`}
                        >
                          <div className="text-[10px] uppercase font-mono-tabular">Step {idx + 1}</div>
                          <div className="text-[11px] mt-0.5 truncate">{st.split(' ')[0]}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Tab 2: Supplier Comparison (Section 24: price, reliability, lead time, terms, trend) */}
      {activeTab === 'suppliers' && (
        <Card padding="p-0" className="overflow-hidden">
          <div className="p-4 border-b border-[var(--border-subtle)]">
            <h3 className="font-heading text-sm font-semibold text-[var(--text-primary)]">
              Cooperative Vendor Matrix & Sourcing Reliability
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              Compare contracted cooperatives across farmgate price trends, QC reliability, delivery lead times, and terms.
            </p>
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]/50 text-[11px] font-semibold text-[var(--text-secondary)]">
                  <th className="py-3 px-4">Supplier & Region</th>
                  <th className="py-3 px-4">Commodity Focus</th>
                  <th className="py-3 px-4">Lead Time</th>
                  <th className="py-3 px-4">Payment Terms</th>
                  <th className="py-3 px-4">QC Reliability</th>
                  <th className="py-3 px-4">Price Trend</th>
                  <th className="py-3 px-4 text-right">Payable Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)] text-xs">
                {suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-[var(--bg-canvas)]/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[var(--text-primary)]">{s.name}</div>
                      <div className="text-[11px] text-[var(--text-secondary)]">
                        {s.code} · {s.region}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[var(--text-secondary)]">{s.category}</td>
                    <td className="py-3.5 px-4 font-mono-tabular">{s.leadTimeDays} Day(s)</td>
                    <td className="py-3.5 px-4 text-[var(--text-secondary)]">{s.paymentTerms}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono-tabular font-bold text-[#1F6A37] dark:text-[#4EB462]">
                        {s.qualityScorePct}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`text-[11px] font-semibold ${
                          s.recentPriceTrend.includes('+')
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-[#1F6A37] dark:text-[#4EB462]'
                        }`}
                      >
                        {s.recentPriceTrend}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono-tabular font-semibold text-[var(--text-primary)]">
                      KES {s.payableBalanceKes.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* New Requisition Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create Purchase Requisition"
        subtitle="Initiate formal sourcing order to verified Kenya farm cooperative"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">Cooperative Supplier</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full h-10 px-3 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.region} · {s.category})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Destination Facility</label>
              <select
                value={warehouseName}
                onChange={(e) => setWarehouseName(e.target.value)}
                className="w-full h-10 px-3 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.name}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Expected Delivery Date</label>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full h-10 px-3 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Sourcing Line Items Summary</label>
            <input
              type="text"
              value={itemsSummary}
              onChange={(e) => setItemsSummary(e.target.value)}
              className="w-full h-10 px-3 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Total Procurement Cost (KES)</label>
            <input
              type="number"
              value={totalKes}
              onChange={(e) => setTotalKes(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-mono-tabular"
            />
          </div>

          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="h-10 px-4 rounded-full border border-[var(--border-subtle)] text-xs font-medium hover:bg-[var(--bg-canvas)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-5 rounded-full bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold cursor-pointer"
            >
              Submit PR
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function ProcurementPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[var(--text-secondary)]">Loading Procurement Workbench...</div>}>
      <ProcurementContent />
    </Suspense>
  );
}
