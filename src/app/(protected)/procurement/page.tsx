'use client';

import React, { useState } from 'react';
import { ArrowRight, Plus } from 'lucide-react';
import { useBos } from '@/lib/services/bos-context';
import {
  Card,
  FeedbackBanner,
  KPI,
  Modal,
  PageHeader,
  StatusBadge,
} from '@/components/ui/primitives';

export default function ProcurementPage() {
  const {
    procurementOrders,
    suppliers,
    warehouses,
    can,
    createPurchaseOrder,
    advanceProcurementStage,
  } = useBos();

  const [createOpen, setCreateOpen] = useState(false);
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [warehouseName, setWarehouseName] = useState(
    warehouses[0]?.name || 'Nairobi Cold Hub A'
  );
  const [itemsSummary, setItemsSummary] = useState(
    '800 kg Kinangop Roma Tomatoes · 1,500 kg Shangi Potatoes'
  );
  const [totalKes, setTotalKes] = useState(131400);
  const [expectedDate, setExpectedDate] = useState('2026-10-02');
  const [feedback, setFeedback] = useState<{
    msg: string;
    type: 'success' | 'error';
  } | null>(null);

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

  return (
    <div>
      <PageHeader
        kicker="SOURCING, GRN RECEIVING & QUALITY CHECKS"
        title="Procurement Command Center"
        description="End-to-end procurement pipeline from Purchase Request through Approval, Purchase Order issuance, Goods Received Note (GRN), Quality Check, and FEFO Stock Posting."
        actions={
          can('procurement.create') && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="h-10 px-4 rounded-xl bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-medium inline-flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Purchase Requisition</span>
            </button>
          )
        }
      />

      <FeedbackBanner
        message={feedback?.msg || null}
        type={feedback?.type}
        onDismiss={() => setFeedback(null)}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPI
          label="Active Purchase Orders"
          value={`${procurementOrders.length} POs`}
          sublabel="Farm cooperatives & grain millers"
          tone="positive"
        />
        <KPI
          label="Total Procurement Commitment"
          value={`KES ${procurementOrders
            .reduce((s, p) => s + p.totalKes, 0)
            .toLocaleString()}`}
          sublabel="POs ≥ KES 250k require Governance Approval"
          tone="neutral"
        />
        <KPI
          label="Awaiting GRN / QC Inspection"
          value={`${
            procurementOrders.filter(
              (p) =>
                p.stage === 'Receiving (GRN)' || p.stage === 'PO Issued'
            ).length
          }`}
          sublabel="Inbound at Nairobi Cold Hub A"
          tone="warning"
        />
        <KPI
          label="Average QC Acceptance Rate"
          value="98.4%"
          sublabel="Sorted & graded at receiving bay"
          tone="positive"
        />
      </div>

      <div className="space-y-4">
        {procurementOrders.map((po) => (
          <Card key={po.id}>
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono-tabular text-sm font-semibold text-[#1F6A37] dark:text-[#4EB462]">
                    {po.poNumber}
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    ({po.prNumber})
                  </span>
                  <StatusBadge status={po.stage} />
                </div>

                <h3 className="font-heading text-base font-semibold text-[var(--text-primary)]">
                  {po.supplierName}
                </h3>

                <p className="text-xs text-[var(--text-secondary)]">
                  {po.itemsSummary}
                </p>

                <div className="text-[11px] text-[var(--text-secondary)] flex flex-wrap items-center gap-2 pt-1">
                  <span>Destination: {po.warehouseName}</span>
                  <span aria-hidden="true">·</span>
                  <span>Expected: {po.expectedDate}</span>
                  <span aria-hidden="true">·</span>
                  <span>Requested by: {po.requestedBy}</span>
                  {po.qualityCheckPassPct && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#1F6A37] dark:text-[#4EB462] font-medium">
                        QC Pass: {po.qualityCheckPassPct}%
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between lg:justify-end gap-4 shrink-0">
                <div className="text-right">
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    PO Value
                  </div>
                  <div className="font-mono-tabular text-sm font-semibold">
                    KES {po.totalKes.toLocaleString()}
                  </div>
                </div>

                {po.stage !== 'Stock Posted' && (
                  <button
                    type="button"
                    onClick={() => handleAdvance(po.id)}
                    className="px-3.5 py-2 rounded-xl bg-[#1F6A37] hover:bg-[#12512C] text-white text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Advance Stage</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Create Purchase Order Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Raise Purchase Request / Purchase Order"
        subtitle="Requisitions ≥ KES 250,000 automatically route to the Approval Center before PO issuance."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1">
              Farm Cooperative / Supplier
            </label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.region} · Lead time {s.leadTimeDays}d)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">
                Receiving Warehouse Hub
              </label>
              <select
                value={warehouseName}
                onChange={(e) => setWarehouseName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.name}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">
                Expected Delivery Date
              </label>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              Line Items & Quantities Summary
            </label>
            <input
              type="text"
              required
              value={itemsSummary}
              onChange={(e) => setItemsSummary(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">
              Total Requisition Value (KES)
            </label>
            <input
              type="number"
              required
              value={totalKes}
              onChange={(e) => setTotalKes(Number(e.target.value))}
              className="w-full h-10 px-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs font-mono-tabular"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="px-4 py-2 rounded-xl border border-[var(--border-subtle)] text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#1F6A37] text-white text-xs font-medium cursor-pointer"
            >
              Submit Requisition
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
