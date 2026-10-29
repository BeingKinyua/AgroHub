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
    orders,
    can,
    createPurchaseOrder,
    advanceProcurementStage,
    confirmPurchaseAndCollection,
  } = useBos();

  const [activeTab, setActiveTab] = useState<'pipeline' | 'suppliers' | 'exceptions'>('pipeline');
  const [purposeFilter, setPurposeFilter] = useState<'all' | 'direct' | 'stock'>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [warehouseName, setWarehouseName] = useState(warehouses[0]?.name || 'Nairobi Cold Hub A');
  const [itemsSummary, setItemsSummary] = useState('800 kg Kinangop Roma Tomatoes · 1,500 kg Shangi Potatoes');
  const [totalKes, setTotalKes] = useState(131400);
  const [expectedDate, setExpectedDate] = useState('2026-10-02');
  const [purposeInput, setPurposeInput] = useState<'Direct Customer Fulfillment' | 'Bulk Stock Procurement'>('Direct Customer Fulfillment');
  const [customerOrderIdInput, setCustomerOrderIdInput] = useState(orders[0]?.id || '');

  // Goods Collection & Actual Cost Confirmation Modal State
  const [confirmPo, setConfirmPo] = useState<ProcurementOrderRecord | null>(null);
  const [actualCostKes, setActualCostKes] = useState<number>(0);
  const [receiptRef, setReceiptRef] = useState<string>('');

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
    const linkedOrder = orders.find((o) => o.id === customerOrderIdInput);
    const res = await createPurchaseOrder({
      supplierId,
      warehouseName,
      itemsSummary,
      totalKes: Number(totalKes),
      expectedDate,
      purpose: purposeInput,
      customerOrderId: purposeInput === 'Direct Customer Fulfillment' ? customerOrderIdInput : undefined,
      customerOrderNumber: purposeInput === 'Direct Customer Fulfillment' ? linkedOrder?.orderNumber : undefined,
    });
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
    if (res.ok) setCreateOpen(false);
  };

  const handleAdvance = async (poId: string) => {
    const res = await advanceProcurementStage(poId);
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
  };

  const handleConfirmCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmPo) return;
    const res = await confirmPurchaseAndCollection(
      confirmPo.id,
      Number(actualCostKes) || confirmPo.totalKes,
      receiptRef.trim() || undefined
    );
    setFeedback({ msg: res.message, type: res.ok ? 'success' : 'error' });
    if (res.ok) {
      setConfirmPo(null);
      setReceiptRef('');
    }
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
              className="h-10 px-4 rounded-[10px] bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
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

      {/* View Switcher & Operating Paradigm Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-card)] border border-[var(--border-subtle)] w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('pipeline')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'pipeline'
                ? 'bg-[#1F6A37] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Procurement Lifecycle ({procurementOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('suppliers')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
              activeTab === 'suppliers'
                ? 'bg-[#1F6A37] text-white shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Cooperative Vendor Matrix ({suppliers.length})
          </button>
        </div>

        {activeTab === 'pipeline' && (
          <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs">
            <span className="px-2 text-[10px] font-semibold text-[var(--text-secondary)] uppercase">Operating Paradigm:</span>
            <button
              type="button"
              onClick={() => setPurposeFilter('all')}
              className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
                purposeFilter === 'all'
                  ? 'bg-[#1F6A37] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              All Sourcing
            </button>
            <button
              type="button"
              onClick={() => setPurposeFilter('direct')}
              className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
                purposeFilter === 'direct'
                  ? 'bg-[#1F6A37] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Direct Order Fulfillment
            </button>
            <button
              type="button"
              onClick={() => setPurposeFilter('stock')}
              className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer ${
                purposeFilter === 'stock'
                  ? 'bg-[#1F6A37] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Bulk Stock Buffer
            </button>
          </div>
        )}
      </div>

      {/* Tab 1: Workflow / Pipeline Presentation */}
      {activeTab === 'pipeline' && (
        <div className="space-y-4">
          {procurementOrders
            .filter((po) => {
              if (purposeFilter === 'direct') {
                return po.purpose === 'Direct Customer Fulfillment' || Boolean(po.customerOrderId);
              }
              if (purposeFilter === 'stock') {
                return po.purpose === 'Bulk Stock Procurement';
              }
              return true;
            })
            .map((po) => {
              const currentStageIndex = PIPELINE_STAGES.indexOf(po.stage);
              const isDirectProcurement = po.purpose === 'Direct Customer Fulfillment' || Boolean(po.customerOrderId);

              return (
                <Card key={po.id} padding="p-5" variant="raised">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono-tabular text-sm font-semibold text-[#1F6A37] dark:text-[#4EB462]">
                          {po.poNumber}
                        </span>
                        <span className="text-xs text-[var(--text-secondary)]">({po.prNumber})</span>
                        <StatusBadge status={po.stage} />

                        {isDirectProcurement ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                            Direct Farm-to-Client {po.customerOrderNumber ? `· Order ${po.customerOrderNumber}` : ''}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300">
                            Bulk Stock Buffer
                          </span>
                        )}
                      </div>

                      <h3 className="font-heading text-base font-semibold text-[var(--text-primary)]">
                        {po.supplierName}
                      </h3>
                      <p className="text-xs text-[var(--text-secondary)]">{po.itemsSummary}</p>
                      <div className="text-[11px] text-[var(--text-secondary)] flex flex-wrap items-center gap-2 pt-0.5">
                        <span>Receiving Hub: {po.warehouseName}</span>
                        <span>·</span>
                        <span>Expected: {po.expectedDate}</span>
                        <span>·</span>
                        <span>Requester: {po.requestedBy}</span>
                      </div>

                      {po.goodsCollected && (
                        <div className="text-xs text-[#1F6A37] dark:text-[#4EB462] font-semibold pt-1 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                            Farmgate Goods Collected ({po.collectionDate}) · Payable {po.supplierPayableId} (KES {po.actualPurchaseCostKes?.toLocaleString()}) Created
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="font-mono-tabular text-base font-bold text-[var(--text-primary)]">
                        KES {po.totalKes.toLocaleString()}
                      </span>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Direct Procurement Farmgate Purchase & Collection Confirmation */}
                        {!po.goodsCollected && (po.stage === 'PO Issued' || po.stage === 'Receiving (GRN)' || po.stage === 'Quality Check' || po.stage === 'Goods Collected') && (
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmPo(po);
                              setActualCostKes(po.totalKes);
                              setReceiptRef(`FARM-RCP-${po.poNumber.slice(-4)}`);
                            }}
                            className="h-8 px-3.5 rounded-md bg-[#12512C] hover:bg-[#1F6A37] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Confirm Purchase & Goods Collection</span>
                          </button>
                        )}

                        {po.stage !== 'Stock Posted' && po.stage !== 'Goods Collected' && (
                          <button
                            type="button"
                            onClick={() => handleAdvance(po.id)}
                            className="h-8 px-3.5 rounded-md bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <span>Advance Stage</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
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
            <label className="block text-xs font-medium mb-1">Procurement Purpose / Operating Paradigm</label>
            <select
              value={purposeInput}
              onChange={(e) => setPurposeInput(e.target.value as any)}
              className="w-full h-10 px-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-medium cursor-pointer"
            >
              <option value="Direct Customer Fulfillment">Direct Customer Fulfillment (Farm-to-Client Demand)</option>
              <option value="Bulk Stock Procurement">Bulk Stock Procurement (Hub Buffer Replenishment)</option>
            </select>
          </div>

          {purposeInput === 'Direct Customer Fulfillment' && (
            <div>
              <label className="block text-xs font-medium mb-1">Linked Customer Order</label>
              <select
                value={customerOrderIdInput}
                onChange={(e) => setCustomerOrderIdInput(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-medium cursor-pointer"
              >
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.orderNumber} · {o.customerName} ({o.itemsCount} items · KES {o.totalKes.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1">Cooperative Supplier</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs cursor-pointer"
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
              <label className="block text-xs font-medium mb-1">Receiving / Cross-Dock Hub</label>
              <select
                value={warehouseName}
                onChange={(e) => setWarehouseName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs cursor-pointer"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.name}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Expected Collection / Delivery Date</label>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Sourcing Line Items Summary</label>
            <input
              type="text"
              value={itemsSummary}
              onChange={(e) => setItemsSummary(e.target.value)}
              placeholder="e.g. 800 kg Roma Tomatoes · 1,500 kg Shangi Potatoes"
              className="w-full h-10 px-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Estimated Procurement Sourcing Cost (KES)</label>
            <input
              type="number"
              value={totalKes}
              onChange={(e) => setTotalKes(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-mono-tabular"
            />
          </div>

          <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="h-9 px-4 rounded-md border border-[var(--border-subtle)] text-xs font-medium hover:bg-[var(--bg-canvas)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-9 px-5 rounded-md bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold cursor-pointer"
            >
              Submit Requisition
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Purchase & Goods Collection Modal (Operating Model A) */}
      <Modal
        open={Boolean(confirmPo)}
        onClose={() => setConfirmPo(null)}
        title={confirmPo ? `Confirm Purchase & Goods Collection · ${confirmPo.poNumber}` : ''}
        subtitle={confirmPo ? `Verify direct farm collection from ${confirmPo.supplierName}` : ''}
      >
        {confirmPo && (
          <form onSubmit={handleConfirmCollection} className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Supplier / Cooperative:</span>
                <span className="font-semibold text-[var(--text-primary)]">{confirmPo.supplierName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Sourced Items:</span>
                <span className="font-medium text-[var(--text-primary)]">{confirmPo.itemsSummary}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Estimated PO Value:</span>
                <span className="font-mono-tabular font-semibold">KES {confirmPo.totalKes.toLocaleString()}</span>
              </div>
              {confirmPo.customerOrderNumber && (
                <div className="flex items-center justify-between pt-1 border-t border-[var(--border-subtle)] text-emerald-700 dark:text-emerald-400 font-semibold">
                  <span>Linked Direct Order:</span>
                  <span>{confirmPo.customerOrderNumber}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                Actual Purchase Cost (KES) *
              </label>
              <input
                type="number"
                required
                min="1"
                value={actualCostKes}
                onChange={(e) => setActualCostKes(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-mono-tabular font-semibold text-[var(--text-primary)]"
              />
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                This exact amount will be recognized as an Accounts Payable obligation to {confirmPo.supplierName}.
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1">
                Farmgate Receipt / Delivery Note Number
              </label>
              <input
                type="text"
                value={receiptRef}
                onChange={(e) => setReceiptRef(e.target.value)}
                placeholder="e.g. KIN-DN-4820 or M-Pesa B2B Ref"
                className="w-full h-10 px-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-mono-tabular"
              />
            </div>

            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300">
              <span className="font-semibold block mb-0.5">Automated Farm-to-Client Ledger Actions:</span>
              <span>
                1. Marks goods as collected by AgroHub logistics team.
                <br />
                2. Automatically creates an Accounts Payable ledger entry for KES {Number(actualCostKes || confirmPo.totalKes).toLocaleString()}.
                <br />
                3. Advances linked customer orders to Packed/Ready for Dispatch.
              </span>
            </div>

            <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmPo(null)}
                className="h-9 px-4 rounded-md border border-[var(--border-subtle)] text-xs font-medium hover:bg-[var(--bg-canvas)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-9 px-5 rounded-md bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-semibold cursor-pointer inline-flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm Collection & Post Payable</span>
              </button>
            </div>
          </form>
        )}
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
